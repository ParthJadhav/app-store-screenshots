"use client";
// Visual layers driven by the deck-wide Scene (lib/scene.ts): backdrops,
// decorations, device depth and the magnified callout. Everything here is
// plain DOM/CSS or inline SVG so html-to-image exports it exactly as previewed.
import * as React from "react";
import { img } from "@/lib/image-cache";
import type { Callout, Scene, Theme } from "@/lib/types";

// ---------- Colour helpers ----------

export function shade(hex: string, percent: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const amt = Math.round((255 * percent) / 100);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((num >> shift) & 0xff) + amt));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function alpha(hex: string, a: number) {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(full, 16);
  if (!Number.isFinite(num)) return `rgba(0,0,0,${a})`;
  return `rgba(${(num >> 16) & 0xff}, ${(num >> 8) & 0xff}, ${num & 0xff}, ${Math.max(0, Math.min(1, a))})`;
}

// Deterministic 0–1 noise so decorations sit in the same place in the editor,
// thumbnails and every export.
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- Backdrop ----------

type BackdropProps = {
  scene: Scene;
  theme: Theme;
  cW: number;
  cH: number;
  /** Position of this screen in the strip and the strip length. */
  index: number;
  count: number;
  base: string;
  fg: string;
  accent: string;
  dark: boolean;
  /** Theme's inverted background (not a custom colour); matches the classic gradient depth. */
  inverted: boolean;
  /** The slide's own `inverted` flag; the classic blobs key their opacity off it. */
  blobsInverted?: boolean;
};

/**
 * One screen's backdrop. With `scene.span`, the art layer is laid out across
 * the whole strip and this screen shows its slice, so shapes flow over seams.
 * The base colour stays per screen, so inverted and custom-colour screens keep
 * their own background.
 */
export function SceneBackdrop(props: BackdropProps) {
  const { scene, cW, cH, index, count, base } = props;
  const span = scene.span && count > 1;
  const stripW = span ? cW * count : cW;
  const offset = span ? -index * cW : 0;
  const baseFill =
    scene.backdrop === "gradient"
      ? `linear-gradient(160deg, ${base} 0%, ${shade(base, props.inverted ? -8 : -6)} 100%)`
      : base;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: baseFill, pointerEvents: "none" }}>
      <div
        data-scene-art={scene.backdrop}
        style={{
          position: "absolute",
          left: offset,
          top: 0,
          width: stripW,
          height: cH,
          background: backdropArt(props, stripW, span),
        }}
      />
      {scene.backdrop === "spotlight" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse ${cW * 0.75}px ${cH * 0.62}px at ${cW / 2}px ${cH * 0.45}px, transparent 55%, rgba(0,0,0,${props.dark ? 0.45 : 0.16}) 100%)`,
          }}
        />
      )}
      <SceneDecor {...props} stripW={stripW} offset={offset} span={span} />
    </div>
  );
}

function backdropArt(p: BackdropProps, stripW: number, span: boolean): string | undefined {
  const { cW, cH, fg, accent, dark, theme } = p;
  const second = theme.accentAlt && theme.accentAlt !== accent ? theme.accentAlt : theme.muted;
  const unit = Math.min(cW, cH);
  switch (p.scene.backdrop) {
    case "gradient":
      return span
        ? `linear-gradient(100deg, transparent 0%, ${alpha(accent, 0.16)} 28%, transparent 52%, ${alpha(accent, 0.12)} 78%, transparent 100%)`
        : undefined;
    case "solid":
      return undefined;
    case "aurora": {
      // A row of soft colour pools; spanning decks get one per ~0.7 screens so
      // pools straddle the seams.
      const pools = Math.max(2, Math.round((stripW / cW) * (span ? 1.4 : 2)));
      const layers: string[] = [];
      for (let i = 0; i < pools; i++) {
        const x = ((i + 0.5) / pools) * stripW + (hash01(i + 3) - 0.5) * cW * 0.25;
        const y = (i % 2 === 0 ? 0.18 : 0.78) * cH + (hash01(i + 11) - 0.5) * cH * 0.12;
        const color = [accent, second, fg][i % 3];
        const strength = i % 3 === 2 ? 0.12 : dark ? 0.55 : 0.42;
        const r = cW * (0.75 + hash01(i + 5) * 0.35);
        layers.push(`radial-gradient(circle at ${x}px ${y}px, ${alpha(color, strength)} 0px, transparent ${r}px)`);
      }
      return layers.join(", ");
    }
    case "spotlight": {
      const lights: string[] = [];
      const screens = Math.round(stripW / cW);
      for (let i = 0; i < screens; i++) {
        const x = span ? (i + 0.5 + (i % 2 === 0 ? -0.32 : 0.32)) * cW : cW * 0.5;
        const light = dark ? alpha(accent, 0.42) : "rgba(255,255,255,0.75)";
        lights.push(`radial-gradient(ellipse ${cW * 0.7}px ${cH * 0.45}px at ${x}px ${cH * 0.12}px, ${light} 0px, transparent 100%)`);
      }
      // The vignette is a separate, unshifted layer (see SceneBackdrop) so
      // every screen gets its own dark corners even when the lights span.
      return lights.join(", ");
    }
    case "grid": {
      const g = Math.round(unit * 0.08);
      const line = alpha(fg, dark ? 0.1 : 0.08);
      const w = Math.max(1, Math.round(unit * 0.0016));
      return [
        `radial-gradient(ellipse ${cW * 0.8}px ${cH * 0.4}px at ${stripW / 2}px ${cH * 0.55}px, ${alpha(accent, 0.18)} 0px, transparent 100%)`,
        `repeating-linear-gradient(90deg, ${line} 0px, ${line} ${w}px, transparent ${w}px, transparent ${g}px)`,
        `repeating-linear-gradient(0deg, ${line} 0px, ${line} ${w}px, transparent ${w}px, transparent ${g}px)`,
      ].join(", ");
    }
    case "dots": {
      const g = Math.round(unit * 0.055);
      const dot = alpha(fg, dark ? 0.2 : 0.14);
      const r = Math.max(1.5, unit * 0.0045);
      return [
        `radial-gradient(circle at ${g / 2}px ${g / 2}px, ${dot} 0px, ${dot} ${r}px, transparent ${r + 0.8}px)`,
      ].join(", ") + ` 0 0 / ${g}px ${g}px`;
    }
    case "lines": {
      const g = Math.round(unit * 0.06);
      const line = alpha(fg, dark ? 0.1 : 0.09);
      const w = Math.max(1, Math.round(unit * 0.0016));
      return `repeating-linear-gradient(180deg, transparent 0px, transparent ${g - w}px, ${line} ${g - w}px, ${line} ${g}px)`;
    }
  }
}

function SceneDecor({
  scene,
  cW,
  cH,
  accent,
  dark,
  inverted,
  blobsInverted,
  index,
  count,
  stripW,
  offset,
  span,
}: BackdropProps & { stripW: number; offset: number; span: boolean }) {
  if (scene.decoration === "none") return null;
  const screens = Math.max(1, Math.round(stripW / cW));
  // Spanning decks centre shapes on the seams between screens.
  const anchors: { x: number; y: number; k: number }[] = [];
  if (span) {
    for (let i = 0; i <= count; i++) {
      anchors.push({ x: i * cW, y: (i % 2 === 0 ? 0.12 : 0.86) * cH, k: i });
    }
  } else {
    anchors.push({ x: -0.05 * cW, y: 0.06 * cH, k: 0 });
    anchors.push({ x: 0.98 * cW, y: 0.9 * cH, k: 1 });
  }

  if (scene.decoration === "blobs" && !span) {
    // The classic pair, exactly as decks rendered before scenes existed.
    return (
      <>
        {[
          { left: -0.15, top: -0.1, size: 0.55, opacity: (blobsInverted ?? inverted) ? 0.25 : 0.32 },
          { left: 0.7, top: 0.75, size: 0.45, opacity: (blobsInverted ?? inverted) ? 0.18 : 0.25 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.left * cW,
              top: b.top * cH,
              width: b.size * cW,
              height: b.size * cW,
              background: accent,
              borderRadius: "50%",
              filter: `blur(${cW * 0.06}px)`,
              opacity: b.opacity,
            }}
          />
        ))}
      </>
    );
  }

  if (scene.decoration === "blobs") {
    return (
      <div style={{ position: "absolute", left: offset, top: 0, width: stripW, height: cH }}>
        {anchors.map(({ x, y, k }) => {
          const size = cW * (k % 2 === 0 ? 0.55 : 0.45);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                borderRadius: "50%",
                background: accent,
                filter: `blur(${cW * 0.06}px)`,
                opacity: dark ? (k % 2 === 0 ? 0.25 : 0.18) : k % 2 === 0 ? 0.32 : 0.25,
              }}
            />
          );
        })}
      </div>
    );
  }

  if (scene.decoration === "rings") {
    const stroke = Math.max(2, cW * 0.004);
    return (
      <svg
        width={stripW}
        height={cH}
        viewBox={`0 0 ${stripW} ${cH}`}
        style={{ position: "absolute", left: offset, top: 0, overflow: "visible" }}
      >
        {anchors.map(({ x, y, k }) =>
          [0.22, 0.32, 0.42].map((r, j) => (
            <circle
              key={`${k}-${j}`}
              cx={x}
              cy={y}
              r={cW * r}
              fill="none"
              stroke={accent}
              strokeWidth={stroke}
              opacity={dark ? 0.32 - j * 0.07 : 0.4 - j * 0.09}
            />
          )),
        )}
      </svg>
    );
  }

  // Sparkles: four-point stars scattered with a fixed seed per screen.
  const stars: { x: number; y: number; s: number; o: number }[] = [];
  for (let i = 0; i < screens; i++) {
    for (let j = 0; j < 5; j++) {
      // Isolated screens each get their own scatter rather than a repeat.
      const n = (span ? i : index) * 7 + j;
      const yBand = j % 2 === 0 ? 0.04 + hash01(n + 1) * 0.26 : 0.62 + hash01(n + 2) * 0.32;
      stars.push({
        x: (i + 0.06 + hash01(n + 3) * 0.88) * cW,
        y: yBand * cH,
        s: cW * (0.025 + hash01(n + 4) * 0.045),
        o: 0.45 + hash01(n + 5) * 0.45,
      });
    }
  }
  return (
    <svg
      width={stripW}
      height={cH}
      viewBox={`0 0 ${stripW} ${cH}`}
      style={{ position: "absolute", left: offset, top: 0, overflow: "visible" }}
    >
      {stars.map(({ x, y, s, o }, i) => (
        <path
          key={i}
          d={`M ${x} ${y - s} Q ${x} ${y} ${x + s} ${y} Q ${x} ${y} ${x} ${y + s} Q ${x} ${y} ${x - s} ${y} Q ${x} ${y} ${x} ${y - s} Z`}
          fill={accent}
          opacity={dark ? o : o * 0.85}
        />
      ))}
    </svg>
  );
}

// ---------- Device depth ----------

/** Shadow, glow and 3D tilt around a device frame. Classic scenes render the frame untouched. */
export function DeviceDepth({
  scene,
  cW,
  accent,
  children,
}: {
  scene: Scene;
  cW: number;
  accent: string;
  children: React.ReactNode;
}) {
  if (!scene.shadow && !scene.glow && !scene.tilt) return <>{children}</>;
  const s = scene.shadow / 100;
  const g = scene.glow / 100;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {g > 0 && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-14% -38%",
            background: `radial-gradient(closest-side, ${alpha(accent, 0.95 * g)} 0%, ${alpha(accent, 0.42 * g)} 55%, transparent 100%)`,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          filter: s > 0
            ? `drop-shadow(0 ${cW * 0.03 * s}px ${cW * 0.045 * s}px rgba(0,0,0,${0.12 + 0.33 * s}))`
            : undefined,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: scene.tilt
              ? `perspective(${cW * 2.6}px) rotateY(${scene.tilt}deg) rotateX(${Math.abs(scene.tilt) * 0.22}deg)`
              : undefined,
            transformOrigin: "center center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------- Magnified callout ----------

/**
 * A loupe showing part of the screenshot at `zoom`× the size it appears on the
 * device. `screenWidth` is the device's on-canvas screen width in canvas px.
 */
export function CalloutLoupe({
  callout,
  src,
  screenWidth,
  cW,
  accent,
  hideEmpty,
}: {
  callout: Callout;
  src: string;
  screenWidth: number;
  cW: number;
  accent: string;
  hideEmpty?: boolean;
}) {
  const resolved = img(src);
  const border = Math.max(3, cW * 0.009);
  // A % radius resolves against width and height separately, so a wide lens
  // got stretched elliptical corners. A canvas-relative px radius stays round.
  const radius = callout.shape === "circle" ? "50%" : `${cW * 0.035}px`;
  // An export without a screenshot shouldn't ship an empty lens.
  if (!resolved && hideEmpty) return null;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: radius,
        overflow: "hidden",
        background: "#0f0f12",
        boxShadow: `0 0 0 ${border}px #ffffff, 0 ${cW * 0.025}px ${cW * 0.06}px rgba(0,0,0,0.32)`,
      }}
    >
      {resolved ? (
        <img
          src={resolved}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: screenWidth * callout.zoom,
            maxWidth: "none",
            height: "auto",
            transform: `translate(${-callout.focusX * 100}%, ${-callout.focusY * 100}%)`,
          }}
        />
      ) : hideEmpty ? null : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: cW * 0.03,
            fontWeight: 600,
            textAlign: "center",
            background: `radial-gradient(circle, ${alpha(accent, 0.45)} 0%, #0f0f12 75%)`,
          }}
        >
          Add a screenshot
        </div>
      )}
    </div>
  );
}

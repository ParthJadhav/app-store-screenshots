"use client";

import * as React from "react";
import { img } from "@/lib/image-cache";
import { pickText } from "@/lib/locale";
import type { CanvasSettings, Slide, Theme } from "@/lib/types";

export function EditableText({
  value,
  editable,
  multiline = false,
  placeholder,
  style,
  onChange,
  onFocus,
}: {
  value: string;
  editable?: boolean;
  multiline?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  onChange?: (value: string) => void;
  onFocus?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const element = ref.current;
    if (element && document.activeElement !== element && element.textContent !== value) element.textContent = value;
  }, [value]);
  return (
    <div
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={onFocus}
      onInput={(event) => {
        const text = event.currentTarget.innerText.replace(/\u00a0/g, " ");
        onChange?.(multiline ? text : text.replace(/\n/g, ""));
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onPointerDown={(event) => editable && event.stopPropagation()}
      style={{ outline: "none", whiteSpace: multiline ? "pre-wrap" : "nowrap", cursor: editable ? "text" : "default", ...style }}
    />
  );
}

function shade(hex: string, percent: number) {
  const value = hex.replace("#", "");
  const numeric = parseInt(value.length === 3 ? value.split("").map((part) => part + part).join("") : value, 16);
  const amount = Math.round(255 * percent / 100);
  const channel = (offset: number) => Math.max(0, Math.min(255, ((numeric >> offset) & 0xff) + amount));
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}

export function SlideBackground({ slide, theme, canvasWidth }: { slide: Slide; theme: Theme; canvasWidth: number }) {
  const inverted = !!slide.inverted;
  const background = inverted
    ? theme.backgroundAlt || `linear-gradient(160deg, ${theme.bgAlt}, ${shade(theme.bgAlt, -8)})`
    : theme.background || `linear-gradient(160deg, ${theme.bg}, ${shade(theme.bg, -6)})`;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background, color: inverted ? theme.fgAlt : theme.fg }}>
      <div style={{ position: "absolute", left: "-15%", top: "-10%", width: "55%", aspectRatio: "1", borderRadius: "50%", background: theme.accent, filter: `blur(${canvasWidth * 0.06}px)`, opacity: inverted ? 0.25 : 0.3 }} />
      <div style={{ position: "absolute", left: "70%", top: "75%", width: "45%", aspectRatio: "1", borderRadius: "50%", background: theme.accent, filter: `blur(${canvasWidth * 0.06}px)`, opacity: inverted ? 0.18 : 0.24 }} />
    </div>
  );
}

export function Caption({
  slide,
  theme,
  locale,
  canvasWidth,
  canvasHeight,
  align,
  editable,
  onLabelChange,
  onHeadlineChange,
  onFocus,
}: {
  slide: Slide;
  theme: Theme;
  locale: string;
  canvasWidth: number;
  canvasHeight: number;
  align: "center" | "left";
  editable?: boolean;
  onLabelChange?: (value: string) => void;
  onHeadlineChange?: (value: string) => void;
  onFocus?: () => void;
}) {
  const unit = Math.min(canvasWidth, canvasHeight);
  const foreground = slide.inverted ? theme.fgAlt : theme.fg;
  return (
    <div style={{ width: "100%", textAlign: align, fontFamily: theme.fontFamily }}>
      <EditableText
        value={pickText(slide.label, locale)}
        editable={editable}
        onChange={onLabelChange}
        onFocus={onFocus}
        placeholder="LABEL"
        style={{ fontSize: unit * 0.028, fontWeight: 600, letterSpacing: unit * 0.0015, color: theme.accent, textTransform: "uppercase", marginBottom: unit * 0.018, minHeight: unit * 0.03 }}
      />
      <EditableText
        value={pickText(slide.headline, locale)}
        editable={editable}
        multiline
        onChange={onHeadlineChange}
        onFocus={onFocus}
        placeholder="Headline goes here"
        style={{ fontFamily: theme.headlineFontFamily || theme.fontFamily, fontSize: unit * 0.092, fontWeight: 700, lineHeight: 0.96, letterSpacing: -unit * 0.001, color: foreground }}
      />
    </div>
  );
}

export function FeatureGraphic({
  slide,
  theme,
  locale,
  appName,
  appIcon,
  canvasWidth,
  editable,
  onHeadlineChange,
}: {
  slide: Slide;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  canvasWidth: number;
  editable?: boolean;
  onHeadlineChange?: (value: string) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: theme.backgroundAlt || `linear-gradient(135deg, ${theme.bgAlt}, ${theme.accent})`, display: "flex", alignItems: "center", padding: `0 ${canvasWidth * 0.06}px`, color: theme.fgAlt, fontFamily: theme.fontFamily }}>
      <div style={{ display: "flex", alignItems: "center", gap: canvasWidth * 0.03, zIndex: 2 }}>
        {appIcon && img(appIcon) ? (
          <img src={img(appIcon)} alt="" draggable={false} style={{ width: canvasWidth * 0.13, height: canvasWidth * 0.13, borderRadius: theme.cornerRadius || canvasWidth * 0.022, boxShadow: "0 12px 36px rgba(0,0,0,.28)" }} />
        ) : (
          <div style={{ width: canvasWidth * 0.13, height: canvasWidth * 0.13, borderRadius: theme.cornerRadius || canvasWidth * 0.022, background: theme.accent, display: "grid", placeItems: "center", fontWeight: 800, fontSize: canvasWidth * 0.07 }}>{(appName || "A")[0].toUpperCase()}</div>
        )}
        <div>
          <div style={{ fontFamily: theme.headlineFontFamily || theme.fontFamily, fontSize: canvasWidth * 0.06, fontWeight: 800 }}>{appName || "App"}</div>
          <EditableText value={pickText(slide.headline, locale)} editable={editable} multiline onChange={onHeadlineChange} style={{ fontSize: canvasWidth * 0.028, marginTop: canvasWidth * 0.012, lineHeight: 1.25 }} />
        </div>
      </div>
    </div>
  );
}

export function CanvasOverlays({
  canvasWidth,
  canvasHeight,
  settings,
  index,
  active,
}: {
  canvasWidth: number;
  canvasHeight: number;
  settings?: CanvasSettings;
  index: number;
  active: boolean;
}) {
  if (!settings) return null;
  const insetX = canvasWidth * settings.safeAreaPercent / 100;
  const insetY = canvasHeight * settings.safeAreaPercent / 100;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10000, outline: `${active ? 4 : 2}px solid ${active ? "rgba(91,124,250,.95)" : "rgba(15,23,42,.2)"}`, outlineOffset: active ? -4 : -2 }}>
      <div style={{ position: "absolute", left: canvasWidth * 0.035, top: canvasHeight * 0.024, borderRadius: 999, padding: `${canvasHeight * 0.006}px ${canvasWidth * 0.018}px`, background: active ? "rgba(91,124,250,.92)" : "rgba(15,23,42,.72)", color: "white", fontSize: Math.max(24, canvasWidth * 0.022), fontWeight: 700 }}>{index + 1}</div>
      {settings.showSafeAreas && <div data-testid="safe-area" style={{ position: "absolute", left: insetX, right: insetX, top: insetY, bottom: insetY, border: `${Math.max(2, canvasWidth * 0.0015)}px dashed rgba(255,255,255,.72)`, boxShadow: "0 0 0 1px rgba(15,23,42,.24)" }} />}
      {settings.showRulers && (
        <>
          <div data-testid="horizontal-ruler" style={{ position: "absolute", left: 0, right: 0, top: 0, height: Math.max(16, canvasHeight * 0.012), background: "repeating-linear-gradient(90deg, rgba(15,23,42,.5) 0 2px, transparent 2px 5%)" }} />
          <div data-testid="vertical-ruler" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.max(16, canvasWidth * 0.012), background: "repeating-linear-gradient(180deg, rgba(15,23,42,.5) 0 2px, transparent 2px 5%)" }} />
        </>
      )}
    </div>
  );
}

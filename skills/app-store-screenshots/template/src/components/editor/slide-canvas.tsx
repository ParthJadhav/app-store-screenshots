"use client";
import * as React from "react";
import { Rnd } from "react-rnd";
import { RotateCw } from "lucide-react";
import type {
  Device,
  ElementId,
  ElementTransform,
  ImageElement,
  Orientation,
  Scene,
  SelectedElement,
  Slide,
  TextElement,
  Theme,
} from "@/lib/types";
import { toImageElementId, toTextElementId } from "@/lib/elements";
import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot } from "@/lib/locale";
import { isDarkColor, slideColors } from "@/lib/contrast";
import { defaultTextElementFontSize, slideFontScales } from "@/lib/typography";
import { sceneOf } from "@/lib/scene";
import { canvasSize, centredCrop, creativeSpec, duoCompanion, isCreative, isDuoDevice } from "@/lib/devices";
import { duoGeometry } from "@/lib/frame-assets";
import {
  SCREEN_WIDTH_FRACTION,
  elementZ,
  getSlideGeometry,
  isFeatureGraphic,
  rectFor,
  showsDevice,
  type Rect,
} from "@/lib/layouts";
import { frameComponent } from "./device-frames";
import { ImageElementCanvas } from "./image-element-canvas";
import { CalloutLoupe, DeviceDepth, SceneBackdrop, shade } from "./scene-layers";

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
};

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily?: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  // Preview scale (1.0 = full size). Used so react-rnd maps drag deltas correctly
  // when the canvas is rendered inside a CSS-transformed container.
  previewScale?: number;
  /** When true, suppress the "Drop a screenshot here" placeholder. Used for export. */
  hideEmpty?: boolean;
  scene?: Scene;
  /** Where this screen sits in the full deck, for backdrops that span the strip. */
  stripIndex?: number;
  stripCount?: number;
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, v: string) => void;
  onHeadlineChange?: (slideId: string, v: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, v: string) => void;
  onElementChange?: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (element: SelectedElement | null) => void;
  onSelectScreen?: (slideId: string) => void;
};

type DeckCanvasProps = {
  slides: Slide[];
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily?: string;
  connectedCanvas?: boolean;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
  scene?: Scene;
  /** When `slides` is a slice of a longer deck: its first index and the deck length. */
  stripStart?: number;
  stripCount?: number;
};

// ---------- Editable text helpers ----------

function EditableText({
  value,
  editable,
  onChange,
  style,
  multiline = false,
  placeholder,
  onFocus,
}: {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value || "";
    if (el.textContent !== incoming && document.activeElement !== el) {
      el.textContent = incoming;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    // A cleared contenteditable keeps a placeholder <br>, which innerText
    // reports as "\n"; that would save a blank line instead of clearing.
    const raw = e.currentTarget.textContent ? e.currentTarget.innerText : "";
    const text = (raw || "").replace(/\u00a0/g, " ");
    onChange(multiline ? text : text.replace(/\n/g, ""));
  };

  return (
    <div
      ref={ref}
      // Per-text base direction: RTL copy (ar, he, fa, ur) keeps its
      // punctuation on the correct side without flipping LTR locales.
      dir="auto"
      // Plain text only: pasted or dropped rich text would otherwise keep its
      // colours and fonts on the canvas while the export uses the plain copy.
      contentEditable={editable ? "plaintext-only" : false}
      suppressContentEditableWarning
      data-placeholder={editable ? placeholder : undefined}
      onInput={handleInput}
      onFocus={() => onFocus?.()}
      onBlur={(e) => {
        // Edits skip syncing while focused; catch up so the canvas shows what
        // will export (e.g. clearing a translation falls back to English).
        const incoming = value || "";
        if (e.currentTarget.textContent !== incoming) e.currentTarget.textContent = incoming;
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onMouseDown={(e) => {
        // Allow text editing without starting an Rnd drag.
        if (editable) {
          e.stopPropagation();
          onFocus?.();
        }
      }}
      onPointerDown={(e) => {
        if (editable) e.stopPropagation();
      }}
      style={{
        outline: "none",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: editable ? "text" : "default",
        ...style,
      }}
    />
  );
}

// ---------- Caption (label + headline) ----------

function Caption({
  cW,
  cH,
  slide,
  theme,
  locale,
  editable,
  edit,
  align = "center",
  inverted,
  scene,
  onFocus,
  typeUnit,
}: {
  cW: number;
  cH: number;
  slide: Slide;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  align?: "center" | "left";
  inverted?: boolean;
  scene: Scene;
  onFocus?: () => void;
  /** Typography unit; defaults to the canvas's shorter side. */
  typeUnit?: number;
}) {
  const { fg, accent } = slideColors(theme, { inverted, backgroundColor: slide.backgroundColor });
  const { labelScale, headlineScale } = slideFontScales(slide);
  // Scale typography off the *shorter* dimension so landscape layouts don't
  // produce headlines so tall they overlap the device frame.
  const unit = typeUnit ?? Math.min(cW, cH);
  return (
    // "start" rather than "left" so a left-set caption hugs the right edge in RTL.
    <div style={{ textAlign: align === "left" ? "start" : align, position: "relative", width: "100%" }}>
      <EditableText
        value={pickText(slide.label, locale)}
        editable={editable}
        onChange={edit?.onLabelChange}
        onFocus={onFocus}
        placeholder="LABEL"
        style={{
          // Floor keeps the label legible on the 422×514 Apple Watch canvas;
          // the per-slide scale is applied on top of the floored base.
          fontSize: Math.max(unit * 0.028, 16) * labelScale,
          fontWeight: 600,
          letterSpacing: Math.max(unit * 0.0015, 0.8) * labelScale,
          color: accent,
          textTransform: "uppercase",
          marginBottom: unit * 0.018,
          minHeight: unit * 0.03,
        }}
      />
      <EditableText
        value={pickText(slide.headline, locale)}
        editable={editable}
        multiline
        onChange={edit?.onHeadlineChange}
        onFocus={onFocus}
        placeholder="Headline goes here"
        style={{
          fontSize: unit * 0.092 * headlineScale * scene.headlineScale,
          fontWeight: scene.headlineWeight,
          lineHeight: 0.96,
          letterSpacing: (scene.headlineCase === "upper" ? unit * 0.0015 : -unit * 0.001) * headlineScale,
          textTransform: scene.headlineCase === "upper" ? "uppercase" : undefined,
          color: fg,
        }}
      />
    </div>
  );
}

// ---------- Decorative blob ----------

function Blob({
  cW,
  color,
  x,
  y,
  size,
  opacity = 0.4,
}: {
  cW: number;
  color: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        background: color,
        borderRadius: "50%",
        filter: `blur(${cW * 0.06}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ---------- Main single-screen canvas ----------

export function SlideCanvas({
  slide,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  editable,
  edit,
  selectedElementId = null,
  previewScale = 1,
  hideEmpty,
  scene: rawScene,
  stripIndex = 0,
  stripCount = 1,
}: Props) {
  const { cW, cH } = canvasSize(device, orientation);
  const scene = sceneOf(rawScene);

  if (isFeatureGraphic(slide, device)) {
    return (
      <div style={{ width: "100%", height: "100%", fontFamily }}>
        <FeatureGraphicCanvas
          slide={slide}
          cW={cW}
          theme={theme}
          locale={locale}
          appName={appName}
          appIcon={appIcon}
          editable={editable}
          edit={edit}
        />
      </div>
    );
  }

  const handleBackgroundMouseDown = editable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
      }
    : undefined;

  return (
    <div
      onMouseDown={handleBackgroundMouseDown}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} scene={scene} index={stripIndex} count={stripCount} />
      <SlideElements
        slide={slide}
        scene={scene}
        device={device}
        orientation={orientation}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        selectedElementId={selectedElementId}
        previewScale={previewScale}
        hideEmpty={hideEmpty}
        screenX={0}
        boundsW={cW}
        boundsH={cH}
        allowCrossScreen={false}
      />
    </div>
  );
}

// ---------- Connected deck canvas ----------

export function DeckCanvas({
  slides,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  connectedCanvas = true,
  editable,
  edit,
  selectedElement = null,
  activeSlideId = null,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
  scene: rawScene,
  stripStart = 0,
  stripCount,
}: DeckCanvasProps) {
  const { cW, cH } = canvasSize(device, orientation);
  const scene = sceneOf(rawScene);
  const totalW = Math.max(1, slides.length) * cW;

  return (
    <div
      style={{
        width: totalW,
        height: cH,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {slides.map((slide, index) => {
        const screenX = index * cW;
        const active = activeSlideId === slide.id;
        if (isFeatureGraphic(slide, device)) {
          return (
            <div
              key={`${slide.id}-feature`}
              onMouseDown={(e) => {
                if (!editable || e.defaultPrevented) return;
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(null);
              }}
              style={{
                position: "absolute",
                left: screenX,
                top: 0,
                width: cW,
                height: cH,
                overflow: "hidden",
              }}
            >
              <FeatureGraphicCanvas
                slide={slide}
                cW={cW}
                theme={theme}
                locale={locale}
                appName={appName}
                appIcon={appIcon}
                editable={editable}
                edit={{
                  onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
                  onSelectElement: () => edit?.onSelectScreen?.(slide.id),
                }}
              />
              {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
            </div>
          );
        }
        return (
          <div
            key={`${slide.id}-bg`}
            onMouseDown={(e) => {
              if (!editable || e.defaultPrevented) return;
              edit?.onSelectScreen?.(slide.id);
              edit?.onSelectElement?.(null);
            }}
            style={{
              position: "absolute",
              left: screenX,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} scene={scene} index={stripStart + index} count={stripCount ?? slides.length} />
            {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
          </div>
        );
      })}

      {slides.map((slide, index) => {
        if (isFeatureGraphic(slide, device)) return null;
        const selectedElementId =
          selectedElement?.slideId === slide.id ? selectedElement.elementId : null;
        const perSlideEdit: EditHandlers | undefined = editable
          ? {
              onLabelChange: (v) => edit?.onLabelChange?.(slide.id, v),
              onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
              onTextElementTextChange: (id, v) => edit?.onTextElementTextChange?.(slide.id, id, v),
              onElementChange: (id, t) => edit?.onElementChange?.(slide.id, id, t),
              onSelectElement: (id) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(id ? { slideId: slide.id, elementId: id } : null);
              },
            }
          : undefined;

        const elements = (
          <SlideElements
            key={`${slide.id}-elements`}
            slide={slide}
            scene={scene}
            device={device}
            orientation={orientation}
            theme={theme}
            locale={locale}
            editable={editable}
            edit={perSlideEdit}
            selectedElementId={selectedElementId}
            previewScale={previewScale}
            hideEmpty={hideEmpty}
            screenX={connectedCanvas ? index * cW : 0}
            boundsW={connectedCanvas ? totalW : cW}
            boundsH={cH}
            allowCrossScreen={connectedCanvas}
          />
        );
        if (connectedCanvas) return elements;
        return (
          <div
            key={`${slide.id}-elements-isolated`}
            style={{
              position: "absolute",
              left: index * cW,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            {elements}
          </div>
        );
      })}

      {showGuides && isCreative(device) &&
        slides.map((slide, index) => (
          <CreativeGuide key={`${slide.id}-creative-guide`} device={device} cW={cW} cH={cH} left={index * cW} />
        ))}
    </div>
  );
}

// Editor-only overlay (never exported): Apple's art safe area, plus how the
// universal asset may be cropped in each placement.
function CreativeGuide({ device, cW, cH, left }: { device: Device; cW: number; cH: number; left: number }) {
  if (!isCreative(device)) return null;
  const { safe, crops } = creativeSpec(device);
  const line = Math.max(3, cW * 0.0012);
  const tag = (text: string, color: string, outside = false): React.ReactNode => (
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: outside ? "translateY(-100%)" : undefined,
        background: color,
        color: "white",
        fontSize: Math.max(24, cW * 0.0075),
        fontWeight: 700,
        lineHeight: 1,
        padding: `${line * 2}px ${line * 3}px`,
        whiteSpace: "nowrap",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {text}
    </span>
  );
  return (
    <div
      aria-hidden
      data-creative-guide
      style={{ position: "absolute", left, top: 0, width: cW, height: cH, pointerEvents: "none", zIndex: 1000 }}
    >
      {crops.map((crop) => {
        const r = centredCrop(cW, cH, crop.aspect);
        return (
          <div
            key={crop.label}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              outline: `${line}px dashed rgba(250, 204, 21, 0.9)`,
              outlineOffset: -line,
            }}
          >
            {tag(`${crop.label} (estimate)`, "rgba(161, 98, 7, 0.9)")}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: safe.x,
          top: safe.y,
          width: safe.w,
          height: safe.h,
          outline: `${line}px solid rgba(34, 197, 94, 0.95)`,
          outlineOffset: -line,
          background: "rgba(34, 197, 94, 0.06)",
        }}
      >
        {tag("Art safe area", "rgba(21, 128, 61, 0.95)", true)}
      </div>
    </div>
  );
}

function SlideBackground({
  slide,
  cW,
  cH,
  theme,
  scene,
  index,
  count,
}: {
  slide: Slide;
  cW: number;
  cH: number;
  theme: Theme;
  scene: Scene;
  index: number;
  count: number;
}) {
  const inverted = !!slide.inverted;
  const colors = slideColors(theme, slide);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: colors.fg,
      }}
    >
      <SceneBackdrop
        scene={scene}
        theme={theme}
        cW={cW}
        cH={cH}
        index={index}
        count={count}
        base={slide.backgroundColor || (inverted ? theme.bgAlt : theme.bg)}
        fg={colors.fg}
        accent={theme.accent}
        dark={isDarkColor(slide.backgroundColor || (inverted ? theme.bgAlt : theme.bg))}
        inverted={inverted && !slide.backgroundColor}
        blobsInverted={inverted}
      />
    </div>
  );
}


function ScreenGuide({
  cW,
  cH,
  index,
  active,
}: {
  cW: number;
  cH: number;
  index: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        outline: `${active ? Math.max(4, cW * 0.003) : Math.max(2, cW * 0.0015)}px solid ${
          active ? "rgba(91, 124, 250, 0.95)" : "rgba(15, 23, 42, 0.22)"
        }`,
        outlineOffset: active ? -Math.max(4, cW * 0.003) : -Math.max(2, cW * 0.0015),
        boxShadow: active
          ? "inset 0 0 0 9999px rgba(91, 124, 250, 0.03)"
          : "inset 0 0 0 1px rgba(255, 255, 255, 0.22)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cW * 0.035,
          top: cH * 0.024,
          borderRadius: cW * 0.018,
          padding: `${cH * 0.006}px ${cW * 0.018}px`,
          background: active ? "rgba(91, 124, 250, 0.92)" : "rgba(15, 23, 42, 0.72)",
          color: "white",
          fontSize: Math.max(24, cW * 0.022),
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

function FeatureGraphicCanvas({
  slide,
  cW,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
}: {
  slide: Slide;
  cW: number;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
}) {
  const { headlineScale, appNameScale } = slideFontScales(slide);
  const inverted = slide.inverted ?? true;
  const bg = inverted ? theme.bgAlt : theme.bg;
  const colors = slideColors(theme, { ...slide, inverted });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: slide.backgroundColor || `linear-gradient(135deg, ${bg} 0%, ${shade(bg, -10)} 50%, ${theme.accent} 200%)`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${cW * 0.06}px`,
        color: colors.fg,
      }}
    >
      <Blob cW={cW} color={theme.accent} x={70} y={20} size={50} opacity={0.45} />
      <div style={{ display: "flex", alignItems: "center", gap: cW * 0.03, zIndex: 2 }}>
        {appIcon && img(appIcon) ? (
          <img
            src={img(appIcon)}
            alt=""
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
            draggable={false}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              background: `linear-gradient(135deg, ${theme.accent}55, ${theme.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.fg,
              fontWeight: 800,
              fontSize: cW * 0.07,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            {(appName || "A").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: cW * 0.06 * appNameScale, fontWeight: 800, lineHeight: 1.05 }}>{appName || "App"}</div>
          <EditableText
            value={pickText(slide.headline, locale)}
            editable={editable}
            multiline
            onChange={edit?.onHeadlineChange}
            onFocus={() => edit?.onSelectElement?.("caption")}
            style={{
              fontSize: cW * 0.028 * headlineScale,
              color: colors.fg,
              opacity: 0.85,
              marginTop: cW * 0.012,
              lineHeight: 1.25,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SlideElements({
  slide,
  scene,
  device,
  orientation,
  theme,
  locale,
  editable,
  edit,
  selectedElementId,
  previewScale,
  hideEmpty,
  screenX,
  boundsW,
  boundsH,
  allowCrossScreen,
}: {
  slide: Slide;
  scene: Scene;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId: ElementId | null;
  previewScale: number;
  hideEmpty?: boolean;
  screenX: number;
  boundsW: number;
  boundsH: number;
  allowCrossScreen: boolean;
}) {
  const screenshot = resolveScreenshot(slide.screenshot, locale);
  const screenshotSecondary = resolveScreenshot(slide.screenshotSecondary, locale);
  const { cW, cH, frameAspect, defaults, typeUnit } = getSlideGeometry(slide, device, orientation);
  const Frame = frameComponent(device, orientation);
  const inverted = !!slide.inverted;
  const colors = slideColors(theme, slide);
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);
  const calloutRect = slide.callout && deviceRect && showsDevice(slide, device)
    ? rectFor("callout", slide, defaults)
    : undefined;

  function toGlobal(rect: Rect): Rect {
    return { ...rect, x: rect.x + screenX };
  }

  function toLocal(t: ElementTransform): ElementTransform {
    return { ...t, x: t.x - screenX };
  }

  function renderCaption() {
    if (!captionRect) return null;
    const saved = slide.transforms?.caption;
    const rotation = saved?.rotation ?? 0;
    const zIndex = elementZ(slide, "caption");
    const inner = (
      <Caption
        cW={cW}
        cH={cH}
        slide={slide}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        align={scene.captionAlign === "auto" ? captionRect.align || "center" : scene.captionAlign}
        inverted={inverted}
        scene={scene}
        typeUnit={typeUnit}
        onFocus={() => edit?.onSelectElement?.("caption")}
      />
    );
    return (
      <Movable
        rect={toGlobal(captionRect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            "caption",
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === "caption"}
        onSelect={() => edit?.onSelectElement?.("caption")}
        allowOverflow={allowCrossScreen}
      >
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
          {inner}
        </div>
      </Movable>
    );
  }

  // On iPhone Duo the back device is the same phone in its other state. Duo
  // frames also ignore the scene's tilt: Apple's marketing guidelines ask for
  // straight-on product images.
  const companion = isDuoDevice(device) ? duoCompanion(device) : null;

  function renderDevice(id: "device" | "deviceSecondary", rect: Rect, src: string, extraStyle?: React.CSSProperties) {
    const DeviceFrame = id === "deviceSecondary" && companion ? frameComponent(companion, orientation) : Frame;
    const aspect = id === "deviceSecondary" && companion ? duoGeometry(companion).aspect : frameAspect;
    const saved = slide.transforms?.[id];
    const rotation = saved?.rotation ?? 0;
    const zIndex = elementZ(slide, id);
    return (
      <Movable
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            id,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        lockAspectRatio={aspect}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === id}
        onSelect={() => edit?.onSelectElement?.(id)}
      >
        <DeviceDepth scene={companion ? { ...scene, tilt: 0 } : scene} cW={cW} accent={theme.accent}>
          <DeviceFrame
            src={src}
            hideEmpty={hideEmpty}
            style={{ width: "100%", height: "100%", ...extraStyle }}
          />
        </DeviceDepth>
      </Movable>
    );
  }

  function renderCallout(rect: Rect, deviceWidth: number) {
    const callout = slide.callout!;
    const saved = slide.transforms?.callout;
    const rotation = saved?.rotation ?? 0;
    const zIndex = elementZ(slide, "callout");
    return (
      <Movable
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            "callout",
            toLocal({ ...t, rotation: t.rotation ?? rotation, zIndex: t.zIndex ?? zIndex }),
          )
        }
        lockAspectRatio={callout.shape === "circle" ? 1 : undefined}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === "callout"}
        onSelect={() => edit?.onSelectElement?.("callout")}
      >
        <CalloutLoupe
          callout={callout}
          src={screenshot}
          screenWidth={deviceWidth * SCREEN_WIDTH_FRACTION}
          shortSide={Math.min(rect.width, rect.height)}
          cW={cW}
          accent={theme.accent}
          hideEmpty={hideEmpty}
        />
      </Movable>
    );
  }

  function renderTextElement(textElement: TextElement) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = elementZ(slide, elementId);
    const textColor = textElement.color || colors.fg;
    return (
      <Movable
        key={textElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              textElement.align === "right"
                ? "flex-end"
                : textElement.align === "left"
                  ? "flex-start"
                  : "center",
            padding: `${Math.min(cW, cH) * 0.012}px`,
          }}
        >
          <EditableText
            value={pickText(textElement.text, locale)}
            editable={editable}
            multiline
            onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
            onFocus={() => edit?.onSelectElement?.(elementId)}
            placeholder="Text"
            style={{
              width: "100%",
              color: textColor,
              fontSize: textElement.fontSize ?? defaultTextElementFontSize(cW, cH),
              fontWeight: textElement.fontWeight ?? 700,
              lineHeight: 1.05,
              textAlign: textElement.align ?? "center",
              textShadow: colors.dark ? "0 2px 18px rgba(0,0,0,0.22)" : "0 2px 18px rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </Movable>
    );
  }

  function renderImageElement(imageElement: ImageElement) {
    const elementId = toImageElementId(imageElement.id);
    const rect = imageElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = elementZ(slide, elementId);
    return (
      <Movable
        key={imageElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <ImageElementCanvas element={imageElement} editable={editable} />
      </Movable>
    );
  }

  return (
    <>
      {secondaryRect &&
        (companion
          // Another display's capture can't stand in for the companion's own.
          ? renderDevice("deviceSecondary", secondaryRect, screenshotSecondary)
          : renderDevice(
              "deviceSecondary",
              secondaryRect,
              screenshotSecondary || screenshot,
              { opacity: 0.85 },
            ))}
      {deviceRect && renderDevice("device", deviceRect, screenshot)}
      {renderCaption()}
      {calloutRect && deviceRect && renderCallout(calloutRect, deviceRect.width)}
      {(slide.imageElements || []).map((element) => renderImageElement(element))}
      {(slide.textElements || []).map((element) => renderTextElement(element))}
    </>
  );
}

// ---------- Movable wrapper ----------

// Fraction of an element's width/height that must remain inside the canvas
// when overflow is allowed. Keeps a graspable handle visible so the user can
// always drag the element back onto the canvas.
const MIN_VISIBLE_FRAC = 0.1;

function clampRect(
  r: { x: number; y: number; width: number; height: number },
  boundsW: number,
  boundsH: number,
  allowOverflow = false,
) {
  if (allowOverflow) {
    const width = r.width;
    const height = r.height;
    const minVisX = Math.max(8, width * MIN_VISIBLE_FRAC);
    const minVisY = Math.max(8, height * MIN_VISIBLE_FRAC);
    const x = Math.max(-(width - minVisX), Math.min(r.x, boundsW - minVisX));
    const y = Math.max(-(height - minVisY), Math.min(r.y, boundsH - minVisY));
    return { x, y, width, height };
  }
  const width = Math.min(r.width, boundsW);
  const height = Math.min(r.height, boundsH);
  const x = Math.max(0, Math.min(r.x, boundsW - width));
  const y = Math.max(0, Math.min(r.y, boundsH - height));
  return { x, y, width, height };
}

function Movable({
  rect,
  boundsW,
  boundsH,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  onSelect,
}: {
  rect: Rect;
  boundsW: number;
  boundsH: number;
  editable?: boolean;
  previewScale: number;
  onChange: (t: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  function startRotate(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const root = e.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = pointerAngle(e.clientX, e.clientY, centerX, centerY);
    const startRotation = rotationRef.current;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextRotation = normalizeRotation(
        startRotation + pointerAngle(event.clientX, event.clientY, centerX, centerY) - startAngle,
      );
      rotationRef.current = nextRotation;
      onChange({
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        rotation: nextRotation,
        zIndex,
      });
    };
    const stopRotate = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopRotate);
      window.removeEventListener("pointercancel", stopRotate);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", stopRotate, { once: true });
    window.addEventListener("pointercancel", stopRotate, { once: true });
  }

  // Rotation lives on the inner wrapper so the Rnd's axis-aligned rect remains
  // the authoritative bounding box for drag/resize math. A bare mousedown
  // listener (no stopPropagation — that would prevent react-rnd from starting
  // a drag) marks the element as the current selection.
  const rotated = (
    <div
      onMouseDown={() => {
        if (editable) onSelect?.();
      }}
      style={{
        width: "100%",
        height: "100%",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );

  // The editor shows the clamped rect, so export and thumbnails must place the
  // element there too — an out-of-bounds saved rect would otherwise export
  // somewhere the user never saw it.
  const display = clampRect(rect, boundsW, boundsH, allowOverflow);

  // Non-editable (export/thumb) path: plain absolute-positioned div, no Rnd.
  if (!editable) {
    return (
      <div
        style={{
          position: "absolute",
          left: display.x,
          top: display.y,
          width: display.width,
          height: display.height,
          zIndex,
        }}
      >
        {rotated}
      </div>
    );
  }

  const controlScale = Math.max(0.05, previewScale);

  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={() => onSelect?.()}
      onResizeStart={() => onSelect?.()}
      onDragStop={(_e, d) => {
        const next = clampRect(
          { x: d.x, y: d.y, width: display.width, height: display.height },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const next = clampRect(
          {
            x: position.x,
            y: position.y,
            width: parseFloat(ref.style.width),
            height: parseFloat(ref.style.height),
          },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      style={{ zIndex }}
      resizeHandleStyles={handleStyle}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {rotated}
      <button
        type="button"
        className="rnd-rotate-handle"
        style={{
          right: -14 / controlScale,
          top: -14 / controlScale,
          width: 28 / controlScale,
          height: 28 / controlScale,
        }}
        onPointerDown={startRotate}
        onFocus={() => onSelect?.()}
        title="Rotate"
        aria-label="Rotate element"
      >
        <RotateCw style={{ width: 14 / controlScale, height: 14 / controlScale }} />
      </button>
    </Rnd>
  );
}

function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next);
}

// Subtle resize handles (visible only on hover via globals.css).
const handleSize = 14;
const handleStyle: Record<string, React.CSSProperties> = {
  top: { height: handleSize },
  right: { width: handleSize },
  bottom: { height: handleSize },
  left: { width: handleSize },
  topRight: { width: handleSize, height: handleSize },
  bottomRight: { width: handleSize, height: handleSize },
  bottomLeft: { width: handleSize, height: handleSize },
  topLeft: { width: handleSize, height: handleSize },
};

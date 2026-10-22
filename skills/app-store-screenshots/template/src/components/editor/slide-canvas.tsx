"use client";
import * as React from "react";
import { Rnd } from "react-rnd";
import { RotateCw, Trash2 } from "lucide-react";
import type {
  BuiltInElementId,
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
import {
  CANVAS,
  CARPLAY_RATIO,
  CREATIVE_SPECS,
  centredCrop,
  frameFitW,
  isCreative,
  IPAD_RATIO,
  MAC_RATIO,
  MK_RATIO,
  TV_RATIO,
  WATCH_RATIO,
  carPlayW,
  ipadW,
  macW,
  phoneW,
  phoneWSmall,
  tabletLW,
  tabletPW,
  tvW,
  watchW,
} from "@/lib/constants";
import { imageElementKey, isImageElementId, toImageElementId, toTextElementId } from "@/lib/elements";
import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot } from "@/lib/locale";
import { relativeLuminance, slideColors } from "@/lib/contrast";
import { defaultTextElementFontSize, slideFontScales } from "@/lib/typography";
import { sceneOf } from "@/lib/scene";
import { DUO_COMPANION, bezelGeometry, duoGeometry, isDuoDevice, type DuoDevice } from "@/lib/frame-assets";
import {
  AndroidPhone,
  bezelFrameFor,
  DUO_FRAMES,
  AppleTV,
  AppleWatch,
  CarPlayScreen,
  AndroidTabletL,
  AndroidTabletP,
  IPad,
  MacWindow,
  Phone,
} from "./device-frames";
import { ImageElementCanvas } from "./image-element-canvas";
import { CalloutLoupe, DeviceDepth, SceneBackdrop, shade } from "./scene-layers";

type FrameComp = React.ComponentType<{
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
}>;

export function getCanvas(device: Device, orientation: Orientation) {
  const c = CANVAS[device];
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: c.wL!, cH: c.hL! };
  }
  return { cW: c.w, cH: c.h };
}

// Aspect ratio (w/h) of each device frame — must match device-frames.tsx
function getFrameAspect(device: Device, orientation: Orientation) {
  const bezel = bezelGeometry(device);
  if (bezel) return bezel.aspect;
  if (isCreative(device)) return MK_RATIO;
  switch (device) {
    case "iphone":      return MK_RATIO;
    case "android":     return 9 / 19.5;
    case "ipad":        return IPAD_RATIO;
    case "tvos":        return TV_RATIO;
    case "watchos":     return WATCH_RATIO;
    case "carplay":     return CARPLAY_RATIO;
    case "mac":         return MAC_RATIO;
    case "android-7":
    case "android-10":  return orientation === "landscape" ? 8 / 5 : 5 / 8;
    default:            return 1;
  }
}

// Height share and width clamps for a device under Apple's bezel; they match
// the built-in frame's width functions in constants.ts. The watch bezel
// includes its band, which takes nearly half its height; the band's top stays
// below a two-line headline.
const BEZEL_FIT: Partial<Record<Device, { height: number; clamp: number; small: number; smallHeight?: number }>> = {
  iphone: { height: 0.72, clamp: 0.84, small: 0.66 },
  ipad: { height: 0.72, clamp: 0.75, small: 0.6 },
  tvos: { height: 0.72, clamp: 0.58, small: 0.56 },
  watchos: { height: 0.66, clamp: 0.62, small: 0.5 },
  mac: { height: 0.58, clamp: 0.86, small: 0.46 },
  "creative-universal": { height: 0.62, clamp: 0.9, small: 0.7, smallHeight: 0.5 },
  "creative-header": { height: 0.62, clamp: 0.9, small: 0.7, smallHeight: 0.5 },
  "creative-search": { height: 0.62, clamp: 0.9, small: 0.7, smallHeight: 0.5 },
};

export function getFrameForDevice(device: Device, orientation: Orientation): {
  Comp: FrameComp;
  widthFn: (cW: number, cH: number) => number;
  smallWidthFn: (cW: number, cH: number) => number;
} {
  if (isDuoDevice(device)) {
    // Sized from the frame's real aspect, so the squarer inner display gets a
    // wider device instead of a stretched iPhone placement.
    const aspect = duoGeometry(device).aspect;
    return aspect > 1
      ? { Comp: DUO_FRAMES[device], widthFn: frameFitW(aspect, 0.58, 0.86), smallWidthFn: frameFitW(aspect, 0.46, 0.7) }
      : { Comp: DUO_FRAMES[device], widthFn: frameFitW(aspect, 0.66, 0.84), smallWidthFn: frameFitW(aspect, 0.52, 0.66) };
  }
  // Apple's own bezel, when the user has added it: the same placements as the
  // built-in frame, sized from the bezel's real aspect.
  const bezel = bezelGeometry(device);
  if (bezel) {
    const fit = BEZEL_FIT[device] ?? BEZEL_FIT.iphone!;
    return {
      Comp: bezelFrameFor(device),
      widthFn: frameFitW(bezel.aspect, fit.height, fit.clamp),
      smallWidthFn: frameFitW(bezel.aspect, fit.smallHeight ?? fit.height, fit.small),
    };
  }
  // Creatives lay out inside their safe area (see getSlideGeometry), so these
  // fractions are of the safe area, not the canvas.
  if (isCreative(device)) {
    return { Comp: Phone, widthFn: frameFitW(MK_RATIO, 0.62, 0.9), smallWidthFn: frameFitW(MK_RATIO, 0.5, 0.7) };
  }
  switch (device) {
    case "iphone":
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "ipad":
      return { Comp: IPad, widthFn: ipadW, smallWidthFn: (cW, cH) => ipadW(cW, cH, 0.6) };
    case "tvos":
      return { Comp: AppleTV, widthFn: tvW, smallWidthFn: (cW, cH) => tvW(cW, cH, 0.56) };
    case "watchos":
      return { Comp: AppleWatch, widthFn: watchW, smallWidthFn: (cW, cH) => watchW(cW, cH, 0.42) };
    case "carplay":
      return { Comp: CarPlayScreen, widthFn: carPlayW, smallWidthFn: (cW, cH) => carPlayW(cW, cH, 0.7) };
    case "mac":
      return { Comp: MacWindow, widthFn: macW, smallWidthFn: (cW, cH) => macW(cW, cH, 0.46) };
    case "android":
      return { Comp: AndroidPhone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "android-7":
    case "android-10":
      if (orientation === "landscape") {
        return { Comp: AndroidTabletL, widthFn: tabletLW, smallWidthFn: (cW, cH) => tabletLW(cW, cH, 0.5) };
      }
      return { Comp: AndroidTabletP, widthFn: tabletPW, smallWidthFn: (cW, cH) => tabletPW(cW, cH, 0.62) };
    default:
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
  }
}

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
  onDeleteDevice?: (id: "device" | "deviceSecondary") => void;
  onDeleteElement?: (id: ElementId) => void;
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
  onDeleteDevice?: (slideId: string, id: "device" | "deviceSecondary") => void;
  onDeleteElement?: (slideId: string, id: ElementId) => void;
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

// ---------- Default element rects per layout ----------

type Rect = { x: number; y: number; width: number; height: number };
type LayoutRects = {
  caption?: Rect & { align?: "center" | "left" };
  device?: Rect;
  deviceSecondary?: Rect;
  callout?: Rect;
};

function getDefaultRects(
  layout: Slide["layout"],
  cW: number,
  cH: number,
  frameAspect: number,
  fwFrac: number,
  fwSmallFrac: number,
  // Phones and tablets are deliberately hung past the canvas edge so they bleed off
  // it. When true (TV, watch, CarPlay, Mac), every device rect stays fully inside the
  // canvas instead.
  contain = false,
): LayoutRects {
  const deviceW = fwFrac * cW;
  const deviceH = deviceW / frameAspect;
  const smallW = fwSmallFrac * cW;
  const smallH = smallW / frameAspect;
  const capW = cW * 0.84;
  const capH = cH * 0.28;

  switch (layout) {
    case "hero":
      return {
        caption: { x: cW * 0.08, y: cH * 0.09, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: contain ? cH - deviceH - cH * 0.05 : cH - deviceH + deviceH * 0.15,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-bottom":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH - cH * 0.02,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-top":
      return {
        caption: { x: cW * 0.08, y: cH * 0.65, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: contain ? cH * 0.05 : -cH * 0.1,
          width: deviceW,
          height: deviceH,
        },
      };
    case "two-devices":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        deviceSecondary: {
          x: contain ? cW * 0.04 : -cW * 0.06,
          y: cH - smallH - cH * 0.05,
          width: smallW,
          height: smallH,
        },
        device: {
          x: contain ? cW - deviceW * 0.9 - cW * 0.04 : cW - deviceW * 0.9 + cW * 0.06,
          y: contain ? cH - (deviceW * 0.9) / frameAspect - cH * 0.05 : cH - deviceH * 0.9 - cH * 0.02,
          width: deviceW * 0.9,
          height: (deviceW * 0.9) / frameAspect,
        },
      };
    case "no-device":
      return {
        caption: {
          x: cW * 0.1,
          y: cH * 0.35,
          width: cW * 0.8,
          height: cH * 0.3,
          align: "center",
        },
      };
    case "split-landscape": {
      // Contained devices sit beside the caption instead of sliding under it.
      // The caption is beside it, not above, so it can be taller than elsewhere.
      const splitW = contain ? Math.min(cW * 0.5, cH * 0.84 * frameAspect) : deviceW;
      const splitH = splitW / frameAspect;
      return {
        caption: {
          x: cW * 0.05,
          y: cH * 0.25,
          width: cW * 0.38,
          height: cH * 0.5,
          align: "left",
        },
        device: {
          x: contain ? cW - splitW - cW * 0.05 : cW - deviceW + cW * 0.03,
          y: (cH - splitH) / 2,
          width: splitW,
          height: splitH,
        },
      };
    }
    default:
      return {};
  }
}

// ---------- iPhone Duo placements ----------
//
// Duo decks get their own placements, modelled on the first published Duo sets
// and Apple's guidance (see iphone-duo.md in the skill):
// - Landscape canvases (inner display opened, outer turned) are about as wide as
//   an iPad. A short headline runs across the top and the device is the hero,
//   wide enough that the capture reads, rather than a phone-sized device beside
//   a narrow column of copy.
// - "Two devices" becomes "Folded + open": the second device is the same phone in
//   its other state, drawn in that display's frame. Opening an upright closed
//   phone gives the inner display in landscape, at the same height, so that pair
//   is drawn to physical scale side by side.
// Portrait decks keep the phone placements from getDefaultRects.

/** Width of the companion frame that matches a primary frame `primaryW` wide, to physical scale. */
function physicalCompanionW(device: DuoDevice, primaryW: number) {
  const companion = DUO_COMPANION[device];
  const p = duoGeometry(device);
  const c = duoGeometry(companion);
  // Both displays are captured at the same pixel density, so capture pixels scale alike.
  const canvasPerPixel = (primaryW * p.screen.W) / 100 / CANVAS[device].w;
  return (canvasPerPixel * CANVAS[companion].w) / (c.screen.W / 100);
}

function getDuoRects(layout: Slide["layout"], device: DuoDevice, cW: number, cH: number): LayoutRects | null {
  const fa = duoGeometry(device).aspect;
  const ca = duoGeometry(DUO_COMPANION[device]).aspect;
  const landscape = cW > cH;
  const topCaption = { x: cW * 0.06, y: cH * 0.06, width: cW * 0.88, height: cH * (landscape ? 0.18 : 0.2), align: "center" as const };

  if (layout === "two-devices") {
    if (landscape) {
      // Side by side, bottom-aligned: the companion leads on the left.
      const gap = cW * 0.03;
      const k = physicalCompanionW(device, 1);
      // Folded and open heights match for the upright pair; otherwise keep the
      // taller companion from crowding the headline.
      const w = Math.min((cW * 0.9 - gap) / (1 + k), cH * 0.66 * fa, (cH * 0.7 * ca) / k);
      const cw = w * k;
      const x0 = (cW - (w + gap + cw)) / 2;
      const bottom = cH * 0.95;
      return {
        caption: topCaption,
        deviceSecondary: { x: x0, y: bottom - cw / ca, width: cw, height: cw / ca },
        device: { x: x0 + cw + gap, y: bottom - w / fa, width: w, height: w / fa },
      };
    }
    if (device === "duo-outer") {
      // The opened phone sits behind, upper left; the closed one in front, lower right.
      const cw = cW * 0.86;
      const w = Math.min(cW * 0.46, cH * 0.42 * fa);
      return {
        caption: topCaption,
        deviceSecondary: { x: cW * 0.04, y: cH * 0.27, width: cw, height: cw / ca },
        device: { x: cW - w - cW * 0.05, y: cH * 0.97 - w / fa, width: w, height: w / fa },
      };
    }
    // Inner portrait: the closed phone is short and wide, so the pair stands side
    // by side, bottom-aligned, with the open display leading in size.
    const gap = cW * 0.03;
    const cw = cW * 0.3;
    const w = cW * 0.62;
    const x0 = (cW - (cw + gap + w)) / 2;
    const bottom = cH * 0.95;
    return {
      caption: topCaption,
      deviceSecondary: { x: x0, y: bottom - cw / ca, width: cw, height: cw / ca },
      device: { x: x0 + cw + gap, y: bottom - w / fa, width: w, height: w / fa },
    };
  }

  if (!landscape) return null;
  switch (layout) {
    case "hero": {
      const w = cW * 0.82;
      return { caption: topCaption, device: { x: (cW - w) / 2, y: cH * 0.31, width: w, height: w / fa } };
    }
    case "device-bottom": {
      const h = cH * 0.64;
      return { caption: topCaption, device: { x: (cW - h * fa) / 2, y: cH * 0.96 - h, width: h * fa, height: h } };
    }
    case "device-top": {
      const w = cW * 0.82;
      const h = w / fa;
      return {
        caption: { ...topCaption, y: cH * 0.74 },
        device: { x: (cW - w) / 2, y: cH * 0.69 - h, width: w, height: h },
      };
    }
    case "split-landscape": {
      const w = Math.min(cW * 0.58, cH * 0.86 * fa);
      return {
        caption: { x: cW * 0.05, y: cH * 0.22, width: cW * 0.33, height: cH * 0.56, align: "left" },
        device: { x: cW - w - cW * 0.04, y: (cH - w / fa) / 2, width: w, height: w / fa },
      };
    }
    default:
      return null;
  }
}

function rectFor(
  id: BuiltInElementId,
  slide: Slide,
  defaults: LayoutRects,
): (Rect & { align?: "center" | "left" }) | undefined {
  const saved = slide.transforms?.[id];
  const def = defaults[id];
  if (!def && !saved) return undefined;
  if (!saved) return def;
  return {
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    align: (def as { align?: "center" | "left" } | undefined)?.align,
  };
}

// Devices whose frame must never be cropped by the canvas edge. A clipped TV,
// head unit, watch face or Mac window reads as a mistake, not as a deliberate bleed.
// A landscape phone hanging off the bottom reads as cropped, so Duo landscape
// targets are contained too.
const CONTAINED_DEVICES: ReadonlySet<Device> = new Set<Device>([
  "tvos", "watchos", "carplay", "mac", "duo-outer-landscape", "duo-inner-landscape",
]);

function getSlideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = getCanvas(device, orientation);
  const { Comp: Frame, widthFn, smallWidthFn } = getFrameForDevice(device, orientation);
  const frameAspect = getFrameAspect(device, orientation);
  if (isCreative(device)) {
    // Creatives compose inside Apple's art safe area, as if it were the canvas:
    // copy and focal device stay clear of every placement's crop while the
    // backdrop fills the whole asset. Devices are contained, so the focal
    // screen is never trimmed by a placement either.
    const { safe } = CREATIVE_SPECS[device];
    const local = getDefaultRects(
      slide.layout, safe.w, safe.h, frameAspect, widthFn(safe.w, safe.h), smallWidthFn(safe.w, safe.h), true,
    );
    const defaults: LayoutRects = Object.fromEntries(
      Object.entries(local).map(([id, rect]) => [id, { ...rect, x: rect.x + safe.x, y: rect.y + safe.y }]),
    );
    if (slide.callout && defaults.device) defaults.callout = defaultCalloutRect(defaults.device, cW, cH, Math.min(safe.w, safe.h));
    return { cW, cH, Frame, frameAspect, defaults, typeUnit: Math.min(safe.w, safe.h) * 1.15 };
  }
  const fwFrac = widthFn(cW, cH);
  const fwSmallFrac = smallWidthFn(cW, cH);
  const duo = isDuoDevice(device) ? getDuoRects(slide.layout, device, cW, cH) : null;
  const defaults = duo || getDefaultRects(
    slide.layout, cW, cH, frameAspect, fwFrac, fwSmallFrac,
    CONTAINED_DEVICES.has(device),
  );
  if (slide.callout && defaults.device) defaults.callout = defaultCalloutRect(defaults.device, cW, cH);
  // Duo landscape copy runs across the top as one line, so it can be a size smaller.
  const typeUnit = duo && cW > cH ? cH * 0.86 : undefined;
  return { cW, cH, Frame, frameAspect, defaults, typeUnit };
}

// The loupe starts overlapping the device's upper right, inside the screen.
function defaultCalloutRect(device: Rect, cW: number, cH: number, unit = Math.min(cW, cH)): Rect {
  const size = unit * 0.44;
  return {
    x: Math.min(cW - size - cW * 0.04, device.x + device.width * 0.58),
    y: Math.max(cH * 0.04, Math.min(cH - size * 1.04, device.y + device.height * 0.16)),
    width: size,
    height: size,
  };
}

// Share of a frame's width taken by its screen. Close enough for every frame
// that the callout's zoom reads as "× the size it appears on the device".
export const SCREEN_WIDTH_FRACTION = 0.9;

export function calloutAvailable(slide: Slide, device: Device) {
  return device !== "feature-graphic" && slide.layout !== "no-device" && slide.layout !== "feature-graphic";
}

export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (id.startsWith("text:")) {
    const textId = id.slice("text:".length);
    const textElement = slide.textElements?.find((element) => element.id === textId);
    return textElement?.transform;
  }
  if (isImageElementId(id)) {
    const imageId = imageElementKey(id);
    return slide.imageElements?.find((element) => element.id === imageId)?.transform;
  }
  const { defaults } = getSlideGeometry(slide, device, orientation);
  const rect = rectFor(id as BuiltInElementId, slide, defaults);
  if (!rect) return undefined;
  const saved = slide.transforms?.[id as BuiltInElementId];
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: saved?.rotation ?? 0,
    zIndex: saved?.zIndex ?? defaultElementZ(id as BuiltInElementId),
  };
}

function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  if (id === "callout") return 5;
  return 4;
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
  const { cW, cH } = getCanvas(device, orientation);
  const scene = sceneOf(rawScene);

  if (slide.layout === "feature-graphic" || device === "feature-graphic") {
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
  const { cW, cH } = getCanvas(device, orientation);
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
        if (slide.layout === "feature-graphic" || device === "feature-graphic") {
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
        if (slide.layout === "feature-graphic" || device === "feature-graphic") return null;
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
              onDeleteDevice: (id) => edit?.onDeleteDevice?.(slide.id, id),
              onDeleteElement: (id) => edit?.onDeleteElement?.(slide.id, id),
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
  const { safe, crops } = CREATIVE_SPECS[device];
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
        dark={isDark(slide.backgroundColor || (inverted ? theme.bgAlt : theme.bg))}
        inverted={inverted && !slide.backgroundColor}
        blobsInverted={inverted}
      />
    </div>
  );
}

const isDark = (hex: string) => (relativeLuminance(hex) ?? 1) < 0.18;

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
  const { cW, cH, Frame, frameAspect, defaults, typeUnit } = getSlideGeometry(slide, device, orientation);
  const inverted = !!slide.inverted;
  const colors = slideColors(theme, slide);
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);
  const calloutRect = slide.callout && deviceRect && calloutAvailable(slide, device)
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
    const zIndex = saved?.zIndex ?? 4;
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
  const companion = isDuoDevice(device) ? DUO_COMPANION[device] : null;

  function renderDevice(id: "device" | "deviceSecondary", rect: Rect, src: string, extraStyle?: React.CSSProperties) {
    const DeviceFrame = id === "deviceSecondary" && companion ? DUO_FRAMES[companion] : Frame;
    const aspect = id === "deviceSecondary" && companion ? duoGeometry(companion).aspect : frameAspect;
    const saved = slide.transforms?.[id];
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? (id === "deviceSecondary" ? 2 : 3);
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
        onDelete={edit?.onDeleteDevice ? () => edit.onDeleteDevice?.(id) : undefined}
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
    const zIndex = saved?.zIndex ?? defaultElementZ("callout");
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
        onDelete={edit?.onDeleteElement ? () => edit.onDeleteElement?.("callout") : undefined}
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

  function renderTextElement(textElement: TextElement, index: number) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
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
        onDelete={edit?.onDeleteElement ? () => edit.onDeleteElement?.(elementId) : undefined}
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

  function renderImageElement(imageElement: ImageElement, index: number) {
    const elementId = toImageElementId(imageElement.id);
    const rect = imageElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
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
        onDelete={edit?.onDeleteElement ? () => edit.onDeleteElement?.(elementId) : undefined}
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
      {(slide.imageElements || []).map(renderImageElement)}
      {(slide.textElements || []).map(renderTextElement)}
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
  onDelete,
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
  onDelete?: () => void;
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
      {onDelete && (
        <button
          type="button"
          className="rnd-delete-handle"
          style={{
            left: -14 / controlScale,
            top: -14 / controlScale,
            width: 28 / controlScale,
            height: 28 / controlScale,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          title="Delete element"
          aria-label="Delete element"
        >
          <Trash2 style={{ width: 14 / controlScale, height: 14 / controlScale }} />
        </button>
      )}
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

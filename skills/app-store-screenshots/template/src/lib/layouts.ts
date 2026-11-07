import { DEVICES, canvasSize, creativeSpec, duoCompanion, duoDisplay, isCreative, isDuoDevice, type DuoDevice } from "./devices";
import { imageElementKey, isImageElementId, isTextElementId, textElementKey } from "./elements";
import { duoGeometry, frameLayout } from "./frame-assets";
import type { BuiltInElementId, Device, ElementId, ElementTransform, Orientation, Slide, SlideLayout } from "./types";

// Layouts the editor renders, with their name and a short description. Vary
// them across a deck for visual rhythm. Elements are drawn in slide-canvas.tsx;
// their default placements are below.
const LAYOUTS: Record<SlideLayout, { label: string; hint: string }> = {
  hero: { label: "Hero", hint: "Headline above, device at bottom" },
  "device-bottom": { label: "Device bottom", hint: "Headline top, device anchored below" },
  "device-top": { label: "Device top", hint: "Flipped — device on top" },
  "two-devices": { label: "Two devices", hint: "Layered back + front phones" },
  "no-device": { label: "No device", hint: "Big standalone headline" },
  "split-landscape": { label: "Split (landscape)", hint: "Caption left, device right" },
  "feature-graphic": { label: "Feature graphic", hint: "1024×500 Play Store banner" },
};

const ALL_LAYOUTS = Object.keys(LAYOUTS) as SlideLayout[];

export function isLayout(value: unknown): value is SlideLayout {
  return typeof value === "string" && Object.hasOwn(LAYOUTS, value);
}

// On iPhone Duo the second device is the same phone in its other state.
const DUO_PAIR = { label: "Folded + open", hint: "The same phone closed and opened, side by side" };

/** Layouts offered for a screen on `device`: the Play banner has its own, every other deck has the rest. */
export function selectableLayouts(device: Device): SlideLayout[] {
  return ALL_LAYOUTS.filter((layout) => (layout === "feature-graphic") === (device === "feature-graphic"));
}

/** Layout name for a device's deck. */
export function layoutLabel(layout: SlideLayout, device: Device): string {
  return layout === "two-devices" && isDuoDevice(device) ? DUO_PAIR.label : LAYOUTS[layout].label;
}

/** Layout description for a device's deck. */
export function layoutHint(layout: SlideLayout, device: Device): string {
  return layout === "two-devices" && isDuoDevice(device) ? DUO_PAIR.hint : LAYOUTS[layout].hint;
}

export type Rect = { x: number; y: number; width: number; height: number };
type LayoutRects = {
  caption?: Rect & { align?: "center" | "left" };
  device?: Rect;
  deviceSecondary?: Rect;
  callout?: Rect;
};

// Phones and tablets are deliberately hung past the canvas edge so they bleed off
// it. A `contain`ed device (TV, watch, CarPlay, Mac, creatives) stays fully inside
// the canvas instead: a clipped TV, head unit, watch face or Mac window reads as a
// mistake, not as a deliberate bleed.
function getDefaultRects(
  layout: SlideLayout,
  cW: number,
  cH: number,
  frameAspect: number,
  fwFrac: number,
  fwSmallFrac: number,
  contain: boolean,
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
  const companion = duoCompanion(device);
  const p = duoGeometry(device);
  const c = duoGeometry(companion);
  // Both displays are captured at the same pixel density, so capture pixels scale alike.
  const canvasPerPixel = (primaryW * p.screen.W) / 100 / DEVICES[device].canvas.w;
  return (canvasPerPixel * DEVICES[companion].canvas.w) / (c.screen.W / 100);
}

function getDuoRects(layout: SlideLayout, device: DuoDevice, cW: number, cH: number): LayoutRects | null {
  const fa = duoGeometry(device).aspect;
  const ca = duoGeometry(duoCompanion(device)).aspect;
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
    if (duoDisplay(device) === "outer") {
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

/** Canvas size, frame aspect and every built-in element's default rect for one screen. */
export function getSlideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = canvasSize(device, orientation);
  const { aspect: frameAspect, width: widthFn, smallWidth: smallWidthFn } = frameLayout(device, orientation);
  if (isCreative(device)) {
    // Creatives compose inside Apple's art safe area, as if it were the canvas:
    // copy and focal device stay clear of every placement's crop while the
    // backdrop fills the whole asset. Devices are contained, so the focal
    // screen is never trimmed by a placement either.
    const { safe } = creativeSpec(device);
    const local = getDefaultRects(
      slide.layout, safe.w, safe.h, frameAspect, widthFn(safe.w, safe.h), smallWidthFn(safe.w, safe.h), DEVICES[device].contained,
    );
    const defaults: LayoutRects = Object.fromEntries(
      Object.entries(local).map(([id, rect]) => [id, { ...rect, x: rect.x + safe.x, y: rect.y + safe.y }]),
    );
    if (slide.callout && defaults.device) defaults.callout = defaultCalloutRect(defaults.device, cW, cH, Math.min(safe.w, safe.h));
    return { cW, cH, frameAspect, defaults, typeUnit: Math.min(safe.w, safe.h) * 1.15 };
  }
  const fwFrac = widthFn(cW, cH);
  const fwSmallFrac = smallWidthFn(cW, cH);
  const duo = isDuoDevice(device) ? getDuoRects(slide.layout, device, cW, cH) : null;
  const defaults = duo || getDefaultRects(
    slide.layout, cW, cH, frameAspect, fwFrac, fwSmallFrac,
    DEVICES[device].contained,
  );
  if (slide.callout && defaults.device) defaults.callout = defaultCalloutRect(defaults.device, cW, cH);
  // Duo landscape copy runs across the top as one line, so it can be a size smaller.
  const typeUnit = duo && cW > cH ? cH * 0.86 : undefined;
  return { cW, cH, frameAspect, defaults, typeUnit };
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

/** The Play Store banner: one composition with the app icon, name and tagline, and no device. */
export function isFeatureGraphic(slide: Slide, device: Device) {
  return device === "feature-graphic" || slide.layout === "feature-graphic";
}

/** Whether the screen draws a device by default, so it needs a screenshot and can take a magnifier. */
export function showsDevice(slide: Slide, device: Device) {
  return !isFeatureGraphic(slide, device) && slide.layout !== "no-device";
}

/**
 * The built-in elements a screen draws and where: the layout's defaults plus
 * any element the user placed (a moved device stays on a "No device" screen).
 * The magnifier needs a device to magnify.
 */
export function elementRects(slide: Slide, device: Device, orientation: Orientation): Partial<Record<BuiltInElementId, Rect & { align?: "center" | "left" }>> {
  if (isFeatureGraphic(slide, device)) return {};
  const { defaults } = getSlideGeometry(slide, device, orientation);
  const rects: Partial<Record<BuiltInElementId, Rect & { align?: "center" | "left" }>> = {};
  for (const id of ["caption", "device", "deviceSecondary"] as const) {
    const rect = rectFor(id, slide, defaults);
    if (rect) rects[id] = rect;
  }
  if (slide.callout && rects.device && showsDevice(slide, device)) {
    const rect = rectFor("callout", slide, defaults);
    if (rect) rects.callout = rect;
  }
  return rects;
}

/** Where an element is drawn: its saved transform, or its layout default. */
export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (isTextElementId(id)) {
    const textId = textElementKey(id);
    return slide.textElements?.find((element) => element.id === textId)?.transform;
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

/** Stacking order: back device, front device, caption, then magnifier and added elements in list order. */
function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  if (id === "callout") return 5;
  return 4;
}

/** Where an element sits in the stack: its saved zIndex, or its default. */
export function elementZ(slide: Slide, id: ElementId): number {
  if (isTextElementId(id)) {
    const index = (slide.textElements || []).findIndex((element) => element.id === textElementKey(id));
    return slide.textElements?.[index]?.transform.zIndex ?? 5 + Math.max(0, index);
  }
  if (isImageElementId(id)) {
    const index = (slide.imageElements || []).findIndex((element) => element.id === imageElementKey(id));
    return slide.imageElements?.[index]?.transform.zIndex ?? 5 + Math.max(0, index);
  }
  return slide.transforms?.[id as BuiltInElementId]?.zIndex ?? defaultElementZ(id as BuiltInElementId);
}

import type { Slide, SlideTypography } from "./types";

/** Relative scale on layout default font sizes (1 = default). */
export const FONT_SCALE_MIN = 0.5;
export const FONT_SCALE_MAX = 2;
export const FONT_SCALE_DEFAULT = 1;

function clampFontScale(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return FONT_SCALE_DEFAULT;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
}

export function slideFontScales(slide: Slide) {
  return {
    labelScale: clampFontScale(slide.typography?.labelScale),
    headlineScale: clampFontScale(slide.typography?.headlineScale),
    appNameScale: clampFontScale(slide.typography?.appNameScale),
  };
}

/** Persist only non-default scales so JSON stays tidy. Values are clamped
 * first, so invalid or out-of-range input from a loaded project never ends up
 * stored as a no-op `1` or outside the slider range. */
export function cleanTypography(raw: SlideTypography | undefined): SlideTypography | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: SlideTypography = {};
  for (const key of ["labelScale", "headlineScale", "appNameScale"] as const) {
    const value = clampFontScale(raw[key]);
    if (value !== FONT_SCALE_DEFAULT) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Font size a free text element renders at when it has no explicit
 * `fontSize`. Shared by the canvas and the inspector so the Size control
 * always shows what is actually drawn. */
export function defaultTextElementFontSize(cW: number, cH: number): number {
  return Math.round(Math.min(cW, cH) * 0.06);
}

/** Sensible Size control range for free text elements, relative to the canvas
 * (a 422px watch face and a 3840px TV frame need very different ranges). */
export function textElementFontSizeRange(cW: number, cH: number) {
  const unit = Math.min(cW, cH);
  return {
    min: Math.max(8, Math.round(unit * 0.015)),
    max: Math.round(unit * 0.3),
  };
}

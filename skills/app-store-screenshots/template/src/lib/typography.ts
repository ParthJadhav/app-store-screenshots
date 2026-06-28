import type { Slide, SlideTypography } from "./types";

/** Relative scale on layout default font sizes (1 = default). */
export const FONT_SCALE_MIN = 0.5;
export const FONT_SCALE_MAX = 2;
export const FONT_SCALE_DEFAULT = 1;

export function clampFontScale(value: number | undefined): number {
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

/** Persist only non-default scales so JSON stays tidy. */
export function cleanTypography(raw: SlideTypography | undefined): SlideTypography | undefined {
  if (!raw) return undefined;
  const out: SlideTypography = {};
  if (raw.labelScale !== undefined && raw.labelScale !== FONT_SCALE_DEFAULT) {
    out.labelScale = clampFontScale(raw.labelScale);
  }
  if (raw.headlineScale !== undefined && raw.headlineScale !== FONT_SCALE_DEFAULT) {
    out.headlineScale = clampFontScale(raw.headlineScale);
  }
  if (raw.appNameScale !== undefined && raw.appNameScale !== FONT_SCALE_DEFAULT) {
    out.appNameScale = clampFontScale(raw.appNameScale);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

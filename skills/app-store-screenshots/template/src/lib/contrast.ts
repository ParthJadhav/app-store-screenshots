import type { Slide, Theme } from "./types";

// WCAG 2 contrast helpers used to keep caption text readable when a slide
// uses a custom background colour instead of one of its theme's backgrounds.

const DARK_TEXT = "#0B0B0F";
const LIGHT_TEXT = "#FFFFFF";
// Headlines are large, bold display text, but labels are small; aim for the
// body-text ratio so both stay legible after App Store downscaling.
const TEXT_CONTRAST = 4.5;
// The accent label may be a little softer before we swap it for the text colour.
const ACCENT_CONTRAST = 3;

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 21;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Backgrounds darker than this get light text treatment (subtle shadows, softer blobs). */
export function isDarkColor(hex: string): boolean {
  return (relativeLuminance(hex) ?? 1) < 0.18;
}

function firstReadable(bg: string, candidates: (string | undefined)[], min: number) {
  return candidates.find((c): c is string => !!c && contrastRatio(c, bg) >= min);
}

export type SlideColors = {
  /** Headline and default text-element colour. */
  fg: string;
  /** Uppercase label colour. */
  accent: string;
  /** True when the slide background is dark (drives subtle text shadows). */
  dark: boolean;
};

/**
 * Text colours for a slide. Theme backgrounds use the theme's own colours.
 * A custom background keeps the theme colours when they're readable on it and
 * otherwise switches to the theme's other text colour, then to near-black or
 * white, whichever contrasts more. Colours a user picked explicitly on a text
 * element are never passed through here.
 */
export function slideColors(theme: Theme, slide: Pick<Slide, "inverted" | "backgroundColor">): SlideColors {
  const inverted = !!slide.inverted;
  const themeFg = inverted ? theme.fgAlt : theme.fg;
  const themeAccent = inverted ? theme.accentAlt ?? theme.accent : theme.accent;
  const bg = slide.backgroundColor;
  if (!bg || relativeLuminance(bg) === null) {
    return { fg: themeFg, accent: themeAccent, dark: inverted };
  }
  const dark = isDarkColor(bg);
  const fallback = contrastRatio(DARK_TEXT, bg) >= contrastRatio(LIGHT_TEXT, bg) ? DARK_TEXT : LIGHT_TEXT;
  const fg = firstReadable(bg, [themeFg, inverted ? theme.fg : theme.fgAlt], TEXT_CONTRAST) ?? fallback;
  const accent =
    firstReadable(bg, [themeAccent, inverted ? theme.accent : theme.accentAlt], ACCENT_CONTRAST) ?? fg;
  return { fg, accent, dark };
}

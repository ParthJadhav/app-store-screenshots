import type { ScreenshotFontId, Theme, ThemeId } from "./types";

// ---------- Themes ----------
export const DEFAULT_THEME_ID: ThemeId = "clean-light";

export const DEFAULT_SCREENSHOT_FONT_ID: ScreenshotFontId = "template-default";

// Family used for a font imported through the toolbar. The matching @font-face
// is injected into <head> by the editor (see screenshot-editor.tsx), so it sits
// in document.styleSheets where html-to-image can embed it into exports.
export const IMPORTED_FONT_FAMILY = "ImportedScreenshotFont";

export const SCREENSHOT_FONTS: Record<ScreenshotFontId, { name: string; family: string }> = {
  // Inherit the editor's Inter (next/font in app/layout.tsx), which is what the
  // canvas rendered before fonts were selectable, so existing decks don't shift.
  "template-default": { name: "Inter (default)", family: "inherit" },
  "system-sans": {
    name: "System Sans",
    family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  "template-serif": { name: "Georgia", family: "Georgia, 'Times New Roman', serif" },
  // Named system fonts ship with macOS; elsewhere they fall back to the listed
  // alternatives, so export on the machine whose fonts you designed with.
  "avenir-next": { name: "Avenir Next", family: '"Avenir Next", Avenir, sans-serif' },
  "helvetica-neue": { name: "Helvetica Neue", family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  "futura": { name: "Futura", family: "Futura, 'Trebuchet MS', sans-serif" },
  "baskerville": { name: "Baskerville", family: "Baskerville, 'Baskerville Old Face', Georgia, serif" },
  "palatino": { name: "Palatino", family: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  "optima": { name: "Optima", family: "Optima, Candara, 'Segoe UI', sans-serif" },
  "american-typewriter": { name: "American Typewriter", family: '"American Typewriter", "Courier New", serif' },
  // Only offered once a font has been imported; the name shown comes from the file.
  "self-hosted": { name: "Imported font", family: `"${IMPORTED_FONT_FAMILY}", sans-serif` },
};

/** CSS font-family a project's screenshots are set in. */
export function screenshotFontFamily(fontId: ScreenshotFontId | undefined): string {
  return SCREENSHOT_FONTS[fontId || DEFAULT_SCREENSHOT_FONT_ID].family;
}

export const THEMES: Record<string, Theme> = {
  "clean-light": {
    id: "clean-light",
    name: "Clean Light",
    bg: "#F6F1EA",
    bgAlt: "#171717",
    fg: "#171717",
    fgAlt: "#F6F1EA",
    accent: "#5B7CFA",
    muted: "#6B7280",
  },
  "dark-bold": {
    id: "dark-bold",
    name: "Dark Bold",
    bg: "#0B1020",
    bgAlt: "#F8FAFC",
    fg: "#F8FAFC",
    fgAlt: "#0B1020",
    accent: "#8B5CF6",
    muted: "#94A3B8",
  },
  "warm-editorial": {
    id: "warm-editorial",
    name: "Warm Editorial",
    bg: "#F7E8DA",
    bgAlt: "#2B1D17",
    fg: "#2B1D17",
    fgAlt: "#F7E8DA",
    accent: "#D97706",
    muted: "#7C5A47",
  },
  "ocean-fresh": {
    id: "ocean-fresh",
    name: "Ocean Fresh",
    bg: "#E0F2FE",
    bgAlt: "#0C4A6E",
    fg: "#0C4A6E",
    fgAlt: "#E0F2FE",
    accent: "#0284C7",
    muted: "#475569",
  },
  "bloom-roast": {
    id: "bloom-roast",
    name: "Bloom Roast",
    bg: "#F2ECE2",
    bgAlt: "#24352F",
    fg: "#1D2420",
    fgAlt: "#FFF7EA",
    accent: "#B8794A",
    muted: "#65736B",
  },
  // Named style presets. Flat palettes for the basic renderer; the deep spec in
  // style-prompts/<id>.md still drives fonts, backgrounds, and decoration.
  "hand-drawn-editorial-tasks": {
    id: "hand-drawn-editorial-tasks",
    name: "Hand-Drawn Editorial",
    bg: "#F5EFDF",
    bgAlt: "#1B2336",
    fg: "#1B2336",
    fgAlt: "#F5EFDF",
    accent: "#B53A24",
    accentAlt: "#F26A50",
    muted: "#5A6275",
  },
  "retro-rubberhose-mascot": {
    id: "retro-rubberhose-mascot",
    name: "Retro Rubberhose",
    bg: "#F4E6CC",
    bgAlt: "#5C3A1E",
    fg: "#2A2118",
    fgAlt: "#F4E6CC",
    accent: "#B23A2A",
    accentAlt: "#F2BB46",
    muted: "#6E5236",
  },
  "moody-curated-dating": {
    id: "moody-curated-dating",
    name: "Moody Curated",
    bg: "#1F1C1A",
    bgAlt: "#F4EBDD",
    fg: "#F4EBDD",
    fgAlt: "#1F1C1A",
    accent: "#E8B97A",
    accentAlt: "#7A4F2A",
    muted: "#B8AFA2",
  },
  "paper-sticker-skeuomorphic": {
    id: "paper-sticker-skeuomorphic",
    name: "Paper Sticker",
    bg: "#F8F0E2",
    bgAlt: "#8FBE7C",
    fg: "#1F2A44",
    fgAlt: "#1F2A44",
    accent: "#2B6CB0",
    accentAlt: "#1E3F7A",
    muted: "#6B6457",
  },
  "dreamy-pastel-couples": {
    id: "dreamy-pastel-couples",
    name: "Dreamy Pastel",
    bg: "#F5E0F0",
    bgAlt: "#1B2240",
    fg: "#1B2240",
    fgAlt: "#F5E0F0",
    accent: "#5B3FC8",
    accentAlt: "#C9B6F2",
    muted: "#5E5A7A",
  },
  "glossy-3d-kbeauty-creator": {
    id: "glossy-3d-kbeauty-creator",
    name: "Glossy 3D K-Beauty",
    bg: "#3B266B",
    bgAlt: "#F4EEFB",
    fg: "#FFFFFF",
    fgAlt: "#3B266B",
    accent: "#FBE254",
    accentAlt: "#7B3FD0",
    muted: "#C9B8E8",
  },
  "liquid-glass-aurora": {
    id: "liquid-glass-aurora",
    name: "Liquid Glass Aurora",
    bg: "#F4F1FB",
    bgAlt: "#1B1730",
    fg: "#16131F",
    fgAlt: "#F4F1FB",
    accent: "#4A2FC0",
    accentAlt: "#B9A8FF",
    muted: "#4A4660",
  },
  "swiss-grid-bold": {
    id: "swiss-grid-bold",
    name: "Swiss Grid Bold",
    bg: "#F2F1EC",
    bgAlt: "#0E0E0C",
    fg: "#0E0E0C",
    fgAlt: "#F2F1EC",
    accent: "#C23B00",
    accentAlt: "#FF4F00",
    muted: "#5E5D57",
  },
  "neon-athletic-night": {
    id: "neon-athletic-night",
    name: "Neon Athletic Night",
    bg: "#0A0B0D",
    bgAlt: "#D4FF3A",
    fg: "#F4F5F0",
    fgAlt: "#0A0B0D",
    accent: "#D4FF3A",
    accentAlt: "#0A0B0D",
    muted: "#A3A8AF",
  },
  "magazine-cover-editorial": {
    id: "magazine-cover-editorial",
    name: "Magazine Cover",
    bg: "#F1EBE1",
    bgAlt: "#7A2320",
    fg: "#1A1714",
    fgAlt: "#F6EFE3",
    accent: "#7A2320",
    accentAlt: "#F1D9C9",
    muted: "#4A423A",
  },
  "candy-pop-social": {
    id: "candy-pop-social",
    name: "Candy Pop Social",
    bg: "#C6F135",
    bgAlt: "#2B44F0",
    fg: "#16121F",
    fgAlt: "#FFFFFF",
    accent: "#2B44F0",
    accentAlt: "#FFE23D",
    muted: "#4A3F5C",
  },
  "soft-clay-wellness": {
    id: "soft-clay-wellness",
    name: "Soft Clay Wellness",
    bg: "#EFE7DA",
    bgAlt: "#3A2B3A",
    fg: "#3A2E27",
    fgAlt: "#F3EBDD",
    accent: "#9A4B31",
    accentAlt: "#E6A585",
    muted: "#6E5A4C",
  },
  "midnight-glow-pro": {
    id: "midnight-glow-pro",
    name: "Midnight Glow Pro",
    bg: "#07080B",
    bgAlt: "#F4F5F8",
    fg: "#F4F5F8",
    fgAlt: "#0B0C12",
    accent: "#B3AFFF",
    accentAlt: "#3B38C8",
    muted: "#B4B9C6",
  },
  "risograph-zine": {
    id: "risograph-zine",
    name: "Risograph Zine",
    bg: "#F4F0E6",
    bgAlt: "#321871",
    fg: "#3255A4",
    fgAlt: "#F4F0E6",
    accent: "#C8006A",
    accentAlt: "#FF8FD0",
    muted: "#5E4E7A",
  },
  "bento-keynote-grid": {
    id: "bento-keynote-grid",
    name: "Bento Keynote",
    bg: "#F5F5F7",
    bgAlt: "#1D1D1F",
    fg: "#1D1D1F",
    fgAlt: "#F5F5F7",
    accent: "#B4441C",
    accentAlt: "#FF9F6B",
    muted: "#5E5E63",
  },
  "toybox-primary": {
    id: "toybox-primary",
    name: "Toybox Primary",
    bg: "#FFF6E6",
    bgAlt: "#3FA9F5",
    fg: "#1F1A4D",
    fgAlt: "#1F1A4D",
    accent: "#6236D9",
    accentAlt: "#1F1A4D",
    muted: "#5B5480",
  },
  "quiet-japandi": {
    id: "quiet-japandi",
    name: "Quiet Japandi",
    bg: "#F3F0EA",
    bgAlt: "#1E1D1B",
    fg: "#1E1D1B",
    fgAlt: "#F3F0EA",
    accent: "#C8321E",
    accentAlt: "#E8836F",
    muted: "#4E4B46",
  },
  "vintage-travel-poster": {
    id: "vintage-travel-poster",
    name: "Vintage Travel Poster",
    bg: "#4B2E4F",
    bgAlt: "#F1E4C8",
    fg: "#F1E4C8",
    fgAlt: "#1C1A17",
    accent: "#E8B04A",
    accentAlt: "#A8401C",
    muted: "#D8C6A6",
  },
};

export function themeById(themeId: string | undefined): Theme {
  return THEMES[themeId || ""] || THEMES[DEFAULT_THEME_ID];
}

export function hasTheme(themeId: string | undefined): boolean {
  return !!themeId && !!THEMES[themeId];
}

export const STORAGE_KEY = "app-store-screenshots:project:v1";
// v3 adds the iPhone Duo and App Store creative decks. Older editors reject
// a v3 project instead of loading decks they cannot render.
export const PROJECT_SCHEMA_VERSION = 3;

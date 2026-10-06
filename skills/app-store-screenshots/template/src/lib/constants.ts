import type { Device, Orientation, Platform, ScreenshotFontId, SlideLayout, Theme, ThemeColorKey, ThemeColors, ThemeId } from "./types";

// ---------- Canvas dimensions (design at largest required resolution) ----------
export const CANVAS: Record<Device, { w: number; h: number; wL?: number; hL?: number }> = {
  iphone:        { w: 1320, h: 2868 },
  ipad:          { w: 2064, h: 2752 },
  // Apple TV is 16:9 landscape-only. Design at 4K; 1920x1080 is a clean 2x downscale.
  tvos:          { w: 3840, h: 2160 },
  // Apple Watch: design at the largest slot Apple accepts (Ultra 422x514) so every
  // smaller size is a downscale rather than an upscale.
  watchos:       { w: 422, h: 514 },
  // CarPlay has NO App Store screenshot slot of its own - see EXPORT_SIZES below.
  // It is submitted in an iPhone slot, which accepts landscape, so the canvas is
  // the 6.9" iPhone size turned sideways to fit a wide head unit.
  carplay:       { w: 2868, h: 1320 },
  // Mac App Store is landscape-only 16:10. Design at 2880x1800; every other Mac
  // slot is an exact 16:10 downscale.
  mac:           { w: 2880, h: 1800 },
  android:       { w: 1080, h: 1920 },
  "android-7":   { w: 1200, h: 1920, wL: 1920, hL: 1200 },
  "android-10":  { w: 1600, h: 2560, wL: 2560, hL: 1600 },
  "feature-graphic": { w: 1024, h: 500 },
};

// ---------- Export sizes per device ----------
export type ExportSize = { label: string; w: number; h: number };

export const EXPORT_SIZES: Record<Device, ExportSize[]> = {
  iphone: [
    { label: '6.9"', w: 1320, h: 2868 },
    { label: '6.5"', w: 1284, h: 2778 },
    { label: '6.3"', w: 1206, h: 2622 },
    { label: '6.1"', w: 1125, h: 2436 },
  ],
  ipad: [
    { label: '13" iPad',       w: 2064, h: 2752 },
    { label: '12.9" iPad Pro', w: 2048, h: 2732 },
  ],
  // App Store Connect display type APP_APPLE_TV. Verified 18 Aug 2026 via
  // `asc screenshots sizes --all`; these are the only accepted dimensions.
  tvos: [
    { label: "4K (3840 x 2160)", w: 3840, h: 2160 },
    { label: "HD (1920 x 1080)", w: 1920, h: 1080 },
  ],
  // Apple Watch display types, all verified the same way:
  //   APP_WATCH_ULTRA 410x502 + 422x514 | SERIES_10 416x496
  //   SERIES_7 396x484 | SERIES_4 368x448 | SERIES_3 312x390
  watchos: [
    { label: "Ultra (422 x 514)",    w: 422, h: 514 },
    { label: "Ultra (410 x 502)",    w: 410, h: 502 },
    { label: "Series 10 (416x496)",  w: 416, h: 496 },
    { label: "Series 7 (396 x 484)", w: 396, h: 484 },
    { label: "Series 4 (368 x 448)", w: 368, h: 448 },
    { label: "Series 3 (312 x 390)", w: 312, h: 390 },
  ],
  // 🚨 CarPlay has NO display type in App Store Connect - confirmed against its own
  // metadata, not documentation: `asc screenshots sizes --all` lists APPLE_TV,
  // VISION_PRO, DESKTOP, IPAD*, IPHONE*, WATCH* and nothing for CarPlay. A CarPlay
  // app ships inside its iPhone app, so a CarPlay shot is submitted in an iPhone
  // slot. These are therefore the iPhone sizes on purpose, in landscape (every
  // iPhone slot accepts both orientations).
  carplay: [
    { label: '6.9" landscape', w: 2868, h: 1320 },
    { label: '6.5" landscape', w: 2778, h: 1284 },
    { label: '6.3" landscape', w: 2622, h: 1206 },
    { label: '6.1" landscape', w: 2436, h: 1125 },
  ],
  // App Store Connect display type APP_DESKTOP (Mac App Store). These four
  // 16:10 sizes are the only accepted dimensions.
  mac: [
    { label: "2880 x 1800", w: 2880, h: 1800 },
    { label: "2560 x 1600", w: 2560, h: 1600 },
    { label: "1440 x 900",  w: 1440, h: 900 },
    { label: "1280 x 800",  w: 1280, h: 800 },
  ],
  android:       [{ label: "Phone",          w: 1080, h: 1920 }],
  "android-7":   [{ label: '7" Portrait',    w: 1200, h: 1920 }],
  "android-10":  [{ label: '10" Portrait',   w: 1600, h: 2560 }],
  "feature-graphic": [{ label: "Feature Graphic", w: 1024, h: 500 }],
};

// Landscape sizes (tablets only)
export const EXPORT_SIZES_LANDSCAPE: Partial<Record<Device, ExportSize[]>> = {
  "android-7":  [{ label: '7" Landscape',  w: 1920, h: 1200 }],
  "android-10": [{ label: '10" Landscape', w: 2560, h: 1600 }],
};

export function supportsLandscape(device: Device): boolean {
  return device in EXPORT_SIZES_LANDSCAPE;
}

export function getExportSizes(device: Device, orientation: Orientation): ExportSize[] {
  if (orientation === "landscape") {
    return EXPORT_SIZES_LANDSCAPE[device] || EXPORT_SIZES[device];
  }
  return EXPORT_SIZES[device];
}

// ---------- Frame aspect ratios ----------
export const MK_RATIO    = 1022 / 2082; // iPhone PNG mockup
export const TAB_P_RATIO = 0.667;        // tablet portrait
export const TAB_L_RATIO = 1.5;          // tablet landscape
export const IPAD_RATIO  = 0.770;        // iPad
export const TV_RATIO    = 16 / 9;       // Apple TV - landscape only
export const WATCH_RATIO = 422 / 514;    // Apple Watch Ultra, the largest accepted slot
// CarPlay head units vary by vehicle and Apple ships five presets in CarPlay
// Simulator.app/Contents/Resources/VehicleConfigs: Minimum 748x456, Standard 800x480,
// Widescreen 1920x720, Portrait 900x1200, Standard Video Playback 1920x1080.
// "Standard" is the default here; change this constant to target another.
export const CARPLAY_RATIO = 800 / 480;
// Mac window: a 16:10 content area under a title bar MAC_TITLE_BAR x the content
// height tall, so a 16:10 capture (the Mac App Store's own aspect) fills the
// window without being cropped.
export const MAC_TITLE_BAR = 0.045;
export const MAC_RATIO = 16 / (10 * (1 + MAC_TITLE_BAR));

// iPhone mockup screen overlay (pre-measured)
export const PHONE_SCREEN = {
  L: (52 / 1022) * 100,
  T: (46 / 2082) * 100,
  W: (918 / 1022) * 100,
  H: (1990 / 2082) * 100,
  RX: (126 / 918) * 100,
  RY: (126 / 1990) * 100,
};

// ---------- Width formula helpers ----------
export function phoneW(cW: number, cH: number, clamp = 0.84) {
  return Math.min(clamp, 0.72 * (cH / cW) * MK_RATIO);
}
export function phoneWSmall(cW: number, cH: number) {
  return phoneW(cW, cH, 0.66);
}
export function tabletPW(cW: number, cH: number, clamp = 0.80) {
  return Math.min(clamp, 0.72 * (cH / cW) * TAB_P_RATIO);
}
export function tabletLW(cW: number, cH: number, clamp = 0.62) {
  return Math.min(clamp, 0.75 * (cH / cW) * TAB_L_RATIO);
}
export function ipadW(cW: number, cH: number, clamp = 0.75) {
  return Math.min(clamp, 0.72 * (cH / cW) * IPAD_RATIO);
}
// Clamped low so a 16:9 device clears the 0.28-height caption block on a 16:9 canvas.
export function tvW(cW: number, cH: number, clamp = 0.58) {
  return Math.min(clamp, 0.72 * (cH / cW) * TV_RATIO);
}
export function watchW(cW: number, cH: number, clamp = 0.52) {
  return Math.min(clamp, 0.72 * (cH / cW) * WATCH_RATIO);
}
// Height-bound on the wide canvas: the head unit must clear the caption block.
export function carPlayW(cW: number, cH: number, clamp = 0.86) {
  return Math.min(clamp, 0.58 * (cH / cW) * CARPLAY_RATIO);
}
// Contained like the TV: height-bound so the window clears the caption block
// above or below it on the 16:10 canvas.
export function macW(cW: number, cH: number, clamp = 0.86) {
  return Math.min(clamp, 0.58 * (cH / cW) * MAC_RATIO);
}

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

export const THEME_COLOR_LABEL: Record<ThemeColorKey, string> = {
  bg: "Background",
  bgAlt: "Alternate background",
  fg: "Text",
  fgAlt: "Text on alternate",
  accent: "Accent",
  accentAlt: "Accent on alternate",
  muted: "Muted",
};

/** The theme with the project's color edits for it applied. */
export function projectTheme(themeId: string | undefined, themeColors: ThemeColors | undefined): Theme {
  const theme = themeById(themeId);
  const edits = themeColors?.[theme.id];
  return edits ? { ...theme, ...edits } : theme;
}

export function hasTheme(themeId: string | undefined): boolean {
  return !!themeId && !!THEMES[themeId];
}

export const STORAGE_KEY = "app-store-screenshots:project:v1";
export const PROJECT_SCHEMA_VERSION = 2;

// Toolbar platform tabs, in menu order. The platform is also the top-level
// export folder (ios/…, macos/…, android/…). Mac gets its own tab because App
// Store Connect lists macOS as a separate platform with its own screenshot set.
export const PLATFORM_DEVICES: Record<Platform, Device[]> = {
  ios: ["iphone", "ipad", "tvos", "watchos", "carplay"],
  macos: ["mac"],
  android: ["android", "android-7", "android-10", "feature-graphic"],
};

export const DEVICE_LABEL: Record<Device, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  tvos: "Apple TV",
  watchos: "Apple Watch",
  carplay: "CarPlay (iPhone slot)",
  mac: "Mac",
  android: "Android Phone",
  "android-7": 'Android 7" Tablet',
  "android-10": 'Android 10" Tablet',
  "feature-graphic": "Feature Graphic",
};

// Friendly labels for slide layouts (used in dropdowns)
export const LAYOUT_LABEL: Record<SlideLayout, string> = {
  hero: "Hero",
  "device-bottom": "Device bottom",
  "device-top": "Device top",
  "two-devices": "Two devices",
  "no-device": "No device",
  "split-landscape": "Split (landscape)",
  "feature-graphic": "Feature graphic",
};

// Short description shown under each layout name
export const LAYOUT_HINT: Record<SlideLayout, string> = {
  hero: "Headline above, device at bottom",
  "device-bottom": "Headline top, device anchored below",
  "device-top": "Flipped — device on top",
  "two-devices": "Layered back + front phones",
  "no-device": "Big standalone headline",
  "split-landscape": "Caption left, device right",
  "feature-graphic": "1024×500 Play Store banner",
};

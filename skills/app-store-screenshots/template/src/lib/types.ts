export type Device =
  | "iphone"
  | "ipad"
  | "tvos"
  | "watchos"
  | "carplay"
  | "mac"
  | "android"
  | "android-7"
  | "android-10"
  | "feature-graphic";

export type Orientation = "portrait" | "landscape";

export type Platform = "ios" | "macos" | "android";

// Layouts the editor can render. Vary across slides for visual rhythm.
export type SlideLayout =
  | "hero"             // centered device, headline above
  | "device-bottom"    // headline top, device bottom-center
  | "device-top"       // device top, headline bottom (contrast)
  | "two-devices"      // back + front phones, headline above
  | "no-device"        // big headline + decorative blob, no device
  | "split-landscape"  // landscape tablets + Mac: caption left + device right
  | "feature-graphic"; // 1024×500 banner with icon + name + tagline

// Per-element rect in canvas pixel space. Optional rotation in degrees and zIndex.
export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

export type BuiltInElementId = "caption" | "device" | "deviceSecondary" | "callout";
export type TextElementId = `text:${string}`;
export type ImageElementId = `image:${string}`;
export type ElementId = BuiltInElementId | TextElementId | ImageElementId;

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
};

// Per-locale text keyed by locale code (e.g. "en", "de"). A locale is absent
// if the user hasn't typed anything for it; renderers fall back to en (see
// lib/locale.ts). The set of locales a project targets lives on
// ProjectState.locales.
export type LocalizedText = Partial<Record<string, string>>;

export type TextElement = {
  id: string;
  text: LocalizedText;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export type SlideTypography = {
  /** Uppercase label above the headline (default 1). */
  labelScale?: number;
  /** Main headline, or feature-graphic tagline (default 1). */
  headlineScale?: number;
  /** Feature graphic app name only (default 1). */
  appNameScale?: number;
};

export type ImageElement = {
  id: string;
  src: string;
  transform: ElementTransform;
  fit?: "cover" | "contain";
  fade?: {
    edge: "top" | "bottom" | "left" | "right";
    amount: number;
  };
};

/** Magnified loupe of the primary screenshot, placed by transforms.callout. */
export type Callout = {
  /** Point of the screenshot to magnify, as 0–1 fractions of its width/height. */
  focusX: number;
  focusY: number;
  /** Magnification relative to the callout's own width (1.5–5). */
  zoom: number;
  shape: "circle" | "rounded";
};

export type Slide = {
  id: string;
  layout: SlideLayout;
  label: LocalizedText;       // tiny uppercase caption above headline, per locale
  headline: LocalizedText;    // multi-line; newlines are intentional, per locale
  screenshot: string;         // path under /screenshots/ — may contain {locale}
  screenshotSecondary?: string; // for two-devices layout — may contain {locale}
  inverted?: boolean;         // dark background variant
  /** Optional relative font-size scales for built-in caption text. */
  typography?: SlideTypography;
  backgroundColor?: string;   // per-slide hex color override
  // Per-element overrides; when present, replaces layout default placement.
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  textElements?: TextElement[];
  imageElements?: ImageElement[];
  callout?: Callout;
};

export type ThemeId =
  | "clean-light"
  | "dark-bold"
  | "warm-editorial"
  | "ocean-fresh"
  | "bloom-roast"
  // One preset per named style in style-prompts/ (same id as the slug).
  | "hand-drawn-editorial-tasks"
  | "retro-rubberhose-mascot"
  | "moody-curated-dating"
  | "paper-sticker-skeuomorphic"
  | "dreamy-pastel-couples"
  | "glossy-3d-kbeauty-creator"
  | "liquid-glass-aurora"
  | "swiss-grid-bold"
  | "neon-athletic-night"
  | "magazine-cover-editorial"
  | "candy-pop-social"
  | "soft-clay-wellness"
  | "midnight-glow-pro"
  | "risograph-zine"
  | "bento-keynote-grid"
  | "toybox-primary"
  | "quiet-japandi"
  | "vintage-travel-poster";

export type ScreenshotFontId =
  | "template-default"
  | "template-serif"
  | "system-sans"
  | "avenir-next"
  | "helvetica-neue"
  | "american-typewriter"
  | "baskerville"
  | "optima"
  | "palatino"
  | "futura"
  | "self-hosted";

export type ImportedFont = {
  src: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  /** Display name, taken from the uploaded file name. */
  name?: string;
};

export type Theme = {
  id: string;
  name: string;
  bg: string;          // primary background
  bgAlt: string;       // inverted background
  fg: string;          // text on bg
  fgAlt: string;       // text on bgAlt
  accent: string;      // label color on bg, decorative blobs
  accentAlt?: string;  // label color on bgAlt; defaults to accent
  muted: string;
};

export type ThemeColorKey = "bg" | "bgAlt" | "fg" | "fgAlt" | "accent" | "accentAlt" | "muted";
/** Per-theme color edits, keyed by theme id. Only changed colors are stored. */
export type ThemeColors = Record<string, Partial<Record<ThemeColorKey, string>>>;

// ---------- Scene (deck-wide composition, see lib/scene.ts) ----------

export type SceneBackdrop = "gradient" | "solid" | "aurora" | "spotlight" | "grid" | "dots" | "lines";
export type SceneDecoration = "blobs" | "rings" | "sparkles" | "none";

export type Scene = {
  backdrop: SceneBackdrop;
  /** Lay the backdrop art out across the whole strip so it flows between screens. */
  span: boolean;
  decoration: SceneDecoration;
  /** Device drop shadow strength, 0–100. */
  shadow: number;
  /** Accent-coloured light behind each device, 0–100. */
  glow: number;
  /** 3D turn of every device in degrees, -30–30. */
  tilt: number;
  /** Headline weight, 300–900. */
  headlineWeight: number;
  /** Deck-wide multiplier on every headline's size (0.5–2), on top of per-screen sizes. */
  headlineScale: number;
  headlineCase: "as-typed" | "upper";
  /** "auto" keeps each layout's own alignment. */
  captionAlign: "auto" | "left" | "center";
};

/** A complete look saved from Style Lab: palette, type, layout rhythm and scene. */
export type Look = {
  id: string;
  name: string;
  direction: string;
  themeId: string;
  fontId: ScreenshotFontId;
  scene: Scene;
  /** Layouts applied in order, repeating across the deck. */
  layouts: SlideLayout[];
  /** Screens (by position, repeating) that use the inverted background. */
  inverted: boolean[];
};

export type ProjectState = {
  schemaVersion?: number;
  appName: string;
  themeId: string;
  themeColors?: ThemeColors;
  fontId?: ScreenshotFontId;
  importedFont?: ImportedFont;
  // v1 projects render as isolated screens until the user opts into connected crops.
  connectedCanvas: boolean;
  // Locales this project targets. Drives the toolbar dropdown and bulk export.
  // Single-locale projects ship as ["en"] and hide the locale UI.
  locales: string[];
  locale: string;
  device: Device;
  orientation: Orientation;
  // Per-device slide decks so platform switching preserves work
  slidesByDevice: Record<Device, Slide[]>;
  appIcon?: string;    // path under /public (e.g. /app-icon.png)
  /** Deck-wide composition. Absent = the classic gradient + blobs look. */
  scene?: Scene;
  /** Looks starred in Style Lab. */
  savedLooks?: Look[];
};

export type Device =
  | "iphone"
  | "ipad"
  | "android"
  | "android-7"
  | "android-10"
  | "feature-graphic";

export type Orientation = "portrait" | "landscape";
export type Platform = "ios" | "android";

export type SlideLayout =
  | "hero"
  | "device-bottom"
  | "device-top"
  | "two-devices"
  | "no-device"
  | "split-landscape"
  | "feature-graphic";

export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

export type BuiltInElementId = "caption" | "device" | "deviceSecondary";
export type LayerElementId = `layer:${string}`;
export type TextElementId = `text:${string}`;
export type ElementId = BuiltInElementId | LayerElementId | TextElementId;

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
  scope?: "slide" | "master";
};

export type LocalizedText = Partial<Record<string, string>>;

export type LayerMeta = {
  name: string;
  hidden?: boolean;
  locked?: boolean;
  opacity?: number;
  groupId?: string;
  linkId?: string;
};

type VisualLayerBase = LayerMeta & {
  id: string;
  transform: ElementTransform;
};

export type TextLayer = VisualLayerBase & {
  kind: "text";
  text: LocalizedText;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
};

export type ImageLayer = VisualLayerBase & {
  kind: "image";
  src: string;
  fit?: "cover" | "contain" | "fill";
  borderRadius?: number;
  shadow?: string;
};

export type ShapeLayer = VisualLayerBase & {
  kind: "shape";
  shape: "rectangle" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  shadow?: string;
};

export type VisualLayer = TextLayer | ImageLayer | ShapeLayer;

export type LayerGroup = {
  id: string;
  name: string;
  layerIds: string[];
  locked?: boolean;
  hidden?: boolean;
};

export type Slide = {
  id: string;
  layout: SlideLayout;
  label: LocalizedText;
  headline: LocalizedText;
  screenshot: string;
  screenshotSecondary?: string;
  inverted?: boolean;
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  layers?: VisualLayer[];
  groups?: LayerGroup[];
  /** v2 compatibility only; migrated into `layers` on load. */
  textElements?: LegacyTextElement[];
};

export type LegacyTextElement = {
  id: string;
  text: LocalizedText;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

/** @deprecated v2 compatibility alias. New content uses `TextLayer`. */
export type TextElement = LegacyTextElement;

export type ThemeId =
  | "clean-light"
  | "dark-bold"
  | "warm-editorial"
  | "ocean-fresh"
  | "bloom-roast";

export type Theme = {
  id: string;
  name: string;
  bg: string;
  bgAlt: string;
  fg: string;
  fgAlt: string;
  accent: string;
  muted: string;
  background?: string;
  backgroundAlt?: string;
  fontFamily?: string;
  headlineFontFamily?: string;
  cornerRadius?: number;
};

export type DeviceDecks = Record<Device, Slide[]>;

export type ProjectVariant = {
  id: string;
  name: string;
  slidesByDevice: DeviceDecks;
};

export type MasterLayer = VisualLayer & {
  devices?: Device[];
};

export type CanvasSettings = {
  snapping: boolean;
  snapSize: number;
  showRulers: boolean;
  showSafeAreas: boolean;
  safeAreaPercent: number;
};

export type ProjectState = {
  schemaVersion: 3;
  appName: string;
  themeId: string;
  customThemes: Record<string, Theme>;
  connectedCanvas: boolean;
  locales: string[];
  locale: string;
  device: Device;
  orientation: Orientation;
  appIcon?: string;
  activeVariantId: string;
  variants: ProjectVariant[];
  masterLayers: MasterLayer[];
  canvasSettings: CanvasSettings;
};

export type LegacyProjectState = Partial<ProjectState> & {
  schemaVersion?: number;
  slidesByDevice?: Partial<DeviceDecks>;
};

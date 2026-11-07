import type { Device, Orientation, Platform, SlideLayout } from "./types";

export type Size = { w: number; h: number };
export type ExportSize = { label: string; w: number; h: number };
type Box = { x: number; y: number; w: number; h: number };

export type DuoDevice = Extract<Device, `duo-${string}`>;
export type CreativeDevice = Extract<Device, `creative-${string}`>;

type DeviceSpec = {
  label: string;
  /** Toolbar tab, and the top-level export folder (ios/…, macos/…, android/…). */
  platform: Platform;
  /** Design canvas: the largest accepted size, so every export is a downscale. */
  canvas: Size;
  exportSizes: ExportSize[];
  /** The same deck on a turned canvas. */
  landscape?: { canvas: Size; exportSizes: ExportSize[] };
  /** Each orientation is its own deck (and device), so turning never rewrites a composed placement. */
  orientations?: Record<Orientation, Device>;
  /** The iPhone Duo display drawn beside this one in "Folded + open". */
  companion?: DuoDevice;
  creative?: { safe: Box; crops: { label: string; aspect: number }[] };
  /** Layout a newly added screen starts with. */
  newSlideLayout: SlideLayout;
  /** Style Lab may change layouts on this deck in portrait. */
  rearrangeable: boolean;
  /** The frame must never be cropped by the canvas edge. */
  contained: boolean;
};

const IPHONE_SIZES: ExportSize[] = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
];

// "Art Safe Area" layer of Apple's static creative asset templates, measured in
// canvas pixels from the Photoshop files linked on developer.apple.com/app-store/
// asset-best-practices (downloaded 7 Oct 2026). Keep focal art and copy inside.
// `crops` preview how the universal asset may be trimmed in each placement.
// Apple does not publish that crop, so these are centred cover crops at each
// placement's own aspect: guides only, never applied to the export.
const creative = (
  label: string,
  canvas: Size,
  safe: Box,
  exportSizes: ExportSize[],
  crops: { label: string; aspect: number }[] = [],
): DeviceSpec => ({
  label,
  platform: "ios",
  canvas,
  exportSizes,
  creative: { safe, crops },
  newSlideLayout: "split-landscape",
  rearrangeable: false,
  contained: true,
});

/** Every target, in toolbar order within each platform. */
export const DEVICES: Record<Device, DeviceSpec> = {
  iphone: {
    label: "iPhone", platform: "ios", canvas: { w: 1320, h: 2868 }, exportSizes: IPHONE_SIZES,
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  ipad: {
    label: "iPad", platform: "ios", canvas: { w: 2064, h: 2752 },
    exportSizes: [
      { label: '13" iPad', w: 2064, h: 2752 },
      { label: '12.9" iPad Pro', w: 2048, h: 2732 },
    ],
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  // iPhone Duo, exactly as App Store Connect lists them (checked 7 Oct 2026):
  // one size per display and orientation. The displays are not scalings of each
  // other, so each is its own canvas. Opening a closed phone held upright gives
  // the inner display in landscape; opening it held sideways gives it in portrait.
  "duo-outer": {
    label: "iPhone Duo outer", platform: "ios", canvas: { w: 1398, h: 2034 },
    exportSizes: [{ label: "Outer portrait", w: 1398, h: 2034 }],
    orientations: { portrait: "duo-outer", landscape: "duo-outer-landscape" },
    companion: "duo-inner-landscape",
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  // A landscape phone hanging off the bottom reads as cropped, so it is contained.
  "duo-outer-landscape": {
    label: "iPhone Duo outer (landscape)", platform: "ios", canvas: { w: 2034, h: 1398 },
    exportSizes: [{ label: "Outer landscape", w: 2034, h: 1398 }],
    orientations: { portrait: "duo-outer", landscape: "duo-outer-landscape" },
    companion: "duo-inner",
    newSlideLayout: "split-landscape", rearrangeable: false, contained: true,
  },
  "duo-inner": {
    label: "iPhone Duo inner", platform: "ios", canvas: { w: 2007, h: 2853 },
    exportSizes: [{ label: "Inner portrait", w: 2007, h: 2853 }],
    orientations: { portrait: "duo-inner", landscape: "duo-inner-landscape" },
    companion: "duo-outer-landscape",
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  "duo-inner-landscape": {
    label: "iPhone Duo inner (landscape)", platform: "ios", canvas: { w: 2853, h: 2007 },
    exportSizes: [{ label: "Inner landscape", w: 2853, h: 2007 }],
    orientations: { portrait: "duo-inner", landscape: "duo-inner-landscape" },
    companion: "duo-outer",
    newSlideLayout: "split-landscape", rearrangeable: false, contained: true,
  },
  // App Store Connect display type APP_APPLE_TV. Verified 18 Aug 2026 via
  // `asc screenshots sizes --all`; these are the only accepted dimensions.
  // 16:9 landscape-only; 1920x1080 is a clean 2x downscale of the 4K canvas.
  tvos: {
    label: "Apple TV", platform: "ios", canvas: { w: 3840, h: 2160 },
    exportSizes: [
      { label: "4K (3840 x 2160)", w: 3840, h: 2160 },
      { label: "HD (1920 x 1080)", w: 1920, h: 1080 },
    ],
    newSlideLayout: "device-bottom", rearrangeable: false, contained: true,
  },
  // Apple Watch display types, all verified the same way:
  //   APP_WATCH_ULTRA 410x502 + 422x514 | SERIES_10 416x496
  //   SERIES_7 396x484 | SERIES_4 368x448 | SERIES_3 312x390
  watchos: {
    label: "Apple Watch", platform: "ios", canvas: { w: 422, h: 514 },
    exportSizes: [
      { label: "Ultra (422 x 514)", w: 422, h: 514 },
      { label: "Ultra (410 x 502)", w: 410, h: 502 },
      { label: "Series 10 (416x496)", w: 416, h: 496 },
      { label: "Series 7 (396 x 484)", w: 396, h: 484 },
      { label: "Series 4 (368 x 448)", w: 368, h: 448 },
      { label: "Series 3 (312 x 390)", w: 312, h: 390 },
    ],
    newSlideLayout: "device-bottom", rearrangeable: false, contained: true,
  },
  // 🚨 CarPlay has NO display type in App Store Connect - confirmed against its own
  // metadata, not documentation: `asc screenshots sizes --all` lists APPLE_TV,
  // VISION_PRO, DESKTOP, IPAD*, IPHONE*, WATCH* and nothing for CarPlay. A CarPlay
  // app ships inside its iPhone app, so a CarPlay shot is submitted in an iPhone
  // slot. These are therefore the iPhone sizes on purpose, in landscape (every
  // iPhone slot accepts both orientations).
  carplay: {
    label: "CarPlay (iPhone slot)", platform: "ios", canvas: { w: 2868, h: 1320 },
    exportSizes: IPHONE_SIZES.map((s) => ({ label: `${s.label} landscape`, w: s.h, h: s.w })),
    newSlideLayout: "device-bottom", rearrangeable: false, contained: true,
  },
  // App Store creative assets, the size of Apple's own templates. One universal
  // asset covers both the product page header and search results.
  "creative-universal": creative("Creative: universal", { w: 5244, h: 2950 }, { x: 1921, y: 660, w: 1402, h: 962 },
    [{ label: "Universal", w: 5244, h: 2950 }],
    [{ label: "Header crop", aspect: 3840 / 1646 }, { label: "Search crop", aspect: 3 / 2 }]),
  "creative-header": creative("Creative: header", { w: 3840, h: 1646 }, { x: 1097, y: 493, w: 1646, h: 661 },
    [{ label: "Header", w: 3840, h: 1646 }]),
  // Search results take any 3:2 size from 1920x1280 to 3840x2560.
  "creative-search": creative("Creative: search", { w: 3840, h: 2560 }, { x: 836, y: 765, w: 2168, h: 1030 }, [
    { label: "Search (3840 x 2560)", w: 3840, h: 2560 },
    { label: "Search (1920 x 1280)", w: 1920, h: 1280 },
  ]),
  // App Store Connect lists macOS as a separate platform with its own screenshot
  // set (APP_DESKTOP). These four 16:10 sizes are the only accepted dimensions.
  mac: {
    label: "Mac", platform: "macos", canvas: { w: 2880, h: 1800 },
    exportSizes: [
      { label: "2880 x 1800", w: 2880, h: 1800 },
      { label: "2560 x 1600", w: 2560, h: 1600 },
      { label: "1440 x 900", w: 1440, h: 900 },
      { label: "1280 x 800", w: 1280, h: 800 },
    ],
    newSlideLayout: "split-landscape", rearrangeable: false, contained: true,
  },
  android: {
    label: "Android Phone", platform: "android", canvas: { w: 1080, h: 1920 },
    exportSizes: [{ label: "Phone", w: 1080, h: 1920 }],
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  "android-7": {
    label: 'Android 7" Tablet', platform: "android", canvas: { w: 1200, h: 1920 },
    exportSizes: [{ label: '7" Portrait', w: 1200, h: 1920 }],
    landscape: { canvas: { w: 1920, h: 1200 }, exportSizes: [{ label: '7" Landscape', w: 1920, h: 1200 }] },
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  "android-10": {
    label: 'Android 10" Tablet', platform: "android", canvas: { w: 1600, h: 2560 },
    exportSizes: [{ label: '10" Portrait', w: 1600, h: 2560 }],
    landscape: { canvas: { w: 2560, h: 1600 }, exportSizes: [{ label: '10" Landscape', w: 2560, h: 1600 }] },
    newSlideLayout: "device-bottom", rearrangeable: true, contained: false,
  },
  "feature-graphic": {
    label: "Feature Graphic", platform: "android", canvas: { w: 1024, h: 500 },
    exportSizes: [{ label: "Feature Graphic", w: 1024, h: 500 }],
    newSlideLayout: "feature-graphic", rearrangeable: false, contained: false,
  },
};

export const ALL_DEVICES = Object.keys(DEVICES) as Device[];

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "ios", label: "iOS" },
  { id: "macos", label: "Mac" },
  { id: "android", label: "Android" },
];

export function isDevice(value: unknown): value is Device {
  return typeof value === "string" && Object.hasOwn(DEVICES, value);
}

export function platformDevices(platform: Platform): Device[] {
  return ALL_DEVICES.filter((device) => DEVICES[device].platform === platform);
}

export function platformOf(device: Device): Platform {
  return DEVICES[device].platform;
}

export function isDuoDevice(device: Device): device is DuoDevice {
  return !!DEVICES[device].companion;
}

export function isCreative(device: Device): device is CreativeDevice {
  return !!DEVICES[device].creative;
}

export function creativeSpec(device: CreativeDevice) {
  return DEVICES[device].creative!;
}

export function duoCompanion(device: DuoDevice): DuoDevice {
  return DEVICES[device].companion!;
}

export function supportsLandscape(device: Device): boolean {
  return !!DEVICES[device].landscape || !!DEVICES[device].orientations;
}

/** The device holding `device`'s deck in `orientation`; itself when orientation is just a canvas flip. */
export function deviceForOrientation(device: Device, orientation: Orientation): Device {
  return DEVICES[device].orientations?.[orientation] ?? device;
}

/** Orientation a paired device is fixed to; otherwise the project's orientation. */
export function orientationOf(device: Device, orientation: Orientation): Orientation {
  const pair = DEVICES[device].orientations;
  if (!pair) return orientation;
  return pair.landscape === device ? "landscape" : "portrait";
}

export function canvasSize(device: Device, orientation: Orientation): { cW: number; cH: number } {
  const spec = DEVICES[device];
  const canvas = orientation === "landscape" && spec.landscape ? spec.landscape.canvas : spec.canvas;
  return { cW: canvas.w, cH: canvas.h };
}

export function getExportSizes(device: Device, orientation: Orientation): ExportSize[] {
  const spec = DEVICES[device];
  return orientation === "landscape" && spec.landscape ? spec.landscape.exportSizes : spec.exportSizes;
}

/** Centred cover crop of a `cW`×`cH` canvas at `aspect` (w/h). */
export function centredCrop(cW: number, cH: number, aspect: number): Box {
  const w = Math.min(cW, cH * aspect);
  const h = w / aspect;
  return { x: (cW - w) / 2, y: (cH - h) / 2, w, h };
}

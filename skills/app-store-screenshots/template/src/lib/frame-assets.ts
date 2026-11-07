// Device frame geometry: the built-in frames' aspects and how wide each device
// is placed, and Apple's product bezels when the user has added them.
//
// Apple's bezels (developer.apple.com/design/resources, Product Bezels) ship in
// public/frames/; swapping a file changes the finish (see README). Apple
// licenses them for mock-ups of apps for Apple platforms. /api/frames measures
// each PNG's transparent screen cutout and the editor draws the screenshot under
// the real bezel. Without a file, iPhone Duo uses a drawn frame whose screen has
// the exact capture aspect, and every other device keeps its built-in frame.
// Android and CarPlay never use Apple bezels.
import { DEVICES, duoCompanion, duoDisplay, isDuoDevice, type DuoDevice } from "./devices";
import type { Device, Orientation } from "./types";

/** File names (without .png) looked for in public/frames/. */
export const FRAME_FILES = [
  "iphone-portrait",
  "ipad-portrait",
  "watch",
  "tv",
  "mac",
  "duo-outer-portrait",
  "duo-outer-landscape",
  "duo-inner-portrait",
  "duo-inner-landscape",
] as const;
export type FrameFile = (typeof FRAME_FILES)[number];

// Mac window: a 16:10 content area under a title bar MAC_TITLE_BAR x the content
// height tall, so a 16:10 capture (the Mac App Store's own aspect) fills the
// window without being cropped.
export const MAC_TITLE_BAR = 0.045;

/** The iPhone frame image; its screen is PHONE_SCREEN. */
export const MOCKUP_SRC = "/mockup.png";

/** Aspect (w/h) of each built-in frame drawn in device-frames.tsx. */
export const FRAME_ASPECT = {
  iphone: 1022 / 2082, // public/mockup.png
  android: 9 / 19.5,
  ipad: 770 / 1000,
  tabletPortrait: 5 / 8,
  tabletLandscape: 8 / 5,
  tv: 16 / 9,
  // Apple Watch Ultra, the largest accepted slot.
  watch: 422 / 514,
  // CarPlay head units vary by vehicle and Apple ships five presets in CarPlay
  // Simulator.app/Contents/Resources/VehicleConfigs: Minimum 748x456, Standard 800x480,
  // Widescreen 1920x720, Portrait 900x1200, Standard Video Playback 1920x1080.
  // "Standard" is the default here; change this to target another.
  carplay: 800 / 480,
  mac: 16 / (10 * (1 + MAC_TITLE_BAR)),
};

// Screen overlay on public/mockup.png (pre-measured).
export const PHONE_SCREEN = {
  L: (52 / 1022) * 100,
  T: (46 / 2082) * 100,
  W: (918 / 1022) * 100,
  H: (1990 / 2082) * 100,
  RX: (126 / 918) * 100,
  RY: (126 / 1990) * 100,
};

/**
 * How wide a frame is placed, as a share of the canvas: wide enough that it
 * takes `height` of the canvas height, but at most `clamp` of its width. The
 * small size is the back device of "Two devices".
 */
type Fit = { height: number; clamp: number; smallClamp: number; smallHeight?: number };

type BuiltInFrame = {
  aspect: number;
  fit: Fit;
  /** Aspect the fit is computed with, when it isn't the drawn one. */
  sizedAs?: number;
  /** Image the built-in frame draws, so exports can preload it. */
  image?: string;
  /** Apple's bezel for this device, and its fit when that differs. */
  bezel?: FrameFile;
  bezelFit?: Fit;
  /**
   * Captures fill the screen from the top. Mac captures are 16:10 but MacBook
   * screens are a little taller, so under Apple's bezel a Mac capture loses a
   * sliver at the bottom, like the built-in Mac window, instead of letterboxing.
   */
  fillFromTop?: boolean;
};

const PHONE_FIT: Fit = { height: 0.72, clamp: 0.84, smallClamp: 0.66 };

// Creatives lay out inside their safe area (see lib/layouts.ts), so these
// fractions are of the safe area, not the canvas. They show an iPhone.
const CREATIVE_FRAME: BuiltInFrame = {
  aspect: FRAME_ASPECT.iphone,
  image: MOCKUP_SRC,
  fit: { height: 0.62, clamp: 0.9, smallHeight: 0.5, smallClamp: 0.7 },
  bezel: "iphone-portrait",
};

// Android frames are placed as if they had the iPhone and earlier tablet
// aspects; changing that would move every existing Android placement.
const TABLET_FRAME: Record<Orientation, BuiltInFrame> = {
  portrait: { aspect: FRAME_ASPECT.tabletPortrait, sizedAs: 0.667, fit: { height: 0.72, clamp: 0.8, smallClamp: 0.62 } },
  landscape: { aspect: FRAME_ASPECT.tabletLandscape, sizedAs: 1.5, fit: { height: 0.75, clamp: 0.62, smallClamp: 0.5 } },
};

const BUILT_IN_FRAMES: Record<Exclude<Device, DuoDevice>, BuiltInFrame | Record<Orientation, BuiltInFrame>> = {
  iphone: { aspect: FRAME_ASPECT.iphone, fit: PHONE_FIT, image: MOCKUP_SRC, bezel: "iphone-portrait" },
  ipad: { aspect: FRAME_ASPECT.ipad, fit: { height: 0.72, clamp: 0.75, smallClamp: 0.6 }, bezel: "ipad-portrait" },
  // Clamped low so a 16:9 device clears the 0.28-height caption block on a 16:9 canvas.
  tvos: { aspect: FRAME_ASPECT.tv, fit: { height: 0.72, clamp: 0.58, smallClamp: 0.56 }, bezel: "tv" },
  // Apple's watch bezel includes its band, which takes nearly half its height;
  // the band's top stays below a two-line headline.
  watchos: {
    aspect: FRAME_ASPECT.watch,
    fit: { height: 0.72, clamp: 0.52, smallClamp: 0.42 },
    bezel: "watch",
    bezelFit: { height: 0.66, clamp: 0.62, smallClamp: 0.5 },
  },
  // Height-bound on the wide canvas: the head unit must clear the caption block.
  carplay: { aspect: FRAME_ASPECT.carplay, fit: { height: 0.58, clamp: 0.86, smallClamp: 0.7 } },
  // Contained like the TV: height-bound so the window clears the caption block
  // above or below it on the 16:10 canvas.
  mac: { aspect: FRAME_ASPECT.mac, fit: { height: 0.58, clamp: 0.86, smallClamp: 0.46 }, bezel: "mac", fillFromTop: true },
  android: { aspect: FRAME_ASPECT.android, sizedAs: FRAME_ASPECT.iphone, fit: PHONE_FIT },
  "android-7": TABLET_FRAME,
  "android-10": TABLET_FRAME,
  // The Play Store banner draws no device.
  "feature-graphic": { aspect: 1, sizedAs: FRAME_ASPECT.iphone, fit: PHONE_FIT },
  "creative-universal": CREATIVE_FRAME,
  "creative-header": CREATIVE_FRAME,
  "creative-search": CREATIVE_FRAME,
};

function builtInFrame(device: Exclude<Device, DuoDevice>, orientation: Orientation): BuiltInFrame {
  const frame = BUILT_IN_FRAMES[device];
  return "aspect" in frame ? frame : frame[orientation];
}

// Sized from the Duo frame's real aspect, so the squarer inner display gets a
// wider device instead of a stretched iPhone placement.
const DUO_FIT: Record<Orientation, Fit> = {
  portrait: { height: 0.66, clamp: 0.84, smallHeight: 0.52, smallClamp: 0.66 },
  landscape: { height: 0.58, clamp: 0.86, smallHeight: 0.46, smallClamp: 0.7 },
};

export type FrameLayout = {
  /** Frame width / height. */
  aspect: number;
  /** Frame width as a share of a `cW`×`cH` canvas. */
  width: (cW: number, cH: number) => number;
  /** Width of the smaller back device. */
  smallWidth: (cW: number, cH: number) => number;
};

function fitted(aspect: number, sizedAs: number, fit: Fit): FrameLayout {
  return {
    aspect,
    width: (cW, cH) => Math.min(fit.clamp, fit.height * (cH / cW) * sizedAs),
    smallWidth: (cW, cH) => Math.min(fit.smallClamp, (fit.smallHeight ?? fit.height) * (cH / cW) * sizedAs),
  };
}

/** The frame a device is drawn in: an Apple bezel when one is measured, otherwise the built-in frame. */
export function frameLayout(device: Device, orientation: Orientation): FrameLayout {
  if (isDuoDevice(device)) {
    const { aspect } = duoGeometry(device);
    return fitted(aspect, aspect, DUO_FIT[aspect > 1 ? "landscape" : "portrait"]);
  }
  const frame = builtInFrame(device, orientation);
  const bezel = bezelGeometry(device);
  if (bezel) return fitted(bezel.aspect, bezel.aspect, frame.bezelFit ?? frame.fit);
  return fitted(frame.aspect, frame.sizedAs ?? frame.aspect, frame.fit);
}

// A capture whose aspect is off by more than this is letterboxed rather than
// cropped: cropping would cut real UI, which is worse than a visible bar.
// Loose enough for every size a device accepts: Apple Watch slots differ from
// the Ultra's 422 × 514 screen by up to 2.6 %.
const FIT_TOLERANCE = 0.03;
// The two iPhone Duo displays differ by only 2.35 % (1398 × 2034 against
// 2007 × 2853), so Duo captures must match far more closely to tell an outer
// capture from an inner one. Scaled-down captures of the right display pass.
const DUO_FIT_TOLERANCE = 0.005;

/** Whether captures on `device` are anchored to the top of its screen and cropped rather than letterboxed. */
export function fillsFromTop(device: Device): boolean {
  return !isDuoDevice(device) && !!builtInFrame(device, "portrait").fillFromTop;
}

/** Whether a capture of `size` fills `device`'s screen (`screenAspect`) without letterboxing. */
export function captureFits(size: { w: number; h: number } | undefined, screenAspect: number, device: Device) {
  const tolerance = isDuoDevice(device) ? DUO_FIT_TOLERANCE : FIT_TOLERANCE;
  return !size || Math.abs(size.w / size.h / screenAspect - 1) <= tolerance;
}

const DUO_SOURCES: Record<DuoDevice, { file: FrameFile; rotateFrom?: FrameFile }> = {
  "duo-outer": { file: "duo-outer-portrait" },
  "duo-outer-landscape": { file: "duo-outer-landscape", rotateFrom: "duo-outer-portrait" },
  "duo-inner": { file: "duo-inner-portrait" },
  "duo-inner-landscape": { file: "duo-inner-landscape", rotateFrom: "duo-inner-portrait" },
};

type PixelRect = { x: number; y: number; w: number; h: number };

/** A bezel PNG measured by /api/frames: its size and transparent screen cutout. */
export type MeasuredFrame = {
  src: string;
  width: number;
  height: number;
  screen: PixelRect;
  /** Largest corner radius of the cutout in image pixels. */
  radius: number;
  /** Each corner's radius in image pixels: top-left, top-right, bottom-right, bottom-left. */
  radii?: [number, number, number, number];
};

export type FrameGeometry = {
  /** Frame width / height. */
  aspect: number;
  /** Screen rect as percentages of the frame. */
  screen: { L: number; T: number; W: number; H: number };
  /** Screen corner radius as percentages of the screen's width and height. */
  radius: { x: number; y: number };
  /** CSS border-radius clipping the capture to a bezel cutout whose corners differ. */
  clip?: string;
  /** Screen width / height. */
  screenAspect: number;
  /** The real bezel, drawn over the screen. `rotate` turns a portrait file to landscape. */
  image?: { src: string; rotate: boolean };
  /**
   * Camera drawn on the stand-in frame. The outer display has a front camera in
   * its top trailing corner; the inner display's FaceTime camera sits under the
   * screen, so nothing is drawn there (nor a crease: captures show none).
   */
  camera: "corner" | "none";
};

let measured: Partial<Record<FrameFile, MeasuredFrame>> = {};

/** Install the frames measured by /api/frames. Call before rendering any deck. */
export function setFrameAssets(next: Partial<Record<FrameFile, MeasuredFrame>>) {
  measured = { ...next };
}

/** Frame images a deck draws (its bezel, or the built-in frame's image), so they can be preloaded for export. */
export function frameAssetPaths(device: Device, orientation: Orientation): string[] {
  // A Duo deck also draws its companion display in "Folded + open".
  const devices = isDuoDevice(device) ? [device, duoCompanion(device)] : [device];
  return devices.flatMap((d) => {
    const bezel = bezelGeometry(d);
    if (bezel) return bezel.image ? [bezel.image.src] : [];
    const image = isDuoDevice(d) ? undefined : builtInFrame(d, orientation).image;
    return image ? [image] : [];
  });
}

/**
 * Frame geometry for a device drawn under an Apple bezel: always for iPhone Duo
 * (measured or drawn), otherwise only when the user has added that bezel.
 */
export function bezelGeometry(device: Device): FrameGeometry | null {
  if (isDuoDevice(device)) return duoGeometry(device);
  const file = builtInFrame(device, "portrait").bezel;
  const frame = file && measured[file];
  return frame ? fromMeasured(frame, false, "none") : null;
}

export function duoGeometry(device: DuoDevice): FrameGeometry {
  const { file, rotateFrom } = DUO_SOURCES[device];
  const inner = duoDisplay(device) === "inner";
  const camera = inner ? "none" : "corner";
  const direct = measured[file];
  if (direct) return fromMeasured(direct, false, camera);
  const turned = rotateFrom ? measured[rotateFrom] : undefined;
  if (turned) return fromMeasured(turned, true, camera);
  // Without a bezel the screen has exactly the capture's aspect.
  const { w, h } = DEVICES[device].canvas;
  return drawnGeometry(w / h, inner, camera);
}

function fromMeasured(frame: MeasuredFrame, rotate: boolean, camera: FrameGeometry["camera"]): FrameGeometry {
  // Turning counter-clockwise maps image point (x, y) to (y, width - x).
  const width = rotate ? frame.height : frame.width;
  const height = rotate ? frame.width : frame.height;
  const s = frame.screen;
  const screen = rotate ? { x: s.y, y: frame.width - (s.x + s.w), w: s.h, h: s.w } : s;
  return {
    aspect: width / height,
    screen: {
      L: (screen.x / width) * 100,
      T: (screen.y / height) * 100,
      W: (screen.w / width) * 100,
      H: (screen.h / height) * 100,
    },
    radius: { x: (frame.radius / screen.w) * 100, y: (frame.radius / screen.h) * 100 },
    clip: frame.radii && cornerClip(frame.radii, rotate, screen.w, screen.h),
    screenAspect: screen.w / screen.h,
    image: { src: frame.src, rotate },
    camera,
  };
}

// Clips the capture to the cutout's own corners, so a square corner shows the
// capture to the edge and a large one never pokes past the bezel's body.
function cornerClip(radii: [number, number, number, number], rotate: boolean, w: number, h: number) {
  // Turning counter-clockwise moves each corner one place round: the old
  // top-right becomes the top-left, and so on.
  const [tl, tr, br, bl] = rotate ? [radii[1], radii[2], radii[3], radii[0]] : radii;
  const xs = [tl, tr, br, bl].map((r) => `${(r / w) * 100}%`).join(" ");
  const ys = [tl, tr, br, bl].map((r) => `${(r / h) * 100}%`).join(" ");
  return `${xs} / ${ys}`;
}

// Drawn stand-in: an even bezel around a screen of exactly the capture aspect.
function drawnGeometry(screenAspect: number, inner: boolean, camera: FrameGeometry["camera"]): FrameGeometry {
  const sw = screenAspect;
  const sh = 1;
  const short = Math.min(sw, sh);
  const bezel = short * 0.028;
  const fw = sw + bezel * 2;
  const fh = sh + bezel * 2;
  const r = short * (inner ? 0.07 : 0.1);
  return {
    aspect: fw / fh,
    screen: { L: (bezel / fw) * 100, T: (bezel / fh) * 100, W: (sw / fw) * 100, H: (sh / fh) * 100 },
    radius: { x: (r / sw) * 100, y: (r / sh) * 100 },
    screenAspect,
    camera,
  };
}

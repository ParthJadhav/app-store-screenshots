import { DEFAULT_SCREENSHOT_FONT_ID, DEFAULT_THEME_ID, SCREENSHOT_FONTS, THEMES } from "./constants";
import { isLayout } from "./layouts";
import type { Callout, Look, Scene, SceneBackdrop, SceneDecoration, ScreenshotFontId } from "./types";
import { isRecord as record } from "./utils";

// The classic look every deck had before scenes existed. A project without a
// `scene` renders exactly like this, so older decks don't shift.
export const DEFAULT_SCENE: Scene = {
  backdrop: "gradient",
  span: false,
  decoration: "blobs",
  shadow: 0,
  glow: 0,
  tilt: 0,
  headlineWeight: 700,
  headlineScale: 1,
  headlineCase: "as-typed",
  captionAlign: "auto",
};

export const BACKDROPS: { id: SceneBackdrop; name: string }[] = [
  { id: "gradient", name: "Gradient" },
  { id: "solid", name: "Solid" },
  { id: "aurora", name: "Aurora" },
  { id: "spotlight", name: "Spotlight" },
  { id: "grid", name: "Grid" },
  { id: "dots", name: "Dots" },
  { id: "lines", name: "Ruled" },
];

export const DECORATIONS: { id: SceneDecoration; name: string }[] = [
  { id: "blobs", name: "Blobs" },
  { id: "rings", name: "Rings" },
  { id: "sparkles", name: "Sparkles" },
  { id: "none", name: "None" },
];

/** Range of each numeric scene setting; values on disk are clamped and snapped to it. */
export const SCENE_RANGES = {
  shadow: { min: 0, max: 100, step: 1 },
  glow: { min: 0, max: 100, step: 1 },
  tilt: { min: -30, max: 30, step: 1 },
  headlineWeight: { min: 300, max: 900, step: 100 },
  headlineScale: { min: 0.5, max: 2, step: 0.05 },
};
export const CALLOUT_ZOOM_MIN = 1.5;
export const CALLOUT_ZOOM_MAX = 5;
export const DEFAULT_CALLOUT: Callout = { focusX: 0.5, focusY: 0.32, zoom: 2, shape: "circle" };

const BACKDROP_IDS = new Set(BACKDROPS.map((b) => b.id));
const DECORATION_IDS = new Set(DECORATIONS.map((d) => d.id));
function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const inRange = (value: unknown, key: keyof typeof SCENE_RANGES) =>
  clampNumber(value, SCENE_RANGES[key].min, SCENE_RANGES[key].max, DEFAULT_SCENE[key]);

export function sceneOf(scene: Scene | undefined): Scene {
  return scene ?? DEFAULT_SCENE;
}

/** Normalise a scene from disk or a script; unknown values fall back to the classic look. */
export function cleanScene(value: unknown): Scene | undefined {
  if (!record(value)) return undefined;
  return {
    backdrop: BACKDROP_IDS.has(value.backdrop as SceneBackdrop) ? (value.backdrop as SceneBackdrop) : DEFAULT_SCENE.backdrop,
    span: value.span === true,
    decoration: DECORATION_IDS.has(value.decoration as SceneDecoration)
      ? (value.decoration as SceneDecoration)
      : DEFAULT_SCENE.decoration,
    shadow: Math.round(inRange(value.shadow, "shadow")),
    glow: Math.round(inRange(value.glow, "glow")),
    tilt: Math.round(inRange(value.tilt, "tilt")),
    headlineWeight: Math.round(inRange(value.headlineWeight, "headlineWeight") / 100) * 100,
    headlineScale: Math.round(inRange(value.headlineScale, "headlineScale") * 20) / 20,
    headlineCase: value.headlineCase === "upper" ? "upper" : "as-typed",
    captionAlign: value.captionAlign === "left" || value.captionAlign === "center" ? value.captionAlign : "auto",
  };
}

export function cleanCallout(value: unknown): Callout | undefined {
  if (!record(value)) return undefined;
  return {
    focusX: clampNumber(value.focusX, 0, 1, DEFAULT_CALLOUT.focusX),
    focusY: clampNumber(value.focusY, 0, 1, DEFAULT_CALLOUT.focusY),
    zoom: clampNumber(value.zoom, CALLOUT_ZOOM_MIN, CALLOUT_ZOOM_MAX, DEFAULT_CALLOUT.zoom),
    shape: value.shape === "rounded" ? "rounded" : "circle",
  };
}

export function cleanLook(value: unknown): Look | undefined {
  if (!record(value) || typeof value.id !== "string" || !value.id.trim()) return undefined;
  const scene = cleanScene(value.scene);
  if (!scene) return undefined;
  const layouts = Array.isArray(value.layouts)
    ? value.layouts.filter(isLayout)
    : [];
  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Saved look",
    direction: typeof value.direction === "string" ? value.direction : "",
    themeId: typeof value.themeId === "string" && THEMES[value.themeId] ? value.themeId : DEFAULT_THEME_ID,
    fontId:
      typeof value.fontId === "string" && Object.hasOwn(SCREENSHOT_FONTS, value.fontId)
        ? (value.fontId as ScreenshotFontId)
        : DEFAULT_SCREENSHOT_FONT_ID,
    scene,
    layouts: layouts.length > 0 ? layouts : ["hero"],
    inverted: Array.isArray(value.inverted) && value.inverted.length > 0
      ? value.inverted.map((item) => item === true)
      : [false],
  };
}

export function sameScene(a: Scene, b: Scene) {
  return (Object.keys(DEFAULT_SCENE) as (keyof Scene)[]).every((key) => a[key] === b[key]);
}

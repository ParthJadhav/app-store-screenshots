// Style Lab: generates complete looks for a deck (palette, type, layout rhythm
// and scene), keeps locked parts from the current deck, and applies a look as
// one undoable edit. Generation is seeded, so the same seed always produces
// the same four looks.
import { SCREENSHOT_FONTS, THEMES, fontAvailable } from "./constants";
import { DEVICES } from "./devices";
import { layoutHasDevice, restylable } from "./layouts";
import { DEFAULT_SCENE, sameScene, sceneOf } from "./scene";
import type { Device, Look, ProjectState, Scene, ScreenshotFontId, Slide, SlideLayout } from "./types";

export type LockKey = "palette" | "type" | "layout" | "scene";
export type Locks = Record<LockKey, boolean>;
export const NO_LOCKS: Locks = { palette: false, type: false, layout: false, scene: false };

export const LOCK_LABEL: Record<LockKey, { name: string; hint: string }> = {
  palette: { name: "Colors", hint: "Theme and which screens are inverted" },
  type: { name: "Type", hint: "Font, headline weight, case, alignment and size" },
  layout: { name: "Layout", hint: "Device placement on each screen" },
  scene: { name: "Scene", hint: "Backdrop, decoration, shadow, glow and tilt" },
};

type Rng = () => number;

// mulberry32: tiny, fast and good enough for picking design options.
function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length) % items.length];
const between = (r: Rng, min: number, max: number) => Math.round(min + r() * (max - min));
const signed = (r: Rng, min: number, max: number) => (r() < 0.5 ? -1 : 1) * between(r, min, max);

type Direction = {
  id: string;
  name: string;
  themes: string[];
  fonts: ScreenshotFontId[];
  layouts: SlideLayout[][];
  inverted: boolean[][];
  headlineScale: [number, number];
  scene: (r: Rng) => Omit<Scene, "headlineScale">;
};

export const DIRECTIONS: Direction[] = [
  {
    id: "editorial",
    name: "Editorial",
    themes: ["warm-editorial", "magazine-cover-editorial", "bloom-roast", "quiet-japandi", "hand-drawn-editorial-tasks"],
    fonts: ["baskerville", "palatino", "template-serif"],
    layouts: [["device-bottom", "hero"], ["hero", "device-bottom", "device-top"]],
    inverted: [[false, false, true], [false]],
    headlineScale: [0.95, 1.1],
    scene: (r) => ({
      backdrop: pick(r, ["lines", "solid", "gradient"] as const),
      span: false,
      decoration: pick(r, ["none", "rings"] as const),
      shadow: between(r, 25, 45),
      glow: 0,
      tilt: 0,
      headlineWeight: pick(r, [500, 600]),
      headlineCase: "as-typed",
      captionAlign: "left",
    }),
  },
  {
    id: "playful",
    name: "Playful",
    themes: ["candy-pop-social", "toybox-primary", "paper-sticker-skeuomorphic", "retro-rubberhose-mascot", "dreamy-pastel-couples"],
    fonts: ["futura", "avenir-next", "template-default"],
    layouts: [["hero", "two-devices", "device-top"], ["device-bottom", "device-top"]],
    inverted: [[false], [false, true]],
    headlineScale: [1.05, 1.2],
    scene: (r) => ({
      backdrop: pick(r, ["dots", "gradient", "aurora"] as const),
      span: r() < 0.5,
      decoration: pick(r, ["sparkles", "blobs"] as const),
      shadow: between(r, 40, 60),
      glow: between(r, 10, 30),
      tilt: signed(r, 8, 16),
      headlineWeight: pick(r, [800, 900]),
      headlineCase: "as-typed",
      captionAlign: "center",
    }),
  },
  {
    id: "cinematic",
    name: "Cinematic",
    themes: ["midnight-glow-pro", "neon-athletic-night", "dark-bold", "moody-curated-dating", "glossy-3d-kbeauty-creator"],
    fonts: ["helvetica-neue", "system-sans", "avenir-next"],
    layouts: [["hero"], ["hero", "device-bottom"]],
    inverted: [[false]],
    headlineScale: [0.9, 1],
    scene: (r) => ({
      backdrop: pick(r, ["spotlight", "aurora"] as const),
      span: r() < 0.4,
      decoration: pick(r, ["none", "rings"] as const),
      shadow: between(r, 60, 85),
      glow: between(r, 45, 80),
      tilt: r() < 0.35 ? 0 : signed(r, 8, 18),
      headlineWeight: pick(r, [700, 800]),
      headlineCase: pick(r, ["upper", "as-typed"] as const),
      captionAlign: "center",
    }),
  },
  {
    id: "minimal",
    name: "Minimal",
    themes: ["clean-light", "quiet-japandi", "swiss-grid-bold", "ocean-fresh", "bento-keynote-grid"],
    fonts: ["helvetica-neue", "system-sans", "optima", "template-default"],
    layouts: [["device-bottom"], ["device-bottom", "device-top"]],
    inverted: [[false]],
    headlineScale: [0.9, 1],
    scene: (r) => ({
      backdrop: pick(r, ["solid", "grid"] as const),
      span: false,
      decoration: "none",
      shadow: between(r, 15, 30),
      glow: 0,
      tilt: 0,
      headlineWeight: pick(r, [600, 700]),
      headlineCase: "as-typed",
      captionAlign: pick(r, ["center", "left"] as const),
    }),
  },
  {
    id: "dreamy",
    name: "Dreamy",
    themes: ["dreamy-pastel-couples", "liquid-glass-aurora", "soft-clay-wellness", "ocean-fresh"],
    fonts: ["avenir-next", "optima", "palatino"],
    layouts: [["hero", "device-top"], ["hero"]],
    inverted: [[false]],
    headlineScale: [1, 1.1],
    scene: (r) => ({
      backdrop: "aurora",
      span: true,
      decoration: pick(r, ["blobs", "sparkles"] as const),
      shadow: between(r, 30, 50),
      glow: between(r, 30, 60),
      tilt: signed(r, 6, 12),
      headlineWeight: pick(r, [600, 700]),
      headlineCase: "as-typed",
      captionAlign: "center",
    }),
  },
  {
    id: "swiss",
    name: "Swiss Bold",
    themes: ["swiss-grid-bold", "bento-keynote-grid", "risograph-zine", "neon-athletic-night"],
    fonts: ["helvetica-neue", "futura"],
    layouts: [["device-bottom", "device-top"]],
    inverted: [[false, true], [false, false, true]],
    headlineScale: [0.85, 0.95],
    scene: (r) => ({
      backdrop: "grid",
      span: r() < 0.5,
      decoration: pick(r, ["none", "rings"] as const),
      shadow: between(r, 30, 50),
      glow: 0,
      tilt: r() < 0.5 ? 0 : signed(r, 8, 12),
      headlineWeight: 900,
      headlineCase: "upper",
      captionAlign: "left",
    }),
  },
  {
    id: "poster",
    name: "Vintage Poster",
    themes: ["vintage-travel-poster", "risograph-zine", "hand-drawn-editorial-tasks", "warm-editorial"],
    fonts: ["american-typewriter", "futura", "baskerville"],
    layouts: [["hero", "device-top"]],
    inverted: [[false, false, true]],
    headlineScale: [0.9, 1.05],
    scene: (r) => ({
      backdrop: pick(r, ["lines", "dots"] as const),
      span: false,
      decoration: pick(r, ["rings", "sparkles"] as const),
      shadow: between(r, 35, 55),
      glow: 0,
      tilt: r() < 0.5 ? 0 : signed(r, 4, 8),
      headlineWeight: pick(r, [700, 800]),
      headlineCase: "upper",
      captionAlign: "center",
    }),
  },
  {
    id: "panorama",
    name: "Panorama",
    themes: ["ocean-fresh", "liquid-glass-aurora", "midnight-glow-pro", "candy-pop-social", "bloom-roast"],
    fonts: ["system-sans", "avenir-next", "template-default"],
    layouts: [["hero", "device-bottom"], ["device-bottom", "hero", "device-top"]],
    inverted: [[false]],
    headlineScale: [1, 1.1],
    scene: (r) => ({
      backdrop: pick(r, ["aurora", "gradient"] as const),
      span: true,
      decoration: pick(r, ["blobs", "rings"] as const),
      shadow: between(r, 40, 60),
      glow: between(r, 15, 40),
      tilt: signed(r, 10, 20),
      headlineWeight: pick(r, [700, 800]),
      headlineCase: "as-typed",
      captionAlign: "center",
    }),
  },
];

/** The four directions a fresh Style Lab opens with: clearly different from each other. */
const STARTER_DIRECTIONS = ["editorial", "playful", "cinematic", "minimal"];

export function directionName(id: string) {
  return DIRECTIONS.find((d) => d.id === id)?.name ?? "Custom";
}

/** One look from a direction, fully determined by the seed. */
export function generateLook(directionId: string, seed: number): Look {
  const direction = DIRECTIONS.find((d) => d.id === directionId) ?? DIRECTIONS[0];
  const r = rng(seed * 7919 + direction.id.length * 104729);
  const themeId = pick(r, direction.themes.filter((id) => !!THEMES[id]));
  const [lo, hi] = direction.headlineScale;
  return {
    id: `${direction.id}-${seed}`,
    name: `${direction.name} · ${THEMES[themeId]?.name ?? themeId}`,
    direction: direction.id,
    themeId,
    fontId: pick(r, direction.fonts.filter((id) => Object.hasOwn(SCREENSHOT_FONTS, id))),
    scene: { ...direction.scene(r), headlineScale: Math.round((lo + r() * (hi - lo)) * 20) / 20 },
    layouts: pick(r, direction.layouts),
    inverted: pick(r, direction.inverted),
  };
}

/** Four different directions for one shuffle, starting with the starter set. */
export function pickDirections(seed: number): string[] {
  const count = STARTER_DIRECTIONS.length;
  if (seed === 0) return [...STARTER_DIRECTIONS];
  const r = rng(seed * 31 + 7);
  const pool = DIRECTIONS.map((d) => d.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** The deck as it is now, expressed as a look. */
export function currentLook(state: ProjectState): Look {
  const slides = state.slidesByDevice[state.device] || [];
  return {
    id: "current",
    name: "Current",
    direction: "current",
    themeId: state.themeId,
    fontId: state.fontId ?? "template-default",
    scene: sceneOf(state.scene),
    layouts: slides.length ? slides.map((s) => s.layout) : ["hero"],
    inverted: slides.length ? slides.map((s) => !!s.inverted) : [false],
  };
}

const TYPE_SCENE_KEYS = ["headlineWeight", "headlineScale", "headlineCase", "captionAlign"] as const;

/** Replace every locked part of `look` with the same part of `base`. */
export function withLocks(look: Look, base: Look, locks: Locks): Look {
  const scene: Scene = { ...look.scene };
  if (locks.scene) {
    for (const key of Object.keys(DEFAULT_SCENE) as (keyof Scene)[]) {
      if (!(TYPE_SCENE_KEYS as readonly string[]).includes(key)) (scene as Record<string, unknown>)[key] = base.scene[key];
    }
  }
  if (locks.type) for (const key of TYPE_SCENE_KEYS) (scene as Record<string, unknown>)[key] = base.scene[key];
  return {
    ...look,
    themeId: locks.palette ? base.themeId : look.themeId,
    inverted: locks.palette ? base.inverted : look.inverted,
    fontId: locks.type ? base.fontId : look.fontId,
    layouts: locks.layout ? base.layouts : look.layouts,
    scene,
  };
}

// Phones and portrait tablets have the full set of portrait layouts. Landscape
// canvases, watches and the Play banner keep their own layouts.
export function canRearrange(device: Device, orientation: ProjectState["orientation"]) {
  return DEVICES[device].rearrangeable && orientation === "portrait";
}

function restyleSlide(slide: Slide, index: number, look: Look, locks: Locks, rearrange: boolean): Slide {
  let next: Slide = { ...slide };
  if (!locks.palette) {
    next.inverted = look.inverted[index % look.inverted.length] || undefined;
    next.backgroundColor = undefined;
  }
  if (!locks.layout && rearrange && layoutHasDevice(slide.layout)) {
    let layout = look.layouts[index % look.layouts.length];
    // A back device without its own screenshot would just repeat the front one.
    if (layout === "two-devices" && !slide.screenshotSecondary) layout = "hero";
    if (!restylable(layout)) layout = slide.layout;
    // Fresh layout = fresh default placement, so the look reads as designed.
    const { caption: _c, device: _d, deviceSecondary: _s, callout: _m, ...kept } = slide.transforms || {};
    next = { ...next, layout, transforms: Object.keys(kept).length ? kept : undefined };
  }
  return next;
}

/** The project with `look` applied to the open deck. Locked parts stay as they are. */
export function applyLook(state: ProjectState, look: Look, locks: Locks): ProjectState {
  const slides = state.slidesByDevice[state.device] || [];
  const rearrange = canRearrange(state.device, state.orientation);
  const base = currentLook(state);
  const merged = withLocks(look, base, locks);
  // An imported font only exists on the machine that imported it.
  const fontId = fontAvailable(merged.fontId, state.importedFont) ? merged.fontId : state.fontId;
  const scene = merged.scene;
  return {
    ...state,
    themeId: merged.themeId,
    fontId,
    scene: sameScene(scene, DEFAULT_SCENE) ? undefined : scene,
    slidesByDevice: {
      ...state.slidesByDevice,
      [state.device]: slides.map((slide, i) => restyleSlide(slide, i, merged, locks, rearrange)),
    },
  };
}

/** Look id unique within the saved list. */
export function savedLookId(look: Look, saved: Look[]) {
  let id = look.id === "current" ? `look-${Date.now().toString(36)}` : look.id;
  while (saved.some((s) => s.id === id)) id = `${id}-${Math.floor(Math.random() * 1e4)}`;
  return id;
}

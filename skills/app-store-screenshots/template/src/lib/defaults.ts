import starterProject from "./starter-project.json";
import type { Device, ProjectState, Slide } from "./types";

let sequence = 0;

export const nid = () => `s_${Date.now().toString(36)}_${(sequence++).toString(36)}`;

export const DEFAULT_PROJECT = starterProject as ProjectState;

export function createDefaultProject(): ProjectState {
  return structuredClone(DEFAULT_PROJECT);
}

export function newSlide(layout: Slide["layout"] = "device-bottom"): Slide {
  return {
    id: nid(),
    layout,
    label: { en: "NEW" },
    headline: { en: "Edit this\nheadline." },
    screenshot: "",
    layers: [],
    groups: [],
  };
}

export function detectPlatform(device: Device): "ios" | "android" {
  return device === "iphone" || device === "ipad" ? "ios" : "android";
}

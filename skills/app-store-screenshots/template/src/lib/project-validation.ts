import { DEVICE_LABEL, LAYOUT_LABEL } from "./constants";

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const localized = (value: unknown) => value === undefined || typeof value === "string" ||
  (record(value) && Object.values(value).every(text => typeof text === "string"));
const transform = (value: unknown) => record(value) &&
  [value.x, value.y, value.width, value.height].every(finite) &&
  (value.width as number) > 0 && (value.height as number) > 0 &&
  [value.rotation, value.zIndex].every(n => n === undefined || finite(n));

/** Reject malformed generated/edited JSON before it can crash or overwrite a deck. */
export function projectValidationError(value: unknown): string | null {
  if (!record(value) || !record(value.slidesByDevice)) return "Project must contain a slidesByDevice object";
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1 && value.schemaVersion !== 2) return "Unsupported project schema version";
  if (value.connectedCanvas !== undefined && typeof value.connectedCanvas !== "boolean") return "connectedCanvas must be a boolean";
  for (const key of ["appName", "themeId", "locale", "appIcon"]) {
    if (value[key] !== undefined && typeof value[key] !== "string") return `${key} must be a string`;
  }
  if (value.device !== undefined && (typeof value.device !== "string" || !Object.hasOwn(DEVICE_LABEL, value.device))) {
    return "Unknown project device";
  }
  if (value.orientation !== undefined && value.orientation !== "portrait" && value.orientation !== "landscape") {
    return "Unknown project orientation";
  }
  if (value.locales !== undefined && (!Array.isArray(value.locales) ||
      value.locales.some(locale => typeof locale !== "string" || !/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/.test(locale)) ||
      new Set(value.locales).size !== value.locales.length)) return "locales must be a list of unique locale codes";
  if (value.scene !== undefined && !record(value.scene)) return "scene must be an object";
  if (value.themeColors !== undefined && (!record(value.themeColors) || Object.values(value.themeColors).some(colors => !record(colors)))) {
    return "themeColors must map theme ids to color objects";
  }
  if (value.savedLooks !== undefined && (!Array.isArray(value.savedLooks) || value.savedLooks.some(look => !record(look)))) {
    return "savedLooks must be a list of looks";
  }
  for (const [device, slides] of Object.entries(value.slidesByDevice)) {
    if (!Object.hasOwn(DEVICE_LABEL, device)) return `Unknown deck device: ${device}`;
    if (!Array.isArray(slides)) return `${device} deck must be an array`;
    const ids = new Set<string>();
    for (const slide of slides) {
      if (!record(slide) || typeof slide.id !== "string" || !slide.id.trim() || ids.has(slide.id)) {
        return `${device} screens must have unique non-empty ids`;
      }
      ids.add(slide.id);
      if (typeof slide.layout !== "string" || !Object.hasOwn(LAYOUT_LABEL, slide.layout)) return `${device}: unknown screen layout`;
      for (const key of ["screenshot", "screenshotSecondary"]) {
        if (slide[key] !== undefined && typeof slide[key] !== "string") return `${device}: ${key} must be a string`;
      }
      if (!localized(slide.label) || !localized(slide.headline)) return `${device}: copy must be text or a locale-to-text object`;
      if (slide.inverted !== undefined && typeof slide.inverted !== "boolean") return `${device}: inverted must be a boolean`;
      // Missing or out-of-range magnifier values are defaulted and clamped on load.
      if (slide.callout !== undefined && (!record(slide.callout) ||
        [slide.callout.focusX, slide.callout.focusY, slide.callout.zoom].some(n => n !== undefined && !finite(n)))) return `${device}: invalid callout`;
      if (slide.transforms !== undefined && (!record(slide.transforms) || Object.entries(slide.transforms).some(([key, value]) =>
        !["caption", "device", "deviceSecondary", "callout"].includes(key) || !transform(value)))) return `${device}: invalid element transform`;
      for (const key of ["textElements", "imageElements"] as const) {
        const elements = slide[key];
        if (elements === undefined) continue;
        if (!Array.isArray(elements)) return `${device}: ${key} must be an array`;
        const elementIds = new Set<string>();
        for (const element of elements) {
          if (!record(element) || typeof element.id !== "string" || !element.id.trim() || elementIds.has(element.id)) {
            return `${device}: ${key} must have unique non-empty ids`;
          }
          elementIds.add(element.id);
          if (!transform(element.transform)) return `${device}: invalid ${key} transform`;
          if (key === "textElements" && (!localized(element.text) ||
            [element.fontSize, element.fontWeight].some(n => n !== undefined && (!finite(n) || n <= 0)))) return `${device}: invalid text element`;
          if (key === "imageElements" && typeof element.src !== "string") return `${device}: image src must be a string`;
        }
      }
    }
  }
  return null;
}

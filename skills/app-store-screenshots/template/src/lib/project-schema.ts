// The project file's schema: what a valid app-store-screenshots.json looks like
// (checked by the API before writing and by the editor on load) and how an
// older or hand-edited project is brought up to the current schema on load.
// Older projects stay visually stable until they explicitly opt into
// connected canvas.
import { DEFAULT_SCREENSHOT_FONT_ID, PROJECT_SCHEMA_VERSION, SCREENSHOT_FONTS } from "./constants";
import { cleanHexColor } from "./clean-hex-color";
import { DEFAULT_PROJECT } from "./defaults";
import { isDevice, orientationOf } from "./devices";
import { isBuiltInElementId } from "./elements";
import { isLayout } from "./layouts";
import { coerceLocalized } from "./locale";
import { cleanCallout, cleanLook, cleanScene } from "./scene";
import { cleanTypography } from "./typography";
import { cleanImportedFont } from "./uploaded-assets";
import type { ElementTransform, ImageElement, Look, ProjectState, ScreenshotFontId, Slide, TextElement } from "./types";
import { isRecord as record } from "./utils";

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
  if (value.schemaVersion !== undefined && !(Number.isInteger(value.schemaVersion) && (value.schemaVersion as number) >= 1 && (value.schemaVersion as number) <= PROJECT_SCHEMA_VERSION)) {
    return "Unsupported project schema version";
  }
  if (value.connectedCanvas !== undefined && typeof value.connectedCanvas !== "boolean") return "connectedCanvas must be a boolean";
  for (const key of ["appName", "themeId", "locale", "appIcon"]) {
    if (value[key] !== undefined && typeof value[key] !== "string") return `${key} must be a string`;
  }
  if (value.device !== undefined && !isDevice(value.device)) {
    return "Unknown project device";
  }
  if (value.orientation !== undefined && value.orientation !== "portrait" && value.orientation !== "landscape") {
    return "Unknown project orientation";
  }
  if (value.locales !== undefined && (!Array.isArray(value.locales) ||
      value.locales.some(locale => typeof locale !== "string" || !/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/.test(locale)) ||
      new Set(value.locales).size !== value.locales.length)) return "locales must be a list of unique locale codes";
  if (value.scene !== undefined && !record(value.scene)) return "scene must be an object";
  if (value.savedLooks !== undefined && (!Array.isArray(value.savedLooks) || value.savedLooks.some(look => !record(look)))) {
    return "savedLooks must be a list of looks";
  }
  for (const [device, slides] of Object.entries(value.slidesByDevice)) {
    if (!isDevice(device)) return `Unknown deck device: ${device}`;
    if (!Array.isArray(slides)) return `${device} deck must be an array`;
    const ids = new Set<string>();
    for (const slide of slides) {
      if (!record(slide) || typeof slide.id !== "string" || !slide.id.trim() || ids.has(slide.id)) {
        return `${device} screens must have unique non-empty ids`;
      }
      ids.add(slide.id);
      if (!isLayout(slide.layout)) return `${device}: unknown screen layout`;
      for (const key of ["screenshot", "screenshotSecondary"]) {
        if (slide[key] !== undefined && typeof slide[key] !== "string") return `${device}: ${key} must be a string`;
      }
      if (!localized(slide.label) || !localized(slide.headline)) return `${device}: copy must be text or a locale-to-text object`;
      if (slide.inverted !== undefined && typeof slide.inverted !== "boolean") return `${device}: inverted must be a boolean`;
      // Missing or out-of-range magnifier values are defaulted and clamped on load.
      if (slide.callout !== undefined && (!record(slide.callout) ||
        [slide.callout.focusX, slide.callout.focusY, slide.callout.zoom].some(n => n !== undefined && !finite(n)))) return `${device}: invalid callout`;
      if (slide.transforms !== undefined && (!record(slide.transforms) || Object.entries(slide.transforms).some(([key, value]) =>
        !isBuiltInElementId(key) || !transform(value)))) return `${device}: invalid element transform`;
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

function cleanTransform(value: unknown): ElementTransform | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ElementTransform>;
  const required = [raw.x, raw.y, raw.width, raw.height];
  if (!required.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return {
    x: raw.x!,
    y: raw.y!,
    width: Math.max(1, raw.width!),
    height: Math.max(1, raw.height!),
    ...(typeof raw.rotation === "number" && Number.isFinite(raw.rotation)
      ? { rotation: raw.rotation }
      : {}),
    ...(typeof raw.zIndex === "number" && Number.isFinite(raw.zIndex)
      ? { zIndex: raw.zIndex }
      : {}),
  };
}

function cleanTextElement(value: unknown): TextElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<TextElement>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  return {
    id: raw.id,
    text: coerceLocalized(raw.text as unknown),
    transform,
    ...(typeof raw.fontSize === "number" && Number.isFinite(raw.fontSize)
      ? { fontSize: raw.fontSize }
      : {}),
    ...(typeof raw.fontWeight === "number" && Number.isFinite(raw.fontWeight)
      ? { fontWeight: raw.fontWeight }
      : {}),
    ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    ...(raw.align === "left" || raw.align === "center" || raw.align === "right"
      ? { align: raw.align }
      : {}),
  };
}

function cleanImageElement(value: unknown): ImageElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ImageElement>;
  if (typeof raw.id !== "string" || !raw.id.trim() || typeof raw.src !== "string") return undefined;
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  return {
    id: raw.id,
    src: raw.src,
    transform,
    ...(raw.fit === "cover" || raw.fit === "contain" ? { fit: raw.fit } : {}),
    ...(raw.fade &&
    typeof raw.fade === "object" &&
    ["top", "bottom", "left", "right"].includes(raw.fade.edge as string) &&
    typeof raw.fade.amount === "number" &&
    Number.isFinite(raw.fade.amount)
      ? {
          fade: {
            edge: raw.fade.edge,
            amount: Math.max(0, Math.min(100, raw.fade.amount)),
          },
        }
      : {}),
  };
}

// Early builds had a "Classic Serif" that rendered exactly like Georgia.
const LEGACY_FONT_IDS: Record<string, ScreenshotFontId> = { "classic-serif": "template-serif" };

function cleanFontId(value: unknown, hasImportedFont: boolean): ScreenshotFontId {
  if (typeof value !== "string") return DEFAULT_SCREENSHOT_FONT_ID;
  const id = LEGACY_FONT_IDS[value] ?? value;
  if (!Object.prototype.hasOwnProperty.call(SCREENSHOT_FONTS, id)) return DEFAULT_SCREENSHOT_FONT_ID;
  // "Imported font" without a file behind it would render the fallback.
  if (id === "self-hosted" && !hasImportedFont) return DEFAULT_SCREENSHOT_FONT_ID;
  return id as ScreenshotFontId;
}

// Migrate older projects into the current schema while keeping legacy decks
// visually stable until they explicitly opt into connected canvas.
function migrateSlide(slide: Slide): Slide {
  const backgroundColor = cleanHexColor(slide.backgroundColor);
  const transforms = slide.transforms
    ? Object.fromEntries(
        Object.entries(slide.transforms)
          .map(([id, transform]) => [id, cleanTransform(transform)])
          .filter((entry): entry is [string, ElementTransform] => !!entry[1]),
      )
    : undefined;
  const textElements = Array.isArray(slide.textElements)
    ? slide.textElements.map(cleanTextElement).filter((t): t is TextElement => !!t)
    : undefined;
  const imageElements = Array.isArray(slide.imageElements)
    ? slide.imageElements.map(cleanImageElement).filter((image): image is ImageElement => !!image)
    : undefined;
  const callout = cleanCallout(slide.callout);

  return {
    ...slide,
    label: coerceLocalized(slide.label as unknown),
    headline: coerceLocalized(slide.headline as unknown),
    typography: cleanTypography(slide.typography),
    ...(backgroundColor ? { backgroundColor } : { backgroundColor: undefined }),
    ...(transforms && Object.keys(transforms).length > 0 ? { transforms } : { transforms: undefined }),
    ...(textElements && textElements.length > 0 ? { textElements } : { textElements: undefined }),
    ...(imageElements && imageElements.length > 0 ? { imageElements } : { imageElements: undefined }),
    ...(callout ? { callout } : { callout: undefined }),
  };
}

/** A loaded project in the current schema, with defaults filled in. Throws if it fails validation. */
export function normalizeProject(parsed: Partial<ProjectState>): ProjectState {
  const validationError = projectValidationError(parsed);
  if (validationError) throw new Error(validationError);
  const connectedCanvas =
    typeof parsed.connectedCanvas === "boolean"
      ? parsed.connectedCanvas
      : false;
  const themeId =
    typeof parsed.themeId === "string" && parsed.themeId.trim()
      ? parsed.themeId
      : DEFAULT_PROJECT.themeId;
  const importedFont = cleanImportedFont(parsed.importedFont);
  const scene = cleanScene(parsed.scene);
  const savedLooks = Array.isArray(parsed.savedLooks)
    ? parsed.savedLooks.map(cleanLook).filter((look): look is Look => !!look)
    : [];
  const fontId = cleanFontId(parsed.fontId, !!importedFont);
  const slidesByDevice = parsed.slidesByDevice
    ? Object.fromEntries(
        Object.entries(parsed.slidesByDevice).map(([device, slides]) => [
          device,
          Array.isArray(slides)
            ? slides.map((slide) => {
                const migrated = migrateSlide(slide as Slide);
                // The Play Store banner deck only has one layout. Normalising
                // here (not while editing) keeps it out of undo history.
                return device === "feature-graphic" && migrated.layout !== "feature-graphic"
                  ? { ...migrated, layout: "feature-graphic" as const, transforms: undefined, screenshotSecondary: undefined }
                  : migrated;
              })
            : [],
        ]),
      )
    : {};
  const merged: ProjectState = {
    ...DEFAULT_PROJECT,
    ...parsed,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    themeId,
    fontId,
    ...(importedFont ? { importedFont } : { importedFont: undefined }),
    ...(scene ? { scene } : { scene: undefined }),
    ...(savedLooks.length > 0 ? { savedLooks } : { savedLooks: undefined }),
    connectedCanvas,
    slidesByDevice: {
      ...DEFAULT_PROJECT.slidesByDevice,
      ...slidesByDevice,
    } as ProjectState["slidesByDevice"],
  };
  // Duo decks are fixed to one orientation each; keep the project's in step.
  merged.orientation = orientationOf(merged.device, merged.orientation);
  // Clamp the active locale into the project's locale list so a stale
  // `locale` (e.g. from a project that dropped languages) doesn't show blank.
  if (!merged.locales || merged.locales.length === 0) {
    merged.locales = [...DEFAULT_PROJECT.locales];
  }
  if (!merged.locales.includes(merged.locale)) {
    merged.locale = merged.locales[0];
  }
  return merged;
}

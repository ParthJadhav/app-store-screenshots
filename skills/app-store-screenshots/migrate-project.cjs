const fs = require("fs");
const path = require("path");

const PROJECT_FILE = "app-store-screenshots.json";
const DEFAULT_LOCALE = "en";
const DEVICE_KEYS = ["iphone", "ipad", "tvos", "watchos", "carplay", "mac", "android", "android-7", "android-10", "feature-graphic"];
const LAYOUTS = ["hero", "device-bottom", "device-top", "two-devices", "no-device", "split-landscape", "feature-graphic"];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const templateState =
  readJson(path.join(process.env.BACKUP_DIR || "", "template-app-store-screenshots.json")) ||
  readJson(PROJECT_FILE) ||
  {};
const existingState = readJson(PROJECT_FILE) || {};
const hasExplicitConnectedCanvas = typeof existingState.connectedCanvas === "boolean";
const existingDecks =
  existingState.slidesByDevice && typeof existingState.slidesByDevice === "object" && !Array.isArray(existingState.slidesByDevice)
    ? existingState.slidesByDevice
    : {};
const hasExistingDecks = Object.keys(existingDecks).length > 0;
const state = {
  ...templateState,
  ...existingState,
  slidesByDevice: hasExistingDecks ? existingDecks : templateState.slidesByDevice || {},
};

const legacySlides =
  Array.isArray(existingState.slides) ? existingState.slides :
  Array.isArray(existingState.screens) ? existingState.screens :
  Array.isArray(existingState.features) ? existingState.features :
  null;

if (legacySlides && !hasExistingDecks) {
  state.slidesByDevice = {
    iphone: legacySlides,
  };
}

function localized(value) {
  if (typeof value === "string") return { [DEFAULT_LOCALE]: value };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).filter(([, text]) => typeof text === "string"));
  }
  return {};
}

function cleanTransform(value) {
  if (!value || typeof value !== "object") return undefined;
  const { x, y, width, height, rotation, zIndex } = value;
  if (![x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    ...(typeof rotation === "number" && Number.isFinite(rotation) ? { rotation } : {}),
    ...(typeof zIndex === "number" && Number.isFinite(zIndex) ? { zIndex } : {}),
  };
}

function firstString(...values) {
  return values.find((value) => typeof value === "string") || "";
}

// The editor refuses to load a deck with empty or repeated screen ids.
function uniqueId(value, used) {
  let id = typeof value === "string" && value.trim() ? value : "";
  while (!id || used.has(id)) id = `migrated-${Math.random().toString(36).slice(2, 10)}`;
  used.add(id);
  return id;
}

function migrateSlide(slide, used) {
  if (!slide || typeof slide !== "object" || Array.isArray(slide)) return null;
  const transforms = {};
  const rawTransforms = slide.transforms && typeof slide.transforms === "object" ? slide.transforms : {};
  for (const [id, transform] of Object.entries(rawTransforms)) {
    const cleaned = cleanTransform(transform);
    if (["caption", "device", "deviceSecondary", "callout"].includes(id) && cleaned) transforms[id] = cleaned;
  }
  const textIds = new Set();
  const textElements = Array.isArray(slide.textElements)
    ? slide.textElements
        .map((element) => {
          if (!element || typeof element !== "object" || Array.isArray(element)) return null;
          const transform = cleanTransform(element.transform);
          if (!transform) return null;
          return {
            ...element,
            id: uniqueId(element.id, textIds),
            text: localized(element.text),
            transform,
            fontSize: Number.isFinite(element.fontSize) && element.fontSize > 0 ? element.fontSize : undefined,
            fontWeight: Number.isFinite(element.fontWeight) && element.fontWeight > 0 ? element.fontWeight : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  const imageIds = new Set();
  const imageElements = Array.isArray(slide.imageElements)
    ? slide.imageElements.map((element) => {
        if (!element || typeof element !== "object" || Array.isArray(element) || typeof element.src !== "string") return null;
        const transform = cleanTransform(element.transform);
        return transform ? { ...element, id: uniqueId(element.id, imageIds), transform } : null;
      }).filter(Boolean)
    : undefined;

  return {
    ...slide,
    id: uniqueId(slide.id, used),
    layout: LAYOUTS.includes(slide.layout) ? slide.layout : "device-bottom",
    label: localized(slide.label),
    headline: localized(slide.headline || slide.title || slide.caption || slide.copy),
    screenshot: firstString(slide.screenshot, slide.image, slide.src, slide.path),
    screenshotSecondary: typeof slide.screenshotSecondary === "string" ? slide.screenshotSecondary : undefined,
    inverted: typeof slide.inverted === "boolean" ? slide.inverted : undefined,
    ...(Object.keys(transforms).length ? { transforms } : { transforms: undefined }),
    ...(textElements && textElements.length ? { textElements } : { textElements: undefined }),
    ...(imageElements && imageElements.length ? { imageElements } : { imageElements: undefined }),
    // The editor clamps magnifier values on load; only a non-object would be rejected.
    callout: slide.callout && typeof slide.callout === "object" && !Array.isArray(slide.callout) ? slide.callout : undefined,
  };
}

state.schemaVersion = 2;
state.connectedCanvas = hasExplicitConnectedCanvas ? existingState.connectedCanvas : false;
// Unique codes like "en", "pt-BR", "zh_Hans"; anything else makes the editor refuse the file.
const LOCALE_CODE = /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/;
state.locales = Array.isArray(state.locales)
  ? [...new Set(state.locales.filter((locale) => typeof locale === "string" && LOCALE_CODE.test(locale)))]
  : [];
if (!state.locales.length) state.locales = [DEFAULT_LOCALE];
state.locale = state.locales.includes(state.locale) ? state.locale : state.locales[0];
state.device = DEVICE_KEYS.includes(state.device) ? state.device : "iphone";
if (state.orientation !== "portrait" && state.orientation !== "landscape") delete state.orientation;
for (const key of ["appName", "themeId", "appIcon"]) {
  if (state[key] !== undefined && typeof state[key] !== "string") delete state[key];
}
// The feature graphic only shows an icon that `appIcon` points at.
if (!state.appIcon && fs.existsSync(path.join("public", "app-icon.png"))) state.appIcon = "/app-icon.png";

if (state.slidesByDevice && typeof state.slidesByDevice === "object") {
  for (const [device, slides] of Object.entries(state.slidesByDevice)) {
    // The editor only accepts known device decks; the backup keeps the original.
    if (!DEVICE_KEYS.includes(device)) {
      delete state.slidesByDevice[device];
      continue;
    }
    const used = new Set();
    state.slidesByDevice[device] = Array.isArray(slides) ? slides.map((slide) => migrateSlide(slide, used)).filter(Boolean) : [];
  }
}

if (!state.slidesByDevice[state.device]) {
  const firstDeviceWithSlides = DEVICE_KEYS.find((device) => state.slidesByDevice[device]?.length);
  if (firstDeviceWithSlides) state.device = firstDeviceWithSlides;
}

fs.writeFileSync(PROJECT_FILE, JSON.stringify(state, null, 2) + "\n");

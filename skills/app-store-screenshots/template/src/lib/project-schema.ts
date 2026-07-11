import { PROJECT_SCHEMA_VERSION, THEMES } from "./constants";
import { createDefaultProject } from "./defaults";
import { coerceLocalized } from "./locale";
import type {
  CanvasSettings,
  Device,
  DeviceDecks,
  ElementTransform,
  ImageLayer,
  LayerGroup,
  LegacyProjectState,
  MasterLayer,
  ProjectState,
  ProjectVariant,
  ShapeLayer,
  Slide,
  TextLayer,
  Theme,
  VisualLayer,
} from "./types";

export const DEVICES: Device[] = [
  "iphone",
  "ipad",
  "android",
  "android-7",
  "android-10",
  "feature-graphic",
];
const LAYOUTS: Slide["layout"][] = ["hero", "device-bottom", "device-top", "two-devices", "no-device", "split-landscape", "feature-graphic"];

type ProjectParseResult = {
  state: ProjectState;
  migrated: boolean;
  warnings: string[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function cleanTransform(value: unknown): ElementTransform | undefined {
  const raw = record(value);
  if (!raw) return undefined;
  if (![raw.x, raw.y, raw.width, raw.height].every((item) => typeof item === "number" && Number.isFinite(item))) {
    return undefined;
  }
  return {
    x: raw.x as number,
    y: raw.y as number,
    width: Math.max(1, raw.width as number),
    height: Math.max(1, raw.height as number),
    rotation: finite(raw.rotation, 0),
    zIndex: Math.round(finite(raw.zIndex, 1)),
  };
}

function cleanLayer(value: unknown, index: number): VisualLayer | undefined {
  const raw = record(value);
  const transform = cleanTransform(raw?.transform);
  if (!raw || !transform || typeof raw.id !== "string") return undefined;
  const common = {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Layer ${index + 1}`,
    transform,
    hidden: raw.hidden === true,
    locked: raw.locked === true,
    opacity: Math.max(0, Math.min(1, finite(raw.opacity, 1))),
    ...(typeof raw.groupId === "string" ? { groupId: raw.groupId } : {}),
    ...(typeof raw.linkId === "string" ? { linkId: raw.linkId } : {}),
  };
  if (raw.kind === "text") {
    return {
      ...common,
      kind: "text",
      text: coerceLocalized(raw.text),
      fontSize: Math.max(8, finite(raw.fontSize, 72)),
      fontWeight: Math.max(100, Math.min(900, finite(raw.fontWeight, 700))),
      ...(typeof raw.fontFamily === "string" ? { fontFamily: raw.fontFamily } : {}),
      ...(typeof raw.color === "string" ? { color: raw.color } : {}),
      align: raw.align === "left" || raw.align === "right" ? raw.align : "center",
      lineHeight: Math.max(0.7, Math.min(3, finite(raw.lineHeight, 1.05))),
    } satisfies TextLayer;
  }
  if (raw.kind === "image") {
    return {
      ...common,
      kind: "image",
      src: typeof raw.src === "string" ? raw.src : "",
      fit: raw.fit === "contain" || raw.fit === "fill" ? raw.fit : "cover",
      borderRadius: Math.max(0, finite(raw.borderRadius, 0)),
      ...(typeof raw.shadow === "string" ? { shadow: raw.shadow } : {}),
    } satisfies ImageLayer;
  }
  if (raw.kind === "shape") {
    return {
      ...common,
      kind: "shape",
      shape: raw.shape === "ellipse" || raw.shape === "line" ? raw.shape : "rectangle",
      fill: typeof raw.fill === "string" ? raw.fill : "#5B7CFA",
      stroke: typeof raw.stroke === "string" ? raw.stroke : "transparent",
      strokeWidth: Math.max(0, finite(raw.strokeWidth, 0)),
      borderRadius: Math.max(0, finite(raw.borderRadius, 24)),
      ...(typeof raw.shadow === "string" ? { shadow: raw.shadow } : {}),
    } satisfies ShapeLayer;
  }
  return undefined;
}

function cleanGroups(value: unknown, layerIds: Set<string>): LayerGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const raw = record(item);
    if (!raw || typeof raw.id !== "string") return [];
    const ids = Array.isArray(raw.layerIds)
      ? raw.layerIds.filter((id): id is string => typeof id === "string" && layerIds.has(id))
      : [];
    if (ids.length < 2) return [];
    return [{
      id: raw.id,
      name: typeof raw.name === "string" ? raw.name : `Group ${index + 1}`,
      layerIds: [...new Set(ids)],
      locked: raw.locked === true,
      hidden: raw.hidden === true,
    }];
  });
}

function migrateSlide(value: unknown, fallback: Slide, warnings: string[]): Slide {
  const raw = record(value) || {};
  const existingLayers = Array.isArray(raw.layers)
    ? raw.layers.map(cleanLayer).filter((layer): layer is VisualLayer => !!layer)
    : [];
  const legacyLayers = Array.isArray(raw.textElements)
    ? raw.textElements.flatMap((item, index): TextLayer[] => {
        const text = record(item);
        const transform = cleanTransform(text?.transform);
        if (!text || !transform || typeof text.id !== "string") return [];
        warnings.push(`Migrated legacy text element '${text.id}' to a visual layer.`);
        return [{
          id: text.id,
          kind: "text",
          name: `Text ${index + 1}`,
          text: coerceLocalized(text.text),
          transform,
          fontSize: Math.max(8, finite(text.fontSize, 72)),
          fontWeight: Math.max(100, Math.min(900, finite(text.fontWeight, 700))),
          color: typeof text.color === "string" ? text.color : undefined,
          align: text.align === "left" || text.align === "right" ? text.align : "center",
          lineHeight: 1.05,
          opacity: 1,
        }];
      })
    : [];
  const layerMap = new Map([...existingLayers, ...legacyLayers].map((layer) => [layer.id, layer]));
  const layers = [...layerMap.values()];
  const layerIds = new Set(layers.map((layer) => layer.id));
  const transformsRaw = record(raw.transforms);
  const transforms = transformsRaw
    ? Object.fromEntries(
        Object.entries(transformsRaw).flatMap(([key, transform]) => {
          const cleaned = cleanTransform(transform);
          return cleaned ? [[key, cleaned]] : [];
        }),
      )
    : undefined;
  return {
    id: typeof raw.id === "string" ? raw.id : fallback.id,
    layout: LAYOUTS.includes(raw.layout as Slide["layout"]) ? raw.layout as Slide["layout"] : fallback.layout,
    label: coerceLocalized(raw.label ?? fallback.label),
    headline: coerceLocalized(raw.headline ?? fallback.headline),
    screenshot: typeof raw.screenshot === "string" ? raw.screenshot : "",
    ...(typeof raw.screenshotSecondary === "string" ? { screenshotSecondary: raw.screenshotSecondary } : {}),
    ...(raw.inverted === true ? { inverted: true } : {}),
    ...(transforms && Object.keys(transforms).length ? { transforms } : {}),
    layers,
    groups: cleanGroups(raw.groups, layerIds),
  };
}

function migrateDecks(value: unknown, fallback: DeviceDecks, warnings: string[]): DeviceDecks {
  const raw = record(value) || {};
  const hasAnyDeck = DEVICES.some((device) => Array.isArray(raw[device]));
  return Object.fromEntries(
    DEVICES.map((device) => {
      const fallbackSlides = fallback[device];
      const slides = Array.isArray(raw[device]) ? raw[device] as unknown[] : hasAnyDeck ? [] : fallbackSlides;
      return [device, slides.map((slide, index) => migrateSlide(slide, fallbackSlides[index] || fallbackSlides[0], warnings))];
    }),
  ) as DeviceDecks;
}

function cleanTheme(value: unknown): Theme | undefined {
  const raw = record(value);
  if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string") return undefined;
  const required = ["bg", "bgAlt", "fg", "fgAlt", "accent", "muted"] as const;
  if (!required.every((key) => typeof raw[key] === "string")) return undefined;
  return raw as unknown as Theme;
}

function cleanCanvasSettings(value: unknown, fallback: CanvasSettings): CanvasSettings {
  const raw = record(value) || {};
  return {
    snapping: raw.snapping !== false,
    snapSize: Math.max(1, Math.min(100, finite(raw.snapSize, fallback.snapSize))),
    showRulers: raw.showRulers !== false,
    showSafeAreas: raw.showSafeAreas !== false,
    safeAreaPercent: Math.max(0, Math.min(20, finite(raw.safeAreaPercent, fallback.safeAreaPercent))),
  };
}

export function parseProject(value: unknown): ProjectParseResult {
  const defaults = createDefaultProject();
  const raw = record(value) || {};
  const previousVersion = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  const warnings: string[] = [];
  const legacy = raw as LegacyProjectState;
  const variants: ProjectVariant[] = Array.isArray(raw.variants)
    ? raw.variants.flatMap((item, index) => {
        const variant = record(item);
        if (!variant || typeof variant.id !== "string") return [];
        return [{
          id: variant.id,
          name: typeof variant.name === "string" ? variant.name : `Variant ${index + 1}`,
          slidesByDevice: migrateDecks(
            variant.slidesByDevice,
            defaults.variants[0].slidesByDevice,
            warnings,
          ),
        }];
      })
    : [{
        id: "default",
        name: "Default",
        slidesByDevice: migrateDecks(
          legacy.slidesByDevice,
          defaults.variants[0].slidesByDevice,
          warnings,
        ),
      }];
  if (!variants.length) variants.push(defaults.variants[0]);
  const locales = Array.isArray(raw.locales)
    ? [...new Set(raw.locales.filter((locale): locale is string => typeof locale === "string" && !!locale.trim()))]
    : defaults.locales;
  if (!locales.length) locales.push("en");
  const customThemes = record(raw.customThemes)
    ? Object.fromEntries(
        Object.entries(raw.customThemes as Record<string, unknown>).flatMap(([id, theme]) => {
          const cleaned = cleanTheme(theme);
          return cleaned ? [[id, cleaned]] : [];
        }),
      )
    : {};
  const masters = Array.isArray(raw.masterLayers)
    ? raw.masterLayers.flatMap((item, index): MasterLayer[] => {
        const layer = cleanLayer(item, index);
        if (!layer) return [];
        const source = record(item);
        const devices = Array.isArray(source?.devices)
          ? source.devices.filter((device): device is Device => DEVICES.includes(device as Device))
          : undefined;
        return [{ ...layer, ...(devices?.length ? { devices } : {}) }];
      })
    : [];
  const requestedVariant = typeof raw.activeVariantId === "string" ? raw.activeVariantId : variants[0].id;
  const state: ProjectState = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: typeof raw.appName === "string" ? raw.appName : defaults.appName,
    themeId:
      typeof raw.themeId === "string" && (THEMES[raw.themeId] || customThemes[raw.themeId])
        ? raw.themeId
        : defaults.themeId,
    customThemes,
    connectedCanvas:
      typeof raw.connectedCanvas === "boolean" ? raw.connectedCanvas : false,
    locales,
    locale: typeof raw.locale === "string" && locales.includes(raw.locale) ? raw.locale : locales[0],
    device: DEVICES.includes(raw.device as Device) ? raw.device as Device : defaults.device,
    orientation: raw.orientation === "landscape" ? "landscape" : "portrait",
    appIcon: typeof raw.appIcon === "string" ? raw.appIcon : "",
    activeVariantId: variants.some((variant) => variant.id === requestedVariant)
      ? requestedVariant
      : variants[0].id,
    variants,
    masterLayers: masters,
    canvasSettings: cleanCanvasSettings(raw.canvasSettings, defaults.canvasSettings),
  };
  return { state, migrated: previousVersion !== PROJECT_SCHEMA_VERSION, warnings };
}

export function migrateProject(value: unknown): ProjectState {
  return parseProject(value).state;
}

export function validateProject(value: unknown): { ok: true; state: ProjectState } | { ok: false; errors: string[] } {
  try {
    const parsed = parseProject(value);
    const errors: string[] = [];
    if (!parsed.state.appName.trim()) errors.push("App name cannot be empty.");
    if (!parsed.state.variants.length) errors.push("At least one variant is required.");
    if (!parsed.state.locales.length) errors.push("At least one locale is required.");
    return errors.length ? { ok: false, errors } : { ok: true, state: parsed.state };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

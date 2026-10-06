"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SCREENSHOT_FONT_ID, PROJECT_SCHEMA_VERSION, SCREENSHOT_FONTS, STORAGE_KEY, THEME_COLOR_LABEL } from "./constants";
import { cleanHexColor } from "./clean-hex-color";
import { cleanImportedFont } from "./clean-imported-font";
import { DEFAULT_PROJECT } from "./defaults";
import { coerceLocalized } from "./locale";
import { projectValidationError } from "./project-validation";
import { cleanCallout, cleanLook, cleanScene } from "./scene";
import { cleanTypography } from "./typography";
import type { Device, ElementTransform, ImageElement, Look, ProjectState, ScreenshotFontId, Slide, TextElement, ThemeColorKey, ThemeColors } from "./types";

const HISTORY_LIMIT = 50;
// Coalesce rapid edits (typing, slider drags) into a single undo step.
const COALESCE_MS = 500;
// Debounce file/localStorage writes — frequent enough to feel instant, infrequent enough not to thrash disk.
const SAVE_DEBOUNCE_MS = 600;

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

function cleanThemeColors(value: unknown): ThemeColors | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const cleaned: ThemeColors = {};
  for (const [themeId, colors] of Object.entries(value)) {
    if (!colors || typeof colors !== "object") continue;
    const edits = Object.fromEntries(
      (Object.keys(THEME_COLOR_LABEL) as ThemeColorKey[])
        .map((key) => [key, cleanHexColor((colors as Record<string, unknown>)[key])])
        .filter((entry) => !!entry[1]),
    );
    if (Object.keys(edits).length) cleaned[themeId] = edits;
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
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

function mergeWithDefaults(parsed: Partial<ProjectState>): ProjectState {
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
  const themeColors = cleanThemeColors(parsed.themeColors);
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
    ...(themeColors ? { themeColors } : { themeColors: undefined }),
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

function loadFromLocalStorage(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw) as Partial<ProjectState>);
  } catch {
    return null;
  }
}

async function loadFromFile(): Promise<
  { ok: true; state: ProjectState | null; revision: string | null } | { ok: false; error: string }
> {
  if (typeof window === "undefined") return { ok: false, error: "Window is not available" };
  try {
    const resp = await fetch("/api/project", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const json = (await resp.json()) as { ok: boolean; state: Partial<ProjectState> | null; error?: string };
    if (!resp.ok || !json.ok) return { ok: false, error: json.error || `HTTP ${resp.status}` };
    const revision = resp.headers.get("etag");
    if (!json.state) return { ok: true, state: null, revision };
    return { ok: true, state: mergeWithDefaults(json.state), revision };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Project file could not be loaded" };
  }
}

function saveToLocalStorage(state: ProjectState): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

async function saveToFile(state: ProjectState, revision: string | null): Promise<{ ok: true; revision: string | null } | { ok: false; error: string }> {
  try {
    const resp = await fetch("/api/project", {
      method: "POST",
      headers: { "content-type": "application/json", ...(revision ? { "if-match": revision } : {}) },
      body: JSON.stringify(state),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await resp.json()) as { ok: boolean; error?: string };
    if (!resp.ok || !json.ok) return { ok: false, error: json.error || `HTTP ${resp.status}` };
    return { ok: true, revision: resp.headers.get("etag") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type Updater = ProjectState | ((prev: ProjectState) => ProjectState);

function applyUpdater(updater: Updater, prev: ProjectState): ProjectState {
  return typeof updater === "function" ? updater(prev) : updater;
}

export function useProject() {
  const [state, _setState] = useState<ProjectState>(DEFAULT_PROJECT);
  const [hydrated, setHydrated] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const saveQueue = useRef(Promise.resolve());
  const saveRevision = useRef(0);
  const fileRevision = useRef<string | null>(null);
  const unsaved = useRef(false);
  const [retry, setRetry] = useState(0);

  // Run updates once, outside React render/updater replay. Async callbacks also
  // see the latest state before React has committed the next render.
  const commit = useCallback((next: ProjectState) => {
    stateRef.current = next;
    _setState(next);
  }, []);

  // History stacks live in refs — they don't drive any rendered UI, so
  // mutating them never needs to re-render.
  const pastRef = useRef<ProjectState[]>([]);
  const futureRef = useRef<ProjectState[]>([]);
  const lastPushAt = useRef(0);

  // Hydrate: prefer file (git-tracked) → localStorage (cache) → defaults.
  // localStorage is consulted first for instant paint, then file overwrites if present.
  useEffect(() => {
    let cancelled = false;
    const cached = loadFromLocalStorage();
    if (cached) commit(cached);

    void (async () => {
      const fromFile = await loadFromFile();
      if (cancelled) return;
      if (fromFile.ok) {
        fileRevision.current = fromFile.revision;
        if (fromFile.state) {
          commit(fromFile.state);
        } else {
          commit(DEFAULT_PROJECT);
        }
        setFileReady(true);
      } else {
        setFileReady(false);
        setSaveError(fromFile.error);
      }
      pastRef.current = [];
      futureRef.current = [];
      lastPushAt.current = 0;
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [commit]);

  // A refresh inside the debounce window must not silently discard edits.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!unsaved.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Debounced autosave to BOTH localStorage (fast, offline) and file (git-trackable).
  useEffect(() => {
    if (!hydrated || !fileReady) return;
    if (timer.current) clearTimeout(timer.current);
    const revision = ++saveRevision.current;
    setSavedAt(null);
    timer.current = setTimeout(() => {
      const localResult = saveToLocalStorage(state);
      // Serialize requests so a slow older write cannot overwrite a newer edit.
      saveQueue.current = saveQueue.current.then(async () => {
        if (revision !== saveRevision.current) return;
        const fileResult = await saveToFile(state, fileRevision.current);
        // Advance even if another edit arrived while this request was in flight.
        if (fileResult.ok) fileRevision.current = fileResult.revision;
        if (revision !== saveRevision.current) return;
        if (!fileResult.ok) {
          setSaveError(`File save failed: ${fileResult.error}`);
        } else {
          unsaved.current = false;
          setSavedAt(Date.now());
          setSaveError(localResult.ok ? null : localResult.error);
        }
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, fileReady, retry]);

  // `history: false` is for navigation (device, orientation, locale): it isn't
  // an edit, so it neither takes an undo step nor clears redo. Undo still
  // restores the snapshot's device, which takes you to the deck the undone
  // edit was made on.
  // Structural actions form their own step and end the typing/slider group.
  const setState = useCallback((updater: Updater, options?: { history?: boolean; coalesce?: boolean }) => {
    const prev = stateRef.current;
    const next = applyUpdater(updater, prev);
    if (next === prev) return;
    unsaved.current = true;
    if (options?.history === false) {
      // Navigation is a boundary: edits to another deck must not coalesce.
      lastPushAt.current = 0;
    } else {
      const now = Date.now();
      if (options?.coalesce === false || now - lastPushAt.current > COALESCE_MS) {
        pastRef.current.push(prev);
        if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      }
      futureRef.current.length = 0;
      lastPushAt.current = options?.coalesce === false ? 0 : now;
    }
    commit(next);
  }, [commit]);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (prev === undefined) return;
    futureRef.current.push(stateRef.current);
    unsaved.current = true;
    lastPushAt.current = 0;
    commit(prev);
  }, [commit]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    pastRef.current.push(stateRef.current);
    unsaved.current = true;
    lastPushAt.current = 0;
    commit(next);
  }, [commit]);

  // "Reset all devices" resets the decks only. App name, theme, font, icon and
  // especially `locales` (which has no editor UI) are project settings.
  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, slidesByDevice: DEFAULT_PROJECT.slidesByDevice }), { coalesce: false });
  }, [setState]);

  const resetDevice = useCallback((device: Device) => {
    setState((prev) => ({
      ...prev,
      slidesByDevice: {
        ...prev.slidesByDevice,
        [device]: DEFAULT_PROJECT.slidesByDevice[device],
      },
    }), { coalesce: false });
  }, [setState]);

  return {
    state,
    setState,
    hydrated,
    savedAt,
    saveError,
    retrySave: fileReady ? () => setRetry((value) => value + 1) : undefined,
    reset,
    resetDevice,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}

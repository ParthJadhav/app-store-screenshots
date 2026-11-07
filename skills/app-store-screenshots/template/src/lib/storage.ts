"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEY } from "./constants";
import { DEFAULT_PROJECT } from "./defaults";
import { normalizeProject } from "./project-schema";
import type { Device, ProjectState } from "./types";

const HISTORY_LIMIT = 50;
// Coalesce rapid edits (typing, slider drags) into a single undo step.
const COALESCE_MS = 500;
// Debounce file/localStorage writes — frequent enough to feel instant, infrequent enough not to thrash disk.
const SAVE_DEBOUNCE_MS = 600;

function loadFromLocalStorage(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeProject(JSON.parse(raw) as Partial<ProjectState>);
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
    return { ok: true, state: normalizeProject(json.state), revision };
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

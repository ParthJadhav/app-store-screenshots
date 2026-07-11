"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEY } from "./constants";
import { createDefaultProject } from "./defaults";
import { getActiveVariant, updateActiveVariant } from "./project-model";
import { migrateProject } from "./project-schema";
import type { Device, ProjectState } from "./types";

const HISTORY_LIMIT = 50;
const COALESCE_MS = 500;
const SAVE_DEBOUNCE_MS = 600;

function loadFromLocalStorage(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? migrateProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function loadFromFile(): Promise<
  { ok: true; state: ProjectState | null } | { ok: false; error: string }
> {
  if (typeof window === "undefined") return { ok: false, error: "Window is not available" };
  try {
    const response = await fetch("/api/project", { cache: "no-store" });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const json = (await response.json()) as { ok: boolean; state: unknown };
    if (!json.ok) return { ok: false, error: "Project response was not ok" };
    return { ok: true, state: json.state ? migrateProject(json.state) : null };
  } catch {
    return { ok: false, error: "Project file could not be loaded" };
  }
}

function saveToLocalStorage(state: ProjectState): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function saveToFile(state: ProjectState): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: true };
  try {
    const response = await fetch("/api/project", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    const json = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !json.ok) {
      return { ok: false, error: json.error || `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

type Updater = ProjectState | ((previous: ProjectState) => ProjectState);

function applyUpdater(updater: Updater, previous: ProjectState): ProjectState {
  return typeof updater === "function" ? updater(previous) : updater;
}

export function useProject() {
  const [state, setInternalState] = useState<ProjectState>(() => createDefaultProject());
  const [hydrated, setHydrated] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const past = useRef<ProjectState[]>([]);
  const future = useRef<ProjectState[]>([]);
  const lastPushAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const cached = loadFromLocalStorage();
    if (cached) setInternalState(cached);
    void (async () => {
      const result = await loadFromFile();
      if (cancelled) return;
      if (result.ok) {
        setInternalState(result.state || createDefaultProject());
        setFileReady(true);
        setSaveError(null);
      } else {
        setFileReady(false);
        setSaveError(result.error);
      }
      past.current = [];
      future.current = [];
      lastPushAt.current = 0;
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !fileReady) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const local = saveToLocalStorage(state);
      void saveToFile(state).then((file) => {
        if (local.ok && file.ok) {
          setSavedAt(Date.now());
          setSaveError(null);
        } else {
          setSavedAt(local.ok ? Date.now() : null);
          setSaveError(!file.ok ? `File save failed: ${file.error}` : !local.ok ? local.error : null);
        }
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, fileReady]);

  const setState = useCallback((updater: Updater) => {
    setInternalState((previous) => {
      const next = applyUpdater(updater, previous);
      if (next === previous) return previous;
      const now = Date.now();
      if (now - lastPushAt.current > COALESCE_MS) {
        past.current.push(previous);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
      }
      lastPushAt.current = now;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setInternalState((current) => {
      const previous = past.current.pop();
      if (!previous) return current;
      future.current.push(current);
      lastPushAt.current = 0;
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setInternalState((current) => {
      const next = future.current.pop();
      if (!next) return current;
      past.current.push(current);
      lastPushAt.current = 0;
      return next;
    });
  }, []);

  const reset = useCallback(() => setState(createDefaultProject()), [setState]);

  const resetDevice = useCallback((device: Device) => {
    const defaults = getActiveVariant(createDefaultProject());
    setState((previous) => updateActiveVariant(previous, (variant) => ({
      ...variant,
      slidesByDevice: {
        ...variant.slidesByDevice,
        [device]: structuredClone(defaults.slidesByDevice[device]),
      },
    })));
  }, [setState]);

  return { state, setState, hydrated, savedAt, saveError, reset, resetDevice, undo, redo };
}

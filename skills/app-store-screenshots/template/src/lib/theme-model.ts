import { DEFAULT_THEME_ID, THEMES, themeById } from "./constants";
import type { ProjectState, Theme } from "./types";

export function activeTheme(state: ProjectState): Theme {
  return themeById(state.themeId, state.customThemes);
}

export function createCustomTheme(state: ProjectState, name = "Custom Theme"): ProjectState {
  const source = activeTheme(state);
  const id = `custom-${Date.now().toString(36)}`;
  return {
    ...state,
    themeId: id,
    customThemes: {
      ...state.customThemes,
      [id]: { ...source, id, name },
    },
  };
}

export function updateActiveTheme(state: ProjectState, patch: Partial<Theme>): ProjectState {
  const current = activeTheme(state);
  const isBuiltIn = !!THEMES[state.themeId];
  const id = isBuiltIn ? `custom-${Date.now().toString(36)}` : state.themeId;
  const next: Theme = {
    ...current,
    ...patch,
    id,
    name: patch.name || (isBuiltIn ? `${current.name} Custom` : current.name),
  };
  return {
    ...state,
    themeId: id,
    customThemes: { ...state.customThemes, [id]: next },
  };
}

export function deleteCustomTheme(state: ProjectState, themeId: string): ProjectState {
  if (!state.customThemes[themeId]) return state;
  const customThemes = { ...state.customThemes };
  delete customThemes[themeId];
  return {
    ...state,
    customThemes,
    themeId: state.themeId === themeId ? DEFAULT_THEME_ID : state.themeId,
  };
}

import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./defaults";
import { activeTheme, createCustomTheme, deleteCustomTheme, updateActiveTheme } from "./theme-model";

describe("theme model", () => {
  it("forks a built-in theme before editing it", () => {
    const state = updateActiveTheme(createDefaultProject(), { name: "Campaign", accent: "#ff0000" });
    expect(state.themeId).toMatch(/^custom-/);
    expect(activeTheme(state)).toMatchObject({ name: "Campaign", accent: "#ff0000" });
  });

  it("duplicates and deletes project-local themes", () => {
    const custom = createCustomTheme(createDefaultProject(), "Duplicate");
    expect(custom.customThemes[custom.themeId].name).toBe("Duplicate");
    const removed = deleteCustomTheme(custom, custom.themeId);
    expect(removed.customThemes[custom.themeId]).toBeUndefined();
    expect(removed.themeId).toBe("clean-light");
  });
});

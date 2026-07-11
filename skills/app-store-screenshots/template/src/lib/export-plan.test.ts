import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./defaults";
import { buildExportPlan } from "./export-plan";
import { activeTheme } from "./theme-model";
import { addVariant } from "./project-model";

describe("export plan", () => {
  it("plans every device, locale, size, and tablet orientation", () => {
    const state = createDefaultProject();
    const units = buildExportPlan(state, activeTheme(state));
    expect(units).toHaveLength(40);
    expect(units.some((unit) => unit.device === "android-10" && unit.orientation === "landscape")).toBe(true);
    expect(units.every((unit) => unit.path.endsWith(".png"))).toBe(true);
  });

  it("includes every variant", () => {
    const state = addVariant(createDefaultProject(), "Campaign");
    expect(buildExportPlan(state, activeTheme(state))).toHaveLength(80);
  });
});

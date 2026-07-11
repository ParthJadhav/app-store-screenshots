import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./defaults";
import { runPreflight } from "./preflight";

describe("preflight", () => {
  it("reports placeholder screenshots without blocking a structurally valid project", () => {
    const report = runPreflight(createDefaultProject());
    expect(report.errors).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.issues.some((issue) => issue.code === "missing-screenshot")).toBe(true);
  });

  it("blocks store-limit violations", () => {
    const state = createDefaultProject();
    const slides = state.variants[0].slidesByDevice.android;
    state.variants[0].slidesByDevice.android = Array.from({ length: 9 }, (_, index) => ({
      ...structuredClone(slides[0]), id: `android-${index}`,
    }));
    const report = runPreflight(state);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.code === "slide-limit")).toBe(true);
  });
});

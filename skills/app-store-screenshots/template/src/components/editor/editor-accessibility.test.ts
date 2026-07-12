import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readEditor = (file: string) => readFileSync(`src/components/editor/${file}`, "utf8");

describe("editor accessibility regressions", () => {
  it("keeps the toolbar actions responsive on narrow screens", () => {
    const source = readEditor("toolbar.tsx");
    expect(source).toContain('className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:shrink-0"');
  });

  it("names the editor controls exercised by the browser bug bash", () => {
    const source = [
      readEditor("toolbar.tsx"),
      readEditor("inspector.tsx"),
      readEditor("layer-inspector.tsx"),
      readEditor("project-settings-dialog.tsx"),
    ].join("\n");

    for (const label of [
      "Device", "Orientation", "Locale", "Variant", "Slide layout", "Slide label",
      "Layer opacity", "Layer rotation", "Image fit", "Image corner radius", "Shape type",
      "Shape fill", "Layer text", "Text size", "Text color", "Theme preset", "Delete theme",
    ]) expect(source).toContain(`aria-label="${label}"`);

    expect(source).toContain("aria-label={`Delete locale ${locale.toUpperCase()}`}");
    expect(source).toContain("aria-label={`Delete variant ${variant.name}`}");
  });
});

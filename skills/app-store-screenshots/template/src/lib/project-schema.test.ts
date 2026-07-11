import { describe, expect, it } from "vitest";
import starter from "./starter-project.json";
import rootStarter from "../../app-store-screenshots.json";
import { migrateProject, parseProject, validateProject } from "./project-schema";

describe("project schema", () => {
  it("keeps the shipped starter state synchronized", () => {
    expect(rootStarter).toEqual(starter);
    expect(validateProject(starter).ok).toBe(true);
  });

  it("migrates v2 decks and text elements into a default v3 variant", () => {
    const result = parseProject({
      schemaVersion: 2,
      appName: "Legacy",
      locales: ["en", "de"],
      locale: "de",
      device: "iphone",
      slidesByDevice: {
        iphone: [{
          id: "legacy-slide",
          layout: "hero",
          label: "OLD",
          headline: "Legacy headline",
          screenshot: "/legacy.png",
          textElements: [{
            id: "legacy-text",
            text: "Hello",
            transform: { x: 10, y: 20, width: 100, height: 50 },
          }],
        }],
      },
    });
    expect(result.migrated).toBe(true);
    expect(result.state.schemaVersion).toBe(3);
    expect(result.state.connectedCanvas).toBe(false);
    expect(result.state.variants[0].slidesByDevice.iphone[0].layers?.[0]).toMatchObject({
      id: "legacy-text",
      kind: "text",
      text: { en: "Hello" },
    });
    expect(result.state.variants[0].slidesByDevice.android).toEqual([]);
  });

  it("sanitizes malformed transforms and locale state", () => {
    const state = migrateProject({
      ...starter,
      locales: ["en"],
      locale: "missing",
      variants: [{
        ...starter.variants[0],
        slidesByDevice: {
          ...starter.variants[0].slidesByDevice,
          iphone: [{
            ...starter.variants[0].slidesByDevice.iphone[0],
            layers: [{
              id: "broken",
              kind: "shape",
              name: "Broken",
              shape: "rectangle",
              transform: { x: 1, y: 2, width: -100, height: Number.NaN },
            }],
          }],
        },
      }],
    });
    expect(state.locale).toBe("en");
    expect(state.variants[0].slidesByDevice.iphone[0].layers).toEqual([]);
  });

  it("preserves device filters on master layers", () => {
    const result = migrateProject({
      ...starter,
      masterLayers: [{
        id: "master",
        kind: "shape",
        name: "Master",
        shape: "rectangle",
        fill: "#fff",
        devices: ["iphone", "android", "unknown"],
        transform: { x: 0, y: 0, width: 100, height: 100 },
      }],
    });
    expect(result.masterLayers[0].devices).toEqual(["iphone", "android"]);
  });
});

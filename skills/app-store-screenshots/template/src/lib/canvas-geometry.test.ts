import { describe, expect, it } from "vitest";
import { safeAreaRect, snapTransform } from "./canvas-geometry";

const settings = {
  snapping: true,
  snapSize: 8,
  showRulers: true,
  showSafeAreas: true,
  safeAreaPercent: 5,
};

describe("canvas geometry", () => {
  it("computes proportional safe areas", () => {
    expect(safeAreaRect({ width: 1000, height: 2000 }, 5)).toEqual({
      x: 50, y: 100, width: 900, height: 1800,
    });
  });

  it("snaps element centers to the canvas center", () => {
    const result = snapTransform(
      { x: 447, y: 403, width: 100, height: 200 },
      { width: 1000, height: 1000 },
      settings,
    );
    expect(result.transform.x).toBe(450);
    expect(result.transform.y).toBe(400);
    expect(result.guides).toHaveLength(2);
  });
});

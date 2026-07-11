import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./defaults";
import {
  addLayer,
  alignLayers,
  demoteMaster,
  groupLayers,
  linkLayerToNextSlide,
  nudgeLayers,
  patchLayer,
  promoteToMaster,
  removeLayers,
  ungroupLayers,
} from "./editor-commands";
import { getSlides } from "./project-model";
import type { ShapeLayer } from "./types";

const shape = (id: string, x: number): ShapeLayer => ({
  id,
  kind: "shape",
  name: id,
  shape: "rectangle",
  fill: "#fff",
  transform: { x, y: 100, width: 100, height: 100, zIndex: 5 },
});

describe("editor commands", () => {
  it("groups, aligns, and nudges selected layers", () => {
    let state = createDefaultProject();
    const slideId = getSlides(state)[0].id;
    state = addLayer(state, slideId, shape("a", 50));
    state = addLayer(state, slideId, shape("b", 300));
    state = groupLayers(state, slideId, ["a", "b"]);
    state = alignLayers(state, slideId, ["a", "b"], "left");
    state = nudgeLayers(state, slideId, ["a"], 10, -5);
    const slide = getSlides(state)[0];
    expect(slide.groups).toHaveLength(1);
    expect(slide.layers?.map((layer) => layer.transform.x)).toEqual([60, 60]);
    expect(slide.layers?.map((layer) => layer.transform.y)).toEqual([95, 95]);
    state = patchLayer(state, slideId, "a", { transform: { ...slide.layers![0].transform, x: 90 } });
    expect(getSlides(state)[0].layers?.map((layer) => layer.transform.x)).toEqual([90, 90]);
  });

  it("links a layer into the adjacent slide and promotes it to a master", () => {
    let state = createDefaultProject();
    const [first, second] = getSlides(state);
    state = addLayer(state, first.id, shape("linked", 100));
    state = linkLayerToNextSlide(state, first.id, "linked");
    const linkedSlides = getSlides(state);
    expect(linkedSlides[0].layers?.[0].linkId).toBeTruthy();
    expect(linkedSlides[1].layers?.[0].linkId).toBe(linkedSlides[0].layers?.[0].linkId);
    state = promoteToMaster(state, second.id, linkedSlides[1].layers![0].id);
    expect(state.masterLayers).toHaveLength(1);
    expect(getSlides(state)[1].layers).toHaveLength(0);
    state = demoteMaster(state, state.masterLayers[0].id, second.id);
    expect(state.masterLayers).toHaveLength(0);
    expect(getSlides(state)[1].layers).toHaveLength(1);
  });

  it("propagates linked edits and preserves locked layer positions", () => {
    let state = createDefaultProject();
    const [first] = getSlides(state);
    state = addLayer(state, first.id, shape("linked", 100));
    state = linkLayerToNextSlide(state, first.id, "linked");
    state = patchLayer(state, first.id, "linked", { opacity: 0.4 });
    const [source, adjacent] = getSlides(state);
    expect(source.layers?.[0].opacity).toBe(0.4);
    expect(adjacent.layers?.[0].opacity).toBe(0.4);
    state = patchLayer(state, first.id, "linked", { locked: true });
    state = nudgeLayers(state, first.id, ["linked"], 50, 50);
    expect(getSlides(state)[0].layers?.[0].transform.x).toBe(100);
  });

  it("ungroups layers and removes empty group records", () => {
    let state = createDefaultProject();
    const slideId = getSlides(state)[0].id;
    state = addLayer(state, slideId, shape("a", 50));
    state = addLayer(state, slideId, shape("b", 300));
    state = groupLayers(state, slideId, ["a", "b"]);
    state = ungroupLayers(state, slideId, ["a", "b"]);
    expect(getSlides(state)[0].groups).toHaveLength(0);
    state = groupLayers(state, slideId, ["a", "b"]);
    state = removeLayers(state, slideId, ["a"]);
    expect(getSlides(state)[0].groups).toHaveLength(0);
  });
});

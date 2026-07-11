import { nid } from "./defaults";
import { getActiveVariant, getSlides, updateActiveVariant, updateSlides } from "./project-model";
import type {
  Device,
  ElementId,
  ElementTransform,
  LayerElementId,
  ProjectState,
  Slide,
  VisualLayer,
} from "./types";

export function toLayerElementId(id: string): LayerElementId {
  return `layer:${id}`;
}

export function fromLayerElementId(id: ElementId | string): string | null {
  return id.startsWith("layer:") ? id.slice("layer:".length) : null;
}

export function patchSlide(
  state: ProjectState,
  slideId: string,
  patch: Partial<Slide>,
  device: Device = state.device,
): ProjectState {
  return updateSlides(state, device, (slides) =>
    slides.map((slide) => slide.id === slideId ? { ...slide, ...patch } : slide),
  );
}

export function setSlides(state: ProjectState, slides: Slide[], device: Device = state.device) {
  return updateSlides(state, device, () => slides);
}

export function addSlide(state: ProjectState, slide: Slide, device: Device = state.device) {
  return updateSlides(state, device, (slides) => [...slides, slide]);
}

export function removeSlide(state: ProjectState, slideId: string, device: Device = state.device) {
  return updateSlides(state, device, (slides) => slides.filter((slide) => slide.id !== slideId));
}

export function duplicateSlide(
  state: ProjectState,
  slideId: string,
  device: Device = state.device,
): { state: ProjectState; slideId: string | null } {
  let copyId: string | null = null;
  const next = updateSlides(state, device, (slides) => {
    const index = slides.findIndex((slide) => slide.id === slideId);
    if (index < 0) return slides;
    copyId = nid();
    const copy = structuredClone(slides[index]);
    copy.id = copyId;
    copy.layers = (copy.layers || []).map((layer) => ({ ...layer, id: nid(), linkId: undefined }));
    copy.groups = [];
    return [...slides.slice(0, index + 1), copy, ...slides.slice(index + 1)];
  });
  return { state: next, slideId: copyId };
}

function mapLayer(
  state: ProjectState,
  slideId: string,
  layerId: string,
  update: (layer: VisualLayer) => VisualLayer,
  device: Device = state.device,
): ProjectState {
  let linkId: string | undefined;
  const firstPass = updateSlides(state, device, (slides) => slides.map((slide) => {
    if (slide.id !== slideId) return slide;
    return {
      ...slide,
      layers: (slide.layers || []).map((layer) => {
        if (layer.id !== layerId) return layer;
        linkId = layer.linkId;
        return update(layer);
      }),
    };
  }));
  if (!linkId) return firstPass;
  return updateActiveVariant(firstPass, (variant) => ({
    ...variant,
    slidesByDevice: Object.fromEntries(
      Object.entries(variant.slidesByDevice).map(([key, slides]) => [
        key,
        slides.map((slide) => ({
          ...slide,
          layers: (slide.layers || []).map((layer) =>
            layer.linkId === linkId && !(slide.id === slideId && layer.id === layerId)
              ? update(layer)
              : layer,
          ),
        })),
      ]),
    ) as typeof variant.slidesByDevice,
  }));
}

export function patchElementTransform(
  state: ProjectState,
  slideId: string,
  elementId: ElementId,
  transform: ElementTransform,
  device: Device = state.device,
): ProjectState {
  const layerId = fromLayerElementId(elementId);
  if (layerId) return mapLayer(state, slideId, layerId, (layer) => ({ ...layer, transform }), device);
  if (elementId.startsWith("text:")) {
    const legacyId = elementId.slice("text:".length);
    return updateSlides(state, device, (slides) => slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            textElements: (slide.textElements || []).map((element) =>
              element.id === legacyId ? { ...element, transform } : element,
            ),
          }
        : slide,
    ));
  }
  return updateSlides(state, device, (slides) => slides.map((slide) =>
    slide.id === slideId
      ? { ...slide, transforms: { ...(slide.transforms || {}), [elementId]: transform } }
      : slide,
  ));
}

export function patchLayer(
  state: ProjectState,
  slideId: string,
  layerId: string,
  patch: Partial<VisualLayer>,
  device: Device = state.device,
): ProjectState {
  const slide = getSlides(state, device).find((item) => item.id === slideId);
  const source = slide?.layers?.find((layer) => layer.id === layerId);
  const next = mapLayer(state, slideId, layerId, (layer) => ({ ...layer, ...patch } as VisualLayer), device);
  if (!patch.transform || !source?.groupId) return next;
  const dx = patch.transform.x - source.transform.x;
  const dy = patch.transform.y - source.transform.y;
  if (!dx && !dy) return next;
  return updateSlides(next, device, (slides) => slides.map((item) => item.id === slideId
    ? {
        ...item,
        layers: (item.layers || []).map((layer) =>
          layer.id !== layerId && layer.groupId === source.groupId && !layer.locked
            ? { ...layer, transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy } }
            : layer,
        ),
      }
    : item));
}

export function addLayer(
  state: ProjectState,
  slideId: string,
  layer: VisualLayer,
  device: Device = state.device,
): ProjectState {
  return updateSlides(state, device, (slides) => slides.map((slide) =>
    slide.id === slideId ? { ...slide, layers: [...(slide.layers || []), layer] } : slide,
  ));
}

export function removeLayers(
  state: ProjectState,
  slideId: string,
  layerIds: string[],
  device: Device = state.device,
): ProjectState {
  const ids = new Set(layerIds);
  return updateSlides(state, device, (slides) => slides.map((slide) => {
    if (slide.id !== slideId) return slide;
    return {
      ...slide,
      layers: (slide.layers || []).filter((layer) => !ids.has(layer.id)),
      groups: (slide.groups || []).flatMap((group) => {
        const remaining = group.layerIds.filter((id) => !ids.has(id));
        return remaining.length > 1 ? [{ ...group, layerIds: remaining }] : [];
      }),
    };
  }));
}

export function groupLayers(
  state: ProjectState,
  slideId: string,
  layerIds: string[],
  device: Device = state.device,
): ProjectState {
  const ids = [...new Set(layerIds)];
  if (ids.length < 2) return state;
  const groupId = `group-${nid()}`;
  return updateSlides(state, device, (slides) => slides.map((slide) => {
    if (slide.id !== slideId) return slide;
    return {
      ...slide,
      layers: (slide.layers || []).map((layer) => ids.includes(layer.id) ? { ...layer, groupId } : layer),
      groups: [...(slide.groups || []), { id: groupId, name: `Group ${(slide.groups || []).length + 1}`, layerIds: ids }],
    };
  }));
}

export function ungroupLayers(
  state: ProjectState,
  slideId: string,
  layerIds: string[],
  device: Device = state.device,
): ProjectState {
  const ids = new Set(layerIds);
  return updateSlides(state, device, (slides) => slides.map((slide) => {
    if (slide.id !== slideId) return slide;
    const groupIds = new Set((slide.layers || []).filter((layer) => ids.has(layer.id)).map((layer) => layer.groupId).filter(Boolean));
    return {
      ...slide,
      layers: (slide.layers || []).map((layer) => ids.has(layer.id) ? { ...layer, groupId: undefined } : layer),
      groups: (slide.groups || []).filter((group) => !groupIds.has(group.id)),
    };
  }));
}

export function nudgeLayers(
  state: ProjectState,
  slideId: string,
  layerIds: string[],
  dx: number,
  dy: number,
  device: Device = state.device,
): ProjectState {
  const slide = getSlides(state, device).find((item) => item.id === slideId);
  const selected = new Set(layerIds);
  const selectedGroupIds = new Set((slide?.layers || []).filter((layer) => selected.has(layer.id) && layer.groupId).map((layer) => layer.groupId));
  const ids = new Set((slide?.layers || []).filter((layer) => selected.has(layer.id) || (layer.groupId && selectedGroupIds.has(layer.groupId))).map((layer) => layer.id));
  return updateSlides(state, device, (slides) => slides.map((slide) =>
    slide.id === slideId
      ? {
          ...slide,
          layers: (slide.layers || []).map((layer) => ids.has(layer.id) && !layer.locked
            ? { ...layer, transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy } }
            : layer),
        }
      : slide,
  ));
}

export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignLayers(
  state: ProjectState,
  slideId: string,
  layerIds: string[],
  alignment: Alignment,
  device: Device = state.device,
): ProjectState {
  const slides = getSlides(state, device);
  const slide = slides.find((item) => item.id === slideId);
  const selected = (slide?.layers || []).filter((layer) => layerIds.includes(layer.id) && !layer.locked);
  if (selected.length < 2) return state;
  const left = Math.min(...selected.map((layer) => layer.transform.x));
  const right = Math.max(...selected.map((layer) => layer.transform.x + layer.transform.width));
  const top = Math.min(...selected.map((layer) => layer.transform.y));
  const bottom = Math.max(...selected.map((layer) => layer.transform.y + layer.transform.height));
  const ids = new Set(layerIds);
  return updateSlides(state, device, (allSlides) => allSlides.map((item) =>
    item.id === slideId
      ? {
          ...item,
          layers: (item.layers || []).map((layer) => {
            if (!ids.has(layer.id) || layer.locked) return layer;
            const transform = { ...layer.transform };
            if (alignment === "left") transform.x = left;
            if (alignment === "center") transform.x = (left + right - transform.width) / 2;
            if (alignment === "right") transform.x = right - transform.width;
            if (alignment === "top") transform.y = top;
            if (alignment === "middle") transform.y = (top + bottom - transform.height) / 2;
            if (alignment === "bottom") transform.y = bottom - transform.height;
            return { ...layer, transform };
          }),
        }
      : item,
  ));
}

export function linkLayerToNextSlide(
  state: ProjectState,
  slideId: string,
  layerId: string,
  device: Device = state.device,
): ProjectState {
  const slides = getSlides(state, device);
  const index = slides.findIndex((slide) => slide.id === slideId);
  if (index < 0 || index >= slides.length - 1) return state;
  const source = (slides[index].layers || []).find((layer) => layer.id === layerId);
  if (!source) return state;
  const linkId = source.linkId || `link-${nid()}`;
  const copy = { ...structuredClone(source), id: nid(), linkId };
  return updateSlides(state, device, (allSlides) => allSlides.map((slide, slideIndex) => {
    if (slideIndex === index) {
      return { ...slide, layers: (slide.layers || []).map((layer) => layer.id === layerId ? { ...layer, linkId } : layer) };
    }
    if (slideIndex === index + 1) {
      return { ...slide, layers: [...(slide.layers || []), copy] };
    }
    return slide;
  }));
}

export function promoteToMaster(
  state: ProjectState,
  slideId: string,
  layerId: string,
  device: Device = state.device,
): ProjectState {
  const source = getSlides(state, device)
    .find((slide) => slide.id === slideId)?.layers?.find((layer) => layer.id === layerId);
  if (!source) return state;
  const withoutLayer = removeLayers(state, slideId, [layerId], device);
  return { ...withoutLayer, masterLayers: [...withoutLayer.masterLayers, { ...source, devices: [device] }] };
}

export function demoteMaster(
  state: ProjectState,
  layerId: string,
  slideId: string,
  device: Device = state.device,
): ProjectState {
  const source = state.masterLayers.find((layer) => layer.id === layerId);
  if (!source) return state;
  const { devices: _devices, ...layer } = source;
  return addLayer(
    { ...state, masterLayers: state.masterLayers.filter((item) => item.id !== layerId) },
    slideId,
    { ...layer, id: nid() } as VisualLayer,
    device,
  );
}

export function getVariantDecks(state: ProjectState) {
  return getActiveVariant(state).slidesByDevice;
}

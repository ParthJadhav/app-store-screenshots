// Edits to a deck, as pure project → project functions. The editor
// passes them to useProject's setState, which records undo history.
import { nid } from "./defaults";
import { imageElementKey, isBuiltInElementId, isImageElementId, isTextElementId, textElementKey } from "./elements";
import type { Device, ElementId, ElementTransform, ImageElement, ProjectState, Slide } from "./types";

/** Replace one deck's screens. */
export function updateDeck(state: ProjectState, device: Device, update: (slides: Slide[]) => Slide[]): ProjectState {
  return {
    ...state,
    slidesByDevice: { ...state.slidesByDevice, [device]: update(state.slidesByDevice[device] || []) },
  };
}

/** Merge `update(slide)` into one screen of the open deck. */
export function updateSlide(state: ProjectState, id: string, update: (slide: Slide) => Partial<Slide>): ProjectState {
  return updateDeck(state, state.device, (slides) =>
    slides.map((slide) => (slide.id === id ? { ...slide, ...update(slide) } : slide)),
  );
}

/** A screen with one element moved, resized, rotated or restacked. */
export function withElementTransform(slide: Slide, id: ElementId, transform: ElementTransform): Slide {
  if (isTextElementId(id)) {
    const key = textElementKey(id);
    return {
      ...slide,
      textElements: (slide.textElements || []).map((element) => (element.id === key ? { ...element, transform } : element)),
    };
  }
  if (isImageElementId(id)) {
    const key = imageElementKey(id);
    return {
      ...slide,
      imageElements: (slide.imageElements || []).map((element) => (element.id === key ? { ...element, transform } : element)),
    };
  }
  if (!isBuiltInElementId(id)) return slide;
  return { ...slide, transforms: { ...(slide.transforms || {}), [id]: transform } };
}

/** A deep copy of a screen with fresh ids for it and its elements. */
export function copySlide(slide: Slide): Slide {
  return {
    ...slide,
    id: nid(),
    label: { ...slide.label },
    headline: { ...slide.headline },
    transforms: slide.transforms
      ? Object.fromEntries(Object.entries(slide.transforms).map(([key, value]) => [key, { ...value }]))
      : undefined,
    textElements: slide.textElements?.map((element) => ({
      ...element,
      id: nid(),
      text: { ...element.text },
      transform: { ...element.transform },
    })),
    imageElements: slide.imageElements?.map((element): ImageElement => ({
      ...element,
      id: nid(),
      transform: { ...element.transform },
    })),
  };
}

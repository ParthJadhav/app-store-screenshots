import type { Device, DeviceDecks, ProjectState, ProjectVariant, Slide } from "./types";

export function getActiveVariant(state: ProjectState): ProjectVariant {
  return state.variants.find((variant) => variant.id === state.activeVariantId) || state.variants[0];
}

export function getSlides(state: ProjectState, device: Device = state.device): Slide[] {
  return getActiveVariant(state).slidesByDevice[device] || [];
}

export function updateVariant(
  state: ProjectState,
  variantId: string,
  update: (variant: ProjectVariant) => ProjectVariant,
): ProjectState {
  return {
    ...state,
    variants: state.variants.map((variant) =>
      variant.id === variantId ? update(variant) : variant,
    ),
  };
}

export function updateActiveVariant(
  state: ProjectState,
  update: (variant: ProjectVariant) => ProjectVariant,
): ProjectState {
  return updateVariant(state, getActiveVariant(state).id, update);
}

export function updateSlides(
  state: ProjectState,
  device: Device,
  update: (slides: Slide[]) => Slide[],
): ProjectState {
  return updateActiveVariant(state, (variant) => ({
    ...variant,
    slidesByDevice: {
      ...variant.slidesByDevice,
      [device]: update(variant.slidesByDevice[device] || []),
    },
  }));
}

export function cloneDecks(decks: DeviceDecks): DeviceDecks {
  return structuredClone(decks);
}

export function addVariant(state: ProjectState, name: string): ProjectState {
  const source = getActiveVariant(state);
  const id = `variant-${Date.now().toString(36)}`;
  return {
    ...state,
    activeVariantId: id,
    variants: [...state.variants, { id, name: name.trim() || "Variant", slidesByDevice: cloneDecks(source.slidesByDevice) }],
  };
}

export function renameVariant(state: ProjectState, variantId: string, name: string): ProjectState {
  return updateVariant(state, variantId, (variant) => ({
    ...variant,
    name: name.trim() || variant.name,
  }));
}

export function removeVariant(state: ProjectState, variantId: string): ProjectState {
  if (state.variants.length <= 1) return state;
  const variants = state.variants.filter((variant) => variant.id !== variantId);
  return {
    ...state,
    variants,
    activeVariantId:
      state.activeVariantId === variantId ? variants[0].id : state.activeVariantId,
  };
}

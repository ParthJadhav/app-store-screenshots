import type { ImageElement } from "@/lib/types";

export function createImageMask(fade: ImageElement["fade"]): string | undefined {
  if (!fade || fade.amount <= 0) return undefined;

  const amount = Math.max(1, Math.min(100, fade.amount));

  const direction = {
    top: "to bottom",
    bottom: "to top",
    left: "to right",
    right: "to left",
  }[fade.edge];
  const transparentEdge = amount * 0.25;
  const solidOppositeEdge = amount * 0.75;

  return `linear-gradient(${direction}, transparent 0%, transparent ${transparentEdge}%, #000 ${solidOppositeEdge}%, #000 100%)`;
}

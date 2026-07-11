import type { CanvasSettings, ElementTransform } from "./types";

export type CanvasBounds = { width: number; height: number };
export type Guide = { axis: "x" | "y"; value: number; kind: "edge" | "center" | "safe" | "element" };

export function safeAreaRect(bounds: CanvasBounds, percent: number) {
  const x = bounds.width * (percent / 100);
  const y = bounds.height * (percent / 100);
  return { x, y, width: bounds.width - x * 2, height: bounds.height - y * 2 };
}

function nearest(value: number, candidates: number[], threshold: number) {
  let best = value;
  let distance = threshold + 1;
  for (const candidate of candidates) {
    const current = Math.abs(value - candidate);
    if (current <= threshold && current < distance) {
      best = candidate;
      distance = current;
    }
  }
  return { value: best, snapped: distance <= threshold };
}

export function snapTransform(
  transform: ElementTransform,
  bounds: CanvasBounds,
  settings: CanvasSettings,
  others: ElementTransform[] = [],
): { transform: ElementTransform; guides: Guide[] } {
  if (!settings.snapping) return { transform, guides: [] };
  const grid = Math.max(1, settings.snapSize);
  const threshold = Math.max(4, Math.min(18, grid));
  const safe = safeAreaRect(bounds, settings.safeAreaPercent);
  const xCandidates = [0, safe.x, bounds.width / 2, safe.x + safe.width, bounds.width];
  const yCandidates = [0, safe.y, bounds.height / 2, safe.y + safe.height, bounds.height];
  for (const other of others) {
    xCandidates.push(other.x, other.x + other.width / 2, other.x + other.width);
    yCandidates.push(other.y, other.y + other.height / 2, other.y + other.height);
  }

  const left = nearest(transform.x, xCandidates, threshold);
  const centerX = nearest(transform.x + transform.width / 2, xCandidates, threshold);
  const right = nearest(transform.x + transform.width, xCandidates, threshold);
  const top = nearest(transform.y, yCandidates, threshold);
  const centerY = nearest(transform.y + transform.height / 2, yCandidates, threshold);
  const bottom = nearest(transform.y + transform.height, yCandidates, threshold);

  let x = Math.round(transform.x / grid) * grid;
  let y = Math.round(transform.y / grid) * grid;
  let guideX: number | null = null;
  let guideY: number | null = null;
  if (left.snapped) { x = left.value; guideX = left.value; }
  else if (centerX.snapped) { x = centerX.value - transform.width / 2; guideX = centerX.value; }
  else if (right.snapped) { x = right.value - transform.width; guideX = right.value; }
  if (top.snapped) { y = top.value; guideY = top.value; }
  else if (centerY.snapped) { y = centerY.value - transform.height / 2; guideY = centerY.value; }
  else if (bottom.snapped) { y = bottom.value - transform.height; guideY = bottom.value; }

  return {
    transform: { ...transform, x, y },
    guides: [
      ...(guideX == null ? [] : [{ axis: "x" as const, value: guideX, kind: "element" as const }]),
      ...(guideY == null ? [] : [{ axis: "y" as const, value: guideY, kind: "element" as const }]),
    ],
  };
}

export function intersectsSafeArea(
  transform: ElementTransform,
  bounds: CanvasBounds,
  percent: number,
): boolean {
  const safe = safeAreaRect(bounds, percent);
  return (
    transform.x >= safe.x &&
    transform.y >= safe.y &&
    transform.x + transform.width <= safe.x + safe.width &&
    transform.y + transform.height <= safe.y + safe.height
  );
}

"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { Rnd } from "react-rnd";
import { snapTransform } from "@/lib/canvas-geometry";
import type { CanvasSettings, ElementTransform } from "@/lib/types";
import type { CanvasRect } from "./layout-geometry";

const MIN_VISIBLE_FRACTION = 0.1;

function clamp(rect: CanvasRect, width: number, height: number, overflow: boolean) {
  if (overflow) {
    const minX = Math.max(8, rect.width * MIN_VISIBLE_FRACTION);
    const minY = Math.max(8, rect.height * MIN_VISIBLE_FRACTION);
    return {
      ...rect,
      x: Math.max(-(rect.width - minX), Math.min(rect.x, width - minX)),
      y: Math.max(-(rect.height - minY), Math.min(rect.y, height - minY)),
    };
  }
  const nextWidth = Math.min(rect.width, width);
  const nextHeight = Math.min(rect.height, height);
  return {
    x: Math.max(0, Math.min(rect.x, width - nextWidth)),
    y: Math.max(0, Math.min(rect.y, height - nextHeight)),
    width: nextWidth,
    height: nextHeight,
  };
}

export function Movable({
  rect,
  boundsWidth,
  boundsHeight,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  locked = false,
  hidden = false,
  canvasSettings,
  otherTransforms = [],
  onSelect,
}: {
  rect: CanvasRect;
  boundsWidth: number;
  boundsHeight: number;
  editable?: boolean;
  previewScale: number;
  onChange: (transform: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  locked?: boolean;
  hidden?: boolean;
  canvasSettings?: CanvasSettings;
  otherTransforms?: ElementTransform[];
  onSelect?: (additive: boolean) => void;
}) {
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  const display = clamp(rect, boundsWidth, boundsHeight, allowOverflow);

  const commit = React.useCallback((next: ElementTransform) => {
    const snapped = canvasSettings
      ? snapTransform(next, { width: boundsWidth, height: boundsHeight }, canvasSettings, otherTransforms).transform
      : next;
    onChange(snapped);
  }, [boundsHeight, boundsWidth, canvasSettings, onChange, otherTransforms]);

  if (hidden) return null;

  const content = (
    <div
      onMouseDown={(event) => editable && onSelect?.(event.shiftKey || event.metaKey || event.ctrlKey)}
      style={{ width: "100%", height: "100%", transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: "center" }}
    >
      {children}
    </div>
  );

  if (!editable) {
    return <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex }}>{content}</div>;
  }

  function startRotate(event: React.PointerEvent<HTMLButtonElement>) {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(event.shiftKey || event.metaKey || event.ctrlKey);
    event.currentTarget.setPointerCapture(event.pointerId);
    const root = event.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const start = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI;
    const initial = rotationRef.current;
    const move = (pointer: PointerEvent) => {
      const angle = Math.atan2(pointer.clientY - centerY, pointer.clientX - centerX) * 180 / Math.PI;
      let next = initial + angle - start;
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      rotationRef.current = Math.round(next);
      commit({ ...display, rotation: rotationRef.current, zIndex });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  }

  const scale = Math.max(0.05, previewScale);
  const additiveFrom = (event: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) =>
    !!(event.shiftKey || event.metaKey || event.ctrlKey);
  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      disableDragging={locked}
      enableResizing={!locked}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={(event) => onSelect?.(additiveFrom(event))}
      onResizeStart={(event) => onSelect?.(additiveFrom(event))}
      onDragStop={(_event, data) => commit({ ...display, x: data.x, y: data.y, rotation, zIndex })}
      onResizeStop={(_event, _direction, ref, _delta, position) => commit({
        x: position.x,
        y: position.y,
        width: parseFloat(ref.style.width),
        height: parseFloat(ref.style.height),
        rotation,
        zIndex,
      })}
      style={{ zIndex, opacity: locked ? 0.92 : 1 }}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {content}
      {!locked && (
        <button
          type="button"
          className="rnd-rotate-handle"
          style={{ right: -14 / scale, top: -14 / scale, width: 28 / scale, height: 28 / scale }}
          onPointerDown={startRotate}
          aria-label="Rotate element"
        >
          <RotateCw style={{ width: 14 / scale, height: 14 / scale }} />
        </button>
      )}
    </Rnd>
  );
}

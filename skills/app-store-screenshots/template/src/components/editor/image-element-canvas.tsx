"use client";
import * as React from "react";
import { ImagePlus } from "lucide-react";
import { Rnd } from "react-rnd";
import { createImageMask } from "@/components/editor/create-image-mask";
import { img } from "@/lib/image-cache";
import type { ElementTransform, ImageElement } from "@/lib/types";

type Props = {
  element: ImageElement;
  rect: ElementTransform;
  editable?: boolean;
  previewScale: number;
  selected: boolean;
  allowOverflow: boolean;
  onChange: (transform: ElementTransform) => void;
  onSelect: () => void;
};

export function ImageElementCanvas({
  element,
  rect,
  editable,
  previewScale,
  selected,
  allowOverflow,
  onChange,
  onSelect,
}: Props) {
  const rotation = rect.rotation ?? 0;
  const zIndex = rect.zIndex ?? 5;
  const source = img(element.src);
  const maskImage = createImageMask(element.fade);

  return (
    <Rnd
      size={{ width: rect.width, height: rect.height }}
      position={{ x: rect.x, y: rect.y }}
      scale={previewScale}
      bounds={allowOverflow ? undefined : "parent"}
      disableDragging={!editable}
      enableResizing={editable}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDragStop={(_, position) => onChange({ ...rect, x: position.x, y: position.y, rotation, zIndex })}
      onResizeStop={(_, __, ref, ___, position) =>
        onChange({
          ...rect,
          x: position.x,
          y: position.y,
          width: Math.max(1, ref.offsetWidth),
          height: Math.max(1, ref.offsetHeight),
          rotation,
          zIndex,
        })
      }
      className={editable ? `rnd-editable${selected ? " rnd-selected" : ""}` : ""}
      style={{ zIndex }}
    >
      <div style={{ width: "100%", height: "100%", transform: `rotate(${rotation}deg)` }}>
        {source ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: element.fit || "cover",
              maskImage,
              WebkitMaskImage: maskImage,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-dashed border-current/40 bg-black/10 text-current/70">
            <ImagePlus className="h-6 w-6" aria-hidden />
            <span className="sr-only">Pick an image in the inspector</span>
          </div>
        )}
        </div>
    </Rnd>
  );
}

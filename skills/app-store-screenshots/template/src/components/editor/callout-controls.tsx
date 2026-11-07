"use client";
import * as React from "react";
import { Circle, Search, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { img } from "@/lib/image-cache";
import { resolveScreenshot } from "@/lib/locale";
import { CALLOUT_ZOOM_MAX, CALLOUT_ZOOM_MIN, DEFAULT_CALLOUT } from "@/lib/scene";
import { cn } from "@/lib/utils";
import type { Callout, Device, ElementId, Orientation, Slide } from "@/lib/types";
import { SCREEN_WIDTH_FRACTION, getElementTransform } from "@/lib/layouts";

/** Inspector section for the per-screen magnified callout ("Magnifier"). */
export function CalloutControls({
  slide,
  device,
  orientation,
  locale,
  available,
  onChange,
  onSelectElement,
}: {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  locale: string;
  available: boolean;
  onChange: (patch: Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
}) {
  const callout = slide.callout;
  const screenshot = img(resolveScreenshot(slide.screenshot, locale));

  function patch(next: Partial<Callout>) {
    if (!callout) return;
    const merged = { ...callout, ...next };
    const saved = slide.transforms?.callout;
    // A circle is always round: square up a frame that was stretched as a rounded rect.
    if (next.shape === "circle" && saved && saved.width !== saved.height) {
      const size = Math.min(saved.width, saved.height);
      onChange({ callout: merged, transforms: { ...slide.transforms, callout: { ...saved, width: size, height: size } } });
      return;
    }
    onChange({ callout: merged });
  }

  if (!available) return null;

  // Share of the screenshot's width the lens actually shows, for the picker ring.
  const lensW = getElementTransform(slide, device, orientation, "callout")?.width;
  const deviceW = getElementTransform(slide, device, orientation, "device")?.width;
  const coverage = callout && lensW && deviceW ? Math.min(1, lensW / (deviceW * SCREEN_WIDTH_FRACTION * callout.zoom)) : 0.3;

  if (!callout) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
        <div className="min-w-0">
          <Label className="text-xs font-semibold">Magnifier</Label>
          <p className="text-[11px] text-muted-foreground">Zoom into one detail of the screenshot.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => {
            onChange({ callout: { ...DEFAULT_CALLOUT } });
            onSelectElement("callout");
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold">Magnifier</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:text-destructive"
          aria-label="Remove magnifier"
          title="Remove magnifier"
          onClick={() => {
            const { callout: _removed, ...rest } = slide.transforms || {};
            onChange({ callout: undefined, transforms: Object.keys(rest).length ? rest : undefined });
            onSelectElement(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <FocusPicker
        src={screenshot}
        x={callout.focusX}
        y={callout.focusY}
        coverage={coverage}
        round={callout.shape === "circle"}
        onChange={(focusX, focusY) => patch({ focusX, focusY })}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Zoom</Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">{callout.zoom.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={CALLOUT_ZOOM_MIN}
          max={CALLOUT_ZOOM_MAX}
          step={0.1}
          value={callout.zoom}
          onChange={(e) => patch({ zoom: Number(e.target.value) })}
          className="w-full"
          aria-label="Magnifier zoom"
          aria-valuetext={`${callout.zoom.toFixed(1)} times`}
        />
      </div>

      <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Magnifier shape">
        {(["circle", "rounded"] as const).map((shape) => (
          <Button
            key={shape}
            type="button"
            role="radio"
            aria-checked={callout.shape === shape}
            variant={callout.shape === shape ? "secondary" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => patch({ shape })}
          >
            {shape === "circle" ? <Circle className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {shape === "circle" ? "Circle" : "Rounded"}
          </Button>
        ))}
      </div>
    </div>
  );
}

const KEY_STEP = 0.02;

function FocusPicker({
  src,
  x,
  y,
  coverage,
  round,
  onChange,
}: {
  src: string;
  x: number;
  y: number;
  coverage: number;
  round: boolean;
  onChange: (x: number, y: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  function fromPointer(e: React.PointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return;
    onChange(
      Math.round(clamp((e.clientX - box.left) / box.width) * 1000) / 1000,
      Math.round(clamp((e.clientY - box.top) / box.height) * 1000) / 1000,
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">Focus — click or drag on the screenshot</Label>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Magnifier focus"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(y * 100)}
        aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
        className={cn(
          "relative mx-auto w-24 cursor-crosshair touch-none select-none overflow-hidden rounded-md border bg-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !src && "aspect-[9/19.5]",
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? KEY_STEP * 5 : KEY_STEP;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = moves[e.key];
          if (!move) return;
          e.preventDefault();
          e.stopPropagation();
          onChange(clamp(x + move[0]), clamp(y + move[1]));
        }}
      >
        {src ? (
          <img src={src} alt="" draggable={false} className="block w-full" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-neutral-400">
            Add a screenshot first
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_0_0_999px_rgba(0,0,0,0.35)]",
            round ? "rounded-full" : "rounded-[14%]",
          )}
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${coverage * 100}%` }}
        />
      </div>
    </div>
  );
}

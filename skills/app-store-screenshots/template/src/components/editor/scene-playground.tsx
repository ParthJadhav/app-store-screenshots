"use client";
import * as React from "react";
import { Dices, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDarkColor } from "@/lib/contrast";
import { BACKDROPS, DECORATIONS, DEFAULT_SCENE, SCENE_RANGES, sameScene, sceneOf } from "@/lib/scene";
import { DIRECTIONS, generateLook } from "@/lib/style-lab";
import { cn } from "@/lib/utils";
import type { Scene, Theme } from "@/lib/types";
import { SceneBackdrop } from "./scene-layers";

const TILE_W = 72;
const TILE_H = 48;

/** Toolbar popover that edits the deck-wide scene live on the canvas. */
export function ScenePlayground({
  scene: rawScene,
  theme,
  disabled,
  straightDevices,
  onChange,
}: {
  scene: Scene | undefined;
  theme: Theme;
  disabled?: boolean;
  /** The open deck's devices ignore tilt (iPhone Duo). */
  straightDevices?: boolean;
  onChange: (scene: Scene | undefined) => void;
}) {
  const scene = sceneOf(rawScene);
  const classic = sameScene(scene, DEFAULT_SCENE);
  const surprises = React.useRef(0);

  function patch(next: Partial<Scene>) {
    const merged = { ...scene, ...next };
    onChange(sameScene(merged, DEFAULT_SCENE) ? undefined : merged);
  }

  function surprise() {
    surprises.current += 1;
    const seed = Math.floor(Math.random() * 1e6) + surprises.current;
    const direction = DIRECTIONS[seed % DIRECTIONS.length];
    const next = generateLook(direction.id, seed).scene;
    // Surprise the stage, not the copy: headline styling stays as set.
    patch({
      backdrop: next.backdrop,
      span: next.span,
      decoration: next.decoration,
      shadow: next.shadow,
      glow: next.glow,
      tilt: next.tilt,
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={classic ? "outline" : "secondary"}
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={disabled}
          title="Scene: backdrop, decoration, depth and headline style for every screen"
        >
          <Layers className="h-3.5 w-3.5" />
          Scene
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[min(80vh,640px)] w-[22rem] overflow-y-auto" aria-label="Scene">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Scene</h2>
            <p className="text-[11px] text-muted-foreground">Applies to every screen in this project.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={surprise}>
              <Dices className="h-3.5 w-3.5" />
              Surprise me
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(undefined)}
              disabled={classic}
              title="Back to the classic scene"
              aria-label="Reset scene"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Section title="Backdrop">
          <TileGroup label="Backdrop">
            {BACKDROPS.map((b) => (
              <Tile key={b.id} name={b.name} checked={scene.backdrop === b.id} onSelect={() => patch({ backdrop: b.id })}>
                <Swatch theme={theme} scene={{ ...scene, backdrop: b.id, decoration: "none", span: false }} />
              </Tile>
            ))}
          </TileGroup>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={scene.span}
              onChange={(e) => patch({ span: e.target.checked })}
            />
            <span>
              <span className="font-medium">Flow across screens</span>
              <span className="block text-[11px] text-muted-foreground">
                One continuous backdrop over the whole strip, so shapes cross the seams.
              </span>
            </span>
          </label>
        </Section>

        <Section title="Decoration">
          <TileGroup label="Decoration">
            {DECORATIONS.map((d) => (
              <Tile key={d.id} name={d.name} checked={scene.decoration === d.id} onSelect={() => patch({ decoration: d.id })}>
                <Swatch theme={theme} scene={{ ...scene, backdrop: "solid", decoration: d.id, span: false }} />
              </Tile>
            ))}
          </TileGroup>
        </Section>

        <Section title="Device depth">
          <Slider label="Shadow" value={scene.shadow} {...SCENE_RANGES.shadow} unit="%" onChange={(shadow) => patch({ shadow })} reset={DEFAULT_SCENE.shadow} />
          <Slider label="Glow" value={scene.glow} {...SCENE_RANGES.glow} unit="%" onChange={(glow) => patch({ glow })} reset={DEFAULT_SCENE.glow} />
          <Slider label="Tilt" value={scene.tilt} {...SCENE_RANGES.tilt} unit="°" onChange={(tilt) => patch({ tilt })} reset={DEFAULT_SCENE.tilt} />
          {straightDevices && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              iPhone Duo frames stay straight: Apple's guidelines ask for straight-on product images.
            </p>
          )}
        </Section>

        <Section title="Headline">
          <Slider
            label="Weight"
            value={scene.headlineWeight}
            {...SCENE_RANGES.headlineWeight}
            onChange={(headlineWeight) => patch({ headlineWeight })}
            reset={DEFAULT_SCENE.headlineWeight}
          />
          <Slider
            label="Size"
            value={Math.round(scene.headlineScale * 100)}
            min={SCENE_RANGES.headlineScale.min * 100}
            max={SCENE_RANGES.headlineScale.max * 100}
            step={SCENE_RANGES.headlineScale.step * 100}
            unit="%"
            onChange={(pct) => patch({ headlineScale: pct / 100 })}
            reset={DEFAULT_SCENE.headlineScale * 100}
          />
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              label="Case"
              value={scene.headlineCase}
              options={[
                { id: "as-typed", name: "As typed" },
                { id: "upper", name: "UPPER" },
              ]}
              onChange={(headlineCase) => patch({ headlineCase })}
            />
            <Segmented
              label="Align"
              value={scene.captionAlign}
              options={[
                { id: "auto", name: "Auto" },
                { id: "left", name: "Left" },
                { id: "center", name: "Center" },
              ]}
              onChange={(captionAlign) => patch({ captionAlign })}
            />
          </div>
        </Section>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0 [&+&]:mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function TileGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-1.5">
      {children}
    </div>
  );
}

function Tile({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={name}
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-md p-1 text-[10px] outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        checked && "bg-accent",
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded ring-1 ring-black/10",
          checked && "ring-2 ring-primary",
        )}
        style={{ width: TILE_W, height: TILE_H }}
      >
        {children}
      </span>
      <span className={cn("text-muted-foreground", checked && "font-medium text-foreground")}>{name}</span>
    </button>
  );
}

// A real backdrop rendered at tile size, in the deck's own theme colours.
function Swatch({ theme, scene }: { theme: Theme; scene: Scene }) {
  return (
    <SceneBackdrop
      scene={scene}
      theme={theme}
      cW={TILE_W}
      cH={TILE_H}
      index={0}
      count={1}
      base={theme.bg}
      fg={theme.fg}
      accent={theme.accent}
      dark={isDarkColor(theme.bg)}
      inverted={false}
    />
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  reset = 0,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  reset?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(reset)}
        className="w-full"
        aria-label={label}
        aria-valuetext={`${value}${unit}`}
        title="Double-click to reset"
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div role="radiogroup" aria-label={label} className="flex rounded-md border p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex-1 rounded px-1.5 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.id ? "bg-secondary font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

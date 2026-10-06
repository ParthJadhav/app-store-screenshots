"use client";
import * as React from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cleanHexColor } from "@/lib/clean-hex-color";
import { THEME_COLOR_LABEL, themeById } from "@/lib/constants";
import type { ThemeColorKey, ThemeColors } from "@/lib/types";

const KEYS = Object.keys(THEME_COLOR_LABEL) as ThemeColorKey[];

/** Toolbar popover that edits the active theme's colors for this project only. */
export function ThemeColorsEditor({
  themeId,
  themeColors,
  onChange,
  disabled,
}: {
  themeId: string;
  themeColors: ThemeColors | undefined;
  onChange: (next: ThemeColors | undefined) => void;
  disabled?: boolean;
}) {
  const base = themeById(themeId);
  const edits = themeColors?.[base.id] ?? {};
  const edited = Object.keys(edits).length > 0;
  const baseColor = (key: ThemeColorKey) => (key === "accentAlt" ? base.accentAlt ?? base.accent : base[key]);

  function write(nextEdits: Partial<Record<ThemeColorKey, string>>) {
    const rest = { ...themeColors };
    if (Object.keys(nextEdits).length) rest[base.id] = nextEdits;
    else delete rest[base.id];
    onChange(Object.keys(rest).length ? rest : undefined);
  }

  function setColor(key: ThemeColorKey, color: string) {
    const { [key]: _old, ...others } = edits;
    write(color.toUpperCase() === baseColor(key).toUpperCase() ? others : { ...others, [key]: color });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={edited ? "secondary" : "outline"}
          size="icon"
          className="h-8 w-8"
          disabled={disabled}
          title={`Edit ${base.name} colors for this project`}
          aria-label="Theme colors"
        >
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" aria-label="Theme colors">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{base.name} colors</h2>
            <p className="text-[11px] text-muted-foreground">Saved with this project. Other themes keep their own edits.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={!edited}
            onClick={() => write({})}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset colors
          </Button>
        </div>
        <div className="space-y-2">
          {KEYS.map((key) => (
            <ColorRow
              key={key}
              label={THEME_COLOR_LABEL[key]}
              value={edits[key] ?? baseColor(key)}
              edited={!!edits[key]}
              onChange={(color) => setColor(key, color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorRow({
  label,
  value,
  edited,
  onChange,
}: {
  label: string;
  value: string;
  edited: boolean;
  onChange: (color: string) => void;
}) {
  const color = cleanHexColor(value) ?? "#FFFFFF";
  // Partial hex input stays local until it is a full color.
  const [draft, setDraft] = React.useState(color);
  React.useEffect(() => setDraft(color), [color]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
        aria-label={`${label} color`}
      />
      <span className="min-w-0 flex-1 truncate text-xs">
        {label}
        {edited && <span className="ml-1 text-[10px] text-muted-foreground">· edited</span>}
      </span>
      <Input
        value={draft}
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setDraft(next);
          const clean = cleanHexColor(next);
          if (clean) onChange(clean);
        }}
        onBlur={() => setDraft(color)}
        className="h-7 w-24 font-mono text-xs uppercase"
        aria-label={`${label} hex color`}
      />
    </div>
  );
}

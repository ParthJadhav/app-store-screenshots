"use client";

import * as React from "react";
import { Type, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TextStyleConfig } from "@/lib/types";

type Props = {
  title: string;
  defaultColorLabel?: string;
  styleConfig: TextStyleConfig | undefined;
  onChange: (patch: TextStyleConfig | undefined) => void;
};

export const FONT_OPTIONS = [
  { value: "default", label: "Varsayılan (Default)" },
  { value: "'Inter', sans-serif", label: "Inter (Modern Sans)" },
  { value: "'Outfit', sans-serif", label: "Outfit (Geometric)" },
  { value: "'Montserrat', sans-serif", label: "Montserrat (Editorial)" },
  { value: "'Poppins', sans-serif", label: "Poppins (Rounded)" },
  { value: "'Roboto', sans-serif", label: "Roboto (Clean)" },
  { value: "'Playfair Display', serif", label: "Playfair (Lüks Serif)" },
  { value: "'Cinzel', serif", label: "Cinzel (Klasik Serif)" },
  { value: "'Space Mono', monospace", label: "Space Mono (Teknik)" },
  { value: "'Impact', sans-serif", label: "Impact (Bold Display)" },
];

export const WEIGHT_OPTIONS = [
  { value: 400, label: "400 · Normal" },
  { value: 500, label: "500 · Medium" },
  { value: 600, label: "600 · SemiBold" },
  { value: 700, label: "700 · Bold" },
  { value: 800, label: "800 · ExtraBold" },
  { value: 900, label: "900 · Black" },
];

export function TextStyleControls({
  title,
  defaultColorLabel = "Varsayılan Tema Rengi",
  styleConfig,
  onChange,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const cfg = styleConfig || {};

  function updateStyle(patch: Partial<TextStyleConfig>) {
    const next: TextStyleConfig = {
      fontFamily: cfg.fontFamily,
      fontSizeScale: cfg.fontSizeScale,
      fontWeight: cfg.fontWeight,
      color: cfg.color,
      ...patch,
    };

    // Clean up empty/default object
    if (
      (!next.fontFamily || next.fontFamily === "default") &&
      (!next.fontSizeScale || next.fontSizeScale === 1.0) &&
      !next.fontWeight &&
      !next.color
    ) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  }

  const hasCustom =
    !!cfg.fontFamily && cfg.fontFamily !== "default" ||
    (cfg.fontSizeScale !== undefined && cfg.fontSizeScale !== 1.0) ||
    !!cfg.fontWeight ||
    !!cfg.color;

  const currentScale = cfg.fontSizeScale ?? 1.0;
  const currentScalePercent = Math.round(currentScale * 100);

  return (
    <div className="mt-1.5 rounded-md border bg-card/60 p-2 text-xs">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-center gap-1.5 text-left font-medium text-muted-foreground hover:text-foreground"
        >
          <Type className="h-3.5 w-3.5 text-primary" />
          <span>{title}</span>
          {hasCustom && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
              Özel
            </span>
          )}
        </button>

        <div className="flex items-center gap-1">
          {hasCustom && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(undefined)}
              title="Varsayılana Sıfırla"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-2.5 space-y-2.5 pt-2 border-t">
          {/* FONT FAMILY */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Yazı Tipi (Font)</Label>
            <Select
              value={cfg.fontFamily || "default"}
              onValueChange={(val) => updateStyle({ fontFamily: val === "default" ? undefined : val })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Varsayılan Tema Fontu" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value !== "default" ? f.value : undefined }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PUNTO / SIZE SCALE */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[11px] text-muted-foreground">Punto / Boyut</Label>
              <span className="text-[10px] font-mono font-medium text-foreground">
                {currentScalePercent}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={currentScale}
                onChange={(e) => updateStyle({ fontSizeScale: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[10px]"
                onClick={() => updateStyle({ fontSizeScale: 1.0 })}
                title="Puntoyu %100 Yap"
              >
                100%
              </Button>
            </div>
          </div>

          {/* FONT WEIGHT */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Kalınlık (Weight)</Label>
            <Select
              value={cfg.fontWeight ? String(cfg.fontWeight) : "default"}
              onValueChange={(val) =>
                updateStyle({ fontWeight: val === "default" ? undefined : Number(val) })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Varsayılan Kalınlık" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Varsayılan Kalınlık</SelectItem>
                {WEIGHT_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={String(w.value)}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TEXT COLOR */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-[11px] text-muted-foreground">Yazı Rengi</Label>
              {!cfg.color && (
                <span className="text-[10px] text-muted-foreground italic">{defaultColorLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.color || "#000000"}
                onChange={(e) => updateStyle({ color: e.target.value })}
                className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                type="text"
                value={cfg.color || ""}
                placeholder={defaultColorLabel}
                onChange={(e) => updateStyle({ color: e.target.value })}
                className="h-7 font-mono text-xs uppercase"
              />
              {cfg.color && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-[10px]"
                  onClick={() => updateStyle({ color: undefined })}
                  title="Temizle"
                >
                  Sıfırla
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

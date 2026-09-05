"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Slide, Theme } from "@/lib/types";

type Props = {
  slide: Slide;
  theme: Theme;
  onChange: (patch: Partial<Slide>) => void;
};

export function BackgroundControls({ slide, theme, onChange }: Props) {
  const mode = slide.backgroundColor ? "custom" : slide.inverted ? "alternate" : "theme";
  const customColor = slide.backgroundColor || theme.bg;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Background</Label>
      <Select
        value={mode}
        onValueChange={(nextMode) => {
          if (nextMode === "theme") onChange({ inverted: false, backgroundColor: undefined });
          if (nextMode === "alternate") onChange({ inverted: true, backgroundColor: undefined });
          if (nextMode === "custom") onChange({ inverted: false, backgroundColor: customColor });
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="theme">Theme background</SelectItem>
          <SelectItem value="alternate">Theme alternate</SelectItem>
          <SelectItem value="custom">Custom color</SelectItem>
        </SelectContent>
      </Select>
      {mode === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(event) => onChange({ backgroundColor: event.target.value.toUpperCase() })}
            className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
            aria-label="Custom background color"
          />
          <Input
            value={customColor}
            onChange={(event) => onChange({ backgroundColor: event.target.value.toUpperCase() })}
            placeholder="#0B0908"
            className="h-8 font-mono text-xs uppercase"
            aria-label="Custom background hex color"
          />
        </div>
      )}
    </div>
  );
}

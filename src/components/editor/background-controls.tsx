"use client";

import * as React from "react";
import { Image as ImageIcon, Palette, Upload, X, Sparkles, Layers } from "lucide-react";
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
import { didFail, img, setImage } from "@/lib/image-cache";
import type { BackgroundType, Slide, SlideBackgroundConfig } from "@/lib/types";

type Props = {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onApplyToAll?: (bgConfig: SlideBackgroundConfig | undefined, inverted?: boolean) => void;
};

const PRESET_GRADIENTS = [
  { name: "Ocean", c1: "#2b5876", c2: "#4e4376", angle: 135 },
  { name: "Sunset", c1: "#ff7e5f", c2: "#feb47b", angle: 135 },
  { name: "Neon Purple", c1: "#8e2de2", c2: "#4a00e0", angle: 135 },
  { name: "Mint Fresh", c1: "#00b09b", c2: "#96c93d", angle: 135 },
  { name: "Dark Cosmic", c1: "#141e30", c2: "#243b55", angle: 135 },
  { name: "Soft Peach", c1: "#ffecd2", c2: "#fcb69f", angle: 135 },
  { name: "Deep Royal", c1: "#1e3c72", c2: "#2a5298", angle: 135 },
  { name: "Coral Glow", c1: "#ff4b1f", c2: "#ff9068", angle: 135 },
];

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { ok: boolean; path?: string };
    return json.ok && json.path ? json.path : null;
  } catch {
    return null;
  }
}

export function BackgroundControls({ slide, onChange, onApplyToAll }: Props) {
  const bg = slide.background || { type: "theme" };
  const currentType: BackgroundType = bg.type || "theme";

  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function updateBg(patch: Partial<SlideBackgroundConfig>) {
    const next: SlideBackgroundConfig = {
      type: currentType,
      color1: bg.color1 || "#3b82f6",
      color2: bg.color2 || "#9333ea",
      angle: bg.angle ?? 160,
      gradientType: bg.gradientType || "linear",
      color: bg.color || "#1e293b",
      imageUrl: bg.imageUrl || "",
      imageFit: bg.imageFit || "cover",
      overlayOpacity: bg.overlayOpacity ?? 0,
      hideBlobs: bg.hideBlobs ?? false,
      ...patch,
    };
    onChange({ background: next });
  }

  function handleTypeChange(type: BackgroundType) {
    if (type === "theme") {
      onChange({ background: undefined });
      return;
    }
    const next: SlideBackgroundConfig = {
      type,
      color1: bg.color1 || "#3b82f6",
      color2: bg.color2 || "#9333ea",
      angle: bg.angle ?? 160,
      gradientType: bg.gradientType || "linear",
      color: bg.color || "#1e293b",
      imageUrl: bg.imageUrl || "",
      imageFit: bg.imageFit || "cover",
      overlayOpacity: bg.overlayOpacity ?? 0,
      hideBlobs: bg.hideBlobs ?? false,
    };
    onChange({ background: next });
  }

  async function handleImageFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please use PNG, JPG, or WebP");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Image too large (>12MB)");
      return;
    }

    try {
      setUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const uploadedPath = await uploadDataUrl(dataUrl);
      setUploading(false);

      const finalPath = uploadedPath || dataUrl;
      setImage(finalPath, dataUrl);
      updateBg({ type: "image", imageUrl: finalPath });
    } catch {
      setUploading(false);
      setError("Failed to upload background image");
    }
  }

  const hasImage = !!bg.imageUrl;
  const isData = hasImage && bg.imageUrl?.startsWith("data:");
  const previewSrc = isData ? bg.imageUrl : hasImage ? img(bg.imageUrl!) : "";
  const knownMissing = hasImage && !isData && didFail(bg.imageUrl!);

  return (
    <div className="space-y-3 rounded-lg border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <Label className="text-xs font-semibold">Background / Arka Plan</Label>
        </div>
        {onApplyToAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => onApplyToAll(slide.background, slide.inverted)}
            title="Tüm ekranlara bu arka planı uygula"
          >
            <Layers className="mr-1 h-3 w-3" />
            Tümüne Uygula
          </Button>
        )}
      </div>

      {/* Type Selector Tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1 text-center">
        {(
          [
            { id: "theme", label: "Tema" },
            { id: "gradient", label: "Gradient" },
            { id: "solid", label: "Düz Renk" },
            { id: "image", label: "Görsel" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTypeChange(item.id)}
            className={`rounded px-1.5 py-1 text-[11px] font-medium transition-all ${currentType === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* GRADIENT CONTROLS */}
      {currentType === "gradient" && (
        <div className="space-y-3 pt-1">
          {/* Preset Gradients */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Hazır Şablonlar
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_GRADIENTS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    updateBg({
                      type: "gradient",
                      color1: p.c1,
                      color2: p.c2,
                      angle: p.angle,
                    })
                  }
                  className="group relative flex h-7 items-center justify-center rounded border shadow-xs transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(${p.angle}deg, ${p.c1}, ${p.c2})`,
                  }}
                  title={p.name}
                >
                  <span className="sr-only">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Gradient Color Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Başlangıç Rengi</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bg.color1 || "#3b82f6"}
                  onChange={(e) => updateBg({ color1: e.target.value })}
                  className="h-7 w-7 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  type="text"
                  value={bg.color1 || "#3b82f6"}
                  onChange={(e) => updateBg({ color1: e.target.value })}
                  className="h-7 font-mono text-xs uppercase"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Bitiş Rengi</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bg.color2 || "#9333ea"}
                  onChange={(e) => updateBg({ color2: e.target.value })}
                  className="h-7 w-7 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  type="text"
                  value={bg.color2 || "#9333ea"}
                  onChange={(e) => updateBg({ color2: e.target.value })}
                  className="h-7 font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Gradient Type & Angle */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Geçiş Tipi</Label>
              <Select
                value={bg.gradientType || "linear"}
                onValueChange={(val) =>
                  updateBg({ gradientType: val as "linear" | "radial" })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Doğrusal (Linear)</SelectItem>
                  <SelectItem value="radial">Radyal (Radial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bg.gradientType !== "radial" && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[11px] text-muted-foreground">Açı</Label>
                  <span className="text-[10px] text-muted-foreground">{bg.angle ?? 160}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={bg.angle ?? 160}
                  onChange={(e) => updateBg({ angle: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOLID COLOR CONTROLS */}
      {currentType === "solid" && (
        <div className="space-y-2 pt-1">
          <Label className="text-[11px] text-muted-foreground">Arka Plan Rengi</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bg.color || "#1e293b"}
              onChange={(e) => updateBg({ color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <Input
              type="text"
              value={bg.color || "#1e293b"}
              onChange={(e) => updateBg({ color: e.target.value })}
              className="h-8 font-mono text-xs uppercase"
            />
          </div>
        </div>
      )}

      {/* IMAGE CONTROLS */}
      {currentType === "image" && (
        <div className="space-y-3 pt-1">
          <div
            className={`relative flex items-center gap-3 rounded-md border p-2 transition-colors ${dragging ? "border-primary bg-accent ring-2 ring-primary/30" : "border-input"
              }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragging) setDragging(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragging(false);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) await handleImageFile(file);
            }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium">Arka Plan Görseli</span>
              <span className="truncate text-[10px] text-muted-foreground">
                {uploading
                  ? "Yükleniyor…"
                  : !hasImage
                    ? "Görsel sürükleyin veya seçin"
                    : isData
                      ? "Yüklendi (Oturumda geçerli)"
                      : bg.imageUrl?.replace(/^.*\/(?=[^/]+\/[^/]+$)/, "…/")}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (file) await handleImageFile(file);
                e.currentTarget.value = "";
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Yükle
            </Button>

            {hasImage && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateBg({ imageUrl: "" })}
                title="Temizle"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {error && <p className="text-[11px] text-destructive">{error}</p>}
          {knownMissing && (
            <p className="text-[11px] text-destructive">Görsel bulunamadı: {bg.imageUrl}</p>
          )}

          {hasImage && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Görsel Düzeni</Label>
                <Select
                  value={bg.imageFit || "cover"}
                  onValueChange={(val) =>
                    updateBg({ imageFit: val as "cover" | "contain" | "fill" })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Kapla (Cover)</SelectItem>
                    <SelectItem value="contain">Sığdır (Contain)</SelectItem>
                    <SelectItem value="fill">Esnep Doldur (Fill)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[11px] text-muted-foreground">Koyu Katman</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round((bg.overlayOpacity ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={bg.overlayOpacity ?? 0}
                  onChange={(e) => updateBg({ overlayOpacity: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Checkboxes / Options */}
      <div className="space-y-2 pt-1 border-t">
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={!!slide.inverted}
            onChange={(e) => onChange({ inverted: e.target.checked })}
            className="rounded border-input text-primary accent-primary"
          />
          <span>Koyu Metin Modu / Inverted</span>
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
            <input
              type="checkbox"
              checked={!bg.hideBlobs}
              onChange={(e) => updateBg({ hideBlobs: !e.target.checked })}
              className="rounded border-input text-primary accent-primary"
            />
            <span>Ortam Baloncuklarını Göster (Blobs)</span>
          </label>

          {!bg.hideBlobs && (
            <div className="mt-2 space-y-2.5 rounded-md border bg-muted/40 p-2.5">
              {/* BLOB COLORS */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] text-muted-foreground">Baloncuk Renkleri</Label>
                  {(bg.blobColor || bg.blobColor2) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => updateBg({ blobColor: undefined, blobColor2: undefined })}
                    >
                      Sıfırla
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bg.blobColor || "#3b82f6"}
                      onChange={(e) => updateBg({ blobColor: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border border-input bg-transparent p-0.5"
                    />
                    <Input
                      type="text"
                      value={bg.blobColor || ""}
                      placeholder="Renk 1"
                      onChange={(e) => updateBg({ blobColor: e.target.value })}
                      className="h-6 font-mono text-[11px] uppercase"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bg.blobColor2 || bg.blobColor || "#9333ea"}
                      onChange={(e) => updateBg({ blobColor2: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border border-input bg-transparent p-0.5"
                    />
                    <Input
                      type="text"
                      value={bg.blobColor2 || ""}
                      placeholder="Renk 2"
                      onChange={(e) => updateBg({ blobColor2: e.target.value })}
                      className="h-6 font-mono text-[11px] uppercase"
                    />
                  </div>
                </div>

                {/* Quick Color Presets */}
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[9px] text-muted-foreground">Hazır:</span>
                  {[
                    { c1: "#ffffff", c2: "#ffffff", title: "Beyaz Glow" },
                    { c1: "#00f2fe", c2: "#4facfe", title: "Neon Mavi" },
                    { c1: "#ff0844", c2: "#ffb199", title: "Neon Pembe" },
                    { c1: "#f6d365", c2: "#fda085", title: "Altın Işıltı" },
                    { c1: "#11998e", c2: "#38ef7d", title: "Zümrüt" },
                    { c1: "#8e2de2", c2: "#4a00e0", title: "Koyu Mor" },
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => updateBg({ blobColor: preset.c1, blobColor2: preset.c2 })}
                      className="h-4 w-4 rounded-full border border-background shadow-xs hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${preset.c1}, ${preset.c2})` }}
                      title={preset.title}
                    />
                  ))}
                </div>
              </div>

              {/* BLOB SIZE / SCALE */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] text-muted-foreground">Baloncuk Boyutu</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {Math.round((bg.blobScale ?? 1.0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.3"
                    max="2.0"
                    step="0.05"
                    value={bg.blobScale ?? 1.0}
                    onChange={(e) => updateBg({ blobScale: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 px-1.5 text-[9px]"
                    onClick={() => updateBg({ blobScale: 1.0 })}
                  >
                    100%
                  </Button>
                </div>
              </div>

              {/* BLOB OPACITY */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] text-muted-foreground">Saydamlık (Opacity)</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {Math.round((bg.blobOpacity ?? 0.3) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={bg.blobOpacity ?? 0.3}
                  onChange={(e) => updateBg({ blobOpacity: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              {/* BLOB BLUR */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] text-muted-foreground">Bulanıklık (Blur)</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {bg.blobBlur ?? 60}px
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="160"
                  step="5"
                  value={bg.blobBlur ?? 60}
                  onChange={(e) => updateBg({ blobBlur: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

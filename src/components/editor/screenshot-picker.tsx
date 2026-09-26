"use client";
import * as React from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { didFail, img, setImage } from "@/lib/image-cache";
import { resolveScreenshot } from "@/lib/locale";

type Props = {
  label: string;
  value: string;
  locale?: string;
  onChange: (v: string) => void;
};

const ACCEPTED = ["image/png", "image/jpeg"];

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

export function ScreenshotPicker({ label, value, locale, onChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    setError(null);
  }, [value, locale]);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Use PNG or JPG (App Store rejects other formats)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image too large (>8MB)");
      return;
    }
    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      setError("Failed to read file");
      return;
    }
    // Try to persist to disk so the screenshot survives a git clone.
    // If the upload endpoint is unreachable (e.g. static export), fall back
    // to the inline data URI — still works in the current session.
    setUploading(true);
    const uploadedPath = await uploadDataUrl(dataUrl);
    setUploading(false);
    if (uploadedPath) {
      setImage(uploadedPath, dataUrl);
      onChange(uploadedPath);
    } else {
      setImage(dataUrl, dataUrl);
      onChange(dataUrl);
    }
  }

  const hasValue = !!value;
  const isData = hasValue && value.startsWith("data:");
  const resolvedValue = hasValue && !isData && locale ? resolveScreenshot(value, locale) : value;
  const previewSrc = isData ? value : hasValue ? img(resolvedValue) : "";
  // Only flag "image not found" when the path is a real URL that we tried and failed.
  const knownMissing = hasValue && !isData && didFail(resolvedValue);
  const valueLabel = uploading
    ? "saving…"
    : !hasValue
      ? "drop image, or click Pick"
      : isData
        ? "uploaded image (not on disk)"
        : value.replace(/^.*\/(?=[^/]+\/[^/]+$)/, "…/");

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-3 rounded-md border p-2 transition-colors ${
          dragging ? "border-primary bg-accent ring-2 ring-primary/30" : "border-input"
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
          if (file) await handleFile(file);
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
              onError={() => setError("Image failed to load")}
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium">{label}</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {dragging ? "Drop to upload" : valueLabel}
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (file) await handleFile(file);
            input.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Pick
        </Button>
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              onChange("");
              setError(null);
            }}
            aria-label="Clear screenshot"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : knownMissing ? (
        <p className="text-[11px] text-destructive">Image not found at {resolvedValue}</p>
      ) : null}
    </div>
  );
}

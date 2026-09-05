"use client";
import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportedFont } from "@/lib/types";

type Props = {
  disabled: boolean;
  importedFont?: ImportedFont;
  onImported: (font: ImportedFont) => void;
};

export function FontImporter({ disabled, importedFont, onImported }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function importFont(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("font", file);
    try {
      const response = await fetch("/api/upload-font", { method: "POST", body: form });
      const data = (await response.json()) as { ok: boolean; error?: string; font?: ImportedFont };
      if (!data.ok || !data.font) throw new Error(data.error || "Could not import that font.");
      onImported(data.font);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import that font.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFont(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        title="Import a WOFF2, WOFF, TTF, or OTF font"
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Importing" : importedFont ? "Replace font" : "Import font"}
      </Button>
      {error && <span className="max-w-32 truncate text-[10px] text-destructive" title={error}>{error}</span>}
    </span>
  );
}

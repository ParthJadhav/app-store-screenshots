"use client";
import * as React from "react";
import { toast } from "sonner";
import { readAsDataUrl } from "@/lib/image-cache";
import { UPLOADED_ASSETS, UPLOAD_ERRORS, cleanFontName } from "@/lib/uploaded-assets";
import type { ImportedFont } from "@/lib/types";

export type FontImporterHandle = { open: () => void };

type Props = {
  onImported: (font: ImportedFont) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

// Hidden file input behind the toolbar's "Import font…" menu item. The server
// validates the file by its magic bytes and stores it under
// public/fonts/imported/<hash>.<ext>.
export const FontImporter = React.forwardRef<FontImporterHandle, Props>(function FontImporter(
  { onImported, onUploadingChange },
  ref,
) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestId = React.useRef(0);
  React.useEffect(() => () => { requestId.current += 1; }, []);
  React.useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), []);

  async function importFont(file: File) {
    const request = ++requestId.current;
    onUploadingChange?.(true);
    try {
      if (file.size > UPLOADED_ASSETS.font.maxBytes) throw new Error(UPLOAD_ERRORS.fontTooLarge);
      await new FontFace("Import validation", await file.arrayBuffer()).load();
      if (request !== requestId.current) return;
      const response = await fetch("/api/upload-font", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: await fileToBase64(file) }),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await response.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        error?: string;
        font?: ImportedFont;
      };
      if (request !== requestId.current) return;
      if (!response.ok || !data.ok || !data.font) throw new Error(data.error || "Could not import that font.");
      const name = cleanFontName(file.name.replace(/\.[^.]+$/, ""));
      onImported({ ...data.font, ...(name ? { name } : {}) });
      toast.success(`Imported ${name ?? "font"}`);
    } catch (caught) {
      if (request !== requestId.current) return;
      toast.error("Font import failed", {
        description: caught instanceof Error ? caught.message : "Could not import that font.",
      });
    } finally {
      if (request === requestId.current) onUploadingChange?.(false);
    }
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void importFont(file);
        event.target.value = "";
      }}
    />
  );
});

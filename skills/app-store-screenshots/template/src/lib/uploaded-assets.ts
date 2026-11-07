// Files the editor writes into public/ (uploaded screenshots and overlays,
// imported fonts): where each kind lives, which types it accepts and how big
// it may be. Shared by the upload and serve routes, the pickers that check a
// file before sending it, and the project loader that checks stored paths.
import type { ImportedFont } from "./types";

const MB = 1024 * 1024;

export const UPLOADED_ASSETS = {
  image: {
    dir: "screenshots/uploaded",
    types: { png: "image/png", jpg: "image/jpeg" } as Record<string, string>,
    maxBytes: 8 * MB,
    maxPixels: 64 * MB,
    // The JSON request carries the file as base64 (4/3 of its size) plus its envelope.
    maxRequestBytes: 12 * MB,
  },
  font: {
    dir: "fonts/imported",
    types: { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" } as Record<string, string>,
    maxBytes: 16 * MB,
    maxRequestBytes: 23 * MB,
  },
};

export type AssetKind = keyof typeof UPLOADED_ASSETS;

/** Messages shown by both the pickers and the upload routes. */
export const UPLOAD_ERRORS = {
  imageTooLarge: `Image too large (>${UPLOADED_ASSETS.image.maxBytes / MB}MB)`,
  imageCorrupt: `Image is corrupt or exceeds ${UPLOADED_ASSETS.image.maxPixels / MB} megapixels`,
  fontTooLarge: `Font file is too large (${UPLOADED_ASSETS.font.maxBytes / MB}MB maximum).`,
};

/** File extension stored for each font format. */
export const FONT_EXTENSION: Record<ImportedFont["format"], string> = {
  woff2: "woff2",
  woff: "woff",
  truetype: "ttf",
  opentype: "otf",
};

/** Stored files are named by a 16-hex-digit content hash. */
export const ASSET_FILENAME = /^[a-f0-9]{16}\.([a-z0-9]+)$/;

export function assetUrl(kind: AssetKind, filename: string) {
  return `/${UPLOADED_ASSETS[kind].dir}/${filename}`;
}

// Display names come from the uploaded file name; keep them short and printable.
export function cleanFontName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return name || undefined;
}

const IMPORTED_FONT_SRC = new RegExp(
  `^${assetUrl("font", "")}[a-z0-9]+\\.(${Object.keys(UPLOADED_ASSETS.font.types).join("|")})$`,
  "i",
);

export function cleanImportedFont(value: unknown): ImportedFont | undefined {
  if (!value || typeof value !== "object") return undefined;
  const font = value as Partial<ImportedFont>;
  if (typeof font.src !== "string" || !IMPORTED_FONT_SRC.test(font.src)) return undefined;
  if (!font.format || !Object.hasOwn(FONT_EXTENSION, font.format)) return undefined;
  const name = cleanFontName(font.name);
  return { src: font.src, format: font.format, ...(name ? { name } : {}) };
}

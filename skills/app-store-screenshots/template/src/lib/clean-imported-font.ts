import type { ImportedFont } from "./types";

export function cleanImportedFont(value: unknown): ImportedFont | undefined {
  if (!value || typeof value !== "object") return undefined;
  const font = value as Partial<ImportedFont>;
  const formats = ["woff2", "woff", "truetype", "opentype"] as const;
  if (typeof font.src !== "string" || !/^\/fonts\/imported\/[a-z0-9]+\.(woff2|woff|ttf|otf)$/i.test(font.src)) return undefined;
  if (!formats.includes(font.format as ImportedFont["format"])) return undefined;
  return { src: font.src, format: font.format as ImportedFont["format"] };
}

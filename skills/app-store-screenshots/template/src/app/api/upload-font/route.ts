import { NextResponse } from "next/server";
import { saveAsset } from "@/lib/asset-files";
import { rejectCrossSiteWrite } from "@/lib/request-guard";
import type { ImportedFont } from "@/lib/types";
import { decodeBase64, readJsonBody } from "@/lib/request-body";
import { FONT_EXTENSION, UPLOADED_ASSETS, UPLOAD_ERRORS, maxRequestBytes } from "@/lib/uploaded-assets";

export const dynamic = "force-dynamic";

const MAX_FONT_BYTES = UPLOADED_ASSETS.font.maxBytes;

// The stored format and extension come from the file's magic bytes, never
// from the caller-supplied filename or MIME type.
function sniffFontFormat(bytes: Buffer): ImportedFont["format"] | null {
  if (bytes.length < 4) return null;
  const tag = bytes.subarray(0, 4);
  if (tag.equals(Buffer.from("wOF2", "latin1"))) return "woff2";
  if (tag.equals(Buffer.from("wOFF", "latin1"))) return "woff";
  if (tag.equals(Buffer.from([0x00, 0x01, 0x00, 0x00])) || tag.equals(Buffer.from("true", "latin1"))) {
    return "truetype";
  }
  if (tag.equals(Buffer.from("OTTO", "latin1"))) return "opentype";
  return null;
}

// Check container lengths and table bounds before persisting. Glyph validity
// is checked by the browser's FontFace decoder before the UI imports the file.
function hasFontStructure(bytes: Buffer, format: ImportedFont["format"]): boolean {
  const web = format === "woff" || format === "woff2";
  const header = web ? (format === "woff2" ? 48 : 44) : 12;
  if (bytes.length < header) return false;
  const count = bytes.readUInt16BE(web ? 12 : 4);
  if (!count) return false;
  if (web && (bytes.readUInt32BE(8) !== bytes.length || bytes.readUInt16BE(14) !== 0 ||
    bytes.readUInt32BE(16) > 64 * 1024 * 1024)) return false;
  if (format === "woff2") {
    const compressed = bytes.readUInt32BE(20);
    return compressed > 0 && header + count * 2 + compressed <= bytes.length;
  }
  const stride = web ? 20 : 16;
  const directoryEnd = header + count * stride;
  if (directoryEnd > bytes.length) return false;
  for (let i = 0; i < count; i++) {
    const entry = header + i * stride;
    const offset = bytes.readUInt32BE(entry + (web ? 4 : 8));
    const length = bytes.readUInt32BE(entry + (web ? 8 : 12));
    if (offset < directoryEnd || offset + length > bytes.length) return false;
    if (web && length > bytes.readUInt32BE(entry + 12)) return false;
  }
  return true;
}

export async function POST(req: Request) {
  // This route WRITES A FILE to disk. See lib/request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const input = await readJsonBody(req, maxRequestBytes("font"));
  if (input.response) return input.response;
  const body = input.value as { data?: unknown } | null;
  if (typeof body?.data !== "string" || !body.data) {
    return NextResponse.json({ ok: false, error: "Choose a font file first." }, { status: 400 });
  }
  // Reject oversized payloads before decoding (base64 is ~4/3 of the byte size).
  if (body.data.length > Math.ceil(MAX_FONT_BYTES / 3) * 4) {
    return NextResponse.json({ ok: false, error: UPLOAD_ERRORS.fontTooLarge }, { status: 413 });
  }
  const bytes = decodeBase64(body.data);
  if (!bytes) return NextResponse.json({ ok: false, error: "Invalid base64 font data" }, { status: 400 });
  if (bytes.byteLength > MAX_FONT_BYTES) {
    return NextResponse.json({ ok: false, error: UPLOAD_ERRORS.fontTooLarge }, { status: 413 });
  }
  const format = sniffFontFormat(bytes);
  if (!format || !hasFontStructure(bytes, format)) {
    return NextResponse.json({ ok: false, error: "Use a WOFF2, WOFF, TTF, or OTF font file." }, { status: 400 });
  }

  try {
    const font: ImportedFont = { src: await saveAsset("font", bytes, FONT_EXTENSION[format]), format };
    return NextResponse.json({ ok: true, font });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

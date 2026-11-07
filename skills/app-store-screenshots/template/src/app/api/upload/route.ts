import { NextResponse } from "next/server";
import sharp from "sharp";
import { saveAsset } from "@/lib/asset-files";
import { rejectCrossSiteWrite, sniffImageType } from "@/lib/request-guard";
import { decodeBase64, readJsonBody } from "@/lib/request-body";
import { UPLOADED_ASSETS, UPLOAD_ERRORS } from "@/lib/uploaded-assets";

export const dynamic = "force-dynamic";

const { types, maxBytes, maxPixels } = UPLOADED_ASSETS.image;
const MIME_EXT: Record<string, string> = {
  ...Object.fromEntries(Object.entries(types).map(([ext, mime]) => [mime, ext])),
  "image/jpg": "jpg",
};

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const bytes = decodeBase64(m[2]);
  return bytes ? { mime, bytes } : null;
}

export async function POST(req: Request) {
  // This route WRITES A FILE to disk. See lib/request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const input = await readJsonBody(req, UPLOADED_ASSETS.image.maxRequestBytes);
  if (input.response) return input.response;
  const body = input.value as { dataUrl?: string } | null;
  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
  }
  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Unsupported data URL" }, { status: 400 });
  }
  const ext = MIME_EXT[parsed.mime];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: `Unsupported mime: ${parsed.mime}` },
      { status: 400 },
    );
  }
  // The declared MIME comes from the caller-written data URL, so it decides
  // the stored extension. Require the bytes to actually be that image type.
  const sniffed = sniffImageType(parsed.bytes);
  if (!sniffed || MIME_EXT[sniffed] !== ext) {
    return NextResponse.json(
      { ok: false, error: "Content does not match declared image type" },
      { status: 400 },
    );
  }
  if (parsed.bytes.byteLength > maxBytes) {
    return NextResponse.json({ ok: false, error: UPLOAD_ERRORS.imageTooLarge }, { status: 413 });
  }

  try {
    // Decode pixels too: valid headers alone still accept truncated images.
    await sharp(parsed.bytes, { limitInputPixels: maxPixels, failOn: "warning" }).stats();
  } catch {
    return NextResponse.json({ ok: false, error: UPLOAD_ERRORS.imageCorrupt }, { status: 400 });
  }

  try {
    return NextResponse.json({ ok: true, path: await saveAsset("image", parsed.bytes, ext) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

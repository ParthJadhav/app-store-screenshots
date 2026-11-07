// Server side of uploaded assets: writing them under public/ and serving them.
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ASSET_FILENAME, UPLOADED_ASSETS, assetUrl, type AssetKind } from "./uploaded-assets";

/** Store `bytes` under a content-hash name and return its public URL. */
export async function saveAsset(kind: AssetKind, bytes: Buffer, ext: string): Promise<string> {
  const filename = `${createHash("sha1").update(bytes).digest("hex").slice(0, 16)}.${ext}`;
  const dir = path.join(process.cwd(), "public", UPLOADED_ASSETS[kind].dir);
  await fs.mkdir(dir, { recursive: true });
  // A concurrent upload/GET must never see a partially written asset.
  const file = path.join(dir, filename);
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, file);
  } finally {
    await fs.unlink(temporary).catch(() => undefined);
  }
  return assetUrl(kind, filename);
}

/** Next's production public-file index excludes uploads created after startup, so they are served here. */
export async function serveAsset(kind: AssetKind, filename: string) {
  const { dir, types } = UPLOADED_ASSETS[kind];
  const match = ASSET_FILENAME.exec(filename);
  if (!match || !Object.hasOwn(types, match[1])) return new NextResponse(null, { status: 404 });
  return servePublicFile(path.join(dir, filename), types[match[1]]);
}

/** A file under public/, served with immutable caching (its URL changes when its content does). */
export async function servePublicFile(relativePath: string, contentType: string) {
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", relativePath));
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: false, error: "Asset could not be read" }, { status: 500 });
  }
}

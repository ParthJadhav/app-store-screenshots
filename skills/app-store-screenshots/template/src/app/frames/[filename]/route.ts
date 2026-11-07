import { NextResponse } from "next/server";
import { servePublicFile } from "@/lib/asset-files";
import { FRAME_FILES } from "@/lib/frame-assets";

export const dynamic = "force-dynamic";

// Served at runtime: Next's production public-file index only covers files
// that existed at build time, and bezels may be swapped afterwards.
export async function GET(_req: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const name = filename.replace(/\.png$/, "");
  if (!filename.endsWith(".png") || !(FRAME_FILES as readonly string[]).includes(name)) {
    return new NextResponse(null, { status: 404 });
  }
  // The URL carries ?v=<mtime>, so a replaced file gets a new URL.
  return servePublicFile(`frames/${filename}`, "image/png");
}

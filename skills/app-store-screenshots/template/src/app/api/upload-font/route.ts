import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FONT_TYPES = {
  woff2: { format: "woff2", mime: "font/woff2" },
  woff: { format: "woff", mime: "font/woff" },
  ttf: { format: "truetype", mime: "font/ttf" },
  otf: { format: "opentype", mime: "font/otf" },
} as const;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("font");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose a font file first." }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase() as keyof typeof FONT_TYPES | undefined;
  const fontType = extension ? FONT_TYPES[extension] : undefined;
  if (!fontType) return NextResponse.json({ ok: false, error: "Use a WOFF2, WOFF, TTF, or OTF font file." }, { status: 400 });
  if (file.size > 16 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Font file is too large (16MB maximum)." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 16);
  const directory = path.join(process.cwd(), "public", "fonts", "imported");
  const filename = `${hash}.${extension}`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), bytes);
  return NextResponse.json({ ok: true, font: { src: `/fonts/imported/${filename}`, format: fontType.format } });
}

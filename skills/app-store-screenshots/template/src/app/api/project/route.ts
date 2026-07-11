import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { migrateProject, validateProject } from "@/lib/project-schema";

export const dynamic = "force-dynamic";

const PROJECT_FILE = "app-store-screenshots.json";

function filePath() {
  return path.join(process.cwd(), PROJECT_FILE);
}

export async function GET() {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ok: true, state: migrateProject(parsed) });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: true, state: null });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const validation = validateProject(body);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.errors.join(" ") },
        { status: 422 },
      );
    }
    const pretty = JSON.stringify(validation.state, null, 2) + "\n";
    const target = filePath();
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, pretty, "utf8");
    await fs.rename(temporary, target);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

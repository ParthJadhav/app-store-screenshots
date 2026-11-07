import { serveAsset } from "@/lib/asset-files";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  return serveAsset("font", filename);
}

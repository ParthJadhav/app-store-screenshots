"use client";
// Pre-loads images as base64 data URIs so html-to-image exports without
// non-deterministic image fetch races. Always use img(path) in render.

const cache = new Map<string, string>();
// Natural pixel size of each cached image, so frames can check a capture's aspect.
const sizes = new Map<string, { w: number; h: number }>();
const failed = new Set<string>();
const pending = new Map<string, Promise<void>>();

async function fetchAsDataUrl(path: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    // A capture saved inline in the project is already a data URI: just decode
    // it, so its size is known (frames and warnings check a capture's aspect).
    if (path.startsWith("data:")) {
      const image = new Image();
      image.src = path;
      await image.decode();
      return { data: path, w: image.naturalWidth, h: image.naturalHeight };
    }
    const resp = await fetch(path, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const data = await readAsDataUrl(await resp.blob());
    // A successful HTTP response may still be an HTML error page or corrupt
    // image. Catch that before export silently substitutes an empty device.
    const image = new Image();
    image.src = data;
    await image.decode();
    return { data, w: image.naturalWidth, h: image.naturalHeight };
  } catch {
    return null;
  }
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function preloadImages(
  paths: string[],
  options: { retryFailed?: boolean } = {},
): Promise<void> {
  await Promise.all(
    paths
      .filter(Boolean)
      .filter((p) => !cache.has(p) && (options.retryFailed || !failed.has(p)))
      .map((p) => {
        const existing = pending.get(p);
        if (existing) return existing;
        const task = fetchAsDataUrl(p).then((loaded) => {
          // A newer upload may have populated the same content-addressed URL.
          if (cache.has(p)) return;
          if (loaded) { cache.set(p, loaded.data); sizes.set(p, { w: loaded.w, h: loaded.h }); failed.delete(p); }
          else failed.add(p);
        }).finally(() => pending.delete(p));
        pending.set(p, task);
        return task;
      }),
  );
}

export function img(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  if (failed.has(path)) return "";
  return cache.get(path) || path;
}

export function setImage(path: string, dataUrl: string, size?: { w: number; h: number }) {
  cache.set(path, dataUrl);
  if (size) sizes.set(path, size);
  failed.delete(path);
}

/** Natural size of a preloaded image, if known. */
export function imgSize(path: string | undefined): { w: number; h: number } | undefined {
  return path ? sizes.get(path) : undefined;
}

export function didFail(path: string | undefined): boolean {
  if (!path) return false;
  return failed.has(path);
}

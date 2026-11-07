"use client";
// Rasterises one export slide to PNG.
//
// WHY THIS IS NOT JUST `toPng(node)`
// ----------------------------------
// html-to-image serialises the node into an SVG <foreignObject>, loads that SVG
// as an image and draws it to a canvas exactly once. WebKit (Safari, and any
// WebKit-based browser) decodes the <img> data URLs *nested inside* an SVG
// image asynchronously, kicked off by the first paint. That single draw can
// therefore capture the headline, background and CSS device frame while every
// screenshot is still blank, with no error. Whether it wins the race depends on
// image size and machine load, so a different slide failed on each export and a
// 4K render could fail where 1080p passed. Chrome paints nested data URLs on the
// first draw, which is why the bug looked intermittent.
//
// THE FIX
// -------
// 1. Embed only the images inside the captured slide. A connected deck renders
//    every screen side by side; embedding all of them made each SVG N× larger.
// 2. Render a baseline with every image blanked, so we know what each image's
//    region looks like when the image is missing.
// 3. Draw the real SVG repeatedly until every visible image region differs from
//    that baseline and two consecutive draws are identical. Only then export.
//    If an image never shows up within the timeout, report it instead of
//    silently shipping a blank device.
import { toSvg } from "html-to-image";
import { encodeCanvasPng } from "./png-encode";

const SETTLE_POLL_MS = 50;
const SETTLE_TIMEOUT_MS = 8000;
const FINGERPRINT_SIZE = 12;
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const SVG_PREFIX = "data:image/svg+xml;charset=utf-8,";

type Box = { x: number; y: number; w: number; h: number };

export type RenderedSlide = {
  /** Draw the settled slide at the given export size as opaque 24-bit PNG bytes. */
  toPng: (w: number, h: number) => Promise<Uint8Array>;
  /** Visible images that never appeared in the render. 0 when all is well. */
  missingImages: number;
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Wait two animation frames, so React's render and the browser's layout and
 * paint of a just-mounted node settle before it is captured. One frame is
 * occasionally not enough on slower machines.
 */
export const waitForPaint = () => nextFrame().then(nextFrame);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      image.decode().then(
        () => resolve(image),
        () => resolve(image),
      );
    };
    image.onerror = () => reject(new Error("Couldn't load the rendered slide"));
    image.src = src;
  });
}

function intersects(a: DOMRect, b: DOMRect) {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

// Same SVG with every <img> pointed at a transparent pixel: what each image
// region looks like when that image failed to paint.
function blankImages(svg: string) {
  if (!svg.startsWith(SVG_PREFIX)) return null;
  const markup = decodeURIComponent(svg.slice(SVG_PREFIX.length));
  const blanked = markup.replace(/(<img\b[^>]*?\bsrc=")[^"]*(")/g, `$1${BLANK_GIF}$2`);
  return SVG_PREFIX + encodeURIComponent(blanked);
}

function createContext(width: number, height: number, readBack = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", readBack ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return { canvas, ctx };
}

// Downsampled pixels of each box: cheap to compare, sensitive to "is it there".
function fingerprint(source: HTMLCanvasElement, boxes: Box[], scratch: CanvasRenderingContext2D) {
  return boxes.map((b) => {
    scratch.clearRect(0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE);
    scratch.drawImage(source, b.x, b.y, b.w, b.h, 0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE);
    return scratch.getImageData(0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE).data.join(",");
  });
}

// Does the image have visible pixels in its inner 60% ("opaque-center"), only
// nearer its edges ("edges-only"), or none at all ("empty")? Sampled from the
// decoded image itself at fingerprint resolution.
function alphaCoverage(
  image: HTMLImageElement,
  scratch: CanvasRenderingContext2D,
): "opaque-center" | "edges-only" | "empty" {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (!w || !h) return "opaque-center";
  const hasAlpha = (sx: number, sy: number, sw: number, sh: number) => {
    scratch.clearRect(0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE);
    scratch.drawImage(image, sx, sy, sw, sh, 0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE);
    const data = scratch.getImageData(0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) return true;
    return false;
  };
  try {
    if (hasAlpha(w * 0.2, h * 0.2, w * 0.6, h * 0.6)) return "opaque-center";
    return hasAlpha(0, 0, w, h) ? "edges-only" : "empty";
  } catch {
    // Unreadable (e.g. tainted) images keep the original inner-box check.
    return "opaque-center";
  }
}

export async function renderSlide(
  el: HTMLElement,
  width: number,
  height: number,
  backgroundColor = "#ffffff",
): Promise<RenderedSlide> {
  const root = el.getBoundingClientRect();
  const sx = width / (root.width || width);
  const sy = height / (root.height || height);
  const isVisible = (node: Element) => intersects(node.getBoundingClientRect(), root);

  const visible = Array.from(el.querySelectorAll("img")).filter(
    (image) => !!image.getAttribute("src") && isVisible(image),
  );
  await Promise.all(visible.map((image) => image.decode().catch(() => undefined)));

  const { ctx: scratch } = createContext(FINGERPRINT_SIZE, FINGERPRINT_SIZE, true);

  // Inner 60% of each visible image, in canvas pixels. The inset keeps bezels,
  // rounded corners and overlapping frames out of the comparison. An image
  // whose own centre is see-through (the iPhone mockup around an empty screen,
  // a ring-shaped logo overlay) would look "missing" there even when painted,
  // so those are checked over their full box instead, as are frames marked
  // data-export-check="full" whose middle is covered by the screen layer.
  // Images with no visible pixels at all are skipped.
  const boxes: Box[] = visible
    .map((image) => {
      const coverage = alphaCoverage(image, scratch);
      if (coverage === "empty") return null;
      const inset = coverage === "opaque-center" && image.dataset.exportCheck !== "full" ? 0.2 : 0;
      const r = image.getBoundingClientRect();
      const left = Math.max(r.left, root.left);
      const top = Math.max(r.top, root.top);
      const w = (Math.min(r.right, root.right) - left) * sx;
      const h = (Math.min(r.bottom, root.bottom) - top) * sy;
      return {
        x: (left - root.left) * sx + w * inset,
        y: (top - root.top) * sy + h * inset,
        w: w * (1 - inset * 2),
        h: h * (1 - inset * 2),
      };
    })
    .filter((b): b is Box => !!b && b.w >= 2 && b.h >= 2);

  const svg = await toSvg(el, {
    width,
    height,
    cacheBust: false,
    backgroundColor,
    filter: (node) => !(node instanceof HTMLImageElement) || isVisible(node),
  });

  const { canvas, ctx } = createContext(width, height);
  const draw = (image: HTMLImageElement) => {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
  };

  let missingImages = 0;
  const blankSvg = boxes.length > 0 ? blankImages(svg) : null;
  if (blankSvg) {
    draw(await loadImage(blankSvg));
    const baseline = fingerprint(canvas, boxes, scratch);
    const image = await loadImage(svg);
    let prev: string[] | null = null;
    let painted: boolean[] = boxes.map(() => false);
    const deadline = performance.now() + SETTLE_TIMEOUT_MS;
    for (;;) {
      draw(image);
      const cur = fingerprint(canvas, boxes, scratch);
      painted = cur.map((fp, i) => fp !== baseline[i]);
      const stable = prev !== null && cur.every((fp, i) => fp === prev![i]);
      if ((stable && painted.every(Boolean)) || performance.now() > deadline) break;
      prev = cur;
      await nextFrame();
      await sleep(SETTLE_POLL_MS);
    }
    missingImages = painted.filter((p) => !p).length;
  } else {
    draw(await loadImage(svg));
  }

  return {
    missingImages,
    toPng: (w, h) => {
      if (w === width && h === height) return encodeCanvasPng(canvas);
      const { canvas: out, ctx: octx } = createContext(w, h);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      // Cover, not stretch: some slots differ from the canvas aspect by a few
      // percent (Apple Watch 422×514 → 312×390), and stretching would squash
      // the device frame. Cover trims the same few pixels off the edges instead.
      const scale = Math.max(w / width, h / height);
      const dw = width * scale;
      const dh = height * scale;
      octx.drawImage(canvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return encodeCanvasPng(out);
    },
  };
}

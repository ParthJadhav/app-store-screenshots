"use client";

import * as React from "react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { getCanvasSize } from "@/lib/constants";
import { buildExportPlan, exportManifest, type ExportUnit } from "@/lib/export-plan";
import { preloadImages } from "@/lib/image-cache";
import { runPreflight } from "@/lib/preflight";
import type { ProjectState, Theme } from "@/lib/types";
import { DeckCanvas } from "./slide-canvas";

const waitForPaint = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

export function useProjectExport({ state, theme, assetPaths }: { state: ProjectState; theme: Theme; assetPaths: string[] }) {
  const [progress, setProgress] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<ExportUnit | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);

  const exportAll = React.useCallback(async () => {
    const report = runPreflight(state);
    if (report.errors) {
      toast.error("Preflight found blocking errors", { description: `Fix ${report.errors} error${report.errors === 1 ? "" : "s"} before exporting.` });
      return;
    }
    const plan = buildExportPlan(state, theme);
    if (!plan.length) return toast.error("No screens to export");
    await preloadImages(assetPaths, { retryFailed: true });
    if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
    const zip = new JSZip();
    const exported: ExportUnit[] = [];
    const errors: string[] = [];
    for (const [index, unit] of plan.entries()) {
      setProgress(`${index + 1}/${plan.length}`);
      setTarget(unit);
      await waitForPaint();
      const element = exportRef.current;
      if (!element) {
        errors.push(`${unit.path}: render target missing`);
        continue;
      }
      try {
        const { cW, cH } = getCanvasSize(unit.device, unit.orientation);
        const dataUrl = await captureSlide(element, cW, cH, unit.width, unit.height);
        zip.file(unit.path, dataUrl.split(",")[1] || "", { base64: true });
        exported.push(unit);
      } catch (error) {
        errors.push(`${unit.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    setProgress(null);
    setTarget(null);
    if (!exported.length) return toast.error("Every render failed", { description: errors.slice(0, 3).join("\n") });
    zip.file("manifest.json", JSON.stringify(exportManifest(state, exported), null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(state.appName)}-all-store-assets-${stamp()}.zip`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (errors.length) toast.warning(`Exported ${exported.length} PNGs; ${errors.length} failed`, { description: errors.slice(0, 3).join("\n") });
    else toast.success(`Exported ${exported.length} PNGs`, { description: `${state.variants.length} variant${state.variants.length === 1 ? "" : "s"} · ${state.locales.length} locale${state.locales.length === 1 ? "" : "s"} · every device` });
  }, [assetPaths, state, theme]);

  return { exportAll, exportRef, progress, target };
}

export function ExportTargetSurface({ state, target, exportRef }: { state: ProjectState; target: ExportUnit | null; exportRef: React.RefObject<HTMLDivElement> }) {
  if (!target) return null;
  const variant = state.variants.find((item) => item.id === target.variantId);
  const slides = variant?.slidesByDevice[target.device] || [];
  const { cW, cH } = getCanvasSize(target.device, target.orientation);
  return (
    <div aria-hidden style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }}>
      <div ref={exportRef} style={{ width: cW, height: cH, overflow: "hidden", position: "absolute", left: -99999, top: 0 }}>
        <div style={{ position: "absolute", left: -target.slideIndex * cW, top: 0, width: cW * slides.length, height: cH }}>
          <DeckCanvas slides={slides} device={target.device} orientation={target.orientation} theme={target.theme} locale={target.locale} appName={state.appName} appIcon={state.appIcon} masterLayers={state.masterLayers} canvasSettings={state.canvasSettings} connectedCanvas={state.connectedCanvas} hideEmpty />
        </div>
      </div>
    </div>
  );
}

async function captureSlide(element: HTMLElement, sourceW: number, sourceH: number, exportW: number, exportH: number) {
  const previous = { left: element.style.left, top: element.style.top, position: element.style.position, transform: element.style.transform, transformOrigin: element.style.transformOrigin, zIndex: element.style.zIndex };
  Object.assign(element.style, { left: "0px", top: "0px", position: "absolute", transform: "none", transformOrigin: "top left", zIndex: "-1" });
  try {
    return await toPng(element, { width: sourceW, height: sourceH, canvasWidth: exportW, canvasHeight: exportH, pixelRatio: 1, cacheBust: false, backgroundColor: "#ffffff" });
  } finally {
    Object.assign(element.style, { ...previous, left: previous.left || "-99999px", top: previous.top || "0px", position: previous.position || "absolute" });
  }
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "screenshots"; }
function stamp() { const date = new Date(); const pad = (value: number) => String(value).padStart(2, "0"); return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`; }

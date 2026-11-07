"use client";
import * as React from "react";
import JSZip from "jszip";
import { Toaster, toast } from "sonner";
import { DEFAULT_SCREENSHOT_FONT_ID, IMPORTED_FONT_FAMILY, hasTheme, screenshotFontFamily, themeById } from "@/lib/constants";
import { copySlide, updateDeck, updateSlide as updateSlideIn, withElementTransform } from "@/lib/deck";
import { canvasSize, deviceForOrientation, getExportSizes, orientationOf, platformOf, supportsLandscape } from "@/lib/devices";
import { renderSlide, waitForPaint } from "@/lib/export-render";
import { deckAssetPaths, preloadPaths, screenshotIssues } from "@/lib/export-assets";
import { setFrameAssets, type FrameFile, type MeasuredFrame } from "@/lib/frame-assets";
import { didFail, preloadImages } from "@/lib/image-cache";
import { writeLocalized } from "@/lib/locale";
import { useProject } from "@/lib/storage";
import { downloadBlob, slugify } from "@/lib/utils";
import type { ElementId, ElementTransform, ImportedFont, SelectedElement, ProjectState, Slide } from "@/lib/types";
import { Inspector } from "./inspector";
import { PreviewStage } from "./preview-stage";
import { Sidebar } from "./sidebar";
import { DeckCanvas } from "./slide-canvas";
import { StyleLab } from "./style-lab";
import { Toolbar } from "./toolbar";

export function ScreenshotEditor() {
  const { state, setState, hydrated, savedAt, saveError, retrySave, reset, resetDevice, undo, redo, canUndo, canRedo } = useProject();
  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElement, setSelectedElement] = React.useState<SelectedElement | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const framesLoaded = useFrameAssets();
  const [, refreshAssets] = React.useReducer((version: number) => version + 1, 0);
  const [exportLocaleOverride, setExportLocaleOverride] = React.useState<string | null>(null);
  const [exportSlideIndex, setExportSlideIndex] = React.useState(0);
  const exportInProgress = React.useRef(false);
  const [exportProject, setExportProject] = React.useState<ProjectState | null>(null);
  const exportRef = React.useRef<HTMLDivElement | null>(null);
  const [styleLabOpen, setStyleLabOpen] = React.useState(false);
  // The latest committed project, for actions that must check nothing changed since.
  const latestState = React.useRef(state);
  latestState.current = state;

  const currentSlides = state.slidesByDevice[state.device] || [];
  const activeSlide =
    currentSlides.find((s) => s.id === activeSlideId) || currentSlides[0] || null;
  const theme = themeById(state.themeId);
  const fontId = state.fontId || DEFAULT_SCREENSHOT_FONT_ID;
  const fontFamily = screenshotFontFamily(fontId);
  useImportedFontFace(state.importedFont);

  React.useEffect(() => {
    if (selectedElement && selectedElement.slideId !== activeSlide?.id) {
      setSelectedElement(null);
    }
  }, [activeSlide?.id, selectedElement]);

  React.useEffect(() => {
    if (!hydrated) return;
    // Pin the default selection to its ID before reordering can change index 0.
    // A deleted/undone screen falls back to the first remaining screen.
    if (!currentSlides.some((slide) => slide.id === activeSlideId)) {
      setActiveSlideId(currentSlides[0]?.id ?? null);
    }
  }, [hydrated, currentSlides, activeSlideId]);

  React.useEffect(() => {
    // Undo can restore a device whose orientation differs from the current one.
    const expected = supportsLandscape(state.device) ? orientationOf(state.device, state.orientation) : "portrait";
    if (state.orientation !== expected) {
      setState((p) => ({ ...p, orientation: expected }), { history: false });
    }
  }, [state.device, state.orientation, setState]);

  React.useEffect(() => {
    if (hydrated && state.themeId && !hasTheme(state.themeId)) {
      toast.warning("Using fallback theme", {
        description: `Theme "${state.themeId}" is not defined in src/lib/constants.ts.`,
        duration: 8000,
      });
    }
  }, [hydrated, state.themeId]);

  // Recomputed every render: the open deck's bezels are known once frames load.
  const assetPaths = preloadPaths(state);
  // Inline captures can be megabytes long; a length and tail stand in for them.
  const assetSig = assetPaths.map((p) => (p.startsWith("data:") ? `data:${p.length}:${p.slice(-48)}` : p)).join("|");

  React.useEffect(() => {
    // Wait for the bezel measurements, so the first paint already has the
    // open deck's bezel cached instead of swapping it in under the user.
    if (!hydrated || !framesLoaded) return;
    let cancelled = false;
    preloadImages(assetPaths).finally(() => {
      if (!cancelled) { setReady(true); refreshAssets(); }
    });
    return () => { cancelled = true; };
    // assetPaths is derived from assetSig; depending on the string keeps the
    // effect from re-firing when slidesByDevice churns without path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, framesLoaded, assetSig]);

  // Surface storage failures (quota exceeded etc.) so the user knows their work isn't safe.
  React.useEffect(() => {
    if (saveError) {
      toast.error("Couldn't load or save project file", {
        description: saveError,
        duration: 8000,
      });
    }
  }, [saveError]);

  const updateSlide = React.useCallback(
    (id: string, update: (slide: Slide) => Partial<Slide>) => setState((prev) => updateSlideIn(prev, id, update)),
    [setState],
  );

  const reorderSlides = React.useCallback(
    (next: Slide[]) => setState((prev) => updateDeck(prev, prev.device, () => next), { coalesce: false }),
    [setState],
  );

  const deleteSlide = React.useCallback(
    (id: string) => {
      const dev = state.device;
      const slides = state.slidesByDevice[dev] || [];
      const idx = slides.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const snap = slides[idx];
      const fallback = slides[idx + 1] || slides[idx - 1] || null;

      setState((prev) => updateDeck(prev, dev, (cur) => cur.filter((s) => s.id !== id)), { coalesce: false });
      setActiveSlideId((cur) => (cur === id ? fallback?.id || null : cur));

      toast("Screen deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            setState((prev) => updateDeck(prev, dev, (cur) =>
              cur.some((s) => s.id === snap.id) ? cur : [...cur.slice(0, idx), snap, ...cur.slice(idx)],
            ), { coalesce: false });
            setActiveSlideId(snap.id);
          },
        },
        duration: 6000,
      });
    },
    [setState, state.device, state.slidesByDevice],
  );

  const addSlide = React.useCallback(
    (slide: Slide) => {
      setState((prev) => updateDeck(prev, prev.device, (slides) => [...slides, slide]), { coalesce: false });
      setActiveSlideId(slide.id);
    },
    [setState],
  );

  const patchLocalized = React.useCallback(
    (slideId: string, key: "label" | "headline", value: string) =>
      setState((prev) => updateSlideIn(prev, slideId, (slide) => ({ [key]: writeLocalized(slide[key], prev.locale, value) }))),
    [setState],
  );

  const patchElementTransform = React.useCallback(
    (slideId: string, elementId: ElementId, transform: ElementTransform) =>
      setState((prev) => updateSlideIn(prev, slideId, (slide) => withElementTransform(slide, elementId, transform))),
    [setState],
  );

  const patchTextElementText = React.useCallback(
    (slideId: string, textId: string, value: string) =>
      setState((prev) => updateSlideIn(prev, slideId, (slide) => ({
        textElements: (slide.textElements || []).map((element) =>
          element.id === textId ? { ...element, text: writeLocalized(element.text, prev.locale, value) } : element,
        ),
      }))),
    [setState],
  );

  const duplicateSlide = React.useCallback(
    (id: string) => {
      let newId: string | null = null;
      setState((prev) => updateDeck(prev, prev.device, (slides) => {
        const idx = slides.findIndex((s) => s.id === id);
        if (idx === -1) return slides;
        const copy = copySlide(slides[idx]);
        newId = copy.id;
        return [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
      }), { coalesce: false });
      if (newId) setActiveSlideId(newId);
    },
    [setState],
  );

  // ---------- Keyboard shortcuts ----------

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inTextField = isTextEditable(target);
      const inControl =
        inTextField || (!!target && (target.tagName === "INPUT" || target.tagName === "SELECT"));
      if (exportInProgress.current || e.defaultPrevented) return;
      // Radix menus/dialogs and dnd-kit own keyboard navigation while active.
      if (target?.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"], [role="tablist"], [aria-roledescription="sortable"]')) return;

      if (e.key === "Escape") {
        setSelectedElement(null);
        if (target && "blur" in target && typeof target.blur === "function") target.blur();
        return;
      }

      // Undo/redo belongs to the text field while one is focused.
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y")) {
        if (inTextField) return;
        e.preventDefault();
        if (e.key === "y" || e.key === "Y" || e.shiftKey) redo();
        else undo();
        return;
      }

      // Arrow keys, deletion etc. keep their native meaning inside any input.
      if (inControl) return;

      if (!currentSlides.length) return;
      const idx = activeSlide ? currentSlides.findIndex((s) => s.id === activeSlide.id) : -1;
      if (e.key === "ArrowDown" || (e.key === "j" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.min(currentSlides.length - 1, idx + 1)];
        if (next) setActiveSlideId(next.id);
      } else if (e.key === "ArrowUp" || (e.key === "k" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.max(0, idx - 1)];
        if (next) setActiveSlideId(next.id);
      } else if ((e.key === "d" || e.key === "D") && (e.metaKey || e.ctrlKey)) {
        if (activeSlide) {
          e.preventDefault();
          duplicateSlide(activeSlide.id);
        }
      } else if ((e.key === "Backspace" || e.key === "Delete") && (e.metaKey || e.ctrlKey)) {
        if (activeSlide) {
          e.preventDefault();
          deleteSlide(activeSlide.id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlide, currentSlides, duplicateSlide, deleteSlide, exporting, undo, redo]);

  // ---------- Export ----------

  async function exportAll() {
    if (exportInProgress.current) return;
    exportInProgress.current = true;
    setExporting("Preparing…");
    setExportProject(state);
    try {
      await generateBundle();
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setExportLocaleOverride(null);
      setExportProject(null);
      setExporting(null);
      exportInProgress.current = false;
    }
  }

  async function generateBundle() {
    if (!currentSlides.length) {
      toast.error("No screens to export");
      return;
    }

    const sizes = getExportSizes(state.device, state.orientation);
    if (!sizes.length) {
      toast.error("Nothing to export");
      return;
    }
    const locales = state.locales;
    const exportPaths = deckAssetPaths(state, state.device);
    await preloadImages(exportPaths, { retryFailed: true });
    const missingPaths = exportPaths.filter(didFail);
    if (missingPaths.length) {
      throw new Error(`Images could not be loaded: ${missingPaths.slice(0, 3).join(", ")}`);
    }
    await waitForPaint();

    const { missing, reusedBack, mismatched } = screenshotIssues(state);
    if (missing > 0 || reusedBack > 0 || mismatched > 0) {
      const details = [
        missing
          ? `${missing} screen${missing === 1 ? "" : "s"} will export with an empty device.`
          : null,
        reusedBack
          ? `${reusedBack} two-device screen${reusedBack === 1 ? "" : "s"} will reuse the primary screenshot in back.`
          : null,
        mismatched
          ? `${mismatched} screen${mismatched === 1 ? "" : "s"} use${mismatched === 1 ? "s" : ""} a capture that doesn't match its iPhone Duo display, so it is letterboxed. Capture on that display.`
          : null,
      ].filter(Boolean);
      toast.warning(missing || reusedBack ? "Export includes placeholder screenshots" : "Check these screenshots", {
        description: details.join(" "),
        duration: 7000,
      });
    }

    // Make sure custom fonts are loaded before snapshot so typography in PNG
    // matches what's on screen.
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            // fonts.ready only covers faces already requested; explicitly load an
            // imported font so a not-yet-used face can't export as the fallback.
            if (fontId === "self-hosted") await document.fonts.load(`64px ${fontFamily}`);
            await document.fonts.ready;
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Font loading timed out")), 15000);
          }),
        ]);
      } catch {
        throw new Error("The screenshot font could not be loaded. Check the imported font file and connection, then retry.");
      } finally {
        clearTimeout(timeout);
      }
    }

    const { cW, cH } = canvasSize(state.device, state.orientation);
    const platform = platformOf(state.device);
    const zip = new JSZip();
    const totalUnits = sizes.length * locales.length * currentSlides.length;
    const totalRenders = locales.length * currentSlides.length;
    let render = 0;
    let okCount = 0;
    let failed = 0;
    const errors: string[] = [];
    const incomplete: string[] = [];

    // Render each slide once per locale at canvas resolution, then scale that
    // one render to every export size. The sizes are all scalings of the same
    // design, so re-rendering the DOM per size only added time. PNG encoding
    // runs in workers, so a screen encodes while the next one renders; waiting
    // for the previous screen first keeps at most one screen's pixels queued.
    let encoding: Promise<void> = Promise.resolve();
    for (const locale of locales) {
      setExportLocaleOverride(locale);
      await waitForPaint();

      for (let i = 0; i < currentSlides.length; i++) {
        const slide = currentSlides[i];
        render += 1;
        setExporting(`${render}/${totalRenders}`);
        setExportSlideIndex(i);
        await waitForPaint();
        const el = exportRef.current;
        if (!el) {
          await encoding;
          failed += sizes.length;
          errors.push(`${locale} screen ${i + 1}: render target missing`);
          continue;
        }
        const filename = `${String(i + 1).padStart(2, "0")}-${slide.layout}.png`;
        const label = `${locale} screen ${i + 1}`;
        const fail = (e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${label}: ${msg}`);
          console.error("Export failed", { slideId: slide.id, locale }, e);
        };
        let pngs: Promise<Uint8Array[]>;
        try {
          const rendered = await captureSlide(el, cW, cH);
          if (rendered.missingImages > 0) incomplete.push(label);
          pngs = Promise.all(sizes.map((size) => rendered.toPng(size.w, size.h)));
        } catch (e) {
          fail(e);
          await encoding;
          failed += sizes.length;
          continue;
        }
        // Attach rejection handling now: this screen can fail while the
        // previous screen is still encoding.
        const nextEncoding = pngs.then(
          (files) => {
            sizes.forEach((size, index) => {
              zip.file(`${platform}/${state.device}/${size.w}x${size.h}/${locale}/${filename}`, files[index]);
            });
            okCount += sizes.length;
          },
          (e) => {
            fail(e);
            failed += sizes.length;
          },
        );
        await encoding;
        encoding = nextEncoding;
      }
    }
    await encoding;

    setExporting("Bundling…");

    if (okCount > 0) {
      try {
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `${slugify(state.appName)}-${platform}-${state.device}-${stamp()}.zip`);
      } catch (e) {
        toast.error("Couldn't bundle export");
        console.error(e);
        return;
      }
    }

    if (incomplete.length > 0) {
      toast.warning("Some screenshots may be missing from the export", {
        description: `${incomplete.slice(0, 3).join(", ")}${incomplete.length > 3 ? "…" : ""}: a screenshot never finished rendering. Check those files, or export again.`,
        duration: 12000,
      });
    }

    const summary = `${locales.length} locale${locales.length === 1 ? "" : "s"} × ${sizes.length} size${sizes.length === 1 ? "" : "s"}`;
    if (failed === 0) {
      toast.success(`Exported ${okCount} PNGs (${summary})`);
    } else if (okCount === 0) {
      toast.error(`All ${failed} renders failed`, {
        description: errors.slice(0, 3).join("\n"),
      });
    } else {
      toast.error(`${failed} of ${totalUnits} renders failed`, {
        description: errors.slice(0, 3).join("\n"),
      });
    }
  }

  async function captureSlide(el: HTMLElement, sourceW: number, sourceH: number) {
    // html-to-image needs the node at (0,0) and untransformed. Each export size
    // is a scaled draw of this one render, so aspect ratios that differ by a few
    // pixels are cover-scaled rather than leaving transparent gutters.
    const prev = {
      left: el.style.left,
      top: el.style.top,
      position: el.style.position,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
      zIndex: el.style.zIndex,
    };
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.position = "absolute";
    el.style.transform = "none";
    el.style.transformOrigin = "top left";
    el.style.zIndex = "-1";
    try {
      return await renderSlide(el, sourceW, sourceH);
    } finally {
      el.style.left = prev.left || "-99999px";
      el.style.top = prev.top || "0px";
      el.style.position = prev.position || "absolute";
      el.style.transform = prev.transform;
      el.style.transformOrigin = prev.transformOrigin;
      el.style.zIndex = prev.zIndex;
    }
  }

  // ---------- Render ----------

  if (!hydrated || !ready || !framesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  const busy = !!exporting;
  const exportState = exportProject ?? state;
  const exportSlides = exportState.slidesByDevice[exportState.device] || [];
  const exportCanvas = canvasSize(exportState.device, exportState.orientation);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Toaster position="bottom-center" richColors closeButton />
      <Toolbar
        appName={state.appName}
        setAppName={(v) => setState((p) => ({ ...p, appName: v }))}
        themeId={state.themeId}
        setThemeId={(v) => setState((p) => ({ ...p, themeId: v }))}
        connectedCanvas={state.connectedCanvas}
        setConnectedCanvas={(v) => setState((p) => ({ ...p, connectedCanvas: v }))}
        scene={state.scene}
        setScene={(scene) => setState((p) => ({ ...p, scene }))}
        onOpenStyleLab={() => setStyleLabOpen(true)}
        fontId={fontId}
        setFontId={(v) => setState((p) => ({ ...p, fontId: v }))}
        importedFont={state.importedFont}
        setImportedFont={(importedFont) => setState((p) => ({ ...p, fontId: "self-hosted", importedFont }))}
        locale={state.locale}
        setLocale={(v) => setState((p) => ({ ...p, locale: v }), { history: false })}
        locales={state.locales}
        device={state.device}
        setDevice={(v) => setState((p) => ({ ...p, device: v, orientation: orientationOf(v, p.orientation) }), { history: false })}
        orientation={state.orientation}
        // A Duo orientation is its own deck: switching opens it rather than
        // re-laying out the current one, so both compositions survive.
        setOrientation={(v) => setState((p) => ({ ...p, orientation: v, device: deviceForOrientation(p.device, v) }), { history: false })}
        onExport={exportAll}
        onResetAll={() => {
          reset();
          setActiveSlideId(null);
          toast.success("Reset all devices to defaults");
        }}
        onResetDevice={() => {
          resetDevice(state.device);
          setActiveSlideId(null);
          toast.success(`Reset ${state.device} to defaults`);
        }}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        exporting={exporting}
        savedAt={savedAt}
        saveError={saveError}
        onRetrySave={retrySave}
        busy={busy}
      />

      <div inert={busy} aria-busy={busy} className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="lg:w-72 w-full shrink-0 border-r bg-card lg:max-h-none max-h-64 overflow-hidden">
          <Sidebar
            slides={currentSlides}
            activeId={activeSlide?.id || null}
            device={state.device}
            orientation={state.orientation}
            theme={theme}
            locale={state.locale}
            appName={state.appName}
            appIcon={state.appIcon}
            fontFamily={fontFamily}
            connectedCanvas={state.connectedCanvas}
            scene={state.scene}
            disabled={busy}
            onReorder={reorderSlides}
            onSelect={setActiveSlideId}
            onDelete={deleteSlide}
            onDuplicate={duplicateSlide}
            onAdd={addSlide}
          />
        </aside>

        <main className="flex h-[26rem] shrink-0 items-stretch overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          {activeSlide && currentSlides.length > 0 ? (
            <PreviewStage
              slides={currentSlides}
              activeSlideId={activeSlide.id}
              device={state.device}
              orientation={state.orientation}
              theme={theme}
              locale={state.locale}
              appName={state.appName}
              appIcon={state.appIcon}
              fontFamily={fontFamily}
              connectedCanvas={state.connectedCanvas}
              scene={state.scene}
              selectedElement={selectedElement}
              onActiveSlideChange={setActiveSlideId}
              onLabelChange={(slideId, v) => patchLocalized(slideId, "label", v)}
              onHeadlineChange={(slideId, v) => patchLocalized(slideId, "headline", v)}
              onTextElementTextChange={patchTextElementText}
              onElementChange={patchElementTransform}
              onSelectElement={setSelectedElement}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No screen selected</p>
              <p>Add a screen on the left to get started.</p>
            </div>
          )}
        </main>

        <aside className="lg:w-80 w-full shrink-0 border-l bg-card lg:max-h-none max-h-96 overflow-hidden">
          {activeSlide ? (
            <Inspector
              key={`${state.device}:${activeSlide.id}`}
              slide={activeSlide}
              device={state.device}
              orientation={state.orientation}
              theme={theme}
              locale={state.locale}
              appIcon={state.appIcon}
              onAppIconChange={(appIcon) => setState((p) => ({ ...p, appIcon }))}
              selectedElementId={
                selectedElement?.slideId === activeSlide.id ? selectedElement.elementId : null
              }
              onChange={(patch) => updateSlide(activeSlide.id, () => patch)}
              onUpdate={(update) => updateSlide(activeSlide.id, update)}
              onSelectElement={(elementId) =>
                setSelectedElement(
                  elementId ? { slideId: activeSlide.id, elementId } : null,
                )
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nothing to inspect</p>
              <p className="text-xs">Screen settings will appear here once you add or select one.</p>
            </div>
          )}
        </aside>
      </div>

      <StyleLab
        open={styleLabOpen}
        onOpenChange={setStyleLabOpen}
        state={state}
        onApply={(next, look) => {
          setState(next, { coalesce: false });
          setSelectedElement(null);
          toast.success(`Applied ${look.name}`, {
            action: {
              label: "Undo",
              onClick: () => {
                // Only undo the look itself, never an edit made after it.
                if (latestState.current === next) undo();
                else toast("Use the toolbar Undo", { description: "You've edited the deck since applying this look." });
              },
            },
            duration: 8000,
          });
        }}
        onSavedLooksChange={(savedLooks) =>
          // A look library, not a deck edit: keep it out of undo history.
          setState((p) => ({ ...p, savedLooks: savedLooks.length ? savedLooks : undefined }), { history: false })
        }
      />

      {/* Off-screen export container — full-resolution canvases for html-to-image. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
      >
        {exportSlides.length > 0 && (
          <div
            ref={exportRef}
            style={{
              width: exportCanvas.cW,
              height: exportCanvas.cH,
              overflow: "hidden",
              position: "absolute",
              left: -99999,
              top: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -exportSlideIndex * exportCanvas.cW,
                top: 0,
                width: exportCanvas.cW * exportSlides.length,
                height: exportCanvas.cH,
              }}
            >
              <DeckCanvas
                slides={exportSlides}
                device={exportState.device}
                orientation={exportState.orientation}
                theme={themeById(exportState.themeId)}
                locale={exportLocaleOverride ?? exportState.locale}
                appName={exportState.appName}
                appIcon={exportState.appIcon}
                fontFamily={screenshotFontFamily(exportState.fontId)}
                connectedCanvas={exportState.connectedCanvas}
                scene={exportState.scene}
                hideEmpty
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Text fields and contenteditable text keep their native undo/redo, selection,
// and deletion. Sliders, colour pickers, checkboxes and buttons have no text
// history of their own, so the editor's shortcuts still apply while they're focused.
const NON_TEXT_INPUT_TYPES = new Set(["range", "color", "checkbox", "radio", "button", "submit", "reset", "file"]);

function isTextEditable(target: HTMLElement | null) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target.tagName === "INPUT") return !NON_TEXT_INPUT_TYPES.has((target as HTMLInputElement).type);
  return false;
}

// Registers the imported font in <head>, not inside the canvases: html-to-image
// embeds @font-face rules it finds in document.styleSheets, while a <style>
// cloned into the export SVG would point at a URL the SVG image can't load.
function useImportedFontFace(font: ImportedFont | undefined) {
  React.useEffect(() => {
    if (!font) return;
    const style = document.createElement("style");
    style.dataset.importedScreenshotFont = "";
    style.textContent = `@font-face { font-family: "${IMPORTED_FONT_FAMILY}"; src: url("${font.src}") format("${font.format}"); font-display: block; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [font?.src, font?.format]);
}

// Measures any Apple bezels the user added to public/frames/ before the
// first Duo frame renders. Missing files are normal; the drawn frame is used.
function useFrameAssets() {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch("/api/frames", { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const json = (await resp.json()) as {
          ok: boolean;
          frames?: Partial<Record<FrameFile, MeasuredFrame>>;
          errors?: Partial<Record<FrameFile, string>>;
        };
        if (cancelled) return;
        setFrameAssets(json.frames ?? {});
        const errors = Object.values(json.errors ?? {});
        if (errors.length) {
          toast.warning("A device bezel couldn't be used", {
            description: `${errors.join("\n")}\nThe drawn frame is shown instead.`,
            duration: 12000,
          });
        }
      } catch {
        // No frames route (e.g. a static build): the drawn frames still work.
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);
  return loaded;
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

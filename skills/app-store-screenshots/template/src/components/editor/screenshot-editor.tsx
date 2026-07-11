"use client";
import * as React from "react";
import { Toaster, toast } from "sonner";
import {
  hasTheme,
  supportsLandscape,
} from "@/lib/constants";
import {
  addLayer as addLayerCommand,
  addSlide as addSlideCommand,
  alignLayers as alignLayersCommand,
  demoteMaster as demoteMasterCommand,
  duplicateSlide as duplicateSlideCommand,
  fromLayerElementId,
  groupLayers as groupLayersCommand,
  linkLayerToNextSlide as linkLayerToNextSlideCommand,
  nudgeLayers as nudgeLayersCommand,
  patchElementTransform as patchElementTransformCommand,
  patchLayer as patchLayerCommand,
  patchSlide as patchSlideCommand,
  promoteToMaster as promoteToMasterCommand,
  removeLayers as removeLayersCommand,
  removeSlide as removeSlideCommand,
  setSlides,
  ungroupLayers as ungroupLayersCommand,
  type Alignment,
} from "@/lib/editor-commands";
import { preloadImages } from "@/lib/image-cache";
import { resolveScreenshot, writeLocalized } from "@/lib/locale";
import { getSlides, updateSlides } from "@/lib/project-model";
import { useProject } from "@/lib/storage";
import { activeTheme } from "@/lib/theme-model";
import type {
  ElementId,
  ElementTransform,
  SelectedElement,
  Slide,
  VisualLayer,
} from "@/lib/types";
import { Inspector } from "./inspector";
import { PreviewStage } from "./preview-stage";
import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";
import { ExportTargetSurface, useProjectExport } from "./use-project-export";

export function ScreenshotEditor() {
  const { state, setState, hydrated, savedAt, saveError, reset, resetDevice, undo, redo } = useProject();
  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElements, setSelectedElements] = React.useState<SelectedElement[]>([]);
  const [ready, setReady] = React.useState(false);

  const currentSlides = getSlides(state);
  const activeSlide =
    currentSlides.find((s) => s.id === activeSlideId) || currentSlides[0] || null;
  const theme = activeTheme(state);

  React.useEffect(() => {
    setSelectedElements((current) => current.filter((selection) => selection.scope === "master" || selection.slideId === activeSlide?.id));
  }, [activeSlide?.id]);

  const selectElement = React.useCallback((selection: SelectedElement | null, additive = false) => {
    if (!selection) {
      setSelectedElements([]);
      return;
    }
    setSelectedElements((current) => {
      const exists = current.some((item) => item.slideId === selection.slideId && item.elementId === selection.elementId && (item.scope || "slide") === (selection.scope || "slide"));
      if (!additive) return [selection];
      return exists
        ? current.filter((item) => !(item.slideId === selection.slideId && item.elementId === selection.elementId && (item.scope || "slide") === (selection.scope || "slide")))
        : [...current, selection];
    });
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!activeSlide && currentSlides.length > 0) {
      setActiveSlideId(currentSlides[0].id);
    }
  }, [hydrated, currentSlides, activeSlide]);

  React.useEffect(() => {
    if (!supportsLandscape(state.device) && state.orientation !== "portrait") {
      setState((p) => ({ ...p, orientation: "portrait" }));
    }
  }, [state.device, state.orientation, setState]);

  React.useEffect(() => {
    if (hydrated && state.themeId && !hasTheme(state.themeId, state.customThemes)) {
      toast.warning("Using fallback theme", {
        description: `Theme "${state.themeId}" is not defined in src/lib/constants.ts.`,
        duration: 8000,
      });
    }
  }, [hydrated, state.customThemes, state.themeId]);

  const assetPaths = React.useMemo(() => {
    const paths = new Set<string>();
    paths.add("/mockup.png");
    if (state.appIcon) paths.add(state.appIcon);
    // Preload every locale variant so bulk export doesn't race image loads.
    const allSlides: Slide[] = state.variants.flatMap((variant) =>
      Object.values(variant.slidesByDevice).flat(),
    );
    for (const s of allSlides) {
      for (const raw of [s.screenshot, s.screenshotSecondary]) {
        if (!raw || raw.startsWith("data:")) continue;
        if (raw.includes("{locale}")) {
          for (const loc of state.locales) paths.add(resolveScreenshot(raw, loc));
        } else {
          paths.add(raw);
        }
      }
    }
    return Array.from(paths).sort();
  }, [state.variants, state.appIcon, state.locales]);
  const assetSig = assetPaths.join("|");
  const projectExport = useProjectExport({ state, theme, assetPaths });

  React.useEffect(() => {
    if (!hydrated) return;
    preloadImages(assetPaths).finally(() => setReady(true));
    // assetPaths is derived from assetSig; depending on the string keeps the
    // effect from re-firing when slidesByDevice churns without path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, assetSig]);

  // Surface storage failures (quota exceeded etc.) so the user knows their work isn't safe.
  React.useEffect(() => {
    if (saveError) {
      toast.error("Couldn't load or save project file", {
        description: saveError,
        duration: 8000,
      });
    }
  }, [saveError]);

  // ---------- Mutations ----------

  const patchSlide = React.useCallback(
    (id: string, patch: Partial<Slide>) => {
      setState((previous) => patchSlideCommand(previous, id, patch));
    },
    [setState],
  );

  const reorderSlides = React.useCallback(
    (next: Slide[]) => {
      setState((previous) => setSlides(previous, next));
    },
    [setState],
  );

  const deleteSlide = React.useCallback(
    (id: string) => {
      const dev = state.device;
      const slides = getSlides(state, dev);
      const idx = slides.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const snap = slides[idx];
      const fallback = slides[idx + 1] || slides[idx - 1] || null;

      setState((previous) => removeSlideCommand(previous, id, dev));
      setActiveSlideId((cur) => (cur === id ? fallback?.id || null : cur));

      toast("Screen deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            setState((prev) => {
              const cur = getSlides(prev, dev);
              if (cur.some((s) => s.id === snap.id)) return prev;
              const restored = [...cur.slice(0, idx), snap, ...cur.slice(idx)];
              return setSlides(prev, restored, dev);
            });
            setActiveSlideId(snap.id);
          },
        },
        duration: 6000,
      });
    },
    [setState, state],
  );

  const addSlide = React.useCallback(
    (slide: Slide) => {
      setState((previous) => addSlideCommand(previous, slide));
      setActiveSlideId(slide.id);
    },
    [setState],
  );

  const patchLocalized = React.useCallback(
    (slide: Slide, key: "label" | "headline", value: string) => {
      patchSlide(slide.id, {
        [key]: writeLocalized(slide[key], state.locale, value),
      } as Partial<Slide>);
    },
    [patchSlide, state.locale],
  );

  const patchElementTransform = React.useCallback(
    (slideId: string, elementId: ElementId, transform: ElementTransform) => {
      setState((previous) =>
        patchElementTransformCommand(previous, slideId, elementId, transform),
      );
    },
    [setState],
  );

  const patchVisualLayer = React.useCallback(
    (slideId: string, scope: "slide" | "master", layerId: string, patch: Partial<VisualLayer>) => {
      setState((previous) => {
        if (scope === "master") {
          return {
            ...previous,
            masterLayers: previous.masterLayers.map((layer) =>
              layer.id === layerId ? { ...layer, ...patch } as typeof layer : layer,
            ),
          };
        }
        return patchLayerCommand(previous, slideId, layerId, patch);
      });
    },
    [setState],
  );

  const addVisualLayer = React.useCallback(
    (layer: VisualLayer) => {
      if (!activeSlide) return;
      setState((previous) => addLayerCommand(previous, activeSlide.id, layer));
    },
    [activeSlide, setState],
  );

  const deleteVisualLayers = React.useCallback(
    (layerIds: string[]) => {
      if (!activeSlide || !layerIds.length) return;
      setState((previous) => removeLayersCommand(previous, activeSlide.id, layerIds));
      setSelectedElements((current) => current.filter((selection) => {
        const id = fromLayerElementId(selection.elementId);
        return !id || !layerIds.includes(id);
      }));
    },
    [activeSlide, setState],
  );

  const groupVisualLayers = React.useCallback(
    (layerIds: string[]) => {
      if (!activeSlide) return;
      setState((previous) => groupLayersCommand(previous, activeSlide.id, layerIds));
    },
    [activeSlide, setState],
  );

  const ungroupVisualLayers = React.useCallback(
    (layerIds: string[]) => {
      if (!activeSlide) return;
      setState((previous) => ungroupLayersCommand(previous, activeSlide.id, layerIds));
    },
    [activeSlide, setState],
  );

  const alignVisualLayers = React.useCallback(
    (layerIds: string[], alignment: Alignment) => {
      if (!activeSlide) return;
      setState((previous) => alignLayersCommand(previous, activeSlide.id, layerIds, alignment));
    },
    [activeSlide, setState],
  );

  const linkVisualLayer = React.useCallback(
    (layerId: string) => {
      if (!activeSlide) return;
      setState((previous) => linkLayerToNextSlideCommand(previous, activeSlide.id, layerId));
      toast.success("Layer linked to the next screen");
    },
    [activeSlide, setState],
  );

  const promoteVisualLayer = React.useCallback(
    (layerId: string) => {
      if (!activeSlide) return;
      setState((previous) => promoteToMasterCommand(previous, activeSlide.id, layerId));
      setSelectedElements([]);
    },
    [activeSlide, setState],
  );

  const demoteMasterLayer = React.useCallback(
    (layerId: string) => {
      if (!activeSlide) return;
      setState((previous) => demoteMasterCommand(previous, layerId, activeSlide.id));
      setSelectedElements([]);
    },
    [activeSlide, setState],
  );

  const patchTextElementText = React.useCallback(
    (slideId: string, textId: string, value: string) => {
      setState((prev) => updateSlides(prev, prev.device, (slides) =>
        slides.map((slide) =>
            slide.id === slideId
              ? {
                  ...slide,
                  textElements: (slide.textElements || []).map((element) =>
                    element.id === textId
                      ? { ...element, text: writeLocalized(element.text, prev.locale, value) }
                      : element,
                  ),
                }
              : slide,
        ),
      ));
    },
    [setState],
  );

  const duplicateSlide = React.useCallback(
    (id: string) => {
      let newId: string | null = null;
      setState((prev) => {
        const result = duplicateSlideCommand(prev, id);
        newId = result.slideId;
        return result.state;
      });
      if (newId) setActiveSlideId(newId);
    },
    [setState],
  );

  // ---------- Keyboard shortcuts ----------

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);
      if (projectExport.progress) return;

      if (e.key === "Escape") {
        setSelectedElements([]);
        if (target && "blur" in target && typeof target.blur === "function") target.blur();
        return;
      }

      // Let focused inputs and contenteditable text keep their native undo,
      // redo, selection, and deletion behavior.
      if (inEditable) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      const selectedLayerIds = selectedElements.flatMap((selection) => {
        if ((selection.scope || "slide") !== "slide" || selection.slideId !== activeSlide?.id) return [];
        const layerId = fromLayerElementId(selection.elementId);
        return layerId ? [layerId] : [];
      });
      if (activeSlide && selectedLayerIds.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
        const dy = e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
        setState((previous) => nudgeLayersCommand(previous, activeSlide.id, selectedLayerIds, dx, dy));
        return;
      }
      if (activeSlide && selectedLayerIds.length && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        deleteVisualLayers(selectedLayerIds);
        return;
      }
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
  }, [activeSlide, currentSlides, deleteSlide, deleteVisualLayers, duplicateSlide, projectExport.progress, redo, selectedElements, setState, undo]);

  // ---------- Render ----------

  if (!hydrated || !ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  const busy = !!projectExport.progress;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toaster position="top-right" richColors closeButton />
      <Toolbar
        appName={state.appName}
        setAppName={(v) => setState((p) => ({ ...p, appName: v }))}
        connectedCanvas={state.connectedCanvas}
        setConnectedCanvas={(v) => setState((p) => ({ ...p, connectedCanvas: v }))}
        locale={state.locale}
        setLocale={(v) => setState((p) => ({ ...p, locale: v }))}
        locales={state.locales}
        device={state.device}
        setDevice={(v) => setState((p) => ({ ...p, device: v }))}
        orientation={state.orientation}
        setOrientation={(v) => setState((p) => ({ ...p, orientation: v }))}
        onExport={projectExport.exportAll}
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
        exporting={projectExport.progress}
        savedAt={savedAt}
        saveError={saveError}
        busy={busy}
        project={state}
        updateProject={(update) => setState(update)}
      />

      <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
        <aside className="md:w-72 w-full shrink-0 border-r bg-card md:max-h-none max-h-64 overflow-hidden">
          <Sidebar
            slides={currentSlides}
            activeId={activeSlide?.id || null}
            device={state.device}
            orientation={state.orientation}
            theme={theme}
            locale={state.locale}
            appName={state.appName}
            appIcon={state.appIcon}
            connectedCanvas={state.connectedCanvas}
            disabled={busy}
            onReorder={reorderSlides}
            onSelect={setActiveSlideId}
            onDelete={deleteSlide}
            onDuplicate={duplicateSlide}
            onAdd={addSlide}
          />
        </aside>

        <main className="flex flex-1 items-stretch overflow-hidden min-h-0">
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
              connectedCanvas={state.connectedCanvas}
              masterLayers={state.masterLayers}
              canvasSettings={state.canvasSettings}
              selectedElements={selectedElements}
              onActiveSlideChange={setActiveSlideId}
              onLabelChange={(slide, v) => patchLocalized(slide, "label", v)}
              onHeadlineChange={(slide, v) => patchLocalized(slide, "headline", v)}
              onTextElementTextChange={patchTextElementText}
              onElementChange={patchElementTransform}
              onLayerChange={patchVisualLayer}
              onSelectElement={selectElement}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No screen selected</p>
              <p>Add a screen on the left to get started.</p>
            </div>
          )}
        </main>

        <aside className="md:w-80 w-full shrink-0 border-l bg-card md:max-h-none max-h-96 overflow-hidden">
          {activeSlide ? (
            <Inspector
              slide={activeSlide}
              device={state.device}
              orientation={state.orientation}
              locale={state.locale}
              masterLayers={state.masterLayers}
              selectedElements={selectedElements}
              onChange={(patch) => patchSlide(activeSlide.id, patch)}
              onSelectionChange={(selection, additive) => {
                if (additive) selectElement(selection[0] || null, true);
                else setSelectedElements(selection);
              }}
              onAddLayer={addVisualLayer}
              onPatchLayer={(scope, layerId, patch) => patchVisualLayer(activeSlide.id, scope, layerId, patch)}
              onDeleteLayers={deleteVisualLayers}
              onGroup={groupVisualLayers}
              onUngroup={ungroupVisualLayers}
              onAlign={alignVisualLayers}
              onLinkNext={linkVisualLayer}
              onPromote={promoteVisualLayer}
              onDemote={demoteMasterLayer}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nothing to inspect</p>
              <p className="text-xs">Screen settings will appear here once you add or select one.</p>
            </div>
          )}
        </aside>
      </div>

      <ExportTargetSurface state={state} target={projectExport.target} exportRef={projectExport.exportRef} />

    </div>
  );
}

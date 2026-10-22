"use client";
import * as React from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREATIVE_SPECS, DEVICE_LABEL, centredCrop, layoutLabel } from "@/lib/constants";
import type {
  Device,
  ElementId,
  ElementTransform,
  Orientation,
  Scene,
  SelectedElement,
  Slide,
  Theme,
} from "@/lib/types";
import { DeckCanvas, SlideCanvas, getCanvas } from "./slide-canvas";

type Props = {
  slides: Slide[];
  activeSlideId: string | null;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily: string;
  connectedCanvas: boolean;
  scene?: Scene;
  selectedElement: SelectedElement | null;
  onActiveSlideChange: (id: string) => void;
  onLabelChange: (slide: Slide, v: string) => void;
  onHeadlineChange: (slide: Slide, v: string) => void;
  onTextElementTextChange: (slideId: string, id: string, v: string) => void;
  onElementChange: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement: (element: SelectedElement | null) => void;
  onDeleteDevice?: (slideId: string, id: "device" | "deviceSecondary") => void;
  onDeleteElement?: (slideId: string, id: ElementId) => void;
};

// Fits one full-resolution screen inside the viewport while keeping the whole
// deck horizontally scrollable as one connected canvas.
export function PreviewStage({
  slides,
  activeSlideId,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  connectedCanvas,
  scene,
  selectedElement,
  onActiveSlideChange,
  onLabelChange,
  onHeadlineChange,
  onTextElementTextChange,
  onElementChange,
  onSelectElement,
  onDeleteDevice,
  onDeleteElement,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const suppressNextActiveScreenPanRef = React.useRef(false);
  const [fitScale, setFitScale] = React.useState(0.2);
  const [zoom, setZoom] = React.useState(1);
  const { cW, cH } = getCanvas(device, orientation);
  const totalW = Math.max(1, slides.length) * cW;
  const scale = fitScale * zoom;
  const activeIndex = Math.max(0, slides.findIndex((slide) => slide.id === activeSlideId));
  const activeSlide = slides[activeIndex] || slides[0] || null;
  const activeId = activeSlide?.id;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const sx = (rect.width - 96) / cW;
      const sy = (rect.height - 96) / cH;
      setFitScale(Math.max(0.05, Math.min(sx, sy)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cW, cH]);

  React.useEffect(() => {
    setZoom(1);
  }, [device, orientation]);

  const panToActiveScreen = React.useCallback((nextScale: number) => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeId) return;
    const screenLeft = activeIndex * cW * nextScale;
    const screenWidth = cW * nextScale;
    const targetLeft = Math.max(0, screenLeft - (scroller.clientWidth - screenWidth) / 2);
    scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [activeIndex, activeId, cW]);

  React.useEffect(() => {
    if (suppressNextActiveScreenPanRef.current) {
      suppressNextActiveScreenPanRef.current = false;
      return;
    }
    panToActiveScreen(scale);
  }, [panToActiveScreen, scale]);

  const handleCanvasActiveSlideChange = React.useCallback(
    (id: string) => {
      if (id !== activeSlideId) {
        suppressNextActiveScreenPanRef.current = true;
      }
      onActiveSlideChange(id);
    },
    [activeSlideId, onActiveSlideChange],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(70%_70%_at_50%_35%,_hsl(var(--background))_0%,_hsl(var(--muted))_100%)]"
    >
      <div ref={scrollerRef} className="h-full w-full overflow-auto p-12">
        <div
          style={{
            width: totalW * scale,
            height: cH * scale,
            position: "relative",
            flexShrink: 0,
            filter: "drop-shadow(0 32px 42px rgba(15, 23, 42, 0.18))",
          }}
        >
          <div
            style={{
              width: totalW,
              height: cH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <DeckCanvas
              slides={slides}
              device={device}
              orientation={orientation}
              theme={theme}
              locale={locale}
              appName={appName}
              appIcon={appIcon}
              fontFamily={fontFamily}
              connectedCanvas={connectedCanvas}
              scene={scene}
              editable
              previewScale={scale}
              selectedElement={selectedElement}
              activeSlideId={activeSlide?.id || null}
              showGuides
              edit={{
                onLabelChange: (slideId, value) => {
                  const slide = slides.find((s) => s.id === slideId);
                  if (slide) onLabelChange(slide, value);
                },
                onHeadlineChange: (slideId, value) => {
                  const slide = slides.find((s) => s.id === slideId);
                  if (slide) onHeadlineChange(slide, value);
                },
                onTextElementTextChange,
                onElementChange,
                onSelectElement,
                onSelectScreen: handleCanvasActiveSlideChange,
                onDeleteDevice,
                onDeleteElement,
              }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        <span className="font-medium text-foreground">{DEVICE_LABEL[device]}</span>
        {activeSlide && (
          <>
            <span aria-hidden>·</span>
            <span>Screen {activeIndex + 1}</span>
            <span aria-hidden>·</span>
            <span>{layoutLabel(activeSlide.layout, device)}</span>
          </>
        )}
        {orientation === "landscape" && (
          <>
            <span aria-hidden>·</span>
            <span>landscape</span>
          </>
        )}
        {!connectedCanvas && (
          <>
            <span aria-hidden>·</span>
            <span>isolated</span>
          </>
        )}
      </div>

      {device === "creative-universal" && activeSlide && (
        <PlacementPreviews
          slide={activeSlide}
          index={activeIndex}
          count={slides.length}
          device={device}
          orientation={orientation}
          theme={theme}
          locale={locale}
          appName={appName}
          appIcon={appIcon}
          fontFamily={fontFamily}
          scene={scene}
        />
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-md bg-background/85 px-1.5 py-1 text-[10px] tabular-nums text-muted-foreground shadow-sm backdrop-blur">
        <span className="px-1">{slides.length}× {cW}×{cH}</span>
        <span aria-hidden className="text-border">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.1).toFixed(2))))}
          disabled={zoom <= 0.25}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-10 text-center">{(scale * 100).toFixed(0)}%</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}
          disabled={zoom >= 2}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setZoom(1);
            panToActiveScreen(fitScale);
          }}
          title="Fit active screen"
          aria-label="Fit active screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// How the active universal creative reads in each App Store placement, using
// the same estimated crops as the canvas guides. Rendered like an export.
function PlacementPreviews({
  slide,
  index,
  count,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  fontFamily,
  scene,
}: {
  slide: Slide;
  index: number;
  count: number;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  fontFamily: string;
  scene?: Scene;
}) {
  const { cW, cH } = getCanvas(device, orientation);
  const crops = device === "creative-universal" ? CREATIVE_SPECS[device].crops : [];
  return (
    <div
      aria-label="Placement previews"
      className="pointer-events-none absolute bottom-4 left-4 hidden items-end gap-3 rounded-md bg-background/85 p-2 shadow-sm backdrop-blur md:flex"
    >
      {crops.map((crop) => {
        const r = centredCrop(cW, cH, crop.aspect);
        const width = crop.aspect > 2 ? 240 : 150;
        const k = width / r.w;
        return (
          <figure key={crop.label} className="space-y-1">
            <div className="relative overflow-hidden rounded-sm ring-1 ring-black/10" style={{ width, height: r.h * k }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: cW,
                  height: cH,
                  transform: `scale(${k}) translate(${-r.x}px, ${-r.y}px)`,
                  transformOrigin: "top left",
                }}
              >
                <SlideCanvas
                  slide={slide}
                  device={device}
                  orientation={orientation}
                  theme={theme}
                  locale={locale}
                  appName={appName}
                  appIcon={appIcon}
                  fontFamily={fontFamily}
                  scene={scene}
                  stripIndex={index}
                  stripCount={count}
                  hideEmpty
                />
              </div>
            </div>
            <figcaption className="text-[10px] text-muted-foreground">{crop.label.replace(" crop", "")} (estimated crop)</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

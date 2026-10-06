"use client";
import * as React from "react";
import { GalleryHorizontal, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEVICE_LABEL, LAYOUT_LABEL } from "@/lib/constants";
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
import { DeckCanvas, getCanvas } from "./slide-canvas";

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
};

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const PAD_X = 96;
const PAD_Y = 80 + 48;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));

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
      const sx = (rect.width - PAD_X) / cW;
      const sy = (rect.height - PAD_Y) / cH;
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

  // ⌘/Ctrl + wheel and trackpad pinch (reported as ctrl + wheel) zoom the deck.
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((value) => clampZoom(value * Math.exp(-e.deltaY * 0.01)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fitAllScreens = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const sx = (scroller.clientWidth - PAD_X) / (totalW * fitScale);
    const sy = (scroller.clientHeight - PAD_Y) / (cH * fitScale);
    setZoom(clampZoom(Math.min(1, sx, sy)));
  };

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
      <div ref={scrollerRef} className="h-full w-full overflow-auto px-12 pb-12 pt-20">
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
            <span>{LAYOUT_LABEL[activeSlide.layout]}</span>
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

      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-md bg-background/85 px-1.5 py-1 text-[10px] tabular-nums text-muted-foreground shadow-sm backdrop-blur">
        <span className="px-1">{slides.length}× {cW}×{cH}</span>
        <span aria-hidden className="text-border">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setZoom((value) => clampZoom(value / 1.25))}
          disabled={zoom <= MIN_ZOOM}
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
          onClick={() => setZoom((value) => clampZoom(value * 1.25))}
          disabled={zoom >= MAX_ZOOM}
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
          onClick={fitAllScreens}
          title="Fit all screens"
          aria-label="Fit all screens"
        >
          <GalleryHorizontal className="h-3.5 w-3.5" />
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

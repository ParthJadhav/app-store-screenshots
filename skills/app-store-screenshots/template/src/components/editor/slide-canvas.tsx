"use client";

import * as React from "react";
import { resolveScreenshot } from "@/lib/locale";
import type {
  BuiltInElementId,
  CanvasSettings,
  Device,
  ElementId,
  ElementTransform,
  MasterLayer,
  Orientation,
  SelectedElement,
  Slide,
  Theme,
  VisualLayer,
} from "@/lib/types";
import { Caption, CanvasOverlays, FeatureGraphic, SlideBackground } from "./canvas/slide-surface";
import { builtInRect, getCanvas, getElementTransform, slideGeometry } from "./canvas/layout-geometry";
import { Movable } from "./canvas/movable";
import { VisualLayerRenderer, type LayerScope } from "./canvas/visual-layer-renderer";

export { getCanvas, getElementTransform } from "./canvas/layout-geometry";

type EditHandlers = {
  onLabelChange?: (value: string) => void;
  onHeadlineChange?: (value: string) => void;
  onTextElementTextChange?: (id: string, value: string) => void;
  onElementChange?: (id: ElementId, transform: ElementTransform) => void;
  onLayerChange?: (scope: LayerScope, layerId: string, patch: Partial<VisualLayer>) => void;
  onSelectElement?: (id: ElementId | null, additive?: boolean, scope?: LayerScope) => void;
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, value: string) => void;
  onHeadlineChange?: (slideId: string, value: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, value: string) => void;
  onElementChange?: (slideId: string, id: ElementId, transform: ElementTransform) => void;
  onLayerChange?: (slideId: string, scope: LayerScope, layerId: string, patch: Partial<VisualLayer>) => void;
  onSelectElement?: (selection: SelectedElement | null, additive?: boolean) => void;
  onSelectScreen?: (slideId: string) => void;
};

type SlideCanvasProps = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  masterLayers?: MasterLayer[];
  canvasSettings?: CanvasSettings;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  selectedElements?: SelectedElement[];
  previewScale?: number;
  hideEmpty?: boolean;
};

type DeckCanvasProps = {
  slides: Slide[];
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  masterLayers?: MasterLayer[];
  canvasSettings?: CanvasSettings;
  connectedCanvas?: boolean;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  selectedElements?: SelectedElement[];
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
};

export function SlideCanvas({
  slide,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  masterLayers = [],
  canvasSettings,
  editable,
  edit,
  selectedElementId,
  selectedElements = [],
  previewScale = 1,
  hideEmpty,
}: SlideCanvasProps) {
  const selections = selectedElements.length
    ? selectedElements
    : selectedElementId
      ? [{ slideId: slide.id, elementId: selectedElementId }]
      : [];
  return (
    <DeckCanvas
      slides={[slide]}
      device={device}
      orientation={orientation}
      theme={theme}
      locale={locale}
      appName={appName}
      appIcon={appIcon}
      masterLayers={masterLayers}
      canvasSettings={canvasSettings}
      connectedCanvas={false}
      editable={editable}
      selectedElements={selections}
      activeSlideId={slide.id}
      previewScale={previewScale}
      hideEmpty={hideEmpty}
      edit={edit ? {
        onLabelChange: (_slideId, value) => edit.onLabelChange?.(value),
        onHeadlineChange: (_slideId, value) => edit.onHeadlineChange?.(value),
        onTextElementTextChange: (_slideId, id, value) => edit.onTextElementTextChange?.(id, value),
        onElementChange: (_slideId, id, transform) => edit.onElementChange?.(id, transform),
        onLayerChange: (_slideId, scope, layerId, layerPatch) => edit.onLayerChange?.(scope, layerId, layerPatch),
        onSelectElement: (selection, additive) => edit.onSelectElement?.(selection?.elementId || null, additive, selection?.scope || "slide"),
      } : undefined}
    />
  );
}

export function DeckCanvas({
  slides,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  masterLayers = [],
  canvasSettings,
  connectedCanvas = true,
  editable,
  edit,
  selectedElement,
  selectedElements = [],
  activeSlideId,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
}: DeckCanvasProps) {
  const { cW, cH } = getCanvas(device, orientation);
  const totalWidth = Math.max(1, slides.length) * cW;
  const selections = selectedElements.length
    ? selectedElements
    : selectedElement
      ? [selectedElement]
      : [];
  const visibleMasters = masterLayers.filter((layer) => !layer.devices?.length || layer.devices.includes(device));
  return (
    <div style={{ width: totalWidth, height: cH, position: "relative", overflow: "hidden" }}>
      {slides.map((slide, index) => (
        <ScreenSurface
          key={`${slide.id}-surface`}
          slide={slide}
          index={index}
          canvasWidth={cW}
          canvasHeight={cH}
          theme={theme}
          locale={locale}
          appName={appName}
          appIcon={appIcon}
          active={activeSlideId === slide.id}
          editable={editable}
          showGuides={showGuides}
          canvasSettings={canvasSettings}
          onHeadlineChange={(value) => edit?.onHeadlineChange?.(slide.id, value)}
          onSelect={() => {
            edit?.onSelectScreen?.(slide.id);
            edit?.onSelectElement?.(null);
          }}
        />
      ))}
      {slides.map((slide, index) => {
        if (device === "feature-graphic" || slide.layout === "feature-graphic") {
          return (
            <VisualLayerRenderer
              key={`${slide.id}-layers`}
              slide={slide}
              masterLayers={visibleMasters}
              theme={theme}
              locale={locale}
              editable={editable}
              previewScale={previewScale}
              selectedElements={selections}
              canvasSettings={canvasSettings}
              screenX={index * cW}
              boundsWidth={connectedCanvas ? totalWidth : cW}
              boundsHeight={cH}
              allowOverflow={connectedCanvas}
              onSelect={(selection, additive) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(selection, additive);
              }}
              onTransform={(scope, layerId, transform) => edit?.onLayerChange?.(slide.id, scope, layerId, { transform } as Partial<VisualLayer>)}
              onLayerChange={(scope, layerId, patch) => edit?.onLayerChange?.(slide.id, scope, layerId, patch)}
            />
          );
        }
        const content = (
          <SlideElements
            key={`${slide.id}-elements`}
            slide={slide}
            index={index}
            device={device}
            orientation={orientation}
            theme={theme}
            locale={locale}
            masterLayers={visibleMasters}
            canvasSettings={canvasSettings}
            editable={editable}
            selectedElements={selections}
            previewScale={previewScale}
            hideEmpty={hideEmpty}
            screenX={connectedCanvas ? index * cW : 0}
            boundsWidth={connectedCanvas ? totalWidth : cW}
            boundsHeight={cH}
            allowCrossScreen={connectedCanvas}
            edit={edit}
          />
        );
        if (connectedCanvas) return content;
        return <div key={`${slide.id}-isolated`} style={{ position: "absolute", left: index * cW, top: 0, width: cW, height: cH, overflow: "hidden" }}>{content}</div>;
      })}
    </div>
  );
}

function ScreenSurface({
  slide,
  index,
  canvasWidth,
  canvasHeight,
  theme,
  locale,
  appName,
  appIcon,
  active,
  editable,
  showGuides,
  canvasSettings,
  onHeadlineChange,
  onSelect,
}: {
  slide: Slide;
  index: number;
  canvasWidth: number;
  canvasHeight: number;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  active: boolean;
  editable?: boolean;
  showGuides: boolean;
  canvasSettings?: CanvasSettings;
  onHeadlineChange: (value: string) => void;
  onSelect: () => void;
}) {
  return (
    <div
      onMouseDown={(event) => {
        if (editable && event.target === event.currentTarget) onSelect();
      }}
      style={{ position: "absolute", left: index * canvasWidth, top: 0, width: canvasWidth, height: canvasHeight, overflow: "hidden" }}
    >
      {slide.layout === "feature-graphic" ? (
        <FeatureGraphic slide={slide} theme={theme} locale={locale} appName={appName} appIcon={appIcon} canvasWidth={canvasWidth} editable={editable} onHeadlineChange={onHeadlineChange} />
      ) : (
        <SlideBackground slide={slide} theme={theme} canvasWidth={canvasWidth} />
      )}
      {showGuides && <CanvasOverlays canvasWidth={canvasWidth} canvasHeight={canvasHeight} settings={canvasSettings} index={index} active={active} />}
    </div>
  );
}

function SlideElements({
  slide,
  device,
  orientation,
  theme,
  locale,
  masterLayers,
  canvasSettings,
  editable,
  selectedElements,
  previewScale,
  hideEmpty,
  screenX,
  boundsWidth,
  boundsHeight,
  allowCrossScreen,
  edit,
}: {
  slide: Slide;
  index: number;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  masterLayers: MasterLayer[];
  canvasSettings?: CanvasSettings;
  editable?: boolean;
  selectedElements: SelectedElement[];
  previewScale: number;
  hideEmpty?: boolean;
  screenX: number;
  boundsWidth: number;
  boundsHeight: number;
  allowCrossScreen: boolean;
  edit?: DeckEditHandlers;
}) {
  const { cW, cH, Frame, frameAspect, defaults } = slideGeometry(slide, device, orientation);
  const caption = builtInRect("caption", slide, defaults);
  const deviceRect = builtInRect("device", slide, defaults);
  const secondary = builtInRect("deviceSecondary", slide, defaults);
  const isSelected = (id: ElementId) => selectedElements.some((item) => item.slideId === slide.id && item.elementId === id);
  const select = (id: ElementId, additive: boolean) => {
    edit?.onSelectScreen?.(slide.id);
    edit?.onSelectElement?.({ slideId: slide.id, elementId: id }, additive);
  };
  const global = (rect: ElementTransform | { x: number; y: number; width: number; height: number }) => ({ ...rect, x: rect.x + screenX });
  const local = (transform: ElementTransform) => ({ ...transform, x: transform.x - screenX });
  const common = {
    boundsWidth,
    boundsHeight,
    editable,
    previewScale,
    allowOverflow: allowCrossScreen,
    canvasSettings,
  };

  const renderDevice = (id: BuiltInElementId, rect: typeof deviceRect, source: string, opacity = 1) => {
    if (!rect || id === "caption") return null;
    const saved = slide.transforms?.[id];
    const zIndex = saved?.zIndex || (id === "deviceSecondary" ? 2 : 3);
    return (
      <Movable
        key={id}
        {...common}
        rect={global(rect)}
        lockAspectRatio={frameAspect}
        rotation={saved?.rotation || 0}
        zIndex={zIndex}
        selected={isSelected(id)}
        onSelect={(additive) => select(id, additive)}
        onChange={(transform) => edit?.onElementChange?.(slide.id, id, local(transform))}
      >
        <Frame src={source} hideEmpty={hideEmpty} style={{ width: "100%", height: "100%", opacity }} />
      </Movable>
    );
  };

  return (
    <>
      {renderDevice("deviceSecondary", secondary, resolveScreenshot(slide.screenshotSecondary, locale) || resolveScreenshot(slide.screenshot, locale), 0.85)}
      {renderDevice("device", deviceRect, resolveScreenshot(slide.screenshot, locale))}
      {caption && (
        <Movable
          {...common}
          rect={global(caption)}
          rotation={slide.transforms?.caption?.rotation || 0}
          zIndex={slide.transforms?.caption?.zIndex || 4}
          selected={isSelected("caption")}
          onSelect={(additive) => select("caption", additive)}
          onChange={(transform) => edit?.onElementChange?.(slide.id, "caption", local(transform))}
        >
          <Caption
            slide={slide}
            theme={theme}
            locale={locale}
            canvasWidth={cW}
            canvasHeight={cH}
            align={caption.align || "center"}
            editable={editable}
            onLabelChange={(value) => edit?.onLabelChange?.(slide.id, value)}
            onHeadlineChange={(value) => edit?.onHeadlineChange?.(slide.id, value)}
            onFocus={() => select("caption", false)}
          />
        </Movable>
      )}
      <VisualLayerRenderer
        slide={slide}
        masterLayers={masterLayers}
        theme={theme}
        locale={locale}
        editable={editable}
        previewScale={previewScale}
        selectedElements={selectedElements}
        canvasSettings={canvasSettings}
        screenX={screenX}
        boundsWidth={boundsWidth}
        boundsHeight={boundsHeight}
        allowOverflow={allowCrossScreen}
        onSelect={(selection, additive) => {
          edit?.onSelectScreen?.(slide.id);
          edit?.onSelectElement?.(selection, additive);
        }}
        onTransform={(scope, layerId, transform) => edit?.onLayerChange?.(slide.id, scope, layerId, { transform } as Partial<VisualLayer>)}
        onLayerChange={(scope, layerId, patch) => edit?.onLayerChange?.(slide.id, scope, layerId, patch)}
      />
    </>
  );
}

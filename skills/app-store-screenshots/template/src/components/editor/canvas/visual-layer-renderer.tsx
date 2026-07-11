"use client";

import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot } from "@/lib/locale";
import type {
  CanvasSettings,
  ElementTransform,
  MasterLayer,
  SelectedElement,
  Slide,
  Theme,
  VisualLayer,
} from "@/lib/types";
import { toLayerElementId } from "@/lib/editor-commands";
import { Movable } from "./movable";
import { EditableText } from "./slide-surface";

export type LayerScope = "slide" | "master";

export function VisualLayerRenderer({
  slide,
  masterLayers,
  theme,
  locale,
  editable,
  previewScale,
  selectedElements,
  canvasSettings,
  screenX,
  boundsWidth,
  boundsHeight,
  allowOverflow,
  onSelect,
  onTransform,
  onLayerChange,
}: {
  slide: Slide;
  masterLayers?: MasterLayer[];
  theme: Theme;
  locale: string;
  editable?: boolean;
  previewScale: number;
  selectedElements: SelectedElement[];
  canvasSettings?: CanvasSettings;
  screenX: number;
  boundsWidth: number;
  boundsHeight: number;
  allowOverflow: boolean;
  onSelect?: (selection: SelectedElement, additive: boolean) => void;
  onTransform?: (scope: LayerScope, layerId: string, transform: ElementTransform) => void;
  onLayerChange?: (scope: LayerScope, layerId: string, patch: Partial<VisualLayer>) => void;
}) {
  const layers: Array<{ layer: VisualLayer | MasterLayer; scope: LayerScope }> = [
    ...(masterLayers || []).map((layer) => ({ layer, scope: "master" as const })),
    ...(slide.layers || []).map((layer) => ({ layer, scope: "slide" as const })),
  ];
  const groupById = new Map((slide.groups || []).map((group) => [group.id, group]));
  const allTransforms = layers.map(({ layer }) => ({ ...layer.transform, x: layer.transform.x + screenX }));

  return (
    <>
      {layers.map(({ layer, scope }, index) => {
        const group = scope === "slide" && layer.groupId ? groupById.get(layer.groupId) : undefined;
        const hidden = layer.hidden || group?.hidden;
        const locked = layer.locked || group?.locked;
        const selection: SelectedElement = { slideId: slide.id, elementId: toLayerElementId(layer.id), scope };
        const selected = selectedElements.some((item) => item.slideId === slide.id && item.elementId === selection.elementId && (item.scope || "slide") === scope);
        const globalTransform = { ...layer.transform, x: layer.transform.x + screenX };
        return (
          <Movable
            key={`${scope}-${layer.id}`}
            rect={globalTransform}
            boundsWidth={boundsWidth}
            boundsHeight={boundsHeight}
            editable={editable}
            previewScale={previewScale}
            zIndex={layer.transform.zIndex ?? 10 + index}
            rotation={layer.transform.rotation || 0}
            selected={selected}
            locked={locked}
            hidden={hidden}
            allowOverflow={allowOverflow}
            canvasSettings={canvasSettings}
            otherTransforms={allTransforms.filter((_transform, otherIndex) => otherIndex !== index)}
            onSelect={(additive) => onSelect?.(selection, additive)}
            onChange={(transform) => onTransform?.(scope, layer.id, { ...transform, x: transform.x - screenX })}
          >
            <LayerContent
              layer={layer}
              locale={locale}
              theme={theme}
              editable={editable && !locked}
              onChange={(patch) => onLayerChange?.(scope, layer.id, patch)}
            />
          </Movable>
        );
      })}
    </>
  );
}

function LayerContent({
  layer,
  locale,
  theme,
  editable,
  onChange,
}: {
  layer: VisualLayer | MasterLayer;
  locale: string;
  theme: Theme;
  editable?: boolean;
  onChange: (patch: Partial<VisualLayer>) => void;
}) {
  const opacity = layer.opacity ?? 1;
  if (layer.kind === "text") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", opacity }}>
        <EditableText
          value={pickText(layer.text, locale)}
          editable={editable}
          multiline
          onChange={(value) => onChange({ text: { ...layer.text, [locale]: value } } as Partial<VisualLayer>)}
          style={{
            width: "100%",
            color: layer.color || theme.fg,
            fontFamily: layer.fontFamily || theme.headlineFontFamily || theme.fontFamily,
            fontSize: layer.fontSize || 72,
            fontWeight: layer.fontWeight || 700,
            lineHeight: layer.lineHeight || 1.05,
            textAlign: layer.align || "center",
          }}
        />
      </div>
    );
  }
  if (layer.kind === "image") {
    const source = resolveScreenshot(layer.src, locale);
    return source ? (
      <img
        src={img(source)}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: layer.fit || "cover", borderRadius: layer.borderRadius || 0, boxShadow: layer.shadow, opacity }}
      />
    ) : (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", border: "4px dashed currentColor", borderRadius: layer.borderRadius || 16, color: theme.muted, opacity: Math.max(0.45, opacity) }}>Pick image</div>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity,
        background: layer.shape === "line" ? "transparent" : layer.fill || theme.accent,
        border: `${layer.strokeWidth || (layer.shape === "line" ? 8 : 0)}px solid ${layer.stroke || (layer.shape === "line" ? layer.fill || theme.accent : "transparent")}`,
        borderRadius: layer.shape === "ellipse" ? "50%" : layer.shape === "line" ? 999 : layer.borderRadius || theme.cornerRadius || 0,
        boxShadow: layer.shadow,
      }}
    />
  );
}

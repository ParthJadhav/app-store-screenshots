"use client";

import * as React from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Circle,
  Eye,
  EyeOff,
  Group,
  ImageIcon,
  Link2,
  Lock,
  PanelTop,
  Plus,
  Square,
  Trash2,
  Type,
  Ungroup,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fromLayerElementId, toLayerElementId, type Alignment } from "@/lib/editor-commands";
import { nid } from "@/lib/defaults";
import { pickText } from "@/lib/locale";
import type {
  MasterLayer,
  SelectedElement,
  Slide,
  TextLayer,
  VisualLayer,
} from "@/lib/types";
import { ScreenshotPicker } from "./screenshot-picker";

type Scope = "slide" | "master";

type Props = {
  slide: Slide;
  masterLayers: MasterLayer[];
  locale: string;
  canvasWidth: number;
  canvasHeight: number;
  selectedElements: SelectedElement[];
  onSelectionChange: (selection: SelectedElement[], additive?: boolean) => void;
  onAddLayer: (layer: VisualLayer) => void;
  onPatchLayer: (scope: Scope, layerId: string, patch: Partial<VisualLayer>) => void;
  onDeleteLayers: (layerIds: string[]) => void;
  onGroup: (layerIds: string[]) => void;
  onUngroup: (layerIds: string[]) => void;
  onAlign: (layerIds: string[], alignment: Alignment) => void;
  onLinkNext: (layerId: string) => void;
  onPromote: (layerId: string) => void;
  onDemote: (layerId: string) => void;
};

export function LayerInspector(props: Props) {
  const slideLayers = props.slide.layers || [];
  const selected = props.selectedElements.flatMap((selection) => {
    const id = fromLayerElementId(selection.elementId);
    if (!id) return [];
    const scope = selection.scope || "slide";
    const layer = scope === "master"
      ? props.masterLayers.find((item) => item.id === id)
      : slideLayers.find((item) => item.id === id);
    return layer ? [{ layer, scope }] : [];
  });
  const selectedSlideIds = selected.filter((item) => item.scope === "slide").map((item) => item.layer.id);
  const primary = selected[0];

  const choose = (layer: VisualLayer | MasterLayer, scope: Scope, additive = false) => {
    props.onSelectionChange([{ slideId: props.slide.id, elementId: toLayerElementId(layer.id), scope }], additive);
  };

  const add = (kind: VisualLayer["kind"]) => {
    const base = {
      id: nid(),
      name: kind === "text" ? "Text" : kind === "image" ? "Image" : "Shape",
      transform: {
        x: props.canvasWidth * 0.2,
        y: props.canvasHeight * 0.35,
        width: props.canvasWidth * 0.6,
        height: kind === "text" ? props.canvasHeight * 0.12 : props.canvasHeight * 0.22,
        rotation: 0,
        zIndex: 10 + slideLayers.length,
      },
      opacity: 1,
    };
    const layer: VisualLayer = kind === "text"
      ? { ...base, kind, text: { [props.locale]: "New text" }, fontSize: Math.round(Math.min(props.canvasWidth, props.canvasHeight) * 0.065), fontWeight: 800, align: "center", lineHeight: 1.05 }
      : kind === "image"
        ? { ...base, kind, src: "", fit: "cover", borderRadius: 24 }
        : { ...base, kind, shape: "rectangle", fill: "#5B7CFA", stroke: "transparent", strokeWidth: 0, borderRadius: 28 };
    props.onAddLayer(layer);
    choose(layer, "slide");
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">Visual layers</Label>
          <p className="text-[11px] text-muted-foreground">Shift-click to select multiple layers.</p>
        </div>
        <div className="flex gap-1">
          <AddButton label="Text" onClick={() => add("text")}><Type className="h-3.5 w-3.5" /></AddButton>
          <AddButton label="Shape" onClick={() => add("shape")}><Square className="h-3.5 w-3.5" /></AddButton>
          <AddButton label="Image" onClick={() => add("image")}><ImageIcon className="h-3.5 w-3.5" /></AddButton>
        </div>
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded border bg-background/60 p-1">
        {props.masterLayers.map((layer) => (
          <LayerRow key={`master-${layer.id}`} layer={layer} master selected={selected.some((item) => item.scope === "master" && item.layer.id === layer.id)} onSelect={(additive) => choose(layer, "master", additive)} onPatch={(patch) => props.onPatchLayer("master", layer.id, patch)} />
        ))}
        {slideLayers.map((layer) => (
          <LayerRow key={layer.id} layer={layer} selected={selected.some((item) => item.scope === "slide" && item.layer.id === layer.id)} onSelect={(additive) => choose(layer, "slide", additive)} onPatch={(patch) => props.onPatchLayer("slide", layer.id, patch)} />
        ))}
        {!props.masterLayers.length && !slideLayers.length && (
          <div className="p-3 text-center text-[11px] text-muted-foreground">Add text, shapes, or images.</div>
        )}
      </div>

      {selected.length > 1 && (
        <div className="space-y-2 rounded border bg-background/70 p-2">
          <div className="flex items-center justify-between text-xs font-medium"><span>{selected.length} layers selected</span><Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Delete selected layers" onClick={() => props.onDeleteLayers(selectedSlideIds)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
          <div className="grid grid-cols-6 gap-1">
            <IconButton label="Align left" onClick={() => props.onAlign(selectedSlideIds, "left")}><AlignStartVertical /></IconButton>
            <IconButton label="Align center" onClick={() => props.onAlign(selectedSlideIds, "center")}><AlignCenterVertical /></IconButton>
            <IconButton label="Align right" onClick={() => props.onAlign(selectedSlideIds, "right")}><AlignEndVertical /></IconButton>
            <IconButton label="Align top" onClick={() => props.onAlign(selectedSlideIds, "top")}><AlignStartHorizontal /></IconButton>
            <IconButton label="Align middle" onClick={() => props.onAlign(selectedSlideIds, "middle")}><AlignCenterHorizontal /></IconButton>
            <IconButton label="Align bottom" onClick={() => props.onAlign(selectedSlideIds, "bottom")}><AlignEndHorizontal /></IconButton>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => props.onGroup(selectedSlideIds)}><Group className="h-3.5 w-3.5" /> Group</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => props.onUngroup(selectedSlideIds)}><Ungroup className="h-3.5 w-3.5" /> Ungroup</Button>
          </div>
        </div>
      )}

      {primary && selected.length === 1 && (
        <LayerDetails
          layer={primary.layer}
          scope={primary.scope}
          locale={props.locale}
          onPatch={(patch) => props.onPatchLayer(primary.scope, primary.layer.id, patch)}
          onDelete={() => props.onDeleteLayers(primary.scope === "slide" ? [primary.layer.id] : [])}
          onLink={() => props.onLinkNext(primary.layer.id)}
          onPromote={() => props.onPromote(primary.layer.id)}
          onDemote={() => props.onDemote(primary.layer.id)}
        />
      )}
    </div>
  );
}

function LayerRow({ layer, master, selected, onSelect, onPatch }: { layer: VisualLayer | MasterLayer; master?: boolean; selected: boolean; onSelect: (additive: boolean) => void; onPatch: (patch: Partial<VisualLayer>) => void }) {
  return (
    <div className={`flex items-center gap-1 rounded px-1.5 py-1 ${selected ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"}`}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs" onClick={(event) => onSelect(event.shiftKey || event.metaKey || event.ctrlKey)}>
        {master && <PanelTop className="h-3.5 w-3.5 text-primary" />}
        {layer.kind === "text" ? <Type className="h-3.5 w-3.5" /> : layer.kind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : layer.shape === "ellipse" ? <Circle className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        <span className="truncate">{layer.name}</span>
      </button>
      <button type="button" aria-label={`${layer.hidden ? "Show" : "Hide"} ${layer.name}`} title={`${layer.hidden ? "Show" : "Hide"} ${layer.name}`} className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onPatch({ hidden: !layer.hidden })}>{layer.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
      <button type="button" aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} title={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onPatch({ locked: !layer.locked })}>{layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button>
    </div>
  );
}

function LayerDetails({ layer, scope, locale, onPatch, onDelete, onLink, onPromote, onDemote }: { layer: VisualLayer | MasterLayer; scope: Scope; locale: string; onPatch: (patch: Partial<VisualLayer>) => void; onDelete: () => void; onLink: () => void; onPromote: () => void; onDemote: () => void }) {
  return (
    <div className="space-y-2 rounded border bg-background/70 p-2.5">
      <div className="flex gap-2"><Input aria-label="Layer name" value={layer.name} onChange={(event) => onPatch({ name: event.target.value })} /><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Delete layer" onClick={onDelete} disabled={scope === "master"}><Trash2 className="h-4 w-4" /></Button></div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Opacity"><Input type="number" min={0} max={100} value={Math.round((layer.opacity ?? 1) * 100)} onChange={(event) => onPatch({ opacity: Number(event.target.value) / 100 })} /></Field>
        <Field label="Rotation"><Input type="number" min={-180} max={180} value={Math.round(layer.transform.rotation || 0)} onChange={(event) => onPatch({ transform: { ...layer.transform, rotation: Number(event.target.value) } } as Partial<VisualLayer>)} /></Field>
      </div>
      {layer.kind === "text" && <TextDetails layer={layer} locale={locale} onPatch={onPatch} />}
      {layer.kind === "image" && <><ScreenshotPicker label="Layer image" value={layer.src} locale={locale} onChange={(src) => onPatch({ src } as Partial<VisualLayer>)} /><div className="grid grid-cols-2 gap-2"><Field label="Fit"><Select value={layer.fit || "cover"} onValueChange={(fit) => onPatch({ fit } as Partial<VisualLayer>)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cover">Cover</SelectItem><SelectItem value="contain">Contain</SelectItem><SelectItem value="fill">Fill</SelectItem></SelectContent></Select></Field><Field label="Radius"><Input type="number" value={layer.borderRadius || 0} onChange={(event) => onPatch({ borderRadius: Number(event.target.value) } as Partial<VisualLayer>)} /></Field></div></>}
      {layer.kind === "shape" && <div className="grid grid-cols-2 gap-2"><Field label="Shape"><Select value={layer.shape} onValueChange={(shape) => onPatch({ shape } as Partial<VisualLayer>)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rectangle">Rectangle</SelectItem><SelectItem value="ellipse">Ellipse</SelectItem><SelectItem value="line">Line</SelectItem></SelectContent></Select></Field><Field label="Fill"><Input type="color" value={layer.fill || "#5B7CFA"} onChange={(event) => onPatch({ fill: event.target.value } as Partial<VisualLayer>)} /></Field></div>}
      <div className="grid grid-cols-2 gap-1">
        {scope === "slide" ? <><Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLink}><Link2 className="h-3.5 w-3.5" /> Link next</Button><Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPromote}><PanelTop className="h-3.5 w-3.5" /> Make master</Button></> : <Button variant="outline" size="sm" className="col-span-2 h-7 text-xs" onClick={onDemote}>Move to this screen</Button>}
      </div>
    </div>
  );
}

function TextDetails({ layer, locale, onPatch }: { layer: TextLayer; locale: string; onPatch: (patch: Partial<VisualLayer>) => void }) {
  return <><Field label="Text"><Textarea rows={2} value={layer.text[locale] ?? pickText(layer.text, locale)} onChange={(event) => onPatch({ text: { ...layer.text, [locale]: event.target.value } } as Partial<VisualLayer>)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Size"><Input type="number" value={layer.fontSize || 72} onChange={(event) => onPatch({ fontSize: Number(event.target.value) } as Partial<VisualLayer>)} /></Field><Field label="Color"><Input type="color" value={layer.color || "#171717"} onChange={(event) => onPatch({ color: event.target.value } as Partial<VisualLayer>)} /></Field></div></>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>; }
function AddButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <Button type="button" variant="outline" size="icon" className="h-7 w-7" title={`Add ${label}`} onClick={onClick}><Plus className="sr-only" />{children}</Button>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactElement }) { return <Button variant="outline" size="icon" className="h-7 w-full" title={label} onClick={onClick}>{React.cloneElement(children, { className: "h-3.5 w-3.5" } as React.HTMLAttributes<SVGElement>)}</Button>; }

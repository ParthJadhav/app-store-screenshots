"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LAYOUT_HINT, LAYOUT_LABEL } from "@/lib/constants";
import type { Alignment } from "@/lib/editor-commands";
import { pickText, writeLocalized } from "@/lib/locale";
import type {
  Device,
  MasterLayer,
  Orientation,
  SelectedElement,
  Slide,
  SlideLayout,
  VisualLayer,
} from "@/lib/types";
import { getCanvas } from "./slide-canvas";
import { LayerInspector } from "./layer-inspector";
import { ScreenshotPicker } from "./screenshot-picker";

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  locale: string;
  masterLayers: MasterLayer[];
  selectedElements: SelectedElement[];
  onChange: (patch: Partial<Slide>) => void;
  onSelectionChange: (selection: SelectedElement[], additive?: boolean) => void;
  onAddLayer: (layer: VisualLayer) => void;
  onPatchLayer: (scope: "slide" | "master", layerId: string, patch: Partial<VisualLayer>) => void;
  onDeleteLayers: (layerIds: string[]) => void;
  onGroup: (layerIds: string[]) => void;
  onUngroup: (layerIds: string[]) => void;
  onAlign: (layerIds: string[], alignment: Alignment) => void;
  onLinkNext: (layerId: string) => void;
  onPromote: (layerId: string) => void;
  onDemote: (layerId: string) => void;
};

export function Inspector(props: Props) {
  const { slide, device, orientation, locale } = props;
  const featureGraphic = device === "feature-graphic" || slide.layout === "feature-graphic";
  const noDevice = slide.layout === "no-device";
  const layoutValue = device === "feature-graphic" ? "feature-graphic" : slide.layout;
  const layoutOptions = Object.entries(LAYOUT_LABEL).filter(([layout]) =>
    device === "feature-graphic" ? layout === "feature-graphic" : layout !== "feature-graphic",
  );
  const localeLabel = slide.label?.[locale] ?? "";
  const localeHeadline = slide.headline?.[locale] ?? "";
  const { cW, cH } = getCanvas(device, orientation);

  React.useEffect(() => {
    if (device === "feature-graphic" && slide.layout !== "feature-graphic") {
      props.onChange({ layout: "feature-graphic", transforms: undefined, screenshotSecondary: undefined });
    }
  }, [device, props, slide.layout]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Screen settings</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">editing · {locale.toUpperCase()}</span>
        </div>
        <p className="text-xs text-muted-foreground">{LAYOUT_HINT[layoutValue]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <Field label="Layout">
          <Select
            value={layoutValue}
            onValueChange={(value) => {
              const layout = value as SlideLayout;
              props.onChange({
                layout,
                transforms: undefined,
                screenshotSecondary: layout === "two-devices" ? slide.screenshotSecondary || slide.screenshot : undefined,
              });
            }}
          >
            <SelectTrigger aria-label="Slide layout"><SelectValue /></SelectTrigger>
            <SelectContent>{layoutOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        {!featureGraphic && (
          <Field label="Label">
            <Input
              aria-label="Slide label"
              value={localeLabel}
              onChange={(event) => props.onChange({ label: writeLocalized(slide.label, locale, event.target.value) })}
              placeholder={pickText(slide.label, locale) || "FEATURE 01"}
            />
          </Field>
        )}

        <Field label={featureGraphic ? "Tagline" : "Headline"} hint="newline = break">
          <Textarea
            aria-label={featureGraphic ? "Slide tagline" : "Slide headline"}
            value={localeHeadline}
            onChange={(event) => props.onChange({ headline: writeLocalized(slide.headline, locale, event.target.value) })}
            rows={3}
            placeholder={pickText(slide.headline, locale) || "One idea\nper slide."}
          />
        </Field>

        {!featureGraphic && !noDevice && (
          <Field label={slide.layout === "two-devices" ? "Front device screenshot" : "Screenshot"}>
            <ScreenshotPicker label="Primary" value={slide.screenshot} locale={locale} onChange={(screenshot) => props.onChange({ screenshot })} />
          </Field>
        )}

        {slide.layout === "two-devices" && (
          <Field label="Back device screenshot">
            <ScreenshotPicker label="Secondary" value={slide.screenshotSecondary || ""} locale={locale} onChange={(screenshotSecondary) => props.onChange({ screenshotSecondary })} />
          </Field>
        )}

        <LayerInspector
          slide={slide}
          masterLayers={props.masterLayers}
          locale={locale}
          canvasWidth={cW}
          canvasHeight={cH}
          selectedElements={props.selectedElements}
          onSelectionChange={props.onSelectionChange}
          onAddLayer={props.onAddLayer}
          onPatchLayer={props.onPatchLayer}
          onDeleteLayers={props.onDeleteLayers}
          onGroup={props.onGroup}
          onUngroup={props.onUngroup}
          onAlign={props.onAlign}
          onLinkNext={props.onLinkNext}
          onPromote={props.onPromote}
          onDemote={props.onDemote}
        />
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between"><Label className="text-xs">{label}</Label>{hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}</div>
      {children}
    </div>
  );
}

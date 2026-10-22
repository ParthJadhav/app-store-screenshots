"use client";
import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Lightbulb,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CANVAS, DEVICE_LABEL, LAYOUT_LABEL, isCreative, layoutHint, layoutLabel } from "@/lib/constants";
import { DUO_COMPANION, duoGeometry, isDuoDevice } from "@/lib/frame-assets";
import { COPY_IDEA_SLOTS } from "@/lib/copy-ideas";
import { nid } from "@/lib/defaults";
import { img } from "@/lib/image-cache";
import {
  isBuiltInElementId,
  imageElementKey,
  isImageElementId,
  isTextElementId,
  toImageElementId,
  textElementKey,
  toTextElementId,
} from "@/lib/elements";
import { pickText, resolveScreenshot, writeLocalized } from "@/lib/locale";
import { slideColors } from "@/lib/contrast";
import { cn } from "@/lib/utils";
import {
  cleanTypography,
  defaultTextElementFontSize,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  slideFontScales,
  textElementFontSizeRange,
} from "@/lib/typography";
import type {
  BuiltInElementId,
  Device,
  ElementId,
  ElementTransform,
  ImageElement,
  Orientation,
  Slide,
  SlideLayout,
  SlideTypography,
  TextElement,
  Theme,
} from "@/lib/types";
import { BackgroundControls } from "./background-controls";
import { ScreenshotPicker } from "./screenshot-picker";
import { CalloutControls } from "./callout-controls";
import { DUO_FIT_TOLERANCE, captureFits } from "./device-frames";
import { calloutAvailable, getCanvas, getElementTransform } from "./slide-canvas";

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appIcon?: string;
  onAppIconChange: (src: string) => void;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  /** Patch computed from the slide's latest state (safe after async work). */
  onUpdate: (update: (slide: Slide) => Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
  onDeleteDevice?: (id: "device" | "deviceSecondary") => void;
};

const ELEMENT_LABEL: Record<BuiltInElementId, string> = {
  caption: "Headline",
  device: "Device",
  deviceSecondary: "Back device",
  callout: "Magnifier",
};

export function Inspector({
  slide,
  device,
  orientation,
  theme,
  locale,
  appIcon,
  onAppIconChange,
  selectedElementId,
  onChange,
  onUpdate,
  onSelectElement,
  onDeleteDevice,
}: Props) {
  const isFeatureGraphic = device === "feature-graphic" || slide.layout === "feature-graphic";
  const isNoDevice = slide.layout === "no-device";
  const layoutValue = device === "feature-graphic" ? "feature-graphic" : slide.layout;
  const layoutOptions = (Object.keys(LAYOUT_LABEL) as SlideLayout[])
    .filter((layout) => (device === "feature-graphic" ? layout === "feature-graphic" : layout !== "feature-graphic"))
    .map((layout) => [layout, layoutLabel(layout, device)] as const);
  // On iPhone Duo the back device is the other display, so it needs its own capture.
  const companion = isDuoDevice(device) ? DUO_COMPANION[device] : null;
  const localeLabel = slide.label?.[locale] ?? "";
  const localeHeadline = slide.headline?.[locale] ?? "";
  // When the active locale is empty, surface the fallback (typically en) as
  // the placeholder so the user sees what they're translating from.
  const headlineDefault = isFeatureGraphic ? "Your tagline." : "One idea\nper slide.";
  const labelPlaceholder = localeLabel ? "FEATURE 01" : pickText(slide.label, locale) || "FEATURE 01";
  const headlinePlaceholder = localeHeadline
    ? headlineDefault
    : pickText(slide.headline, locale) || headlineDefault;

  function setLocaleField(key: "label" | "headline", value: string) {
    onChange({ [key]: writeLocalized(slide[key], locale, value) } as Partial<Slide>);
  }

  function handleDeleteDevice(id: "device" | "deviceSecondary") {
    if (onDeleteDevice) {
      onDeleteDevice(id);
      return;
    }
    const nextTransforms = { ...(slide.transforms || {}) };
    if (id === "deviceSecondary" || slide.layout === "two-devices") {
      if (id === "deviceSecondary") {
        delete nextTransforms.deviceSecondary;
        onChange({
          layout: "hero",
          screenshotSecondary: undefined,
          transforms: Object.keys(nextTransforms).length ? nextTransforms : undefined,
        });
      } else {
        const nextScreenshot = slide.screenshotSecondary || slide.screenshot;
        if (nextTransforms.deviceSecondary) {
          nextTransforms.device = nextTransforms.deviceSecondary;
        } else {
          delete nextTransforms.device;
        }
        delete nextTransforms.deviceSecondary;
        onChange({
          layout: "hero",
          screenshot: nextScreenshot,
          screenshotSecondary: undefined,
          transforms: Object.keys(nextTransforms).length ? nextTransforms : undefined,
        });
      }
    } else {
      delete nextTransforms.device;
      onChange({
        layout: "no-device",
        transforms: Object.keys(nextTransforms).length ? nextTransforms : undefined,
      });
    }
    onSelectElement(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Screen settings</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            editing · {locale.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{layoutHint(layoutValue, device)}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Layout</Label>
          <Select
            value={layoutValue}
            onValueChange={(layout) => {
              const next = layout as SlideLayout;
              onChange({
                layout: next,
                transforms: undefined,
                screenshotSecondary:
                  next === "two-devices" && !companion
                    ? slide.screenshotSecondary || slide.screenshot
                    : slide.screenshotSecondary,
              });
            }}
          >
            <SelectTrigger aria-label="Layout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map(([layout, label]) => (
                <SelectItem key={layout} value={layout}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isCreative(device) && (
          <p className="rounded-md border border-green-600/30 bg-green-600/5 p-2 text-[11px] leading-relaxed text-muted-foreground">
            Keep the message and focal art inside the green <span className="font-medium text-foreground">art safe area</span>
            {device === "creative-universal"
              ? "; the backdrop fills the rest. One universal asset is used for both the product page header and search results. The dashed crops are estimates. Check the real result with App Store Connect's Preview tool."
              : "; the backdrop fills the rest."}{" "}
            Write a short brand line here; don&apos;t reuse a long screenshot headline.
          </p>
        )}

        <BackgroundControls slide={isFeatureGraphic ? { ...slide, inverted: slide.inverted ?? true } : slide} theme={theme} onChange={onChange} />

        {!isFeatureGraphic && (
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              aria-label="Label"
              value={localeLabel}
              onChange={(e) => setLocaleField("label", e.target.value)}
              placeholder={labelPlaceholder}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs">{isFeatureGraphic ? "Tagline" : "Headline"}</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">newline = break</span>
              <CopyIdeasMenu onPick={(formula) => setLocaleField("headline", formula)} />
            </div>
          </div>
          <Textarea
            aria-label={isFeatureGraphic ? "Tagline" : "Headline"}
            value={localeHeadline}
            onChange={(e) => setLocaleField("headline", e.target.value)}
            rows={3}
            placeholder={headlinePlaceholder}
          />
        </div>

        <TypographySection slide={slide} isFeatureGraphic={isFeatureGraphic} onChange={onChange} />

        {isNoDevice && !isFeatureGraphic && (
          <div className="flex items-center justify-between rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <span>No device in this layout</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onChange({ layout: "hero" });
                onSelectElement("device");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add device
            </Button>
          </div>
        )}

        {!isFeatureGraphic && !isNoDevice && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {slide.layout === "two-devices" ? "Front device screenshot" : "Screenshot"}
              </Label>
              {slide.layout !== "two-devices" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    onChange({
                      layout: "two-devices",
                      screenshotSecondary: slide.screenshotSecondary || slide.screenshot,
                    })
                  }
                  title="Add second device"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add 2nd device
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteDevice("device")}
                  title="Remove front device"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove device
                </Button>
              )}
            </div>
            <ScreenshotPicker
              label="Primary"
              value={slide.screenshot}
              locale={locale}
              onChange={(v) => onChange({ screenshot: v })}
            />
            <CaptureNote device={device} src={resolveScreenshot(slide.screenshot, locale)} />
          </div>
        )}

        {slide.layout === "two-devices" && (
          <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {companion ? `${DEVICE_LABEL[companion]} screenshot` : "Back device screenshot"}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteDevice("deviceSecondary")}
                title="Remove back device"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Remove device
              </Button>
            </div>
            <ScreenshotPicker
              label={companion ? DEVICE_LABEL[companion] : "Secondary (back layer)"}
              value={slide.screenshotSecondary || ""}
              locale={locale}
              onChange={(v) => onChange({ screenshotSecondary: v })}
            />
            {companion && (
              <CaptureNote device={companion} src={resolveScreenshot(slide.screenshotSecondary, locale)} />
            )}
          </div>
        )}

        <CalloutControls
          slide={slide}
          device={device}
          orientation={orientation}
          locale={locale}
          available={calloutAvailable(slide, device)}
          onChange={onChange}
          onSelectElement={onSelectElement}
        />

        {!isFeatureGraphic && (
          <ElementTransformControls
            slide={slide}
            defaultTextColor={slideColors(theme, slide).fg}
            device={device}
            orientation={orientation}
            locale={locale}
            selectedElementId={selectedElementId}
            onChange={onChange}
            onUpdate={onUpdate}
            onSelectElement={onSelectElement}
            onDeleteDevice={handleDeleteDevice}
          />
        )}

        {isFeatureGraphic && (
          <div className="space-y-1.5">
            <Label className="text-xs">App icon</Label>
            <ScreenshotPicker label="Icon (shared by every banner)" value={appIcon || ""} onChange={onAppIconChange} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Shows app icon + name + tagline. Leave the icon blank to use the app&apos;s initial. Name is set in the toolbar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// iPhone Duo frames show a capture uncropped only when it came from that display.
function CaptureNote({ device, src }: { device: Device; src: string }) {
  if (!isDuoDevice(device)) return null;
  const { w, h } = CANVAS[device];
  const fits = !src || captureFits(src, duoGeometry(device).screenAspect, DUO_FIT_TOLERANCE);
  return (
    <p className={cn("text-[11px] leading-relaxed", fits ? "text-muted-foreground" : "text-amber-600")}>
      {fits
        ? `Use a ${w} × ${h} capture from the ${DEVICE_LABEL[device].replace(/ \(landscape\)$/, "")} display${device.endsWith("-landscape") ? " in landscape" : ""}.`
        : `This capture isn't ${w} × ${h} (${DEVICE_LABEL[device]}), so it is letterboxed, not cropped. Capture on that display.`}
    </p>
  );
}

function CopyIdeasMenu({ onPick }: { onPick: (formula: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
          title="Insert a headline formula, then replace the [bracketed] words"
        >
          <Lightbulb className="h-3 w-3" />
          Copy ideas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[420px] w-72 overflow-y-auto">
        {COPY_IDEA_SLOTS.map((slot, i) => (
          <React.Fragment key={slot.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {slot.name}
            </DropdownMenuLabel>
            {slot.ideas.map((idea) => (
              <DropdownMenuItem
                key={idea.formula}
                onSelect={() => onPick(idea.formula)}
                className="flex-col items-start gap-0.5"
              >
                <span className="text-xs font-medium">{idea.formula.replace(/\n/g, " / ")}</span>
                <span className="text-[11px] text-muted-foreground">{idea.example}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ElementTransformControls({
  slide,
  defaultTextColor,
  device,
  orientation,
  locale,
  selectedElementId,
  onChange,
  onUpdate,
  onSelectElement,
  onDeleteDevice,
}: {
  slide: Slide;
  defaultTextColor: string;
  device: Device;
  orientation: Orientation;
  locale: string;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  onUpdate: (update: (slide: Slide) => Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
  onDeleteDevice?: (id: "device" | "deviceSecondary") => void;
}) {
  const isFeatureGraphic = device === "feature-graphic" || slide.layout === "feature-graphic";
  const present: ElementId[] = ["caption"];
  if (slide.layout !== "no-device") present.push("device");
  if (slide.layout === "two-devices") present.push("deviceSecondary");
  if (slide.callout && calloutAvailable(slide, device)) present.push("callout");
  for (const element of slide.textElements || []) present.push(toTextElementId(element.id));
  for (const element of slide.imageElements || []) present.push(toImageElementId(element.id));

  const transforms = slide.transforms || {};
  const activeId =
    selectedElementId && present.includes(selectedElementId) ? selectedElementId : null;
  const activeTransform = activeId
    ? getElementTransform(slide, device, orientation, activeId)
    : undefined;
  const { cW, cH } = getCanvas(device, orientation);
  const activeTextElement =
    activeId && isTextElementId(activeId)
      ? slide.textElements?.find((element) => element.id === textElementKey(activeId))
      : null;
  const activeImageElement =
    activeId && isImageElementId(activeId)
      ? slide.imageElements?.find((element) => element.id === imageElementKey(activeId))
      : null;

  function getTransform(id: ElementId) {
    return getElementTransform(slide, device, orientation, id);
  }

  function patchElement(id: ElementId, patch: Partial<ElementTransform>) {
    const cur = getTransform(id);
    if (!cur) return;
    if (isTextElementId(id)) {
      const textId = textElementKey(id);
      onChange({
        textElements: (slide.textElements || []).map((element) =>
          element.id === textId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      });
      return;
    }
    if (isImageElementId(id)) {
      const imageId = imageElementKey(id);
      onUpdate((latest) => ({
        imageElements: (latest.imageElements || []).map((element) =>
          element.id === imageId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      }));
      return;
    }
    if (!isBuiltInElementId(id)) return;
    onChange({
      transforms: { ...transforms, [id]: { ...cur, ...patch } },
    });
  }

  function patchTextElement(id: string, patch: Partial<TextElement>) {
    onChange({
      textElements: (slide.textElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  function setTextElementValue(element: TextElement, value: string) {
    patchTextElement(element.id, { text: writeLocalized(element.text, locale, value) });
  }

  function deleteTextElement(element: TextElement) {
    const nextTextElements = (slide.textElements || []).filter((item) => item.id !== element.id);
    onChange({
      textElements: nextTextElements.length > 0 ? nextTextElements : undefined,
    });
    onSelectElement(null);
  }

  // Functional updates: an image upload can finish after the user has moved or
  // resized the overlay, and a patch built from the render-time slide would
  // silently revert that move.
  function patchImageElement(id: string, patch: Partial<ImageElement>) {
    onUpdate((latest) => ({
      imageElements: (latest.imageElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    }));
  }

  // The first image picked for an overlay reshapes its frame to the image's
  // aspect ratio (centred on the old frame), so "Fill frame" doesn't crop a
  // wide logo into a square. Replacing an image keeps the frame as placed.
  const imageRequests = React.useRef(new Map<string, number>());
  React.useEffect(() => () => imageRequests.current.clear(), []);
  async function setImageSource(id: string, src: string) {
    const request = (imageRequests.current.get(id) || 0) + 1;
    imageRequests.current.set(id, request);
    const size = src ? await naturalSize(img(src)) : null;
    if (imageRequests.current.get(id) !== request) return;
    onUpdate((latest) => ({
      imageElements: (latest.imageElements || []).map((element) => {
        if (element.id !== id) return element;
        if (!size || element.src) return { ...element, src };
        return { ...element, src, transform: fitToAspect(element.transform, size.w / size.h, cH * 0.6) };
      }),
    }));
  }

  function deleteImageElement(element: ImageElement) {
    onUpdate((latest) => {
      const nextImageElements = (latest.imageElements || []).filter((item) => item.id !== element.id);
      return { imageElements: nextImageElements.length > 0 ? nextImageElements : undefined };
    });
    onSelectElement(null);
  }

  function addTextElement() {
    const id = nid();
    const zIndex =
      Math.max(
        5,
        ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId)),
      ) + 1;
    const element: TextElement = {
      id,
      text: writeLocalized({}, locale, "New text"),
      transform: {
        x: cW * 0.18,
        y: cH * 0.42,
        width: cW * 0.64,
        height: cH * 0.12,
        rotation: 0,
        zIndex,
      },
      fontWeight: 800,
      align: "center",
    };
    onChange({ textElements: [...(slide.textElements || []), element] });
    onSelectElement(toTextElementId(id));
  }

  function addImageElement() {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex = Math.max(5, ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId))) + 1;
    const element: ImageElement = {
      id,
      src: "",
      transform: {
        x: cW * 0.25,
        y: cH * 0.36,
        width: cW * 0.5,
        height: cW * 0.5,
        rotation: 0,
        zIndex,
      },
      fit: "cover",
    };
    onChange({ imageElements: [...(slide.imageElements || []), element] });
    onSelectElement(toImageElementId(id));
  }

  // Z-order: re-rank zIndex among present elements so they remain contiguous.
  function reorder(id: ElementId, dir: "front" | "back" | "up" | "down") {
    const ranked = [...present].sort((a, b) => {
      const za = getTransform(a)?.zIndex ?? defaultZ(a);
      const zb = getTransform(b)?.zIndex ?? defaultZ(b);
      return za - zb;
    });
    const idx = ranked.indexOf(id);
    if (idx === -1) return;
    let target = idx;
    if (dir === "front") target = ranked.length - 1;
    else if (dir === "back") target = 0;
    else if (dir === "up") target = Math.min(ranked.length - 1, idx + 1);
    else if (dir === "down") target = Math.max(0, idx - 1);
    if (target === idx) return;
    ranked.splice(idx, 1);
    ranked.splice(target, 0, id);
    const nextTransforms = { ...transforms };
    const nextTextElements = (slide.textElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    const nextImageElements = (slide.imageElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    ranked.forEach((eid, i) => {
      const cur = getTransform(eid);
      if (!cur) return;
      if (isTextElementId(eid)) {
        const textId = textElementKey(eid);
        const textElement = nextTextElements.find((element) => element.id === textId);
        if (textElement) textElement.transform = { ...textElement.transform, zIndex: i + 1 };
      } else if (isImageElementId(eid)) {
        const imageId = imageElementKey(eid);
        const imageElement = nextImageElements.find((element) => element.id === imageId);
        if (imageElement) imageElement.transform = { ...imageElement.transform, zIndex: i + 1 };
      } else if (isBuiltInElementId(eid)) {
        nextTransforms[eid] = { ...cur, zIndex: i + 1 };
      }
    });
    onChange({ transforms: nextTransforms, textElements: nextTextElements, imageElements: nextImageElements });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">Elements</Label>
          <div className="flex items-center gap-1.5">
            {!isFeatureGraphic && slide.layout !== "two-devices" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => {
                  if (slide.layout === "no-device") {
                    onChange({ layout: "hero" });
                    onSelectElement("device");
                  } else {
                    onChange({
                      layout: "two-devices",
                      screenshotSecondary: slide.screenshotSecondary || slide.screenshot,
                    });
                    onSelectElement("deviceSecondary");
                  }
                }}
                title={slide.layout === "no-device" ? "Add device" : "Add second device"}
              >
                <Plus className="h-3.5 w-3.5" />
                Device
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={addTextElement}
            >
              <Plus className="h-3.5 w-3.5" />
              Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={addImageElement}
              title="Add a PNG or JPG overlay (logo, photo, badge)"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Image
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {activeId
            ? "Fine-tune the selected element's rotation and stacking."
            : "Click an element on the canvas to fine-tune its rotation and stacking."}
        </p>
      </div>

      {activeId ? (
        <ActiveElementPanel
          key={activeId}
          activeId={activeId}
          transform={activeTransform}
          textElement={activeTextElement || undefined}
          imageElement={activeImageElement || undefined}
          locale={locale}
          canvas={{ cW, cH }}
          defaultTextColor={defaultTextColor}
          onRotate={(rotation) => patchElement(activeId, { rotation })}
          onReorder={(dir) => reorder(activeId, dir)}
          onTextChange={(value) => {
            if (activeTextElement) setTextElementValue(activeTextElement, value);
          }}
          onTextPatch={(patch) => {
            if (activeTextElement) patchTextElement(activeTextElement.id, patch);
          }}
          onDeleteText={() => {
            if (activeTextElement) deleteTextElement(activeTextElement);
          }}
          onImageSource={(src) => {
            if (activeImageElement) void setImageSource(activeImageElement.id, src);
          }}
          onImagePatch={(patch) => {
            if (activeImageElement) patchImageElement(activeImageElement.id, patch);
          }}
          onDeleteImage={() => {
            if (activeImageElement) deleteImageElement(activeImageElement);
          }}
          onDeleteDevice={onDeleteDevice}
        />
      ) : (
        <div className="rounded border border-dashed bg-background/40 p-4 text-center text-[11px] text-muted-foreground">
          No element selected
        </div>
      )}
    </div>
  );
}

function ActiveElementPanel({
  activeId,
  transform,
  textElement,
  imageElement,
  locale,
  canvas,
  defaultTextColor,
  onRotate,
  onReorder,
  onTextChange,
  onTextPatch,
  onDeleteText,
  onImagePatch,
  onImageSource,
  onDeleteImage,
  onDeleteDevice,
}: {
  activeId: ElementId;
  transform: ElementTransform | undefined;
  textElement?: TextElement;
  imageElement?: ImageElement;
  locale: string;
  canvas: { cW: number; cH: number };
  defaultTextColor: string;
  onRotate: (rotation: number) => void;
  onReorder: (dir: "front" | "back" | "up" | "down") => void;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
  onDeleteText: () => void;
  onImagePatch: (patch: Partial<ImageElement>) => void;
  onImageSource: (src: string) => void;
  onDeleteImage: () => void;
  onDeleteDevice?: (id: "device" | "deviceSecondary") => void;
}) {
  const engaged = !!transform;
  const rotation = transform?.rotation ?? 0;
  const label = elementLabel(activeId);
  return (
    <div className="space-y-2 rounded border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium">
          {textElement && <Type className="h-3.5 w-3.5" />}
          {imageElement && <ImagePlus className="h-3.5 w-3.5" />}
          {label}
        </span>
        {textElement || imageElement ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={textElement ? onDeleteText : onDeleteImage}
            title={textElement ? "Delete text element" : "Delete image element"}
            aria-label={textElement ? "Delete text element" : "Delete image element"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : activeId === "device" || activeId === "deviceSecondary" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteDevice?.(activeId)}
            title={activeId === "deviceSecondary" ? "Remove second device" : "Remove device"}
            aria-label={activeId === "deviceSecondary" ? "Remove second device" : "Remove device"}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete device
          </Button>
        ) : !engaged ? (
          <span className="text-[10px] text-muted-foreground">drag to enable</span>
        ) : null}
      </div>

      {textElement && (
        <TextElementPanel
          key={textElement.id}
          element={textElement}
          locale={locale}
          canvas={canvas}
          defaultColor={defaultTextColor}
          onTextChange={onTextChange}
          onTextPatch={onTextPatch}
        />
      )}

      {imageElement && (
        <ImageElementPanel element={imageElement} onPatch={onImagePatch} onSourceChange={onImageSource} />
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <RotateCw className="h-3 w-3" /> Rotation
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rotation}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          disabled={!engaged}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="w-full disabled:opacity-50"
          aria-label={`${label} rotation`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Layer</Label>
        <div className="grid grid-cols-4 gap-1">
          <LayerButton disabled={!engaged} onClick={() => onReorder("back")} label="Send to back">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("down")} label="Send backward">
            <ChevronDown className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("up")} label="Bring forward">
            <ChevronUp className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("front")} label="Bring to front">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </LayerButton>
        </div>
      </div>
    </div>
  );
}

function ImageElementPanel({
  element,
  onPatch,
  onSourceChange,
}: {
  element: ImageElement;
  onPatch: (patch: Partial<ImageElement>) => void;
  onSourceChange: (src: string) => void;
}) {
  return (
    <div className="space-y-2">
      <ScreenshotPicker label="Image" value={element.src} onChange={onSourceChange} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Fit</Label>
          <Select value={element.fit || "cover"} onValueChange={(fit) => onPatch({ fit: fit as ImageElement["fit"] })}>
            <SelectTrigger className="h-8 text-xs" aria-label="Image fit"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Fill frame</SelectItem>
              <SelectItem value="contain">Whole image</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Edge fade</Label>
          <Select
            value={element.fade?.edge || "none"}
            onValueChange={(edge) =>
              onPatch({
                fade:
                  edge === "none"
                    ? undefined
                    : { edge: edge as NonNullable<ImageElement["fade"]>["edge"], amount: element.fade?.amount ?? 35 },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Edge fade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="top">From top</SelectItem>
              <SelectItem value="bottom">From bottom</SelectItem>
              <SelectItem value="left">From left</SelectItem>
              <SelectItem value="right">From right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {element.fade && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">Fade strength</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(element.fade.amount)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={element.fade.amount}
            onChange={(event) => onPatch({ fade: { ...element.fade!, amount: Number(event.target.value) } })}
            className="w-full"
            aria-label="Fade strength"
          />
        </div>
      )}
    </div>
  );
}

function TextElementPanel({
  element,
  locale,
  canvas,
  defaultColor,
  onTextChange,
  onTextPatch,
}: {
  element: TextElement;
  locale: string;
  canvas: { cW: number; cH: number };
  defaultColor: string;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
}) {
  // Like the headline field: the locale's own text, with the fallback shown as
  // a placeholder, so clearing a translation doesn't snap back to English.
  const text = element.text?.[locale] ?? "";
  const textPlaceholder = pickText(element.text, locale) || "Overlay text";
  const align = element.align ?? "center";
  const defaultSize = defaultTextElementFontSize(canvas.cW, canvas.cH);
  const range = textElementFontSizeRange(canvas.cW, canvas.cH);
  const hasCustomSize = typeof element.fontSize === "number" && Number.isFinite(element.fontSize);
  // Mirror the canvas: an unset size renders at the canvas-relative default.
  const size = Math.round(hasCustomSize ? (element.fontSize as number) : defaultSize);
  // Keep a value loaded from an older project reachable even if it sits
  // outside the canvas-relative range.
  const sliderMin = Math.min(range.min, size);
  const sliderMax = Math.max(range.max, size);
  // Typing is buffered so intermediate values ("1" on the way to "120") don't
  // get clamped mid-keystroke; the value is committed on blur / Enter.
  const [draft, setDraft] = React.useState<string | null>(null);
  const cancelDraft = React.useRef(false);

  function commitDraft() {
    if (cancelDraft.current) { cancelDraft.current = false; return; }
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) {
      onTextPatch({ fontSize: Math.min(range.max, Math.max(range.min, Math.round(n))) });
    }
    setDraft(null);
  }

  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Text</Label>
        <Textarea
          value={text}
          rows={2}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={textPlaceholder}
          aria-label="Overlay text"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] text-muted-foreground">Size</Label>
          <ResetButton
            visible={hasCustomSize && size !== defaultSize}
            label={`Reset size to ${defaultSize}px`}
            onClick={() => onTextPatch({ fontSize: undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={size}
            onChange={(event) => onTextPatch({ fontSize: Number(event.target.value) })}
            onDoubleClick={() => onTextPatch({ fontSize: undefined })}
            className="min-w-0 flex-1"
            aria-label="Text size"
          />
          <div className="relative w-[76px] shrink-0">
            <Input
              type="number"
              min={range.min}
              max={range.max}
              value={draft ?? String(size)}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelDraft.current = true;
                  setDraft(null);
                  event.currentTarget.blur();
                }
              }}
              className="h-8 pr-7 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Text size in pixels"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              px
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[76px_1fr] gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Color</Label>
          <Input
            type="color"
            value={element.color || defaultColor}
            className="h-7 cursor-pointer p-0.5"
            onChange={(event) => onTextPatch({ color: event.target.value })}
            aria-label="Text color"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Align</Label>
          <div className="grid grid-cols-3 gap-1">
            <LayerButton
              disabled={false}
              active={align === "left"}
              onClick={() => onTextPatch({ align: "left" })}
              label="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </LayerButton>
            <LayerButton
              disabled={false}
              active={align === "center"}
              onClick={() => onTextPatch({ align: "center" })}
              label="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </LayerButton>
            <LayerButton
              disabled={false}
              active={align === "right"}
              onClick={() => onTextPatch({ align: "right" })}
              label="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </LayerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function LayerButton({
  disabled,
  active,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 px-0", active && "border-foreground/40 bg-accent text-accent-foreground")}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function TypographySection({
  slide,
  isFeatureGraphic,
  onChange,
}: {
  slide: Slide;
  isFeatureGraphic: boolean;
  onChange: (patch: Partial<Slide>) => void;
}) {
  const scales = slideFontScales(slide);
  const customized = !!cleanTypography(slide.typography);

  function patchTypography(patch: Partial<SlideTypography>) {
    onChange({
      typography: cleanTypography({ ...slide.typography, ...patch }),
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">Text size</Label>
          <p className="text-[11px] text-muted-foreground">
            Relative to the layout default.
          </p>
        </div>
        {customized && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 gap-1 px-1.5 text-[11px] text-muted-foreground"
            onClick={() => onChange({ typography: undefined })}
            title="Reset all text sizes to 100%"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
      {!isFeatureGraphic && (
        <FontScaleSlider
          label="Label"
          value={scales.labelScale}
          onChange={(value) => patchTypography({ labelScale: value })}
        />
      )}
      {isFeatureGraphic && (
        <FontScaleSlider
          label="App name"
          value={scales.appNameScale}
          onChange={(value) => patchTypography({ appNameScale: value })}
        />
      )}
      <FontScaleSlider
        label={isFeatureGraphic ? "Tagline" : "Headline"}
        value={scales.headlineScale}
        onChange={(value) => patchTypography({ headlineScale: value })}
      />
    </div>
  );
}

function FontScaleSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = Math.round(value * 100);
  const minPct = Math.round(FONT_SCALE_MIN * 100);
  const maxPct = Math.round(FONT_SCALE_MAX * 100);
  const defaultPct = Math.round(FONT_SCALE_DEFAULT * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <ResetButton
            visible={pct !== defaultPct}
            label={`Reset ${label.toLowerCase()} to ${defaultPct}%`}
            onClick={() => onChange(FONT_SCALE_DEFAULT)}
          />
          <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <input
        type="range"
        min={minPct}
        max={maxPct}
        step={5}
        value={pct}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onDoubleClick={() => onChange(FONT_SCALE_DEFAULT)}
        className="w-full"
        aria-label={`${label} size`}
        aria-valuetext={`${pct}%`}
        title="Double-click to reset"
      />
    </div>
  );
}

/** Small inline reset affordance. Always occupies its slot so the row doesn't
 * shift when it appears. */
function ResetButton({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-5 w-5 text-muted-foreground [&_svg]:size-3", !visible && "invisible")}
      onClick={onClick}
      title={label}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <RotateCcw />
    </Button>
  );
}

function naturalSize(src: string): Promise<{ w: number; h: number } | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (size: { w: number; h: number } | null) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(size);
    };
    const timeout = setTimeout(() => finish(null), 10000);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? { w: image.naturalWidth, h: image.naturalHeight } : null);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

function fitToAspect(t: ElementTransform, aspect: number, maxHeight: number): ElementTransform {
  let width = t.width;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return {
    ...t,
    x: t.x + (t.width - width) / 2,
    y: t.y + (t.height - height) / 2,
    width,
    height,
  };
}

function elementLabel(id: ElementId): string {
  if (isBuiltInElementId(id)) return ELEMENT_LABEL[id];
  if (isImageElementId(id)) return "Image";
  return "Text";
}

function defaultZ(id: ElementId): number {
  if (isTextElementId(id)) return 5;
  if (isImageElementId(id)) return 5;
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  if (id === "callout") return 5;
  return 4; // caption on top
}

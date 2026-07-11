import type React from "react";
import { getCanvasSize, IPAD_RATIO, MK_RATIO, ipadW, phoneW, phoneWSmall, tabletLW, tabletPW } from "@/lib/constants";
import type { BuiltInElementId, Device, ElementId, ElementTransform, Orientation, Slide } from "@/lib/types";
import { AndroidPhone, AndroidTabletL, AndroidTabletP, IPad, Phone } from "../device-frames";

export type FrameComponent = React.ComponentType<{
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
}>;

export type CanvasRect = { x: number; y: number; width: number; height: number };
export type LayoutRects = {
  caption?: CanvasRect & { align?: "center" | "left" };
  device?: CanvasRect;
  deviceSecondary?: CanvasRect;
};

export const getCanvas = getCanvasSize;

export function getFrameAspect(device: Device, orientation: Orientation) {
  if (device === "iphone") return MK_RATIO;
  if (device === "android") return 9 / 19.5;
  if (device === "ipad") return IPAD_RATIO;
  if (device === "android-7" || device === "android-10") return orientation === "landscape" ? 8 / 5 : 5 / 8;
  return 1;
}

export function getFrameForDevice(device: Device, orientation: Orientation): {
  Frame: FrameComponent;
  width: (canvasWidth: number, canvasHeight: number) => number;
  smallWidth: (canvasWidth: number, canvasHeight: number) => number;
} {
  if (device === "iphone") return { Frame: Phone, width: phoneW, smallWidth: phoneWSmall };
  if (device === "ipad") return { Frame: IPad, width: ipadW, smallWidth: (w, h) => ipadW(w, h, 0.6) };
  if (device === "android") return { Frame: AndroidPhone, width: phoneW, smallWidth: phoneWSmall };
  if (orientation === "landscape") {
    return { Frame: AndroidTabletL, width: tabletLW, smallWidth: (w, h) => tabletLW(w, h, 0.5) };
  }
  return { Frame: AndroidTabletP, width: tabletPW, smallWidth: (w, h) => tabletPW(w, h, 0.62) };
}

export function getDefaultRects(
  layout: Slide["layout"],
  canvasWidth: number,
  canvasHeight: number,
  frameAspect: number,
  widthFraction: number,
  smallWidthFraction: number,
): LayoutRects {
  const deviceWidth = widthFraction * canvasWidth;
  const deviceHeight = deviceWidth / frameAspect;
  const smallWidth = smallWidthFraction * canvasWidth;
  const smallHeight = smallWidth / frameAspect;
  const captionWidth = canvasWidth * 0.84;
  const captionHeight = canvasHeight * 0.28;
  if (layout === "hero") return {
    caption: { x: canvasWidth * 0.08, y: canvasHeight * 0.09, width: captionWidth, height: captionHeight, align: "center" },
    device: { x: (canvasWidth - deviceWidth) / 2, y: canvasHeight - deviceHeight + deviceHeight * 0.15, width: deviceWidth, height: deviceHeight },
  };
  if (layout === "device-bottom") return {
    caption: { x: canvasWidth * 0.08, y: canvasHeight * 0.08, width: captionWidth, height: captionHeight, align: "center" },
    device: { x: (canvasWidth - deviceWidth) / 2, y: canvasHeight - deviceHeight - canvasHeight * 0.02, width: deviceWidth, height: deviceHeight },
  };
  if (layout === "device-top") return {
    caption: { x: canvasWidth * 0.08, y: canvasHeight * 0.65, width: captionWidth, height: captionHeight, align: "center" },
    device: { x: (canvasWidth - deviceWidth) / 2, y: -canvasHeight * 0.1, width: deviceWidth, height: deviceHeight },
  };
  if (layout === "two-devices") return {
    caption: { x: canvasWidth * 0.08, y: canvasHeight * 0.08, width: captionWidth, height: captionHeight, align: "center" },
    deviceSecondary: { x: -canvasWidth * 0.06, y: canvasHeight - smallHeight - canvasHeight * 0.05, width: smallWidth, height: smallHeight },
    device: { x: canvasWidth - deviceWidth * 0.9 + canvasWidth * 0.06, y: canvasHeight - deviceHeight * 0.9 - canvasHeight * 0.02, width: deviceWidth * 0.9, height: (deviceWidth * 0.9) / frameAspect },
  };
  if (layout === "no-device") return {
    caption: { x: canvasWidth * 0.1, y: canvasHeight * 0.35, width: canvasWidth * 0.8, height: canvasHeight * 0.3, align: "center" },
  };
  if (layout === "split-landscape") return {
    caption: { x: canvasWidth * 0.05, y: canvasHeight * 0.25, width: canvasWidth * 0.38, height: canvasHeight * 0.5, align: "left" },
    device: { x: canvasWidth - deviceWidth + canvasWidth * 0.03, y: (canvasHeight - deviceHeight) / 2, width: deviceWidth, height: deviceHeight },
  };
  return {};
}

export function slideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = getCanvas(device, orientation);
  const { Frame, width, smallWidth } = getFrameForDevice(device, orientation);
  const frameAspect = getFrameAspect(device, orientation);
  const defaults = getDefaultRects(slide.layout, cW, cH, frameAspect, width(cW, cH), smallWidth(cW, cH));
  return { cW, cH, Frame, frameAspect, defaults };
}

export function builtInRect(
  id: BuiltInElementId,
  slide: Slide,
  defaults: LayoutRects,
): (CanvasRect & { align?: "center" | "left" }) | undefined {
  const saved = slide.transforms?.[id];
  const fallback = defaults[id];
  if (!saved) return fallback;
  return { ...saved, align: defaults.caption && id === "caption" ? defaults.caption.align : undefined };
}

export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (id.startsWith("layer:")) {
    return slide.layers?.find((layer) => layer.id === id.slice(6))?.transform;
  }
  if (id.startsWith("text:")) {
    return slide.textElements?.find((element) => element.id === id.slice(5))?.transform;
  }
  const builtInId = id as BuiltInElementId;
  const { defaults } = slideGeometry(slide, device, orientation);
  const rect = builtInRect(builtInId, slide, defaults);
  if (!rect) return undefined;
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: slide.transforms?.[builtInId]?.rotation || 0,
    zIndex: slide.transforms?.[builtInId]?.zIndex || (builtInId === "deviceSecondary" ? 2 : builtInId === "device" ? 3 : 4),
  };
}

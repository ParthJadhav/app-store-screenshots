import { getExportSizes, supportsLandscape } from "./constants";
import { detectPlatform } from "./defaults";
import { DEVICES } from "./project-schema";
import type { Device, Orientation, ProjectState, Slide, Theme } from "./types";

export type ExportUnit = {
  variantId: string;
  variantName: string;
  device: Device;
  orientation: Orientation;
  locale: string;
  width: number;
  height: number;
  slideIndex: number;
  slide: Slide;
  path: string;
  theme: Theme;
};

export type ExportPlanOptions = {
  variantIds?: string[];
  devices?: Device[];
  includeLandscape?: boolean;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "default";
}

export function buildExportPlan(
  state: ProjectState,
  theme: Theme,
  options: ExportPlanOptions = {},
): ExportUnit[] {
  const variants = options.variantIds?.length
    ? state.variants.filter((variant) => options.variantIds!.includes(variant.id))
    : state.variants;
  const devices = options.devices?.length ? options.devices : DEVICES;
  const includeLandscape = options.includeLandscape !== false;
  const units: ExportUnit[] = [];
  for (const variant of variants) {
    for (const device of devices) {
      const orientations: Orientation[] = supportsLandscape(device) && includeLandscape
        ? ["portrait", "landscape"]
        : ["portrait"];
      for (const orientation of orientations) {
        for (const locale of state.locales) {
          for (const size of getExportSizes(device, orientation)) {
            for (const [slideIndex, slide] of variant.slidesByDevice[device].entries()) {
              const filename = `${String(slideIndex + 1).padStart(2, "0")}-${slide.layout}.png`;
              units.push({
                variantId: variant.id,
                variantName: variant.name,
                device,
                orientation,
                locale,
                width: size.w,
                height: size.h,
                slideIndex,
                slide,
                theme,
                path: `${slug(variant.name)}/${detectPlatform(device)}/${device}/${orientation}/${size.w}x${size.h}/${locale}/${filename}`,
              });
            }
          }
        }
      }
    }
  }
  return units;
}

export function exportManifest(state: ProjectState, units: ExportUnit[]) {
  return {
    schemaVersion: state.schemaVersion,
    appName: state.appName,
    generatedAt: new Date().toISOString(),
    variants: state.variants.map(({ id, name }) => ({ id, name })),
    locales: state.locales,
    files: units.map((unit) => ({
      path: unit.path,
      variantId: unit.variantId,
      device: unit.device,
      orientation: unit.orientation,
      locale: unit.locale,
      width: unit.width,
      height: unit.height,
      slideId: unit.slide.id,
    })),
  };
}

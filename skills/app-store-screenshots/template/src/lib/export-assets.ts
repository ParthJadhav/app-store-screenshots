import { ALL_DEVICES, duoCompanion, isDuoDevice } from "./devices";
import { captureFits, duoGeometry, frameAssetPaths } from "./frame-assets";
import { imgSize } from "./image-cache";
import { elementRects, isFeatureGraphic } from "./layouts";
import { resolveScreenshot } from "./locale";
import type { Device, ProjectState, Slide } from "./types";

// A device moved onto a "No device" screen is still drawn, and the back
// device falls back to the front screenshot.
function drawnDevices(state: ProjectState, slide: Slide, device: Device) {
  const { device: front, deviceSecondary: back } = elementRects(slide, device, state.orientation);
  return { any: !!(front || back), back: !!back };
}

/** Screenshots, icon and overlays a deck draws, in every locale. */
function deckImages(state: ProjectState, device: Device): string[] {
  const paths: string[] = [];
  for (const slide of state.slidesByDevice[device] || []) {
    if (isFeatureGraphic(slide, device)) {
      if (state.appIcon) paths.push(state.appIcon);
      continue;
    }
    const drawn = drawnDevices(state, slide, device);
    for (const locale of state.locales) {
      if (drawn.any) paths.push(resolveScreenshot(slide.screenshot, locale));
      if (drawn.back) paths.push(resolveScreenshot(slide.screenshotSecondary, locale));
    }
    for (const image of slide.imageElements || []) paths.push(image.src);
  }
  return paths;
}

/** Every image a deck's export needs: its images plus the frames it draws them in. */
export function deckAssetPaths(state: ProjectState, device: Device): string[] {
  const paths = new Set(deckImages(state, device));
  const slides = state.slidesByDevice[device] || [];
  if (slides.some((slide) => drawnDevices(state, slide, device).any)) {
    for (const path of frameAssetPaths(device, state.orientation)) paths.add(path);
  }
  paths.delete("");
  return [...paths];
}

/**
 * Images to load before the editor shows: the open deck with its frames, and
 * every other deck's images so switching decks and bulk export don't race
 * image loads. Other decks' bezels are large and load when opened.
 */
export function preloadPaths(state: ProjectState): string[] {
  const paths = new Set(deckAssetPaths(state, state.device));
  for (const device of ALL_DEVICES) for (const path of deckImages(state, device)) paths.add(path);
  paths.delete("");
  return [...paths].sort();
}

/** Screens of the open deck whose export will look wrong, by problem. */
export function screenshotIssues(state: ProjectState) {
  const { device, locales } = state;
  const slides = state.slidesByDevice[device] || [];
  // On iPhone Duo the back device is the other display: it never reuses the
  // front capture, so a missing one leaves that device empty.
  const duoPair = (slide: Slide) => isDuoDevice(device) && slide.layout === "two-devices";
  // A capture from another display is letterboxed inside a Duo frame, never
  // cropped or stretched, so name it rather than let it pass unnoticed.
  const fitsDisplay = (raw: string | undefined, display: Device) =>
    !raw || !isDuoDevice(display) ||
    locales.every((locale) =>
      captureFits(imgSize(resolveScreenshot(raw, locale)), duoGeometry(display).screenAspect, display),
    );
  const drawn = slides.map((slide) => ({ slide, ...drawnDevices(state, slide, device) }));
  return {
    missing: drawn.filter(({ slide, any }) =>
      any && (!slide.screenshot || (duoPair(slide) && !slide.screenshotSecondary)),
    ).length,
    reusedBack: drawn.filter(({ slide, back }) =>
      back && !duoPair(slide) && !!slide.screenshot && !slide.screenshotSecondary,
    ).length,
    mismatched: isDuoDevice(device)
      ? drawn.filter(({ slide, any, back }) =>
          any &&
          (!fitsDisplay(slide.screenshot, device) || (back && !fitsDisplay(slide.screenshotSecondary, duoCompanion(device)))),
        ).length
      : 0,
  };
}

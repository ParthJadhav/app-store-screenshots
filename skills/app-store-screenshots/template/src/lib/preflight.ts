import { getCanvasSize, supportsLandscape, themeById } from "./constants";
import { intersectsSafeArea } from "./canvas-geometry";
import { DEVICES } from "./project-schema";
import type { Device, ProjectState, Slide, Theme } from "./types";

export type PreflightSeverity = "error" | "warning" | "info";

export type PreflightIssue = {
  id: string;
  severity: PreflightSeverity;
  code: string;
  title: string;
  detail: string;
  variantId?: string;
  device?: Device;
  slideId?: string;
  locale?: string;
};

export type PreflightReport = {
  issues: PreflightIssue[];
  errors: number;
  warnings: number;
  passed: boolean;
};

function requiresScreenshot(device: Device, slide: Slide) {
  return device !== "feature-graphic" && slide.layout !== "no-device" && slide.layout !== "feature-graphic";
}

function localizedValue(field: Partial<Record<string, string>> | undefined, locale: string) {
  return field?.[locale]?.trim() || "";
}

function luminance(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground: string, background: string) {
  const fg = luminance(foreground);
  const bg = luminance(background);
  if (fg == null || bg == null) return null;
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

function checkTheme(theme: Theme, issues: PreflightIssue[]) {
  for (const [foreground, background, mode] of [
    [theme.fg, theme.bg, "default"],
    [theme.fgAlt, theme.bgAlt, "inverted"],
  ] as const) {
    const ratio = contrastRatio(foreground, background);
    if (ratio != null && ratio < 4.5) {
      issues.push({
        id: `theme-contrast-${mode}`,
        severity: "warning",
        code: "theme-contrast",
        title: "Theme contrast is low",
        detail: `${theme.name} ${mode} text contrast is ${ratio.toFixed(2)}:1; target at least 4.5:1.`,
      });
    }
  }
}

export function runPreflight(state: ProjectState): PreflightReport {
  const issues: PreflightIssue[] = [];
  const linkCounts = new Map<string, number>();
  checkTheme(themeById(state.themeId, state.customThemes), issues);

  for (const variant of state.variants) {
    const seenIds = new Set<string>();
    for (const device of DEVICES) {
      const slides = variant.slidesByDevice[device] || [];
      const limit = device === "iphone" || device === "ipad" ? 10 : 8;
      if (!slides.length) {
        issues.push({
          id: `${variant.id}-${device}-empty`, severity: "error", code: "empty-deck",
          title: "Device deck is empty", detail: `${variant.name} has no ${device} screens.`, variantId: variant.id, device,
        });
      }
      if (slides.length > limit) {
        issues.push({
          id: `${variant.id}-${device}-limit`, severity: "error", code: "slide-limit",
          title: "Store screenshot limit exceeded", detail: `${slides.length} screens exceed the ${limit}-screen limit.`, variantId: variant.id, device,
        });
      }
      const orientations = supportsLandscape(device) ? ["portrait", "landscape"] as const : ["portrait"] as const;
      for (const [index, slide] of slides.entries()) {
        const context = { variantId: variant.id, device, slideId: slide.id };
        if (seenIds.has(slide.id)) {
          issues.push({
            id: `${variant.id}-${device}-${slide.id}-duplicate`, severity: "error", code: "duplicate-id",
            title: "Duplicate slide ID", detail: `Screen ${index + 1} reuses ID '${slide.id}'.`, ...context,
          });
        }
        seenIds.add(slide.id);
        if (requiresScreenshot(device, slide) && !slide.screenshot) {
          issues.push({
            id: `${variant.id}-${device}-${slide.id}-screenshot`, severity: "warning", code: "missing-screenshot",
            title: "Screenshot is missing", detail: `Screen ${index + 1} will export an empty device.`, ...context,
          });
        }
        if (slide.layout === "two-devices" && slide.screenshot && !slide.screenshotSecondary) {
          issues.push({
            id: `${variant.id}-${device}-${slide.id}-secondary`, severity: "warning", code: "missing-secondary-screenshot",
            title: "Secondary screenshot is missing", detail: `Screen ${index + 1} will reuse the primary screenshot in the back device.`, ...context,
          });
        }
        for (const locale of state.locales) {
          if (!localizedValue(slide.headline, locale)) {
            issues.push({
              id: `${variant.id}-${device}-${slide.id}-${locale}-headline`, severity: "warning", code: "missing-copy",
              title: "Localized headline is missing", detail: `${locale.toUpperCase()} will fall back to another locale.`, ...context, locale,
            });
          }
        }
        for (const layer of slide.layers || []) {
          if (seenIds.has(layer.id)) {
            issues.push({
              id: `${variant.id}-${device}-${slide.id}-${layer.id}-duplicate`, severity: "error", code: "duplicate-id",
              title: "Duplicate layer ID", detail: `Layer '${layer.name}' reuses ID '${layer.id}'.`, ...context,
            });
          }
          seenIds.add(layer.id);
          if (layer.linkId) linkCounts.set(layer.linkId, (linkCounts.get(layer.linkId) || 0) + 1);
          if (layer.kind === "text") {
            for (const locale of state.locales) {
              if (!localizedValue(layer.text, locale)) {
                issues.push({
                  id: `${variant.id}-${device}-${slide.id}-${layer.id}-${locale}`, severity: "warning", code: "missing-layer-copy",
                  title: "Layer translation is missing", detail: `${layer.name} has no ${locale.toUpperCase()} text.`, ...context, locale,
                });
              }
            }
            const unsafeOrientation = orientations.find((orientation) => {
              const { cW, cH } = getCanvasSize(device, orientation);
              return !intersectsSafeArea(layer.transform, { width: cW, height: cH }, state.canvasSettings.safeAreaPercent);
            });
            if (unsafeOrientation) {
              issues.push({
                id: `${variant.id}-${device}-${slide.id}-${layer.id}-safe`, severity: "warning", code: "safe-area",
                title: "Text crosses the safe area", detail: `${layer.name} extends into the outer ${state.canvasSettings.safeAreaPercent}% margin in ${unsafeOrientation}.`, ...context,
              });
            }
          }
        }
      }
    }
  }

  for (const [linkId, count] of linkCounts) {
    if (count < 2) {
      issues.push({
        id: `orphan-link-${linkId}`, severity: "warning", code: "orphan-link",
        title: "Linked layer has no partner", detail: `Link '${linkId}' appears only once.`,
      });
    }
  }
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { issues, errors, warnings, passed: errors === 0 };
}

---
name: app-store-screenshots
description: Use when building App Store screenshot pages, generating exportable marketing screenshots for iOS apps, or creating programmatic screenshot generators with Next.js. Triggers on app store, screenshots, marketing assets, html2canvas, phone mockup.
---

# App Store Screenshots Generator

## Overview

Build a Next.js page that renders iOS App Store screenshots as **advertisements** (not UI showcases) and exports them via `html2canvas` + `jszip` at Apple's required resolutions. Screenshots are the single most important conversion asset on the App Store.

## Core Principle

**Screenshots are advertisements, not documentation.** Every screenshot sells one idea. If you're showing UI, you're doing it wrong — you're selling a *feeling*, an *outcome*, or killing a *pain point*.

## Step 1: Ask the User These Questions

Before writing ANY code, ask the user all of these. Do not proceed until you have answers:

### Required

1. **App screenshots** — "Where are your app screenshots? (PNG files of actual device captures)"
2. **App icon** — "Where is your app icon PNG?"
3. **Brand colors** — "What are your brand colors? (accent color, text color, background preference)"
4. **Font** — "What font does your app use? (or what font do you want for the screenshots?)"
5. **Feature list** — "List your app's features in priority order. What's the #1 thing your app does?"
6. **Number of slides** — "How many screenshots do you want? (Apple allows up to 10)"
7. **Style direction** — "What style do you want? Examples: warm/organic, dark/moody, clean/minimal, bold/colorful, gradient-heavy, flat. Share App Store screenshot references if you have any."

### Optional

8. **Component assets** — "Do you have any UI element PNGs (cards, widgets, etc.) you want as floating decorations? If not, that's fine — we'll skip them."
9. **Additional instructions** — "Any specific requirements, constraints, or preferences?"

### Derived from answers (do NOT ask — decide yourself)

Based on the user's style direction, brand colors, and app aesthetic, decide:
- **Background style**: gradient direction, colors, whether light or dark base
- **Decorative elements**: blobs, glows, geometric shapes, or none — match the style
- **Dark vs light slides**: how many of each, which features suit dark treatment
- **Typography treatment**: weight, tracking, line height — match the brand personality
- **Color palette**: derive text colors, secondary colors, shadow tints from the brand colors

**IMPORTANT:** If the user gives additional instructions at any point during the process, follow them. User instructions always override skill defaults.

## Step 2: Set Up the Project

### Detect Package Manager

Check what's available, use this priority: **bun > pnpm > yarn > npm**

```bash
# Check in order
which bun && echo "use bun" || which pnpm && echo "use pnpm" || which yarn && echo "use yarn" || echo "use npm"
```

### Scaffold (if no existing Next.js project)

```bash
# With bun:
bunx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
bun add html2canvas jszip

# With pnpm:
pnpx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
pnpm add html2canvas jszip

# With yarn:
yarn create next-app . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
yarn add html2canvas jszip

# With npm:
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
npm install html2canvas jszip
```

### Fix Turbopack Workspace Root

If the project is nested inside another project (e.g., inside a monorepo or app directory), Turbopack may infer the wrong workspace root, causing extremely slow compilation or hangs. **Always** set `turbopack.root` in `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
```

### Copy the Phone Mockup

The skill includes a pre-measured iPhone mockup at `mockup.png` (co-located with this SKILL.md). Copy it to the project's `public/` directory. The mockup file is in the same directory as this skill file.

### File Structure

```
project/
├── public/
│   ├── mockup.png              # Phone frame (included with skill)
│   ├── app-icon.png            # User's app icon
│   └── screenshots/            # User's app screenshots
│       ├── home.png
│       ├── feature-1.png
│       └── ...
├── src/app/
│   ├── layout.tsx              # Font setup
│   └── page.tsx                # The screenshot generator (single file)
└── package.json
```

**The entire generator is a single `page.tsx` file.** No routing, no extra layouts, no API routes.

### Font Setup

```tsx
// src/app/layout.tsx
import { YourFont } from "next/font/google"; // Use whatever font the user specified
const font = YourFont({ subsets: ["latin"] });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html><body className={font.className}>{children}</body></html>;
}
```

## Step 3: Plan the Slides

### Screenshot Framework (Narrative Arc)

Adapt this framework to the user's requested slide count. Not all slots are required — pick what fits:

| Slot | Purpose | Notes |
|------|---------|-------|
| #1 | **Hero / Main Benefit** | App icon + tagline + home screen. This is the ONLY one most people see. |
| #2 | **Differentiator** | What makes this app unique vs competitors |
| #3 | **Ecosystem** | Widgets, extensions, watch — beyond the main app. Skip if N/A. |
| #4+ | **Core Features** | One feature per slide, most important first |
| 2nd to last | **Trust Signal** | Identity/craft — "made for people who [X]" |
| Last | **More Features** | Pills listing extras + coming soon. Skip if few features. |

**Rules:**
- Each slide sells ONE idea. Never two features on one slide.
- Vary layouts across slides — never repeat the same template structure.
- Include 1-2 contrast slides (inverted bg) for visual rhythm.

## Step 4: Write Copy FIRST

Get all headlines approved before building layouts. Bad copy ruins good design.

### The Iron Rules

1. **One idea per headline.** Never join two things with "and."
2. **Short, common words.** 1-2 syllables. No jargon unless it's domain-specific.
3. **3-5 words per line.** Must be readable at thumbnail size in the App Store.
4. **Line breaks are intentional.** Control where lines break with `<br />`.

### Three Approaches (pick one per slide)

| Type | What it does | Example |
|------|-------------|---------|
| **Paint a moment** | You picture yourself doing it | "Check your coffee without opening the app." |
| **State an outcome** | What your life looks like after | "A home for every coffee you buy." |
| **Kill a pain** | Name a problem and destroy it | "Never waste a great bag of coffee." |

### What NEVER Works

- **Feature lists as headlines**: "Log every item with tags, categories, and notes"
- **Two ideas joined by "and"**: "Track X and never miss Y"
- **Compound clauses**: "Save and customize X for every Y you own"
- **Vague aspirational**: "Every item, tracked"
- **Marketing buzzwords**: "AI-powered tips" (unless it's actually AI)

### Copy Process

1. Write 3 options per slide using the three approaches
2. Read each at arm's length — if you can't parse it in 1 second, it's too complex
3. Check: does each line have 3-5 words? If not, adjust line breaks
4. Present options to the user with reasoning for each

### Reference Apps for Copy Style

- **Raycast** — specific, descriptive, one concrete value per slide
- **Turf** — ultra-simple action verbs, conversational
- **Mela / Notion** — warm, minimal, elegant

## Step 5: Build the Page

### Architecture

```
page.tsx
├── Constants (W, H, SIZES, design tokens from user's brand)
├── Phone component (mockup with screen overlay)
├── Caption component (label + headline)
├── Decorative components (blobs, glows, shapes — based on style direction)
├── Screenshot1..N components (one per slide)
├── SCREENSHOTS array (registry)
├── ScreenshotPreview (ResizeObserver scaling + click-to-export)
├── captureToBlob (html2canvas capture helper)
├── downloadBlob (single file download)
└── ScreenshotsPage (grid + toolbar + zip export via JSZip)
```

### Export Sizes (Apple Required — iPhone only, portrait)

```typescript
const SIZES = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
] as const;
```

Design at the LARGEST size (1320x2868) and scale down for export.

### Rendering Strategy

Each screenshot is designed at full resolution (1320x2868px). Two copies exist:

1. **Preview**: CSS `transform: scale()` via ResizeObserver to fit a grid card
2. **Export**: Offscreen at `position: absolute; left: -9999px` at true resolution

### Phone Mockup Component

The included `mockup.png` has these pre-measured values:

```typescript
const MK_W = 1022;  // mockup image width
const MK_H = 2082;  // mockup image height
const SC_L = (52 / MK_W) * 100;   // screen left offset %
const SC_T = (46 / MK_H) * 100;   // screen top offset %
const SC_W = (918 / MK_W) * 100;  // screen width %
const SC_H = (1990 / MK_H) * 100; // screen height %
const SC_RX = (126 / 918) * 100;  // border-radius x %
const SC_RY = (126 / 1990) * 100; // border-radius y %
```

```tsx
function Phone({ src, alt, style, className = "" }: {
  src: string; alt: string; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`relative ${className}`}
      style={{ aspectRatio: `${MK_W}/${MK_H}`, ...style }}>
      <img src="/mockup.png" alt=""
        className="block w-full h-full" draggable={false} />
      <div className="absolute z-10 overflow-hidden"
        style={{
          left: `${SC_L}%`, top: `${SC_T}%`,
          width: `${SC_W}%`, height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
        }}>
        <img src={src} alt={alt}
          className="block w-full h-full object-cover object-top"
          draggable={false} />
      </div>
    </div>
  );
}
```

### Typography (Resolution-Independent)

All sizing relative to canvas width W:

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Category label | `W * 0.028` | 600 (semibold) | default |
| Headline | `W * 0.09` to `W * 0.1` | 700 (bold) | 1.0 |
| Hero headline | `W * 0.1` | 700 (bold) | 0.92 |

### Phone Placement Patterns

Vary across slides — NEVER use the same layout twice in a row:

**Centered phone** (hero, single-feature):
```
bottom: 0, width: "82-86%", translateX(-50%) translateY(12-14%)
```

**Two phones layered** (comparison):
```
Back: left: "-8%", width: "65%", rotate(-4deg), opacity: 0.55
Front: right: "-4%", width: "82%", translateY(10%)
```

**Phone + floating elements** (only if user provided component PNGs):
```
Cards should NOT block the phone's main content.
Position at edges, slight rotation (2-5deg), drop shadows.
If distracting, push partially off-screen or make smaller.
```

### "More Features" Slide (Optional)

Dark/contrast background with app icon, headline ("And so much more."), and feature pills. Can include a "Coming Soon" section with dimmer pills.

## Step 6: Export

### Why html2canvas + JSZip

**DO NOT use `html-to-image` (or `dom-to-image`).** It serializes the entire DOM into an SVG foreignObject, which hangs or crashes when screenshot images are large (500KB+). This is a consistent, reproducible failure — not an edge case.

**Use `html2canvas`** instead. It renders directly to a Canvas element without SVG serialization. It handles CSS gradients, transforms, border-radius, and opacity reliably. The only things it struggles with are CSS `filter`, `backdrop-filter`, and `mix-blend-mode` — avoid those in slide designs.

**Use `JSZip` for "Export All".** Browsers block multiple programmatic downloads triggered in sequence. Bundling all screenshots into a single zip file is the only reliable way to export all at once.

### Export Implementation

```typescript
import html2canvas from "html2canvas";
import JSZip from "jszip";

// ─── Capture a single element to a Blob ───
async function captureToBlob(
  el: HTMLDivElement,
  targetW: number,
  targetH: number
): Promise<Blob> {
  // Move on-screen for capture
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.opacity = "1";
  el.style.zIndex = "-1";

  // Wait for images + paint
  await new Promise((r) => setTimeout(r, 200));

  try {
    const srcCanvas = await html2canvas(el, {
      width: W,
      height: H,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    // Resize to target if different from design size
    let finalCanvas = srcCanvas;
    if (targetW !== W || targetH !== H) {
      finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetW;
      finalCanvas.height = targetH;
      const ctx = finalCanvas.getContext("2d")!;
      ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);
    }

    return await new Promise<Blob>((res) =>
      finalCanvas.toBlob((b) => res(b!), "image/png")
    );
  } finally {
    // Move back off-screen
    el.style.left = "-9999px";
    el.style.top = "";
    el.style.opacity = "";
    el.style.zIndex = "";
  }
}

// ─── Download a blob ───
function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ─── Export All: capture all slides into a zip ───
async function exportAll(refs, size) {
  const zip = new JSZip();
  for (let i = 0; i < SCREENSHOTS.length; i++) {
    const ss = SCREENSHOTS[i];
    const el = refs.get(ss.id);
    if (!el) continue;
    const blob = await captureToBlob(el, size.w, size.h);
    const idx = String(i + 1).padStart(2, "0");
    zip.file(`${idx}-${ss.id}-${size.w}x${size.h}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `screenshots-${size.w}x${size.h}.zip`);
}

// ─── Export Single: download one PNG ───
async function exportSingle(el, id, index, size) {
  const blob = await captureToBlob(el, size.w, size.h);
  const idx = String(index + 1).padStart(2, "0");
  downloadBlob(blob, `${idx}-${id}-${size.w}x${size.h}.png`);
}
```

### Key Rules

- **NEVER use html-to-image / dom-to-image.** They hang on large images.
- **On-screen for capture**: Move to `left: 0; top: 0` before `html2canvas`. Move back to `left: -9999px` after.
- **Offscreen container**: Use `position: absolute; left: -9999px` (not `display: none` or `visibility: hidden` — html2canvas needs the element in the layout).
- **200ms settle time**: Wait after moving on-screen so images paint before capture.
- **Zip for bulk export**: Always use JSZip for "Export All" — individual downloads get blocked by browsers.
- **Numbered filenames**: Prefix with zero-padded index: `01-hero-1320x2868.png`.
- **Avoid CSS filters in slides**: `filter`, `backdrop-filter`, and `mix-blend-mode` don't render in html2canvas. Use `opacity`, `background: radial-gradient(...)`, and `box-shadow` instead for visual effects.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| All slides look the same | Vary phone position (center, left, right, two-phone, no-phone) |
| Decorative elements invisible | Increase size and opacity — better too visible than invisible |
| Copy is too complex | "One second at arm's length" test |
| Floating elements block the phone | Move off-screen edges or above the phone |
| Plain white/black background | Use gradients — even subtle ones add depth |
| Too cluttered | Remove floating elements, simplify to phone + caption |
| Too simple/empty | Add larger decorative elements, floating items at edges |
| Headlines use "and" | Split into two slides or pick one idea |
| No visual contrast across slides | Mix light and dark backgrounds |
| Export hangs or is blank | Use html2canvas (NOT html-to-image). Move element on-screen before capture. Wait 200ms for paint. |
| "Export All" only downloads first file | Browsers block multiple downloads. Use JSZip to bundle into a single zip file. |
| Using html-to-image / dom-to-image | **NEVER.** These hang on large images (>500KB). Always use html2canvas. |
| Page won't load / stuck compiling | Set `turbopack.root: "."` in next.config.ts. Kill zombie node processes on the port. Clear `.next` cache. |
| Zombie server blocking port | Run `lsof -ti:PORT \| xargs kill -9` before starting new server. |
| CSS effects missing in export | html2canvas doesn't support `filter`, `backdrop-filter`, `mix-blend-mode`. Use `opacity`, `radial-gradient`, `box-shadow` instead. |

---
name: app-store-screenshots
description: Use when building App Store or Google Play screenshot pages, generating exportable marketing screenshots for iOS, macOS, and/or Android apps, or scaffolding a screenshot editor with Next.js. Triggers on app store, mac app store, play store, screenshots, marketing assets, html-to-image, phone mockup, mac mockup, android screenshots, feature graphic.
---

# App Store & Google Play Screenshots Generator

## Overview

Scaffold a pre-built Next.js + ShadCN editor that lets the user design and export App Store **and** Google Play screenshots as **advertisements** (not UI showcases). The editor handles all the heavy lifting:

- Connected live preview at the canvas's true resolution (scaled to fit)
- Drag-to-reorder screens, inline text editing, layout switcher per screen
- Cross-screen mockups: phone/device frames, captions, and layered elements can be moved across adjacent screens, then exported as clipped crops
- Drop-target screenshot picker (file → saved to `public/screenshots/uploaded/<hash>.png`)
- Auto-save to **`app-store-screenshots.json`** at the project root (git-trackable) + `localStorage` mirror
- Easy iOS ↔ Mac ↔ Android platform switch — separate slide decks live side by side
- One-click bulk PNG export at every Apple/Google-required resolution via `html-to-image`
- Light/dark variant toggle per slide, a toolbar theme picker (one palette preset per named style), locale select
- A **Copy ideas** menu next to the headline field with formulas for hero, differentiator, feature, proof, and closer slides
- Per-slide custom background colors (caption colours stay readable automatically), a live screenshot font menu, and importing licensed WOFF2/WOFF/TTF/OTF fonts
- Image overlay elements (logos, badges, photos) with drag/resize/rotation/layering controls and directional edge fades
- Toolbar Undo/Redo (`⌘Z` / `⇧⌘Z`) over the last 50 edits of the session
- Guided in-place migration for older projects created by this skill; passive and explicit migrations keep legacy decks isolated until the user intentionally opts into connected canvas

Supported devices out of the box:
- **iPhone** (portrait) — Apple App Store
- **iPad** (portrait) — Apple App Store
- **iPhone Duo** outer and inner displays, each in portrait and landscape (four decks) — Apple App Store; see "iPhone Duo" under Step 5
- **App Store creative assets**: universal 5244×2950, product page header 3840×1646, search results 3:2 — Apple App Store; see "App Store creative assets" under Step 5
- **Apple TV** (landscape, 4K + HD) — Apple App Store
- **Apple Watch** (portrait, every Ultra/Series size) — Apple App Store
- **CarPlay** (landscape head unit) — uploaded into the **iPhone** slot; see "Apple TV, Apple Watch and CarPlay" under Step 5
- **Mac** (16:10 landscape, own **Mac** tab) — Mac App Store (`2880×1800`, `2560×1600`, `1440×900`, `1280×800`); see "Mac" under Step 5
- **Android Phone** (portrait) — Google Play
- **Android Tablet 7"** (portrait + landscape) — Google Play
- **Android Tablet 10"** (portrait + landscape) — Google Play
- **Feature Graphic** (1024×500 banner) — Google Play store listing header

## Core Principle

**Screenshots are advertisements, not documentation.** Every screenshot sells one idea. If you're showing UI, you're doing it wrong — you're selling a *feeling*, an *outcome*, or killing a *pain point*. Use this skill's interactive editor to iterate on copy and layout fast; do not hand-craft the page from scratch.

## What This Skill Does

1. **Copies a pre-built template** from `template/` (co-located with this `SKILL.md`) into the user's working directory.
2. Installs dependencies with the user's package manager.
3. Drops the user's screenshots into `public/screenshots/...` and their app icon into `public/`.
4. (Optionally) prefills `app-store-screenshots.json` with the user's app name, starting copy, screenshots, and connected-canvas preference so the first preview is meaningful.
5. Starts the dev server and tells the user to open the editor in the browser.

You should NOT write `page.tsx`, device frames, or export logic by hand. They live in the template.

## Step 0: Probe for Existing Screenshot Projects

Before asking the new-project questions in Step 1, always inspect the current working directory for an existing app-store-screenshots implementation.

Run lightweight probes:

```bash
test -f package.json && sed -n '1,220p' package.json
test -f app-store-screenshots.json && sed -n '1,120p' app-store-screenshots.json
rg -n "app-store-screenshots|html-to-image|toPng|ScreenshotEditor|DeckCanvas|connectedCanvas|EXPORT_SIZES|mockup.png|PHONE_SCREEN" package.json src app public 2>/dev/null
find public -maxdepth 4 \( -path "*/screenshots*" -o -name "mockup.png" -o -name "app-icon.png" \) -print 2>/dev/null
```

Treat the project as an older implementation when any of these are true:

- `app-store-screenshots.json` exists but has no `schemaVersion`, has `schemaVersion < 2`, or lacks `connectedCanvas`.
- `src/components/editor/screenshot-editor.tsx` exists but the editor does not reference `DeckCanvas` or `connectedCanvas`.
- `src/app/page.tsx` contains a previous all-in-one generator (`html-to-image`, `toPng`, `EXPORT_SIZES`, `PHONE_SCREEN`, hardcoded slide arrays/themes).
- The repo contains the old screenshot asset layout (`public/mockup.png`, `public/screenshots...`) plus a screenshot generator package setup.

If an older implementation is detected, ask exactly one question before doing anything else:

> I found an older App Store screenshots project here. Do you want me to migrate this existing project to the new connected-canvas editor?
>
> 1. Yes — migrate the existing project to the new editor
> 2. No — set up or modify a project another way

If the user chooses **Yes**, do **not** ask the Step 1 questionnaire. Run the migration path below using the files already in the repo. If the user chooses **No**, continue to Step 1.

### Migration Path (When User Says Yes)

The goal is an in-place UI/template upgrade, not a redesign. Preserve the user's existing app name, copy, screenshot paths, app icon, uploaded assets, locales, and device decks wherever they already exist. Replace the old UI implementation with the current template. Keep legacy decks in isolated export mode unless the project already explicitly opted into connected canvas.

Migration rules:

1. **Do not ask further product/design questions.** The user already has a project. Infer from existing files and report any non-blocking gaps at the end.
2. **Never delete user assets.** Preserve `public/screenshots/`, `public/app-icon.png`, uploaded screenshots, and any existing `app-store-screenshots.json`.
3. **Preserve recoverability.** If the worktree is not clean, do not revert unrelated changes. Before overwriting template files, copy replaced project-state/assets/code snapshots to a temporary backup outside the repo (for example `/tmp/app-store-screenshots-migration-<timestamp>/`) and mention the path in the final response.
4. **Prefer structured migration.** Read and write `app-store-screenshots.json` with JSON tooling. Do not regex-edit JSON.
5. **Set `schemaVersion: 2` and keep legacy `connectedCanvas` safe.** If the existing project already has an explicit boolean `connectedCanvas`, preserve it. If the project is pre-v2 or lacks the flag, write `"connectedCanvas": false` so offscreen/clipped legacy mockups do not leak into neighboring exports. New projects still default to connected canvas.
6. **Keep screenshots pointed at existing files.** Do not rename screenshot files unless the old project already depended on numeric names and the migration needs them. Existing static paths are fine.
7. **Handle custom themes without asking.** If the old project references a custom `themeId`, merge the matching theme object into the new `src/lib/constants.ts` when it can be found. If it cannot be recovered, leave the `themeId` in project JSON; the editor will fall back to `clean-light` and warn, and you should note that a custom theme needs manual restoration.
8. **Merge package metadata when possible.** The template's dependencies and scripts must win for the screenshot editor, but preserve unrelated existing `dependencies`, `devDependencies`, and useful scripts unless they directly conflict.
9. **Do not import template sample decks into real migrations.** If the old project already has decks or screenshots, use the template for UI/code only. Keep template sample screenshots/decks out of the migrated project so the user's app does not inherit unrelated example content.
10. **Use a disposable copy for dogfooding.** If the user asks to test or review the migration instead of actually migrating their project, copy the app to a temp directory or worktree and run the migration there. Only touch the real checkout when the user explicitly asks for the real migration and answers **Yes**.

Recommended migration sequence:

```bash
# 1. Snapshot useful old files outside the repo.
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/tmp/app-store-screenshots-migration-$STAMP"
mkdir -p "$BACKUP_DIR"
cp -R app-store-screenshots.json public src package.json tailwind.config.ts next.config.mjs "$BACKUP_DIR/" 2>/dev/null || true

# 2. Preserve project state and assets that must survive template copy.
PRESERVE_DIR="$BACKUP_DIR/preserve"
mkdir -p "$PRESERVE_DIR"
cp app-store-screenshots.json "$PRESERVE_DIR/" 2>/dev/null || true
cp -R public/screenshots "$PRESERVE_DIR/screenshots" 2>/dev/null || true
cp public/app-icon.png "$PRESERVE_DIR/app-icon.png" 2>/dev/null || true

# 3. Copy the current template over the old UI implementation.
cp -R "<SKILL_DIR>/template/." "$PWD/"
cp app-store-screenshots.json "$BACKUP_DIR/template-app-store-screenshots.json" 2>/dev/null || true

# 4. Restore preserved user state/assets over template samples.
cp "$PRESERVE_DIR/app-store-screenshots.json" app-store-screenshots.json 2>/dev/null || true
mkdir -p public
if [ -d "$PRESERVE_DIR/screenshots" ]; then
  mkdir -p "$BACKUP_DIR/template-samples/public"
  mv public/screenshots "$BACKUP_DIR/template-samples/public/screenshots" 2>/dev/null || true
  cp -R "$PRESERVE_DIR/screenshots" public/screenshots
else
  mkdir -p public/screenshots
fi
cp "$PRESERVE_DIR/app-icon.png" public/app-icon.png 2>/dev/null || true
```

After copying, upgrade or create `app-store-screenshots.json`. If an existing project file exists, coerce it in place. If no project file exists but old slide data is embedded in `src/lib/defaults.ts` or `src/app/page.tsx`, extract it best-effort into the template's project JSON before falling back to starter slides. Prefer old arrays or objects named `slides`, `screens`, `features`, `defaultSlides`, `appName`, `tagline`, `theme`, and screenshot paths. If the old implementation only has image files, sort `public/screenshots/**` by path and seed slides from those files.

Use a small JSON script like this for the final project-state coercion:

```bash
BACKUP_DIR="$BACKUP_DIR" node <<'NODE'
const fs = require("fs");
const path = require("path");

const PROJECT_FILE = "app-store-screenshots.json";
const DEFAULT_LOCALE = "en";
const DEVICE_KEYS = ["iphone", "ipad", "duo-outer", "duo-outer-landscape", "duo-inner", "duo-inner-landscape", "tvos", "watchos", "carplay", "mac", "android", "android-7", "android-10", "feature-graphic", "creative-universal", "creative-header", "creative-search"];
const LAYOUTS = ["hero", "device-bottom", "device-top", "two-devices", "no-device", "split-landscape", "feature-graphic"];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const templateState =
  readJson(path.join(process.env.BACKUP_DIR || "", "template-app-store-screenshots.json")) ||
  readJson(PROJECT_FILE) ||
  {};
const existingState = readJson(PROJECT_FILE) || {};
const hasExplicitConnectedCanvas = typeof existingState.connectedCanvas === "boolean";
const existingDecks =
  existingState.slidesByDevice && typeof existingState.slidesByDevice === "object" && !Array.isArray(existingState.slidesByDevice)
    ? existingState.slidesByDevice
    : {};
const hasExistingDecks = Object.keys(existingDecks).length > 0;
const state = {
  ...templateState,
  ...existingState,
  slidesByDevice: hasExistingDecks ? existingDecks : templateState.slidesByDevice || {},
};

const legacySlides =
  Array.isArray(existingState.slides) ? existingState.slides :
  Array.isArray(existingState.screens) ? existingState.screens :
  Array.isArray(existingState.features) ? existingState.features :
  null;

if (legacySlides && !hasExistingDecks) {
  state.slidesByDevice = {
    iphone: legacySlides,
  };
}

function localized(value) {
  if (typeof value === "string") return { [DEFAULT_LOCALE]: value };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).filter(([, text]) => typeof text === "string"));
  }
  return {};
}

function cleanTransform(value) {
  if (!value || typeof value !== "object") return undefined;
  const { x, y, width, height, rotation, zIndex } = value;
  if (![x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    ...(typeof rotation === "number" && Number.isFinite(rotation) ? { rotation } : {}),
    ...(typeof zIndex === "number" && Number.isFinite(zIndex) ? { zIndex } : {}),
  };
}

function firstString(...values) {
  return values.find((value) => typeof value === "string") || "";
}

// The editor refuses to load a deck with empty or repeated screen ids.
function uniqueId(value, used) {
  let id = typeof value === "string" && value.trim() ? value : "";
  while (!id || used.has(id)) id = `migrated-${Math.random().toString(36).slice(2, 10)}`;
  used.add(id);
  return id;
}

function migrateSlide(slide, used) {
  if (!slide || typeof slide !== "object" || Array.isArray(slide)) return null;
  const transforms = {};
  const rawTransforms = slide.transforms && typeof slide.transforms === "object" ? slide.transforms : {};
  for (const [id, transform] of Object.entries(rawTransforms)) {
    const cleaned = cleanTransform(transform);
    if (["caption", "device", "deviceSecondary", "callout"].includes(id) && cleaned) transforms[id] = cleaned;
  }
  const textIds = new Set();
  const textElements = Array.isArray(slide.textElements)
    ? slide.textElements
        .map((element) => {
          if (!element || typeof element !== "object" || Array.isArray(element)) return null;
          const transform = cleanTransform(element.transform);
          if (!transform) return null;
          return {
            ...element,
            id: uniqueId(element.id, textIds),
            text: localized(element.text),
            transform,
            fontSize: Number.isFinite(element.fontSize) && element.fontSize > 0 ? element.fontSize : undefined,
            fontWeight: Number.isFinite(element.fontWeight) && element.fontWeight > 0 ? element.fontWeight : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  const imageIds = new Set();
  const imageElements = Array.isArray(slide.imageElements)
    ? slide.imageElements.map((element) => {
        if (!element || typeof element !== "object" || Array.isArray(element) || typeof element.src !== "string") return null;
        const transform = cleanTransform(element.transform);
        return transform ? { ...element, id: uniqueId(element.id, imageIds), transform } : null;
      }).filter(Boolean)
    : undefined;

  return {
    ...slide,
    id: uniqueId(slide.id, used),
    layout: LAYOUTS.includes(slide.layout) ? slide.layout : "device-bottom",
    label: localized(slide.label),
    headline: localized(slide.headline || slide.title || slide.caption || slide.copy),
    screenshot: firstString(slide.screenshot, slide.image, slide.src, slide.path),
    screenshotSecondary: typeof slide.screenshotSecondary === "string" ? slide.screenshotSecondary : undefined,
    inverted: typeof slide.inverted === "boolean" ? slide.inverted : undefined,
    ...(Object.keys(transforms).length ? { transforms } : { transforms: undefined }),
    ...(textElements && textElements.length ? { textElements } : { textElements: undefined }),
    ...(imageElements && imageElements.length ? { imageElements } : { imageElements: undefined }),
    // The editor clamps magnifier values on load; only a non-object would be rejected.
    callout: slide.callout && typeof slide.callout === "object" && !Array.isArray(slide.callout) ? slide.callout : undefined,
  };
}

state.schemaVersion = 2;
state.connectedCanvas = hasExplicitConnectedCanvas ? existingState.connectedCanvas : false;
// Unique codes like "en", "pt-BR", "zh_Hans"; anything else makes the editor refuse the file.
const LOCALE_CODE = /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/;
state.locales = Array.isArray(state.locales)
  ? [...new Set(state.locales.filter((locale) => typeof locale === "string" && LOCALE_CODE.test(locale)))]
  : [];
if (!state.locales.length) state.locales = [DEFAULT_LOCALE];
state.locale = state.locales.includes(state.locale) ? state.locale : state.locales[0];
state.device = DEVICE_KEYS.includes(state.device) ? state.device : "iphone";
if (state.orientation !== "portrait" && state.orientation !== "landscape") delete state.orientation;
for (const key of ["appName", "themeId", "appIcon"]) {
  if (state[key] !== undefined && typeof state[key] !== "string") delete state[key];
}
// The feature graphic only shows an icon that `appIcon` points at.
if (!state.appIcon && fs.existsSync(path.join("public", "app-icon.png"))) state.appIcon = "/app-icon.png";

if (state.slidesByDevice && typeof state.slidesByDevice === "object") {
  for (const [device, slides] of Object.entries(state.slidesByDevice)) {
    // The editor only accepts known device decks; the backup keeps the original.
    if (!DEVICE_KEYS.includes(device)) {
      delete state.slidesByDevice[device];
      continue;
    }
    const used = new Set();
    state.slidesByDevice[device] = Array.isArray(slides) ? slides.map((slide) => migrateSlide(slide, used)).filter(Boolean) : [];
  }
}

if (!state.slidesByDevice[state.device]) {
  const firstDeviceWithSlides = DEVICE_KEYS.find((device) => state.slidesByDevice[device]?.length);
  if (firstDeviceWithSlides) state.device = firstDeviceWithSlides;
}

fs.writeFileSync(PROJECT_FILE, JSON.stringify(state, null, 2) + "\n");
NODE
```

If `package.json` existed before the template copy, merge it after the project-state coercion instead of leaving a blind overwrite. Keep the template's `dev`, `build`, and `start` scripts and all editor dependencies, then add any old non-conflicting scripts and dependencies from the backed-up `package.json`.

```bash
BACKUP_DIR="$BACKUP_DIR" node <<'NODE'
const fs = require("fs");
const path = require("path");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const oldPkg = readJson(path.join(process.env.BACKUP_DIR || "", "package.json"));
const templatePkg = readJson("package.json");

if (oldPkg && templatePkg) {
  const merged = {
    ...oldPkg,
    ...templatePkg,
    scripts: {
      ...(oldPkg.scripts || {}),
      ...(templatePkg.scripts || {}),
    },
    dependencies: {
      ...(oldPkg.dependencies || {}),
      ...(templatePkg.dependencies || {}),
    },
    devDependencies: {
      ...(oldPkg.devDependencies || {}),
      ...(templatePkg.devDependencies || {}),
    },
  };

  fs.writeFileSync("package.json", JSON.stringify(merged, null, 2) + "\n");
}
NODE
```

Then install/update dependencies and verify:

```bash
bun install      # or pnpm install / yarn / npm install
set -o pipefail
bun run build 2>&1 | tee "$BACKUP_DIR/build.log"    # or the detected package-manager equivalent
```

Start the dev server and verify in the browser:

- The toolbar shows **Isolated** for migrated pre-v2 decks, unless the project file already explicitly had `"connectedCanvas": true`.
- Existing screens, copy, screenshot paths, and app icon are present.
- Referenced screenshot files exist for every configured locale, or the final report lists the missing paths.
- Device decks retained from the old project do not silently become template placeholders. If a retained deck has empty screenshots or lacks active-locale copy, report it as a follow-up instead of removing it.
- A bundle export succeeds for the active device.
- `app-store-screenshots.json` contains `"schemaVersion": 2` and a boolean `"connectedCanvas"` value.

## Step 1: Gather Input (Before Scaffolding)

Ask the user these. Do not proceed until you have answers:

### Required

1. **App screenshots** — "Do you already have screenshots of the devices?"
   - If **yes**: ask "Where are your app screenshots? (PNG files of actual device captures)" and proceed.
   - If **no** and the app is **iOS + Swift**: offer the companion capture skill — "Want to capture them automatically with the `ios-marketing-capture` skill (https://github.com/ParthJadhav/ios-marketing-capture)?" If they say yes, install it with:
     ```bash
     npx skills add ParthJadhav/ios-marketing-capture
     ```
     Then have them run that skill first to generate the screenshots before continuing here.
   - If **no** and the app is **not iOS + Swift** (e.g. Android, React Native, Flutter, web): the capture skill won't work — the user needs to capture screenshots manually (simulator/device screenshots) before continuing.
2. **App icon** — "Where is your app icon PNG?"
3. **App name** — "What's the app called?"
4. **Feature list** — "List your app's features in priority order. What's the #1 thing your app does?"
5. **Style direction** — "What style do you want? You can either (a) pick one of the named deep-spec styles, or (b) describe your own vibe in your own words (warm/organic, dark/moody, clean/minimal, bold/colorful, plus any reference apps you like) and I'll build a custom palette. The template also ships with palette presets in the toolbar theme picker: the generic `clean-light`, `dark-bold`, `warm-editorial`, `ocean-fresh`, and `bloom-roast`, plus one preset per named style (same id as the style slug). The named deep specs live in `style-prompts/` — see `style-prompts.md` for the full index. Currently available: Retro Rubberhose Mascot, Moody Curated Dating, Paper Sticker Skeuomorphic, Dreamy Pastel Couples, Hand-Drawn Editorial Tasks, Glossy 3D K-Beauty Creator, Liquid Glass Aurora, Swiss Grid Bold, Neon Athletic Night, Magazine Cover Editorial, Candy Pop Social, Soft Clay Wellness, Midnight Glow Pro, Risograph Zine, Bento Keynote Grid, Toybox Primary, Quiet Japandi, Vintage Travel Poster. If the user names one of these — or describes something that clearly matches one — read `style-prompts/_QUALITY_BAR.md` first, then the matching deep spec file, and apply its entire spec (palette, gradients, shadows, rotations, per-slide breakdown). If the user describes a fully custom style, fall back to the General Visual Design Principles below and pick the closest deep spec as a starting reference."

### Optional

6. **Target stores** — Apple App Store, Mac App Store, Google Play, or a mix? Determines which platform decks to seed.
7. **iPad / Mac / Android tablet screenshots** — If yes, what sizes and orientations?
8. **Apple TV / Apple Watch / CarPlay** — Does the app have a tvOS or watchOS app, or CarPlay support? Each gets its own deck.
9. **iPhone Duo** — Does the app support iPhone Duo? If so, read `iphone-duo.md` before planning. Ask: what does the app do differently on the inner display (two panes, sidebar, wider grid)? Which displays and orientations have their own layout? Do they have simulator captures from each display at the exact sizes? Apple's bezels for iPhone, iPad, Watch, TV, Mac and iPhone Duo ship with the template (see Step 5); ask only whether they want a different finish.
10. **App Store creative assets** — Do they want a product page header / search results asset? Default to one universal 5244×2950 asset; offer separate header and search assets only if they need different compositions. Ask for a short brand line for each; don't reuse a screenshot headline.
11. **Feature Graphic** — Want a 1024×500 Play Store banner too?
12. **Localized screenshots** — Languages? (e.g. en, de, es, pt, ja, ar, he)
13. **Number of slides** — Apple allows up to 10, Google Play up to 8.
14. **Brand colors / font** — If they want a custom theme beyond the built-in presets.
15. **Additional instructions** — Anything specific.

**IMPORTANT:** If the user gives instructions at any point, follow them. They override skill defaults.

## Step 2: Scaffold the Template

### Detect Package Manager

Priority: **bun > pnpm > yarn > npm**.

```bash
which bun && echo bun || which pnpm && echo pnpm || which yarn && echo yarn || echo npm
```

### Copy the Template

The template lives at `<this skill dir>/template/` — when the skill is installed, the whole folder is already on disk. Copy its contents (NOT the folder itself) into the user's working directory. The trailing `/.` copies dotfiles like `.gitignore` too.

```bash
# Replace <SKILL_DIR> with the absolute path to this skill (the directory containing SKILL.md).
cp -R "<SKILL_DIR>/template/." "$PWD/"
```

If the target directory already has a `package.json`, ask the user before overwriting during a new scaffold. If Step 0 detected an old implementation and the user chose **Yes**, do not ask this again; follow the migration path, preserve recoverability with the backup directory, and merge package metadata after the template copy.

### Install Dependencies

```bash
bun install      # or pnpm install / yarn / npm install
```

### Drop the User's Assets

Move the user's screenshots into the layout the template expects:

```
public/
├── app-icon.png                      # ← user's app icon
├── mockup.png                        # ← already copied by the template (iPhone bezel)
├── frames/                           # ← Apple's bezels, bundled; swap a file to change finish (Step 5)
└── screenshots/
    ├── apple/
    │   ├── iphone/{locale}/01.png … N.png
    │   ├── ipad/{locale}/01.png   … N.png
    │   ├── duo-outer/{portrait|landscape}/{locale}/01.png … N.png  # iPhone Duo outer display
    │   ├── duo-inner/{portrait|landscape}/{locale}/01.png … N.png  # iPhone Duo inner display
    │   ├── tvos/{locale}/01.png   … N.png   # Apple TV, 16:9
    │   ├── watchos/{locale}/01.png … N.png  # Apple Watch
    │   ├── carplay/{locale}/01.png … N.png  # CarPlay head-unit captures
    │   └── mac/{locale}/01.png    … N.png   # Mac, 16:10
    └── android/
        ├── phone/{locale}/01.png  … N.png
        ├── tablet-7/{portrait|landscape}/{locale}/...
        └── tablet-10/{portrait|landscape}/{locale}/...
```

The starter project state lives in `app-store-screenshots.json`, not `src/lib/defaults.ts`. If the user names their screenshots differently, either rename them or update the relevant slide `screenshot` fields in `app-store-screenshots.json` so the initial deck points at the right files. The user can also drag-drop files directly into the editor at runtime — those uploads are written to `public/screenshots/uploaded/<hash>.png` when the dev server is running.

### (Optional) Seed Initial Copy

If the user provided headlines, edit `app-store-screenshots.json` to set:
- `appName`
- `themeId` (one of `"clean-light" | "dark-bold" | "warm-editorial" | "ocean-fresh" | "bloom-roast"`, a named style slug such as `"swiss-grid-bold"` when the user picked that style, or add a matching entry to `THEMES` in `src/lib/constants.ts`). Themes may set `accentAlt` for the label color on inverted slides.
- `appIcon` — public path of the app icon (e.g. `"/app-icon.png"` after copying it to `public/app-icon.png`). The Play Store feature graphic shows it; blank uses the app's initial. The icon can also be picked in the feature-graphic inspector.
- `connectedCanvas` (`true` for new connected decks; migrated legacy decks should stay `false` until the user opts in)
- Starter slides per device with the user's `label` + `headline` + screenshot paths
- Optional `scene` for the whole project: `{ backdrop: "gradient"|"solid"|"aurora"|"spotlight"|"grid"|"dots"|"lines", span: boolean, decoration: "blobs"|"rings"|"sparkles"|"none", shadow: 0–100, glow: 0–100, tilt: -30–30, headlineWeight: 300–900, headlineCase: "as-typed"|"upper", captionAlign: "auto"|"left"|"center" }`. Omit it for the classic gradient + blobs look. Pick values that match the chosen style (e.g. `spotlight` + glow for dark pro styles, `lines` + left-aligned serif for editorial); the user can refine it in the editor's **Scene** popover or compare whole looks in **Style Lab**.
- Optional per-slide `callout: { focusX: 0–1, focusY: 0–1, zoom: 1.5–5, shape: "circle"|"rounded" }` to magnify one detail of the primary screenshot. It sits over the device's upper right unless `transforms.callout` places it.
- Optional per-slide `typography: { labelScale, headlineScale, appNameScale }` (0.5–2, default 1) when one headline is much longer or shorter than the rest of the deck. `appNameScale` only applies to the feature graphic, where `headlineScale` sizes the tagline.

Otherwise, leave the defaults — the user can rewrite copy in the editor.

### Start the Dev Server

```bash
bun dev    # → http://localhost:3000
```

Tell the user to open the URL and start editing. The editor auto-saves to **`app-store-screenshots.json`** at the project root (plus a `localStorage` mirror for instant paint). Uploaded screenshots land in `public/screenshots/uploaded/<hash>.png`. Both are git-trackable — committing them means another machine can `git clone` and resume the exact deck.

## Step 3: Coach the User on Copy

Inside the editor the user will write headlines themselves, but they often need guidance. Apply these rules when reviewing their copy or generating suggestions.

**Read [`copy-ideas.md`](./copy-ideas.md) before drafting headlines.** It has formulas per deck slot (hero, differentiator, feature, proof, closer), ready lines for 13 app categories, eyebrow labels, a weak-to-better table, four deck arcs, and localization notes. When you propose copy, give three options per slide (paint a moment / state an outcome / kill a pain), then rewrite the chosen one in the selected style's voice. The editor's inspector has a matching **Copy ideas** menu next to the headline field (`src/lib/copy-ideas.ts`) so users can drop in a formula and replace the bracketed words themselves.

### The Iron Rules

1. **One idea per headline.** Never join two things with "and."
2. **Short, common words.** 1-2 syllables. No jargon unless it's domain-specific.
3. **3-5 words per line.** Must be readable at thumbnail size in the App Store.
4. **Line breaks are intentional.** Newlines in the textarea map directly to visible breaks.

### Three Approaches

| Type | What it does | Example |
|------|-------------|---------|
| **Paint a moment** | You picture yourself doing it | "Check your coffee without opening the app." |
| **State an outcome** | What your life looks like after | "A home for every coffee you buy." |
| **Kill a pain** | Name a problem and destroy it | "Never waste a great bag of coffee." |

### Bad-to-Better

| Weak | Better | Why |
|------|--------|-----|
| Track habits and stay motivated | Keep your streak alive | one idea, faster to parse |
| Organize tasks with AI summaries | Turn notes into next steps | outcome-first, less jargon |
| Save recipes with tags and favorites | Find dinner fast | sells the benefit, not the UI |

### Narrative Arc

The user's slide deck should follow a rough arc (skip slots that don't fit):

| Slot | Purpose |
|------|---------|
| #1 | **Hero / Main Benefit** — the ONLY slide most people see |
| #2 | **Differentiator** — what makes the app unique |
| #3 | **Ecosystem** — widgets, watch, extensions (skip if N/A) |
| #4+ | **Core Features** — one per slide, most important first |
| 2nd-to-last | **Trust Signal** — "made for people who [X]" |
| Last | **More Features** — pills listing extras (skip if few features) |

### Layout Variation

Vary the `layout` field across slides. The editor exposes:
- `hero` — centered headline + bottom-anchored device
- `device-bottom` — same composition, smaller headline
- `device-top` — flipped, device above caption (good contrast slide)
- `two-devices` — back + front phones layered
- `no-device` — big standalone headline (use sparingly)
- `split-landscape` — caption left + device right (tablet landscape and Mac)
- `feature-graphic` — Play Store banner (1024×500)

Never repeat the same layout twice in a row. Use 1-2 `inverted` (dark) slides for visual rhythm.

On iPhone Duo decks, `two-devices` is **Folded + open**: the second device is the same phone in its other state, drawn in that display's frame. Its second capture comes from the other display.

### iPhone Duo Decks

Read `iphone-duo.md` before writing copy or seeding any Duo deck. It holds the research behind these rules, with sources. In short:

- **Plan the decks.** Lead with the inner display in landscape when the app has a real two-pane or wide layout. Add an outer portrait deck next. Make inner portrait and outer landscape decks only if the app has a real layout for them.
- **Show what only an open Duo can do.** At least one inner screenshot shows two panes, a sidebar or a wider grid. A screenshot that could have come from a normal iPhone wastes the Duo slot.
- **Inner landscape:** a one-line headline (about 30 characters or fewer) across the top, with the device large below. Pick captures where one pane's action and the other pane's result sit in the same frame.
- **Outer portrait:** a short, wide canvas. Use two short lines at most, large type, and one idea per screen. It can reuse the iPhone story.
- **Folded + open** once per deck, for the moment that carries across states ("Close it for today. Open it for the week.").
- **Write copy about what the user gets, not the hardware.** Localise every deck and check that each landscape line still fits on one line.

### Cross-Screen / Cross-Canvas Composition

Use the connected canvas as a design tool during Step 3, after the narrative arc and layout rhythm are chosen and before final export. For most decks with **5+ slides**, plan **one** tasteful cross-screen moment by default. For 8-10 slide decks, use at most **two**. For short, formal, or compliance-heavy decks, zero is fine. The goal is "these screenshots belong together," not "one giant poster chopped into pieces."

Good cross-screen patterns:
- An oversized phone, tablet, or screenshot mosaic bridges two adjacent screens by 10-30% of its width, while each exported crop still reads as a complete ad.
- A background horizon, photo, gradient, doodle path, waveform, starfield, sticker trail, or map route continues across the seam.
- A mascot, 3D object, floating chip, or notification peeks from one screen into the next as a secondary visual, not the whole message.
- Related ideas form a pair: problem → solution, before → after, overview → detail, plan → result.
- The seam passes through negative space, a soft shadow, a simple object body, or a non-critical decorative area.

Bad cross-screen patterns:
- Splitting headlines, app names, prices, legal text, ratings, CTAs, or critical UI across a seam.
- Centering one giant phone on the seam so each crop shows only a half-device and no clear benefit.
- Using cross-screen movement on every slide; it becomes a gimmick and makes the deck harder to scan.
- Cutting through faces, mascot eyes, key chart numbers, product claims, or app-store-required information.
- Requiring the viewer to understand the carousel as one uninterrupted poster. Every exported PNG must still pass the one-second standalone test.
- Letting shadows, stickers, or partial objects look accidentally clipped. If it crosses a boundary, make the bleed deliberate with scale, shadow, rotation, or continuation.

Placement rules:
- Use adjacent screens only unless a deliberate 3-screen panorama is the entire concept.
- Keep all text fully inside a single exported screen with safe margins.
- Let 10-30% of a non-critical visual cross the seam; go beyond 40% only for backgrounds, paths, or abstract decoration.
- If adjacent screens have different background colors, bridge them with a shared object, matching shadow direction, or a designed transition band.
- Review both views: the zoomed-out connected canvas must look cohesive, and each individual export must still sell one idea.

## Visual Design Principles

These rules are derived from studying the best app store screenshots in the wild (Superlist, Headspace, CRED, (Not Boring) Camera, Arc Search, Linktree, Gentler Streak, etc.). They apply regardless of which style preset the user picks. Style-specific tokens (fonts, palette, accents) live in `style-prompts.md` — point the user there.

### 1. The background is a designed surface — never white

Plain white is the amateur tell. Every great deck uses a deliberate surface: a saturated color block, a warm cream/off-white (`#F4F1EC`-ish), a dark navy/near-black, or a gradient. The background can shift per slide (Headspace, Linktree do this), but it must read as intentional, not default.

### 2. Headlines dominate

The headline occupies roughly the **top 30–40%** of the canvas — much bigger than a typical web hero. If a person can't read it at thumbnail size with no zoom, redesign.

### 3. Mixed emphasis inside the headline

Almost every great headline has one word styled differently from the rest — a contrast color, an italic script, a heavier weight, or a hand-drawn underline. Examples:
- Superlist: "The one app that fits **your whole day**" (script + coral)
- Headspace: "Stress **less**" (`less` orange against black)
- Arc Search: "**Fastest** way to search. **Cleanest** way to browse." (purple / navy)

Flat single-color headlines look weaker. Pick one emphasis word per slide.

### 4. Decorative accents are the rule, not the exception

Top decks layer at least one of these on most slides:
- Hand-drawn squiggles, arrows, scribbles (Superlist)
- Sparkles / glow (Gentler Streak, Arc)
- Label badges on the visual ("SUPER RAW", "Cinematic", "LUT")
- Floating widget chips with real stats ("$3,630 earned", "11,175 steps") — these tell the story without copy
- Award lockups on the hero only (Apple Design Award, Webby, star count)

A bare phone on a bare bg with a bare headline is the default-skill output. Add one accent.

### 5. Phone framing is a deliberate choice — vary it across the deck

Three common framings, each carries a different feeling:
- **Bezelless / minimal frame** — maximizes UI legibility, modern (Arc, Linktree, Gentler)
- **Tilted floating phone with soft shadow** — product / advertorial feel (Superlist, CRED hero)
- **Full device with visible bezel, dead-center** — editorial, premium (CRED, NB Camera)

Mix at least two framings across the deck.

### 6. Proof anchors the hero, nothing else

Award badges, press quotes, star counts, install counts — concentrate them on **slide 1 only**. Spreading them dilutes both the proof and the rest of the slides. NB Camera does this perfectly: Verge quote + Apple Design Award + 15,000+ stars all on the cover, none after.

### 7. Density inside the phone, sparsity outside

The screenshot inside the phone can (and should) be a real, dense product capture — actual lists, dashboards, charts, conversations. The space *outside* the phone is the opposite: one headline, one visual, one optional sub-line, one optional badge. Don't add bullet lists, multi-line paragraphs, or competing logos around the device.

### 8. Break the phone parade

Every 2–3 slides, drop the phone and use a different hero element to keep visual rhythm:
- 3D rendered product object (NB Camera's stylized camera)
- Photographic still (NB Camera slide 2)
- Real human / lifestyle photo (Linktree)
- Mascot illustration (Headspace's mascot, Gentler Streak's character)
- Typographic feature wall (Superlist's last slide)
- Phone grid mosaic (Linktree's "Trusted by 70M+" final slide)

### 9. Last slide pattern

The closer is almost always one of two things:
- **Feature wall** — a vertical list of one-word features styled as big type ("Real-time collaboration / Offline support / Widgets / Integrations…")
- **Phone mosaic** — multiple bezelless mini-screenshots arranged in a grid to convey "look at all the things this does"

Pick one. Don't make the last slide another single-feature hero — it wastes the spot.

### 10. Thumbnail test (mandatory before export)

Shrink the slide to ~160px wide (App Store search-result size). Squint. Can you read the headline? Can you tell what the app does in under a second? If not, the headline is too long, the type is too thin, or there's no contrast between text and background. Fix before exporting.

## Step 4: Localization

**Always confirm the language list with the user before scaffolding** — even if they didn't volunteer it. Ask: _"Should screenshots be localized? If yes, which locales? (e.g. en, de, es, pt, ja)."_ Default to English-only if they say no or skip.

The project state file (`app-store-screenshots.json`) carries a `locales: string[]` field — the list of locale codes the project targets. The editor reads this to decide:
- The locale dropdown in the toolbar is **hidden** when `locales.length <= 1`.
- The dropdown's options come from this list (not a hardcoded set).
- The **Export bundle** loops every locale in the list × every required size.

**After scaffolding, edit `app-store-screenshots.json` to set `locales` to the user's chosen list, e.g.** `"locales": ["en", "de", "ja"]`. Also set `"locale": "en"` (or whichever is the source-of-truth language) so the editor opens on it.

The editor stores headlines and labels per-locale on each slide — switch to a locale and type to fill it in; unfilled locales fall back to `en` at preview time. Screenshots are a single string per slide; put `{locale}` anywhere in the path and the editor substitutes the active locale at render and export (e.g. `/screenshots/apple/iphone/{locale}/01.png`).

- Don't literally translate — rewrite for the target market.
- Re-check line breaks per locale; German/French/Portuguese often need shorter claims.
- For RTL (`ar`, `he`, `fa`, `ur`), canvas text picks its direction from its own content (`dir="auto"`), so punctuation lands on the correct side and left-set captions align to the right edge. Layouts, devices and overlays are not mirrored — let the user verify each slide looks intentional.

## Step 5: Export Time

Inside the editor, the user picks a device, then hits **Export bundle**. A single zip downloads with every required size × every project locale for that device, organized as `<platform>/<device>/<WxH>/<locale>/NN-<layout>.png` (e.g. `ios/iphone/1320x2868/en/01-hero.png`, `macos/mac/2880x1800/en/01-hero.png`). Repeat per device.

When `connectedCanvas` is enabled, exports are crops of the connected canvas, not isolated screen renders. If a mockup sits halfway across screen 2 and screen 3, screen 2's PNG contains its left crop and screen 3's PNG contains its right crop exactly as placed. Legacy decks should start with `connectedCanvas: false`, including Step 0 migrations, so old offscreen/clipped elements export as they did before. The user can turn on **Connected** after intentionally composing cross-screen elements.

Before export, zoom out to inspect the connected canvas as a strip, then inspect the individual cropped screens. Cross-screen elements should feel intentional in the strip and harmless in isolation.

Project locales come from `app-store-screenshots.json` `locales` field — set during scaffolding (Step 4). Single-locale projects produce a flat per-size structure with just the one locale folder.

Each slide is rendered once per locale at canvas resolution and scaled to every export size. The exporter waits until every visible screenshot has actually painted before it saves a PNG (Safari/WebKit decodes images inside the render asynchronously, which used to produce blank device screens), and shows a warning toast naming the screen if one never appears.

If exports come out blank or with black screen rectangles:
- Read the export toast: a "screenshots may be missing" warning names the affected screens. Export again, and check the source image opens.
- Verify source screenshots are RGB (not RGBA). The template flattens via `objectFit: cover`, but truly transparent sources can still produce black regions.
- Confirm the referenced screenshot paths exist under `public/`; export retries paths that were previously missing before it starts rendering.

### Apple TV, Apple Watch and CarPlay

Every Apple TV and Apple Watch size below was read from App Store Connect's own metadata (`asc screenshots sizes --all`). Re-derive it the same way if Apple changes the slots.

| Device | Display type | Accepted sizes | Canvas |
|---|---|---|---|
| Apple TV | `APP_APPLE_TV` | 3840×2160, 1920×1080 (landscape only) | 3840×2160 |
| Apple Watch | `APP_WATCH_ULTRA` | 422×514, 410×502 | 422×514 |
| Apple Watch | `APP_WATCH_SERIES_10` | 416×496 | ↑ |
| Apple Watch | `APP_WATCH_SERIES_7` | 396×484 | ↑ |
| Apple Watch | `APP_WATCH_SERIES_4` | 368×448 | ↑ |
| Apple Watch | `APP_WATCH_SERIES_3` | 312×390 | ↑ |
| CarPlay | iPhone slots (landscape) | 2868×1320, 2778×1284, 2622×1206, 2436×1125 | 2868×1320 |

- **Every export is a downscale of the canvas.** Where a slot's aspect differs slightly (Watch 422×514 → 312×390), the exporter scales to cover and trims a few edge pixels instead of stretching the frame. Keep text and the device away from the outermost ~3% on the watch.
- **CarPlay has no App Store screenshot slot.** A CarPlay app ships inside its iPhone app, so a CarPlay shot is uploaded **into the iPhone slot**, in landscape (iPhone slots accept both orientations). The `carplay` device is a head-unit frame on a landscape 6.9" iPhone canvas for exactly that. Head units vary by vehicle; the frame uses Apple's CarPlay Simulator "Standard" 800×480 preset (5:3). Change `FRAME_ASPECT.carplay` in `src/lib/frame-assets.ts` for another preset (Minimum 748×456, Widescreen 1920×720, Portrait 900×1200, Video Playback 1920×1080).
- **TV, Watch and CarPlay frames are contained.** Phones and tablets deliberately bleed off the canvas edge; a cropped TV, watch face or head unit reads as a mistake, so these devices always stay fully inside the canvas.
- **Layouts:** `split-landscape` (caption left, device right) is the strongest layout for the wide TV and CarPlay canvases. On the watch, keep headlines to two or three short words per line — the canvas is only 422 px wide.
- **Screenshots:** use real captures at native resolution — Apple TV 3840×2160 or 1920×1080 from the tvOS simulator, Apple Watch from the watchOS simulator, CarPlay from the CarPlay Simulator (or Xcode's I/O → External Displays → CarPlay).

### iPhone Duo

| Target (deck) | Accepted size | Export folder |
|---|---|---|
| Outer display portrait (`duo-outer`) | 1398×2034 | `ios/duo-outer/1398x2034/` |
| Outer display landscape (`duo-outer-landscape`) | 2034×1398 | `ios/duo-outer-landscape/2034x1398/` |
| Inner display portrait (`duo-inner`) | 2007×2853 | `ios/duo-inner/2007x2853/` |
| Inner display landscape (`duo-inner-landscape`) | 2853×2007 | `ios/duo-inner-landscape/2853x2007/` |

- Sizes are App Store Connect's exact pixel sizes. Never derive Duo sizes from aspect-ratio labels or other iPhone sizes. PNG/JPG, no alpha (the exporter writes opaque RGB PNG).
- **Each display and orientation is its own deck.** In the editor, pick **iPhone Duo outer** or **inner** in the device menu and switch with **Orientation**; that opens the other deck rather than re-laying out this one, so portrait and landscape keep independent compositions. When seeding `app-store-screenshots.json`, write the four decks separately, and only the decks the app has real layouts for (see "iPhone Duo Decks" in Step 3 and `iphone-duo.md`).
- **Duo placements.** Landscape decks put the caption across the top and make the device the hero, wide enough that the capture reads, bleeding off the bottom in `hero`. `two-devices` is **Folded + open**: set `screenshotSecondary` to a capture from the other display (outer portrait ↔ inner landscape, outer landscape ↔ inner portrait). The editor never falls back to the front capture there, and export warns when it is missing. Duo frames ignore the scene's tilt: Apple's guidelines ask for straight-on product images, so don't rotate Duo devices by hand either.
- **Captures must come from the matching display and orientation.** A mismatched capture is letterboxed (never cropped or stretched) and the inspector and export toast flag it. Don't reuse iPhone captures for Duo, and don't mock up Duo UI by hand.
  - **Capture real ones** with `scripts/capture-iphone-duo.sh`. It needs Xcode 27.1+, the iOS 27.1 simulator runtime, and Device Hub open with the iPhone Duo simulator selected.
  - It sets Apple's 9:41 status bar, drives the Closed, Open, Book and turned poses, and writes `public/screenshots/apple/duo-{outer|inner}/{portrait|landscape}/<locale>/NN.png`. Run it after adding a debug-only launch argument that opens each screen, e.g. `-CapturePanel orders`.
  - Turned poses turn the phone **left**, so the outer display's camera matches Apple's landscape bezel.
  - Real captures keep the camera corner clear: iOS puts the time and status on a rail below the camera. A capture whose title sits under the camera is either hand-made or taken turned the wrong way.
  - Portrait-only iPhone apps have no outer landscape: skip that deck.
- **Apple's bezels ship with the template** in `public/frames/`, taken from Apple Design Resources → Product Bezels. Like fastlane frameit, the template bundles them.
  - **Licence:** Apple licenses them for mock-ups of apps for Apple platforms only. Never use them in Android decks.
  - **Bundled files:**
    - `iphone-portrait` (iPhone 18 Pro Max, Black)
    - `ipad-portrait` (iPad Pro 13", Space Black)
    - `watch` (Ultra 3, Ocean Band)
    - `tv` (Apple TV 4K)
    - `mac` (MacBook Air 15", Midnight)
    - `duo-outer-portrait`, `duo-outer-landscape`, `duo-inner-portrait` and `duo-inner-landscape` (Night Sky)
  - **Another finish or model:** replace the file with another PNG from Apple's pack under the same name. The editor measures each file's transparent screen cutout per corner, and uses the bezel for that device; the App Store creatives use the iPhone bezel.
  - **Without a file:** Duo uses a drawn frame and every other device keeps its built-in frame. Android and CarPlay never use Apple bezels.

### App Store creative assets

| Target (deck) | Export | Placement |
|---|---|---|
| `creative-universal` | 5244×2950 | Product page header **and** search results |
| `creative-header` | 3840×1646 | Product page header |
| `creative-search` | 3840×2560 and 1920×1280 | Search results (any 3:2 from 1920×1280 to 3840×2560) |

- Recommend the universal asset first. Use separate header and search assets only when the universal crops don't give enough control.
- Default layouts sit inside the **art safe area** measured from Apple's own templates (universal x 1921–3323, y 660–1622; header x 1097–2743, y 493–1154; search x 836–3004, y 765–1795). The backdrop fills the rest. Keep the message and focal art inside the green safe-area guide. For the universal asset, the dashed header and search crops and the bottom-left previews are **estimates** (Apple doesn't publish the crop): tell the user to confirm in App Store Connect's Preview tool. Guides never export.
- Creatives share the deck's theme, font, scene, overlays and text elements. They are not the fixed Play Store feature graphic. Write one short brand line per creative; never paste a long screenshot headline.
- Creative assets are optional. They are reviewed through App Store Connect, separate from screenshots and from editorial artwork. Don't promise instant swaps, and don't upload or submit anything for the user.

### Mac

| Device | Display type | Accepted sizes | Canvas |
|---|---|---|---|
| Mac | `APP_DESKTOP` | 2880×1800, 2560×1600, 1440×900, 1280×800 (16:10 landscape only) | 2880×1800 |

- **Mac is its own toolbar tab** (iOS / Mac / Android), not a device under iOS: App Store Connect lists macOS as a separate platform with its own screenshot set, so the Mac bundle exports to `macos/mac/<WxH>/<locale>/` rather than inside `ios/`. Every Mac size is an exact 16:10 downscale of the canvas; nothing is trimmed.
- **The Mac window is contained** like the TV and CarPlay frames, and its content area below the title bar is exactly 16:10, so a full-screen 16:10 capture fills it without cropping. Other aspects are cover-cropped from the bottom (the top of the window stays visible).
- **Screenshots:** a full-screen capture (⌘⇧3) at a 16:10 resolution is the cleanest source. Notched MacBook Pros capture at ~1.54:1, which loses a few percent off the bottom (the Dock). A single-window capture (⌘⇧4, then Space) already has its own title bar, so the frame would draw a second one: crop the window's title bar off first, or use a full-screen capture.
- **Layouts:** the starter deck is `hero` → `split-landscape` → `device-top` (inverted) → `two-devices` → `no-device`. Because the window is contained, `hero` and `device-bottom` look almost the same; prefer `split-landscape` or `two-devices` (two overlapping windows) for variety.

## Step 6: Final QA Gate

### Message Quality
- One idea per slide
- Hero slide communicates the main benefit in one second
- Readable at arm's length at thumbnail size

### Visual Quality
- No two adjacent slides share the same layout
- Landscape tablet slides use `split-landscape` — never two devices side-by-side
- Apple TV, CarPlay and Mac decks lead with `split-landscape` or `hero`; Watch headlines fit on the 422 px canvas without wrapping mid-phrase
- At least one contrast (`inverted: true`) slide when the deck is long enough
- For decks with 5+ slides, either one cross-screen/cross-canvas moment exists or there is a clear reason to keep every screen isolated
- Cross-screen moments are limited to adjacent screens and never split text, required info, faces, or critical UI

### Export Quality
- No clipped text or assets after scaling to export size
- No transparent gutters or blank edge pixels in the generated PNGs
- Cross-screen elements split cleanly across adjacent PNGs
- Screenshots correctly aligned inside every device frame
- Filenames sort correctly (zero-padded numeric prefixes)
- Feature Graphic exports cleanly at 1024×500 (no device frame)
- iPhone Duo exports are exactly 1398×2034 / 2034×1398 (outer) and 2007×2853 / 2853×2007 (inner), with no "doesn't match" or placeholder warning; every Folded + open slide has a capture from the other display; inner landscape headlines sit on one line in every locale. Tell the user to check the sets in App Store Connect's iPhone Duo preview tool before submitting
- Creative assets keep copy and focal art inside the safe-area guide, and a cleared label or headline exports empty (no editor hint text)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Edited `page.tsx` instead of using the editor | Roll back the edit; let users iterate in the browser |
| Tried to rebuild device frames from scratch | They're in `src/components/editor/device-frames.tsx` — modify there |
| Pasted screenshots into git directly | `public/screenshots/...` is fine to commit. Drop-target uploads are now also written to `public/screenshots/uploaded/<hash>.png` — commit both that folder **and** `app-store-screenshots.json` so collaborators reproduce your deck after `git clone`. |
| Wrong directory layout for tablet screenshots | See Step 2 — `android/tablet-7/portrait/{locale}/...` etc. |
| Reset wiped the deck | Reset clears in-memory state and re-saves defaults to `app-store-screenshots.json`. Recover by `git checkout app-store-screenshots.json` if it was committed, or export first before resetting. |
| Export is blank | Check the export toast for a "may be missing" warning and re-export; otherwise the source PNG probably has alpha — flatten to RGB |
| Looked for a CarPlay slot in App Store Connect | There isn't one — upload CarPlay shots into the iPhone slot |
| Used an Apple bezel on an Android deck | Apple licenses its bezels for Apple platforms only; Android decks keep the built-in frames |
| Turned a Duo portrait deck into landscape by editing transforms | Use the Orientation menu: landscape is a separate deck, so both compositions survive |
| Resized iPhone captures to Duo sizes, or used the inner capture on the outer deck | Capture each display in Xcode 27.1's simulator at its exact size (`scripts/capture-iphone-duo.sh`); the editor letterboxes anything else |
| The bezel's camera covers the clock or a title on an outer-display slide | The capture isn't real, or the phone was turned right. Real captures put the status rail under the camera; capture turned poses turned left |
| Duo set looks like the iPhone set on a wider canvas | Lead the inner deck with a two-pane capture and a one-line headline; see `iphone-duo.md` |
| Tilted, 3D or half-folded Duo mock-ups | Keep Duo frames straight-on and unmodified (Apple's marketing guidelines); never draw a crease |
| Mac window shows two title bars | The source is a single-window capture with its own title bar — crop it off or use a full-screen 16:10 capture |
| `bun dev` port collision | Template defaults to `next dev`; let Next pick the next free port (3001+) |

## Project Migration

The current editor saves `schemaVersion: 3` (v3 adds the iPhone Duo and creative decks). The migration recipe above still writes `schemaVersion: 2`, which the editor accepts and upgrades to v3 on its next save, adding the new decks without touching existing ones. Existing projects made by earlier versions of this skill usually have no `schemaVersion` and may still store string `label` / `headline` values. Do not hand-edit those projects unless the JSON is invalid. On load, `src/lib/storage.ts` (through `src/lib/project-schema.ts`):

1. Converts legacy string copy to localized `{ "en": "..." }` objects.
2. Sanitizes existing element transforms.
3. Preserves every existing slide/screen and device deck.
4. Keeps pre-v2 decks in isolated-screen mode by setting `connectedCanvas: false`, so already-clipped phones or captions do not suddenly appear in neighboring exports.
5. Lets the user opt into connected crops with the toolbar's Connected/Isolated control when they are ready to use cross-screen placement.
6. Saves the upgraded state back to `app-store-screenshots.json` and `localStorage` only after the file endpoint has loaded successfully, so stale browser cache cannot overwrite the canonical project file during dev-server restarts.
7. Detects newer disk revisions before autosaving. If another tab or an agent edits the project, keep unsaved work open and export or copy it before reloading; do not force a stale save over the newer file.

There are two migration modes:

- **Passive runtime migration:** when a user opens an old project in the current editor, keep `connectedCanvas: false` for pre-v2 JSON so old exports remain visually stable.
- **Explicit skill migration:** when Step 0 detects an old implementation and the user answers **Yes**, upgrade the UI in place and write `schemaVersion: 2`. Preserve an existing explicit `connectedCanvas` boolean; otherwise write `connectedCanvas: false` without asking more product/design questions.

For explicit in-place upgrades, copy the current template's `src/components/editor/`, `src/lib/`, app routes, config, and package files into the project while preserving user assets and project JSON. If the old project had custom themes, merge those `THEMES` entries into `src/lib/constants.ts`; otherwise the editor falls back to `clean-light` and warns in the browser. Then run the app once and confirm `schemaVersion: 2` and a boolean `connectedCanvas` are present.

## Template Reference

The template structure (after copy):

```
project/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json              # ShadCN config (for future `shadcn add`)
├── public/
│   ├── mockup.png               # iPhone bezel (do NOT replace without re-measuring PHONE_SCREEN)
│   ├── app-icon.png             # → user supplies
│   ├── fonts/imported/          # Fonts imported from the toolbar (gitignored; uploaded screenshots are tracked in generated projects)
│   └── screenshots/...
└── src/
    ├── app/
    │   ├── layout.tsx           # Font + root layout
    │   ├── page.tsx             # Renders <ScreenshotEditor />
    │   └── globals.css          # Tailwind + ShadCN tokens
    ├── components/
    │   ├── editor/
    │   │   ├── screenshot-editor.tsx   # Top-level editor (state, autosave, export)
    │   │   ├── toolbar.tsx             # Platform tabs, device select, theme, font, locale, undo/redo, export
    │   │   ├── sidebar.tsx             # Screen list with @dnd-kit reordering
    │   │   ├── slide-thumb.tsx         # Draggable screen card
    │   │   ├── preview-stage.tsx       # ResizeObserver-scaled connected canvas
    │   │   ├── inspector.tsx           # Right-pane controls for active slide
    │   │   ├── screenshot-picker.tsx   # File drop + picker
    │   │   ├── background-controls.tsx # Per-slide theme / alternate / custom background
    │   │   ├── font-importer.tsx       # Hidden input behind the toolbar's "Import font…"
    │   │   ├── image-element-canvas.tsx # Image overlay content (+ create-image-mask.ts edge fade)
    │   │   ├── slide-canvas.tsx        # Data-driven screen/deck renderer (all layouts)
    │   │   └── device-frames.tsx       # Phone, IPad, AppleTV, AppleWatch, CarPlayScreen, MacWindow, Android
    │   └── ui/                         # Minimal ShadCN primitives (button, select, etc.)
    └── lib/
        ├── constants.ts                # Themes and screenshot fonts
        ├── devices.ts                  # Every target: canvas size, export sizes, platform, orientations
        ├── frame-assets.ts             # Frame aspects and sizes, Apple bezel measurement
        ├── layouts.ts                  # Layout names and default element placements
        ├── defaults.ts                 # Initial slide decks per device
        ├── types.ts                    # Slide / ProjectState / Theme types
        ├── storage.ts                  # useProject() — autosave + undo/redo history
        ├── project-schema.ts           # Project JSON validation and migration on load
        ├── image-cache.ts              # preloadImages + img() helper
        ├── contrast.ts                 # Readable caption colours on custom backgrounds
        ├── export-render.ts            # Slide → PNG; waits for every screenshot to paint
        └── utils.ts                    # cn() helper
```

## Hand-off Behavior

When you finish scaffolding, **start the dev server** (`bun dev` / `pnpm dev` / `yarn dev` / `npm run dev`) and then tell the user the following, in this order:

1. **The server is running at `http://localhost:3000`** (or whichever port Next picked — read it from the dev server output and quote the actual URL). Tell them to open it in the browser.
2. **How to run it next time** — give them the exact two-command recipe for their package manager:
   ```bash
   bun install   # only needed the first time, or after pulling new deps
   bun dev       # → http://localhost:3000
   ```
   Substitute `pnpm` / `yarn` / `npm run` as appropriate for what was detected in Step 2.
3. Which platforms have starter decks seeded (iOS, Mac, Android, or a mix).
4. Any user-supplied screenshots that didn't match the expected filenames (so they can rename or use the in-editor drop target).
5. Point them at the **Export bundle** button once they're happy with the layouts.
6. **Invite further edits:** say something like _"Feel free to ask me to make any changes you'd like to the screenshots — copy, layout, palette, anything. I can iterate with you."_
7. **Showcase callout** (always include this, verbatim spirit):
   > Check out apps generated by this skill here: https://www.parthjadhav.com/products/app-store-screenshots — and tag **@parthjadhav8** on Twitter if you want your app to be added to the showcase.

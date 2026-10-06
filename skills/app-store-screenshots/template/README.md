# App Store Screenshots — Editor Template

A pre-built Next.js + ShadCN editor for generating App Store and Google Play screenshots. Scaffolded by the `app-store-screenshots` skill.

## Quick start

Requires Node.js 20.9 or newer.

```bash
bun install   # or pnpm / yarn / npm
bun dev       # http://localhost:3000
```

## What's inside

- **Connected canvas editor** (`src/components/editor/`) — every screen sits on one horizontal canvas, so phones, captions, and other elements can be dragged across screen boundaries and exported as split crops when Connected mode is enabled.
- **Screen controls** — drag-to-reorder screens, click-to-edit text, screenshot drop targets, per-screen layout switcher, dark/light toggle.
- **Style Lab and Scene Playground** — compare complete looks for a deck and restyle every screen's backdrop, depth and headline at once. See [Style Lab](#style-lab) and [Scene Playground](#scene-playground).
- **Image overlays, fonts, backgrounds and undo** — PNG/JPG overlay elements, a live screenshot font menu (with font import), per-screen custom backgrounds, and toolbar Undo/Redo. See [Editor controls](#editor-controls).
- **Device frames** (`src/components/editor/device-frames.tsx`) — iPhone (PNG mockup), iPad, Apple TV, Apple Watch, CarPlay head unit, Mac window, Android phone, Android tablet (portrait + landscape), feature graphic.
- **Auto-save (git-trackable)** — every change is persisted within ~600ms to **`app-store-screenshots.json`** at the project root (via `/api/project`) **and** mirrored to `localStorage` as an instant-paint cache. Commit `app-store-screenshots.json` and you can `git clone` to another machine and resume exactly where you left off.
- **Multi-device decks** — iOS (iPhone, iPad, Apple TV, Apple Watch, CarPlay), Mac, and Android decks live side by side; switching the platform tab keeps each tab's last device.
- **One-click export** — bulk PNG export at any required App Store / Play Store resolution using `html-to-image`; each PNG is rendered from the current connected or isolated deck mode.
- **Project migration** — older `app-store-screenshots.json` files are migrated on load. Existing per-slide transforms remain valid, and connected crops become available without rewriting the deck by hand.
- **Legacy-safe mode** — pre-v2 projects opened directly in the editor start in isolated-screen mode first, then can opt into connected crops with the toolbar's Connected/Isolated control. Skill-run in-place migrations keep legacy decks isolated unless the project had already explicitly opted into connected canvas.

## Adding screenshots

Two ways:

1. **Drop a file in the inspector** — drag-and-drop or click Pick. The file is sent to `/api/upload`, hashed, and written to `public/screenshots/uploaded/<hash>.png`. The slide stores the resulting `/screenshots/uploaded/...` path, so commit those files alongside `app-store-screenshots.json` and the screenshots survive a `git clone`.
2. **Reference a static file** — put PNGs under `public/screenshots/{platform}/{device}/{locale}/` and reference them by path. Default sample slides expect:
   - `public/screenshots/apple/iphone/en/...`
   - `public/screenshots/apple/ipad/en/...`
   - `public/screenshots/apple/{tvos,watchos,carplay}/en/...` for Apple TV, Apple Watch and CarPlay decks
   - `public/screenshots/apple/mac/en/...`
   - `public/screenshots/android/phone/en/...`

Update the matching `screenshot` fields in `app-store-screenshots.json` to point at whatever filenames you choose.

## Theme colors

The palette button next to the theme menu edits the open theme's colors for this project: background, alternate background, text, accent, and muted. Edits are saved per theme in `themeColors`, so switching themes and back keeps them, and **Reset colors** returns to the theme's built-in colors. A single screen can still use **Background → Custom color** in the inspector.

## Zoom

The buttons in the canvas corner zoom from 5% to 200%. **Fit all screens** shows the whole deck at once, and **Fit active screen** goes back to one screen. On a trackpad you can pinch, or hold ⌘ (Ctrl on Windows) and scroll.

## Exporting

The toolbar dropdown lists every Apple/Google-required size for the current device. Click **Export bundle** to download a zip for the open device. To put several devices in one zip, open the arrow next to it, tick the devices, and click **Export N devices**. The menu lists decks that have screenshots, plus the open one. In Connected mode, each PNG is clipped from the connected canvas, so an element that straddles two screens appears split exactly where you placed it. In Isolated mode, each screen clips its own elements and legacy offscreen content cannot leak into neighboring exports.

Exports lock the editor through preparation and bundling and render a fixed project snapshot. Referenced images that cannot be loaded stop the export with an error; empty screenshot fields still produce the existing placeholder warning.

Each screen is rendered once per locale at canvas resolution (`src/lib/export-render.ts`) and scaled to every size; slots whose aspect differs slightly are cover-scaled rather than stretched. Before saving, the exporter redraws until every visible screenshot has painted, because WebKit decodes images inside the html-to-image SVG asynchronously and a single draw can leave device screens blank. If a screenshot never appears, a toast names the screen. Files are written as opaque 24-bit RGB PNGs (`src/lib/png-rgb.ts`, encoded in a small worker pool) because Google Play rejects PNGs with an alpha channel and canvas can only produce RGBA.

CarPlay has no App Store Connect slot of its own: the CarPlay deck is a head-unit frame on a landscape iPhone canvas and exports landscape iPhone sizes for upload into the iPhone slot.

Mac is its own platform tab because App Store Connect lists macOS separately from the iOS app. The Mac deck designs at 2880×1800 and exports the four 16:10 Mac App Store sizes (2880×1800, 2560×1600, 1440×900, 1280×800) to `macos/mac/<WxH>/<locale>/`. The Mac window's content area is exactly 16:10, so a full-screen 16:10 capture fills it uncropped.

## Editor controls

### Themes and backgrounds

The toolbar **Theme** menu recolours the whole deck (backgrounds, text, accents); it doesn't touch copy, layouts or screenshots. Each screen's **Background** control in the inspector picks the theme background, the theme's alternate (dark/light) background, or a **custom colour** (colour picker or hex). A custom colour applies to that screen only and is saved as `backgroundColor` on the slide. When the theme's text or label colour would be hard to read on it (below a 4.5:1 contrast ratio for text, 3:1 for the label), the caption switches to the theme's other text colour, or to near-black / white. Text elements you've given an explicit colour keep it.

### Screenshot fonts

The toolbar font menu sets the typeface of the screenshot canvas and exports (not the editor UI). **Inter (default)** is the template font and what projects without a `fontId` use. **System Sans** and **Georgia** are available everywhere; **Avenir Next**, **Helvetica Neue**, **Futura**, **Baskerville**, **Palatino**, **Optima** and **American Typewriter** are macOS system fonts that fall back to similar faces elsewhere, so export on the machine you designed on.

**Import font…** at the bottom of the menu takes a licensed WOFF2, WOFF, TTF or OTF file (16 MB max). The browser decodes the font before uploading; `/api/upload-font` checks the container signature, lengths and table bounds before storing it as `public/fonts/imported/<hash>.<ext>`. The project saves it as `importedFont` with `fontId: "self-hosted"`. That font folder is gitignored (font licences often forbid redistribution); keep the file alongside the project JSON if you move the project, or screenshot text falls back to a generic sans-serif. Once imported, the font is listed in the menu under its file name, and it is loaded and embedded before every export.

### Image overlays

In the inspector's **Elements** card, click **Image**, then **Pick** (or drop) a PNG/JPG. Uploads go through `/api/upload` into `public/screenshots/uploaded/`, like screenshots. The first image sizes the overlay frame to its aspect ratio; after that you can drag, resize, rotate (canvas handle or slider), restack, choose **Fill frame** (crop) or **Whole image**, and fade one edge into the background. In Connected mode overlays can cross screen edges like other elements. Overlays are saved per screen as `imageElements`, and the exporter waits for them to paint just like device screenshots. The Play Store feature graphic has a fixed icon + name + tagline layout, so it doesn't take overlays or text elements.

### Style Lab

**Style Lab** in the toolbar opens four complete looks for the open deck, each from a different direction (Editorial, Playful, Cinematic, Minimal on first open; Swiss Bold, Dreamy, Vintage Poster and Panorama join on **Shuffle**). A look sets the theme, which screens are inverted, the font, headline weight/case/alignment/size, each screen's layout, and the scene. Your current deck is pinned at the top for before/after comparison. Copy and screenshots never change.

- **Keep** locks (Colors, Type, Layout, Scene) hold that part of your deck in every look; Shuffle and **Remix** (another take on one direction) only vary what is unlocked.
- **Apply** writes the look as one undo step. Changing layout resets that screen's built-in placements (headline, devices, magnifier) to the layout defaults; lock **Layout** to keep hand-placed elements. Phones and portrait tablets get new layouts; landscape, TV, Watch, CarPlay and Mac decks keep theirs.
- **Save** stars a look into `savedLooks` in the project file, listed under **Saved looks** next time.
- **Export comparison** downloads one PNG with your deck and all four looks.

Looks come from seeded generators in `src/lib/style-lab.ts`, so the same shuffle always yields the same looks. Add a direction there to extend the lab.

### Scene Playground

**Scene** in the toolbar edits the project-wide `scene`, live on the canvas:

- **Backdrop** — gradient (classic), solid, aurora, spotlight, grid, dots or ruled lines, in the theme's colours. **Flow across screens** lays the backdrop art and decorations out over the whole strip so they cross the seams; each screen still keeps its own base colour, and exports are crops of the same layout.
- **Decoration** — blobs, rings, sparkles or none.
- **Device depth** — drop shadow, accent glow and a 3D tilt (−30° to 30°) for every device.
- **Headline** — weight, as-typed or UPPER case, and Auto/Left/Center alignment.

**Surprise me** rolls a new backdrop and depth; the reset arrow returns to the classic look. A project without `scene` renders exactly as before.

### Magnifier

In the inspector, **Magnifier → Add** places a loupe over the device. Click or drag on the thumbnail (or use arrow keys) to aim it; the ring shows how much of the screenshot the lens covers. **Zoom** is relative to how large the screenshot appears on the device (1.5–5×), and the lens can be a circle or rounded square. Drag, resize, rotate and restack it like any element. It's saved per screen as `callout` plus `transforms.callout`, and is unavailable on no-device layouts and the feature graphic.

### Undo and redo

The toolbar arrows, `⌘Z` / `Ctrl+Z` and `⇧⌘Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) step through the last 50 edits of the session: copy, layouts, element moves, text sizes, backgrounds, fonts, themes, overlays and resets. Rapid changes (typing, dragging a slider) collapse into one step. Switching platform, device, orientation or locale isn't an edit, so it doesn't use up an undo step; undoing an edit takes you back to the deck it was made on. While a text field is focused the shortcuts undo that field's typing instead. History resets on reload.

## Customizing

| Where | What |
|-------|------|
| `src/lib/constants.ts` | Canvas dimensions, export sizes, frame ratios, themes, screenshot fonts, locales |
| `app-store-screenshots.json` | Canonical starter project: app name, current device, connected-canvas mode, slide copy, screenshots, and transforms |
| `src/lib/defaults.ts` | Fallback/reset state used when no project file or local cache exists |
| `src/components/editor/slide-canvas.tsx` | Add new layouts and connected-canvas element rendering |
| `src/components/editor/device-frames.tsx` | Tweak device chrome (bezel radii, camera dots) |
| `src/app/layout.tsx` | Swap the font (`next/font/google`) |

## Notes

- `mockup.png` is the iPhone bezel overlay; replacing it requires re-measuring the `PHONE_SCREEN` constants.
- Image preloading converts every static path to a base64 data URI before exports run, and export retries paths that were previously missing. `export-render.ts` then waits for those images to paint in the render (see Exporting).
- Reset via the toolbar's circular arrow icon clears in-memory state and reloads the default screens. To wipe disk state too, delete `app-store-screenshots.json`.
- **Persistence model** — the canonical state lives in `app-store-screenshots.json` (git-tracked). On load, the editor reads localStorage first, then reconciles with the file; if the file endpoint is unavailable, autosave is blocked so stale cache cannot overwrite disk. File saves are serialized and atomic. Each editor sends the revision it loaded, so a newer save from another tab or an on-disk edit produces a conflict instead of an overwrite. Your unsaved work stays open: export or copy it before reloading. **Retry save** retries transient failures; it does not override conflicts. Leaving with unsaved edits triggers the browser's warning.
- **Migration model** — schema v1 projects do not need a manual conversion. On first load, the editor upgrades localized text and transform records, writes `schemaVersion: 2`, preserves all existing screens, and keeps `connectedCanvas: false` so old offscreen/clipped elements export exactly as isolated screens. Turn on **Connected** in the toolbar when you want elements to cross screen edges. Explicit skill migrations preserve an existing `connectedCanvas` choice, otherwise they keep legacy decks isolated too.
- **Custom themes** — if a project file references a theme id that is not present in `src/lib/constants.ts`, the editor falls back to `clean-light` and shows a warning. Merge custom `THEMES` entries during in-place upgrades.

## Local API contract

These routes are for a local editor running in one server process. They have no authentication for remote hosting. Browser writes must come from the same origin and use `Content-Type: application/json`; headerless scripts still work.

- `GET /api/project` returns `{ ok, state }` and an `ETag` revision, including when the project file is missing.
- `POST /api/project` accepts project JSON (64 MiB request limit). Send the last `ETag` as `If-Match` to reject stale writes with HTTP 412; success returns a new `ETag`. Scripts that omit `If-Match` intentionally keep unconditional replacement behavior. Unknown schema versions, unknown device decks, duplicate IDs, and malformed element data are rejected with HTTP 400.
- `POST /api/upload` accepts `{ dataUrl }` for PNG/JPEG (8 MiB decoded file, 12 MiB request, 64 megapixels). It decodes the image before storing the original bytes. Rejected files keep the previous selection; unavailable endpoints can still fall back to inline images.
- `POST /api/upload-font` accepts `{ data }` containing base64 font bytes (16 MiB decoded file, 23 MiB request). Server validation checks the font container; the editor's browser additionally validates font decoding.

Uploads are written atomically. Project and upload requests time out after 15 seconds in the editor; image preloads after 10 seconds. Export also stops with a retryable error if font loading takes longer than 15 seconds. Failed preloads can be retried on export, and failed or stalled PNG workers finish through the inline encoder.

The `/screenshots/uploaded/[filename]` and `/fonts/imported/[filename]` routes serve uploads created after server startup, including with `next start`. They accept only the generated hash filenames and supported extensions, preserving the same asset URLs and on-disk locations as the dev server.

## Automated verification

The scaffold includes [Tester Army](https://github.com/tester-army/e2e), pinned to `e2e@0.16.0`, `@e2e-dev/web@0.11.2` and `playwright@1.63.0`. Tests require Node.js 22.12 or newer and installed **Google Chrome**. No model account or API key is needed for the deterministic suite.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
bun run test:e2e
SCREENSHOTS_E2E_PRODUCTION=1 bun run test:e2e
```

The runner creates a disposable template copy on port 4312 and removes it after shutdown. Project saves, uploads and fonts go into that copy. It refuses an occupied port; set `SCREENSHOTS_E2E_PORT` to choose another. It never reuses your active editor server. Dev verification uses Next's webpack mode because Turbopack cannot resolve the temporary copy's dependency symlink. Production verification uses the template's existing `.next` build.

Reports, ZIP downloads, failure screenshots and traces are under `.e2e/`; harness logs are in `.e2e/logs/`. `bun run test:e2e:list` lists every selected test. The shipped GitHub workflow runs both dev and production verification using Google Chrome. See [the flow matrix](docs/testing/e2e.md) for coverage and limits.

# App Store Screenshots — Editor Template

A schema-v3 Next.js editor for creating, localizing, validating, and exporting App Store and Google Play marketing screenshots.

## Quick start

```bash
bun install
bun dev
```

Open the URL printed by Next.js, normally `http://localhost:3000`.

## Editor capabilities

- Connected or isolated multi-screen canvas
- iPhone, iPad, Android phone, Android tablet portrait/landscape, and Play Feature Graphic decks
- General text, image, and shape layers
- Multi-select, grouping, alignment, lock/hide, snapping, rulers, safe areas, rotation, and keyboard nudging
- Reusable master layers and linked layers across adjacent screens
- Project-local custom theme editor
- Per-locale copy, completion tracking, and localized screenshot paths
- Complete creative variants with their own device decks
- Continuous store preflight
- One zip containing every variant, device, orientation, resolution, and locale, plus a manifest
- Disk autosave to `app-store-screenshots.json` and a localStorage instant-paint cache

## Project state

`src/lib/starter-project.json` is the canonical fresh-project and reset state. Synchronize it to the root runtime file with:

```bash
bun run starter:sync
```

Do not edit both JSON files independently. During normal editor use, `app-store-screenshots.json` is the git-trackable project file.

Schema v3 organizes content as:

- `variants[]` → complete `slidesByDevice` decks;
- `layers[]` → discriminated text, image, or shape visual layers;
- `groups[]` → named layer groups;
- `masterLayers[]` → reusable layers filtered by device when desired;
- `customThemes` → project-local themes;
- `canvasSettings` → snapping, grid, ruler, and safe-area preferences.

Older v1/v2 projects migrate on load through `src/lib/project-schema.ts`. Legacy projects without an explicit connected-canvas choice remain isolated to preserve old crops.

## Editing

Use Shift-click or Cmd/Ctrl-click to multi-select. Arrow keys nudge selected layers 1 px; Shift+Arrow nudges 10 px. The inspector provides grouping, alignment, visibility, locking, linking, and master promotion.

Project tools in the toolbar contains:

- Theme editor
- Locale manager and completion
- Variant manager
- Canvas assistance settings
- Automated preflight

Guides are editor-only and never appear in generated PNGs.

## Assets

Drop files into screenshot or image-layer pickers, or reference static files under `public/`. Runtime uploads are hashed into `public/screenshots/uploaded/`; commit them alongside `app-store-screenshots.json`.

Use `{locale}` in static paths for localized captures, such as `/screenshots/apple/iphone/{locale}/01.png`.

## Export

Run preflight, then click **Export bundle**. Export stops on blocking errors and otherwise creates:

```text
<variant>/<platform>/<device>/<orientation>/<width>x<height>/<locale>/<screen>.png
manifest.json
```

The plan includes every project variant, all supported devices, tablet orientations, store resolutions, and locales.

## Verification

```bash
bun run verify
```

This synchronizes starter state, runs Vitest, checks TypeScript, and creates a production build.

Key modules:

| Module | Responsibility |
|---|---|
| `src/lib/project-schema.ts` | Parse, migrate, sanitize, and validate project state |
| `src/lib/project-model.ts` | Variant and deck updates |
| `src/lib/editor-commands.ts` | Pure layer, slide, grouping, linking, master, alignment, and nudge commands |
| `src/lib/preflight.ts` | Cross-project store validation |
| `src/lib/export-plan.ts` | Deterministic all-project export plan and manifest |
| `src/components/editor/canvas/` | Canvas geometry, interaction, rendering, rulers, and safe areas |
| `src/components/editor/use-project-export.tsx` | Browser capture and zip workflow |

`mockup.png` is the iPhone bezel overlay. Replacing it requires recalibrating `PHONE_SCREEN` in `src/lib/constants.ts`.

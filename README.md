# App Store & Google Play Screenshots Generator

English | [Türkçe](README.tr.md)

Working copy maintained by [yanclogic](https://github.com/yanclogic), based on [Parth Jadhav's app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots). The editor template is the upstream project. This copy tightens the skill so agents follow one source for copy, device frames, thumbnail checks, and migration. License remains MIT.

A skill for AI coding agents that scaffolds a production-ready Next.js editor for App Store and Google Play marketing screenshots. It gives you a connected canvas, real device frames, inspector controls, persistent project state, and one-click export bundles at store-ready sizes.

![Current connected-canvas editor showing a Bloom screenshot deck](example.png)

Example screenshots generated with this skill were accepted for [Bloom Coffee Shelf Recipe on the App Store](https://apps.apple.com/us/app/bloom-coffee-shelf-recipe/id6759914524).

## What It Does

- Builds a full screenshot editor instead of a static one-off page
- Turns raw app captures into ad-style slides with big readable copy
- Lets phones, captions, and decorative elements span adjacent screenshots on one connected canvas
- Keeps older projects safe with isolated-screen export mode until you opt into connected crops
- Saves every deck to `app-store-screenshots.json`, so the project is git-trackable and resumable
- Uploads picked screenshots into `public/screenshots/uploaded/<hash>.png`
- Supports iPhone, iPad, Apple TV, Apple Watch, CarPlay, Mac, Android phone, Android tablet, and Play Store feature graphic decks
- Exports exact PNG bundles for all required App Store, Mac App Store, and Google Play sizes
- Supports locales, RTL-aware copy/layout guidance, reusable themes, and in-place project migration
- Ships 18 named visual styles with deep specs and a headline copy library

## Current Editor UI

- **Connected canvas** - view the whole screenshot strip at once, drag elements across screen boundaries, then export each screen as a precise crop.
- **Isolated mode** - preserve legacy decks where offscreen elements should not leak into neighboring exports.
- **Screen sidebar** - add, select, and drag-to-reorder screens with live thumbnails.
- **Inspector** - edit layout, labels, headlines, screenshots, element stacking, and transforms from the right panel. A **Copy ideas** menu next to the headline drops in a proven formula to rewrite.
- **Theme picker** - switch palette presets from the toolbar, including one preset per named style. The palette button next to it edits the open theme's colors for this project only.
- **Style Lab** - see four complete looks for your deck side by side (palette, type, layout rhythm and scene), keep the parts you like with Colors/Type/Layout/Scene locks, shuffle or remix the rest, save favourites, apply one as a single undoable edit, and export a comparison image.
- **Scene Playground** - restyle every screen at once: backdrops (gradient, solid, aurora, spotlight, grid, dots, ruled) that can flow across the whole strip, decorations, device shadow, glow and 3D tilt, and headline weight, case and alignment.
- **Magnifier** - add a loupe to any screen that zooms into one detail of its screenshot; aim it on a thumbnail, set the zoom and shape, and drag it anywhere.
- **Platform switcher** - iOS, Mac, and Android tabs keep every deck side by side while sharing the same editor workflow.
- **Device selector** - iPhone, iPad, Apple TV, Apple Watch, and CarPlay under iOS; Android phone, Android tablets, and the feature graphic under Android. The Mac tab is a single 16:10 Mac deck.
- **Autosave** - writes to disk through `/api/project`, mirrors to `localStorage`, and detects newer disk revisions before overwriting work from another tab or agent. Failed saves can be retried; unsaved edits trigger a warning before leaving.
- **Zoom** - zoom from 5% to 200%, fit the whole deck or the active screen, or pinch and ⌘-scroll on a trackpad.
- **Export bundle** - downloads a zip organized by platform, device, resolution, and locale. The arrow next to it puts several device decks in one zip.

Tip: when capturing source iPhone screenshots, the 6.1-inch simulator is usually the easiest starting point because it reduces manual image adjustment inside the frames.

## Install

### Using npx skills

```bash
npx skills add ParthJadhav/app-store-screenshots
```

Install globally:

```bash
npx skills add ParthJadhav/app-store-screenshots -g
```

Install for a specific agent:

```bash
npx skills add ParthJadhav/app-store-screenshots -a claude-code
```

This works with Claude Code, Cursor, Windsurf, OpenCode, Codex, and other agents supported by [`skills`](https://github.com/vercel-labs/skills).

### Manual install

```bash
git clone https://github.com/ParthJadhav/app-store-screenshots ~/.claude/skills/app-store-screenshots
```

## Usage

Once installed, ask your coding agent for store screenshots:

```text
Build App Store and Google Play screenshots for my app.
```

The skill guides the agent to ask for your app context, source screenshots, platforms, locales, visual direction, and slide count before generating the editor project.

## Example Prompts

```text
Build App Store screenshots for my habit tracker.
The app helps people stay consistent with simple daily routines.
I want 6 slides, clean minimal style, warm neutrals, and a calm premium feel.
```

```text
Generate App Store screenshots for my personal finance app.
The main strengths are fast expense capture, clear monthly trends, and shared budgets.
I want a sharp modern style with high contrast and 7 slides.
```

```text
Build Mac App Store screenshots for my menu-bar utility.
The app lives in the menu bar and finds files on this Mac instantly.
I want 5 slides, a dark Mac window frame, and a calm desktop feel.
```

```text
Build App Store screenshots for my language learning app.
I need English, German, and Arabic screenshot sets.
Use two reusable themes: clean-light and dark-bold.
Make sure Arabic slides feel RTL-native, not just translated.
```

## Better Prompt Tips

- Say what the app does in one sentence
- List the top 3-5 features in priority order
- Mention the platforms and devices you need
- Describe the visual style you want
- Say how many slides you want
- Mention required locales or RTL languages
- Provide source screenshot paths, app icon, and style references when available

## What Gets Scaffolded

If starting from an empty folder, the skill creates a Next.js project like this:

```text
project/
├── public/
│   ├── mockup.png
│   ├── app-icon.png
│   └── screenshots/
│       ├── apple/
│       │   ├── iphone/{locale}/01.png
│       │   ├── ipad/{locale}/01.png
│       │   ├── tvos/{locale}/01.png
│       │   ├── watchos/{locale}/01.png
│       │   ├── carplay/{locale}/01.png
│       │   └── mac/{locale}/01.png
│       └── android/
│           ├── phone/{locale}/01.png
│           ├── tablet-7/portrait/{locale}/01.png
│           ├── tablet-10/landscape/{locale}/01.png
│           └── feature-graphic/{locale}/01.png
├── app-store-screenshots.json
├── src/app/
│   ├── layout.tsx
│   └── page.tsx
├── src/components/editor/
│   ├── screenshot-editor.tsx
│   ├── toolbar.tsx
│   ├── sidebar.tsx
│   ├── inspector.tsx
│   ├── preview-stage.tsx
│   ├── slide-canvas.tsx
│   ├── screenshot-picker.tsx
│   └── device-frames.tsx
└── src/lib/
    ├── constants.ts
    ├── defaults.ts
    ├── storage.ts
    ├── image-cache.ts
    ├── export-render.ts
    └── types.ts
```

The template README inside `skills/app-store-screenshots/template/README.md` documents the editor internals in more detail.

## Editor Workflow

1. Capture real app screenshots from a simulator, emulator, or device.
2. Ask your agent to scaffold or migrate the screenshot project.
3. Run the dev server and open the editor.
4. Use the sidebar to organize screens and the inspector to edit copy, layouts, screenshots, and elements.
5. Choose Connected or Isolated mode depending on whether elements should cross screen boundaries.
6. Open **Style Lab** to compare complete looks, or **Scene** to tune backdrop, depth and headline style by hand.
7. Click **Export bundle** to download store-ready PNGs.

Uploaded files are saved under `public/screenshots/uploaded/`, and the canonical deck state is saved in `app-store-screenshots.json`. Commit both to make the deck reproducible after a fresh clone.

## Export Sizes

### Apple App Store

| Device | Resolution |
|--------|------------|
| iPhone 6.9" | 1320 x 2868 |
| iPhone 6.5" | 1284 x 2778 |
| iPhone 6.3" | 1206 x 2622 |
| iPhone 6.1" | 1125 x 2436 |
| iPad 13" | 2064 x 2752 |
| iPad Pro 12.9" | 2048 x 2732 |
| Apple TV | 3840 x 2160, 1920 x 1080 |
| Apple Watch Ultra | 422 x 514, 410 x 502 |
| Apple Watch Series 10 | 416 x 496 |
| Apple Watch Series 7 | 396 x 484 |
| Apple Watch Series 4 | 368 x 448 |
| Apple Watch Series 3 | 312 x 390 |
| CarPlay (iPhone slot, landscape) | 2868 x 1320, 2778 x 1284, 2622 x 1206, 2436 x 1125 |

App Store Connect has no CarPlay screenshot slot: CarPlay shots are uploaded into the iPhone slot, so the CarPlay deck exports landscape iPhone sizes with a head-unit frame.

### Mac App Store

| Device | Resolution |
|--------|------------|
| Mac (16:10) | 2880 x 1800, 2560 x 1600, 1440 x 900, 1280 x 800 |

Mac has its own **Mac** tab because App Store Connect lists macOS as a separate platform from the iOS app. Its bundle exports to `macos/mac/<WxH>/<locale>/`, next to `ios/...` and `android/...`. The Mac window frame has a 16:10 content area, so a full-screen 16:10 capture fills it without cropping.

### Google Play Store

| Device | Resolution |
|--------|------------|
| Phone portrait | 1080 x 1920 |
| 7" tablet portrait | 1200 x 1920 |
| 7" tablet landscape | 1920 x 1200 |
| 10" tablet portrait | 1600 x 2560 |
| 10" tablet landscape | 2560 x 1600 |
| Feature graphic | 1024 x 500 |

Screenshots are designed at the largest size for each device and scaled down for smaller exports. Every export waits until each screenshot has actually painted (Safari/WebKit decodes them asynchronously) and warns instead of silently writing a blank device. Android, iPad, Apple TV, Apple Watch, CarPlay and Mac frames are CSS-rendered, while iPhone uses the included `mockup.png` bezel.

## Project State

- `app-store-screenshots.json` is the source of truth for app name, active platform, active device, locales, theme, connected-canvas mode, scene, saved Style Lab looks, slides, screenshot paths, magnifiers, and transforms.
- Runtime uploads are written to `public/screenshots/uploaded/<hash>.png`.
- The editor reads `localStorage` first for fast paint, then reconciles with the project file.
- Older project files are migrated to schema v2 on load while keeping legacy decks isolated unless connected mode was already enabled.
- Custom themes live in `src/lib/constants.ts`; unknown theme ids fall back to `clean-light`. Color edits to a built-in theme are saved per theme in `themeColors`.

## Styles and Copy

The skill ships 18 named visual styles. Each one has a deep spec in `skills/app-store-screenshots/style-prompts/` covering palette, typography, headline emphasis, layout rhythm, decoration density, cross-screen moments, and copy voice. Browse rendered samples and copy-paste prompts in the [style gallery](https://www.parthjadhav.com/products/app-store-screenshots/styles).

| Style | Good for |
|-------|----------|
| Hand-Drawn Editorial Tasks | Productivity, tasks, notes with designer taste |
| Retro Rubberhose Mascot | Cozy habit and wellness apps with a mascot |
| Moody Curated Dating | Members-only dating, dinner clubs, premium lifestyle |
| Paper Sticker Skeuomorphic | Student organizers, notes, hobby apps |
| Dreamy Pastel Couples | Couples, long-distance, pet companions |
| Glossy 3D K-Beauty Creator | Creator economy, fan communities, beauty |
| Liquid Glass Aurora | Premium iOS-native utilities, AI assistants |
| Swiss Grid Bold | Finance, dev tools, analytics, B2B |
| Neon Athletic Night | Fitness, running, strength, recovery |
| Magazine Cover Editorial | Food, recipes, reading, travel, coffee |
| Candy Pop Social | Social, friends, events, gen-Z consumer |
| Soft Clay Wellness | Meditation, sleep, journaling, health |
| Midnight Glow Pro | AI, dev tools, pro productivity, power-user finance |
| Risograph Zine | Music, events, podcasts, indie creative apps |
| Bento Keynote Grid | Feature-dense productivity, health, finance, utilities |
| Toybox Primary | Kids learning, families, beginners, casual games |
| Quiet Japandi | Notes, calendars, reading, tea, minimalist utilities |
| Vintage Travel Poster | Travel, maps, outdoors, weather, road trips |

Name a style in your prompt ("use Swiss Grid Bold") and the agent applies the whole spec. Every named style also has a matching palette preset in the editor's toolbar theme picker.

For headlines, `skills/app-store-screenshots/copy-ideas.md` has formulas per slide role, ready lines for 13 app categories, eyebrow labels, a weak-to-better table, deck arcs, and localization notes. The same formulas sit in the inspector's **Copy ideas** menu next to the headline field.

## Design Standards

- Screenshots are ads, not documentation
- Each slide should sell one clear user outcome
- Headlines should pass the one-second thumbnail test
- Adjacent slides should vary layout and device placement
- Cross-screen elements should never split required text or critical UI
- Exported crops must still work as standalone screenshots

## Tech Stack

| Dependency | Purpose |
|------------|---------|
| Next.js | Dev server and app shell |
| React | Editor UI |
| TypeScript | Project and slide state safety |
| Tailwind CSS | Styling |
| shadcn/ui + Radix | Controls, dialogs, selects, tooltips |
| html-to-image | Exact PNG rendering |
| JSZip | Bundle downloads |
| dnd-kit | Screen reordering |
| react-rnd | Draggable and resizable canvas elements |

## Requirements

- Node.js 20.9+
- One of bun, pnpm, yarn, or npm

## Contributing

Contributions are welcome, especially around export reliability, screenshot design guidance, migrations, and cross-agent compatibility. Start with `CONTRIBUTING.md`.

## License

MIT

## Author

Created by [Parth Jadhav](https://www.parthjadhav.com/).

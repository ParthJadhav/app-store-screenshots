[![bloom-banner-01-light-tags-1500x500](https://github.com/user-attachments/assets/31139b9d-1b89-44e8-b563-5bb7ba150b7b)](https://bloom.parthjadhav.com)

### NOTE: MAKE SURE TO USE 6.1 INCH simulator to capture starting screenshots
this will save u from adjusting the images later

# App Store & Google Play Screenshots Generator

A skill for AI-powered coding agents (Claude Code, Cursor, Windsurf, etc.) that generates production-ready **App Store and Google Play** screenshots for iOS and Android apps. It scaffolds a Next.js project, designs advertisement-style screenshots, and exports them at all required Apple and Google resolutions.
#### Screenshots & App approved by Apple - https://apps.apple.com/us/app/bloom-coffee-shelf-recipe/id6759914524
![Example output — Bloom coffee tracking app](example.png)

## What it does

- Asks you about your app's brand, features, and style preferences
- Scaffolds a minimal Next.js project (or works within an existing one)
- Designs each screenshot as an **advertisement** — not a UI showcase
- Writes compelling copy using proven App Store / Play Store copywriting patterns
- Renders screenshots at full resolution with a built-in iPhone mockup and CSS-based Android device frames
- Exports PNGs at all required sizes for **both stores**
- Supports **Android Phone, 7" Tablet, 10" Tablet** (portrait + landscape) and **Feature Graphic** (1024×500)
- Supports locale-based screenshot sets and localized copy
- Supports reusable theme presets so you can swap art direction quickly
- Supports RTL-aware layouts and bulk export across locale/device/theme combinations

## Included assets

- `mockup.png` — Pre-measured iPhone frame with transparent screen area
- Android device frames are rendered with **CSS only** — no additional mockup PNGs needed

## Install

### Using npx skills (recommended)

```bash
npx skills add ParthJadhav/app-store-screenshots
```

This works with Claude Code, Cursor, Windsurf, OpenCode, Codex, and [40+ other agents](https://github.com/vercel-labs/skills#available-agents).

Install globally (available across all projects):

```bash
npx skills add ParthJadhav/app-store-screenshots -g
```

Install for a specific agent:

```bash
npx skills add ParthJadhav/app-store-screenshots -a claude-code
```

### Manual (git clone)

```bash
git clone https://github.com/ParthJadhav/app-store-screenshots ~/.claude/skills/app-store-screenshots
```

## Usage

Once installed, the skill triggers automatically when you ask Claude Code to:

- Build App Store or Google Play screenshots
- Generate marketing screenshots for an iOS or Android app
- Create exportable screenshot assets for both stores

Or just tell Claude Code what you need:

```
> Build App Store and Google Play screenshots for my app
```

Claude will ask you about your app's screenshots, brand colors, font, features, style direction, and number of slides before building anything.

## Example prompts

These are good starting prompts because they provide product context while still leaving room for the skill to guide the design process.

### Habit tracker

```text
Build App Store screenshots for my habit tracker.
The app helps people stay consistent with simple daily routines.
I want 6 slides, clean/minimal style, warm neutrals, and a calm premium feel.
```

### Finance app

```text
Generate App Store screenshots for my personal finance app.
The app's main strengths are fast expense capture, clear monthly trends, and shared budgets.
I want a sharp, modern style with high contrast and 7 slides.
```

### AI productivity tool

```text
Create exportable App Store screenshots for my AI note-taking app.
The core value is turning messy voice notes into clean summaries and action items.
I want bold copy, dark backgrounds, and a polished tech-forward look.
```

### Wellness app

```text
Build marketing screenshots for my meditation app.
The app focuses on sleep, stress relief, and short guided sessions.
Use a soft, warm, organic style and prioritize emotional outcomes over feature lists.
```

### Multi-language / multi-theme

```text
Build App Store screenshots for my language learning app.
I need English, German, and Arabic screenshot sets.
Use two reusable themes: clean-light and dark-bold.
Make sure Arabic slides feel RTL-native, not just translated.
```

## Better prompt tips

- say what the app does in one sentence
- list the top 3-5 features in priority order
- describe the visual style you want
- mention how many slides you need
- mention if you need multiple languages or RTL locales
- mention if you want one art direction or reusable theme presets
- provide references if you want the output to match a certain App Store style

## What gets scaffolded

If starting from an empty folder, the skill creates:

```
project/
├── public/
│   ├── mockup.png          # iPhone frame (copied from skill)
│   ├── app-icon.png        # Your app icon
│   ├── screenshots/        # iOS screenshots (locale folders optional)
│   │   └── android/        # Android screenshots (when targeting both)
│   └── screenshots-ipad/   # Optional iPad screenshots
├── src/app/
│   ├── layout.tsx          # Font setup
│   └── page.tsx            # Screenshot generator (single file)
├── package.json
└── ...
```

When targeting both stores, the skill uses a platform-based folder structure to keep iOS and Android screenshots separated.

The entire generator is a **single `page.tsx` file**. Run the dev server, open the browser, click any screenshot to export it as a PNG.

The latest version of the skill also guides the agent to generate:

- locale tabs and locale-specific screenshot folders
- reusable theme presets backed by design tokens
- RTL-aware layouts for languages like Arabic and Hebrew
- bulk export flows for locale/device/theme combinations

## Export sizes

### Apple App Store

| Display | Resolution |
|---------|-----------|
| 6.9" | 1320 x 2868 |
| 6.5" | 1284 x 2778 |
| 6.3" | 1206 x 2622 |
| 6.1" | 1125 x 2436 |

### Google Play Store

| Device | Resolution |
|--------|-----------|
| Phone (portrait) | 1080 x 1920 |
| 7" Tablet (portrait) | 1200 x 1920 |
| 7" Tablet (landscape) | 1920 x 1200 |
| 10" Tablet (portrait) | 1600 x 2560 |
| 10" Tablet (landscape) | 2560 x 1600 |
| Feature Graphic | 1024 x 500 |

Screenshots are designed at the largest size per platform and scaled down for smaller sizes. Android device frames are CSS-rendered.

## Advanced capabilities

### Multi-language screenshots

The skill can generate screenshot systems for multiple locales by nesting images under locale folders such as:

```text
public/screenshots/en/home.png
public/screenshots/de/home.png
public/screenshots/ar/home.png
```

The generated page keeps slide structure the same and swaps only the locale base path and copy dictionary.

### Theme presets

Instead of hardcoding one art direction, the skill now encourages a token-driven preset system, for example:

```ts
const THEMES = {
  "clean-light": { bg: "#F6F1EA", fg: "#171717", accent: "#5B7CFA" },
  "dark-bold": { bg: "#0B1020", fg: "#F8FAFC", accent: "#8B5CF6" },
  "warm-editorial": { bg: "#F7E8DA", fg: "#2B1D17", accent: "#D97706" },
} as const;
```

This lets you reuse the same slide system while testing different visual directions fast.

### RTL-aware design

For RTL locales such as Arabic and Hebrew, the skill now tells the agent to:

- set `dir="rtl"` on the screenshot canvas
- rewrite line breaks for the target language
- mirror asymmetric layouts intentionally
- keep the composition feeling native instead of mechanically flipped

### Bulk export matrix

The generator is now expected to support exporting not only the current slide, but also:

- all slides for the current locale/device/theme
- all locales for the current theme
- full locale + device + theme matrices when needed

## Tech stack

| Dependency | Purpose |
|-----------|---------|
| Next.js | Dev server + static image serving |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| html-to-image | PNG export at exact resolutions |
| React | Component composition |

## Key design principles

- **Screenshots are ads, not docs** — each slide sells one idea
- **Copy follows the "one second" rule** — readable at thumbnail size in the App Store
- **Layouts vary** — no two adjacent slides share the same phone placement
- **Style is user-driven** — no hardcoded colors, gradients, or fonts

## Quality Checklist

Before exporting, each slide should pass this quick review:

- the headline communicates one idea in about one second
- the first slide sells the strongest user benefit
- adjacent slides do not reuse the same layout
- decorative elements support the message instead of blocking the UI
- text, screenshots, and framing still look correct after export sizing

## Requirements

- Node.js 18+
- One of: bun, pnpm, yarn, or npm (detected automatically, bun preferred)

## Contributing

Contributions are welcome, especially around:

- screenshot generation reliability
- skill prompt quality
- clearer docs and onboarding
- cross-agent compatibility

If you want to contribute, start with `CONTRIBUTING.md`. Bug reports and feature requests also have issue templates now to make reproduction and review easier.

## License

MIT
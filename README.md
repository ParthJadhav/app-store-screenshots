### NOTE: MAKE SURE TO USE 6.1 INCH simulator to capture starting screenshots
this will save u from adjusting the images later

# App Store Screenshots Generator

A skill for AI-powered coding agents (Claude Code, Cursor, Windsurf, etc.) that generates production-ready App Store screenshots for iOS apps. It scaffolds a Next.js project, designs advertisement-style screenshots, and exports them at all required Apple resolutions.
#### Screenshots & App approved by Apple - https://apps.apple.com/us/app/bloom-coffee-shelf-recipe/id6759914524
![Example output — Bloom coffee tracking app](example.png)

## What it does

- Asks you about your app's brand, features, and style preferences
- Scaffolds a minimal Next.js project (or works within an existing one)
- Designs each screenshot as an **advertisement** — not a UI showcase
- Writes compelling copy using proven App Store copywriting patterns
- Renders screenshots at full resolution with a built-in iPhone mockup
- Exports PNGs at all 4 Apple-required sizes (6.9", 6.5", 6.3", 6.1")

## Included assets

- `mockup.png` — Pre-measured iPhone frame with transparent screen area

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

- Build App Store screenshots
- Generate marketing screenshots for an iOS app
- Create exportable screenshot assets

Or just tell Claude Code what you need:

```
> Build App Store screenshots for my app
```

Claude will ask you about your app's screenshots, brand colors, font, features, style direction, and number of slides before building anything.

## What gets scaffolded

If starting from an empty folder, the skill creates:

```
project/
├── public/
│   ├── mockup.png          # iPhone frame (copied from skill)
│   ├── app-icon.png        # Your app icon
│   └── screenshots/        # Your app screenshots
├── src/app/
│   ├── layout.tsx          # Font setup
│   └── page.tsx            # Screenshot generator (single file)
├── package.json
└── ...
```

The entire generator is a **single `page.tsx` file**. Run the dev server, open the browser, click any screenshot to export it as a PNG.

## Export sizes

| Display | Resolution |
|---------|-----------|
| 6.9" | 1320 x 2868 |
| 6.5" | 1284 x 2778 |
| 6.3" | 1206 x 2622 |
| 6.1" | 1125 x 2436 |

Screenshots are designed at 1320x2868 (largest) and scaled down for smaller sizes.

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

## License

MIT

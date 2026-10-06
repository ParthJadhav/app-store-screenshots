# Style Prompts

A library of named visual styles distilled from the best App Store screenshots in the wild. When a user names one of these styles (or pastes one of the prompts), the screenshot deck should adopt the **entire spec** in the matching file — palette, typography, layout rhythm, decorative accents, and copy tone.

Apply a style globally first; let the user override specific slides afterwards.

If a user gives a prompt that does not match a named style, fall back to the Visual Design Principles in `SKILL.md` and pick the **closest** style here as the starting point.

---

## Deep style spec index (`./style-prompts/`)

**Before you read any deep spec, read [`./style-prompts/_QUALITY_BAR.md`](./style-prompts/_QUALITY_BAR.md).** It defines the universal sizing, illustration-polish, contrast, and auto-reject rules that apply to every style. Each deep spec adds style-specific quantitative rules on top.

**When a user names one of these styles, ALWAYS read the matching deep spec file before generating slides.**

| # | Slug | Deep spec file | Use when… |
|---|------|----------------|-----------|
| 01 | `retro-rubberhose-mascot` | [01-retro-rubberhose-mascot.md](./style-prompts/01-retro-rubberhose-mascot.md) | Cozy walking/habit app with a 1930s cartoon character. Cream + mustard, white-gloved mascot, chunky retro display. Inspired by Cancoco. |
| 02 | `moody-curated-dating` | [02-moody-curated-dating.md](./style-prompts/02-moody-curated-dating.md) | Exclusive members-only dating / dinner clubs. Dim lifestyle photography, white serif headlines with italic emphasis. Inspired by Mate. |
| 03 | `paper-sticker-skeuomorphic` | [03-paper-sticker-skeuomorphic.md](./style-prompts/03-paper-sticker-skeuomorphic.md) | Student organizer, notes, hobby apps. Cork-board bg, paper-cutout UI, marker handwriting, sticker pixel-art. Inspired by Folderly. |
| 04 | `dreamy-pastel-couples` | [04-dreamy-pastel-couples.md](./style-prompts/04-dreamy-pastel-couples.md) | Couples / long-distance / pet-companion apps. Cotton-candy sky gradient, 3D globe, kawaii pets, lilac italic serif emphasis. Inspired by Between. |
| 05 | `hand-drawn-editorial-tasks` | [05-hand-drawn-editorial-tasks.md](./style-prompts/05-hand-drawn-editorial-tasks.md) | Productivity / tasks / notes with designer taste. Navy + cream + coral slides, script accent word, tilted phones, doodle squiggles. Inspired by Superlist. |
| 06 | `glossy-3d-kbeauty-creator` | [06-glossy-3d-kbeauty-creator.md](./style-prompts/06-glossy-3d-kbeauty-creator.md) | K-beauty / creator-economy / influencer-brand collab. Deep purple gradient, glossy chrome 3D numerals, kawaii ghost mascot, yellow hashtag chips. Inspired by Nuri Lounge. |
| 07 | `liquid-glass-aurora` | [07-liquid-glass-aurora.md](./style-prompts/07-liquid-glass-aurora.md) | Premium iOS-native utilities, AI and health apps. Pastel aurora blooms, frosted glass cards over upright phones, one aurora-gradient word. Inspired by Apple's Liquid Glass. |
| 08 | `swiss-grid-bold` | [08-swiss-grid-bold.md](./style-prompts/08-swiss-grid-bold.md) | Finance, dev tools, analytics, B2B, hardware apps. Paper/ink slides, visible grid, giant flush-left grotesk, hard-cropped upright phones, one orange block. Inspired by Müller-Brockmann. |
| 09 | `neon-athletic-night` | [09-neon-athletic-night.md](./style-prompts/09-neon-athletic-night.md) | Fitness, running, strength, sleep/recovery or sports apps that sell performance. Near-black stadium light, one volt accent, slanted condensed headlines, giant stats. Inspired by Nike Run Club. |
| 10 | `magazine-cover-editorial` | [10-magazine-cover-editorial.md](./style-prompts/10-magazine-cover-editorial.md) | Food, coffee/tea/wine, reading, journaling, travel or lifestyle apps. Paper ground, oxblood italic serif cover lines, small-caps masthead, figure captions. Inspired by Kinfolk. |
| 11 | `candy-pop-social` | [11-candy-pop-social.md](./style-prompts/11-candy-pop-social.md) | Social, events, messaging, gen-Z apps and games. Flat saturated slides, chunky type with a pill word, chat bubbles and stickers bursting from tilted phones. Inspired by Partiful. |
| 12 | `soft-clay-wellness` | [12-soft-clay-wellness.md](./style-prompts/12-soft-clay-wellness.md) | Meditation, sleep, journaling, habit, cycle, nutrition or wellness apps that should feel slow, earthy and tactile. Clay props, arch-framed phones, soft serif. Inspired by Calm and Aesop. |
| 13 | `midnight-glow-pro` | [13-midnight-glow-pro.md](./style-prompts/13-midnight-glow-pro.md) | AI/dev tools, pro productivity, power-user finance, crypto — anything selling speed and craft. Near-black, one indigo beam on a rim-lit phone, dark glass, keycaps. Inspired by Linear, Raycast, Vercel. |
| 14 | `risograph-zine` | [14-risograph-zine.md](./style-prompts/14-risograph-zine.md) | Music, events, podcasts, indie tools, cafés/bookstores or community apps with gig-flyer energy. Two misregistered riso inks, halftones, knockout caps, stapled tickets. Inspired by Hato Press. |
| 15 | `bento-keynote-grid` | [15-bento-keynote-grid.md](./style-prompts/15-bento-keynote-grid.md) | Feature-dense apps that need several features per slide: rounded tiles, huge stats, real widgets, a tile-cropped hero phone. Inspired by Apple keynote bento slides. |
| 16 | `toybox-primary` | [16-toybox-primary.md](./style-prompts/16-toybox-primary.md) | Kids learning, family, beginner, casual game or pet apps. Cream and primaries, rounded toy-lip type, a studded block word, 3D ABC cubes and rainbows around tilted phones. Inspired by Toca Boca. |
| 17 | `quiet-japandi` | [17-quiet-japandi.md](./style-prompts/17-quiet-japandi.md) | Notes, calendars, reading, tea/coffee, journaling, home or minimalist utilities that should feel calm and crafted. Washi paper, oak shelf, one ceramic cup, vertical Japanese word, one hanko seal. Inspired by MUJI and Kinto. |
| 18 | `vintage-travel-poster` | [18-vintage-travel-poster.md](./style-prompts/18-vintage-travel-poster.md) | Travel, maps, hiking, weather, parks, road trips or astronomy. Cream-framed silkscreen landscapes, banded skies, hazy ridges, a monolith phone, script + giant caps. Inspired by WPA National Park posters. |

Headline copy for any style: see [`copy-ideas.md`](./copy-ideas.md), then rewrite the chosen line in the style's `## Copy tone`.

### Picking a style by app category

| App category | First pick | Also try |
|---|---|---|
| Productivity, tasks, notes | Hand-Drawn Editorial Tasks | Liquid Glass Aurora, Quiet Japandi, Bento Keynote Grid |
| Finance, analytics, B2B | Swiss Grid Bold | Bento Keynote Grid, Midnight Glow Pro |
| AI tools, dev tools, pro/power-user apps | Midnight Glow Pro | Swiss Grid Bold, Liquid Glass Aurora |
| Feature-dense utilities, health dashboards, smart home | Bento Keynote Grid | Liquid Glass Aurora |
| Fitness, running, sports, recovery | Neon Athletic Night | Swiss Grid Bold |
| Meditation, sleep, mental health, cycle | Soft Clay Wellness | Quiet Japandi, Dreamy Pastel Couples |
| Food, recipes, coffee, tea, reading | Magazine Cover Editorial | Quiet Japandi, Moody Curated Dating |
| Travel, maps, outdoors, weather | Vintage Travel Poster | Magazine Cover Editorial |
| Music, events, podcasts, indie creative | Risograph Zine | Candy Pop Social |
| Social, messaging, gen-Z | Candy Pop Social | Risograph Zine, Glossy 3D K-Beauty Creator |
| Kids, family, beginner learning, casual games | Toybox Primary | Retro Rubberhose Mascot |
| Dating, members clubs, premium lifestyle | Moody Curated Dating | Magazine Cover Editorial |
| Couples, pets, journaling | Dreamy Pastel Couples | Soft Clay Wellness |
| Habits and walking with a mascot | Retro Rubberhose Mascot | Toybox Primary |
| Students, hobbies, crafts | Paper Sticker Skeuomorphic | Risograph Zine |
| Creator economy, beauty, fandom | Glossy 3D K-Beauty Creator | Candy Pop Social |
| Minimalist utilities, calendars, home & interior | Quiet Japandi | Swiss Grid Bold |
| AI assistants, premium iOS utilities | Liquid Glass Aurora | Midnight Glow Pro |

Every style has a matching palette preset in the editor's theme picker (`THEMES` in `src/lib/constants.ts`, same id as the slug). The preset only sets flat colors for the basic renderer; the deep spec still drives fonts, backgrounds, and decoration.

---

## How to apply a style

When a user invokes a style by name (e.g. "use the Hand-Drawn Editorial style"):

1. Read the matching deep spec file (and `_QUALITY_BAR.md` first).
2. Set the theme palette to the listed hex values.
3. Set the font family for headline + body to the listed stack.
4. Match the listed headline emphasis behavior.
5. Apply the listed layout rhythm (which slide types and in what order).
6. Decide whether the deck should include a cross-screen/cross-canvas moment. For 5+ slide decks, include one tasteful adjacent-screen bridge when the style supports it; keep minimal or photo-led styles subtle.
7. Add the listed decorative accents on at least 60% of slides.
8. Rewrite the copy tone to match the listed voice rules.

If the style and a user-supplied brand color clash, keep the brand color and adjust adjacent palette entries to be analogous.

---

## Combining and overriding

- If the user names a style **and** gives custom brand colors, swap the palette colors closest in lightness to the brand colors but keep the typography and accent rules intact.
- If the user names a style **and** a layout (e.g. "style 05 but with style 04's layout rhythm"), keep the named style's typography + accents, swap only the layout rhythm.
- If two styles are named, pick the first as primary and pull at most one element (typography OR decoration) from the second.
- Cross-screen moments inherit the primary style's rules. In a moody/photo style, continue a photograph, vignette, or notification across the seam; in an editorial style, use a tilted phone, doodle, or sticker trail; in a maximalist style, let chips, mascots, or 3D objects bridge the pair. Never use the cross-screen device as an excuse to break type contrast, phone sizing, or standalone readability.

## Adding new styles

When the user describes a new style not in this list and likes the result, propose appending a new deep spec file in `./style-prompts/` using the next sequential number, following the same field layout as the existing specs (Palette / Typography / Headline emphasis / Layout rhythm / Decorative accents / Copy tone), then add a row to the index table above.

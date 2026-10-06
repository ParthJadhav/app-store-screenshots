# Agent map

This repository ships a skill. The app you can run is `skills/app-store-screenshots/template/`. There is no root `package.json`.

| Question | Read this |
| --- | --- |
| Install and use the skill | `README.md` |
| Scaffold, questions, and in-place upgrade | `skills/app-store-screenshots/SKILL.md` |
| Project JSON coercion | `skills/app-store-screenshots/migrate-project.cjs` |
| Named styles | `skills/app-store-screenshots/style-prompts.md`, then `_QUALITY_BAR.md`, then the matching spec |
| Headlines | `skills/app-store-screenshots/copy-ideas.md` |
| How the editor behaves | `skills/app-store-screenshots/template/README.md` |
| Device sizes, themes, frame ratios | `skills/app-store-screenshots/template/src/lib/constants.ts` |
| Deck content | `app-store-screenshots.json` in a generated project. `defaults.ts` is only the fallback |
| Tests | `skills/app-store-screenshots/template/` — `bun run test:e2e`. See `CONTRIBUTING.md` |

Paths below are relative to `skills/app-store-screenshots/template/`.

| Task | Start here |
| --- | --- |
| Editor orchestration and export | `src/components/editor/screenshot-editor.tsx` — `exportAll`, `generateBundle` |
| Pan, zoom, fit | `src/components/editor/preview-stage.tsx` — `panToActiveScreen` |
| Connected and isolated composition | `src/components/editor/slide-canvas.tsx` |
| Inspector and overlays | `src/components/editor/inspector.tsx` |
| Save, conflict, undo | `src/lib/storage.ts` — `useProject` |
| PNG crop and blank detection | `src/lib/export-render.ts` — `renderSlide` |
| Device frames | `src/components/editor/device-frames.tsx` |

Run tests from the template directory. `test:e2e` owns a disposable server. Legacy harnesses under `tests/harness/` write the project they are pointed at, so point them at a copy.

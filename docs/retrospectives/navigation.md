# Repository navigation retrospective

**The strongest improvement is a short root `AGENTS.md` that routes agents to the nested editor, current verification instructions, and the right file for each task.** The recurring cost is rediscovering these boundaries and reading large files before knowing which subsystem matters.

## Scope and confidence

This review examined 20 coding-agent sessions relevant to this repository and compared their discovery patterns with the source and documentation. Findings are aggregated; private transcript links, session identifiers, machine paths, unrelated project names and activity timestamps have been removed.

Session duration does not measure wasted time: it includes implementation, verification and pauses. The evidence supports repeated discovery and concrete failures, not a reliable total of minutes lost.

Some verification improvements observed during review are still being developed outside the committed baseline. Confirm their availability on the target branch before treating their commands or paths as canonical.

## Prioritized findings

### 1. Put the executable project location at the first entry point — high priority

**Observed:** agents repeatedly assume a root application before discovering `skills/app-store-screenshots/template/`. Explicit root `package.json` misses occur in the branch/merge session, capture session and code review; the asset cleanup initially searches root `public/`. In the latest bug bash, the agent creates a disposable copy but launches Next with the repository root as cwd, producing `Cannot find module .../app-store-screenshots/node_modules/next/dist/bin/next`, then retries with the correct disposable cwd.

**Current gap:** there is no root `package.json` or repository-local `AGENTS.md`. The contributing guide is being updated to identify the canonical product, while its introduction still characterizes most changes as README/SKILL changes. The README's internal-doc pointer is plain text and appears after the scaffold tree. Neither gives an early task-to-file map.

**Recommended change:** add a compact root `AGENTS.md`, around 50–80 lines, and a “Developing the editor” link near the top of README. Put these facts first:

- The repository distributes a skill; the executable app and its package scripts live in `skills/app-store-screenshots/template/`.
- `SKILL.md` controls generation/migration behavior; template source controls the running editor.
- Project content belongs in `app-store-screenshots.json`; `defaults.ts` is fallback/reset behavior.
- Read `CONTRIBUTING.md` and the linked test matrix for current verification commands.
- Use the task map below before broad repository searches. Preserve existing working-tree changes and generated user assets.

**Acceptance check:** a fresh agent can name the app cwd, the relevant source file and the test entry point without a root package/public lookup. No need to move the nested template or add a synthetic root application.

### 2. Make large-file discovery task-directed — high priority

**Observed:** the bug bashes repeatedly read whole editor/storage/export files and concatenate multiple large files into one result. Outputs are truncated, followed by narrower rereads. The editor bug-bash run reads `screenshot-editor.tsx` with `cat -n`, then reads the same file again via the file tool. The panning task starts with a repository-wide `pan|panTo|center|focus|zoom|sidebar|canvas|screen` search before narrowing to the canvas selection path.

**Shape at review time:** `slide-canvas.tsx` is 1,436 lines, `inspector.tsx` 1,149, `screenshot-editor.tsx` 881, and `SKILL.md` 803. There is no concise ownership/data-flow map. Large files alone are not a reason for a broad refactor.

**Recommended change:** add the task map below to the root agent entry point. Use stable symbol names in the map and bounded reads around those symbols. Document three key boundaries: selection/panning, hydration/save/history, and export composition/encoding. If these files are later split for a feature, preserve those boundaries; do not perform a speculative rewrite solely to reduce line counts.

**Acceptance check:** a panning request routes directly to `PreviewStage`, while an alpha-channel export bug routes to `png-rgb.ts`/`png-encode.ts`; neither requires reading the full skill or inspector.

### 3. Route every verification request to the new local suite — high priority, substantially addressed

**Observed:** bug-bash sessions search outside this repository for Playwright packages, use paths under `/private/tmp` or the Codex runtime, manually construct disposable app copies, and encounter Turbopack dependency-symlink errors. A sample-app migration runs a production build while its dev server is alive, gets missing `.next` chunks, and restarts with a clean cache.

**Work in progress observed during review:** a newer template suite pins Playwright, uses installed Google Chrome, creates a disposable app, runs dev mode with `--webpack`, and supports production verification. That setup makes root `scripts/*.cjs` compatibility wrappers for `template/tests/harness/` and documents the flow in the contributing guide and test matrix. Once it lands, use it rather than building a second harness.

**Remaining action:** link this workflow from root `AGENTS.md` and README once the new suite lands; name Node >=22.12 for tests separately from Node >=20.9 for app runtime. Explain that `test:e2e` owns its disposable server, whereas legacy harnesses require a disposable server URL and mutate it. Keep API/UI/export harnesses sequential. Document that ad hoc build and dev processes sharing the same `.next` tree can interfere, and point verification toward the disposable workflow.

**Acceptance check:** an agent starts with `bun run test:e2e:list`/`bun run test:e2e` in the template, with no search of the home directory for a Playwright installation. This retrospective inspected the configuration; it did not run or certify the new suite.

### 4. Give docs explicit authority and executable contracts — high priority

**Observed stale-doc failure:** a canvas review finds that the skill tells new-user agents to seed `src/lib/defaults.ts`, but the shipped project JSON overrides it on hydration. The agent fixes canonical starter-state guidance. In the same session, migration wording is revised repeatedly to reconcile passive legacy behavior and explicit upgrades. Later dogfooding finds sample decks/assets leaking into migrations. A README update begins with the user's explicit report that the merged features and UI image are absent from the README. A later bug bash also repairs the migration recipe's handling of null/duplicate overlays.

**Current status:** the skill now explicitly directs initial edits to project JSON, preserves legacy isolated mode unless connected mode was already selected, and the README describes the newer editor. These historical bugs are addressed; they are evidence for improving maintenance, not current regressions.

**Recommended change:** establish this authority table in the navigation docs:

| Question | Authority |
| --- | --- |
| Install/use the skill | Root README |
| Agent discovery, scaffold and in-place upgrade behavior | `skills/app-store-screenshots/SKILL.md` and its references |
| Runtime state and API behavior | Template source plus template README |
| Test commands and coverage | Template `package.json`, `CONTRIBUTING.md`, `docs/testing/e2e.md` |
| Current device/theme/export definitions | Template `src/lib/constants.ts` |
| Past fixes | `BUG_BASH.md`, explicitly dated historical evidence |

Keep `SKILL.md` focused on routing and decisions. Move its long migration implementation to a co-shipped reference or executable recipe that the skill links directly. Preserve availability after installation/scaffolding. The newer verification setup observed during review extracts the live recipe from `SKILL.md`; standalone scaffolds use `tests/harness/migration-fixture.cjs`. **Those copies matched at review time.** If the recipe is extracted, update both consumers and make equality an automated check, or ship one shared implementation. This is a drift-prevention recommendation, not an existing mismatch.

Add a PR checklist mapping changed behavior to affected docs: state/migration, export/sizes, editor controls, or tests. This is more useful than a generic “read README and SKILL” requirement.

### 5. Mark the generated architecture graph as a dated snapshot — medium priority

**Verified snapshot staleness:** an optional local `.understand-anything/` graph predates later editor changes. All 61 indexed file paths still exist, but **22 of the 54 template runtime files present at review time are absent**, including `export-render.ts`, `png-rgb.ts`, `project-validation.ts`, font import and production upload-serving routes. Existing file summaries also predate later persistence and validation changes.

**Important evidence boundary:** I found no later reviewed session using this repo's graph as authority, so this is a future navigation risk, not a demonstrated cause of later agent delay.

**Recommended change:** state in the root map that the graph is a historical snapshot and current source is authoritative. If keeping it as a navigation tool, add a visible analyzed-commit/current-commit check and refresh intentionally. A small maintained task map is the better default entry point than automatically repeating the full knowledge-graph workflow.

### 6. Clarify distributable template vs. user decks and cross-repo outputs — medium priority

**Observed:** two cleanup sessions are needed because the first removal deletes nested generated elements while tracked top-level app screenshots remain. The cleanup agent initially searches root `public/`. Sample-app sessions separately inspect generated app copies to determine whether their UI matches the current template. Gallery/showcase work searches other repos or the website for source content.

**Current improvement:** repo-scoped ignores now cover template user screenshot/icon assets. The skill documents copying its co-located template and preserving existing project state/assets.

**Recommended change:** document four ownership boundaries: reusable skill/template, generated user project, `promo/` artifacts, and the separate website gallery. State that `mockup.png` is a shipped reusable bezel, while app icons and app-specific screenshots are user content. A short `promo/README.md` can index the three demos by brief, entry point, asset ledger and export location. Keep external website references as pointers with verification dates, not another copied feature registry.

## Task-to-file map to use immediately

All source paths in this table are relative to `skills/app-store-screenshots/template/` unless otherwise noted.

| Task | Start here | Follow the boundary |
| --- | --- | --- |
| App entry / editor orchestration | `src/app/page.tsx`, `src/components/editor/screenshot-editor.tsx` | Deck selection, edits, toolbar wiring, `exportAll`/`generateBundle` |
| Selection, pan, zoom, Fit | `src/components/editor/preview-stage.tsx` — `PreviewStage`, `panToActiveScreen` | Canvas-origin selection suppresses auto-pan; sidebar-origin selection recenters |
| Connected/isolated composition, transforms | `src/components/editor/slide-canvas.tsx` | Preview, thumbnails and exported crops must agree |
| Inspector fields / overlays | `src/components/editor/inspector.tsx`, `image-element-canvas.tsx` | Editor patches persist in the project state |
| Hydration, save/retry/conflicts, undo | `src/lib/storage.ts` — `useProject`, `loadFromFile`, `saveToFile` | `/api/project` route and `project-validation.ts` |
| Export preparation and image/font loading | `src/lib/export-assets.ts`, `image-cache.ts`, `typography.ts` | `screenshot-editor.tsx` coordinates preparation and ZIP construction |
| Crop/render/blank-image detection | `src/lib/export-render.ts` — `renderSlide` | Connected DOM composition in `slide-canvas.tsx` |
| RGB PNG encoding / worker fallback | `src/lib/png-rgb.ts`, `png-encode.ts`, `png-worker.ts` | Distinguish rendering failures from encoding failures |
| Upload validation / serving | `src/app/api/{upload,upload-font}/route.ts` | `request-body.ts`, `request-guard.ts`, `write-asset.ts`, `serve-asset.ts`, runtime serving routes |
| Device sizes, themes, font choices | `src/lib/constants.ts`, `types.ts` | Starter JSON vs. reset/fallback `defaults.ts` |
| Generation/migration behavior | Repo `skills/app-store-screenshots/SKILL.md` | Style index, `_QUALITY_BAR.md`, selected style, `copy-ideas.md` |
| Verification, after the new suite lands | `package.json`, `e2e.config.ts`, `docs/testing/e2e.md` | `tests/`, `tests/harness/`, `e2e-army/`; root scripts become wrappers |

## Suggested implementation order

1. Add root `AGENTS.md` with app cwd, this task map, authority rules and test links. Add the early README contributor link and update the outdated contributing introduction.
2. Add the snapshot warning for `.understand-anything/`; add a small promo index if demo work remains frequent.
3. Extract the migration recipe and enforce shared-source/equality checks without changing migration behavior. Update the live extraction and standalone-scaffold test paths together.
4. On future state/export/UI changes, update only the corresponding authoritative doc and its entry-point link. Assess whether agents still repeat whole-file reads before undertaking component splits.

The proposed navigation and migration changes are recommendations; this report does not implement them.

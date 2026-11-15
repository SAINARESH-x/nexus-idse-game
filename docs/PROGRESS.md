# PROGRESS

## Current state

**All phases (1 to 13) are implemented, plus the Phase 12 optional items (sound, Tool Bay, polish, accessibility pass). Phase 14 (optional expansion) was not started.** All seven levels are playable end to end: briefing, stages, side operations, bonuses, debrief, XP and credits, story fragments, finale and campaign summary.

`npm run verify` passes: typecheck, the full Vitest suite and the production build (see `NEXUS_FINAL_COMPLETION_REPORT.md` at the repository root for exact numbers). The owner's manual browser checklist is in that report.

## How to run

```bash
npm ci
npm run dev        # dev server with the developer panel
npm run verify     # typecheck + tests + build
VITE_BASE=/nexus-idse-game/ npm run build   # GitHub Pages build
```

Routes: `#/`, `#/new`, `#/hub`, `#/level/:id`, `#/level/:id/play` (`?side=<id>` for side ops), `#/level/:id/debrief`, `#/achievements`, `#/settings`, `#/toolbay`, `#/ending`. Dev builds only: `#/dev/ui`, `#/dev/engine`.

## Architecture

- **Game core (`src/game`).**
  - `store.ts`: zustand persist under `nexus-save-v1`. Actions:
    - campaign: `newGame`, `startMission` (the only place `attempts` increments; returns the pre-increment index), `completeMission`, `completeSideOp`, `completeBonus`
    - progress: `recordStats`, `syncAchievements`
    - Tool Bay and settings: `buyItem`, `setTheme`, `updateSettings`, `setSoundOn`
    - save: `exportSave`, `importSave`, `resetAll`
    - DEV_ONLY: `unlockAll`, `addXp`, `addAdaptiveEntry`, `completeAllLevels`
  - `completeMission` records `stats.minHints`, pushes adaptive history (capped at 50) and sets `campaignComplete` / `campaignCompletedAt` once when Level 7 completes.
- **Persistence (`persistence.ts`).**
  - `storageAvailable()` with an in-memory fallback, and quota-error events.
  - `migrateSave()` upgrades old shapes (missing attempts, stats, owned, campaignComplete, achievements, adaptive). It is used by the persist `migrate`/`merge` and by import.
  - `saveStorage` captures an unreadable save, pauses writes so it is never overwritten, and the app shows `RecoveryScreen` (EXPORT RAW DATA, RESET, TRY AGAIN).
- **Registry.**
  - `levels/registry.ts` imports each level's definition from `src/levels/lNN/definition.ts`.
  - `levels/counts.ts` `getRegistryCounts()` is the single source of every total shown in the game.
  - `levels/runtime.ts` defines the `LevelRuntime` contract and `src/levels/runtimes.ts` maps level ids to runtimes. A runtime may provide: renderChallenge, objectives, `persistent` validators and initial states, `MainMission`, `SideOp`, `Debrief`, `DebriefExtra`, `BriefingActions`.
- **Sessions for Levels 05 to 07 (`levelSession.ts`).**
  - Keys `nexus-l05-session` to `nexus-l07-session`.
  - The record holds `{v, levelId, attemptIndex, seed, status, stageId, stages{status, hintsUsed, mistakes, state, result}, objectives, report}`.
  - `sessionSeed(level, attempt) = level*1000 + (attempt % 50)*17`.
  - `parseSession` rejects the whole record on bad JSON, version, level, seed or attempt mismatch, or an unknown stage. Otherwise it repairs stages one at a time.
  - `PersistentMission` runs the shell with restore and progress hooks. `useStageState(stageId, initial)` persists per-stage inputs. `useLevelSeed(levelId)` provides seeds.
  - The debrief rebuilds from a finished record after F5.
- **Level 04 session.** Key `nexus-l04-session` stores seed, tier, attemptIndex, engine `toJSON()` (rebuilt by replay), stage states, hints and the finished report.
- **Engine (`src/engine`).**
  - Immutable `DF`, `apply`, `toCode`, a safe hand-written `parse`, and the `createDfSession` factory.
  - `generateStudents`, `liveHealth`, `judgeOp`, `assessQuality`.
  - `stats.ts`, `cohort.ts` + `cohortConfig.ts` (deterministic cohort for Levels 5 to 7), and `rng.ts` (`mulberry32`, `mixSeed`).
- **Charts (`src/components/charts`).** Scatter (brush, line, residuals), Histogram, BarChart, BoxPlot and LineChart, all SVG with computed aria summaries.
- **Systems.**
  - `achievements.ts`: 20 rules, thresholds derived from the registry; `secret-seeker` is dropped when the registry has no hidden bonuses.
  - `settings.ts`: volume, reduced motion, text size, accent theme via the `--nx-cyan-rgb` CSS variable.
  - `sound.ts`: Web Audio tones, silent until the first gesture, never throws.
  - `toolbay.ts`: three themes.
  - `adaptive.ts`: `recommendTier`, `struggleSignals`.
  - `campaignSummary.ts`.

## Levels

| Level | Stages | Side ops | Bonuses (visible + hidden) | Notes |
|---|---|---|---|---|
| 1 | 3 | 2 | 2 + 1 | Type sort, string pipeline, collection choices; Type Trap, Dict Detective |
| 2 | 3 | 2 | 2 + 1 | Rule builder, loop lab, function forge; Off-by-One, Boolean Gauntlet |
| 3 | 3 | 2 | 2 + 1 | Array workbench, slice lab, vector lab; Reshape Rush, Mask Master (IQR redesign) |
| 4 | 4 | 2 | 2 + 1 | Spreadsheet, console, builder, Strategy Lab, puzzles A to C, audit debrief; Ghost Hunt, Pipeline Order |
| 5 | 3 | 2 | 2 + 1 | Summary desk (group-by, distribution strip incl. mode/std/IQR/skew/box plot), chart studio, pattern hunt + correlation/confounder; Misleading Chart, Outlier Hunt |
| 6 | 3 | 2 | 2 + 1 | Probability lab (events, conditional probability, binomial), sampling lab (SE, bias, CI), verdict (permutation test, fishing trip, Bonferroni); Distribution Detective, Coverage Casino |
| 7 | 3 | 2 | 2 + 1 | Line fit lab, model workshop (leak detection), overfit trap + sealed hold-out forecast; Outlier Influence, Residual Reading |

## Decisions

- **Level 06 scope follows the course owner, not the kit.** The kit's Stage 2 "Correlation Court" was replaced by a PROBABILITY LAB (events and sample spaces, conditional probability and independence, binomial distribution). Correlation and the confounder check moved into Level 05 Stage 3. `stratifiedCorr`, `orderingScore` and `anscombeLike` were not built.
- **Mask Master (Level 03):**
  - 36-reading grid; median-of-halves quartiles give Q1 23.5, Q3 28.5, IQR 5, fences 16 / 36.
  - Strict detection rule.
  - Completion needs one false-positive and one false-negative experiment, then precision and recall of at least 80%.
- **Attempts** count started missions only, through `startMission`. Levels 1 to 3 call it on BEGIN MISSION, Level 04 on tier confirmation, and Levels 5 to 7 on BEGIN, which also creates the session record. Restore, CONTINUE, REPLAY and F5 never change it. The store test that expected `completeMission` to increment attempts now calls `startMission`.
- **Cohort generator.**
  - Correlation targets are guaranteed by sample-level orthogonalisation.
  - Dropout is assigned by quota inside 5-point attendance cells.
  - The logit uses step terms at 60 and 75.
  - Tunables live in `cohortConfig.ts`, not `engine/config.ts`, which belongs to Level 04.
  - Every invariant is tested over all 50 seed slots of Levels 5, 6 and 7.
- **Level 04 engine.**
  - `DF.floatCols` remembers float64 columns, as pandas does.
  - `filter_range` supports exclusive bounds and `==` / `!=` so every console form round-trips.
  - `toJSON` also keeps decision ids so undone bad decisions survive a reload.
  - Department variants carry surrounding whitespace (`' cs  '`).
  - An inconsistent issue counts as resolved when its row is removed.
- **Level 04 game.**
  - Pipeline Order passes only with integrity ≥ 85, no failed step and liveHealth total 0. Without this, the dedupe-first order scored 90.9 and passed, contradicting the kit's VERIFY list.
  - Ghost Hunt and Pipeline Order run on the independent tier dataset (seed 1001). Ghost Hunt passes at F1 ≥ 0.75.
  - Stage 3 can be skipped after 10 history entries, so a player who cleaned everything before using the Builder is never soft-locked.
  - COMPARE TWO (stretch) was not built. Puzzle C and CSV export were.
- **Level 05.**
  - The brush lives on the scatter; the bar chart highlights the covered bins.
  - The hidden "Dropout Cliff" fires for the natural 35 to 60 selection on every seed, because `steepestFall` is always 60. It is therefore easy to find.
- **Level 07.**
  - The overfit training grid spans [-0.75, 0.75] with noise 0.1, while validation spans [-1, 1]. This guarantees the U-shaped validation curve.
  - The final model's optional polynomial is a squared term.
  - The first hold-out submission is scored; later submissions set `peeked`, which is persisted.
- **Production builds** contain no dev tools: `isDevEnabled()` is `import.meta.env.DEV`, and the dev panel and dev pages are lazy-imported only in dev. The bundle is split into vendor, engine and per-level chunks (largest about 196 kB).
- **Accent theme.** The Tailwind `cyan` token is `rgb(var(--nx-cyan-rgb) / <alpha-value>)`, so Tool Bay themes recolour every accent.
- **Test runner.** Vitest `testTimeout` is 20 s for long UI flows. `src/test/setup.ts` installs an in-memory Storage only when Node 25+'s experimental global localStorage shadows jsdom's.

## Known issues and limits

- The console understands a documented pandas subset, and mini-NumPy is limited to 1D/2D slicing.
- Mission logs and console scrollback are not persisted; side ops restart after a refresh.
- Levels 5 to 7 cycle 50 seeds per level.
- Statistics use normal-approximation intervals without a finite-population correction (stated in the UI).
- Below 768 px a "larger screen" notice is shown.

## Placeholders

None remain in the player-facing game. `LICENSE` contains `YOUR NAME` for the owner to replace.

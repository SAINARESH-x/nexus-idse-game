# PROGRESS

## Current state

**Phase 4 implementation complete; manual browser acceptance pending.** The game now has a reusable mission shell, a challenge framework, two generic mechanics, a full campaign core and **Levels 01–03 playable end to end**: briefing tabs, three main stages, two side operations, three bonuses, scoring, debrief, XP/credits and fragment recovery. Level 02 (LOGIC PROTOCOL) and Level 03 (MATRIX CORE) use real definitions, real engines and real challenge components. Levels 04–07 keep honest workspaces until their phases. Level 04 remains the first deep implementation (Phases 5–8). **Phase 5 is the next phase.**

`npm run verify` is green: typecheck passes, 160 tests pass in 24 files, and the production build succeeds. Manual browser verification of the Level 02/03 flows is still required (see the Phase 4 VERIFY list below).

### How to run

```bash
npm install          # first time only
npm run dev          # http://localhost:5173/
npm run verify       # typecheck + tests + production build
```

Routes:

- Title: `#/`
- New game / callsign: `#/new`
- Campaign hub: `#/hub`
- Briefing: `#/level/:id` (`1` to `7`)
- Mission workspace: `#/level/:id/play`
- Debrief: `#/level/:id/debrief`
- Style guide (dev): `#/dev/ui`
- Unknown route: themed 404

Production base path: `VITE_BASE=/nexus-idse-game/ npm run build`.

## What exists

### Game core

- `src/game/types.ts` — the campaign type set from AGENTS section 5 (`LevelId`, `Tier`, `Rating`, `Decision`, `ChallengeResult`, `StageDef`, `SideOpDef`, `BonusDef`, `LevelDefinition`, `LevelProgress`, `PlayerProfile`, `AdaptiveEntry`, `SaveData`) plus `MissionAggregate` and the opaque `MissionSession`.
- `src/game/config.ts` — save keys, `MAIN_XP`, tier multipliers, rank table, rating thresholds, composite weights, hint floor, bonus/side-op XP constants, callsign limits and `DEV_DEMO_AGGREGATE`.
- `src/game/progression.ts` — pure functions: `aggregate`, `hintFactor`, `compositeScore`, `ratingForScore`, `rankForXp`, `nextRank`, `xpToNextRank`, `rankProgress`, `xpForMain`, `xpForSideOp`, `creditsForXp`, `isValidCallsign`, `applyAward`, `createLevelProgress`, `createInitialLevels`, `applyUnlockChain`.
- `src/game/save.ts` — guarded localStorage (`safeStorage`), export envelope (`{version, data}`), schema validation (`isSaveData`), `parseSave`, `serializeSave`, `clearNexusStorage`.
- `src/game/store.ts` — zustand + persist store (`nexus-save-v1`, version 1) with all campaign actions.
- `src/game/levels/registry.ts` — seven `LevelDefinition` entries. Levels 01–03 are the real data-driven definitions from `src/levels/l01`, `l02` and `l03`; Levels 04–07 still carry placeholder stages, side ops and bonus evaluators, with real titles, syllabus lines, missions, briefings, objectives, exact counts and F1–F7 fragment text. Also `LEVEL_BY_ID`, `levelDefinition`, `visibleBonuses`, `parseLevelId`, `FRAGMENT_TEXT`.

### Mission shell

- `src/shell/MissionShell.tsx` — header (level/mission, stage stepper, XP preview), objectives panel, workspace slot, collapsible Mission Log, HINT footer with progressive reveal and `Hints used: n`, and ABORT behind a confirmation modal that awards nothing. Also carries the DEV_ONLY completion button for verification.
- `src/shell/useMissionFlow.ts` — ordered stage completion, per-stage hint accounting, mission-wide run store, aggregation, bonus evaluation before the main award, XP/credit completion and debrief navigation. Stage N+1 only opens after stage N reports a result.
- `src/shell/missionOutcome.ts` — pure `aggregate`, composite, rating and `MissionSession` builder.
- `src/shell/missionSession.ts` — transient zustand store: one active run plus the latest `MissionRunSummary`. Not persisted.
- `src/shell/useObjectives.ts` — objective completion derived from stage results.
- `src/shell/MissionUi.tsx` — shared shell atoms.
- `src/shell/DebriefScreen.tsx` — animated rating letter, score breakdown bars, decision list, XP/credit count-up, rank-up modal, fragment typewriter, bonus awards, SIDE OPERATIONS / REPLAY / NEXT LEVEL / HUB exits. Count-up and typewriter collapse to final text under test or `prefers-reduced-motion`.

### Generic mechanics

- `src/components/mechanics/DragSort.tsx` — native HTML5 drag and drop with a click-to-select fallback, keyboard reachable, per-item correct/wrong feedback and a visible completion report.
- `src/components/mechanics/dragSortLogic.ts` — pure placement validation and mistake accounting.
- `src/components/mechanics/ChoiceSimulator.tsx` — scenario choices that run consequences, explain every decision afterwards and report a `ChallengeResult`.

### Level 01 (THE INTERFACE / FIRST CONTACT)

- `src/levels/l01/definition.ts` — `LEVEL_1`: three stages, two side ops, visible CLEAN SWEEP and NO ASSISTANCE bonuses plus hidden EASTER EGG.
- `src/levels/l01/content.ts` — stage/side-op copy, three hints each, objectives, six transmission lines (`NEXUS_ZERO` is the hidden line) and goal targets.
- `src/levels/l01/challenges.tsx` — maps stage and side-op ids to challenge components.
- `src/levels/l01/DragSortChallenge.tsx` + `typeSort.ts` — 12 intake values sorted into int / float / str / bool / None / list / dict.
- `src/levels/l01/StringLabChallenge.tsx` + `stringOps.ts` — six-line string lab with chainable chips, live preview, per-goal targets, shown Python expression and a pure interpreter (`strip`, `lower`, `upper`, `split`, `replace`, indexing).
- `src/levels/l01/ChoiceChallenge.tsx` + `choices.ts` — five collection-choice scenarios with consequences and explanations.
- `src/levels/l01/TypeTrapChallenge.tsx` + `typeTrap.ts` — six Python expressions with multiple-choice outputs and explanations.
- `src/levels/l01/DictDetectiveChallenge.tsx` + `dictData.ts` + `dictAccess.ts` — eight nested student records, JSON tree view and four access-chain tasks.
- `src/levels/l01/bonuses.ts` — pure evaluators for clean sweep (`facts.cleanSweep`), no hints (`session.hintsUsed === 0`) and the easter egg (`facts.easterEgg`).

### Level 02 (LOGIC PROTOCOL / GATEKEEPER)

- `src/levels/l02/definition.ts` — `LEVEL_2`: three stages, two side ops, visible ELEGANT RULES and ZERO RETRIES bonuses plus hidden DEAD CODE.
- `src/levels/l02/content.ts` — 12 rule packets, expected behaviour table, three loop goals, function blocks and hidden tests, boolean puzzles, range target, copy and three hints per challenge.
- `src/levels/l02/engine.ts` — pure rule-stack evaluation, mismatch explanations, loop tracing, generated Python, semantic function-block execution, `range()` simulation and boolean evaluators.
- `src/levels/l02/RuleBuilderChallenge.tsx` — visual condition/action rule stack with up/down ordering, AND/OR joins, live generated Python, animated packet results, target table and hidden dead-code archive.
- `src/levels/l02/LoopLabChallenge.tsx` — configurable loop filter, accumulator, break and continue, step trace and three target goals.
- `src/levels/l02/FunctionForgeChallenge.tsx` — two functions assembled from ordered semantic blocks, hidden-test results, checksum/source feedback and a 20-packet reuse loop.
- `src/levels/l02/OffByOneChallenge.tsx` — range repair side op with trace comparison.
- `src/levels/l02/BooleanGauntletChallenge.tsx` — three truth-table circuits using a shared boolean evaluator.
- `src/levels/l02/bonuses.ts` — pure evaluators for ELEGANT RULES (`extra.elegant`), ZERO RETRIES (`extra.zeroRetries`) and hidden DEAD CODE (`extra.deadCodeSpotted`).

### Level 03 (MATRIX CORE / SIGNAL GRID)

- `src/levels/l03/definition.ts` — `LEVEL_3`: three stages, two side ops, visible ONE-LINER and NO HINTS bonuses plus hidden PATTERN.
- `src/levels/l03/nd.ts` — immutable mini-NumPy for 1D/2D slicing, negative indices, stepped slices, boolean masks, axis reductions, broadcasting and arbitrary-shape reshape. Construction and reshape accept higher dimensions; slicing, reductions and broadcasting are intentionally limited to 1D/2D and the UI says so.
- `src/levels/l03/content.ts` — 6×6 sensor grid, anatomy arrays, build targets, five slice/mask goals, reshape targets, anomaly bounds and three hints per challenge. Column 4 drifts by +0.4 per row and has the largest column mean.
- `src/levels/l03/ArrayGrid.tsx` — shared clickable/read-only grid with cell tones and formatted values.
- `src/levels/l03/ArrayWorkbenchChallenge.tsx` — shape/ndim/dtype questions and three array-construction targets.
- `src/levels/l03/SliceLabChallenge.tsx` — clickable grid synced with typed Python slices and boolean masks; typed masks sync the threshold slider. All five goals require the correct selection, and the mask goal requires the mask to be applied.
- `src/levels/l03/vectorLabLogic.ts` + `VectorLabChallenge.tsx` — column-mean normalisation, operation chips, drift detection, Python-loop comparison and operation counting. Completion records the one-liner method and hidden pattern flag.
- `src/levels/l03/ReshapeRushChallenge.tsx` — one set of twelve values reshaped into 1D, 2D and 2×2×3 targets, including a 3D layers input.
- `src/levels/l03/maskLogic.ts` + `MaskMasterChallenge.tsx` — two-threshold anomaly isolation with precision/recall feedback and perfect-mask detection.
- `src/levels/l03/bonuses.ts` — pure evaluators for ONE-LINER, NO HINTS and hidden PATTERN.

### UI

- `src/pages/Title.tsx` — save-aware CONTINUE, NEW GAME confirmation modal when a save exists.
- `src/pages/NewGame.tsx` — valid 3–16 character callsign form; creates the save and routes to the hub.
- `src/pages/Hub.tsx` — campaign panel with all seven level cards; no-save fallback panel.
- `src/components/hub/HubTopBar.tsx` — callsign, rank, XP-to-next-rank bar and credits.
- `src/components/hub/LevelCard.tsx` — LOCKED / AVAILABLE / COMPLETED states, rating badge, stage/side-op/bonus counts, locked-card shake + toast.
- `src/components/hub/HubSidebar.tsx` — recruit summary, ENCRYPTED fragment archive, disabled Achievements and Tool Bay placeholders.
- `src/pages/level/LevelGate.tsx` — nested route gate; locked level or no save redirects to the hub with a toast.
- `src/pages/level/Briefing.tsx` — BRIEFING | SIDE OPS | BONUS tabs (URL `?tab=`), story, objectives, stage cards, bonus listing (hidden bonuses read `???` until earned) and side-op launch. Side ops for Levels 01–03 are playable; later levels are visibly disabled with a `Later phase` badge.
- `src/pages/level/Play.tsx` — Levels 01–03 run the real `MissionShell` for the main mission and both side ops; `?side=<id>` selects a side op. Levels 04–07 keep an honest placeholder plus the DEV_ONLY completion button.
- `src/pages/level/Debrief.tsx` — thin route wrapper that reads the transient run summary and passes it to `DebriefScreen`; side-op debriefs are selected with `?side=<id>`.
- `src/app/DevPanel.tsx` — floating bottom-left panel (DEV or `nexus-dev=1`) with unlock all, +500 XP, complete current level, reset and hide.
- `src/app/dev.ts` — shared `isDevEnabled()` switch.
- `src/app/App.tsx` — HashRouter routes for title, new game, hub, nested level routes, dev style guide and 404, plus the dev panel.

### Tests

- `src/game/__tests__/progression.test.ts` — 17 tests: rank boundaries, next rank, rating thresholds, composite weights and hint floor, aggregation, XP/credit formulas, replay improvements, once-only side ops/bonuses, rank-up, initial locks, unlock chain and callsign validation.
- `src/game/__tests__/store.test.ts` — 13 tests: new game, invalid callsign, Level 1 completion and unlock, Level 2/3 completion, F2/F3 recovery, replay payout, side ops/bonuses, stages, dev XP/unlock, export/import round trip, invalid imports, reset keys and rehydration.
- `src/game/levels/__tests__/registry.test.ts` — 3 tests: seven levels, exact stage/side-op/bonus counts, Level 04 stage names, route id parsing.
- `src/app/__tests__/campaignFlow.test.tsx` — 5 tests: full new-game-to-level-2 flow, replay 0 XP, dev panel shortcuts, locked-route redirect, CONTINUE with a save.
- `src/pages/__tests__/Title.test.tsx` — 2 tests: initial disabled CONTINUE, replacement confirmation modal.
- `src/ui/__tests__/Panel.test.tsx` — 1 test.
- `src/shell/__tests__/missionOutcome.test.ts` — 4 tests: aggregation means/sums, composite weights, rating thresholds, session facts.
- `src/components/mechanics/__tests__/dragSortLogic.test.ts` — 6 tests: accepted placement, wrong bucket, duplicate placement, completion, mistake counting and empty buckets.
- `src/levels/l01/__tests__/stringOps.test.ts` — 14 tests: every pipeline operation, chaining, index errors, numeric parsing and the six transmission targets.
- `src/levels/l01/__tests__/dictAccess.test.ts` — 5 tests: valid chains, list indexing, missing keys, fallback `.get()` and malformed expressions.
- `src/levels/l01/__tests__/typeTrap.test.ts` — 3 tests: all six answers, correct scoring and explanations.
- `src/levels/l01/__tests__/bonuses.test.ts` — 3 tests: clean sweep, no-assistance and easter-egg evaluators.
- `src/levels/l01/__tests__/level01Flow.test.tsx` — 1 integration test: briefing → hints → stage 1 sort → stage 2 unlock.
- `src/levels/l02/__tests__/engine.test.ts` — 18 tests: reference rule table, starter-stack failures, AND/OR joins, mismatch explanations, loop goals, function-block solutions and failures, range repair and boolean truth tables.
- `src/levels/l02/__tests__/bonuses.test.ts` — 4 tests: ELEGANT RULES, ZERO RETRIES, hidden DEAD CODE and definition wiring.
- `src/levels/l02/__tests__/wiring.test.ts` — 8 tests: real Level 02/03 registry definitions, bonus wiring, side-op objectives and challenge-id resolution.
- `src/levels/l02/__tests__/ruleBuilder.test.tsx` — 1 widget test: running the starter stack and clearing stale outcomes after an edit.
- `src/levels/l03/__tests__/nd.test.ts` — 25 tests: construction, dtype, slicing (including negative/stepped indices), reshape, masks, axis reductions, broadcasting and selection formatting.
- `src/levels/l03/__tests__/vectorLabLogic.test.ts` — 12 tests: normalisation, broadcasting, drift detection, one-liner, operation counts and additional vector operation chips.
- `src/levels/l03/__tests__/maskLogic.test.ts` — 5 tests: perfect mask, precision/recall penalties and missed anomalies.
- `src/levels/l03/__tests__/bonuses.test.ts` — 4 tests: ONE-LINER, NO HINTS, hidden PATTERN and definition wiring.
- `src/levels/l03/__tests__/sliceLabFlow.test.tsx` — 1 completion test: all five slice goals, including applying the threshold-30 mask.
- `src/levels/l03/__tests__/vectorLabFlow.test.tsx` — 1 completion test: one-liner method and hidden pattern captured in the result.
- `src/pages/level/__tests__/level23Play.test.tsx` — 4 tests: Level 02 RuleBuilder and Off-by-One routes, Level 03 Array Workbench and 3D Reshape Rush route.

**Total: 160 tests in 24 files.** `npm run verify` (typecheck → test → production build) passes. Manual browser verification of the Level 02/03 flows remains pending.

## Store public API

```ts
const store = useGameStore.getState()

store.newGame('Vega-7')                 // fresh save, Level 1 open
store.resetAll()                        // default state + removes every nexus-* key
store.completeStage(1, 'l1-stage-1')    // writes stats['stage:l1-stage-1'] = true
store.completeSideOp(1, 'l1-side-1', 2) // AwardSummary; pays once
store.completeBonus(1, 'l1-bonus-1')    // AwardSummary; pays once (visible 40 / hidden 60)
store.completeMission(1, aggregate)     // AwardSummary; replay pays improvement only
store.completeMission(4, aggregate, 'expert') // optional tier for Level 04 XP multiplier
store.addXp(500)                        // DEV_ONLY
store.unlockAll()                       // DEV_ONLY
store.exportSave()                      // JSON string envelope
store.importSave(json)                  // { ok: true } | { ok: false, error }
```

State shape: `SaveData` (`profile`, `levels`, `achievements`, `fragments`, `adaptive`, `campaignComplete`, `owned`) plus transient `lastAward`. `lastAward` is never persisted.

`AwardSummary`:

```ts
{
  levelId?: LevelId
  xpGained: number
  creditsGained: number
  composite?: number
  rating?: Rating
  firstCompletion?: boolean
  rankUp?: { from: RankName; to: RankName }
}
```

## Decisions

- **MissionSession is concrete and shared.** `BonusDef.evaluate` receives `{ levelId, kind, results, hintsUsed, mistakes, decisions, facts }`. Challenge-specific facts live in `facts` (for example `cleanSweep`, `easterEgg`, `elegant`, `deadCodeSpotted`, `oneLiner`, `patternNoticed`) so evaluators stay pure and unit-testable instead of peeking at component state. Levels 04–07 keep placeholder evaluators that return `false`.
- **Stage results are the unit of progress.** `useMissionFlow` records one `ChallengeResult` per stage, replacing a prior result for the same id. Stage N+1 only opens after stage N reports a result. Stage completion is in-memory only; the campaign save marks the whole mission complete at the end through `completeMission`.
- **Bonuses are evaluated before the main award.** This keeps `lastAward` as the mission award shown by the debrief, while bonus XP is paid through `completeBonus` and surfaced separately in `MissionRunSummary.bonuses`.
- **Hints are counted in two places.** The shell owns per-stage revealed counts, and the transient mission run owns the canonical mission-wide `hintsUsed` used by scoring and bonuses. A hint already revealed cannot be counted twice.
- **Mission runs are transient.** `useMissionSessionStore` holds the active run and the latest debrief summary in memory. Campaign progress is persisted by the main store; the run is not, so a mid-mission reload restarts the workspace.
- **Debrief animation is test/reduced-motion safe.** Count-up and typewriter render their final text under `import.meta.env.MODE === 'test'` or `prefers-reduced-motion`, which keeps assertions deterministic and honours accessibility.
- **Side ops reuse the shell.** A Level 01–03 side op is adapted into a one-stage `StageDef` at the route layer, so mission flow, hints, abort and debrief are identical to a main mission.
- **Level 01 data is separated from components.** Stage copy, transmission targets, type-trap answers and dict tasks live in pure modules with tests; components only render and dispatch.
- **Level 02 rules use explicit precedence.** The reference stack checks checksum failure first, then empty/size-invalid packets, then large unknown packets, then high priority; the default action is QUARANTINE. The starter stack is deliberately wrong so ordering and the missing `AND source == 'unknown'` condition have to be discovered.
- **Level 02 function blocks are semantic, not arbitrary code.** `FunctionForge` interprets known block ids through a hand-written switch, keeps hidden tests calling `<name>(packet)`, and never executes user text.
- **Level 02 loop goals are exact.** Valid size sum is 131, count-before-first-corrupt is 3, and the append goal excludes empty sizes while retaining corrupted non-empty sizes.
- **Level 03 uses a 6×6 sensor grid.** Column 4 drifts by +0.4 per row and has the largest column mean. Slice goals cover a row, a column, a rectangular block, every other column and a threshold mask.
- **Level 03 mini-NumPy is deliberately scoped.** Construction and reshape support higher dimensions, while slicing, reductions and broadcasting are limited to 1D/2D; the UI states this simplification rather than pretending to be full NumPy.
- **Level 03 operation counts make vectorisation visible.** One vector operation is compared with `cells + cols` loop operations, so the benefit is concrete without inflating the score.
- **Hidden Level 02/03 bonuses are earned before stage completion.** DEAD CODE is flagged in the archive before the stack succeeds; PATTERN is flagged in the Mission Log before the vector stage completes.
- **Stage progress lives in `LevelProgress.stats`.** Keys are `stage:<id>` with boolean values, which keeps the AGENTS type shape intact and makes hub counts derivable.
- **Stage completion marks.** `completeMission` marks every stage of that level complete and increments `attempts`; `completeStage` remains available for real mechanics.
- **Adaptive history uses `assisted` for now.** The store records composite/hints/mistakes per completion. Tier selection lands with adaptive difficulty; `completeMission` accepts an optional tier so Level 04 can pass it later.
- **Hub bonus counts.** The denominator counts visible bonuses only; the numerator counts every earned bonus, so a hidden bonus can show `Bonus 1/2` as required.
- **Route guard target.** A locked level or a missing save both redirect to `/hub` with a toast. `/hub` itself shows a no-save panel with a NEW GAME action, preventing redirect loops.
- **Save validation.** Import accepts either the export envelope or a raw `SaveData` object, rejects unsupported versions and malformed schemas, and re-applies the unlock chain after import/rehydration.
- **Reset semantics.** `resetAll` writes defaults, then removes every `nexus-*` key (save and future session keys) inside try/catch. The in-memory state stays usable.
- **Fragment archive.** Fragment text is exported as `FRAGMENT_TEXT` because `LevelDefinition` only carries `fragmentId`.
- **Ranks return objects.** `rankForXp` returns `{ name, minXp }`; the UI reads `.name`, and boundary tests assert names.
- **Callsigns.** Trimmed, 3–16 characters, must start alphanumeric; letters, numbers, spaces, hyphens and underscores are allowed.
- **Dev panel.** Gated by `import.meta.env.DEV` or localStorage `nexus-dev === '1'`. `Play` completion is marked `DEV_ONLY`. `/dev/ui` still needs Phase 13 gating.

## Placeholders still open

- Mission workspaces for Levels 05, 06 and 07 are explicitly labelled placeholders; only the DEV completion button acts. Levels 01–03 are fully playable.
- Side ops outside Levels 01–03 show an honest `NOT AVAILABLE / Later phase` panel; Levels 01–03 side ops are playable.
- Level 04 engine, pandas-like session, tabs and real stage flow (Phases 5–8). **Phase 5 is next.**
- Bonus evaluators for Levels 04–07 return `false` until each level defines its real conditions.
- Achievements and Tool Bay panels are visibly disabled placeholders (later phases).
- Settings remains disabled on the title screen.
- Adaptive tier selection (Phase 10) and real tier multipliers in the UI; Levels 01–03 currently run at `assisted`.
- `/dev/ui` is not yet gated by `import.meta.env.DEV` (Phase 13).

## Known issues

- Dev-only routes are still reachable in production; Phase 13 must gate/remove them.
- Debrief data is transient: reloading `/level/:id/debrief` shows the “no award summary” message even though progress and XP persist.
- Reloading mid-mission restarts the run because the active mission session is intentionally not persisted.
- Side ops pay once; there is no per-op best-score tracking yet.
- Manual browser verification of the Level 02/03 stages, side ops, bonuses, debrief and replay is still pending.
- Level 02/03 reference solutions have unit tests, and SliceLab/VectorLab have completion tests, but there is no full automated mission playthrough covering every UI stage and side op.
- Level 01 has no typed-command entry yet; command input is scheduled with the progressive coding phases.
- No README yet (final deliverable phase).
- Bundle includes Fontsource subsets for several scripts; acceptable, can be pruned later if size matters.

## Manual checks

Phase 2 VERIFY list (regression):

1. `npm run verify` passes; tests grew from 2 to 40.
2. `npm run dev`; with a fresh browser save, CONTINUE is disabled. NEW GAME → callsign `Test` → hub shows Trainee, XP `0 / 250`, credits 0.
3. Level 1 is AVAILABLE; Levels 2–7 are LOCKED. Click Level 2 → card shakes and a warning toast appears.
4. Level 1 → BEGIN MISSION → dev “Complete mission (dev)” → debrief shows `+120 XP` / `+60 credits`. Return to hub: Level 1 COMPLETED, Level 2 AVAILABLE, Level 3 LOCKED.
5. Press F5: callsign, XP and completion persist. Title CONTINUE is enabled.
6. Dev panel: Add 500 XP → rank Junior Analyst (620 XP). Unlock all levels → all seven AVAILABLE. Reset save → title with CONTINUE disabled.
7. Open `http://localhost:5173/#/level/5/play` with a save that has not reached Level 5 → redirected to hub with a warning toast.
8. Complete Level 1 again → debrief XP is `+0` with the replay explanation.

Phase 3 VERIFY list:

1. `npm run verify` passes; tests grew from 40 to 76 in 13 files.
2. Open Level 01 briefing. The tabs BRIEFING | SIDE OPS | BONUS switch with the URL; hidden EASTER EGG shows `???`.
3. BEGIN MISSION. Stage 1 lists twelve values. Drag or click-to-select sends values to int / float / str / bool / None / list / dict. Wrong drops are marked, counted and explained; the stage only completes when every value is placed.
4. Reveal hints one at a time in the footer. `Hints used` increments, the third hint disables the HINT button, and the Mission Log records stage transitions.
5. Complete stages 2 and 3: the string pipeline must hit all three targets per line, the collection scenarios explain their consequences, and each stage clears before NEXT STAGE opens. Stage N+1 is unreachable early.
6. Finish the mission. Debrief shows rating, breakdown bars, decisions, XP/credits count-up, bonus awards and the F1 fragment typewriter. SIDE OPS, REPLAY and NEXT LEVEL / HUB work as labelled.
7. Return to the briefing SIDE OPS tab. Play TYPE TRAP (six expressions) and DICT DETECTIVE (four access chains). Each runs in the same shell with hints and its own debrief.
8. Earn CLEAN SWEEP by finishing intake sorting with no wrong drops, and NO ASSISTANCE by never revealing a hint. Earn the hidden EASTER EGG by decoding the `NEXUS_ZERO` line in stage 2. Each pays once.
9. Start a mission, use ABORT and confirm. No XP is paid and the briefing returns; cancelling the modal stays in the mission.
10. Levels 04–07 still show honest placeholder workspaces; unlock all in the dev panel to check them. No fake controls appear.

Phase 4 VERIFY list (manual browser acceptance still pending):

1. `npm run verify` passes: typecheck, 160 tests in 24 files, production build.
2. Create a fresh save, complete Level 1, and confirm Level 2 opens.
3. Open the Level 02 briefing. BRIEFING | SIDE OPS | BONUS switch with the URL; hidden DEAD CODE shows `???`.
4. Play BRANCH LOGIC. Reorder rules with the up/down controls, add the `AND source == 'unknown'` condition, run the 12 packets, confirm wrong-order feedback and complete only when all 12 match.
5. Play LOOP ENGINE and hit all three goals: sum 131, count 3 before the first corrupt packet, and the non-empty append target.
6. Play FUNCTION FORGE. Assemble `is_valid` and `risk_score`, confirm failing hidden tests show input details, then run the 20-packet reuse loop.
7. Play both Level 02 side ops: OFF-BY-ONE and BOOLEAN GAUNTLET.
8. Earn or verify ELEGANT RULES, ZERO RETRIES and hidden DEAD CODE. Each pays once.
9. Finish Level 02 and confirm debrief decisions, rating, XP/credits, F2, bonus awards and transition to Level 3.
10. Replay Level 02 and confirm no XP is paid without improvement.
11. Open the Level 03 briefing and play GRID ANATOMY: answer all four anatomy questions and build all three target arrays.
12. Play SLICE THE SIGNAL: complete the row, column, block, stepped-column and threshold-30 mask goals. Confirm the mask must be applied and typed masks sync the threshold.
13. Play VECTOR POWER: normalise the grid, inspect the operation chips, find column 4, compare with the Python loop, use the one-liner and flag the +0.4 pattern.
14. Play both Level 03 side ops: RESHAPE RUSH (1D, 2D and 2×2×3) and MASK MASTER (exact four-cell isolation with precision/recall feedback).
15. Earn or verify ONE-LINER, NO HINTS and hidden PATTERN. Each pays once.
16. Finish Level 03 and confirm debrief decisions, rating, XP/credits, F3, bonus awards and Level 4 unlock.
17. Replay Level 03 and confirm no XP is paid without improvement.
18. Reload after completion and confirm the save, XP, unlocked levels and fragments persist.
19. Confirm locked Level 3/4 routes redirect to the hub with a toast.
20. Re-run the Level 01 regression flow from the Phase 3 list.
21. Check keyboard focus, modal Esc, `aria-live` feedback, reduced motion, and the responsive layout at 1024 px, 768 px and below.

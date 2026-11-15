# PROGRESS

## Current state

**Phase 3 complete.** The game now has a reusable mission shell, a challenge framework, two generic mechanics, a full campaign core and **Level 01 is playable end to end**: briefing tabs, three main stages, two side operations, three bonuses, scoring, debrief, XP/credits and fragment recovery. Levels 02–07 keep honest workspaces until their phases. Level 04 remains the first deep implementation (Phases 5–8). 76 tests pass; `npm run verify` is green.

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
- `src/game/levels/registry.ts` — seven `LevelDefinition` entries. Level 01 is the real data-driven definition from `src/levels/l01/definition.ts`; Levels 02–07 still carry placeholder stages, side ops and bonus evaluators, with real titles, syllabus lines, missions, briefings, objectives, exact counts and F1–F7 fragment text. Also `LEVEL_BY_ID`, `levelDefinition`, `visibleBonuses`, `parseLevelId`, `FRAGMENT_TEXT`.

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

### UI

- `src/pages/Title.tsx` — save-aware CONTINUE, NEW GAME confirmation modal when a save exists.
- `src/pages/NewGame.tsx` — valid 3–16 character callsign form; creates the save and routes to the hub.
- `src/pages/Hub.tsx` — campaign panel with all seven level cards; no-save fallback panel.
- `src/components/hub/HubTopBar.tsx` — callsign, rank, XP-to-next-rank bar and credits.
- `src/components/hub/LevelCard.tsx` — LOCKED / AVAILABLE / COMPLETED states, rating badge, stage/side-op/bonus counts, locked-card shake + toast.
- `src/components/hub/HubSidebar.tsx` — recruit summary, ENCRYPTED fragment archive, disabled Achievements and Tool Bay placeholders.
- `src/pages/level/LevelGate.tsx` — nested route gate; locked level or no save redirects to the hub with a toast.
- `src/pages/level/Briefing.tsx` — BRIEFING | SIDE OPS | BONUS tabs (URL `?tab=`), story, objectives, stage cards, bonus listing (hidden bonuses read `???` until earned) and side-op launch. Side ops outside Level 01 are visibly disabled with a `Later phase` badge.
- `src/pages/level/Play.tsx` — Level 01 runs the real `MissionShell` for the main mission and both side ops; `?side=<id>` selects a side op. Levels 02–07 keep an honest placeholder plus the DEV_ONLY completion button.
- `src/pages/level/Debrief.tsx` — thin route wrapper that reads the transient run summary and passes it to `DebriefScreen`; side-op debriefs are selected with `?side=<id>`.
- `src/app/DevPanel.tsx` — floating bottom-left panel (DEV or `nexus-dev=1`) with unlock all, +500 XP, complete current level, reset and hide.
- `src/app/dev.ts` — shared `isDevEnabled()` switch.
- `src/app/App.tsx` — HashRouter routes for title, new game, hub, nested level routes, dev style guide and 404, plus the dev panel.

### Tests

- `src/game/__tests__/progression.test.ts` — 17 tests: rank boundaries, next rank, rating thresholds, composite weights and hint floor, aggregation, XP/credit formulas, replay improvements, once-only side ops/bonuses, rank-up, initial locks, unlock chain and callsign validation.
- `src/game/__tests__/store.test.ts` — 12 tests: new game, invalid callsign, Level 1 completion and unlock, replay payout, side ops/bonuses, stages, dev XP/unlock, export/import round trip, invalid imports, reset keys and rehydration.
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

Total: 76 tests in 13 files.

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

- **MissionSession is concrete and shared.** `BonusDef.evaluate` receives `{ levelId, kind, results, hintsUsed, mistakes, decisions, facts }`. Challenge-specific facts live in `facts` (for example `cleanSweep`, `easterEgg`) so evaluators stay pure and unit-testable instead of peeking at component state. Levels 02–07 keep placeholder evaluators that return `false`.
- **Stage results are the unit of progress.** `useMissionFlow` records one `ChallengeResult` per stage, replacing a prior result for the same id. Stage N+1 only opens after stage N reports a result. Stage completion is in-memory only; the campaign save marks the whole mission complete at the end through `completeMission`.
- **Bonuses are evaluated before the main award.** This keeps `lastAward` as the mission award shown by the debrief, while bonus XP is paid through `completeBonus` and surfaced separately in `MissionRunSummary.bonuses`.
- **Hints are counted in two places.** The shell owns per-stage revealed counts, and the transient mission run owns the canonical mission-wide `hintsUsed` used by scoring and bonuses. A hint already revealed cannot be counted twice.
- **Mission runs are transient.** `useMissionSessionStore` holds the active run and the latest debrief summary in memory. Campaign progress is persisted by the main store; the run is not, so a mid-mission reload restarts the workspace.
- **Debrief animation is test/reduced-motion safe.** Count-up and typewriter render their final text under `import.meta.env.MODE === 'test'` or `prefers-reduced-motion`, which keeps assertions deterministic and honours accessibility.
- **Side ops reuse the shell.** A Level 01 side op is adapted into a one-stage `StageDef` at the route layer, so mission flow, hints, abort and debrief are identical to a main mission.
- **Level 01 data is separated from components.** Stage copy, transmission targets, type-trap answers and dict tasks live in pure modules with tests; components only render and dispatch.
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

- Mission workspaces for Levels 02, 03, 05, 06 and 07 are explicitly labelled placeholders; only the DEV completion button acts. Level 01 is fully playable.
- Level 01 side ops outside the level show an honest `NOT AVAILABLE / Later phase` panel; Level 01 side ops are playable.
- Level 04 engine, pandas-like session, tabs and real stage flow (Phases 5–8).
- Bonus evaluators for Levels 02–07 return `false` until each level defines its real conditions.
- Achievements and Tool Bay panels are visibly disabled placeholders (later phases).
- Settings remains disabled on the title screen.
- Adaptive tier selection (Phase 10) and real tier multipliers in the UI; Level 01 currently runs at `assisted`.
- `/dev/ui` is not yet gated by `import.meta.env.DEV` (Phase 13).

## Known issues

- Dev-only routes are still reachable in production; Phase 13 must gate/remove them.
- Debrief data is transient: reloading `/level/:id/debrief` shows the “no award summary” message even though progress and XP persist.
- Reloading mid-mission restarts the run because the active mission session is intentionally not persisted.
- Side ops pay once; there is no per-op best-score tracking yet.
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
10. Level 02 still shows an honest placeholder workspace; unlock all in the dev panel to check it. No fake controls appear.

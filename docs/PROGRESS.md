# PROGRESS

## Current state

**Phase 2 complete.** The game now has a typed campaign core, pure progression rules, a persisted zustand save, seven registered levels, a playable campaign hub, briefing/workspace/debrief routes, route guarding, a dev panel and 40 tests. Mission mechanics are still placeholders; Level 04 remains the first deep implementation.

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
- `src/game/levels/registry.ts` — seven `LevelDefinition` entries with real titles, syllabus lines, missions, briefings, objectives, stage/side-op/bonus placeholders, exact counts and F1–F7 fragment text. Also `LEVEL_BY_ID`, `levelDefinition`, `visibleBonuses`, `parseLevelId`, `FRAGMENT_TEXT`.

### UI

- `src/pages/Title.tsx` — save-aware CONTINUE, NEW GAME confirmation modal when a save exists.
- `src/pages/NewGame.tsx` — valid 3–16 character callsign form; creates the save and routes to the hub.
- `src/pages/Hub.tsx` — campaign panel with all seven level cards; no-save fallback panel.
- `src/components/hub/HubTopBar.tsx` — callsign, rank, XP-to-next-rank bar and credits.
- `src/components/hub/LevelCard.tsx` — LOCKED / AVAILABLE / COMPLETED states, rating badge, stage/side-op/bonus counts, locked-card shake + toast.
- `src/components/hub/HubSidebar.tsx` — recruit summary, ENCRYPTED fragment archive, disabled Achievements and Tool Bay placeholders.
- `src/pages/level/LevelGate.tsx` — nested route gate; locked level or no save redirects to the hub with a toast.
- `src/pages/level/Briefing.tsx` — story, objectives and BEGIN MISSION / BACK TO HUB.
- `src/pages/level/Play.tsx` — honest “Mission workspace” placeholder plus DEV-only completion button.
- `src/pages/level/Debrief.tsx` — XP, credits, composite/rating, fragment recovery and rank-up modal.
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

Total: 40 tests in 6 files.

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

- **MissionSession is opaque.** `BonusDef.evaluate` receives `object` until the Level 04 session exists; each level will narrow it. Placeholder bonus evaluators return `false` and are replaced by the phase that owns the level.
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

- Mission workspaces for Levels 01–03 and 05–07 are explicitly labelled placeholders; only the DEV completion button acts.
- Level 04 engine, pandas-like session, tabs and real stage flow (Phases 5–8).
- Bonus evaluators return `false` until each level defines its real conditions.
- Achievements and Tool Bay panels are visibly disabled placeholders (later phases).
- Settings remains disabled on the title screen.
- Adaptive tier selection (Phase 10) and real tier multipliers in the UI.
- `/dev/ui` is not yet gated by `import.meta.env.DEV` (Phase 13).

## Known issues

- Dev-only routes are still reachable in production; Phase 13 must gate/remove them.
- Debrief data is transient: reloading `/level/:id/debrief` shows the “no award summary” message even though progress and XP persist.
- Side ops pay once; there is no per-op best-score tracking yet.
- No README yet (final deliverable phase).
- Bundle includes Fontsource subsets for several scripts; acceptable, can be pruned later if size matters.

## Manual checks

Phase 2 VERIFY list:

1. `npm run verify` passes; tests grew from 2 to 40.
2. `npm run dev`; with a fresh browser save, CONTINUE is disabled. NEW GAME → callsign `Test` → hub shows Trainee, XP `0 / 250`, credits 0.
3. Level 1 is AVAILABLE; Levels 2–7 are LOCKED. Click Level 2 → card shakes and a warning toast appears.
4. Level 1 → BEGIN MISSION → dev “Complete mission (dev)” → debrief shows `+120 XP` / `+60 credits`. Return to hub: Level 1 COMPLETED, Level 2 AVAILABLE, Level 3 LOCKED.
5. Press F5: callsign, XP and completion persist. Title CONTINUE is enabled.
6. Dev panel: Add 500 XP → rank Junior Analyst (620 XP). Unlock all levels → all seven AVAILABLE. Reset save → title with CONTINUE disabled.
7. Open `http://localhost:5173/#/level/5/play` with a save that has not reached Level 5 → redirected to hub with a warning toast.
8. Complete Level 1 again → debrief XP is `+0` with the replay explanation.

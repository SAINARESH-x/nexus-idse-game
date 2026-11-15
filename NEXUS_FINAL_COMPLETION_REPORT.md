# NEXUS: Final Completion Report

## Summary

NEXUS is complete: all seven levels are playable, from the title screen through the campaign finale and summary.

The work started from the Phase-4 tree, which typechecked and passed its tests. On top of it I implemented Phases 5 to 13 and the optional Phase 12 items (sound, Tool Bay, polish, accessibility). Phase 14 (optional expansion) was not started.

No Git operations were performed: the working folder is not a Git repository.

**Final ZIP:** `/home/zapdos/NEXUS_FINAL_PROJECT.zip`, with a single root folder `NEXUS_FINAL_PROJECT/`.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0–4 | Done (pre-existing, preserved) | Levels 1–3; Mask Master IQR redesign |
| 5 | Done | Pure pandas-like engine, safe parser, replayable session, dev page `#/dev/engine` (dev builds only) |
| 6 | Done | Three-tier generator, liveHealth, judgeOp, assessQuality. Golden script: shape (44, 9), integrity 92.5, efficiency 88.9 |
| 7–8 | Done | Spreadsheet, highlights, history with undo/redo, console, builder, fill-the-blank, Stages 1–4 |
| 9 | Done | Strategy Lab, puzzles A–C, Ghost Hunt, Pipeline Order, bonuses, adaptive tiers, struggle assist, full audit debrief, persistence, CSV export. COMPARE TWO (stretch) not built |
| 10 | Done | Shared stats, cohort generator and SVG charts. Level 5 EDA; Level 6 probability and inference (scope adjusted, see below) |
| 11 | Done | Level 7 regression with sealed hold-out, finale story, campaign summary, campaign-complete state |
| 12 | Done (core + optional) | 20 achievements, Settings, sound, Tool Bay, save migration, recovery screen, storage fallback, error boundaries |
| 13 | Done | Dev tools excluded from production, audit tests, README, LICENSE template, bundle split |
| 14 | Not started | Optional |

**Scope decision.** The course owner's Level 6 topics (probability, events, conditional probability, distributions) replaced the kit's correlation stage, and correlation moved to Level 5. Recorded in `docs/PROGRESS.md`.

## Features completed

- **7 levels:** 22 stages, 14 side operations and 21 bonuses (7 hidden), each stage and side op with 3 progressive hints.
- **Level 4:** spreadsheet, console and builder all on one session; undo/redo; judged decisions with UNDO in the toast; adaptive difficulty; detailed debrief.
- **Levels 5–7:** resume after F5 with the same seed and inputs. A damaged session restarts cleanly and never changes attempts.
- **Determinism:** all data and simulations are seeded, and their guarantees are tested across every reachable seed.
- **Game-wide systems:**
  - achievements
  - settings (sound, volume, reduced motion, text size, theme)
  - export, import and reset
  - Tool Bay themes
  - synthesised sound
  - save recovery
  - in-memory storage fallback
- **Release hardening:** dev panel, dev routes and dev buttons render only in dev builds and are absent from `dist`. There is no `eval` and no external URL, and the largest JS chunk is about 196 kB.

## Test results

`npm run verify` (Node 26.10, npm 12.2):

- `tsc -b`: passed.
- Vitest: **60 test files, 531 tests, all passed, 0 failed.** The Phase-4 baseline was 198 tests in 26 files, so this run adds 333 tests.
- New suites cover:
  - engine ops, parser (including injection rejection), session, generator, judge and golden script
  - stats, cohort invariants over all 50 slots, chart scale and render
  - Levels 4–7 logic, guarantees and UI flows
  - mission sessions, adaptive tiers, achievements, Tool Bay, settings, migration, corruption, sound
  - registry integrity (EXPECTED_SHAPE)
  - release audit: every route on a fresh and an all-complete save, a headless campaign, golden undo/redo, save round trip

**Changes to existing tests (no assertion was weakened):**

| Test | Change | Reason |
|---|---|---|
| Store attempts | Now calls `startMission` before each completion | The kit makes `startMission` the only place attempts are counted |
| Interim "Levels 4–7 in development" | Replaced by "all levels playable" | Those levels are now implemented |
| Vitest timeout | Raised to 20 s | Long UI flows were timing out under load |
| Scratch probe file | Deleted | It contained no assertions |

## Production build

`vite build` succeeds. The largest chunks are vendor (196 kB), Level 4 (171 kB) and Level 3 (75 kB).

`VITE_BASE=/nexus-idse-game/ npm run build` also succeeds.

`grep` of `dist` for "Complete mission (dev)", "Complete all levels" and "DevPanel" returns nothing.

## Browser verification performed

Headless Chromium on the dev server, unless noted. The interim pass used the production preview.

**Campaign start and Level 4:**
- New game with a callsign, then dev unlock.
- Level 4 briefing, then the clearance screen: ASSISTED is RECOMMENDED. Confirming counts exactly 1 attempt.
- Stage 1: Shape, Dtypes and 3 flags. PROCEED appears, and **F5 restores the stage and the flags**.
- Stage 2: brush flags. The second submission passes with precision feedback.
- Stage 3 unlock intro, then the console:
  - `df = df.dropna()` showed the "lost 5 rows" decision toast, and its **UNDO** restored 47 rows.
  - The 9-command script gave 44 rows and 9 history entries.
- A Builder op (the 10th entry) revealed SKIP REMAINING with a confirm.
- Stage 4 checks, then SUBMIT FOR AUDIT. The debrief shows gauges, decisions, WHY IT MATTERS with computed numbers, ghost records and F4, plus a rank-up modal and achievement toasts.

**Levels 5–7 and the ending:**
- Levels 5, 6 and 7 begin and render stage 1 with no console errors.
- Complete all levels (dev), then `#/ending`: the story cards and SKIP lead to a campaign summary whose totals come from the registry (14 side ops, 7 hidden bonuses, 20 achievements).

**Earlier interim pass (production preview):** deep-link redirects and the full Mask Master flow.

**Not performed in a browser:**
- Playing every Level 5–7 stage to completion by hand (these are covered by RTL flow tests).
- Settings, Tool Bay, import/export and the recovery screen through the UI (covered by unit tests).
- Responsive checks at several widths.
- Real audio output.
- A screen reader.

## Manual checklist for the owner

1. `npm ci && npm run verify`, then `npm run build && npm run preview`. In the production preview, check that the title loads, there is no dev panel even with `nexus-dev=1`, and `#/dev/ui` shows Not Found.
2. New game. Play Level 1 Stages 1–2, press F5 and CONTINUE.
3. Level 4 on ASSISTED:
   - Strategy Lab: the table does not change until APPLY.
   - Play one field puzzle.
   - Run the 9-command script and SUBMIT FOR AUDIT. The debrief should show integrity of 90 or more.
   - Press F5 on the debrief: it stays.
   - Play both side ops.
   - REPLAY: INDEPENDENT is recommended and attempts do not change until a tier is confirmed.
4. Play Level 5, Level 6 and Level 7 stages by hand, including F5 mid-stage. In Level 7, submit two forecasts and press F5: `peeked` stays.
5. Dev panel "Complete all levels". Check `#/ending` (Enter advances, SKIP), the hub CAMPAIGN COMPLETE banner and the title "NEXUS RESTORED" line.
6. Settings:
   - Text size 115%.
   - Reduced motion On.
   - Sound on and off (a click tone after the first interaction).
   - EXPORT, RESET (type RESET), then IMPORT restores the save.
   - Importing a broken file shows an error and leaves the save unchanged.
7. Tool Bay: buy Magenta Grid with credits; the accent recolours and the supply-run achievement unlocks.
8. In DevTools, set `nexus-save-v1` to `{bad` and reload: the RECOVERY screen appears.
9. Resize to 768, 1024, 1366 and 1920 px wide and check that nothing overflows. Below 768 px a notice appears.
10. Keyboard only: Tab, Enter, Esc and the arrow keys through a mission. Watch the console for red errors throughout.

## Remaining limitations

- The console supports a documented pandas subset, and mini-NumPy is limited to 1D/2D slicing.
- Mission logs and console scrollback are not persisted.
- Side ops restart after a refresh.
- Levels 5–7 cycle 50 seeds.
- Level 5's hidden bonus is easy to trigger.
- Statistics use simplified textbook methods, stated in the UI.
- `LICENSE` has a `YOUR NAME` placeholder, and the README credits are left for the owner.
- The supporting documents in the root (build kits, the Phase 4 report, the duplicate `(1)` kit file) are kept unchanged.

## Extraction and run

```bash
unzip NEXUS_FINAL_PROJECT.zip
cd NEXUS_FINAL_PROJECT
npm ci
npm run dev        # or: npm run verify
```

To apply the files to your Git repository, copy the contents of `NEXUS_FINAL_PROJECT/` over your working tree (excluding `node_modules`). Review the changes with `git status` and `git diff`, then commit, tag and push yourself.

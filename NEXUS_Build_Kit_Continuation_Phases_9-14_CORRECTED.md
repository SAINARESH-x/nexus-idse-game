# NEXUS Build Kit, Continuation: Phases 9 to 14

*Continues "NEXUS Build Kit: IDSE Data Science Game", which ends after Phase 8. Same loop, same style, same tags. Put the file `AGENTS.md` (delivered separately) in the repo root if you do not already have the original.*

*Corrected edition: a targeted consistency and implementation-risk pass on Phases 9 to 14 (see "Corrections made" at the end). Phases 0 to 8 are untouched. Where this edition adds a rule, the rule is stated once in the phase that introduces it and recorded in `docs/PROGRESS.md`, because OpenCode reads that file, not this one.*

**Contents:** Part A assessment · Part B AGENTS.md notes · Part C Phases 9 to 13 · Part D optional Phase 14 · Part E time plan · Part F final submission checklist.

---

# PART A. Continuation assessment

## A1. Where the kit stops

The supplied kit ends after **VERIFY Phase 8** and its tag command `git tag phase-8 && git push origin main --tags`. Phases 0 to 8 are complete as documents. Phase 9 is the next one to run.

## A2. Architecture and decisions I am preserving

- **Stack:** Vite, React 18, TypeScript, Tailwind 3, zustand (persist key `nexus-save-v1`), HashRouter, Vitest. Everything local, no backend.
- **Game core (Phases 1 to 3):** design system in `src/ui`, store and progression in `src/game`, registry of seven levels, mission shell (`MissionShell`, `useMissionFlow`, `DebriefScreen`), reusable mechanics (`DragSort`, `ChoiceSimulator`), side ops and bonuses as pure functions.
- **Levels 1 to 3 (Phases 3 and 4):** each has 3 stages, 2 side ops, 2 visible bonuses and 1 hidden bonus.
- **Level 04 (Phases 5 to 8):** pure engine in `src/engine` (immutable `DF`, `Op` union, `toCode`, safe `parse`, `createDfSession` factory with replay-based persistence, seeded generator with three tiers, `liveHealth`, `judgeOp`, `assessQuality`). UI has Spreadsheet, Console, Builder, a disabled Strategy Lab tab, Stages 1 to 4, and a placeholder debrief.
- **Workflow:** fresh session, paste the phase prompt, wait for the report, run VERIFY, tag, push. `docs/PROGRESS.md` is the handoff file.

## A3. Placeholders still open (each is closed by a named phase)

| Placeholder in the kit | Closed in |
|---|---|
| Strategy Lab tab ("coming soon") | Phase 9 |
| Level 04 debrief placeholder (Integrity and Efficiency only) | Phase 9 |
| Clearance "RECOMMENDED" badge fixed on ASSISTED (adaptive logic "arrives in Phase 9") | Phase 9 |
| Ghost flags "tracked for a later bonus" | Phase 9 |
| Levels 5 to 7 registry entries with placeholder stages and the `/level/:id/play` "Mission workspace" | Phases 10 and 11 |
| Hub "Achievements (placeholder link)", "Tool Bay (locked placeholder)", disabled Title SETTINGS | Phase 12 |
| DevPanel, `/dev/*` routes, "Complete mission (dev)" buttons | Phase 13 (removed from production) |

## A4. AGENTS.md: it was not supplied

The kit says AGENTS.md holds the master rules, and the phases refer to its **section 3** (dependencies), **section 5** (types), **section 6** (colour tokens and fonts), **section 7** (progression constants), **section 8** (level definitions, syllabus lines, story fragments) and the **Phase Protocol**. None of that text is in the two files I received, so I have not read it. I rebuilt it as a separate file, `AGENTS.md`. Everything the kit did not state is tagged **[INFERRED]** inside it. The biggest inferred items are the XP and rank numbers, the dependency list, and the **titles, syllabus lines and story text for Levels 4 to 7** (the kit never names the Level 5 and 6 topics).

> **If you still have the original AGENTS.md in your repo, keep it.** Do not overwrite it. Skip to the sync prompt below.

**Sync prompt.** Use this once, in a fresh session, only if you replaced or rebuilt AGENTS.md after Phases 1 to 8 were already built. It makes the code the authority.

```text
SYNC AGENTS.md WITH THE CODE. No new features, no code changes. Read AGENTS.md and docs/PROGRESS.md. AGENTS.md may have been reconstructed after Phases 1 to 8 were built, so it may disagree with the real code. Compare and, where they differ, EDIT AGENTS.md so it describes the code exactly (the code wins): (1) package.json dependencies vs section 3; (2) src/game/types.ts vs section 5; (3) tailwind.config.ts colours and fonts vs section 6; (4) src/game/config.ts and progression.ts constants (rank thresholds, MAIN_XP, composite weights, rating cutoffs, credits formula) vs section 7; (5) src/game/levels/registry.ts titles, syllabus lines, mission names, stage / side-op / bonus counts and fragment text vs section 8. Also list in docs/PROGRESS.md every placeholder that is still open. Run npm run verify to prove nothing changed. Commit 'docs: sync AGENTS.md with code'. Do not tag or push. Print a table: item | AGENTS.md said | code says | resolved.
```

## A5. Risks and inconsistencies found in the kit

These come from reading the prompts. I could not run your code, so each one is a risk to check, not a proven bug. I have **not** rewritten Phases 0 to 8. Phase 9 absorbs the fixes that touch the build.

| # | Finding | Severity | What to do |
|---|---|---|---|
| 1 | AGENTS.md missing (A4). | High if lost | Use the reconstructed file or the sync prompt. |
| 2 | Hub counts say "2 bonuses" but Levels 1 to 4 each list 3 (2 visible + 1 hidden). | Low | Rule fixed in AGENTS.md section 5: the hub denominator counts visible bonuses only; hidden ones show `???`. Phase 9 and 10 follow it. |
| 3 | Phase 7's Anomaly brush marks ghost rows, but ghosts are not in the Issue list. If `assessQuality` computes identification F1 from all flags, correct ghost flags count as false positives and lower the score. | Medium | Phase 9 item 5 excludes Anomaly flags from F1 and scores ghosts separately. |
| 4 | Clearance seed uses `attempt`, but no field stores it. | Medium | Phase 9 item 1 adds `levels[4].attempts` with a save migration. |
| 5 | `Tier` and `Decision` may be defined twice (`src/game/types.ts` and `src/engine`). Two definitions drift. | Low | Phase 9 item 1 makes the engine the single definition and re-exports it. |
| 6 | `resetAll` and save export cover `nexus-save-v1`, but Level 04 persists `nexus-l04-session` separately. A "reset" could leave a stale session. | Medium | Phase 9 item 1 makes `resetAll` clear every `nexus-` key. Phase 12 covers import and corruption. |
| 7 | The dev panel also appears when `localStorage['nexus-dev'] === '1'`, even in a production build. `/dev/*` routes ship too. | Medium | Phase 13 removes them from production. |
| 8 | Phase 0 install lines: the `https://opencode.ai/v2/install` URL and the npm package `@opencode/cli` look doubtful. As far as I know the documented script is `https://opencode.ai/install` and the npm package is `opencode-ai`. | Low (you have probably passed Phase 0) | If an install ever fails, try those two. |
| 9 | Phase 1 scaffolds with `npm create vite@latest`. Newer versions can ask interactive questions (experimental options, install now). | Low | Answer "No" to experimental options. If the prompt hangs, re-run it in a normal terminal. |
| 10 | The time plan puts Phase 3 (shell, two mechanics, a full level) and Phase 4 (two full levels with two engines) at 45 minutes each. | High | See A6. Not a code bug, a schedule bug. |

## A6. Realistic remaining time

The old plan gives Phases 9 to 13 a total of **3h05** (45 + 45 + 35 + 30 + 30). **That is too optimistic.** It assumes a free model finishes each phase in 10 to 15 minutes with no repair loop. Phases 9 and 10 are the largest left, and free-model rate limits and one repair round per phase are normal.

| Phase | Old estimate | Realistic (range) | Why |
|---|---|---|---|
| 9 Finish Level 04 | 45 min | **75 min** (60 to 100) | Strategy Lab, puzzles, two side ops, adaptive, full debrief, 30+ new tests |
| 10 Levels 5 and 6 | 45 min | **100 min** (80 to 130) | Two new levels, shared cohort generator, SVG charts, two statistics engines |
| 11 Level 7 and ending | 35 min | **65 min** (50 to 85) | Regression engine, three stages, hold-out scoring, ending and summary |
| 12 Systems and polish | 30 min | **45 min** (30 to 60) | Achievements, settings, sound, Tool Bay, robustness |
| 13 Audit and submit | 30 min | **50 min** (40 to 70) | Audit, README, deployment, remote check |
| **Total** | **3h05** | **about 5h35** (4h20 to 7h25) | |

Every item in Phases 9 to 12 is tagged **[CORE]** or **[STRETCH]**. A cut-line (Part E) means "paste the same prompt with the line *Implement only the [CORE] items*". With the main cut-lines applied the remaining work is about 4h00, and about 3h45 with every cut-line.

**Say it plainly:** if you start Phase 9 with less than about 4h05 left (that includes a 20-minute buffer to push and check GitHub), you cannot finish all seven levels at a quality that is worth submitting, even with every cut-line. Part E says what to do in that case.

---

# PART B. AGENTS.md

Delivered as a separate file: **`AGENTS.md`**. It is compatible with Phases 1 to 8 and with everything below.

- New repo or lost the original: copy it to the repo root, then `git add AGENTS.md && git commit -m 'docs: add AGENTS.md'`.
- You already have your own: keep yours. The Phase 9 to 13 prompts only rely on the contracts in AGENTS.md sections 2, 5, 7, 8 and 9. If yours lacks the Phase Protocol or the report format, copy section 9 of the new file into yours.
- Phase 10 and 11 **need the Level 5 to 7 syllabus lines to be right**. Open AGENTS.md section 8 and edit those three rows to match your real syllabus before you run Phase 10. If you change the topic, the level designs in Phases 10 and 11 still show you the shape to follow.

---

# PART C. Remaining phase prompts

Every phase below has the same seven blocks: **A** objective, **B** dependencies, **C** the prompt, **D** automated verification, **E** your manual VERIFY list, **F** the completion report, **G** the git checkpoint. Run them in order. Never paste two phases in one session. Each prompt tells OpenCode to read `AGENTS.md` and `docs/PROGRESS.md` first.

### Git responsibilities (read once; every phase follows this)

| Who | Does | Never does |
|---|---|---|
| **OpenCode** | Edits files, runs `npm run verify` and tests, may run read-only git commands (`git status`, `git log`, `git diff`, `git ls-files`, and `git tag` with no arguments to list tags), and makes **one commit per session** with the exact message given in the prompt (`git add -A && git commit -m '...'`). A repair prompt from the original kit may add one `fix:` commit. | `git tag <name>`, `git push`, `git commit --amend`, `git rebase`, `git reset --hard`, any force option, any git command that uses the network. |
| **You** | Run the manual VERIFY list, make any manual commit (the only one in the whole plan is Phase 13 step 16: screenshots and the licence name), then run the **Git checkpoint** block of the phase: `git tag phase-N && git push origin main --tags`. | Tag or push before every VERIFY check passes. |

Every Git checkpoint block below is a command for **you**. If a prompt and this table ever disagree, this table wins. Tag `phase-13` only after your manual commit, so the tag points at the final commit.


---

## Phase 9: Finish Level 04 (Strategy Lab, puzzles, side ops, bonuses, adaptive difficulty, debrief)

### A. Objective

Turn Level 04 from a working workspace into a complete mission: a Strategy Lab where the player compares cleaning strategies on a safe copy, three field puzzles, two side operations, three bonuses (one hidden), adaptive difficulty, and a full debrief that explains **why** each decision helped or hurt, using numbers computed by the engine. All of it stays connected to the one Level 04 session.

### B. Dependencies

Phases 5 to 8 (engine, generator, assessment, spreadsheet, console, builder, Stages 1 to 4) and Phases 2 and 3 (store, shell, debrief, side ops, bonuses).

### C. Paste into OpenCode

```text
PHASE 9 - Complete Level 04. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Then inspect: src/engine/* (session.ts, assess.ts, ops.ts, codegen.ts, parser.ts, generator.ts, config.ts), src/levels/l04/* (session.tsx, Spreadsheet.tsx, Console.tsx, Builder.tsx, definition.ts, flagScoring.ts, the Stage 3 and Stage 4 components), src/game/store.ts, progression.ts, types.ts, config.ts, registry.ts, src/shell/*, and the current Level 04 debrief placeholder. Items marked [CORE] must all be finished. Do [STRETCH] items only after every CORE item passes npm run verify.

RULES
- Everything connects to the SAME Level 04 session (useDfSession). Strategy Lab forks and side ops use their own createDfSession() instances; they change the main session ONLY when the player presses an APPLY button, which calls session.apply with the right source ('ui' or 'puzzle').
- Do not change existing engine behaviour. You may add exports. Existing tests must still pass.
- No fake panels. Every number shown comes from the engine, never hard-coded text.

1. [CORE] Housekeeping. (a) If Tier or Decision is defined in both src/game/types.ts and src/engine, keep the engine definition and re-export it from game/types (no renames). (b) ATTEMPT COUNTING. Add `attempts` (number, default 0) to LevelProgress for every level, with a persist migration for old saves (only Levels 4 to 7 use it). `attempts` counts missions STARTED and is incremented in exactly ONE place: a store action `startMission(levelId, tier?)` that, in a single set() call, reads n = levels[levelId].attempts, creates the session record with `attemptIndex = n` and its seed, and writes attempts = n + 1. For Level 04 it runs when the player confirms a tier on the clearance screen, and the clearance seed stays 1000 + n*17 + tierIndex, where n is the value BEFORE the increment (the first mission uses n = 0). The action is idempotent per click: if an unfinished session already exists and the call is not an explicit 'discard and restart', it returns without changing anything (this protects against double-clicks and React StrictMode double invocation). It is NEVER called from an effect, from the REPLAY button, from CONTINUE MISSION, or while restoring a saved session. (c) resetAll must clear every localStorage key that starts with 'nexus-'. (d) Add LevelProgress.stats (Record<string, number|boolean|string>, default {}) if it does not exist.

2. [CORE] Strategy Lab (replace the disabled tab; src/levels/l04/strategyLab.ts is PURE, StrategyLab.tsx renders). The tab unlocks at Stage 3 with a short intro and a badge ANALYSIS. It lists CASES built from liveHealth of the CURRENT main dataframe; a case appears only while its problem still exists:
   - MISSING ATTENDANCE: strategies drop rows (dropna subset attendance), fill with 0, fill with mean, fill with median. (If attendance is still text, show 'convert type first' and offer the to_numeric / strip % step as strategy 0.)
   - DUPLICATES: drop_duplicates now vs standardise department text first, then drop_duplicates.
   - INVALID VALUES: filter_range (drops rows) vs mask_invalid then fill with median (keeps rows) vs leave as is.
   For each strategy run its ops on a FORK (createDfSession from a copy of the current df) and compute via a pure compareStrategy(currentDf, ops, ctx): rows before and after, percent of rows lost, nulls remaining, mean and median of the affected column before and after, dropout-rate change in percentage points (the dataset has a dropped_out column), the Decision from judgeOp (label, good, explanation), and the pandas line from toCode. Show a results table and a plain 'Why' paragraph built from the computed numbers (a template that inserts numbers; for example it states how many dropouts were among the removed rows). The APPLY TO MY DATASET button runs the ops on the main session (source 'ui') so Undo and History work. Using the lab costs no hint and is not an operation until applied. [STRETCH] a COMPARE TWO side-by-side view.

3. [CORE] Field Puzzles (src/levels/l04/puzzles.ts pure + FieldPuzzles.tsx drawer in Stage 3). Each puzzle is built from the CURRENT main dataframe when opened and shows a short case story, an evidence panel (computed), and 3 or 4 candidate repairs. Selecting a candidate only PREVIEWS it (consequence and Decision computed on a fork); a separate APPLY CHOICE button changes the main dataset. If that kind of problem no longer exists, show 'Already resolved in the field'. A pure judgePuzzleChoice(puzzle, choiceId) returns a Decision.
   - Puzzle A 'The impossible age': one out-of-range age cell. Candidates: mask to null then fill with the median (good, keeps the row), drop the row (bad: loses a real student), overwrite with a guessed plausible number (bad: invents data), leave it (bad).
   - Puzzle B 'Which CS is which': the department label variants. Candidates: strip only; strip + title; strip + title + replace map. Preview shows the distinct label count after each; only the full mapping reaches the canonical set (good), the others are neutral with an explanation.
   - [STRETCH] Puzzle C 'The scale slip': a cgpa value between 10 and 100 (for example 74.0). Candidates: divide by 10 (good only when the evidence panel shows every other cgpa is below 10 and value/10 is in range), mask then median (acceptable), drop row (bad).
   Applying a choice calls session.apply(ops, 'puzzle') and writes the Decision to the Mission Log. Puzzles are optional; Stage 3 objectives do not depend on them. Wrong picks count as mistakes only when the decision is bad and kept.

4. [CORE] Side operations (own sessions via the factory; register both in the L04 definition, 3 hints each; they open in the normal MissionShell as single-challenge missions):
   - 'Ghost Hunt': pure prepareGhostHuntDf(seed, tier) builds a numeric working frame (convert attendance and cgpa to numbers programmatically, drop exact duplicates, KEEP the ghost rows). The player searches for the fabricated enrolments with a read-only table, sort, per-column stats and filters, and selects the rows they believe are fake. Score precision, recall and F1 against ghosts[] (pure ghostHuntScore). Debrief of the op explains why ghosts stand out (attendance exactly 100, cgpa exactly 10.0, never dropped out) and the difference between an outlier and a fabricated record. XP via store.completeSideOp.
   - 'Pipeline Order': six cleaning cards (drop_duplicates; standardise department strip+title+replace map; strip % and convert attendance to float; fill attendance with median; mask invalid age then fill median; mask invalid cgpa then fill median) on the INDEPENDENT tier dataset. The player orders them and presses RUN; a fresh session applies them in sequence and a step table shows shape, nulls, duplicates and distinct labels after each step. Failed steps show the engine error (for example filling text with a median). Wrong orders explain themselves in computed terms ('drop_duplicates ran before the department labels were standardised, so N near-duplicates survived'). Pass when assessQuality integrity is at least 85. Unlimited retries; each RUN that has a failing step counts as a mistake. Pure pipelineOrder.ts.

5. [CORE] Bonuses (pure evaluators over a mission summary object; register in the definition): visible 'Zero Casualties' (preservation is 1 and no bad decision was kept), visible 'Par or Better' (history entries at most the tier's par from engine config), HIDDEN 'Ghost Hunter' (Anomaly-brush flags in Stage 2 hit at least 3 of the 4 ghost rows). Hidden shows ??? until earned. Also fix identification: flags drawn with the Anomaly brush must be EXCLUDED from the F1 against the Issue list (ghosts are not Issues) and reported separately as ghostsFound and ghostFalsePositives. Do not alter earlier tests unless they contradict this rule, and note any such change in docs/PROGRESS.md.

6. [CORE] Adaptive difficulty. src/game/adaptive.ts (pure; constants in src/game/config.ts): recommendTier(history, levelId): no history for the level gives 'assisted'; take that level's latest entry: composite at least 85 and hintsUsed at most 1 moves ONE tier up (expert stays expert); composite below 55 or hintsUsed at least 4 moves ONE tier down (assisted stays); otherwise the same tier. struggleSignals(missionSummary) is true when there are at least 3 bad-and-kept decisions or at least 6 mistakes in the current stage. Wire: (a) the clearance screen puts RECOMMENDED on the recommended card and shows one line of reason; (b) in INDEPENDENT and EXPERT, when struggleSignals first becomes true, show a dismissible banner offering ONE free Analyst Scan for the rest of that stage (no hint cost, once per mission, recorded as adaptiveAssistUsed and shown in the debrief); (c) TIER_XP_MULT from AGENTS.md section 7 applies to Level 04 main XP only; (d) when a mission completes, push an AdaptiveEntry {levelId, tier, composite, hintsUsed, mistakes, at} to adaptive.history (keep the last 50); (e) add two DEV_ONLY buttons to the DevPanel, 'L4 adaptive: add strong run' (composite 92, hints 0) and 'L4 adaptive: add weak run' (composite 40, hints 5), each appending an entry for Level 4 with the tier of the most recent entry (assisted if none).

7. [CORE] Scoring and completion (src/levels/l04/finish.ts pure): buildStageResults(summary) returns four ChallengeResult objects. Stage 1: accuracy 1 when objectives are met. Stage 2: accuracy is flag F1 (Anomaly excluded). Stage 3: accuracy is consistency, decisionQuality is the decisions metric. Stage 4: accuracy is integrity/100 and efficiency is efficiency/100. mistakes is bad-and-kept decisions plus wrong puzzle picks; hintsUsed comes from the session. The headline Integrity and Efficiency scores still come from assessQuality at SUBMIT FOR AUDIT. Call store.completeMission(4, aggregate) so XP, rating and replay rules match the other levels, apply TIER_XP_MULT, and record side ops and bonuses through the store.
   Store these LevelProgress.stats keys for Phase 12 achievements: bestIntegrity, bestEfficiency, ghostsFound (max), tiersCleared (comma separated tier names), perfectRun (integrity at least 95 and no bad decision kept).

8. [CORE] Real Level 04 debrief (replace the placeholder; reuse the shared DebriefScreen and add an L04 section component):
   a. Headline: Integrity and Efficiency gauges, rating letter, tier badge, XP and credits count-up, rank-up Modal if earned.
   b. Metric breakdown: consistency, identification, decisions, preservation, economy as bars, each with one plain sentence on what it means and what lowered it (computed).
   c. BEFORE vs AFTER table: rows, nulls, duplicates, distinct department labels, mean and median attendance, mean cgpa, dropout rate; changed cells highlighted.
   d. Decisions and consequences: every judged decision (label, good/neutral/bad icon with text, explanation, an 'undone' badge) from history, puzzles and Strategy Lab applies.
   e. WHAT YOU MISSED: unresolved Issues from the generator list, grouped by kind with counts, the first 5 locations, and the pandas line that fixes that kind.
   f. WHY IT MATTERS: run the engine on the DIRTY dataframe with two naive strategies, df.dropna() and df.dropna(subset=['attendance']), and show the computed result (students lost, dropout-rate shift). In the expert tier add the informative-missingness explanation using the real numbers.
   g. Ghosts: hits and misses on Anomaly flags, why each ghost is suspicious; the hidden bonus tile.
   h. Rewards and next steps: side ops and bonuses status, story fragment F4 reveal (typewriter), buttons SIDE OPERATIONS, REPLAY (only navigates to the clearance screen with the recommended tier preselected; it does NOT change attempts, because the single increment happens when a tier is confirmed, item 1b), NEXT LEVEL (when unlocked), HUB.
   i. [STRETCH] EXPORT CLEANED DATA: download the final dataframe as a CSV via a Blob link (no network).

9. [CORE] Persistence and replay. Save the finished report inside 'nexus-l04-session' so F5 on the debrief keeps it. After completion, archive the best results into levels[4].stats. On the Level 04 briefing show CONTINUE MISSION when an unfinished session exists and BEGIN MISSION otherwise (BEGIN opens the clearance screen and, if an unfinished session exists, discards it after a confirm Modal; the new mission and its single attempts increment happen when a tier is confirmed). ABORT awards nothing. Corrupt or invalid session JSON must not crash: show a toast and restart at the clearance screen. The session JSON stores `seed` and `attemptIndex`; restoring a session never recomputes them from attempts and never changes attempts.

10. [CORE] Tests (at least 30 new assertions; put them next to the code): compareStrategy on a tiny fixture (rows, percent lost, dropout shift computed correctly), puzzle judging for every candidate, ghostHuntScore (perfect, empty, partial, false positives), pipelineOrder (a good order passes; the dedupe-before-standardise order leaves near-duplicates and explains it), all three bonus evaluators true and false, recommendTier (at least 6 cases incl. both boundaries), struggleSignals, TIER_XP_MULT, history cap at 50, finish.ts mapping, Anomaly flags excluded from F1, attempts migration and the counting rule (exactly one increment per started mission; none on REPLAY, CONTINUE, F5 restore, a double click or a StrictMode double call), resetAll clears all 'nexus-' keys, finished-report persistence round trip. Add ONE headless integration test: generate assisted seed 42, run the 9-command perfect script from Phase 6 through the parser and session, submit perfect flags, build results, call completeMission(4): assert rating S, XP paid, replay at the same score pays 0 extra.

11. Update docs/PROGRESS.md: every new module and its API, the stats keys, adaptive rules, decisions, and mark the Strategy Lab, debrief and RECOMMENDED placeholders closed.

DONE WHEN: npm run verify passes, every CORE item is implemented with its tests, and no placeholder text for Level 04 remains. Then commit 'feat(phase-9): complete Level 04' and print PHASE 9 REPORT. Do not tag, push, or start Phase 10.
```

### D. Automated verification

OpenCode must run, and paste the summary of, these commands:

```bash
npm run verify
npx vitest run src/engine src/levels/l04 src/game
```

Both must pass. The test count must have grown by at least 30 assertions.

### E. VERIFY Phase 9

Use the Dev Panel to unlock all levels, then open Level 4. Do not trust the report; do these yourself.

1. `npm run verify` passes.
2. **Adaptive, first play.** BEGIN MISSION. On the clearance screen ASSISTED carries RECOMMENDED with a one-line reason. Choose ASSISTED.
3. **Stage 1 and 2.** Complete Stage 1. In Stage 2 flag problems, and use the **Anomaly** brush on rows that look fabricated (attendance exactly 100 and cgpa exactly 10.0). SUBMIT REPORT. The feedback talks about the five issue categories and does not penalise the Anomaly flags as wrong.
4. **Stage 3 unlock.** CONSOLE, BUILDER and a **STRATEGY LAB** tab (badge ANALYSIS) are usable.
5. **Strategy Lab.** The MISSING ATTENDANCE case lists drop rows, fill 0, fill mean, fill median. For each you see rows before and after, percent lost, the dropout-rate change, a decision label and the pandas line. Dropping rows shows rows lost; fill with median shows 0 rows lost. The main spreadsheet is **unchanged** until you press APPLY TO MY DATASET. Apply "fill with median": History gains one entry. Then press UNDO so History is clean again.
6. **Field Puzzles.** Open 'The impossible age'. Select "guess a number": the preview shows a bad decision with an explanation, and the spreadsheet is still unchanged. Select "mask then median" and press APPLY CHOICE: History gains an entry with source `puzzle`. Press UNDO. Open 'Which CS is which' and see the distinct label count change per candidate.
7. **Finish the repairs.** With a clean History, run the 9-command script from the Phase 6 verification in the Console. SUBMIT FOR AUDIT.
8. **Debrief.** You see: Integrity and Efficiency gauges (Integrity between 90 and 100 if your Stage 2 F1 was at least 0.4; Efficiency near 89 because you used 9 history entries), a rating letter (S expected), metric bars with sentences, a BEFORE vs AFTER table (rows `(47, 9)` becoming `(44, 9)` is correct for the assisted tier), the decisions list, WHAT YOU MISSED (empty or short), WHY IT MATTERS with real numbers for `df.dropna()`, a ghosts section, and the F4 fragment. XP and credits appear. Hub: Level 4 is COMPLETED and Level 5 is unlocked.
9. **Persistence.** Press F5 on the debrief: it is still there. Go to the hub and back to Level 4: BEGIN MISSION starts a new clearance (no stale session). In DevTools, Application, Local Storage, `nexus-save-v1`: `levels[4].attempts` is 1 (one mission started; F5 did not change it).
10. **Bonuses.** BONUS tab: 'Zero Casualties' is earned (preservation 100%, no bad decision kept). 'Par or Better' is **not** earned (9 operations is above the assisted par of 8). The hidden bonus shows its name only if you flagged at least 3 ghosts with the Anomaly brush in step 3; otherwise it shows ???.
11. **Adaptive.** Press REPLAY: because your run scored 85 or more with at most 1 hint, INDEPENDENT carries RECOMMENDED. REPLAY must not change `attempts` (still 1); it becomes 2 only after you confirm a tier on the clearance screen. Open the Dev Panel and press 'L4 adaptive: add weak run' once, then go back to the Level 4 clearance screen: the recommendation moves down one tier. Press 'add strong run' twice: it moves up again.
12. **Struggle assist.** Start Level 4 as INDEPENDENT. Stage 1: open Shape and Dtypes and flag 3 cells. Stage 2: press SUBMIT REPORT twice (the second submission passes). In Stage 3 open the Console and run these three commands without undoing: `df = df.dropna()`, `df = df.drop_duplicates(subset=['department'])`, `df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')`. Each shows a red bad-decision toast, and a banner then offers ONE free Analyst Scan. Using it switches highlights on and the hint counter does **not** increase. In ASSISTED no such banner ever appears.
13. **Side ops.** Level 4 SIDE OPS tab shows Ghost Hunt and Pipeline Order. In Ghost Hunt select the four fake rows: a score screen with precision, recall and the explanation appears. In Pipeline Order put `drop_duplicates` first and RUN: it explains that near-duplicates survived. Reorder (standardise department first) and pass. Both ops pay XP once.

**Failure signs:** the Strategy Lab changes the spreadsheet before APPLY; a number in the debrief that does not change when you change tier; the browser console (F12) shows red errors; F5 loses the finished report.

### F. Completion report

OpenCode prints `PHASE 9 REPORT` in the format of AGENTS.md section 9. It must also state: which CORE items are done, whether any [STRETCH] item was done, and any existing test it had to modify and why.

### G. Git checkpoint

**You run these commands, not OpenCode.** All 13 checks pass:

```bash
git tag phase-9 && git push origin main --tags
```

If a repair prompt (section 4 of the original kit) is needed, use it first. If OpenCode runs out of steam, paste the prompt again with this line on top: `Implement only items 1 to 5 now; I will ask for the rest next.` Tag only when all CORE items pass.

---

## Phase 10: Levels 05 and 06

### A. Objective

Make Level 05 (exploratory analysis and visualisation) and Level 06 (statistics) fully playable. They share one new data source (a deterministic student cohort) and one set of SVG charts, but they must **feel different**: Level 05 is an analysis desk of chart panels, Level 06 is a lab bench of simulations. Neither is a quiz and neither copies the Level 04 spreadsheet.

### B. Dependencies

Phases 2 and 3 (shell, store, mechanics, registry), Phase 5 and 6 (`rng.ts`, `DF` type, `dataframe.ts`). Phase 9 finished (so Level 5 can unlock). **Before you start:** AGENTS.md section 8 must show your real Level 5 and 6 syllabus lines. This prompt assumes Level 5 is exploratory analysis and visualisation and Level 6 is statistics (sampling, correlation, hypothesis testing). If your syllabus differs, change the two level descriptions in the prompt before pasting, keeping the structure.

**Recommended way to run it.** This is the biggest phase left. Paste it twice in separate fresh sessions: first with the line `Implement only PART A now.`, then (after the report) with `PART A is done. Implement only PART B now.` Tag once, after both parts pass.

**Normal or lean? Decide before you paste.** If you are applying cut-line 3 (Part E), do it now: edit the Level 5 and 6 rows of AGENTS.md section 8 and paste the LEAN VERSION line at the top of the prompt. Whichever you choose, the **registry is the single source of truth for every count** (stages, side ops, bonuses). Phases 11 to 13 read the counts from the registry through a helper this phase creates; none of them may assume three stages or two side ops for Levels 5 and 6.

### C. Paste into OpenCode

```text
PHASE 10 - Level 05 (SIGNAL SCOPE) and Level 06 (CHANCE ENGINE) fully playable. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Inspect: src/shell/*, src/components/mechanics/*, src/game/levels/registry.ts, the definition.ts files of levels 1 to 4 (structure only), src/engine/rng.ts, dataframe.ts, types.ts, generator.ts. Items marked [CORE] must all be finished; [STRETCH] only after everything CORE passes npm run verify.

RULES: reuse MissionShell, useMissionFlow, DebriefScreen, DragSort, ChoiceSimulator and the hint, bonus and side-op plumbing. NORMAL configuration: each level has 3 main stages, 2 side ops, 2 visible bonuses and 1 hidden bonus. If I pasted the LEAN VERSION line (Part E, cut-line 3), the counts are the lean ones stated in that line, and everything below about a removed stage, side op or bonus is skipped. Whichever configuration is active, THE REGISTRY IS THE SINGLE SOURCE OF TRUTH for counts: no other file, test, screen or message may hard-code 14, 3, 2 or any stage, side-op or bonus total (see item C). Every stage and side op keeps 3 progressive hints, a briefing with a real-world scenario, feedback with explanations, mission scoring through store.completeMission, side ops through completeSideOp, bonuses through completeBonus, and its story fragment. Replace the placeholder registry entries for levels 5 and 6 with real definitions (counts exactly as AGENTS.md section 8 for the active configuration). No chart or maths library: charts are in-house SVG. All statistics are pure, seeded functions with unit tests; nothing may call Math.random(). Show the equivalent pandas, NumPy or SciPy-style line next to every interactive result (as text, never executed).

PART A - shared foundations and Level 05

A1. [CORE] src/engine/stats.ts (pure): mean, median, std (ddof=1), variance, quantile (pandas linear interpolation), corr (Pearson), groupAgg(df, by, col, fn) with fn in count|mean|median|std|min|max, histogramBins(values, bins), iqrOutliers(values, k), zscores, rate(values) for 0/1 columns. Tests (at least 15 assertions) with hand-computed values.

A2. [CORE] src/engine/cohort.ts: generateCohort({seed, n}) returns the existing DF type with columns student_id, department (Computer Science, Mechanical, Electrical, Civil), year (1 to 4), study_hours (0 to 40 per week, one decimal, right-skewed), attendance (35 to 100), sleep_hours (4 to 9), library_visits (correlated with study_hours, about 0.7, but NOT a cause of cgpa), scholarship ('Yes' or 'No', about 25 percent), cgpa and dropped_out (0 or 1). Define the coefficients and every tunable in src/engine/config.ts: cgpa = 3.2 + 0.035*attendance + 0.07*study_hours + 0.15*(sleep_hours - 6.5) + 0.2*(scholarship Yes) + normal(0, 0.45), clamped to 3.0..9.8 and rounded to one decimal. Same seed and n must give identical data. Do not modify generateStudents or its tests.
 DETERMINISM BY CONSTRUCTION (the outcomes the levels rely on must not depend on a lucky seed):
 - attendance is STRATIFIED: ATTENDANCE_BANDS = share 0.18 over 35 to 60, share 0.32 over 60 to 80, share 0.50 over 80 to 100. Give each student a rank from a seeded permutation, take the quantile u = (rank + uniform)/n, map it into its band, round to one decimal and clamp so the value stays inside its band (59.96 must never become 60.0). The number of students below 60 is therefore always floor or ceil of 0.18*n.
 - study_hours uses a fixed right-skewed shape (parameters in config), 0 to 40, one decimal. library_visits is built from standardised study_hours plus independent noise with LIBRARY_RHO = 0.7 and never enters cgpa.
 - dropped_out is assigned by RANK inside three attendance bands (below 60, 60 to 75, 75 and above), not by independent coin flips. For each student compute p = sigmoid(intercept + a STEEP attendance term that rises sharply below 60 + a cgpa term (higher cgpa lowers p) + DROPOUT_SCHOLARSHIP_LOGIT when scholarship is Yes) and a seeded jitter ~ normal(0, DROPOUT_JITTER). In each band exactly round(sum of p in that band) students, those with the highest p + jitter, get dropped_out = 1. Choose the coefficients so the band rates land near 0.45, 0.15 and 0.05 (each within 0.05), the overall rate near 0.15, and DROPOUT_SCHOLARSHIP_LOGIT negative (about -0.8) so scholarship students really drop out less.
 - cohortInvariants(df) (pure) returns a list of {name, ok, value} for every guarantee in the test list below. The game does not need it at runtime; the tests do.
 SEED SLOTS: every game seed comes from sessionSeed(levelId, attemptIndex) (A5), which has only SEED_SLOTS = 50 distinct values per level, so the set of seeds a player can ever meet is finite and known. Tests run over ALL of them, so a guarantee is verified for every reachable seed, never for a sample.
 Tests (at least 15 assertions): same seed and n give identical data and different seeds differ; for EVERY slot of Level 5 (n = 240), Level 6 (n = 2000) and Level 7 (n = 300), cohortInvariants are all ok: (1) the count with attendance below 60 is floor or ceil of 0.18*n (so at least 15 percent, which makes the Level 05 Stage 3 goal reachable); (2) corr(attendance, cgpa) and corr(study_hours, cgpa) are each between 0.4 and 0.8, corr(sleep_hours, cgpa) between 0.05 and 0.35, corr(library_visits, cgpa) between 0.2 and 0.6, abs(corr(attendance, study_hours)) below 0.15, corr(study_hours, library_visits) above 0.5; (3) the dropout rate below attendance 60 is at least 2 times the rate above 75 AND at least 2 times the overall rate, and the range 35 to 60 satisfies the Level 05 Stage 3 goal (lift at least 2, coverage at least 15 percent); (4) steepestFall(df) (see A4) lies between 55 and 65; (5) mean(study_hours) minus median(study_hours) is at least 0.5; (6) ranges are respected and there are no nulls; (7) for n = 2000 only: convenienceBias = mean(cgpa where attendance > 80) - mean(cgpa) is at least 0.4, that subset has at least 500 rows, popStd(cgpa) is between 0.6 and 1.5, the share of scholarship students is between 0.2 and 0.3, scholarship students drop out at least 2 percentage points less than the others, and the permutation p-value of that difference (1000 shuffles, B1 seeding) is at most 0.005.
 FIX RULE (applies to every guarantee test in Phases 10 and 11): if a guarantee fails for some slot, change a generator coefficient or a named salt in config.ts and re-run. Never loosen a threshold and never special-case a slot. PHASE 10 REPORT must state the tightest margin observed for each invariant.

A3. [CORE] src/components/charts/: Scatter (optional regression line, colour by category, brush selection by pointer and by keyboard arrows), Histogram, BarChart (with a 'start at zero' option), BoxPlot, LineChart. Pure scale helpers in charts/scale.ts with tests. Each chart has an aria-label with a computed text summary and uses the NEXUS colour tokens. Tests: render without crashing; scale maths.

A4. [CORE] Level 05 'FIND THE PATTERN' (src/levels/l05/). Scenario: the Dean's office asks why students leave; the cohort (n = 240, seed = sessionSeed(5, attemptIndex), see A5) is already clean. Interface style: ANALYSIS DESK, a grid of chart and table panels. Not a spreadsheet.
 Stage 1 'Know Your Data' (SummaryDesk): a GroupBy Builder (group column, value column, aggregation) with a live result table and the pandas line df.groupby('department')['cgpa'].median(); and a Distribution strip showing mean and median markers for any numeric column. Goal cards, each turning green when the built result equals the target computed from the data (when two values tie for the top, either is accepted): (a) the department with the highest median cgpa; (b) the year with the highest dropout rate (mean of dropped_out); (c) a ChoiceSimulator about study_hours (right-skewed): the player picks mean or median to describe a typical student and the simulator shows what each statistic reports.
 Stage 2 'Choose the Right Chart' (ChartStudio): four briefs (show the shape of attendance; compare cgpa across departments; show the relationship between attendance and cgpa; show dropout rate by year). The player chooses a chart type (histogram, bar, box, scatter, line) and assigns columns; live preview; a pure chartRubric.ts returns appropriate, acceptable or misleading with a reason (a bar chart of a raw continuous column, or a line across unordered categories, is misleading; scatter needs two numeric columns). A bins slider on the histogram and a 'y-axis starts at zero' toggle on bars show computed warnings. A wrong choice is a mistake with an explanation; retry is allowed. Pass when all four briefs are solved.
 Stage 3 'Find the Pattern' (PatternHunt): scatter of attendance vs cgpa coloured by dropped_out plus a binned dropout-rate-by-attendance bar chart with a brush (drag or arrow keys). The panel shows the dropout rate inside vs outside the brush and the lift against the overall rate. Goal: select a range whose dropout rate is at least 2 times the overall rate and that covers at least 15 percent of students. Then an INSIGHT builder with chips (variable, direction, magnitude, caveat) produces a sentence such as 'Students with attendance below 60 percent drop out at 3.1 times the overall rate (n = 61). This is an association, not proof of cause.' A pure insightCheck.ts validates the claim against the computed numbers (the claimed lift must be within INSIGHT_LIFT_TOL = 0.5 of the computed lift, the claimed n within 5 percent, variable and direction must match) and requires the caveat chip. The goal is always reachable because cohortInvariants guarantees that the range 35 to 60 qualifies.
 Side op 'Misleading Chart': three pre-built flawed charts (truncated bar axis, histogram bins hiding a bimodal shape, cherry-picked range). The player toggles fix controls until each chart is honest; every fix is explained.
 Side op 'Outlier Hunt': a boxplot of study_hours with 6 injected outliers, placed deterministically by a pure injectOutliers(df, seed): 6 rows chosen by a seeded shuffle get the value Q3 + m*IQR for m = 2.0, 2.5, 3.0, 3.5, 4.0, 5.0 (they are data-entry errors and may exceed 40). The player sets the IQR multiplier k and chooses keep, cap or remove. Feedback shows precision and recall against the injected outliers (zero-safe: flagging nothing gives precision 0, displayed as n/a) and warns that real extreme values can be valid; the natural right tail of study_hours is why precision is below 1 at k = 1.5. For every slot: k = 1.5 gives recall 1 and k = 6 gives recall 0.
 Bonuses: visible 'Right First Time' (no wrong chart choice in Stage 2), visible 'No Assistance' (zero hints), HIDDEN 'Dropout Cliff' (a boundary of the Stage 3 selection lies within 3 points of steepestFall(df), a pure function: bins of width 5 starting at 35, bins with fewer than 8 students ignored, returns the bin edge where rate(left bin) minus rate(right bin) is largest). Fragment F5. Tests: groupby builder result equals groupAgg; chartRubric table; insightCheck (valid and invalid claims); bonus evaluators; brush maths; steepestFall; injectOutliers.

A5. [CORE] Shared session and seed plumbing: src/game/missionSession.ts (pure) plus a thin hook useMissionSession(levelId). Used by Levels 5, 6 and 7 (Level 04 keeps its own 'nexus-l04-session' format from Phases 5 to 9).
 a. SEEDS. sessionSeed(levelId, attemptIndex) = levelId*1000 + (attemptIndex % SEED_SLOTS)*17 with SEED_SLOTS = 50 in config.ts. Add mixSeed(...integers) to src/engine/rng.ts (additive export: a deterministic 32-bit hash of its arguments). Every simulator derives its seed as mixSeed(sessionSeed, SOME_NAMED_SALT, runIndex); the salts are named constants in config.ts. Replays get a new seed because attempts increases (Phase 9 item 1b); after 50 attempts the slots repeat, which is documented in docs/PROGRESS.md.
 b. STARTING. BEGIN MISSION calls the store action startMission(levelId) from Phase 9 item 1b: one increment of attempts, one new session record. Nothing else in Levels 5 to 7 touches attempts.
 c. THE RECORD. One JSON value per level under 'nexus-l05-session', 'nexus-l06-session', 'nexus-l07-session': { v: 1, levelId, attemptIndex, seed, status: 'active' | 'finished', stageId (the current stage's id from the registry, not a number), stages: { [stageId]: { status: 'locked' | 'open' | 'done', hintsUsed, mistakes, state } }, report? }. `seed` is stored and never recomputed on restore. `state` holds only INPUTS and PROGRESS as plain JSON: the player's selections plus the counters that affect scoring. It never holds a dataset, a simulation result or a chart; those are recomputed from the seed and the inputs. Required contents:
   - Level 5: Stage 1 group-by builder (group, value, aggregation), goal flags a, b, c, the ChoiceSimulator answer. Stage 2, per brief: chart type, column assignment, bins, zero-baseline toggle, solved flag, wrong-choice count. Stage 3: brush range [lo, hi] and the insight chips.
   - Level 6: Stage 1: n, method, confidence level, run index, draw index, goal flags, answers. Stage 2: pair order, revealed flag, Anscombe answer, number of bands, answers. Stage 3: chosen question, null-hypothesis chip, statistic, shuffle count, run index, alpha, decision, re-run count with the verdicts seen, fishing-trip answers, Bonferroni flag.
   - Level 7: Stage 1: slope, intercept, goal flags, answer. Stage 2: selected features, test fraction, split seed, fit count, the previous fit's features and coefficients (for the coefficient-change note), leak-reported flag. Stage 3: degree, final-model choice, fit count, the submissions list (each with its revealed hold-out numbers) and the peeked flag.
   - Side ops do not persist their inner state. A refresh restarts the side op from its first screen with the same deterministic seed; hints already spent stay spent (the store counts them as usual).
 d. WRITING. The hook writes after every committed change to a persisted field, inside try/catch; a failed write shows the Phase 12 toast once and the game continues.
 e. RESTORING. parseSession(levelId, raw, ctx) is pure and returns { ok: true, session, repairs: string[] } or { ok: false, reason }, where ctx holds the registry's stage ids for that level and levels[n].attempts.
   1. JSON.parse inside try/catch; the value must be a plain object.
   2. v === 1; levelId matches; seed and attemptIndex are integers; seed === sessionSeed(levelId, attemptIndex); attemptIndex < levels[n].attempts (the session came from a counted start); status is valid; stageId exists in the registry for this level (this works for a 2-stage lean level as well as a 3-stage one).
   3. Each stage entry is validated field by field (numbers finite and inside the control's range, enums inside their set, arrays of the right length with distinct members). An invalid stage `state` is replaced by that stage's initial state (that stage restarts, earlier valid stages are kept); a stage after an invalid stageId is locked; unknown keys are dropped; counters are clamped to 0 or more.
   4. A failure of step 1 or 2 invalidates the whole record: remove the key, show the toast 'Saved session was damaged, the mission starts over', and route to the level briefing. Recovery never changes `attempts` (the damaged session already counted its start); the next BEGIN MISSION is a normal start.
   5. If only step 3 repairs were needed, show the toast 'Part of the saved session was reset' and continue. Never throw and never show a blank page.
 f. FINISHED SESSIONS. On completion set status 'finished' and keep `report`, so F5 on the debrief works. The briefing shows CONTINUE MISSION for an active session and BEGIN MISSION otherwise (BEGIN replaces a finished record, or discards an active one after a confirm Modal). ABORT awards nothing and removes the record.
 g. Tests (at least 14 assertions): sessionSeed range and slot wrap; a round trip per level with a fully populated state; restoring never changes attempts; each failure in e1 and e2 (bad JSON, wrong version, wrong levelId, NaN seed, seed mismatch, attemptIndex not below attempts, unknown stageId, a stage out of range in a 2-stage lean registry); an invalid stage state resets only that stage; unknown keys are dropped; a finished record restores; resetAll removes all three keys.

PART B - Level 06

B1. [CORE] src/levels/l06/statsLab.ts (pure; every function takes its seed explicitly): sampleMeans(values, n, reps, seed, method) ('random' draws without replacement from the whole population; 'convenience' draws without replacement from the students with attendance above 80, and if n exceeds that subset it takes the whole subset and reports the effective n); theoreticalSE(values, n) = popStd/sqrt(n) (ddof 0) next to the empirical standard error (std of the sample means, ddof 1); confidenceInterval(sample, level) with a fixed z table {0.90: 1.645, 0.95: 1.96, 0.99: 2.576} and mean +- z*s/sqrt(n) (it also works on 0/1 samples); permutationTest(a, b, shuffles, seed) returning the observed difference, the null distribution and the two-sided p-value p = (1 + count(abs(null) >= abs(observed))) / (shuffles + 1); zTestP(a, b) (two-sided normal approximation, used by the fishing trip); stratifiedCorr(x, y, confounder, bands) (quantile bands of the confounder; the weighted mean of the within-band correlations, weights = band sizes); orderingScore(order, rs) (fraction of correctly ordered pairs by abs(r); pairs whose abs(r) differ by less than 0.05 count as correct either way; a perfect order always scores 1); anscombeLike() (FIXED literal constants: the classic Anscombe quartet values, no randomness); fishingTrip(cohort, seed): 20 comparisons on shuffled noise (random group labels over a noise sample of 400 students, p from zTestP) with a selection loop over sub-seeds mixSeed(seed, FISHING_SALT, k), k = 0 to 499, that accepts the first set having at least one raw p below 0.05 and none below 0.05/20 (fallback: the first set with at least one p below 0.05); it returns {comparisons, rawSignificant, bonferroniSignificant}, so 'a false positive that Bonferroni removes' exists by construction, not by luck.
 Tests (at least 20 assertions, ALL deterministic): determinism; permutationTest on two identical samples gives p = 1 exactly; a = [1,2,3] against b = [4,5,6] with 20000 shuffles gives p within 0.02 of the exact value 0.1; a = 0..9 against b = 100..109 gives p below 0.01 for any seed; a confidenceInterval hand example; for EVERY slot, empirical SE at n = 100 divided by SE at n = 25 lies between 0.4 and 0.6; for EVERY slot, stratifiedCorr(library_visits, cgpa, study_hours, 3) has absolute value at most 0.6 times the raw correlation and with 6 bands at most 0.4 times (FIX RULE from A2: tune LIBRARY_RHO or its noise, never the threshold); Anscombe r values equal 0.816 within 0.005; orderingScore (perfect = 1, reversed below 0.2, the near-tie rule); fishingTrip for every slot has rawSignificant of at least 1 and bonferroniSignificant of 0; for every slot, each rerun index 0 to 3 at 1000 shuffles gives the SAME reject decision at alpha 0.05 and at 0.01 for both Stage 3 questions, and that decision is 'reject' (the all-slots permutation test gets a 60-second timeout).

B2. [CORE] Level 06 'SIGNAL OR NOISE' (src/levels/l06/). Scenario: the university must decide whether attendance policy changes work, with limited data and noisy outcomes. Interface style: LAB BENCH, simulation panels with RUN, STEP and RESET controls and live histograms. Not a dashboard, not a spreadsheet. Population: generateCohort n = 2000, seed = sessionSeed(6, attemptIndex) (A5).
 Stage 1 'Sampling Lab': sample size slider (5 to 500), method toggle (random vs convenience), REPEAT x100 draws 100 samples (seed mixSeed(seed, SAMPLING_SALT, runIndex); the run index is persisted) and plots the distribution of sample means with the true mean line, the empirical standard error and the theoretical one. Goals: (a) with random sampling reach a THEORETICAL standard error (popStd/sqrt(n)) of 0.10 or less for mean cgpa and press REPEAT once at that n, so the goal never depends on one lucky draw (cohortInvariants guarantees that n of at most 500 is enough); (b) show that a convenience sample stays biased (centre off the true mean by more than 0.3, which holds for every slot because the population bias is at least 0.4) however large n gets, then answer a ChoiceSimulator 'would a bigger sample fix this?' which runs the consequence; (c) estimate the population dropout rate with a confidence interval that contains the true rate (the player picks n and the confidence level 0.90, 0.95 or 0.99; every DRAW uses seed mixSeed(seed, CI_SALT, drawIndex), the draw index is persisted, DRAW AGAIN is allowed, and the result shows whether the interval covers; guarantee test: for every slot at n = 400 and 0.95, at least one of draws 0 to 4 covers).
 Stage 2 'Correlation Court': six scatter pairs (attendance and cgpa, study_hours and cgpa, sleep_hours and cgpa, library_visits and cgpa, attendance and study_hours, an Anscombe-like pair). Tasks: (a) order the pairs by strength of relationship by dragging (DragSort mechanics), then reveal the computed r values and score the ordering with orderingScore (B1); (b) the Anscombe panel: four fixed datasets (anscombeLike) with the same r, the player identifies which one r misleads about and chooses the right next step; (c) Confounder case: library_visits vs cgpa shows a clear r; the player stratifies by study_hours bands with a slider and watches the within-band correlation collapse (B1 guarantees at most 0.6 of the raw r at 3 bands), then picks the right conclusion through a ChoiceSimulator. Show df['a'].corr(df['b']) lines.
 Stage 3 'The Verdict' (HypothesisLab): choose one of two questions (do students with attendance at or above 75 have higher cgpa; do scholarship students drop out less). Workflow: state the null hypothesis from chips, choose the statistic (difference in means or in rates), run shuffles (1, 10, 1000) and see the null distribution with the observed value marked, the p-value, set alpha (0.05 or 0.01), decide reject or do not reject; the verdict is validated against the computed p-value (reject if and only if p <= alpha). Both questions have a real effect built into the cohort (attendance through the cgpa formula, scholarship through DROPOUT_SCHOLARSHIP_LOGIT), so for every slot the correct verdict at 1000 shuffles is 'reject' at both alpha values, and B1 tests guarantee it cannot flip between re-runs; the lesson about over-reading p-values is carried by the fishing trip. Then the FISHING TRIP: fishingTrip(cohort, seed) (B1) gives 20 comparisons on shuffled noise, at least one of which looks significant at 0.05 by construction; the player explains why through a ChoiceSimulator and applies a Bonferroni correction (threshold 0.05/20) to watch the false positives vanish.
 Side op 'Distribution Detective': match four histograms (normal, right-skewed, bimodal, uniform) to descriptions and state whether mean is above, below or about equal to median; feedback computed from the data.
 Side op 'Coverage Casino': generate 100 confidence intervals at a chosen confidence and n (seed mixSeed(seed, COVERAGE_SALT, runIndex)); count how many contain the true mean (expect close to the confidence level); changing the level or n shows the width and coverage trade-off. Test: for every slot at n = 50, coverage at 0.95 lies in 88 to 100 and at 0.80 in 68 to 92 (binomial bands wide enough that a correct implementation passes; if one slot fails, change COVERAGE_SALT, not the bands).
 Bonuses: visible 'Replicator' (press RE-RUN WITH NEW SEED three times at 1000 shuffles in Stage 3, each re-run using mixSeed(seed, PERM_SALT, rerunIndex); the verdict is the reject or do-not-reject decision at the player's alpha, and the B1 tests guarantee it never changes), visible 'No Assistance' (zero hints), HIDDEN 'Fishing Expedition' (spot and flag a false positive in the FISHING TRIP). Fragment F6. Tests: stats lab functions, ordering score, stratification result, verdict validation, Bonferroni correction, bonus evaluators.

C. [CORE] Registry and integrity. Replace the placeholder entries for levels 5 and 6 with the real definitions. Add src/game/levels/counts.ts: a pure getRegistryCounts(registry) returning, per level, {stages, sideOps, bonusesVisible, bonusesHidden} and, overall, {sideOps, bonusesVisible, bonusesHidden, bonuses}, all computed from the definition arrays. Every consumer must use it or the registry directly: the hub card text (`Stages x/N - Side ops x/N - Bonus x/N`, where the bonus denominator is the visible count), the debrief, achievements (Phase 12) and the campaign summary (Phase 11). Search src for hard-coded count literals (for example `of 14`, `/ 14`, `0/3`, `Math.min(..., 14)`) and replace each one. Add ONE registry test over all seven entries: (1) consistency taken from the registry itself: getRegistryCounts equals the array lengths, every stage and side op has exactly 3 hints, ids are unique, fragment ids F1 to F7 are unique, every level has at least 1 stage; (2) ONE hand-written table EXPECTED_SHAPE at the top of that test, seven rows copied from AGENTS.md section 8 for the ACTIVE configuration (normal: Levels 1 to 3 have 3 stages, 2 side ops, 2 visible + 1 hidden bonuses; Level 4 as built; Levels 5 to 7 have 3 stages, 2 side ops, 2 visible + 1 hidden; lean: Level 5 has 2 stages, 1 side op, 2 visible + 0 hidden; Level 6 has 2 stages, 1 side op, 1 visible + 0 hidden). EXPECTED_SHAPE is the only place the numbers are written by hand. Level 7 may still be a placeholder until Phase 11, but its COUNTS must match its row.
D. [CORE] Update docs/PROGRESS.md: cohort and stats APIs, chart components, level structure, the ACTIVE configuration (normal or lean) with the exact registry counts, the shared conventions (getRegistryCounts, sessionSeed, SEED_SLOTS, mixSeed and the named salts, parseSession and the session record, the FIX RULE), decisions, open placeholders.

DONE WHEN: npm run verify passes and Levels 5 and 6 can be completed from the hub through the debrief. Commit 'feat(phase-10): levels 5 and 6' (if I asked for one part only: 'feat(phase-10): part A' or 'feat(phase-10): part B') and print PHASE 10 REPORT. Do not tag, push or start Phase 11.
```

### D. Automated verification

```bash
npm run verify
npx vitest run src/engine src/levels/l05 src/levels/l06 src/components/charts src/game
```

Both must pass. The report must show at least 40 new assertions and the registry-integrity test.

### E. VERIFY Phase 10

Use the Dev Panel to unlock all levels.

1. `npm run verify` passes.
2. **Hub.** Level 5 and Level 6 cards show the counts of the active configuration: normal `Stages 0/3 - Side ops 0/2 - Bonus 0/2` for both; lean Level 5 `0/2 - 0/1 - 0/2`, lean Level 6 `0/2 - 0/1 - 0/1`. The numbers must equal the registry, not hard-coded text. Their titles and syllabus lines match your AGENTS.md.
3. **Level 5, Stage 1.** Build `group by department, value cgpa, median`. A table appears and the pandas line `df.groupby('department')['cgpa'].median()` is shown. When your table's top row is the right department the goal card turns green. Build year with mean of `dropped_out` for the second goal. In the third goal, choose "mean" for `study_hours`: the simulator shows the mean sitting above what a typical student studies and explains why median is better.
4. **Level 5, Stage 2.** For "show the shape of attendance" choose a **bar** chart: marked misleading with a reason. Choose histogram: accepted. Drag the bins slider to 2 and then to 80: a computed warning appears each time. For the bar brief toggle "y-axis starts at zero" off: a truncation warning appears.
5. **Level 5, Stage 3.** Drag or use the arrow keys to select attendance 35 to 60: the panel shows dropout rate inside vs outside and a lift of 2 or more. Select a tiny range: the goal does not turn green (it must cover 15 percent). Build an insight without the caveat chip: it is refused. Add the caveat: accepted.
6. **Level 5 side ops.** Misleading Chart: fix all three. Outlier Hunt: with k = 1.5 you see precision and recall numbers, with k = 6 recall drops.
7. **Level 5 debrief.** Rating letter, breakdown bars, decisions list, fragment F5. Bonus tab: 'Right First Time' and 'No Assistance' show earned or not correctly; the hidden bonus shows ??? unless your Stage 3 boundary was near attendance 60.
8. **Level 6, Stage 1.** Random sampling, n = 5, REPEAT x100: a wide histogram of means. Raise n to 200: it narrows and the standard error falls below 0.10. Switch to convenience and n = 500: the centre stays off the true mean line. Answer the "bigger sample" question wrongly: the simulator shows the bias is still there.
9. **Level 6, Stage 2.** Drag the pairs into an order and reveal r values: your order is scored. In the Anscombe panel the four panels show the same r but different shapes. In the Confounder case move the stratification slider to 3 bands: the within-band correlation drops sharply and the explanation says why.
10. **Level 6, Stage 3.** Run 1000 shuffles: a histogram with the observed value marked and a p-value appear. Choose the wrong verdict for your p-value: it is refused with a reason. In the FISHING TRIP, at least one of 20 noise comparisons shows as "significant" at 0.05; apply Bonferroni and it disappears. Press RE-RUN WITH NEW SEED three times for the 'Replicator' bonus.
11. **Level 6 side ops and debrief.** Distribution Detective and Coverage Casino both complete (coverage near the chosen confidence level, for example about 95 out of 100). Debrief shows fragment F6.
12. **Look different.** Level 5, Level 6 and Level 4 look and feel clearly different (dashboard vs lab bench vs spreadsheet) but use the same colours and fonts.
13. **Refresh safety (session persistence).** In each level make a few moves in Stage 1 and note one seed-dependent number (the department table in Level 5, the true mean in Level 6). Press F5: you return to the same stage with the same numbers, selections and counters (hints, mistakes), and in DevTools `levels[n].attempts` has not changed. Advance to Stage 2 and press F5: Stage 2 opens. Then, in DevTools, edit `nexus-l06-session` and reload after each change: (a) break the JSON, (b) set `"seed"` to 1, (c) set `"stageId"` to `"nope"`: each shows the toast 'Saved session was damaged, the mission starts over', lands on the briefing, and leaves `attempts` unchanged. (d) Put a string where a number belongs inside one stage's state: only that stage resets, with a toast. Never a white page. Side ops restart from their first screen.
14. **Console.** F12 shows no red errors on any of the above.

**Lean mode (cut-line 3).** Skip every check for something that was removed: Level 5 Stage 3, 'Outlier Hunt' and 'Dropout Cliff' (steps 5, the second half of 6, and the hidden bonus in 7); Level 6 'Correlation Court', the FISHING TRIP, 'Distribution Detective', 'Replicator' and 'Fishing Expedition' (step 9, parts of 10 and 11). Level 6's remaining stages are numbered 1 and 2. Instead check that the hub counts and the debrief bonus tab show exactly the lean counts.

**Failure signs:** goal cards that turn green without the right result; charts that crash on tiny selections; the same numbers on every replay (replays must use a new seed through `attempts`); a refresh that changes the seed or the displayed numbers; `attempts` that changes on F5, REPLAY or CONTINUE; any count on a screen that disagrees with the registry.

### F. Completion report

`PHASE 10 REPORT` per AGENTS.md section 9. It must list the new shared modules, the coefficients used in the cohort generator, which [STRETCH] items (if any) were skipped, the active configuration (normal or lean) with the exact registry counts, and the tightest margin observed for each cohort invariant (A2) and each statsLab guarantee (B1).

### G. Git checkpoint

**You run these commands, not OpenCode.** All 14 checks pass (in lean mode, all that apply):

```bash
git tag phase-10 && git push origin main --tags
```

If you ran it in two bites, tag only now. To cut scope under time pressure see Part E (cut-line 3).

---

## Phase 11: Level 07 and the campaign ending

### A. Objective

Make the final syllabus level (regression and model evaluation) playable and finish the campaign: a final mission debrief, a story ending that ties the seven fragments together, a campaign summary with the final rank, and a persisted "campaign complete" state.

### B. Dependencies

Phase 10 (cohort generator, `stats.ts`, charts, and the shared helpers recorded in docs/PROGRESS.md: getRegistryCounts, missionSession and parseSession, sessionSeed, mixSeed, the FIX RULE), Phase 9 (debrief extensions, stats keys, adaptive, startMission and attempts), Phases 2 and 3 (store, shell). Phase 11 never edits Levels 1 to 6. Whether Levels 5 and 6 are normal or lean, it reads whatever the registry holds and never assumes three stages or two side ops for them.

### C. Paste into OpenCode

```text
PHASE 11 - Level 07 (PREDICTION CORE) and the campaign ending. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Inspect: src/engine/cohort.ts, stats.ts, config.ts, src/components/charts/*, src/shell/*, src/game/store.ts, types.ts, registry.ts, src/levels/l05 and l06 (for structure), src/pages (Hub, Title, Debrief). Items marked [CORE] must be finished; [STRETCH] only after CORE passes npm run verify.

RULES: same plumbing as other levels (3 main stages, MAIN_XP 260, fragment F7, 3 hints per stage and per side op, and, unless I pasted the line 'Skip the side op Outlier Influence', 2 side ops, 2 visible bonuses and 1 hidden bonus). If I skipped 'Outlier Influence', Level 7 has 1 side op ('Residual Reading') and its row in EXPECTED_SHAPE (Phase 10 item C) changes to match. Every count shown or tested outside that one table (side-op total, bonus totals, hidden total) comes from getRegistryCounts(registry); never hard-code 14 or any other total. No chart or maths library. All maths pure, seeded and tested; nothing may call Math.random(). Show the equivalent scikit-learn style line next to every result (text only). Interface style: MODEL WORKSHOP, a control panel plus a live plot area (distinct from the other levels). Not a quiz.

1. [CORE] src/levels/l07/regression.ts (pure): ols(X, y) with an intercept, solved by the normal equations with Gaussian elimination and partial pivoting; a pivot smaller than 1e-12 times the largest absolute matrix entry counts as singular and returns a clear error ('features are perfectly correlated'). predict, r2 (1 - SSE/SST; if SST is 0 return 1 when SSE is 0, otherwise 0), adjustedR2, mae, rmse, residuals, trainTestSplit(n, testFraction, seed) (disjoint, deterministic), polynomialFeatures(x, degree) (callers first rescale x to [-1, 1] using the TRAINING range, so degree 9 stays numerically stable), and:
 - prepareL07Data(seed) = generateCohort({seed, n: 300}) plus a LEAK column final_grade_points = round(cgpa*24 + normal(0, 0.5), 1). It returns {working: 240 rows, holdout: 60 rows} from a seeded split, and the hold-out is SEALED: only a function evaluateHoldout(model) inside a module-private closure can read it. No component, selector, split, plot, 'best legitimate model' computation or model-comparison table may import or receive hold-out rows before the first SUBMIT FORECAST. The 'best legitimate model' and gap shown in Stage 2 are computed on working data only.
 - makeOverfitData(seed) for Stage 3 part 1. It does NOT use cohort cgpa, which is nearly linear and would never show a U-shaped validation curve. x lies on a fixed evenly spaced grid in [-1, 1] (25 training points on the grid with seeded jitter, 100 validation points on a finer fixed grid) and y = a fixed cubic-plus-wiggle truth function from config plus normal(0, OVERFIT_NOISE). Tune the truth and the noise in config so that, for EVERY seed slot and degrees 1 to 9: train RMSE never increases with degree (tolerance 1e-9); the degree with the lowest validation RMSE is 3, 4 or 5 (ties go to the lower degree); and the validation RMSE at degree 1 and at degree 9 are each at least 1.25 times that minimum. FIX RULE from Phase 10 A2 applies: change the truth, the noise or a salt, never the thresholds.
 Tests (at least 24 assertions): exact fit on y = 2x + 1 gives r2 = 1; known small multi-feature solution; singular input error; split disjoint and deterministic; polynomial features; r2 and rmse on a hand example; r2 with constant y; a degree-9 fit on makeOverfitData does not return a singular error; the U-shape guarantee above for every slot; for every slot the leak feature gives test r2 above 0.97 while the best legitimate model stays between 0.4 and 0.97; Stage 1 slider reachability (for every slot the slider-snapped least-squares line has SSE at most 1.05 times the minimum, and the OLS slope and intercept lie inside the slider ranges); Stage 2 goal reachability (for every slot the all-legitimate-features model meets the goal on the default split); HOLD-OUT ISOLATION: prepareL07Data(seed, {poisonHoldout: true}) is a test-only option that replaces the hold-out y values by NaN, and every pre-submit output (Stage 2 FIT panels for three feature sets, the best legitimate model and its gap, the Stage 3 splits and validation numbers) must be identical with and without it.

2. [CORE] Level 07 'FINAL FORECAST' (src/levels/l07/). Scenario: the Dean needs a forecast of student cgpa from habits before the semester starts, and the board will check it on students the model has never seen.
 Stage 1 'Fit the Line' (LineFitLab): scatter of study_hours vs cgpa (60 points) with slope and intercept sliders or draggable handles, residual segments, and live SSE, MSE and r2. Goals: (a) get SSE within 15 percent of the least-squares minimum; (b) after the goal, REVEAL LEAST SQUARES and compare coefficients; (c) predict cgpa for a given study_hours value and read the interpretation of the slope through a ChoiceSimulator ('each extra weekly study hour is associated with about x more cgpa').
 Stage 2 'Build and Evaluate' (ModelWorkshop): feature chips (attendance, study_hours, sleep_hours, year, scholarship as 0/1, library_visits, final_grade_points), a test-fraction slider (10 to 40 percent) with a seed, and FIT. Panels: coefficient table with a plain-language sentence per coefficient, predicted vs actual scatter (train and test in different colours with a legend), residual plot, and a metric table (r2, MAE, RMSE for train and test). Each FIT also computes, on the same split, the best legitimate model (all features except the leak) and shows the gap. Goal: test r2 within 5 percent of that best legitimate r2 (relative: testR2 >= 0.95 * best legitimate test r2), with NO leak feature selected. If final_grade_points is selected and test r2 exceeds 0.97, show 'too good to be true: could you know this before cgpa exists?' and do not accept the goal. Adding library_visits next to study_hours must show the coefficient change versus the previous fit (computed) with a short note on correlated features. A REPORT LEAK button lets the player flag the leak feature (checked against the real leak column). Code panel: train_test_split, fit, r2_score.
 Stage 3 'Overfit Trap and Final Forecast' (OverfitLab + HoldOut): part 1 uses makeOverfitData (item 1): 25 training points and 100 validation points on one feature; a polynomial degree slider (1 to 9); the fitted curve over the points; a chart of train RMSE and validation RMSE against degree (the validation curve is U-shaped on every seed, guaranteed by item 1). Goal: pick the degree with the lowest VALIDATION RMSE (one degree of tolerance; degree 1 and degree 9 are never accepted), then answer a ChoiceSimulator 'why is training error a poor guide?' that runs the consequence. Part 2, FINAL FORECAST: the working data (240 rows) has a fixed seeded split of 180 train and 60 validation rows, and the separate 60-row hold-out is sealed. The final model is fitted on the 180 TRAIN rows only; valR2 is its r2 on the 60 validation rows; the hold-out is never used for fitting, feature choice, degree choice or any displayed number before the first SUBMIT FORECAST. The player picks a final model (features, optional polynomial) using only train and validation numbers, then presses SUBMIT FORECAST: hold-out RMSE and r2 are revealed beside the validation numbers. The FIRST submission is the SCORED one. Later submissions are allowed for exploration: each shows its hold-out numbers and marks the run as peeked, but never replaces the scored result, so hold-out numbers cannot be used to tune a better score. Scoring (pure scoreForecast): fits = Stage 2 FIT presses plus part 2 model fits (degree slider moves in part 1 are not fits); achievableR2 = hold-out r2 of the best legitimate linear model (all features except the leak, fitted on the same 180 train rows), computed inside evaluateHoldout only after the first submission; accuracy = clamp(holdoutR2 / max(achievableR2, ACHIEVABLE_FLOOR), 0, 1) with ACHIEVABLE_FLOOR = 0.10 in config.ts, accuracy 0 when holdoutR2 is not finite, and a non-finite achievableR2 treated as the floor, so a zero, negative or NaN achievableR2 can never divide by zero or flip a sign; decisionQuality = 1 without the leak and 0.2 with it, minus 0.2 if peeked (floor 0); efficiency = 1 for at most 8 fits, otherwise 8 divided by fits (floor 0.3). For every slot achievableR2 is at least 0.4 (tested), so the floor is a safety net and not the normal path.
 Side op 'Outlier Influence': a scatter where the player can drag one extreme point; the fitted line moves; they toggle EXCLUDE and see a computed leave-one-out slope change, then decide whether removal is justified (decisions logged, explained).
 Side op 'Residual Reading': three residual plots (random, curved, funnel). The player diagnoses each and applies a fix (add a squared term, or a log transform of the target); the residual pattern is re-checked by a computed measure (for example the correlation of residuals with the squared fitted values).
 Bonuses: visible 'Honest Model' (hold-out r2 of the scored submission within 0.05 of validation r2, not peeked, and no leak feature in the final model), visible 'Minimalist' (test r2 within 10 percent of the best legitimate r2 using at most 2 features), HIDDEN 'Leak Detector' (REPORT LEAK pressed on the true leak column). Fragment F7. Store LevelProgress.stats: holdoutR2 (of the scored submission), valR2, peeked, leakReported.

2a. [CORE] Level 7 persistence. Use missionSession (Phase 10 A5) with levelId 7 and seed sessionSeed(7, attemptIndex); the Level 7 `state` contents are listed in A5c. The submissions list, the scored result, the fit count and the peeked flag MUST be persisted, so a refresh can neither reset the peek penalty nor re-roll anything. Restore recomputes the dataset, the splits, the fits and the plots from the seed and the persisted inputs; the hold-out rows themselves are never persisted. Invalid data follows A5e. Tests: after two submissions a refresh round trip keeps peeked true and the scored result unchanged; a damaged record restarts the level with a toast and does not change attempts.

3. [CORE] Campaign ending. (a) Add campaignComplete (boolean) and campaignCompletedAt to the save, set ONCE when Level 7's main mission completes (persist migration for old saves); (b) the Level 7 debrief gets a CONTINUE TO FINALE button, shown only after the debrief rewards; (c) route /ending: a story sequence of at least 7 typewriter cards (Enter or click advances, a SKIP button, keyboard accessible, reduced-motion safe). Cards recap fragments F1 to F7 in order as 'memory restored' with the level title, then the final NEXUS message from AGENTS.md section 8; (d) a CAMPAIGN SUMMARY screen after the story, from a pure buildCampaignSummary(save, registry): final rank name and XP, credits, rating per level (S/A/B/C), side ops done out of the registry total, visible and hidden bonuses earned out of the registry totals (all totals from getRegistryCounts, never hard-coded, so the screen is right in normal and lean builds), best Level 04 integrity and efficiency, and a short line about the adaptive tiers used; (e) the hub shows a CAMPAIGN COMPLETE banner and a REPLAY FINALE button once campaignComplete is true; the title screen shows a 'NEXUS RESTORED' line; (f) add a DEV_ONLY 'Complete all levels (dev)' button to the DevPanel that completes levels 1 to 7 through the real store actions.

4. [CORE] Tests (at least 25 new assertions in addition to item 1's): Stage 2 goal and leak rules, hold-out scoring (accuracy with achievableR2 of 0, negative, NaN and tiny positive; holdoutR2 negative, NaN and above achievable; decisionQuality; efficiency including 0 fits; the first-submission-is-scored rule and the peek penalty), bonus evaluators (including 'Honest Model' false when the leak is used), validation-RMSE degree selection, campaignComplete set once and persisted, buildCampaignSummary run against a normal fixture registry and a lean fixture registry (counts equal the getRegistryCounts totals), registry integrity test still passes with real Level 7 data.

5. [STRETCH] A 'Model comparison' table in the Level 7 debrief listing every model the player fitted (features, test r2, RMSE).

6. Update docs/PROGRESS.md (L07 modules, stats keys, ending flow, placeholders closed). All level placeholders must now be gone.

DONE WHEN: npm run verify passes and a full campaign can be completed from the title screen to the summary screen. Commit 'feat(phase-11): level 7 and campaign ending' and print PHASE 11 REPORT. Do not tag, push or start Phase 12.
```

### D. Automated verification

```bash
npm run verify
npx vitest run src/levels/l07 src/game
```

Both must pass, with at least 25 new assertions.

### E. VERIFY Phase 11

1. `npm run verify` passes.
2. Dev Panel, Unlock all levels. The Level 7 card reads `Stages 0/3 - Side ops 0/N - Bonus 0/2`, where N is 2 (or 1 if you skipped 'Outlier Influence'); it must equal the registry.
3. **Stage 1.** Move the slope and intercept sliders: the residual segments, SSE and r2 update live. Get close to the best line: the goal card turns green. REVEAL LEAST SQUARES: coefficients and the code line `LinearRegression().fit(X, y)` appear.
4. **Stage 2, honest model.** Select `attendance` and `study_hours`, test fraction 25 percent, FIT. You see a coefficient table with sentences, a predicted vs actual plot, a residual plot, and a metric table for train and test. The panel shows your test r2 and the gap to the best legitimate model on your split; with these two features you should be a few percent short of the 5 percent target (from the generator coefficients, `sleep_hours` is the next most useful feature). Add `sleep_hours`: the gap closes to within 5 percent and the goal turns green. (If it turns green earlier or later on your seed, that is fine as long as the displayed gap and the goal card agree.)
5. **Stage 2, leak.** Add `final_grade_points`: r2 jumps above 0.97, the "too good to be true" warning appears and the goal is **not** accepted. Press REPORT LEAK for the hidden bonus. Remove the leak.
6. **Correlated features.** Add `library_visits` next to `study_hours`: a note shows how the `study_hours` coefficient moved and why.
7. **Stage 3, overfitting.** Drag the degree slider from 1 to 9: the train RMSE keeps falling while the validation RMSE falls and then rises (this part uses its own nonlinear dataset, so on every seed the lowest validation RMSE sits at degree 3 to 5). Choose a high degree: the goal is refused with an explanation. Choose the lowest-validation degree: accepted.
8. **Stage 3, final forecast.** Pick a model and SUBMIT FORECAST: hold-out RMSE and r2 appear beside the validation numbers. A second submission is allowed and shows "peeked", but the debrief still scores your FIRST submission. Press F5 after the second submission: peeked is still true and the scored result is unchanged. For 'Honest Model', submit once.
9. **Side ops.** Outlier Influence: dragging the extreme point moves the line and the leave-one-out change is shown. Residual Reading: all three plots can be diagnosed and fixed.
10. **Debrief.** Rating letter, breakdown, decisions list, fragment F7, XP and credits. Bonus tab shows your result for 'Honest Model' and 'Minimalist' and the hidden bonus.
11. **Ending.** CONTINUE TO FINALE opens `/ending`: at least 7 typewriter cards, Enter advances, SKIP works. The summary screen shows final rank, XP, credits, a rating per level, side ops out of the registry total (14 in the normal build) and bonuses out of their registry totals.
12. **Campaign complete state.** Press F5: you are not forced into the ending again. The hub shows CAMPAIGN COMPLETE and REPLAY FINALE. The title screen shows NEXUS RESTORED. Complete Level 7 a second time with the Dev Panel: `campaignCompletedAt` does not change (set once).
13. **Dev shortcut.** Reset save, press 'Complete all levels (dev)': the hub shows all seven levels COMPLETED and the final rank matches the summary.
14. F12 shows no red errors.

### F. Completion report

`PHASE 11 REPORT` per AGENTS.md section 9, plus: the exact scoring formula used for the hold-out stage, ACHIEVABLE_FLOOR, and the value of `achievableR2` for one seed.

### G. Git checkpoint

**You run these commands, not OpenCode.** All 14 checks pass:

```bash
git tag phase-11 && git push origin main --tags
```

---

## Phase 12: Achievements, settings, sound, polish and robustness

### A. Objective

Finish the game-wide systems: a real achievements system, a real settings page, a Tool Bay that gives credits something to buy, synthesised sound, responsive and accessible layouts, and save reliability (migration, corruption recovery, import and export). Working features first, decoration last.

### B. Dependencies

Phases 2, 9, 10, 11 (store, `LevelProgress.stats`, all seven levels, `campaignComplete`).

**Cut-line 1 (original kit):** if you are behind, paste the prompt with the line `Implement only the [CORE] items (1, 4 and 7).` It skips sound (2), Tool Bay (3), polish (5) and the accessibility pass (6). The prompt then removes the Tool Bay panel from the hub and any sound controls, so nothing fake is left on screen.

### C. Paste into OpenCode

```text
PHASE 12 - Game-wide systems and polish. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Inspect: src/game/store.ts, types.ts, progression.ts, config.ts, levels/registry.ts, src/pages/* (Title, Hub, Debrief, Ending), src/ui/*, src/app/App.tsx, DevPanel.tsx. [CORE] items are 1, 4 and 7. Items 2, 3, 5, 6 are optional and only to be done if I did not say 'Implement only the CORE items'. If items 2 or 3 are skipped, REMOVE the sound controls and the hub Tool Bay panel (no locked placeholders may remain).

1. [CORE] ACHIEVEMENTS. src/game/achievements.ts (pure): an ACHIEVEMENTS array of {id, title, description, secret?, progress?(save), check(save, registry)} and evaluateAchievements(save, registry) returning earned ids. Every count-based threshold is DERIVED from getRegistryCounts(registry), which `check` and `progress` receive as an argument, so each rule stays reachable in normal and lean builds. Catalogue (20 in the full build; the real size is ACHIEVEMENTS.length and is never hard-coded):
   first-contact (complete Level 1); halfway (complete Level 4); campaign-complete (campaignComplete true); s-rank (S on any level); all-s (S on all seven); self-reliant (finish any main mission with zero hints: levels[n].stats.minHints === 0); bonus-hunter (min(5, registry bonus total) bonuses earned in total); secret-seeker (min(3, registry hidden-bonus total) hidden bonuses earned; look hidden status up in the registry; omit this achievement if the registry has no hidden bonuses); field-agent (at least half of the registry's side ops done, rounded up); full-spectrum (every side op in the registry done); data-janitor (Level 4 stats.bestIntegrity at least 95); expert-cleaner (stats.tiersCleared contains expert); all-clearances (contains all three tiers); ghost-hunter (SECRET; stats.ghostsFound at least 4); par-ace (stats.bestEfficiency at least 99.9); honest-forecaster (Level 7 stats: holdoutR2 present, peeked false, abs(holdoutR2 - valR2) at most 0.05); leak-detector (SECRET; Level 7 stats.leakReported true); rank-analyst (rank Analyst or higher) ; rank-architect (top rank); supply-run (owns at least one Tool Bay item; if Tool Bay is skipped, drop this one so one fewer remains).
   Store: extend completeMission to record levels[n].stats.minHints (the minimum hintsUsed over completions). Add syncAchievements() called after completeMission, completeSideOp, completeBonus and any purchase; it adds newly earned ids ONCE, persists them, and returns the new ones so the UI shows an 'ACHIEVEMENT UNLOCKED' toast. Page /achievements: card grid (earned or locked, numeric progress such as 'side ops 5 of N' with N from the registry), secret ones show ??? until earned; the hub link now opens this page; add an achievements row to the campaign summary screen.

2. [OPTIONAL] SOUND. src/game/sound.ts using the Web Audio API only (synthesised tones, no audio files): click, success, error, rank-up, achievement, reveal. Master volume; respects profile.soundOn; creates the AudioContext only after the first user gesture; must not throw when AudioContext is missing (jsdom). Play sounds on: toast success and error, rank-up, achievement, story reveal, and a quiet click on NeonButton.

3. [OPTIONAL] TOOL BAY. Replace the locked hub placeholder with a real panel and a /toolbay page. Items (credits): accent themes Magenta Grid (200), Amber Terminal (300), Matrix Green (300). Cyan is free and default. Buying deducts credits, adds the id to save.owned, and the theme can be applied from the Tool Bay or Settings by overriding the accent CSS variable. Not enough credits: the button is disabled with a tooltip showing the missing amount. Pure functions in src/game/toolbay.ts (canBuy, buy) with tests.

4. [CORE] SETTINGS. Make the Title SETTINGS button and a hub link open /settings: sound on or off and volume (only if item 2 exists), reduced motion (Auto, On, Off; CSS class on the root; Auto follows prefers-reduced-motion), text size (100 and 115 percent), theme (owned themes only; just cyan if Tool Bay is skipped), EXPORT SAVE (downloads a .json file via Blob), IMPORT SAVE (file input and paste box; uses importSave validation; shows the exact error on failure and NEVER half-applies a bad file), RESET SAVE (confirm Modal where the player must type RESET; clears every 'nexus-' localStorage key).

5. [OPTIONAL] POLISH. Fade route transitions (CSS, honours reduced motion); React.lazy and Suspense for level pages with a themed loading skeleton; a themed empty state for lists; consistent button press and hover states; page titles per route; favicon (inline SVG data URI); a responsive pass at 768, 1024, 1366 and 1920 px wide with no horizontal scrollbar; under 768 px show a friendly 'best on a larger screen' notice instead of a broken layout.

6. [OPTIONAL] ACCESSIBILITY PASS. Keyboard walkthrough of every mechanic (DragSort has the click fallback; charts, brushes and sliders work with arrow keys); a skip-to-content link; focus moves into modals and returns on close; toasts live in an aria-live region; every icon-only button has an aria-label; charts have computed text summaries; check muted text contrast is at least 4.5:1; honour reduced motion everywhere including the typewriter and count-up animations (show final values immediately).

7. [CORE] ROBUSTNESS AND SAVE RELIABILITY. (a) migrateSave(raw) in the store that upgrades older shapes (missing attempts, stats, campaignComplete, owned) and is called by persist 'migrate' and by importSave; (b) a corrupted or unreadable save shows a themed RECOVERY screen with EXPORT RAW DATA, RESET and TRY AGAIN, never a white page; (c) a per-route ErrorBoundary with a RETURN TO HUB button; (d) every localStorage read and write in try/catch, with an in-memory fallback and a visible banner 'Progress will not be saved in this browser mode' when storage is unavailable; (e) an invalid level session record restarts that level cleanly with a toast: Levels 5 to 7 go through parseSession (Phase 10 A5, including its repair rules), Level 4 through its own validation, and neither changes `attempts`; (f) unknown level ids, locked levels and /level/N/debrief with no finished mission all redirect to the hub with a toast; (g) QuotaExceeded on save shows one toast and the game continues.

TESTS (at least 25 new assertions): every achievement rule true and false, syncAchievements adds once, stats.minHints recording, toolbay canBuy and buy (if built), settings state, migrateSave from three older shapes, corrupt-save recovery, importSave rejects bad files without changing state, storage-unavailable fallback, sound module does not throw without AudioContext (if built), resetAll clears all 'nexus-' keys, achievement thresholds derived from the registry (run every count-based rule against a normal fixture registry and a lean fixture registry and assert each is reachable in both).

Update docs/PROGRESS.md (achievements API, settings, robustness rules, what was skipped). DONE WHEN: npm run verify passes and there are no locked placeholders left on any screen. Commit 'feat(phase-12): systems and polish' and print PHASE 12 REPORT. Do not tag, push or start Phase 13.
```

### D. Automated verification

```bash
npm run verify
npx vitest run src/game
```

Both must pass, with at least 25 new assertions.

### E. VERIFY Phase 12

Use the dev server. Where an item was skipped, skip its checks.

1. `npm run verify` passes.
2. **Achievements.** Open `/achievements`. Dev Panel, Unlock all levels, then complete Level 1: an "ACHIEVEMENT UNLOCKED" toast for FIRST CONTACT appears once. Refresh: it stays earned and does not toast again. Secret ones show ???.
3. **Progress numbers.** Complete one side op: the 'field-agent' card shows `1 of N`, where N is half of the registry's side-op total rounded up (7 in the normal build).
4. **All-levels test.** Reset save, Dev Panel, "Complete all levels (dev)": the achievements page shows `campaign-complete`, and the rank-based ones that match your XP. The summary screen has an achievements row.
5. **Settings.** Title, SETTINGS opens `/settings`. Toggle text size to 115 percent: text grows on every page. Toggle reduced motion On: typewriter and count-up show final values immediately.
6. **Export and import.** EXPORT SAVE downloads a `.json`. Reset save (type RESET, confirm): hub is empty, CONTINUE is disabled. IMPORT the file: progress returns exactly. Now IMPORT a file you broke by hand (delete a closing brace): a clear error appears and your current save is untouched.
7. **Corruption.** In the browser DevTools Application tab, edit `nexus-save-v1` to invalid JSON and reload: a themed RECOVERY screen appears with EXPORT RAW DATA, RESET and TRY AGAIN. No white page.
8. **Bad routes.** Visit `#/level/9`, `#/level/5/debrief` on a fresh save, and `#/nonsense`: each lands on a themed screen or the hub with a toast.
9. **Tool Bay (if built).** With enough credits (Dev Panel, Add 500 XP) buy Magenta Grid: credits drop by 200, the accent colour changes everywhere, the achievement `supply-run` unlocks. With too little credit the button is disabled with a tooltip.
10. **Sound (if built).** Sound on: a click sound on buttons and a tone on success. Sound off in Settings: silence. No sound plays before your first click.
11. **Responsive (if built).** Resize between 768 and 1920 px: no horizontal scrollbar on Title, Hub, a level briefing and Level 4's workspace. At 700 px the "larger screen" notice appears.
12. **Keyboard (if built).** Use only Tab, Shift+Tab, Enter, Space, Esc and arrow keys to start a game, open Level 1 and place one item in Stage 1 with the click fallback. Focus is always visible and Esc closes modals.
13. **No placeholders.** Search the hub and title for "coming soon", "locked placeholder" and "Mission workspace": none are visible.
14. F12 console: no red errors during the above.

### F. Completion report

`PHASE 12 REPORT` per AGENTS.md section 9, plus the list of items skipped (so the README can mention them honestly).

### G. Git checkpoint

**You run these commands, not OpenCode.** All checks pass:

```bash
git tag phase-12 && git push origin main --tags
```

---

## Phase 13: Final audit, README, deployment and submission

### A. Objective

Prove the game builds, passes its tests and plays from a clean clone; remove development-only behaviour from the production build; write the README; prepare deployment; audit Git and secrets; prepare everything so that you can push and confirm the remote yourself (OpenCode never tags or pushes). This phase is **mandatory** and is never cut.

### B. Dependencies

Phases 1 to 12 tagged (or Phase 12 consciously skipped to its CORE items).

### C. Paste into OpenCode

```text
PHASE 13 - Final audit, README, deployment instructions, submission prep. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Do NOT add features. You may only fix defects the audit finds, remove dev-only behaviour, add tests, and write documentation. Items marked [STRETCH] only after the CORE items pass.

1. [CORE] FULL VERIFICATION. Run npm run verify. Fix any failure. Also run the build exactly as it will be deployed: VITE_BASE=/nexus-idse-game/ npm run build. Report the bundle sizes; if any single JS chunk is over 800 kB, add React.lazy code splitting for level pages [STRETCH if already split].

2. [CORE] REMOVE DEV-ONLY BEHAVIOUR FROM PRODUCTION. Search the code for DEV_ONLY and for the strings 'nexus-dev', '(dev)', 'DevPanel', '/dev/'. After this item: DevPanel, the routes /dev/ui and /dev/engine, the 'Complete mission (dev)' buttons, and the adaptive and 'Complete all levels' dev buttons render ONLY when import.meta.env.DEV is true; the localStorage 'nexus-dev' escape hatch is removed; unused dev pages are not in the production bundle (lazy import them behind the DEV check). Proof: after npm run build, grep -r "Complete mission (dev)" dist and grep -r "Complete all levels" dist must print nothing.

3. [CORE] PLACEHOLDER AND UNSAFE-CODE SWEEP. Search src and dist for: 'coming soon', 'placeholder' (as UI text), 'TODO', 'FIXME', 'Mission workspace', 'lorem', 'console.log', 'debugger'. Fix or remove every user-visible one; list any justified leftovers. Search src (excluding __tests__) for 'eval(' and 'new Function': there must be none. Check there are no external URLs in src or index.html except documentation comments (no CDN, no remote fonts or images).

4. [CORE] AUDIT TESTS (src/test/audit.test.ts, vitest). (a) Route smoke: render every route (/, /new, /hub, /level/1 to /level/7, their /play and /debrief, /achievements, /settings, /ending, an unknown route) with a fresh save and with an all-complete save; nothing may throw, locked routes must redirect. (b) Campaign headless: complete levels 1 to 7 in order through the real store actions; assert the unlock chain, that XP never decreases, that replays pay only improvements, that attempts increases exactly once per started mission (never on REPLAY or a refresh), that bonuses and side ops pay once, rank thresholds, campaignComplete set once, and the achievements that must be earned. (c) Level 04 golden test: generate assisted seed 42, run the 9-command perfect script through the parser and session; assert shape (44, 9), consistency 1, preservation 1, integrity 92.5 and efficiency about 88.9 when no flags are submitted; then undo all 9 steps and redo all 9 and assert identical dataframes; assert a failed op does not enter history. (d) Save: round trip export/import; migrateSave from older shapes; corrupt save recovery; resetAll clears every 'nexus-' key. (e) Registry integrity: counts per level equal getRegistryCounts(registry) and the EXPECTED_SHAPE table for the active configuration (normal or lean), 3 hints everywhere, unique ids; plus a session test: for Levels 5 to 7 a saved session restores with the same seed, and a damaged one restarts cleanly without changing attempts.

5. [CORE] README.md at the repo root with these sections: title and one-line tagline; badges are NOT needed; screenshot placeholders (a table of 8 entries pointing to docs/screenshots/01-title.png, 02-hub.png, 03-level1.png, 04-level4-spreadsheet.png, 05-level4-debrief.png, 06-level5.png, 07-level6-and-7.png, 08-ending.png, each with a caption; create docs/screenshots/.gitkeep); overview and educational goals; the seven levels table (title, syllabus topic, what the player does); how to play (progression, XP, credits, ranks, side ops, bonuses, hints, difficulty tiers in Level 04); features (undo and redo history, adaptive difficulty, achievements, export and import save); tech stack; requirements (Node 20 or newer); install and run (npm ci, npm run dev); scripts table; testing (npm run verify); build and deploy (GitHub Pages with VITE_BASE=/nexus-idse-game/, why HashRouter needs no rewrites, and a drag-and-drop dist/ option for Netlify or Vercel); where saves live (localStorage keys, export and import) and how to reset; project structure (short tree); accessibility notes; known limitations (list honestly everything deferred, including anything Phase 12 skipped); credits and licence (create an MIT LICENSE with the placeholder name YOUR NAME and say so in the report).

6. [CORE] GIT AND SECRETS AUDIT. Run and paste results: git status; git log --oneline (all commits should be meaningful); git tag; git ls-files | grep -E "(^|/)(\.env|node_modules|dist|coverage)(/|$)" (must be empty); a search of tracked files for 'sk-', 'AIza', 'ghp_', 'api_key', 'apikey', 'secret', 'password'; the 20 largest tracked files (none over 1 MB). Confirm package-lock.json is tracked (needed for npm ci). Confirm .gitignore covers node_modules, dist, coverage, .env*, *.log, .DS_Store.

7. [CORE] DEPLOYMENT INSTRUCTIONS. In the README, give the exact steps: create the repo, git push, then either GitHub Pages through Actions (Settings, Pages, Source: GitHub Actions) or a drag-and-drop of dist/. [STRETCH] create .github/workflows/deploy.yml that runs on push to main: checkout, setup-node 22 with npm cache, npm ci, npm run verify with VITE_BASE=/nexus-idse-game/, upload dist as the Pages artifact, deploy-pages (use the current major versions of the official actions and say in the report which versions you used).

8. [CORE] DOCS. Update docs/PROGRESS.md to a final state: what exists, how to run, decisions, known issues, what was deferred. Make sure AGENTS.md section 8 matches the registry.

DONE WHEN: npm run verify passes, the dist grep checks are empty, the audit tests pass, README.md and LICENSE exist, and git status is clean after the commit. Commit 'chore(phase-13): final audit, README and deployment docs' and print PHASE 13 REPORT, including the output of the audit commands in item 6. Make exactly ONE commit. Do NOT run `git tag` (except the read-only listing with no arguments), do NOT push, do NOT amend or rewrite history, and run no git command that uses the network. I will do the manual verification, the screenshots and licence commit, the tag and the push myself.
```

### D. Automated verification

```bash
npm run verify
VITE_BASE=/nexus-idse-game/ npm run build
grep -r "Complete mission (dev)" dist ; grep -r "Complete all levels" dist
npx vitest run src/test/audit.test.ts
git status
```

`npm run verify` and the audit tests must pass. Both `grep` commands must print nothing. `git status` must be clean after OpenCode's commit.

### E. VERIFY Phase 13 (your manual checklist)

Do these yourself, in this order. Each item says what success looks like.

1. **Clean build.** In a normal terminal: `npm run verify`. Success: tests pass and `vite build` ends with "built in …". Failure: any red error. Use repair prompt A from the original kit.
2. **Production preview.** `npm run build && npm run preview`, open the printed URL. Success: the title screen loads. Press F12, Console: no red errors.
3. **Dev tools gone.** In the production preview open DevTools, Application tab, Local Storage, add key `nexus-dev` with value `1`, reload. Success: no dev panel appears. Visit `#/dev/ui` and `#/dev/engine`: both show the Not Found screen. Failure: any dev panel or page.
4. **Fresh-player flow (production build).** NEW GAME with callsign `Judge`, play Level 1 Stage 1 and Stage 2 properly, press F5 in the middle: your progress is kept. Success: the same stage, same state, CONTINUE works from the title.
5. **Save tools.** Settings, EXPORT SAVE, RESET SAVE (type RESET), IMPORT the file: progress returns. Success: callsign and XP are back.
6. **Broken routes.** `#/level/99`, `#/level/7/play` on a fresh save, `#/nonsense`. Success: a themed screen or a redirect with a toast, never a white page.
7. **Responsive.** DevTools device toolbar or resize the window to 768, 1024, 1366 and 1920 px wide on Title, Hub, Level 4 workspace, Level 5 and Level 7. Success: no horizontal scrollbar and nothing overlaps. Failure: clipped buttons or sideways scroll.
8. **Full campaign on the dev server.** Run `npm run dev` (dev tools exist there). Reset save. Play Level 1 and Level 4 for real (Level 4 on ASSISTED: Strategy Lab, a puzzle, side ops, debrief). Then press 'Complete all levels (dev)' and open `/ending`. Success: story cards, summary screen, rank and counts all look right, and the hub shows CAMPAIGN COMPLETE.
9. **Level 04 engine and undo.** On the dev server open `#/dev/engine`, tier ASSISTED, seed 42, GENERATE. Run the 9-command script, then UNDO nine times and REDO nine times. Success: row count returns to 47 and then to 44, and the Quality Report matches the Phase 6 verification (integrity 92.5, efficiency about 88.9).
10. **Scoring and rewards.** In the dev server, complete one level, note XP, replay and complete it again at the same quality: extra XP is 0. Success: only improvements pay.
11. **Console.** During steps 8 to 10 F12 shows no red errors.
12. **README.** Open `README.md` in your editor or on GitHub's preview. Success: all sections present, install and run steps work when you follow them literally, screenshot table present.
13. **Screenshots.** Take the 8 screenshots listed in the README table (full browser window is fine), save them with exactly those names into `docs/screenshots/`. Success: the README images load on GitHub after you push.
14. **LICENSE name.** Open `LICENSE` and replace `YOUR NAME` with your real name.
15. **Secrets and ignored files.** `git ls-files | grep -E "\.env|node_modules|dist"` prints nothing. Success: empty.
16. **Git state (you do this, not OpenCode).** `git status` is clean after you commit screenshots and the licence edit: `git add -A && git commit -m 'docs: screenshots and licence'`. `git log --oneline` reads sensibly.

### F. Completion report

`PHASE 13 REPORT` per AGENTS.md section 9, plus the full output of the audit commands from item 6 of the prompt.

### G. Git checkpoint

**You run these commands, not OpenCode.** When all 16 checks pass:

```bash
git status                      # must say: nothing to commit, working tree clean
git tag phase-13 && git push origin main --tags
git ls-remote origin            # must list refs/heads/main and the phase tags
```

Then do **Part F** below. Do not tell anyone the repo is final until the remote checks in Part F pass.

---

# PART D. Phase 14: optional expansion

**OPTIONAL. Do not start this unless Phase 13 is tagged and pushed, and you have at least 45 spare minutes. Nothing here is needed for the submission.** Pick items by number. The prompt does only the items you name.

| # | OPTIONAL item | Time | Value |
|---|---|---|---|
| 14.1 | **Demo save.** A Settings button "Load demo save" (only when the URL has `?demo=1`) that imports a prepared save with all levels unlocked, so a marker can see any level in seconds. | 15 min | High for a demo |
| 14.2 | **Study notes (Codex).** A page per level with a concept cheat sheet unlocked after that level's debrief. | 25 min | Medium |
| 14.3 | **Level 04 EXPERT+.** A fourth tier with a new corruption kind (mixed units and typos in names) and a larger dataset. | 35 min | Medium |
| 14.4 | **Playthrough stats page.** Per level: attempts, best composite, hints, side ops, time spent. | 20 min | Low |
| 14.5 | **Printable completion certificate.** A print stylesheet page with callsign, rank and date. | 15 min | Low |
| 14.6 | **Offline mode.** A small hand-written service worker and manifest (no new dependencies). | 25 min | Low |

```text
PHASE 14 (OPTIONAL) - Implement ONLY these items: <write the numbers here, for example 14.1 and 14.2>. Follow the Phase Protocol in AGENTS.md. Read AGENTS.md and docs/PROGRESS.md first. Hard limits: no new dependencies, no change to scoring, ranks, XP or saved-data shapes (only additive fields with a migration), no feature that bypasses level unlocks in a normal session (14.1 is available only when the URL contains ?demo=1 and is documented in the README), all existing tests must still pass, add tests for every item, update the README and docs/PROGRESS.md. DONE WHEN npm run verify passes. Commit 'feat(phase-14): optional <items>' and print PHASE 14 REPORT. Do not tag or push.
```

**VERIFY Phase 14:** `npm run verify` passes; each chosen item is reachable from the UI and works as described in its row; the normal game is unchanged (play Level 1 once); the README mentions the new features.

```bash
git tag phase-14 && git push origin main --tags
```

---

# PART E. Updated time plan

## E1. Estimates

Old plan for Phases 9 to 13: 3h05. Realistic: **about 5h35** (range 4h20 to 7h25), because of the larger Phase 9 scope (Strategy Lab, puzzles, side ops, adaptive, debrief), two new levels in Phase 10, and the repair loop that free models need. The cut-line plan in the last column (cut-lines 1, 3, 4 and 6) is about 4h00; adding cut-line 5 brings it to about 3h45.

| Phase | Old | Realistic | After cut-lines |
|---|---|---|---|
| 9 Finish Level 04 | 45 | 75 | 60 (CORE only) |
| 10 Levels 5 and 6 | 45 | 100 | 65 (lean levels) |
| 11 Level 7 and ending | 35 | 65 | 55 (one side op) |
| 12 Systems | 30 | 45 | 20 (items 1, 4, 7) |
| 13 Audit and submit | 30 | 50 | 40 (no deploy workflow) |
| **Total** | **185 min** | **335 min** | **240 min** |

**If everything before Phase 9 ran exactly on the old schedule** (Phase 8 finished at 5h45), the realistic plan finishes at about **11h20**, which is over a 10-hour window. The cut-line plan finishes at about **9h45**. So plan on the cut-lines from the start of Phase 9, and treat any time you save as a bonus.

## E2. Decision table: what to do at the start of Phase 9

Let R be the time you have left (including a 20-minute buffer for pushing and checking GitHub).

| Time left R | Plan |
|---|---|
| 6h or more | CORE items only, no cut-lines. Add [STRETCH] items only if a phase finishes more than 15 minutes early. |
| 5h15 to 6h | Cut-lines 1 and 4. |
| 4h40 to 5h15 | Cut-lines 1, 3 and 4 (and 6 if Phase 13 runs long). |
| 4h05 to 4h40 | All six cut-lines. Everything is minimal; no repair loop is affordable. |
| Under 4h05 | **Not enough time for all seven levels at a submittable quality.** Do not rush all of them badly. Finish Phase 9 CORE and Phase 10 lean first, push, then decide whether Level 7 fits. Whatever is tagged and verified is what you submit. The README's Known limitations section must say plainly which levels are not finished. Never submit a level that looks playable but is not. |

## E3. Checkpoints (time counted from the start of Phase 9)

| Checkpoint | Realistic | With cut-lines |
|---|---|---|
| Phase 9 tagged (Level 04 complete) | +1h15 | +1h00 |
| Phase 10 tagged (Levels 5 and 6) | +2h55 | +2h05 |
| Phase 11 tagged (Level 7 and ending) | +4h00 | +3h00 |
| Phase 12 tagged | +4h45 | +3h20 |
| Phase 13 verified and pushed | +5h35 | +4h00 |

**Rules.** If you are more than 30 minutes behind at a checkpoint, apply the next cut-line below. A failing gate gets one repair prompt and about 15 minutes; if it still fails, use the smaller-bite line ("Implement only items 1 to 4 now") instead of a third repair. Never skip a verification list to save time: a failing phase costs more later.

## E4. Cut-lines, in the order to apply them

| # | Cut | What is deferred | What remains | Saves |
|---|---|---|---|---|
| 1 | **Phase 12:** paste with `Implement only the [CORE] items (1, 4 and 7).` | Sound, Tool Bay and themes, polish, accessibility pass | Achievements page, settings, import and export, save recovery, error handling. The prompt removes the Tool Bay panel and sound controls so no fake feature stays. | about 25 min |
| 2 | **Phase 9 and 10 stretch:** skip every [STRETCH] item | CSV export, compare-two view, puzzle C | Everything CORE | 10 to 15 min |
| 3 | **Phase 10 lean levels:** first edit the Level 5 and 6 rows of AGENTS.md section 8 (counts), then paste with the line below | Level 5 loses 'Find the Pattern' (Stage 3), Level 6 loses 'Correlation Court' (Stage 2), the second side op and hidden bonus of each | Level 5: summaries, group-by and chart choice. Level 6: sampling and hypothesis testing. Both end with a debrief, fragment, XP and campaign unlock. Every count elsewhere (hub, achievements, summary) comes from the registry, so Phases 11 to 13 adapt automatically. | about 35 min |
| 4 | **Phase 11 lean:** paste with `Skip the side op 'Outlier Influence' and the [STRETCH] model comparison.` | One side op (Level 7 then has 1) | Three stages, hold-out forecast, debrief, full ending and summary; summary and achievements follow the registry automatically | about 10 to 15 min |
| 5 | **Phase 9 emergency:** skip item 3 (Field Puzzles) and the puzzle checks in VERIFY | The three field puzzles | Strategy Lab, side ops, adaptive, debrief | about 15 min |
| 6 | **Phase 13 lean:** skip the deploy workflow and chunk splitting | Automatic GitHub Pages deploy | Audit, README, deployment instructions, push | about 10 min |

Line to paste for cut-line 3:

```text
LEAN VERSION. Level 05 has Stage 1 'Know Your Data' and Stage 2 'Choose the Right Chart', the side op 'Misleading Chart', and only the visible bonuses (2). Level 06 has Stage 1 'Sampling Lab' (goals a and b only) and Stage 3 'The Verdict' without the FISHING TRIP, renumbered as Stages 1 and 2, the side op 'Coverage Casino', and only the visible bonus 'No Assistance'. Update the registry counts (Level 5: 2 stages, 1 side op, 2 bonuses; Level 6: 2 stages, 1 side op, 1 bonus) and set the Level 5 and Level 6 rows of EXPECTED_SHAPE in the registry-integrity test to match. Record 'LEAN' and the exact counts in docs/PROGRESS.md. Every other count in the game (hub, achievements, campaign summary) must come from the registry, not from these numbers. Stage ids in saved sessions come from the registry, so renumbered stages restore correctly. Everything else in the prompt stays.
```

**Never cut:** Phase 9 CORE items except under cut-line 5, all seven levels existing and playable (lean is allowed, absent is not), Phase 13 audit, README and push, and honest "Known limitations" text.

---

# PART F. Final submission checklist

Run these in order after `phase-13` is tagged and pushed.

1. **Remote has everything.** Open `https://github.com/YOUR_USERNAME/nexus-idse-game`. You should see `README.md`, `LICENSE`, `AGENTS.md`, `package.json`, `package-lock.json`, `src/`, `docs/`. You must **not** see `node_modules`, `dist`, `.env`.
2. **Tags are there.** The repo's Tags page lists `phase-1` to `phase-13` (and `phase-14` if you did it).
3. **README renders.** The GitHub README shows the overview, the levels table, install steps and the screenshot images (if the screenshots did not load, check the file names against the table and push them).
4. **Fresh-clone test.** This proves the repo works without your local files:
   ```bash
   cd /tmp && rm -rf nexus-check
   git clone git@github.com:YOUR_USERNAME/nexus-idse-game.git nexus-check
   cd nexus-check && npm ci && npm run verify && npm run preview
   ```
   Success: tests pass, build succeeds, and the preview URL shows the title screen. Failure: a missing file or dependency; fix in your project folder, commit, push, repeat.
5. **No secrets.** In the clone: `git grep -nE "sk-|AIza|ghp_|api_key|password"` prints nothing relevant.
6. **Deployed demo (optional but recommended).** If you set up Pages: repo Settings, Pages, Source: GitHub Actions. After the Action runs, open `https://YOUR_USERNAME.github.io/nexus-idse-game/`. Success: the game loads, a refresh on `#/hub` works, no console errors. If you did not deploy, the README's local run steps are enough.
7. **Final play.** In the preview or deployed build play Level 1 and Level 4 for five minutes each, as a stranger would. Look for confusing labels and for anything that says "placeholder" or "coming soon".
8. **Known limitations are honest.** The README lists everything deferred (for example any cut-line you used). Remove anything you claim that does not work.
9. **Submit.** Copy the repository URL `https://github.com/YOUR_USERNAME/nexus-idse-game` (and the deployed URL if you have one). Make sure the repo is **Public** (Settings, General, Danger Zone shows it as public).
10. **Last safety.** Do not push after submitting unless you tag it and re-run steps 4 and 5.

I have not pushed anything and cannot. Every `git tag` and `git push` above is a command for you to run.

---

# Corrections made

1. **Lean-mode consistency.** Counts are no longer hard-coded. Phase 10 item C adds `getRegistryCounts(registry)`; the hub text, achievements (`field-agent`, `full-spectrum`, `bonus-hunter`, `secret-seeker`, catalogue size, progress strings), the campaign summary (`buildCampaignSummary(save, registry)`, side ops and bonuses out of registry totals) and the verify lists all derive from it. The registry test compares against one hand-written `EXPECTED_SHAPE` table for the active configuration. Cut-lines 3 and 4 now update that table and nothing else.
2. **Phase 11 dependencies.** Phase 11 reads Levels 5 and 6 as they are in the registry, never assumes three stages or two side ops for them, and handles Level 7 with one side op if cut-line 4 is used. Its tests run against a normal and a lean fixture registry.
3. **Session persistence.** New Phase 10 item A5 (`missionSession.ts`) defines the record for Levels 5 to 7 (seed, attempt index, current stage id, per-stage inputs and counters, finished report), what is never stored (datasets, results, hold-out rows), a five-step `parseSession` recovery (whole-record reset versus per-stage repair, no change to `attempts`), and tests. Level 7 adds item 2a so the peek penalty and submissions survive a refresh. The refresh checks in Phase 10 VERIFY are now concrete.
4. **Git.** Added a responsibility table in Part C: OpenCode makes one commit and only reads git state; you verify, make the one manual commit (Phase 13 step 16), tag and push. Phase 13's objective ("push and confirm the remote") conflicted with its prompt ("do NOT push") and is fixed. Every Git checkpoint is labelled as yours.
5. **Deterministic cohort and simulations.** Attendance is stratified, dropout is assigned by rank inside attendance bands, and a scholarship effect term was added so the Level 6 verdicts are real. Seeds come from 50 fixed slots via `sessionSeed`/`mixSeed`, and every guarantee test runs over all slots, with a FIX RULE (change a coefficient or salt, never a threshold). Permutation tests use hand-computable fixtures, standard error goals use the theoretical value, CI and verdict stability are tested, the fishing trip has a guaranteed false positive that Bonferroni removes, Anscombe data are fixed constants, and Outlier Hunt injects outliers deterministically.
6. **Regression and hold-out safety.** Stage 3 part 1 uses a dedicated nonlinear dataset with a tested U-shaped validation curve and a rescaled, numerically stable polynomial basis. The hold-out is sealed, only readable after the first submission, and a poisoned-hold-out test proves it cannot influence pre-submit outputs. The first submission is the scored one. `accuracy = clamp(holdoutR2 / max(achievableR2, 0.10), 0, 1)` handles zero, negative and NaN values. `Honest Model` now also requires no leak feature, and singular-matrix detection uses a relative tolerance.
7. **Phase 9 attempt counting.** `attempts` is incremented in exactly one place (`startMission`, one `set()` call, idempotent), uses the pre-increment value for the seed, and is never touched by REPLAY, CONTINUE, F5 restore or StrictMode. The REPLAY description, tests and verify steps were updated.

Minor: `attempts` is added to `LevelProgress` for every level (Phase 10 used `levels[5].attempts` but Phase 9 only created it for Level 4), and the Phase 10 two-part run now has explicit commit messages. Phases 0 to 8, time estimates, phase structure and scope are unchanged.

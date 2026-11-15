# AGENTS.md — NEXUS master rules

> **RECONSTRUCTED FILE.** The original AGENTS.md was not available when this was written. It was rebuilt from the NEXUS Build Kit (Phases 0 to 8) and the continuation brief. Anything marked **[INFERRED]** is a decision the kit did not state explicitly. **If the real code in the repo disagrees with this file, the code wins: update this file to match the code, never the other way round.**

OpenCode reads this file at the start of every session. Read it fully, then read `docs/PROGRESS.md`, before doing anything else.

---

## 1. Project

**NEXUS** is a dark, futuristic, mission-based educational game for the course *Introduction to Data Science for Engineers* (IDSE, Semester 5). It is NOT a quiz. Players act on real data and real code-like operations and see the consequences.

- Seven syllabus levels, played as a campaign: XP, credits, ranks, story fragments, achievements, optional side operations and bonus objectives.
- **Level 04 (data cleaning with a pandas-like engine) is the educational centrepiece** and has the deepest implementation.
- Progressive coding: visual interaction, then command builder, then optional typed commands. Typing code is never required to finish a main mission.
- Adaptive difficulty (three tiers), reversible mistakes (undo, redo, history), decisions explained after the fact.
- Runs fully in the browser. No backend, no accounts, no paid services, no external network calls. Free tools and free models only.
- Final deliverable: a public GitHub repo `nexus-idse-game` with a README and a production build.

## 2. Non-negotiable rules

1. **TypeScript strict.** No `any` unless a one-line comment explains why. No `@ts-ignore` without a comment.
2. **Pure logic is separate from React.** Everything that decides correctness, scoring, generation or parsing lives in plain `.ts` files (`src/game`, `src/engine`, `src/levels/lNN/*.ts`) with unit tests. React components only render and dispatch.
3. **One source of truth.** One session object per activity. Spreadsheet, Console, Builder, Strategy Lab and puzzles all read and write the SAME session. Never duplicate dataset state in component state.
4. **No fake interactions.** Every visible button works, or it is visibly disabled with a tooltip. No mock panels that look functional. Placeholders are only allowed where a phase prompt explicitly asks for one, and each must be replaced by the phase that owns it (tracked in `docs/PROGRESS.md`).
5. **No `eval`, no `new Function`, no dynamic `import()` of user text.** User-typed commands go through the hand-written parser only.
6. **No network at runtime.** Fonts are local. No CDN links, no analytics, no remote images.
7. **No new dependencies** beyond section 3. If a phase seems to need one, stop and say so in the report instead of installing it.
8. **Seeded randomness only** (`mulberry32`). Never `Math.random()` in game logic. Same seed and tier must give identical output.
9. **Immutability in the engine.** Engine functions return new objects. Failed operations never enter history.
10. **Accessibility.** Keyboard reachable, visible focus ring (cyan), labels on controls, `aria-live` for toasts, modals trap focus and close on Esc. Respect `prefers-reduced-motion`. Colour is never the only signal (use icon or text too).
11. **Persistence is wrapped in try/catch.** localStorage can be full, blocked or corrupted. The game must still load.
12. **Do not break earlier phases.** Existing tests must keep passing. Do not rename or delete existing exports unless the phase prompt says so. Never delete or weaken a test to make it pass.
13. **Small, readable files.** One-line comment at the top of each component or module saying what it is. Prefer editing over rewriting whole files.
14. **No `console.log` in committed code.** `console.error` only inside error boundaries.
15. **Educational honesty.** Explanations must be correct pandas, NumPy, statistics and ML behaviour. Where the game simplifies (for example the pandas subset), say so in the UI.

## 3. Dependencies (exact set) **[INFERRED]**

Runtime: `react@18`, `react-dom@18`, `react-router-dom@6`, `zustand`, `lucide-react`, `@fontsource-variable/inter`, `@fontsource/orbitron`, `@fontsource/jetbrains-mono`.

Dev: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss@3`, `postcss`, `autoprefixer`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@types/react@18`, `@types/react-dom@18`, `@types/node`, `eslint` (optional).

- Drag and drop: native HTML5 plus a click-to-select fallback. No DnD library.
- Charts (Levels 05 to 07): small in-house SVG components in `src/components/charts/`. **No chart library.**
- Animation: CSS only. No animation library.
- Sound (Phase 12): Web Audio API synthesised tones. No audio files.

## 4. Repo layout **[INFERRED from the kit's file paths]**

```
AGENTS.md  docs/PROGRESS.md  index.html  package.json  vite.config.ts  tailwind.config.ts
src/
  app/            App.tsx (HashRouter, ErrorBoundary), DevPanel.tsx
  pages/          Title, NewGame, Hub, Briefing, Play, Debrief, NotFound, DevUi, DevEngine,
                  Achievements, Settings, Ending
  ui/             Panel, NeonButton, Badge, ProgressBar, Modal, Toast, Tooltip, Tabs, Kbd,
                  GridBackground, GlitchTitle, Stat
  shell/          MissionShell, useMissionFlow, useObjectives, DebriefScreen, BriefingScreen
  components/
    mechanics/    DragSort, ChoiceSimulator, StringLab, ...
    charts/       Scatter, Histogram, BarChart, LineChart, BoxPlot (SVG)
  game/           types.ts, config.ts, progression.ts, store.ts, adaptive.ts, achievements.ts,
                  levels/registry.ts
  engine/         rng, types, dataframe, ops, codegen, parser, session, fixtures, generator,
                  assess, config, cohort (Phase 10), __tests__/
  levels/         l01 ... l07  (definition.ts, engine files, components)
  test/setup.ts
```

## 5. Core types (`src/game/types.ts`) **[INFERRED shapes; names come from the kit]**

```ts
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Tier = 'assisted' | 'independent' | 'expert';   // single definition; engine re-exports it
export type Rating = 'S' | 'A' | 'B' | 'C';

export interface Decision { label: string; good: boolean | null; explanation: string; redundant?: boolean }

export interface ChallengeResult {            // what one stage or side op reports
  id: string;
  accuracy: number;          // 0..1
  decisionQuality: number;   // 0..1
  efficiency: number;        // 0..1
  hintsUsed: number;
  mistakes: number;
  decisions: Decision[];
  extra?: Record<string, number | string | boolean>;
}

export interface StageDef   { id: string; title: string; subtitle?: string; hints: string[] }
export interface SideOpDef  { id: string; title: string; blurb: string; hints: string[] }
export interface BonusDef   { id: string; title: string; description: string; hidden: boolean;
                              evaluate: (session: MissionSession) => boolean }
export interface LevelDefinition {
  id: LevelId; title: string; syllabus: string; mission: string; briefing: string;
  objectives: string[]; stages: StageDef[]; sideOps: SideOpDef[]; bonuses: BonusDef[];
  fragmentId: string;  // 'F1'..'F7'
}
export interface LevelProgress {
  unlocked: boolean; completed: boolean; bestComposite: number; bestXp: number; rating?: Rating;
  sideOpsDone: string[]; bonusesEarned: string[]; attempts: number;
  stats: Record<string, number | boolean | string>;   // per-level facts for achievements (e.g. bestIntegrity)
}
export interface PlayerProfile { callsign: string; xp: number; credits: number; theme: string; soundOn: boolean }
export interface SaveData {
  profile: PlayerProfile; levels: Record<LevelId, LevelProgress>;
  achievements: string[]; fragments: string[];
  adaptive: { history: AdaptiveEntry[] };
  campaignComplete?: boolean;      // Phase 11
  owned?: string[];                // Phase 12 Tool Bay purchases
}
export interface AdaptiveEntry { levelId: LevelId; tier: Tier; composite: number; hintsUsed: number; mistakes: number; at: number }
```

**Hub counts rule:** "Bonus x/y" counts only bonuses with `hidden: false`. Hidden bonuses show as `???` and add to x when earned. (The kit lists 2 visible + 1 hidden bonus per level but says "2 bonuses" for the hub.)

## 6. Design system **[INFERRED tokens; highlight colours are fixed by Phase 7]**

| Token | Hex | Use |
|---|---|---|
| bg | `#05070D` | page |
| panel | `#0B1020` | cards, panels |
| panel2 | `#111830` | raised areas |
| border | `#1E2A4A` | lines |
| text | `#E6ECFF` | body |
| muted | `#8A97B8` | secondary |
| cyan | `#00E5FF` | primary, focus ring, "wrong type" outline |
| magenta | `#FF2BD6` | accent, invalid values |
| amber | `#FFB020` | warnings, duplicate stripes |
| green | `#3DFF9A` | success, good decisions |
| red | `#FF4D6D` | danger, missing cells, bad decisions |
| violet | `#9B7BFF` | inconsistent labels |

Fonts: **Inter** variable (body), **Orbitron** 600 and 800 (display, wordmark, numbers), **JetBrains Mono** 400 and 600 (code, console, data). All local imports in `src/main.tsx`.
Style: glow only on primary elements, grid background, 1px borders, 8px radius, subtle motion. Desktop first (1024 px and up); usable down to 768 px; below that show a "best on a larger screen" notice.

## 7. Scoring and progression **[INFERRED numbers; constants live in `src/game/config.ts`]**

- `aggregate(results)`: mean of accuracy, decisionQuality, efficiency; sum of hintsUsed and mistakes.
- `compositeScore = 100 * (0.40*accuracy + 0.25*decisionQuality + 0.20*efficiency + 0.15*hintFactor)`, with `hintFactor = max(0.3, 1 - 0.1*hintsUsed)`.
- Rating: **S** at 90 or more, **A** at 75, **B** at 60, otherwise **C**.
- `MAIN_XP` per level: 1:120, 2:140, 3:160, 4:300, 5:180, 6:200, 7:260. `xpForMain = round(MAIN_XP * (0.4 + 0.6 * composite/100))`. Level 04 multiplies by `TIER_XP_MULT` = assisted 1.0, independent 1.25, expert 1.5.
- `xpForSideOp(hints) = max(20, 60 - 10*hints)`. `BONUS_XP`: visible 40, hidden 60. Each bonus pays once.
- Replays pay only the improvement over the previous best XP for that mission. Side ops pay once per op (improvement only).
- `creditsForXp(xp) = floor(xp / 2)`.
- Ranks (XP thresholds): Trainee 0, Junior Analyst 250, Analyst 700, Senior Analyst 1300, Lead Analyst 1900, NEXUS Architect 2600.
- Unlock rule: Level 1 unlocked at start; Level N+1 unlocks when Level N's MAIN mission completes. Side ops and bonuses never gate progress.
- Save key `nexus-save-v1` (zustand persist, version 1). Level 04 session key `nexus-l04-session`. Other level sessions use `nexus-lNN-session`. `resetAll` clears every key that starts with `nexus-`.

### Level 04 engine scoring (fixed by Phase 6, do not change)
`integrity = 30*consistency + 15*identification + 25*decisions + 20*preservation + 10*economy` (each 0 to 1). `efficiency = clamp(parOps/actualOps, 0.3, 1) * 100`, par = assisted 8, independent 12, expert 16. Efficiency is a separate score. More operations never raise any score.

## 8. Levels and story **[titles and syllabus lines for 1 to 4 follow the kit; 5 to 7 are INFERRED. Edit them to match your real syllabus before Phase 10]**

Story: NEXUS is a campus intelligence that shattered when it learned to trust dirty data. The player is a recruit rebuilding it, one level and one memory fragment at a time. Locked fragment slots read `ENCRYPTED`. Fragment text is shown with a typewriter effect at the debrief.

| Lvl | Title | Mission | Syllabus | Stages | Side ops | Bonuses (visible + hidden) | Fragment |
|---|---|---|---|---|---|---|---|
| 1 | THE INTERFACE | FIRST CONTACT | Python basics: data types, strings, lists, sets, tuples, dicts | 3 | 2 | 2 + 1 | F1 |
| 2 | LOGIC PROTOCOL | GATEKEEPER | Control flow, loops, functions | 3 | 2 | 2 + 1 | F2 |
| 3 | MATRIX CORE | SIGNAL GRID | NumPy arrays, slicing, masks, vectorisation | 3 | 2 | 2 + 1 | F3 |
| 4 | DATA VAULT **[INFERRED title]** | THE PURGE **[INFERRED]** | Pandas, data cleaning and validation | 4 | 2 | 2 + 1 | F4 |
| 5 | SIGNAL SCOPE **[INFERRED]** | FIND THE PATTERN | Exploratory analysis and visualisation | 3 | 2 | 2 + 1 | F5 |
| 6 | CHANCE ENGINE **[INFERRED]** | SIGNAL OR NOISE | Statistics: sampling, correlation, hypothesis testing | 3 | 2 | 2 + 1 | F6 |
| 7 | PREDICTION CORE **[INFERRED]** | FINAL FORECAST | Regression, model evaluation, overfitting | 3 | 2 | 2 + 1 | F7 |

Fragments **[INFERRED text]**:
- F1: "I used to know every student by name. Then the feed turned to noise and I forgot how to read."
- F2: "I learned rules. Accept, quarantine, reject. A rule is only as wise as its order."
- F3: "A hundred sensors, and one lied slowly, four tenths at a time. Nobody looked."
- F4: "Forty-seven records walked in. I trusted every one. Some were copies. Some never existed."
- F5: "When I finally looked, the pattern was plain: the students who stopped coming were the ones who left."
- F6: "A pattern is not a reason. I learned to ask whether it was signal or chance."
- F7: "Predict, then test on what you have never seen. That is the only honest forecast."
- Final message (Phase 11 ending): NEXUS thanks the player and says the lesson was never the model but the care taken with the data.

Level 04 stage names (fixed by Phases 7 and 8): 1 DATABASE BREACH, 2 IDENTIFY THE CORRUPTION, 3 DATA RECONSTRUCTION, 4 INTEGRITY CHECK.

## 9. Phase Protocol (every phase, every fresh session)

1. **Read** `AGENTS.md` and `docs/PROGRESS.md`. Run `git status` and `git log --oneline -5`. If the tree is dirty with unrelated work, say so and stop.
2. **Inspect** the existing files the phase will touch. Reuse existing components, hooks and types. Do not invent parallel versions.
3. **Plan** in at most 10 lines (files to create, files to modify, tests). Do not ask for permission for work inside the phase scope.
4. **Implement** in small steps. Write tests alongside pure logic.
5. **Verify.** Run `npm run verify` (typecheck, tests, build). Fix failures. Repeat until it passes. Never claim a phase is complete while it fails.
6. **Update** `docs/PROGRESS.md`: current state, files added, decisions, API notes, placeholders still open, known issues.
7. **Commit** with `feat(phase-N): <summary>` (or `fix(phase-N): ...`). Do NOT tag, do NOT push, do NOT start the next phase. The user tags and pushes.
8. **Report.** Print exactly this structure:

```
PHASE N REPORT — <phase name>
Files created: ...
Files modified: ...
Features implemented: ...
Tests added: ... (total tests now: ...)
Commands executed: ...
Test results: ... (paste the verify summary)
Known issues: ...
Deferred functionality: ...
Manual checks the user must perform: ... (list the VERIFY items)
```

Shell safety: run commands only inside the project folder. No `sudo`. No global installs. No deleting outside the repo. `npm` and `git` inside the project are allowed.

## 10. Commands

`npm run dev` · `npm run build` (`tsc -b && vite build`) · `npm run preview` · `npm test` (`vitest run`) · `npm run typecheck` · **`npm run verify`** (typecheck, then test, then build). Deploy base path: `VITE_BASE=/nexus-idse-game/ npm run build`. HashRouter means no server rewrite rules are needed.

## 11. Dev-only behaviour (must be removed from production in Phase 13)

`DevPanel`, routes `/dev/ui` and `/dev/engine`, and the "Complete mission (dev)" buttons are DEV tools. Until Phase 13 they show when `import.meta.env.DEV` or localStorage `nexus-dev === '1'`. Every dev-only element must be easy to find with a search for `DEV_ONLY` (add that comment next to each).

## 12. Level 04 engine contract (summary of Phases 5 to 8)

- `src/engine`: `DF = { columns, rows: {idx, v}[] }` immutable; `apply(df, op)`; `toCode(op)`; `parse(line)` returns ops, inspect or error; `createDfSession(initialDf, meta)` is a FACTORY (never a singleton) with `apply, undo, redo, reset, toJSON, fromJSON`; history entries carry `source: 'ui' | 'puzzle' | 'command'`.
- `generateStudents({seed, tier})` returns `{clean, dirty, issues, ghosts, meta}`. Assisted is exactly 47 rows with 18 issues and 4 ghosts.
- `liveHealth(df)` (no ground truth), `judgeOp(before, after, op, ctx)`, `assessQuality(current, ctx)`.
- L04 UI tabs: Spreadsheet, Console, Builder, Strategy Lab. All share one session through `useDfSession`.
- Clearance seed = `1000 + attempt*17 + tierIndex`, where `attempt` is `levels[4].attempts`.

## 13. Notes for free models

- Finish one item at a time. After each item run the relevant test file, not the whole suite, until the end.
- If a file would exceed about 400 lines, split it.
- If an instruction is ambiguous, pick the simplest reading that satisfies the VERIFY list, record the choice in `docs/PROGRESS.md` under Decisions, and carry on.
- If context is running out, stop at a clean point, commit, and say exactly what remains in the report.

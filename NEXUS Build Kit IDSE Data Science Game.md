# NEXUS Build Kit: IDSE Data Science Game

*Linux Mint · OpenCode · free models only · 14 phases, each with a verification gate*

## 1. How this kit works

You build NEXUS in 14 phases. Phase 0 is your machine setup (no prompt). Phases 1 to 13 are build phases. Phase 14 is an optional expansion if time remains. The master project rules live in a file called **AGENTS.md** (download it from the chat; it goes in the repo root). OpenCode reads it automatically every session, so you never re-explain the project.

For every build phase, do exactly this loop:

1. Start a **fresh OpenCode session** (type `/new`). Small sessions keep free models fast and accurate.
2. Paste the phase prompt (the code block under *Paste into OpenCode*).
3. Wait until OpenCode prints **PHASE N REPORT**. If it asks permission to run `npm` or `git` commands inside the project folder, allow them. Never allow commands outside the project folder.
4. Do the **VERIFY** list yourself. Each check says what to run or click and what you must see.
5. All checks pass: run the tag-and-push commands, then go to the next phase. Any check fails: use a repair prompt from section 4. Do not move on with a failing phase.

Three ideas make this reliable on free models: small phases; a `docs/PROGRESS.md` handoff file so each new session knows the exact state; and a git tag after every verified phase so a bad phase can be rolled back with one command.

**Dev shortcut:** from Phase 2 onward the game has a hidden Dev Panel (visible under `npm run dev`) that unlocks all levels and adds XP, so you can test Level 7 without replaying Levels 1 to 6.

## 2. Time plan and cut-lines

Target minutes include your own verification time.

| Phase | What you get | Minutes | Cumulative |
| --- | --- | --- | --- |
| 0 | Machine, repo, model connected | 25 | 0h25 |
| 1 | Project scaffold, design system, title screen | 30 | 0h55 |
| 2 | Game core: store, progression, hub, dev panel | 40 | 1h35 |
| 3 | Mission shell + Level 01 playable | 45 | 2h20 |
| 4 | Levels 02 and 03 playable | 45 | 3h05 |
| 5 | Level 04 data engine (pure logic, tested) | 35 | 3h40 |
| 6 | Level 04 dataset generator + scoring | 35 | 4h15 |
| 7 | Level 04 spreadsheet + Stages 1 and 2 | 45 | 5h00 |
| 8 | Level 04 console, builder + Stages 3 and 4 | 45 | 5h45 |
| 9 | Level 04 puzzles, side ops, adaptive, debrief | 45 | 6h30 |
| 10 | Levels 05 and 06 playable | 45 | 7h15 |
| 11 | Level 07 playable + campaign ending | 35 | 7h50 |
| 12 | Achievements, sound, polish, settings | 30 | 8h20 |
| 13 | README, deploy, final audit, submit | 30 | 8h50 |

This leaves about 70 minutes of buffer inside a 10-hour window. The plan fits 8 to 10 hours **if** the free model finishes a phase in 10 to 15 minutes of generation. The real risk is free-model rate limits, not the plan itself.

**Checkpoints:** Level 01 playable by about 2h20. Level 04 fully done by about 6h30. All seven levels by about 7h50. If you are more than 45 minutes behind at any checkpoint, apply the cut-lines below in this order.

1. Phase 12: do only items 1, 4 and 7 (achievements page, settings, robustness). Skip sound, shop and Tool Bay. Saves about 15 minutes.
2. Phase 10: build Levels 05 and 06 with Stages 1 and 2 plus one side op each. Saves about 15 minutes.
3. Phase 4: build Levels 02 and 03 with Stages 1 and 2 plus one side op each. Saves about 15 minutes.
4. Skip Phase 14.

**Never cut:** Phases 0 to 3, Phases 5 to 9 (Level 04 is the centrepiece), Phase 13.

## 3. Phase 0: Setup (you do this, no prompt)

**Free model choice (checked November 2026).** OpenCode's free models rotate every week or two, so the exact names can change. First choice: **DeepSeek V4.1 Flash Free** (1M context, strong on coding-agent benchmarks). Second choice: **GLM-5.3-Flash Free**. Backup outside OpenCode: your Google AI Studio key with a Gemini 3.x Flash model. Avoid models labelled stealth or alpha for build phases, because their behaviour and limits are unpredictable. Free models may use your prompts to improve themselves, which is fine for a public game repo, but never paste secrets.

**Do not pay for anything.** Do not add credits, and do not subscribe to OpenCode Go.

### 0.1 System tools

```bash
sudo apt update && sudo apt install -y git curl build-essential
```

### 0.2 Node.js through nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# close the terminal, open a new one, then:
nvm install 22
node -v
npm -v
```

If the nvm URL returns 404, copy the current install line from github.com/nvm-sh/nvm. Node 20 or 22 both work.

### 0.3 Git identity

```bash
git config --global user.name 'Your Name'
git config --global user.email 'you@example.com'
git config --global init.defaultBranch main
```

### 0.4 GitHub access with an SSH key

```bash
ssh-keygen -t ed25519 -C 'you@example.com'
# press Enter at every prompt
cat ~/.ssh/id_ed25519.pub
```

Copy the printed line. On github.com go to Settings, then SSH and GPG keys, then New SSH key, paste it, save. Then test:

```bash
ssh -T git@github.com
```

You must see: `Hi YOUR_USERNAME! You've successfully authenticated`.

### 0.5 Create the empty repository

On github.com click New repository. Name: `nexus-idse-game`. Public. **Do not** tick README, .gitignore or license (we create them).

### 0.6 Install OpenCode

```bash
curl -fsSL https://opencode.ai/v2/install | bash
opencode --version
```

If that fails, try `npm install -g @opencode/cli`. If that also fails, install version 1 with `curl -fsSL https://opencode.ai/install | bash`. This kit only uses features present in both versions: AGENTS.md, `/models`, `/connect`, `/new`, `/undo`. If a slash command is not recognised, quit OpenCode, start it again with `opencode` inside the project folder, and continue.

### 0.7 Create the project folder with the rules file

Download AGENTS.md from the chat first (it lands in `~/Downloads`).

```bash
mkdir -p ~/projects/nexus-idse-game && cd ~/projects/nexus-idse-game
git init
git remote add origin git@github.com:YOUR_USERNAME/nexus-idse-game.git
cp ~/Downloads/AGENTS.md .
mkdir -p docs
cat > docs/PROGRESS.md <<'EOF'
# PROGRESS

## Current state
Phase 0 done. Nothing built yet.

## Decisions
(none yet)

## API notes
(none yet)
EOF
cat > .gitignore <<'EOF'
node_modules
dist
coverage
.env
.env.*
*.log
.DS_Store
.vscode
opencode.local.json
EOF
git add -A
git commit -m 'chore: project rules and progress file'
git branch -M main
git push -u origin main
```

Replace YOUR\_USERNAME. API keys that OpenCode stores live outside the repo (`~/.local/share/opencode/auth.json`), so nothing secret can be committed by accident. Never create a `.env` file with real keys in this project.

### 0.8 Connect the free model

```bash
cd ~/projects/nexus-idse-game
opencode
```

Inside OpenCode type `/models`. Pick **DeepSeek V4.1 Flash Free** (marked Free; its id is likely `opencode/deepseek-v4.1-flash-free`). If OpenCode asks for an OpenCode Zen key, create one in the OpenCode console without adding any payment, then run `/connect` and paste it. Free models only work from inside OpenCode, which is fine here.

Backup, only when needed: `/connect`, choose Google, paste your AI Studio key, then `/models` and pick a Gemini 3.x Flash model. Google limits are per project, not per key, and are shown inside AI Studio.

Test message to send: `Reply with the word READY and tell me which model you are.`

### VERIFY Phase 0

1. `node -v` prints v20 or higher, `git --version` prints a version.
2. `ssh -T git@github.com` greets your username.
3. `opencode --version` prints a version.
4. In the project folder, `ls -a` shows `AGENTS.md`, `docs`, `.gitignore`, `.git`. `git log --oneline` shows one commit.
5. The GitHub repository page shows `AGENTS.md` and `docs/PROGRESS.md`.
6. OpenCode answers READY from the free model.

All six pass: Phase 0 is done. Leave OpenCode open, or exit with Ctrl+C.

## 4. Repair, audit and rollback prompts

Keep these handy. Paste them into a **fresh session** (`/new`).

**A. Build or test errors**

```text
The build or tests fail after Phase N. Read AGENTS.md and docs/PROGRESS.md first. Fix ONLY the errors below. Do not add features or refactor. Run `npm run verify` after each fix until it passes. Then update docs/PROGRESS.md and commit with message 'fix(phase-N): build and test errors'. Report exactly what you changed.

ERRORS (first 40 lines of output):
<paste here>
```

**B. Something behaves wrongly**

```text
Phase N check failed. Read AGENTS.md and docs/PROGRESS.md first.
EXPECTED: <what the VERIFY step said you should see>
ACTUAL: <what you saw, including any red text from the browser console (F12)>
STEPS TO REPRODUCE: <numbered clicks or commands>
Find the root cause by reading the relevant code. Do not guess. If the logic is pure, first write or update a unit test that fails for this bug. Then fix it minimally, run `npm run verify`, update docs/PROGRESS.md, and commit 'fix(phase-N): <short description>'.
```

**C. Phase looks incomplete (audit)**

```text
Audit Phase N. Read AGENTS.md and docs/PROGRESS.md. Below is the original Phase N requirement list. Check each numbered requirement against the ACTUAL code and output a table: requirement | done (yes/partial/no) | file. Then implement ONLY the partial or missing items, run `npm run verify`, update docs/PROGRESS.md, commit 'fix(phase-N): complete missing items'.

<paste the original phase prompt here>
```

**D. Session got confused or context ran out**

```text
Read AGENTS.md and docs/PROGRESS.md. Run `git status` and `git diff --stat`. Tell me in 5 lines what Phase N work is already done and what remains. Then finish ONLY what remains, following the Phase Protocol in AGENTS.md.
```

**E. Rollback to the last good phase** (run in a normal terminal, not in OpenCode)

```bash
git status                    # see what changed
git stash                     # keep a backup of uncommitted work, optional
git reset --hard phase-N      # N = last phase that PASSED verification
```

To redo a phase with a smaller bite, paste the same prompt again but add this line at the top: `Implement only items 1 to 4 of this phase now; I will ask for the rest next.`

## Phase 1: Scaffold, design system, title screen

### Paste into OpenCode

```text
PHASE 1 - Scaffold, design system, app shell. Follow the Phase Protocol in AGENTS.md. (npm run verify does not exist yet: create it in this phase.)

OBJECTIVE
Create the runnable project, the dark futuristic design system, routing, and a polished title screen. No game logic yet.

DO
1. Scaffold Vite + React + TypeScript in a TEMP folder (npm create vite@latest tmp-app -- --template react-ts), move its files into the repo root (keep AGENTS.md, docs/, .gitignore, .git), delete tmp-app. Package name: nexus-idse-game.
2. Install exactly the dependencies in AGENTS.md section 3. Force React 18 (react@18, react-dom@18, @types/react@18, @types/react-dom@18).
3. Tailwind 3: tailwind.config.ts with the NEXUS colour tokens and fonts from AGENTS.md section 6; content globs for ./index.html and ./src/**/*.{ts,tsx}; postcss config; src/index.css with the tailwind directives, CSS variables for the theme, a grid-background utility, and prefers-reduced-motion handling.
4. vite.config.ts: base = process.env.VITE_BASE ?? '/'; vitest config (jsdom, globals, setup file src/test/setup.ts importing @testing-library/jest-dom).
5. package.json scripts: dev, build (tsc -b && vite build), preview, test (vitest run), typecheck (type-check the whole project with the template tsconfigs), verify (npm run typecheck && npm test && npm run build).
6. Import fonts locally in src/main.tsx (Inter variable, Orbitron 600 and 800, JetBrains Mono 400 and 600). No CDN links anywhere.
7. Design system in src/ui/ (small typed components, one-line comment each): Panel, NeonButton (variants primary/ghost/danger, sizes sm/md/lg), Badge, ProgressBar, Modal (focus trap, Esc closes), Toast system (provider + useToast), Tooltip (CSS only), Tabs, Kbd, GridBackground, GlitchTitle (CSS only, subtle), Stat. Keyboard accessible, visible cyan focus ring.
8. src/app/App.tsx using HashRouter with routes: / (Title), /hub (placeholder text HUB), /dev/ui (style guide page showing every ui component and the colour palette), * (NotFound, themed). Wrap routes in an ErrorBoundary with a themed error screen and a RETURN TO HUB button.
9. Title screen src/pages/Title.tsx: NEXUS wordmark (Orbitron, cyan glow), tagline 'Introduction to Data Science for Engineers', cheap animated grid or particle background (CSS or small canvas; pause when the tab is hidden), buttons NEW GAME (data-testid btn-new-game) and CONTINUE (data-testid btn-continue, disabled with tooltip 'No saved game' for now) and SETTINGS (disabled), footer 'Semester 5 - IDSE'.
10. Tests: smoke test rendering Title and asserting the NEXUS text and both buttons; one test for a ui component.
11. Update docs/PROGRESS.md: what exists, how to run, decisions.

DONE WHEN: npm run verify passes; npm run dev shows the title screen; /#/dev/ui shows every component; an unknown route shows NotFound.
```

### VERIFY Phase 1

1. `npm run verify` ends with a successful build and passing tests.
2. `npm run dev`, then open the printed URL (usually http://localhost:5173). You see a dark background, a glowing NEXUS title and subtle motion. NEW GAME is enabled, CONTINUE is disabled.
3. Open `http://localhost:5173/#/dev/ui`. Every component and the colour palette are shown. Press Tab repeatedly: a cyan focus ring is visible. Open the modal (Esc closes it) and trigger a toast.
4. Open `http://localhost:5173/#/nonsense`. A themed Not Found screen appears.
5. Resize the browser between 1024 px and 1920 px wide: no horizontal scrollbar.
6. Press F12, open the Network tab, reload: no requests to outside domains (fonts are local).
7. `git status` is clean and `git log --oneline` shows the new commit.

All pass:

```bash
git tag phase-1 && git push origin main --tags
```

## Phase 2: Game core, hub, progression, persistence

### Paste into OpenCode

```text
PHASE 2 - Game core, hub, progression, persistence. Follow the Phase Protocol in AGENTS.md.

DO
A. src/game/types.ts: define exactly the types in AGENTS.md section 5 (LevelId, Tier, Rating, Decision, ChallengeResult, StageDef, SideOpDef, BonusDef, LevelDefinition, LevelProgress, PlayerProfile, SaveData).
B. src/game/config.ts + src/game/progression.ts (pure functions, no React): constants from AGENTS.md section 7; rankForXp, nextRank, xpToNextRank, compositeScore(result), ratingForScore, xpForMain(levelId, composite), xpForSideOp(hintsUsed), BONUS_XP, creditsForXp; applyAward(progress, award) returning { newProgress, xpGained, creditsGained, rankUp? } implementing: replays award only the improvement over the previous best XP; bonuses award once.
C. src/game/store.ts: zustand with persist (key 'nexus-save-v1', version 1). State: profile {callsign, xp, credits, theme, soundOn}, levels Record<LevelId, LevelProgress>, achievements string[], fragments string[], adaptive {history: []}. Actions: newGame(callsign), resetAll, completeStage, completeSideOp, completeBonus, completeMission(levelId, aggregate) returning an award summary, exportSave(): string, importSave(json): {ok, error?} with schema validation. Unlock rule: Level 1 unlocked at start; Level N+1 unlocks when Level N's MAIN mission is completed (side ops and bonuses never gate progress).
D. src/game/levels/registry.ts: LEVELS array of 7 LevelDefinition entries with the real titles, syllabus lines, mission names, briefing text (short) and story fragment text from AGENTS.md section 8. Stage, side-op and bonus lists may hold placeholder entries but their COUNTS must match AGENTS.md section 8 so hub progress shows e.g. 'Stages 0/3 - Side ops 0/2 - Bonus 0/2'.
E. Pages and routes:
 - Title: CONTINUE enabled when a save exists. NEW GAME with an existing save asks confirmation in a Modal. /new: callsign input (3 to 16 chars, validated) then newGame then /hub.
 - /hub: top bar (callsign, rank name, XP bar to next rank, credits); CAMPAIGN panel with 7 level cards in a connected path or grid. States: LOCKED (dimmed, lock icon, tooltip 'Complete Level N-1'), UNLOCKED, COMPLETED (rating badge S/A/B/C). Each card: number, title, syllabus line, progress counts. Clicking a locked card shakes it and shows a toast; clicking an unlocked card opens /level/:id. Right column: Profile summary, Story Fragments archive (locked slots read ENCRYPTED), Achievements (placeholder link), Tool Bay (locked placeholder).
 - /level/:id: BriefingScreen (title, mission name, story text, objectives list, buttons BEGIN MISSION and BACK TO HUB). /level/:id/play: placeholder 'Mission workspace' with a DEV-only button 'Complete mission (dev)'. /level/:id/debrief: placeholder showing XP and credits awarded and a rank-up Modal when applicable, button RETURN TO HUB. A route guard redirects locked levels to /hub with a toast.
F. src/app/DevPanel.tsx, visible only when import.meta.env.DEV or localStorage 'nexus-dev' === '1': floating bottom-left panel with buttons Unlock all levels, Add 500 XP, Complete current level (dev), Reset save, Hide panel.
G. Tests (vitest, at least 15 assertions): rank thresholds at boundaries; rating thresholds; replay awards only the improvement; bonus awards once; credits formula; newGame; unlock chain L1 to L2; export/import round trip; invalid import rejected.
H. Update docs/PROGRESS.md including the store's public API.
```

### VERIFY Phase 2

1. `npm run verify` passes and the test count has grown.
2. `npm run dev`. On the title screen CONTINUE is disabled. Click NEW GAME, enter callsign `Test`, and land on the hub: rank Trainee, XP 0 out of 250, credits 0.
3. Level 1 is unlocked. Levels 2 to 7 are locked. Click Level 2: the card shakes and a toast appears.
4. Click Level 1, then BEGIN MISSION, then the dev button 'Complete mission (dev)'. The debrief shows XP gained. Return to the hub: Level 1 is COMPLETED and Level 2 is unlocked, Level 3 still locked.
5. Press F5. Callsign, XP and the completed level persist. On the title screen CONTINUE is now enabled.
6. Dev Panel: Add 500 XP changes the rank to Junior Analyst. Unlock all levels unlocks all seven. Reset save returns you to a title screen with CONTINUE disabled.
7. With a fresh save, type `http://localhost:5173/#/level/5/play` in the address bar: you are redirected to the hub with a toast.
8. Complete Level 1 again with the dev button: XP gained is 0 (replays award only improvements).

All pass:

```bash
git tag phase-2 && git push origin main --tags
```

## Phase 3: Mission shell and Level 01 (THE INTERFACE)

### Paste into OpenCode

```text
PHASE 3 - Mission shell, challenge framework, and Level 01 (THE INTERFACE) fully playable. Follow the Phase Protocol in AGENTS.md.

PART A - Mission shell (src/shell/)
1. Extend src/game/types.ts with the challenge contract: ChallengeProps { id; difficulty: Tier; hints: string[] (up to 3, progressive); onComplete(result: ChallengeResult): void }. A challenge component tracks its own mistakes and decisions and calls onComplete.
2. MissionShell: header (level and mission title, stage stepper 'Stage 2/3', XP preview); left Objectives panel (checkmarks, driven by a useObjectives hook the challenge can update); main workspace slot; right Mission Log panel (collapsible; shows decisions and tips); footer with a HINT button (each press reveals the next hint, increments hintsUsed, shows 'Hints used: n') and ABORT MISSION (confirm Modal, awards nothing).
3. useMissionFlow: runs briefing, then stages in order, then debrief. Stage N+1 only after stage N completes. Keeps per-stage ChallengeResults in a session store. After the last main stage it calls store.completeMission with the aggregated composite score and navigates to /level/:id/debrief.
4. DebriefScreen: animated rating letter; composite breakdown bars (Accuracy, Decision quality, Efficiency, Hint use); 'Decisions and consequences' list (each Decision: label, good/bad icon plus text, explanation); XP and credits with count-up animation; rank-up Modal if earned; story fragment reveal (typewriter text); buttons SIDE OPERATIONS, REPLAY MISSION, NEXT LEVEL (when unlocked), HUB.
5. Side operations and bonuses: /level/:id shows tabs BRIEFING | SIDE OPS | BONUS. A side op opens the same MissionShell with a single challenge. Bonus objectives are pure functions (session) => boolean declared in the level definition and awarded at mission completion; hidden bonuses show ??? until earned.
6. Reusable mechanics in src/components/mechanics/:
   - DragSort: items dragged into labelled bins using native HTML5 drag and drop AND a click-to-select-then-click-bin fallback; immediate per-item feedback; tricky items carry an explanation shown on a wrong drop.
   - ChoiceSimulator: scenario cards; the player picks an option and the component RUNS the consequence (a function returns output text or state) and shows it. Choices are tested by simulation, not quizzed.

PART B - Level 01 content (src/levels/l01/, data-driven)
Mission: FIRST CONTACT. Story (120 words max): the NEXUS intake feed arrives garbled; the player is the new recruit. Story fragment F1 as in AGENTS.md section 8.
 Stage 1 'Intake Sorting' (DragSort): 12 raw values into bins int / float / str / bool / None / list / dict. Use tricky values: '42', 42, 4.2e1, True, 'True', None, '', [1, 2], {'a': 1}, 3.0, '0', 0. A wrong drop shows the explanation, counts as one mistake, and allows a retry.
 Stage 2 'Decode the Transmission' (StringLab, new component): 6 messy log lines such as '  usr:ARJUN_k | 2025-03-07 | STATUS=ok  '. The player builds a string pipeline from chips (strip, lower, upper, split(sep), index or slice [a:b], replace(a, b), startswith) in a pipeline bar; a live preview shows the result after each step for the selected line; goal cards (extract the username; extract the date; status in lowercase) turn green when the pipeline output equals the target. The equivalent Python expression is shown live. Implement the string operations as a small pure interpreter with unit tests. Never use eval.
 Stage 3 'File the Evidence' (ChoiceSimulator): 5 scenarios - unique visitor ids (set), ordered route stops (list), fixed GPS coordinate (tuple), student id to record lookup (dict), duplicate-prone sensor readings (list vs set). The simulator RUNS the choice (a set silently drops a duplicate reading; a tuple raises a TypeError on assignment) and the player must choose correctly to proceed; a short 'why' follows each.
 Side op 1 'Type Trap': 6 Python expressions (e.g. '5' + '5', 5 + '5', int('3.7'), bool('False'), 7 / 2 vs 7 // 2, len of a nested list). The player types the predicted output (normalised free text); a precomputed table 'executes' it and explains.
 Side op 2 'Dict Detective': a nested dict of 8 student records shown as a JSON tree; 4 retrieval tasks solved by building access chains from chips: d['s3']['marks'][1], .get(key, default), .keys().
 Bonuses: 'Clean Sweep' (Stage 1 with zero mistakes), 'No Assistance' (zero hints in the main mission), hidden 'Easter Egg' (one raw line in Stage 2 decodes to username NEXUS_ZERO; selecting it triggers the bonus).
 Hints: 3 progressive hints for every stage and side op.
Register everything in the level registry so hub counts (3 stages, 2 side ops, 2 bonuses) are real.

TESTS: string interpreter (at least 10 cases), DragSort placement and validation logic, aggregation of stage results into a composite score, bonus evaluators.
```

### VERIFY Phase 3

Use the Dev Panel (Unlock all levels) if you are on a fresh save.

1. `npm run verify` passes.
2. Hub, Level 1, BEGIN MISSION. The shell shows an Objectives panel, a HINT button, the Mission Log and a stage stepper.
3. **Stage 1:** drag the value `'42'` (a string) into the int bin. An explanation appears and it counts as a mistake. Place every value correctly. Also test the click-to-select-then-click-bin fallback on one item. Stage 2 appears.
4. **Stage 2:** select a log line, add strip, then split, then an index. A live preview and a Python expression are shown. All three goal cards turn green. Stage 3 appears.
5. **Stage 3:** for the unique-visitors scenario choose `list`. The simulation shows the duplicates surviving and registers a mistake. Choose `set` and continue. Complete the stage.
6. **Debrief:** a rating letter, breakdown bars, a decisions list that includes your deliberate mistakes with explanations, XP count-up, and the story fragment F1 reveal.
7. Hub: Level 1 is COMPLETED, Level 2 is unlocked. The Level 1 SIDE OPS tab lists Type Trap and Dict Detective, and both can be completed. XP is awarded once; replaying gives no extra XP.
8. Press HINT three times in any stage: three progressively stronger hints appear and the counter reads 3. The debrief's Hint use bar is lower after a run with hints.
9. BONUS tab: 'No Assistance' is earned only on a zero-hint run; the hidden bonus shows ???.
10. Start a mission and choose ABORT MISSION, then confirm. You return to the hub and nothing is awarded.

All pass:

```bash
git tag phase-3 && git push origin main --tags
```

## Phase 4: Levels 02 and 03

### Paste into OpenCode

```text
PHASE 4 - Level 02 (LOGIC PROTOCOL) and Level 03 (MATRIX CORE), lean but fully playable. Follow the Phase Protocol in AGENTS.md. Reuse the Phase 3 shell, DragSort and ChoiceSimulator where sensible. Each level: 3 main stages, 2 side ops, 2 bonuses, 3 progressive hints per challenge, a debrief with logged decisions, and its story fragment (AGENTS.md section 8).

LEVEL 02 - Mission GATEKEEPER: build the rule engine that screens incoming data packets. A packet is {id, size_kb, source, checksum_ok, priority}.
 Stage 1 'Branch Logic' (RuleBuilder): a visual if / elif / else rule stack. A rule = condition chips (field, operator, value; AND or OR between up to two conditions) + an action (ACCEPT / QUARANTINE / REJECT). The player orders rules by drag and drop (or up/down buttons). RUN sends a fixed stream of 12 packets through the stack, animates each packet to its outcome, and shows the generated Python if/elif/else code live. The target is a behaviour table of expected outcomes for the 12 packets, including edge cases where rule ORDER matters. Pass = all 12 match. A wrong order explains itself ('rule 2 already caught this packet').
 Stage 2 'Loop Engine' (LoopLab): a stream of 20 packet sizes; the player configures a for-loop (iterable, optional if-filter, accumulator operation sum/count/max/append, break and continue toggles). A step-through trace table shows iteration, value, condition result, accumulator. Goals: (a) total size of valid packets; (b) count packets until the first corrupted one (needs break); (c) skip empty packets (needs continue). Equivalent Python code is shown live.
 Stage 3 'Function Forge' (FunctionForge): define a function by choosing its name, parameters and ordered body blocks (compute, if-return, return). The game runs hidden test cases and shows PASS or FAIL per case with the failing input. Two functions: is_valid(packet) and risk_score(packet). Final step calls the function in a loop over 20 packets to show reuse.
 Side op 'Off-by-One': a buggy range() loop shown with its trace; the player edits start, stop and step through dropdowns until the output matches the target.
 Side op 'Boolean Gauntlet': 3 circuit-style puzzles with toggle switches for and / or / not; a light turns on when the expression is True; the player sets switches to satisfy a target truth table.
 Bonuses: 'Elegant Rules' (Stage 1 solved with 4 rules or fewer), 'Zero Retries' (Stage 3 passes on the first run), hidden 'Dead Code' (spot the unreachable rule in a pre-built stack shown in Stage 1's intro panel).
 Engine: a tiny pure evaluator for conditions, rules, loops and functions in src/levels/l02/engine.ts with unit tests (at least 12 cases: rule order, and/or, break/continue, function tests). No eval(), no new Function().

LEVEL 03 - Mission SIGNAL GRID: a 6x6 campus sensor grid; find the drifting sensor (column 5, index 4, climbs by 0.4 per cycle).
 Stage 1 'Grid Anatomy' (ArrayWorkbench): (a) read shape, ndim and dtype of 4 displayed arrays; (b) construct arrays with chips (np.array, np.zeros, np.arange, reshape) to match target grids; live code and live result.
 Stage 2 'Slice the Signal' (SliceLab): a clickable 6x6 grid kept in sync with a slicing expression in both directions (click a rectangular block => arr[r1:r2, c1:c2]; type or build an expression => the block highlights). Goals: row 2; column 4; the highlighted 3x3 target block (rows 1 to 3, columns 2 to 4); every other column (step); a boolean mask arr > 30 with a threshold slider showing the mask and the count. A non-rectangular selection must explain why one slice cannot express it and suggest a boolean mask. Python semantics must be exact (negative indices, exclusive stop).
 Stage 3 'Vector Power' (VectorLab): operation chips arr * 2, arr - arr.mean(), arr.sum(axis=0), arr.mean(axis=1), np.argmax, and a broadcasting row vector. The player must (a) normalise the grid by subtracting column means; (b) find the drifting sensor with column means plus argmax; (c) compare against a slow Python loop shown with an operation counter, to show why vectorising matters. Include a broadcasting visual for arr + row_vector.
 Side op 'Reshape Rush': reshape 12 values into 3x4, 2x6 and 2x2x3; wrong shapes explain 'cannot reshape'.
 Side op 'Mask Master': set thresholds to isolate anomalous cells; precision and recall style feedback on isolated cells.
 Bonuses: 'One-Liner' (solve Stage 3b with one chained expression), 'No Hints', hidden 'Pattern' (notice the +0.4 drift and flag it in the Mission Log).
 Helper: tiny pure NumPy-like module src/levels/l03/nd.ts (1D and 2D arrays only): shape, slicing, boolean masks, sum and mean with axis, argmax, 2D+1D broadcasting. Unit tests (at least 12 cases).
```

### VERIFY Phase 4

Use the Dev Panel to unlock all levels.

1. `npm run verify` passes and the test count grew.
2. **Level 2, Stage 1:** put a broad ACCEPT rule above a REJECT rule for `checksum_ok == False`, then RUN. At least one packet lands in the wrong outcome and an explanation names the rule that caught it. Reorder the rules and RUN again until all 12 match. The Python code panel updates as you edit.
3. **Level 2, Stage 2:** configure the loop for each of the three goals. The trace table updates per iteration, and goals (b) and (c) require break and continue.
4. **Level 2, Stage 3:** write `is_valid` badly on purpose. A PASS/FAIL list shows the failing input. Fix it until all cases pass, then `risk_score`.
5. Both Level 2 side ops open and complete. The debrief shows decisions and fragment F2.
6. **Level 3, Stage 2:** click a 3x3 block: the expression box shows a slice such as `arr[1:4, 2:5]`. Type `arr[1:4, 2:5]` yourself and the same block highlights. Type `arr[:, -1]` and the last column highlights. Select two separated cells: the game explains that a single slice cannot do that.
7. **Level 3, Stage 3:** column means plus argmax identify the drifting sensor (column 5). The Python-loop comparison shows a much larger operation counter than the vectorised version.
8. Both Level 3 side ops open and complete. The debrief shows fragment F3.
9. Hub: Levels 1, 2, 3 are completed, Level 4 is unlocked.

All pass:

```bash
git tag phase-4 && git push origin main --tags
```

## Phase 5: Level 04 data engine (pure logic)

This is the foundation of the most developed level. It has no game UI, only logic and tests, plus a dev page you use to verify it by typing real commands.

### Paste into OpenCode

```text
PHASE 5 - Level 04 data engine core (pure TypeScript, no game UI). Follow the Phase Protocol in AGENTS.md. Be precise and test heavily: Level 04 depends on this.

CREATE in src/engine/ (unit tests in src/engine/__tests__/):
1. rng.ts - mulberry32(seed) seeded PRNG with helpers int(min, max), pick(arr), shuffle(arr), chance(p), normal(mean, sd).
2. types.ts -
   type Cell = string | number | boolean | null;
   interface Row { idx: number; v: Record<string, Cell> }   // idx = original pandas-style index, preserved after drops
   interface DF { columns: string[]; rows: Row[] }         // IMMUTABLE: every function returns a new DF
   type Dtype = 'int64' | 'float64' | 'object' | 'bool';
   type Tier = 'assisted' | 'independent' | 'expert';
3. dataframe.ts - pure helpers: dtypes(df) with pandas-like inference (any string => object; all booleans => bool; all numbers => int64 when all integers and no nulls, else float64; all null => object), shape, head, tail, nullCounts, duplicateMask(df, subset?) (keep first), valueCounts(col), unique(col), describe(df) (numeric columns: count, mean, std with ddof=1, min, 25%, 50%, 75%, max), info(df) text, and formatters that render pandas-like TEXT output (tables and series) for the console.
4. ops.ts - discriminated union Op and apply(df, op) returning OpResult = { ok: true; df; summary; rowsBefore; rowsAfter; changedCells } | { ok: false; error } (pandas-style error messages, df unchanged). Ops: drop_duplicates{subset?}; dropna{subset?}; fillna{column?, value?, strategy?: 'mean'|'median'|'mode'} (no column = whole frame with a scalar value); str_op{column, fn: 'strip'|'lower'|'upper'|'title'}; str_replace{column, old, new} (literal); replace_map{column, mapping}; astype{column, to: 'int'|'float'|'str'}; to_numeric{column, errors: 'coerce'|'raise'}; filter_range{column, min?, max?} (keeps min <= value <= max; null rows are DROPPED, exactly like pandas between(); say so in the summary); mask_invalid{column, min?, max?} (sets out-of-range values to null); set_cell{idx, column, value}; drop_rows{idxs}.
   Faithfulness rules: str ops on null stay null; str ops on a NON-string cell give null (pandas behaviour); astype int with nulls => error 'Cannot convert non-finite values (NA or inf) to integer'; astype float on a string like 85% => ValueError 'could not convert string to float:' followed by the offending value in quotes; to_numeric with coerce turns unparseable values into null and the summary states how many values were coerced; changing a column that contains nulls from int to float must follow dtype inference above.
5. codegen.ts - toCode(op) returns a canonical pandas line. Examples: df = df.drop_duplicates() ; df['attendance'] = df['attendance'].fillna(df['attendance'].median()) ; df['department'] = df['department'].str.strip() ; df = df.dropna(subset=['attendance']) ; df = df[df['age'].between(16, 40)] ; df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan ; df.at[12, 'age'] = 20 ; df = df.drop(index=[3, 7]) ; df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce').
6. parser.ts - SAFE command parser: hand-written tokenizer plus recursive descent. NEVER use eval, Function, or dynamic import. parse(line) returns { kind: 'ops'; ops: Op[]; code: string } | { kind: 'inspect'; query: InspectQuery } | { kind: 'error'; message: string; suggestion?: string }. Supports an optional 'df = ' prefix, single or double quotes, trailing comments after #, and these forms: df ; df.head(n) ; df.tail(n) ; df.shape ; df.info() ; df.dtypes ; df.describe() ; df.isnull().sum() ; df.isna().sum() ; df.duplicated().sum() ; df[df.duplicated()] ; df['c'].value_counts() ; df['c'].unique() ; df['c'].isnull().sum() ; df.drop_duplicates() ; df.drop_duplicates(subset=['a','b']) ; df.dropna() ; df.dropna(subset=['a']) ; df['c'] = df['c'].fillna(<number | 'text' | df['c'].mean() | df['c'].median() | df['c'].mode()[0]>) ; df.fillna(<scalar>) ; chains of .str.strip() / .str.lower() / .str.upper() / .str.title() / .str.replace('a','b') on ONE column (a chain yields several ops applied in order as ONE history entry) ; df['c'] = df['c'].replace({'a':'b', ...}) ; df['c'] = df['c'].astype(int|float|str) ; df['c'] = pd.to_numeric(df['c'], errors='coerce') ; df = df[df['c'].between(a, b)] ; df = df[df['c'] <= x] (also <, >, >=, ==, !=) ; df.loc[<cond> (| or & <cond>), 'c'] = np.nan ; df.at[idx, 'c'] = value ; df = df.drop(index=[...]). Anything else returns an error: 'This console understands a simplified subset of pandas.' plus a suggestion list. Round-trip property: parse(toCode(op)) yields an equivalent op for EVERY op type (test it).
7. session.ts - createDfSession(initialDf, meta) factory (framework-free, a class or a zustand vanilla store; NEVER a global singleton): original, current, history: HistoryEntry[] {id, ops, code, source: 'ui'|'puzzle'|'command', rowsBefore, rowsAfter, summary}, cursor, snapshots[], apply(opsOrCommand, source), undo(), redo(), reset(), canUndo, canRedo, toJSON() and fromJSON(). Serialisation stores ONLY {seed/meta, ops history, cursor} and rebuilds by replaying. A new op after undo discards the redo tail. Failed ops never enter the history.
8. fixtures.ts - tinyDirty: a hand-written 12-row DF with columns student_id (int), department, age (int), cgpa (float), attendance (TEXT such as '85%', or null). Exactly: row idx 8 is an exact copy of row idx 3; attendance is null at idx 2 and idx 9; departments include 'Computer Science', 'CS', 'cs ', 'Mechanical', 'mech', 'Electrical' (at least 5 distinct labels); age is 199 at idx 5; cgpa is 74.0 at idx 10.
9. DEV PAGE src/pages/DevEngine.tsx at route /dev/engine: a command input (Enter runs, Up/Down browse history), an output pane with pandas-like text, a table of the current DF (idx column shown, first 30 rows), a history list showing the generated code and rows before to after, UNDO and REDO buttons, a RESET button, and the label 'rows: N'. It loads tinyDirty for now.

TESTS (at least 40 assertions): dtype inference; every op including error cases; parser for every supported form; REJECTION of 'import os', '__import__(1)', 'os.system(1)', 'eval(1)', 'open(1)'; parse/toCode round trip for every op type; session undo, redo, replay and failed-op handling.
```

### VERIFY Phase 5

1. `npm run verify` passes; the test summary shows 40 or more engine assertions.
2. `npm run dev`, open `http://localhost:5173/#/dev/engine`. A 12-row table appears and the label reads `rows: 12`.
3. Type each command and compare:
   - `df.shape` prints `(12, 5)`.
   - `df.isnull().sum()` shows attendance 2 and the other columns 0.
   - `df.duplicated().sum()` prints `1`.
   - `df.dtypes` shows attendance object, age int64, cgpa float64, student\_id int64.
   - `df['department'].value_counts()` lists at least 5 distinct labels.
4. `df = df.drop_duplicates()`: the table drops to 11 rows (idx 8 is gone, other idx numbers unchanged), the history shows the code line and 12 to 11. Click UNDO: 12 rows. Click REDO: 11 rows.
5. `df['attendance'] = df['attendance'].str.replace('%', '').astype(float)`: attendance becomes float64 and the null count is still 2.
6. `df['attendance'] = df['attendance'].astype(int)`: a red error about converting NA to integer; the table and history are unchanged.
7. `df.loc[df['age'] > 40, 'age'] = np.nan`: age becomes float64 with 1 null.
8. `df['department'] = df['department'].str.strip().str.title()`: ONE history entry; the value ` cs  ` becomes `Cs`.
9. Type `import os`, then `os.system('ls')`, then `eval('1+1')`: each is refused with the friendly message and nothing changes.
10. Type `df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')` on a fresh Reset: the output states how many values were coerced (every `NN%` text becomes null, the dangerous case). UNDO restores them.

All pass:

```bash
git tag phase-5 && git push origin main --tags
```

## Phase 6: Level 04 dataset generator and scoring

### Paste into OpenCode

```text
PHASE 6 - Level 04 dataset generator, live validation, decision judge, and scoring (pure TypeScript). Follow the Phase Protocol in AGENTS.md. Builds on src/engine from Phase 5. Put tunable numbers in src/engine/config.ts.

CREATE
1. generator.ts - generateStudents({seed, tier}) => { clean: DF, dirty: DF, issues: Issue[], ghosts: number[], meta }.
   Columns (9): student_id (1001 upward), name (varied Indian and international names), department, year (1 to 4), age (17 to 25), cgpa (float, 1 decimal, 4.0 to 9.8), attendance (float 35 to 100), scholarship ('Yes' or 'No'), dropped_out (0 or 1). Dropout probability MUST be higher for low attendance and low cgpa so later levels can find real patterns. Canonical departments: Computer Science, Mechanical, Electrical, Civil. Shuffle rows with the seeded RNG, then assign idx 0..n-1. Same seed and tier must always produce identical output.
   Issue = { id, kind: 'missing'|'duplicate'|'inconsistent'|'type'|'invalid', rowIdx: number (-1 for column-level), column?, truth?: Cell, note }.
   The ATTENDANCE column is stored as TEXT like '85%' for every non-null row in every tier (one column-level 'type' issue). In independent and expert tiers cgpa is ALSO text, with placeholder strings 'N/A', '-', '?' in some cells (placeholders count as kind 'missing').
   Ghost rows (4 per tier): fabricated enrolments with attendance exactly 100 and cgpa exactly 10.0 and ordinary-looking names. They are NOT issues; they are listed in ghosts[] (bonus content for hidden-anomaly discovery).
   Tier recipes (assisted is EXACT; the others must land within 10 percent of the numbers):
   assisted: 40 legit + 3 exact duplicate rows + 4 ghosts = 47 rows. attendance null x5. Department variants on exactly 6 rows, one variant each, each on a row whose TRUE department matches: 'CS', 'cs ', 'Comp Sci', 'COMPUTER SCIENCE' (true Computer Science), 'mech' (true Mechanical), 'Electrical ' (true Electrical). Invalid age x2 (199 and -4), invalid cgpa x1 (74.0). Duplicated rows (original and copy) must never receive any other corruption in this tier, so the copies are EXACT duplicates.
   independent: 150 legit + 9 duplicates (6 exact, 3 near-duplicates differing only in department formatting) + 4 ghosts. attendance null x8; cgpa placeholders x4; cgpa null x4; about 20 department variant rows; invalid age x4, cgpa x3 (e.g. 78 meaning 7.8), attendance above 100 x2.
   expert: 300 legit + 20 duplicates (14 near-duplicates whose copies differ in department formatting or whitespace so they only match AFTER standardising) + 4 ghosts. attendance null x24 of which 70 percent belong to students who dropped out (informative missingness); cgpa null x8; placeholders x10; about 45 department variant rows; invalid age x6 (including birth-year values such as 2003), cgpa on a 100-point scale x5, attendance above 100 x4 and negative x2.
2. assess.ts -
   a) liveHealth(df): schema-based validation with NO ground truth (what a real analyst can compute): per-column null counts, placeholder counts, duplicate counts (exact, and after normalising department text and whitespace), dtype vs expected dtype, out-of-range counts (age 16 to 40, cgpa 0 to 10, attendance 0 to 100, year 1 to 4), unknown department labels, and a cell-level map of problems for the spreadsheet highlights.
   b) judgeOp(before, after, op, ctx) => Decision | null, with Decision = {label, good: boolean | null (null = neutral), explanation, redundant?}. Rules: dropna with no subset losing more than 5 percent of rows = bad ('lost X rows, Y percent of the dataset, to remove blanks in one column'); fillna(0) on attendance = bad (0 means never attended); mean fill on a skewed column = neutral with a note to prefer the median; median or mode fill = good; drop_duplicates with a subset that removes more than 10 percent of rows = bad; filter_range removing more than 5 percent of rows = bad, while mask_invalid = good (the row is kept); string standardisation that reduces distinct department labels = good; to_numeric coerce turning more than 10 previously valid values into null = bad; an op that changes nothing = redundant; ops with no specific rule return null (not counted). In the expert tier, any row-dropping of null attendance must report the dropout-rate change ('dropout rate moved from X percent to Y percent') and counts as bad.
   c) assessQuality(current, ctx) where ctx holds clean, dirty, issues, ghosts, flags?, history. Returns { consistency, identification, decisions, preservation, economy, integrity (0 to 100), efficiency (0 to 100), counts: before and after }. Each metric is 0 to 1. Formulas (constants in config.ts): integrity = 30*consistency + 15*identification + 25*decisions + 20*preservation + 10*economy. consistency = resolvedIssues / totalIssues using the Issue list (duplicate resolved when only one copy of that student remains; inconsistent resolved when the value equals the canonical label; type resolved when the column dtype is numeric; invalid resolved when the value is in range, nulled, or its row removed; missing resolved when the cell is non-null and not a placeholder, or its row was removed). preservation = legit students still present / legit students total (ghost and duplicate rows do not count). decisions = average over non-redundant judged ops of (good = 1, neutral = 0.7, bad and kept = 0, bad and undone = 0.6). economy = 1 - redundantOps / max(1, totalOps). identification = F1 of the player's flags against the Issue list when flags are provided, else 0.5. If NO operations were applied: decisions = 0 and economy = 0. efficiency = clamp(parOps / actualOps, 0.3, 1) * 100 where actualOps counts history ENTRIES and parOps comes from config (assisted 8, independent 12, expert 16) - efficiency is a SEPARATE score and never part of integrity. More operations must never raise any score.
3. Upgrade the DEV PAGE /dev/engine: tier selector, seed input (default 42), a GENERATE button, a Quality Report panel (consistency, identification, decisions, preservation, economy, integrity, efficiency as bars and numbers) that recomputes after each op, a 'Live health' panel from liveHealth, and an 'Issues injected' summary by kind (read from the generator's issue list, shown for verification only).

TESTS (extend to at least 60 assertions in total): generator determinism; EXACT assisted counts (47 rows, 5 null attendance, 3 exact duplicates, 6 department-variant rows with the listed labels, 18 issues in total: 5 missing, 3 duplicate, 6 inconsistent, 1 type, 3 invalid); independent and expert counts within tolerance; dropout rate is higher among low-attendance students; liveHealth; each judgeOp rule; assessQuality: the 9-command perfect script below yields consistency 1, preservation 1, integrity between 90 and 95 and efficiency about 88.9; an untouched dirty DF yields integrity below 40; dropna() on the dirty DF lowers preservation; undone bad decisions are penalised less than kept ones.

THE 9-COMMAND PERFECT SCRIPT (assisted tier, seed 42) to use in a test:
1 df = df.drop_duplicates()
2 df['department'] = df['department'].str.strip().str.title()
3 df['department'] = df['department'].replace({'Cs': 'Computer Science', 'Comp Sci': 'Computer Science', 'Mech': 'Mechanical'})
4 df['attendance'] = df['attendance'].str.replace('%', '').astype(float)
5 df['attendance'] = df['attendance'].fillna(df['attendance'].median())
6 df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan
7 df['age'] = df['age'].fillna(df['age'].median())
8 df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan
9 df['cgpa'] = df['cgpa'].fillna(df['cgpa'].median())
```

### VERIFY Phase 6

1. `npm run verify` passes; engine tests total 60 or more.
2. Open `http://localhost:5173/#/dev/engine`. Choose tier ASSISTED, seed 42, press GENERATE. `df.shape` prints `(47, 9)`. The Issues injected panel reads: missing 5, duplicate 3, inconsistent 6, type 1, invalid 3.
3. Reload the page and generate again with the same seed: the first rows are identical (determinism).
4. Run `df.isnull().sum()` (attendance 5, others 0), `df.duplicated().sum()` (3), `df.dtypes` (attendance object, age int64, cgpa float64) and `df['department'].value_counts()` (you can see the labels `CS`, ` cs  `, `Comp Sci`, `COMPUTER SCIENCE`, `mech`, ` Electrical  `).
5. Quality Report on the untouched data: Consistency 0 percent, Preservation 100 percent, Integrity below 40 (about 27.5).
6. Paste the 9 commands one at a time. After each, the Live health numbers fall and the report updates. After command 9: shape `(44, 9)`, Live health all zero, Consistency 100 percent, Preservation 100 percent, **Integrity between 90 and 95** (92.5 because no flags were submitted, so Identification defaults to 50 percent), Efficiency about 88.9.
7. Press RESET, then run `df = df.dropna()` on its own: the decision log marks it bad (lost rows) and Preservation drops. Press UNDO: the report recovers.
8. Switch to INDEPENDENT (about 163 rows) and EXPERT (about 324 rows). In expert, `df['attendance'].isnull().sum()` is about 24, and `df = df.dropna(subset=['attendance'])` reports a dropout-rate change as a bad decision.

All pass:

```bash
git tag phase-6 && git push origin main --tags
```

## Phase 7: Level 04 spreadsheet, Stage 1 and Stage 2

### Paste into OpenCode

```text
PHASE 7 - Level 04 workspace: interactive spreadsheet (Mode A), Stage 1 and Stage 2. Follow the Phase Protocol in AGENTS.md. Reuse the engine from Phases 5 and 6 (createDfSession, generateStudents, liveHealth, parser, codegen) and the shell and flow from Phase 3.

1. Session wiring (src/levels/l04/session.tsx): a React context DfSessionProvider plus hook useDfSession(selector) built on the engine's createDfSession FACTORY (never a global singleton: side ops will create their own). Persist {seed, tier, ops history, cursor, flags, stage, hintsUsed, mistakes} to localStorage key 'nexus-l04-session' and rehydrate by REPLAY on reload. Wrap localStorage access in try/catch.
2. Clearance screen before Stage 1: three cards ASSISTED / INDEPENDENT / EXPERT describing what changes (highlights, dataset size, trickiness). A RECOMMENDED badge sits on ASSISTED for a first play (adaptive logic arrives in Phase 9). Choosing a card generates the dataset with seed = 1000 + attempt*17 + tierIndex.
3. Spreadsheet (src/levels/l04/Spreadsheet.tsx): a table of the CURRENT dataset with sticky header and sticky idx column. The header shows column name, dtype chip and null count. Clicking a header sorts ascending/descending as a VIEW ONLY (data and history unchanged; the code ribbon shows 'VIEW  df.sort_values(...)'). Per-column text filter. Filter chips: MISSING, DUPLICATES, and SUSPICIOUS (only when highlights are on). Single-click selects a cell; double-click or Enter edits inline (Esc cancels) and applies a set_cell op. Row checkboxes plus a DELETE ROWS button apply drop_rows. Each column has a menu with: Fill missing..., Standardise text..., Convert type..., Replace values... Each opens a small form that shows a PREVIEW line ('will change 5 cells' or 'will remove 3 rows') and applies the engine op with source 'ui'. A toolbar button DROP DUPLICATES. Must stay smooth with 324 rows (memoise rows).
4. Highlight layer driven by liveHealth cell map: missing = red fill; placeholders ('N/A', '-', '?') = red dashed; duplicate (second and later copies) = amber row stripe; out-of-range = magenta text with an icon; wrong-type column = cyan header outline with a 'text' warning chip; unknown or inconsistent department label = violet. Highlights are ON for ASSISTED and OFF for INDEPENDENT and EXPERT. In those tiers an 'Analyst Scan' toggle exists and costs one hint each time it is switched on.
5. CodeRibbon (bottom): shows the pandas code of the LAST operation (typewriter effect about 150 ms), a COPY button, and one plain sentence on what it does (derived from the op type). Expandable HistoryPanel listing every entry (code, rows before to after, source icon for ui/puzzle/command) with a BEFORE/AFTER summary per entry (shape, nulls, duplicates); UNDO and REDO buttons with Ctrl+Z and Ctrl+Shift+Z; a header 'Original: R rows - Current: C rows'; RESET DATASET with a confirm Modal.
6. Dataset Info panel (left, collapsible): buttons Shape, Info, Dtypes, Describe, Missing values, Duplicates. Each runs an inspect query, shows the result, AND shows the equivalent command in the ribbon.
7. Level definition src/levels/l04/definition.ts registered in the registry. Stage 1 'DATABASE BREACH': objectives tracked from events: (a) open Shape; (b) open Dtypes; (c) flag 3 suspicious rows or cells with the FLAG tool (generic orange marker). A PROCEED button appears when all are done.
8. Stage 2 'IDENTIFY THE CORRUPTION': FlagTool with brushes Missing, Duplicate, Inconsistent text, Wrong type, Invalid value, and a sixth Anomaly brush (for the hidden ghost records). The player picks a brush, then clicks cells, rows or column headers. A CORRUPTION REPORT panel lists counts per category. SUBMIT REPORT scores the flags against the generator's Issue list with precision, recall and F1 (pure function in src/levels/l04/flagScoring.ts) and gives feedback: ASSISTED lists exactly what was missed; INDEPENDENT says how many of each category were missed; EXPERT gives only an overall percentage. The stage passes when F1 is at least 0.6 OR after the second submission, so the player never soft-locks. Ghost flags are tracked for a later bonus but not required.
9. Hints: 3 progressive hints per stage.
10. Tests: session persistence round trip (apply 3 ops, serialise, rebuild, identical DF); flagScoring (perfect, empty, half, false positives); Spreadsheet render plus cell edit gives a history entry with code df.at[...] (testing-library); undo restores the previous DF.
```

### VERIFY Phase 7

Use the Dev Panel to unlock all levels, then open Level 4.

1. `npm run verify` passes.
2. Level 4, BEGIN MISSION, clearance screen, choose **ASSISTED**. A sheet with 47 rows appears. You can see red cells (5 attendance), amber stripes (3 duplicates), violet department cells (6), magenta values (2 ages and 1 cgpa) and a cyan warning chip on the attendance header.
3. Dataset Info, then Shape: the result shows `(47, 9)` and the ribbon shows `df.shape`.
4. Double-click an invalid age (199), type `20`, press Enter. The ribbon shows `df.at[<idx>, 'age'] = 20` and History has one entry. Press Ctrl+Z: 199 is back.
5. Tick three rows and click DELETE ROWS: the ribbon shows `df = df.drop(index=[...])`. UNDO restores them.
6. Column menu on `department`, Standardise text, strip, see the PREVIEW line, apply. The ribbon shows the code.
7. Click a column header to sort: the order changes, History does **not** gain an entry, and the ribbon shows a VIEW line.
8. Press F5 in the middle of the level. The sheet and the history are identical afterwards (replay) and the stage is preserved.
9. **Stage 1:** open Shape, open Dtypes, flag 3 suspicious cells. PROCEED appears.
10. **Stage 2:** flag each problem with the right brush and SUBMIT REPORT. High F1 passes. Restart Level 4 as **INDEPENDENT**: no highlights; switching on Analyst Scan shows highlights and the hint counter goes up by 1.

All pass:

```bash
git tag phase-7 && git push origin main --tags
```

## Phase 8: Level 04 console, builder, Stage 3 and Stage 4

### Paste into OpenCode

```text
PHASE 8 - Level 04 Console (Mode C), Command Builder (progressive coding), Stage 3 and Stage 4. Follow the Phase Protocol in AGENTS.md.

1. Tool tabs in the L04 workspace: [SPREADSHEET] [CONSOLE] [BUILDER] [STRATEGY LAB (disabled placeholder 'coming soon' until Phase 9)]. All tabs read and write the SAME session. A small badge on each shows its coding level: VISUAL / COMMAND BUILDING / CODE. CONSOLE and BUILDER unlock at Stage 3 with a 'NEW TOOL UNLOCKED' animation and a short guided intro overlay explaining how clicks, builder choices and typed code are the same thing.
2. Console (src/levels/l04/Console.tsx): terminal look, monospace, prompt 'df >'. Enter runs the line through parser.parse. inspect => prints pandas-like text output (tables, series, tuples). ops => session.apply(source 'command') and prints the op summary plus shape change. error => red message plus suggestion. Up and Down browse history, Tab inserts the first suggestion, 'help' lists supported commands, 'clear' clears. A collapsible 'Cheat sheet' lists supported commands with a one-line explanation; clicking one inserts it. Anything typed here appears immediately in the Spreadsheet tab and in History with source 'command'. Typing code is OPTIONAL: nothing in the main mission may require the Console.
3. Command Builder (src/levels/l04/Builder.tsx) = coding phase 2: build a command from selectable parts. STEP 1 target (df, or df['column'] with a column dropdown). STEP 2 method (dropdown filtered by the target's dtype: text => str.strip, str.lower, str.title, str.replace, replace map, fillna, astype; numeric => fillna, astype, between). STEP 3 arguments (dropdowns and inputs: mean(), median(), mode()[0], a value; subset columns; range numbers). A live preview shows the full pandas line. RUN executes it THROUGH THE PARSER so builder output equals typed code, and history is shared. Also a 'Fill the blank' mode: a command with one or two gaps, for example df['attendance'] = df['attendance'].____(df['attendance'].____()), and a chip tray to drop answers into; a wrong chip explains why it does not work.
4. Stage 3 'DATA RECONSTRUCTION': five meters (Missing, Duplicates, Inconsistent, Types, Invalid) driven by liveHealth showing remaining vs original counts; each meter is clickable and jumps to the relevant column in the Spreadsheet. The player repairs the data in any mode and any order. After EVERY op run judgeOp and show a toast plus Mission Log entry with the Decision; bad decisions show the explanation and an UNDO button inside the toast. A 'Pipeline tip' (free, no hint cost) explains once that order matters (standardise before de-duplicating) when relevant. Objectives: (a) at least ONE repair through the Builder (command practice); (b) complete 'Fill the blank' once; (c) bring at least 3 of the 5 meters to 0 (all five is the ideal). PROCEED appears when objectives are met. Never soft-lock: a SKIP REMAINING button appears after 10 operations and marks leftovers as unresolved.
5. Stage 4 'INTEGRITY CHECK': a validation dashboard built on liveHealth: a per-column table (expected dtype vs actual, nulls, out-of-range, unknown labels); a BEFORE vs AFTER table (rows, nulls, duplicates, distinct department labels, dropout rate); and a 'Run integrity checks' sequence that runs five checks one by one (animated), each showing its pandas command: df.isnull().sum(), df.duplicated().sum(), df.dtypes, df['department'].value_counts(), df[(df['age'] < 16) | (df['age'] > 40)]. The player may go BACK to the Stage 3 tools to fix leftovers (state preserved) and finally presses SUBMIT FOR AUDIT. SUBMIT calls assessQuality, stores the report in the mission session, and navigates to a debrief placeholder showing the Integrity Score and Efficiency score (the full debrief is Phase 9).
6. Mode-parity tests: the same repair applied through the UI form, the Builder, and a typed command yields deep-equal DFs (at least 3 repairs); every method in the Builder menus generates a line the parser accepts; the Console handles bad input without throwing.
```

### VERIFY Phase 8

1. `npm run verify` passes (parity tests included).
2. Reach Stage 3 in Level 4 (assisted). A NEW TOOL UNLOCKED animation appears; CONSOLE and BUILDER tabs are usable.
3. **Console:** type `df.shape`, `help`, `df.isnull().sum()`: outputs appear. Type `import os`: a friendly error, nothing executed.
4. Type `df = df.drop_duplicates()`, switch to the SPREADSHEET tab: the duplicate rows are gone, History shows the entry with source `command`, and the Duplicates meter reads 0.
5. **Builder:** choose `df['department']`, method `str.strip`, press RUN. The sheet updates and the code appears in History.
6. **Fill the blank:** drop a wrong chip: an explanation appears. Drop the right chips and the command runs.
7. Bad decision: run `df = df.dropna()`. A toast explains the information lost and has an UNDO button. Click it: the rows return.
8. Run `df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')` before removing the `%`: the decision toast warns that many valid values became null. Undo it.
9. Finish the repairs (use the 9-command script from the Phase 6 verification) and all five meters show 0. PROCEED appears. **Stage 4:** run the five checks, press SUBMIT FOR AUDIT. The placeholder debrief shows an Integrity Score of at least 85.
10. Press F5 on Stage 4: the state is preserved.

All pass:

```bash
git tag phase-8 && git push origin main --tags
```

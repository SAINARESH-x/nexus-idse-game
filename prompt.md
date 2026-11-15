# NEXUS — Phase 4 Completion and Interim Submission Handoff

## Instructions for Claude Code

You are taking over an existing project called **NEXUS**, an educational browser game for the course Introduction to Data Science for Engineers (IDSE).

This is a handoff into a completely new Claude Code session. You must treat the supplied project files and repository state as the source of truth. Do not assume previous conversations are available.

Your assignment is to:

1. Inspect the existing project and its development instructions.
2. Complete the outstanding work through **Phase 4 only**.
3. Make the project suitable for an **interim academic submission** at the end of Phase 4.
4. Keep Levels 1–3 playable, with all implemented features preserved.
5. Keep Levels 4–7 visibly marked as **IN DEVELOPMENT** and prevent access to unfinished gameplay.
6. Return the modified project to the owner for their own final browser testing and Git commit/push.

**The project is intentionally stopping at Phase 4 for this interim submission. Do not start Phase 5 or implement any Phase 5+ gameplay.**

---

## 1. Non-negotiable handoff and Git rules

The project owner will perform the final browser checks and all Git operations using their own GitHub identity.

Therefore:

- Do not create commits.
- Do not create, move, or delete Git tags.
- Do not push or pull.
- Do not change Git remotes, Git identity, branches, or repository configuration.
- Do not rewrite Git history.
- Do not delete or overwrite existing work.
- Do not run destructive Git commands such as `reset --hard`, `clean -fd`, or checkout commands that discard changes.
- Do not remove files just because they appear unused without proving they are safe to remove.
- Preserve all existing work, including uncommitted Phase 4 implementation.
- Do not include `.git`, `node_modules`, `dist`, or build caches in the returned source ZIP. The owner will apply the returned source changes to their original local Git working tree, preserving their repository history and identity.

Before editing, inspect and report the current Git status and recent commit history if Git metadata is present. Treat every existing modification and untracked file as potentially valuable.

If the project arrives without `.git`, simply work on the supplied source tree. Do not attempt to create a new repository.

---

## 2. Mandatory initial inspection

Before making changes:

1. Read `AGENTS.md` completely.
2. Read the original build kit:
   - `NEXUS Build Kit IDSE Data Science Game.md`
3. Read the corrected continuation plan:
   - `NEXUS_Build_Kit_Continuation_Phases_9-14_CORRECTED.md`
4. Read `docs/PROGRESS.md`.
5. Inspect `package.json`, lockfile, source tree, tests, and current application routes.
6. Inspect the existing Level 1, Level 2, and Level 3 implementations.
7. Inspect all current Phase 4 work and identify what is complete, incomplete, uncommitted, or unverified.
8. Inspect the current README and other documentation, if present.

Do not begin by replacing files or scaffolding a new project. This is an existing application and must be continued in place.

First provide a concise **handoff audit** identifying:
- Current implementation status by phase and level.
- Current verification status.
- Existing uncommitted changes.
- Missing Phase 4 requirements.
- Risks to the interim submission.
- A safe implementation order.

Then proceed with the work. Do not stop after the audit unless an essential input is missing or a destructive conflict makes progress unsafe.

---

## 3. Scope boundary: stop at Phase 4

The interim submission represents the game as it exists after Phase 4.

### Levels that must remain playable

- Level 1 — Datatypes, Strings & Collections.
- Level 2 — Control Flow & Functions.
- Level 3 — NumPy / Matrix Core.

Preserve their existing missions, side operations, bonuses, progression, scoring, and visual identity. Do not simplify or remove existing working features to make the interim version easier.

### Levels that must remain unavailable

- Level 4 — Pandas / Tabular Data & Cleaning.
- Level 5 — Descriptive Statistics, Visualisation & EDA.
- Level 6 — Probability & Inferential Statistics.
- Level 7 — Regression.

These levels are planned future work, not part of this interim build.

For the interim build:

- Clearly mark Levels 4–7 as **IN DEVELOPMENT** or an equally clear status.
- Do not let users enter unfinished mission routes by clicking cards, typing URLs, using browser history, or refreshing a deep link.
- Do not make unfinished levels appear playable.
- Do not create fake missions, fake completion screens, or placeholder interactions that imply the levels are implemented.
- Keep the campaign progression and existing level registry architecture coherent.
- If the current hub already shows future levels, preserve its design while clearly indicating their development status.
- Use the existing route protection / level gate patterns where possible.
- Do not delete the planned level definitions or future roadmap merely to hide unfinished content.

The game should communicate that NEXUS is an actively developed project and that Levels 4–7 are planned/in development.

---

## 4. Complete Phase 4

Use the supplied build-kit documents and `docs/PROGRESS.md` to determine the exact Phase 4 acceptance criteria. Do not invent a different Phase 4 scope.

The current project context indicates Phase 4 covers **Level 2 and Level 3**, and much of this implementation may already exist. Audit first; do not duplicate working code.

The expected Level 2 content includes the existing logic/control-flow mission mechanics, such as rule building, loop tracing, function blocks, boolean logic, side operations, bonuses, and mission integration, as specified by the project documents.

The expected Level 3 content includes the existing mini-NumPy / array mechanics, slicing, masks, vector operations, reshaping, side operations, bonuses, and mission integration, as specified by the project documents.

Verify that:
- The campaign registry references real Level 2 and Level 3 definitions.
- The briefing and play routes launch the correct missions.
- Side operations can be launched and completed through the existing flow.
- Completion, XP, credits, unlocks, and once-only reward behaviour work through the existing game store.
- Existing Levels 1–3 are not regressed.

Do not assume the previous Phase 4 completion report is sufficient. Inspect the actual code and run the checks.

---

## 5. Required Mask Master redesign: interactive IQR anomaly detection

The existing Level 3 **MASK MASTER** side operation needs a substantive learning redesign.

The original sensor dataset is unsuitable for an IQR lesson because its intended anomalous values are not outside its calculated IQR fences. Do not retain the old dataset or claim that it demonstrates IQR detection.

Inspect the existing Mask Master component, logic, content, tests, and side-operation completion flow. Keep its visual identity and integrate the redesign into the existing architecture.

### 5.1 Learning objective

Teach students how to:
- Understand Q1 and Q3.
- Calculate the interquartile range.
- Calculate lower and upper IQR fences.
- Use thresholds to flag potential outliers.
- Experiment with sensor readings and thresholds.
- Understand TP, FP, TN, FN, precision, and recall.

This must be an interactive learning exercise, not a static explanation or quiz.

### 5.2 New sensor dataset

Create a deterministic 6×6 dataset containing 36 readings.

It must contain:
- A realistic cluster of normal readings.
- At least one deliberately low anomalous reading.
- At least three deliberately high anomalous readings.
- Sufficient separation so that the intended anomalous readings are actually outside the IQR fences.
- No normal readings outside the initial IQR fences.

Before implementing the dataset, calculate and verify its statistics.

Use a clearly documented quartile convention, preferably the median-of-halves method unless the project already has a consistent suitable implementation.

Calculate:
- Q1
- Q3
- IQR = Q3 − Q1
- Lower fence = Q1 − 1.5 × IQR
- Upper fence = Q3 + 1.5 × IQR

Do not hardcode derived statistics in the UI. The app must calculate them from the current readings.

Add tests proving that the chosen dataset contains exactly 36 readings and that the IQR fences identify exactly the intended original anomalous cells.

### 5.3 Editable sensor grid

Preserve the existing 6×6 grid presentation where practical.

Students must be able to select a cell and edit its numeric reading.

Requirements:
- Validate input and reject empty, NaN, Infinity, and invalid numeric values.
- Apply sensible numeric limits.
- Reflect confirmed edits immediately in the grid.
- Provide a reset-to-original-data action.
- Keep the original ground-truth labels immutable and separate from editable readings.

Editing an observed value must never modify the hidden answer key.

### 5.4 Calculate IQR button

Add a clear **CALCULATE IQR** button.

Before it is pressed, do not reveal Q1, Q3, IQR, or the fences.

When pressed:
- Calculate the statistics from the current edited dataset.
- Display Q1, Q3, IQR, lower fence, and upper fence.
- Show the formulas and brief beginner-friendly explanations.
- Use consistent numerical precision.
- Allow the student to edit readings and recalculate.

The calculation must be reusable pure logic, separate from React presentation.

### 5.5 Student-controlled thresholds

After IQR calculation, enable:
- Lower threshold slider.
- Upper threshold slider.

Display the calculated IQR fences as reference values. Do not permanently lock the sliders to the IQR fences. Students must be able to experiment with thresholds that differ from the statistical recommendations.

Requirements:
- Show each slider's current numerical value.
- Update the detection results immediately as sliders move.
- Provide a reset-to-IQR-fences action.
- Prevent invalid lower/upper ordering.
- Use a sensible range and step.
- Explain the distinction between statistical IQR fences and the student's chosen detection thresholds.

Use the strict detection rule:

`reading < lowerThreshold OR reading > upperThreshold`

Values exactly equal to either threshold must not be flagged.

### 5.6 Live detection

As students adjust thresholds:
- Update the 6×6 grid immediately.
- Highlight flagged cells.
- Keep unflagged cells distinguishable.
- Display the number of flagged readings.
- Use accessible visual cues; do not rely on colour alone.
- Respond to both dataset edits and threshold changes.

### 5.7 Confusion matrix and evaluation

Keep the original anomaly labels hidden until the operation is completed.

Use the immutable original labels to calculate:
- True Positives.
- False Positives.
- True Negatives.
- False Negatives.
- Precision = TP / (TP + FP).
- Recall = TP / (TP + FN).

Handle zero denominators safely. Never display NaN or Infinity.

Update the evaluation immediately as thresholds change.

Ground-truth labels must not change when students edit readings. An originally normal cell remains normal for scoring even if its observed reading is edited to an extreme value; an originally anomalous cell remains anomalous even if its reading is edited to a normal value.

Explain that IQR flags statistical outliers, while precision and recall compare predictions against known labels in this simulated exercise.

### 5.8 Contextual feedback

Provide short feedback based on actual evaluation results.

Examples:
- Too-low upper threshold can increase false positives.
- Too-high upper threshold can miss high anomalies.
- Too-high lower threshold can flag normal low readings.
- Too-low lower threshold can miss a low anomaly.

Do not hardcode feedback based only on slider position.

Explain precision and recall in beginner-friendly language.

### 5.9 Completion and rewards

Integrate with the existing side-operation completion system.

Do not award completion merely because the student calculates IQR.

Define and document a meaningful success rule using both precision and recall, with a sensible threshold.

Preserve existing once-only XP/credit rewards and mission flow. Do not create a parallel scoring system or bypass the existing store.

Do not reveal the hidden answer key before completion.

---

## 6. Interim submission readiness

Once Phase 4 is complete, prepare the repository so that a lecturer can understand what has actually been built and run it.

### 6.1 README.md

Create or substantially improve the root `README.md`.

It should be professional, concise, accurate, and suitable for an academic interim submission.

Include:
1. Project title: NEXUS.
2. A short description of the educational game and its purpose.
3. IDSE course context.
4. Learning objectives.
5. Current implementation status: Phase 4 complete; Levels 1–3 playable.
6. A clear status table for all seven levels:
   - Levels 1–3: implemented/playable, subject to actual verification.
   - Levels 4–7: in development.
7. Main gameplay features actually implemented.
8. Technologies used, verified against `package.json`.
9. Project structure overview.
10. Prerequisites.
11. Exact installation and local development commands.
12. How to run automated verification.
13. How to build for production.
14. Screenshots or GIFs, but only if genuine assets are supplied or can be captured from the real application.
15. Known limitations.
16. Future development roadmap.
17. Credits / team information only where details are supplied by the owner.

Do not invent team members, instructor names, institutional claims, or the other team's repository URL.

### 6.2 Other documentation

Inspect the current documentation before creating additional files.

Add only files that genuinely improve the interim submission. Potentially useful:
- `docs/PROJECT_OVERVIEW.md`
- `docs/INTERIM_SUBMISSION.md`

Do not create redundant documentation just to make the repository look larger.

If the project is part of a larger two-team assignment, leave a clearly labelled placeholder for the other team's repository link only if its exact URL has not been supplied. Do not invent that URL or imply integration has been completed.

### 6.3 Screenshots

Do not fabricate screenshots.

If the environment allows reliable browser screenshots, capture genuine screenshots of:
- Title screen.
- Campaign hub showing Levels 1–3 playable and Levels 4–7 in development.
- At least one Level 1 mission.
- At least one Level 2 mission.
- At least one Level 3 mission.
- Redesigned Mask Master.

If browser access or screenshot capture is unavailable, list the exact screenshots the owner should capture during their final browser check. Do not claim screenshots were captured if they were not.

### 6.4 Progress documentation

Update `docs/PROGRESS.md` accurately.

Record:
- Phase 4 completion status.
- Levels 1–3 implementation status.
- Mask Master IQR redesign.
- Automated verification results.
- Manual browser checks still required.
- Levels 4–7 intentionally deferred and marked in development.
- Interim submission preparation completed.
- Explicit statement that no Phase 5+ implementation was performed.

Do not mark manual tests as passed unless they were actually performed.

---

## 7. Route protection and interim presentation

Verify that Levels 4–7 are inaccessible through all normal entry points:

- Campaign hub cards.
- Direct URL navigation.
- Refreshing a deep link.
- Browser back/forward navigation.
- Any other level launch controls.

The user-facing status should say **IN DEVELOPMENT** (or equivalent), not simply "locked" in a way that suggests the player can unlock it through XP.

Do not accidentally block Levels 1–3 or break their progression.

The application should still launch cleanly and let a reviewer explore all completed content.

---

## 8. Automated verification and regression checks

Run the verification commands required by the project documentation and `AGENTS.md`.

At minimum:
- `npm run verify`
- Targeted Level 2 and Level 3 tests.
- Targeted Mask Master tests.
- Production build.

Test:
- Level 1 remains functional.
- Level 2 remains functional.
- Level 3 remains functional.
- Mask Master IQR calculation and editing work.
- Threshold changes update detections and metrics.
- Ground truth remains immutable.
- Mission completion and rewards work.
- Levels 4–7 are visibly in development and inaccessible.
- Direct routes to unfinished levels are protected.
- README commands match the actual project scripts.

Do not weaken existing tests or remove tests to obtain a passing result.

Fix reasonably repairable failures. Clearly report anything that remains failing or unverified.

---

## 9. Manual browser testing handoff

The owner will perform the final browser check.

Prepare a concise, ordered checklist that the owner can follow quickly.

Include:
1. Start the development server.
2. Confirm the title screen and campaign hub.
3. Confirm Levels 1–3 are accessible.
4. Confirm Levels 4–7 show IN DEVELOPMENT.
5. Try direct navigation to an unfinished level and confirm it is blocked.
6. Launch and complete a representative Level 2 mission.
7. Launch and complete a representative Level 3 mission.
8. Test Mask Master:
   - Edit a sensor reading.
   - Reset the dataset.
   - Calculate IQR.
   - Inspect Q1/Q3/IQR/fences.
   - Adjust lower and upper sliders.
   - Observe the grid and confusion matrix update.
   - Complete the operation.
9. Refresh the application and check that existing persistence/progression behaves as intended.
10. Check browser console for significant runtime errors.

Only claim manual verification if you actually performed it in a browser. Otherwise state that the owner must perform it.

---

## 10. Quality and implementation constraints

- Follow `AGENTS.md`.
- Preserve the existing stack and architecture.
- Do not add dependencies unless clearly necessary.
- Keep statistical logic independently testable.
- Preserve TypeScript strictness.
- Do not introduce `any` as a shortcut.
- Keep UI consistent with the existing NEXUS dark futuristic design.
- Avoid unrelated refactoring.
- Do not start Phase 5.
- Do not implement Levels 4–7.
- Do not add fake content or fake screenshots.
- Do not remove functioning features from Levels 1–3.
- Do not claim features are implemented unless code and tests support the claim.

If the supplied build-kit instructions conflict with this handoff, follow the more specific instruction in this file for the interim submission boundary, while preserving the project's existing architecture and rules.

---

## 11. Final deliverables

Return:

### A. Modified project source
A complete updated source tree that the owner can merge into their original local repository.

Do not include:
- `.git`
- `node_modules`
- `dist`
- temporary build caches
- API keys, credentials, local secrets, or machine-specific configuration

Include all required source, public assets, documentation, lockfiles, and tests.

### B. Returned ZIP
Create one ZIP of the complete modified project source, excluding the items above.

Use a clear filename such as:

`NEXUS_Phase4_Interim_Submission.zip`

### C. Final report
Provide:
1. Initial project audit.
2. Phase 4 work completed.
3. Level 1–3 verification status.
4. Mask Master redesign details and verified statistical values.
5. Levels 4–7 locking / IN DEVELOPMENT behaviour.
6. README and documentation changes.
7. Files added, modified, or removed.
8. Automated test results.
9. Production build result.
10. Manual browser checks not performed.
11. Known limitations.
12. Exact instructions for the owner to apply the returned source to their original Git repository.
13. Confirmation that no Git commit, tag, push, or history rewrite was performed.

**Do not finish with only a report. The modified project source and ZIP are the required deliverables.**

---

## 12. Final instruction

Work carefully and preserve the project.

The objective is a **stable, honest, polished interim submission at the end of Phase 4**, not an unfinished attempt at the full seven-level game.

The owner will:
- Receive the ZIP.
- Apply the source changes to their original local repository.
- Run the final browser checks.
- Review the changes.
- Commit, tag, and push using their own GitHub account.

Do not perform those Git operations on the owner's behalf.

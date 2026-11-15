# TASK: REDESIGN LEVEL 03 MASK MASTER INTO AN INTERACTIVE IQR-BASED ANOMALY DETECTION MISSION

You are working on **NEXUS**, an educational Data Science browser game.

Your task is to redesign the existing **MASK MASTER side operation in Level 03 – MATRIX CORE** into a mathematically correct, interactive IQR-based anomaly detection exercise.

This is an implementation task, not a planning task. Inspect the existing implementation, understand its architecture, make the changes, run verification, and report the results.

## 1. FIRST: INSPECT THE EXISTING PROJECT

Before changing anything:

1. Read `AGENTS.md` completely.
2. Read the relevant sections of:
   - `NEXUS Build Kit IDSE Data Science Game.md`
   - `NEXUS_Build_Kit_Continuation_Phases_9-14_CORRECTED.md`
   - `docs/PROGRESS.md`
3. Inspect the complete existing Level 03 implementation, particularly:
   - `src/levels/l03/`
   - The existing Mask Master component and its logic.
   - Level 03 content, definitions, objectives, and bonus logic.
   - Existing Level 03 tests.
   - Shared mission, challenge, scoring, and persistence systems.
4. Identify how the existing side operation is registered, launched, completed, scored, and rewarded.

Do not assume filenames or architecture. Locate the actual implementation.

**Important:** Preserve all existing Level 03 functionality outside the Mask Master changes.

Do not rewrite the entire level or introduce a separate implementation that bypasses the existing mission framework.

## 2. CORE LEARNING OBJECTIVE

The redesigned mission must teach students:

- What quartiles are.
- How Q1 and Q3 are obtained.
- What the interquartile range (IQR) represents.
- How lower and upper outlier fences are calculated.
- How statistical thresholds can identify potential anomalies.
- How changing thresholds affects anomaly detection.
- The difference between true positives, false positives, true negatives, and false negatives.
- How precision and recall respond to threshold changes.

The experience must be interactive and educational, not a static explanation or ordinary quiz.

## 3. SENSOR DATASET — REPLACE THE CURRENT DATA

The existing dataset must be replaced because its IQR fences do not identify the intended anomalies.

Create a new 6×6 sensor dataset containing:

- A realistic cluster of normal sensor readings.
- At least one deliberately low anomalous reading.
- At least three deliberately high anomalous readings.
- Enough separation between normal and anomalous readings for the IQR method to identify the intended anomalies.

Do not arbitrarily choose values and assume they work.

**Mathematically calculate and verify the dataset before implementing it.**

Requirements:

1. Calculate Q1, Q3, and IQR using a clearly documented quartile convention.
2. Calculate:
   - Lower fence = Q1 − 1.5 × IQR
   - Upper fence = Q3 + 1.5 × IQR
3. Verify that all intended anomalous readings fall outside the corresponding fences.
4. Verify that normal readings are not incorrectly flagged by the initial IQR fences.
5. Verify that the dataset contains exactly 36 readings.
6. Ensure the dataset is deterministic and reproducible.

Use a consistent quartile calculation throughout the mission and tests. Prefer a clearly documented convention equivalent to the median-of-halves method, unless the existing project already provides a suitable consistent implementation.

Do not reuse the old dataset simply because it already exists.

## 4. SENSOR DATASET — EDITABLE GRID

Retain the existing 6×6 grid visual design wherever possible.

Students must be able to:

- Click a sensor cell.
- Edit its numeric reading.
- Confirm the change.
- See the updated reading immediately.
- Experiment with changing normal and anomalous readings.

Requirements:

- Validate numeric input.
- Prevent invalid values such as NaN and Infinity.
- Handle empty input safely.
- Apply reasonable limits to editable readings.
- Make edited cells visually distinguishable if useful.
- Provide a reset-to-original-dataset action.
- Ensure editing the dataset does not mutate the original ground-truth answer key.

The original ground-truth anomaly labels must remain fixed for scoring.

**Important distinction:** The student is experimenting with observed sensor readings, not changing the hidden answer key.

## 5. STATISTICAL ANALYSIS — CALCULATE IQR BUTTON

Add a prominent, clearly labelled button:

`CALCULATE IQR`

Before the button is pressed:

- Do not reveal the calculated Q1, Q3, IQR, or fences.
- Show a brief explanation of what the calculation will do.
- Make it clear that students should inspect the dataset first.

When pressed, calculate statistics from the CURRENT edited dataset.

Display:

| Statistic | Result |
|---|---|
| Q1 | Calculated value |
| Q3 | Calculated value |
| IQR | Q3 − Q1 |
| Lower fence | Q1 − 1.5 × IQR |
| Upper fence | Q3 + 1.5 × IQR |

Requirements:

- Show appropriate numerical precision.
- Explain each statistic briefly.
- Display the formula used.
- Make the results understandable to a beginner.
- Ensure the results update when the student edits the dataset and presses Calculate IQR again.

Do not hardcode the calculated values for the original dataset.

Implement the calculation as reusable, independently testable pure logic.

## 6. THRESHOLD CONTROLS — STUDENT EXPERIMENTATION

After IQR calculation, enable two interactive sliders:

1. Lower threshold.
2. Upper threshold.

The IQR lower and upper fences must be visible as reference values.

The student must be free to move the sliders independently rather than having them permanently locked to the IQR fences.

Requirements:

- Display the current numeric threshold beside each slider.
- Update anomaly detection immediately when a slider moves.
- Use the currently edited dataset.
- Prevent invalid lower/upper ordering.
- Make it clear that the IQR fences are statistical recommendations and the sliders represent the student's selected thresholds.
- Provide a reset-to-IQR-fences action.

The detection rule must be:

`reading < lowerThreshold OR reading > upperThreshold`

Use strict inequalities, not inclusive comparisons.

A reading exactly equal to a threshold must not be flagged.

The sliders should have a sensible range and step size for the dataset.

## 7. LIVE ANOMALY DETECTION

As the student changes either threshold:

- Update the 6×6 sensor grid immediately.
- Highlight flagged readings.
- Keep unflagged readings visually distinguishable.
- Clearly indicate the current selected threshold values.
- Display the number of flagged readings.

Use a clear visual distinction without overwhelming the existing dark NEXUS design.

The grid must respond to both:

- Dataset edits.
- Threshold changes.

Avoid unnecessary rerenders or duplicated state.

## 8. EVALUATION — CONFUSION MATRIX

Keep the original ground-truth anomaly labels hidden from the student during experimentation.

Use the immutable original ground-truth labels to calculate:

- True Positives (TP)
- False Positives (FP)
- True Negatives (TN)
- False Negatives (FN)

Display the four values in a clear confusion-matrix-style layout.

Calculate:

Precision = TP / (TP + FP)

Recall = TP / (TP + FN)

Handle zero denominators safely. Never display NaN or Infinity. Explain undefined metrics clearly, or use an appropriate zero-value convention consistently with the existing scoring system.

Show precision and recall as percentages.

Update these metrics immediately whenever the student adjusts thresholds.

### Important data integrity rule

The hidden ground-truth labels must not be changed when the student edits a reading.

For example:

- An originally normal cell remains normal for scoring even if the student changes its reading to an extreme value.
- An originally anomalous cell remains anomalous for scoring even if the student edits its reading to a normal value.

This is intentional: students are experimenting with detection, while evaluation compares their predictions against the original known labels.

Do not reveal the answer key before the student completes the operation.

## 9. EDUCATIONAL FEEDBACK

Add concise contextual feedback explaining what is happening.

Examples:

- Too-low upper threshold: "You are flagging normal readings as anomalies. Your false positives are increasing."
- Too-high upper threshold: "Some genuine high anomalies are now being missed."
- Too-high lower threshold: "Normal low readings are being incorrectly flagged."
- Too-low lower threshold: "A genuine low anomaly may escape detection."
- Good detection: "Your selected thresholds are successfully isolating the anomalous readings."

Feedback must be calculated from actual detection results, not hardcoded based on slider positions.

Provide a short explanation of the relationship between precision and recall.

Do not make the exercise trivial by showing students the correct answer before they experiment.

## 10. MISSION COMPLETION AND SCORING

Integrate the redesigned Mask Master into the existing NEXUS side-operation completion system.

Preserve:

- Existing side-operation registration.
- Existing completion flow.
- Existing once-only reward behaviour.
- Existing XP and credit rules.
- Existing mission UI conventions.
- Existing bonus and progression systems.

Define meaningful completion criteria.

A successful solution should require the student to achieve strong detection performance against the hidden original labels.

Use a clearly documented scoring rule based on precision and recall, with a sensible requirement that both metrics are sufficiently high.

Do not award completion simply because the student presses Calculate IQR.

Do not award completion simply because the student reaches the original IQR fences if the detection results are incorrect.

The student must demonstrate that they understand how the thresholds affect the detection results.

If the existing mission framework has a standard success/failure outcome, use it instead of inventing a separate completion system.

## 11. USER EXPERIENCE AND VISUAL DESIGN

Keep the existing NEXUS visual identity:

- Dark navy/black interface.
- Restrained cyan, blue, and purple accents.
- Existing typography and components.
- Existing panel, button, badge, slider, and grid conventions.

The redesigned flow should feel like a sensor-analysis workstation.

Suggested sequence:

1. Inspect sensor readings.
2. Edit readings and experiment.
3. Press Calculate IQR.
4. Examine Q1, Q3, IQR, and fences.
5. Adjust lower and upper thresholds.
6. Observe flagged readings.
7. Examine confusion matrix, precision, and recall.
8. Submit the operation.
9. Receive a debrief explaining the outcome.

Do not overload the screen with unnecessary instructions.

Use progressive disclosure: reveal controls and statistical results when they become relevant.

Ensure the interface works at the existing supported screen sizes.

Maintain accessibility:

- Clear labels.
- Keyboard-accessible controls.
- Readable contrast.
- No reliance on colour alone to convey detection status.

## 12. TESTING REQUIREMENTS

Add or update automated tests for all important logic.

At minimum, test:

### IQR calculation
- Correct Q1.
- Correct Q3.
- Correct IQR.
- Correct lower fence.
- Correct upper fence.
- Correct behaviour with sorted and unsorted inputs.
- Correct behaviour for duplicate values.
- Invalid and empty inputs handled safely.
- Recalculation after dataset edits.

### Anomaly detection
- Values below lower threshold are flagged.
- Values above upper threshold are flagged.
- Values exactly equal to either threshold are not flagged.
- Normal values remain unflagged when appropriate.
- Threshold adjustments update results.

### Confusion matrix
- Correct TP, FP, TN, FN.
- Correct precision.
- Correct recall.
- Zero-denominator handling.
- Ground-truth labels remain unchanged after dataset edits.

### Mission integration
- Calculate IQR does not automatically complete the operation.
- Successful threshold selection completes the operation correctly.
- Failed detection does not incorrectly award completion.
- Existing once-only rewards remain intact.
- Existing Level 03 functionality remains unaffected.

### Dataset validation
Add a test proving that the original 36-value dataset:

- Has exactly 36 readings.
- Produces the documented Q1, Q3, IQR, and fences.
- Flags exactly the intended original anomalous readings using the IQR fences.
- Does not flag the normal readings.

Do not weaken or delete existing tests to make the new implementation pass.

## 13. IMPLEMENTATION QUALITY

- Follow `AGENTS.md`.
- Reuse existing project components and design patterns.
- Keep statistical logic separate from React UI.
- Avoid unnecessary dependencies.
- Avoid hardcoded derived statistics.
- Avoid duplicated state.
- Preserve TypeScript strictness.
- Do not introduce `any` to bypass typing.
- Do not alter other Level 03 missions.
- Do not alter Levels 01 or 02.
- Do not modify campaign progression rules unless strictly necessary.
- Do not introduce backend services or API dependencies.
- Keep all functionality local and deterministic.

## 14. DOCUMENTATION

Update `docs/PROGRESS.md` to reflect the actual Mask Master redesign.

Include:

- What changed.
- New IQR learning flow.
- Dataset and quartile convention.
- Statistical formulas.
- Scoring and completion rules.
- Files added or modified.
- Tests added.
- Verification results.
- Any remaining limitations.

Do not claim manual browser verification unless it has actually been performed.

## 15. VERIFICATION

After implementation, run:

`npm run verify`

Also run targeted tests for the relevant Level 03 logic and components.

Check:

- TypeScript passes.
- All relevant tests pass.
- Production build succeeds.
- No existing Level 03 tests have regressed.

Inspect the final Git diff and ensure no unrelated files were changed.

If verification fails, investigate and fix the underlying issue. Do not simply report the failure and stop if it is reasonably fixable.

## 16. GIT RULES

Do not:

- Create a Git tag.
- Push to GitHub.
- Rewrite previous commits.
- Reset or discard existing user changes.
- Commit unrelated work.

You may create one focused commit for this task only after implementation and automated verification succeed.

Suggested commit message:

`feat(l03): redesign mask master with interactive IQR detection`

If the current branch or working tree makes committing unsafe, do not commit. Explain why.

## 17. FINAL REPORT

When finished, provide a structured report:

1. Implementation summary.
2. New sensor dataset and its verified statistical values.
3. Quartile convention used.
4. How editing works.
5. How IQR calculation works.
6. How threshold sliders work.
7. How confusion matrix, precision, and recall work.
8. Mission completion criteria.
9. Files changed.
10. Tests added and results.
11. `npm run verify` results.
12. Git commit hash, if created.
13. Remaining issues or manual browser checks I must perform.

Be precise. Do not claim something works unless it has been implemented and verified.

---

**FINAL PRIORITY:** This is an educational Data Science mission. Mathematical correctness and student understanding are more important than visual effects. Preserve the existing NEXUS architecture and make Mask Master a genuinely useful interactive lesson in IQR-based anomaly detection.
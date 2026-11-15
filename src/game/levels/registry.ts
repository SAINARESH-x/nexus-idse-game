// Level registry: the seven campaign definitions, fragments and placeholder content.
import type { BonusDef, LevelDefinition, LevelId, SideOpDef, StageDef } from '../types'
import { LEVEL_IDS } from '../config'
import { LEVEL_1 } from '../../levels/l01/definition'

/** Story fragments revealed when the matching main mission is completed. */
export const FRAGMENT_TEXT: Record<string, string> = {
  F1: 'I used to know every student by name. Then the feed turned to noise and I forgot how to read.',
  F2: 'I learned rules. Accept, quarantine, reject. A rule is only as wise as its order.',
  F3: 'A hundred sensors, and one lied slowly, four tenths at a time. Nobody looked.',
  F4: 'Forty-seven records walked in. I trusted every one. Some were copies. Some never existed.',
  F5: 'When I finally looked, the pattern was plain: the students who stopped coming were the ones who left.',
  F6: 'A pattern is not a reason. I learned to ask whether it was signal or chance.',
  F7: 'Predict, then test on what you have never seen. That is the only honest forecast.',
}

const stage = (id: string, title: string, subtitle: string, ...hints: string[]): StageDef => ({
  id,
  title,
  subtitle,
  hints,
})

const sideOp = (id: string, title: string, blurb: string, ...hints: string[]): SideOpDef => ({
  id,
  title,
  blurb,
  hints,
})

const bonus = (
  id: string,
  title: string,
  description: string,
  hidden = false,
): BonusDef => ({
  id,
  title,
  description,
  hidden,
  // Bonus conditions are wired in the phase that owns each level.
  evaluate: () => false,
})

const bonuses = (level: number): BonusDef[] => [
  bonus(`l${level}-bonus-1`, 'CLEAN EXECUTION', 'Finish the mission without a single mistake.'),
  bonus(`l${level}-bonus-2`, 'NO NET', 'Complete the mission without using a hint.'),
  bonus(`l${level}-bonus-hidden`, 'HIDDEN TRACE', 'Undocumented bonus. Find it by exploring.', true),
]

const sideOps = (first: SideOpDef, second: SideOpDef): SideOpDef[] => [first, second]

export const LEVELS: LevelDefinition[] = [
  LEVEL_1,
  {
    id: 2,
    title: 'LOGIC PROTOCOL',
    syllabus: 'Control flow, loops, functions',
    mission: 'GATEKEEPER',
    briefing:
      "A rulebook survived the crash. Conditions, loops and functions still decide who enters the campus network. Rebuild the gatekeeper's logic without letting a single edge case slip through.",
    objectives: [
      'Reconstruct the access conditions',
      'Trace and repair the patrol loops',
      'Seal reusable checks inside functions',
    ],
    stages: [
      stage('l2-stage-1', 'GATE LOGIC', 'Conditions first', 'Check the most specific case first.', 'An else branch should cover the remaining states.'),
      stage('l2-stage-2', 'LOOP LADDER', 'Repeat with intent', 'A while loop needs a state change inside.', 'Prefer for loops when the collection is known.'),
      stage('l2-stage-3', 'FUNCTION VAULT', 'Reusable rules', 'A function should do one thing.', 'Return values beat printing from inside a function.'),
    ],
    sideOps: sideOps(
      sideOp('l2-side-1', 'BRANCH AUDIT', 'Find the condition that never fires.', 'Trace each branch with a boundary value.', 'Look for overlapping conditions.'),
      sideOp('l2-side-2', 'RECURSION RELAY', 'Unroll a recursive check.', 'Every recursive function needs a base case.', 'State must move toward the base case.'),
    ),
    bonuses: bonuses(2),
    fragmentId: 'F2',
  },
  {
    id: 3,
    title: 'MATRIX CORE',
    syllabus: 'NumPy arrays, slicing, masks, vectorisation',
    mission: 'SIGNAL GRID',
    briefing:
      'NEXUS remembers a grid of sensors, not a list of them. Learn to think in whole arrays: slice, mask and vectorise until one operation speaks for a hundred.',
    objectives: [
      'Load the sensor grid as an array',
      'Slice the signal bands without loops',
      'Apply boolean masks to isolate faults',
    ],
    stages: [
      stage('l3-stage-1', 'ARRAY CALIBRATION', 'Shape and dtype', 'Shape describes dimensions; dtype describes values.', 'Indexing starts at zero.'),
      stage('l3-stage-2', 'SLICE CORRIDOR', 'Rows and columns', 'A comma separates axis slices.', 'A slice keeps the original dimension.'),
      stage('l3-stage-3', 'MASK ENGINE', 'Vectorised filters', 'A comparison on an array returns a boolean mask.', 'Combine masks with & and |, not and/or.'),
    ],
    sideOps: sideOps(
      sideOp('l3-side-1', 'BROADCAST LAB', 'Align arrays of different shapes.', 'Broadcasting expands size-one dimensions.', 'Shapes align from the right.'),
      sideOp('l3-side-2', 'STRIDE SCAN', 'Sample a grid without copying.', 'Strides describe how many bytes each step skips.', 'A view shares memory with the original.'),
    ),
    bonuses: bonuses(3),
    fragmentId: 'F3',
  },
  {
    id: 4,
    title: 'DATA VAULT',
    syllabus: 'Pandas, data cleaning and validation',
    mission: 'THE PURGE',
    briefing:
      'Forty-seven student records are waiting in the vault. Some are duplicates, some are missing fields, some never existed at all. This is the mission that broke NEXUS. Clean the data, and prove every decision.',
    objectives: [
      'Triage the corrupted student table',
      'Classify every issue with evidence',
      'Repair without inventing records',
      'Pass the final integrity audit',
    ],
    stages: [
      stage('l4-stage-1', 'DATABASE BREACH', 'Open the vault', 'Inspect before you edit.', 'Count rows and columns first.'),
      stage('l4-stage-2', 'IDENTIFY THE CORRUPTION', 'Name every issue', 'Missing, duplicate and impossible values are different problems.', 'Evidence beats intuition.'),
      stage('l4-stage-3', 'DATA RECONSTRUCTION', 'Repair with a reason', 'Never invent a value that was not there.', 'Each edit needs a justification.'),
      stage('l4-stage-4', 'INTEGRITY CHECK', 'Prove the result', 'A repair is only done when the audit passes.', 'Run the checks again after every operation.'),
    ],
    sideOps: sideOps(
      sideOp('l4-side-1', 'DUPLICATE HUNT', 'Separate real copies from look-alikes.', 'Compare on more than one column.', 'A shared name is not proof of duplication.'),
      sideOp('l4-side-2', 'TYPE DOCTOR', 'Normalise mismatched column types.', 'Check the values before converting.', 'Conversion failures are evidence, not noise.'),
    ),
    bonuses: bonuses(4),
    fragmentId: 'F4',
  },
  {
    id: 5,
    title: 'SIGNAL SCOPE',
    syllabus: 'Exploratory analysis and visualisation',
    mission: 'FIND THE PATTERN',
    briefing:
      'The vault is clean; now make it speak. Explore distributions, compare groups and turn a spreadsheet into a picture a human can act on.',
    objectives: [
      'Profile the cleaned dataset',
      'Find relationships worth reporting',
      'Build visuals that do not mislead',
    ],
    stages: [
      stage('l5-stage-1', 'DISTRIBUTION SCAN', 'Describe the shape', 'Always look at spread, not just the mean.', 'Outliers can hide in a summary table.'),
      stage('l5-stage-2', 'CORRELATION WEB', 'Compare two measures', 'Correlation is not causation.', 'A scatter plot shows what a single number hides.'),
      stage('l5-stage-3', 'VISUAL REPORT', 'Make it readable', 'Label both axes.', 'Start bar charts at zero.'),
    ],
    sideOps: sideOps(
      sideOp('l5-side-1', 'OUTLIER LENS', 'Explain the extreme values.', 'Check whether an outlier is an error or a fact.', 'Never delete a record just because it is unusual.'),
      sideOp('l5-side-2', 'SEGMENT SPLIT', 'Compare meaningful groups.', 'Choose groups before looking at the outcome.', 'Small groups produce noisy averages.'),
    ),
    bonuses: bonuses(5),
    fragmentId: 'F5',
  },
  {
    id: 6,
    title: 'CHANCE ENGINE',
    syllabus: 'Statistics: sampling, correlation, hypothesis testing',
    mission: 'SIGNAL OR NOISE',
    briefing:
      'A pattern is not a reason. NEXUS has been fooled by coincidence before. Learn to separate signal from noise with sampling, correlation and honest hypothesis tests.',
    objectives: [
      'Draw a representative sample',
      'Measure association without overclaiming',
      'Test whether the pattern could be chance',
    ],
    stages: [
      stage('l6-stage-1', 'SAMPLE GATE', 'Who is in the sample?', 'Random sampling reduces selection bias.', 'Bigger samples narrow the uncertainty.'),
      stage('l6-stage-2', 'CORRELATION TRIAL', 'Measure association', 'Correlation ranges from -1 to 1.', 'A strong correlation can still be spurious.'),
      stage('l6-stage-3', 'SIGNAL TEST', 'Hypothesis and evidence', 'State the null before looking at the p-value.', 'A p-value is not the probability the null is true.'),
    ],
    sideOps: sideOps(
      sideOp('l6-side-1', 'BIAS CHECK', 'Audit how the sample was chosen.', 'Convenience samples are rarely representative.', 'Missing groups can reverse a conclusion.'),
      sideOp('l6-side-2', 'POWER RUN', 'Ask whether the test could see an effect.', 'Small effects need large samples.', 'Power is the chance of detecting a real effect.'),
    ),
    bonuses: bonuses(6),
    fragmentId: 'F6',
  },
  {
    id: 7,
    title: 'PREDICTION CORE',
    syllabus: 'Regression, model evaluation, overfitting',
    mission: 'FINAL FORECAST',
    briefing:
      'The last fragment is a warning: a model that only remembers the past is not a forecast. Fit a regression, test it on unseen data and resist the urge to chase a perfect score.',
    objectives: [
      'Fit a baseline regression',
      'Evaluate on data the model has never seen',
      'Diagnose and reduce overfitting',
    ],
    stages: [
      stage('l7-stage-1', 'MODEL FOUNDRY', 'Fit a baseline', 'Start simple before adding features.', 'A residual plot exposes structure.'),
      stage('l7-stage-2', 'VALIDATION RIFT', 'Guard the test set', 'Never tune on the data you report.', 'A single split can be unlucky.'),
      stage('l7-stage-3', 'FORECAST CORE', 'Ship an honest model', 'Compare against a trivial baseline.', 'Report uncertainty with the prediction.'),
    ],
    sideOps: sideOps(
      sideOp('l7-side-1', 'OVERFIT TRAP', 'Spot a model that memorised.', 'Training error near zero is a warning sign.', 'Watch the gap to validation error.'),
      sideOp('l7-side-2', 'FEATURE PRUNE', 'Remove what does not help.', 'More features are not always better.', 'Test each removal on validation data.'),
    ),
    bonuses: bonuses(7),
    fragmentId: 'F7',
  },
]

export const LEVEL_BY_ID: Record<LevelId, LevelDefinition> = {
  1: LEVELS[0],
  2: LEVELS[1],
  3: LEVELS[2],
  4: LEVELS[3],
  5: LEVELS[4],
  6: LEVELS[5],
  7: LEVELS[6],
}

export function levelDefinition(levelId: LevelId): LevelDefinition {
  return LEVEL_BY_ID[levelId]
}

export function visibleBonuses(levelId: LevelId): BonusDef[] {
  return levelDefinition(levelId).bonuses.filter((item) => !item.hidden)
}

/** Parses a route parameter such as `4`; returns null for unknown levels. */
export function parseLevelId(raw: string | undefined): LevelId | null {
  if (!raw) return null
  const value = Number(raw)
  return (LEVEL_IDS as readonly number[]).includes(value) ? (value as LevelId) : null
}

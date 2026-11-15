// Level 07 tuning constants: data sizes, salts, slider ranges, overfit truth and scoring thresholds.

export const COHORT_N = 300
export const WORKING_N = 240
export const HOLDOUT_N = 60
export const FINAL_TRAIN_N = 180
export const FINAL_VAL_N = 60
export const LINE_FIT_N = 60

export const SALTS = {
  holdoutSplit: 701,
  leakNoise: 702,
  finalSplit: 703,
  workshopSplit: 704,
  overfitTrain: 705,
  overfitNoise: 706,
  outlier: 707,
  residual: 708,
} as const

/** Stage 1 slider ranges (study_hours -> cgpa). */
export const SLOPE_RANGE = { min: -0.1, max: 0.3, step: 0.002 } as const
export const INTERCEPT_RANGE = { min: 3, max: 9, step: 0.01 } as const
export const LINE_FIT_TOLERANCE = 1.15

/** Stage 2. */
export const LEAK_FEATURE = 'final_grade_points'
export const LEGIT_FEATURES = ['attendance', 'study_hours', 'sleep_hours', 'year', 'scholarship', 'library_visits'] as const
export const ALL_FEATURES = [...LEGIT_FEATURES, LEAK_FEATURE] as const
export type FeatureName = (typeof ALL_FEATURES)[number]
export const STAGE2_GOAL_RATIO = 0.95
export const MINIMALIST_RATIO = 0.9
export const TOO_GOOD_R2 = 0.97
export const DEFAULT_TEST_FRACTION = 0.25
export const DEFAULT_SPLIT_SEED = 42

/** Stage 3 part 1: overfit dataset. */
export const OVERFIT_TRAIN_N = 25
export const OVERFIT_VAL_N = 100
export const OVERFIT_JITTER = 0.02
export const OVERFIT_NOISE = 0.1
/** Training grid spans [-SPAN, SPAN]; validation covers all of [-1, 1], so a wild curve is exposed at the edges. */
export const OVERFIT_TRAIN_SPAN = 0.75
export const OVERFIT_MAX_DEGREE = 9
/** Truth: a cubic plus a gentle wiggle on [-1, 1]. */
export const overfitTruth = (x: number): number => 2 * x * x * x - 1.5 * x + 0.4 * Math.sin(2 * x)

/** Scoring. */
export const ACHIEVABLE_FLOOR = 0.1
export const FIT_PAR = 8
export const HONEST_GAP = 0.05

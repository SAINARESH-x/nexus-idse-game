// Level 06 configuration: named salts (FIX RULE: change salts, never thresholds) and lab thresholds.

/** Population size for the Level 06 cohort. */
export const L06_N = 2000

/** Seed salts. If a guarantee test fails for one slot, change the salt here, never the threshold. */
export const L06_SALTS = {
  sampling: 602,
  ci: 603,
  perm: 601,
  fishing: 604,
  coverage: 605,
  lln: 606,
  binomial: 607,
  distributions: 608,
} as const

export const SAMPLE_N_MIN = 5
export const SAMPLE_N_MAX = 500
export const REPEAT_REPS = 100
/** Goal (a): theoretical standard error of mean cgpa at or below this. */
export const SE_TARGET = 0.1
/** Convenience sampling frame: students with attendance above this. */
export const CONVENIENCE_ATTENDANCE = 80
/** Goal (b): convenience centre must sit further than this from the true mean. */
export const CONVENIENCE_BIAS_MIN = 0.3
/** A convenience run counts as "large" from this n. */
export const CONVENIENCE_LARGE_N = 300

export const Z_TABLE: Readonly<Record<string, number>> = { '0.8': 1.282, '0.9': 1.645, '0.95': 1.96, '0.99': 2.576 }
export const CI_LEVELS = [0.9, 0.95, 0.99] as const
export const CI_SIZES = [25, 50, 100, 200, 400, 800] as const

export const SHUFFLE_OPTIONS = [1, 10, 1000] as const
export const VERDICT_SHUFFLES = 1000
export const ALPHAS = [0.05, 0.01] as const
export const REPLICATOR_RERUNS = 3

export const FISHING_COMPARISONS = 20
export const FISHING_SAMPLE = 400
export const FISHING_ALPHA = 0.05
export const FISHING_MAX_TRIES = 500

export const LLN_SIZES = [10, 100, 1000, 5000] as const
export const LLN_STEP = 100
export const BINOM_N_MIN = 2
export const BINOM_N_MAX = 60
export const BINOM_TARGET_K = 2
export const BINOM_TARGET_P = 0.5
export const BINOM_SIM_REPS = 1000

export const COVERAGE_LEVELS = [0.8, 0.9, 0.95, 0.99] as const
export const COVERAGE_SIZES = [10, 25, 50, 100, 200] as const
export const COVERAGE_COUNT = 100

export const DIST_SIZE = 600
/** |mean - median| below this many standard deviations reads as "about equal". */
export const MEAN_MEDIAN_TOLERANCE = 0.1

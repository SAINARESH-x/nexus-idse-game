// Tunables for the deterministic student cohort (Levels 05-07) and the shared seed-slot rule.
// FIX RULE: if a cohort invariant fails for some seed slot, tune values here; never loosen test thresholds.

// SEED_SLOTS and sessionSeed live in src/game/levelSession.ts (integrator-owned).

/** Named salts for mixSeed(seed, SALT, ...) so each random stream is independent. */
export const COHORT_SALTS = {
  attendanceRank: 101,
  attendanceJitter: 102,
  studyHours: 103,
  sleep: 104,
  library: 105,
  scholarship: 106,
  cgpaNoise: 107,
  dropoutJitter: 108,
  categorical: 109,
  /** Permutation tests (Level 06 Stage 3 and the cohort invariant): mixSeed(seed, PERM, rerunIndex). */
  perm: 201,
} as const

/** Stratified attendance: shares of the cohort per band [lo, hi). The last band includes hi. */
export const ATTENDANCE_BANDS = [
  { share: 0.18, lo: 35, hi: 60 },
  { share: 0.32, lo: 60, hi: 80 },
  { share: 0.5, lo: 80, hi: 100 },
] as const

/** study_hours ~ Gamma(shape, scale) (right-skewed), clamped to [0, STUDY_MAX], one decimal. Shape must be an integer. */
export const STUDY_SHAPE = 2
export const STUDY_SCALE = 5
export const STUDY_MAX = 40

/** sleep_hours ~ Normal(mean, sd) clamped to [4, 9], one decimal. */
export const SLEEP_MEAN = 6.8
export const SLEEP_SD = 1.0

/** library_visits (per month, integer) = round(LIB_MEAN + LIB_SD*(rho*z(study) + sqrt(1-rho^2)*e)), min 0. Not used by cgpa. */
export const LIBRARY_RHO = 0.7
export const LIB_MEAN = 9
export const LIB_SD = 4

export const SCHOLARSHIP_SHARE = 0.25

/** cgpa = base + a*attendance + b*study + c*(sleep - pivot) + d*scholarship + Normal(0, noise), clamped, 1 decimal. */
export const CGPA = {
  base: 3.2,
  attendance: 0.035,
  study: 0.07,
  sleep: 0.15,
  sleepPivot: 6.5,
  scholarship: 0.2,
  noise: 0.45,
  min: 3.0,
  max: 9.8,
} as const

/**
 * Dropout logit = intercept + midAttStep*[att < 75] + lowAttStep*[att < 60] + cgpa*(cgpa - pivot)
 *               + DROPOUT_SCHOLARSHIP_LOGIT*[scholarship].
 * Quotas: band total = round(sum p), apportioned to 5-point cells by size; in each cell the highest p + jitter drop out.
 */
export const DROPOUT = {
  intercept: -2.55,
  /** Added when attendance < 75. */
  midAttStep: 0.83,
  /** Added on top when attendance < 60: the steep rise below 60. */
  lowAttStep: 1.32,
  cgpa: -0.35,
  cgpaPivot: 6.5,
} as const
export const DROPOUT_SCHOLARSHIP_LOGIT = -0.8
export const DROPOUT_JITTER = 0.5
/** Analysis bands from the kit (below 60, 60 to 75, 75 and above). */
export const DROPOUT_BANDS = [60, 75] as const
/** Quota cells: 5-point attendance bins (nested inside the three DROPOUT_BANDS) so bin rates are deterministic. */
export const DROPOUT_QUOTA_WIDTH = 5
export const DROPOUT_QUOTA_START = 35

export const DEPARTMENTS = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'] as const

/** Level 06 simulator salts (B1): every run seed is mixSeed(sessionSeed, SALT, runIndex). */
export const PERM_SALT = 601
export const SAMPLING_SALT = 602
export const CI_SALT = 603
export const FISHING_SALT = 604

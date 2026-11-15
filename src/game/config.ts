// Tunable campaign constants: XP, ranks, ratings, scoring weights and save keys.
import type { LevelId, Tier } from './types'

export const SAVE_KEY = 'nexus-save-v1'
export const SAVE_VERSION = 1

export const LEVEL_IDS = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly LevelId[]

export const MAIN_XP: Record<LevelId, number> = {
  1: 120,
  2: 140,
  3: 160,
  4: 300,
  5: 180,
  6: 200,
  7: 260,
}

export const TIER_XP_MULT: Record<Tier, number> = {
  assisted: 1,
  independent: 1.25,
  expert: 1.5,
}

export const BONUS_XP = {
  visible: 40,
  hidden: 60,
} as const

export const SIDE_OP_XP = {
  base: 60,
  perHint: 10,
  min: 20,
} as const

export const RANKS = [
  { name: 'Trainee', minXp: 0 },
  { name: 'Junior Analyst', minXp: 250 },
  { name: 'Analyst', minXp: 700 },
  { name: 'Senior Analyst', minXp: 1300 },
  { name: 'Lead Analyst', minXp: 1900 },
  { name: 'NEXUS Architect', minXp: 2600 },
] as const

export type RankName = (typeof RANKS)[number]['name']
export type Rank = (typeof RANKS)[number]

export const RATING_THRESHOLDS = {
  S: 90,
  A: 75,
  B: 60,
} as const

export const COMPOSITE_WEIGHTS = {
  accuracy: 0.4,
  decisionQuality: 0.25,
  efficiency: 0.2,
  hint: 0.15,
} as const

export const HINT_FACTOR = {
  floor: 0.3,
  step: 0.1,
} as const

export const MAIN_XP_FORMULA = {
  base: 0.4,
  composite: 0.6,
} as const

export const CREDITS_PER_XP = 0.5

/** Adaptive history keeps only the most recent entries. */
export const ADAPTIVE_HISTORY_CAP = 50

/** Adaptive tier rules (Phase 9): move one tier per completed run. */
export const ADAPTIVE_RULES = {
  upComposite: 85,
  upMaxHints: 1,
  downComposite: 55,
  downMinHints: 4,
  struggleBadDecisions: 3,
  struggleMistakes: 6,
} as const

export const CALLSIGN_MIN = 3
export const CALLSIGN_MAX = 16

/** DEV_ONLY aggregate used by the dev completion shortcuts. */
export const DEV_DEMO_AGGREGATE = {
  accuracy: 1,
  decisionQuality: 1,
  efficiency: 1,
  hintsUsed: 0,
  mistakes: 0,
} as const

// Pure progression rules: scoring, ranks, XP awards and level unlocks.
import {
  BONUS_XP,
  CALLSIGN_MAX,
  CALLSIGN_MIN,
  COMPOSITE_WEIGHTS,
  CREDITS_PER_XP,
  HINT_FACTOR,
  LEVEL_IDS,
  MAIN_XP,
  MAIN_XP_FORMULA,
  RANKS,
  RATING_THRESHOLDS,
  SIDE_OP_XP,
  TIER_XP_MULT,
} from './config'
import type { Rank, RankName } from './config'
import type {
  ChallengeResult,
  LevelId,
  LevelProgress,
  MissionAggregate,
  Rating,
  Tier,
} from './types'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clampScore = (value: number) => Math.min(100, Math.max(0, value))
const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0)

/** Mean accuracy/decision/efficiency and summed hints/mistakes across stages. */
export function aggregate(results: ChallengeResult[]): MissionAggregate {
  if (results.length === 0) {
    return { accuracy: 0, decisionQuality: 0, efficiency: 0, hintsUsed: 0, mistakes: 0 }
  }

  const totals = results.reduce(
    (sum, result) => ({
      accuracy: sum.accuracy + clamp01(safeNumber(result.accuracy)),
      decisionQuality: sum.decisionQuality + clamp01(safeNumber(result.decisionQuality)),
      efficiency: sum.efficiency + clamp01(safeNumber(result.efficiency)),
      hintsUsed: sum.hintsUsed + Math.max(0, Math.floor(safeNumber(result.hintsUsed))),
      mistakes: sum.mistakes + Math.max(0, Math.floor(safeNumber(result.mistakes))),
    }),
    { accuracy: 0, decisionQuality: 0, efficiency: 0, hintsUsed: 0, mistakes: 0 },
  )

  return {
    accuracy: totals.accuracy / results.length,
    decisionQuality: totals.decisionQuality / results.length,
    efficiency: totals.efficiency / results.length,
    hintsUsed: totals.hintsUsed,
    mistakes: totals.mistakes,
  }
}

/** Hints reduce the composite but never below the 0.3 floor. */
export function hintFactor(hintsUsed: number): number {
  const hints = Math.max(0, Math.floor(safeNumber(hintsUsed)))
  return Math.max(HINT_FACTOR.floor, 1 - HINT_FACTOR.step * hints)
}

/** 0..100 composite score used for ratings, best-score tracking and XP. */
export function compositeScore(
  result: Pick<ChallengeResult, 'accuracy' | 'decisionQuality' | 'efficiency' | 'hintsUsed'>,
): number {
  const score =
    100 *
    (COMPOSITE_WEIGHTS.accuracy * clamp01(safeNumber(result.accuracy)) +
      COMPOSITE_WEIGHTS.decisionQuality * clamp01(safeNumber(result.decisionQuality)) +
      COMPOSITE_WEIGHTS.efficiency * clamp01(safeNumber(result.efficiency)) +
      COMPOSITE_WEIGHTS.hint * hintFactor(result.hintsUsed))
  return clampScore(score)
}

export function ratingForScore(composite: number): Rating {
  const score = safeNumber(composite)
  if (score >= RATING_THRESHOLDS.S) return 'S'
  if (score >= RATING_THRESHOLDS.A) return 'A'
  if (score >= RATING_THRESHOLDS.B) return 'B'
  return 'C'
}

export function rankForXp(xp: number): Rank {
  const value = safeNumber(xp)
  let current: Rank = RANKS[0]
  for (const rank of RANKS) {
    if (value >= rank.minXp) current = rank
  }
  return current
}

export function nextRank(xp: number): Rank | null {
  const value = safeNumber(xp)
  return RANKS.find((rank) => rank.minXp > value) ?? null
}

/** XP still needed to reach the next rank; 0 at the top rank. */
export function xpToNextRank(xp: number): number {
  const next = nextRank(xp)
  return next ? Math.max(0, next.minXp - safeNumber(xp)) : 0
}

export interface RankProgress {
  rank: Rank
  next: Rank | null
  /** XP earned inside the current rank band. */
  intoRank: number
  /** Size of the current rank band. */
  rankSpan: number
  toNext: number
  /** 0..100 fill for the rank-relative bar. */
  percent: number
}

export function rankProgress(xp: number): RankProgress {
  const value = Math.max(0, safeNumber(xp))
  const rank = rankForXp(value)
  const next = nextRank(value)
  const rankSpan = next ? next.minXp - rank.minXp : 1
  const intoRank = Math.max(0, value - rank.minXp)
  return {
    rank,
    next,
    intoRank,
    rankSpan,
    toNext: next ? Math.max(0, next.minXp - value) : 0,
    percent: next ? clampScore((intoRank / rankSpan) * 100) : 100,
  }
}

/** Main-mission XP: rewarded for quality; Level 04 alone scales with the tier. */
export function xpForMain(levelId: LevelId, composite: number, tier: Tier = 'assisted'): number {
  const quality = clampScore(safeNumber(composite)) / 100
  const base = MAIN_XP[levelId] * (MAIN_XP_FORMULA.base + MAIN_XP_FORMULA.composite * quality)
  const multiplier = levelId === 4 ? TIER_XP_MULT[tier] : 1
  return Math.max(0, Math.round(base * multiplier))
}

export function xpForSideOp(hintsUsed: number): number {
  const hints = Math.max(0, Math.floor(safeNumber(hintsUsed)))
  return Math.max(SIDE_OP_XP.min, SIDE_OP_XP.base - SIDE_OP_XP.perHint * hints)
}

export function creditsForXp(xp: number): number {
  return Math.max(0, Math.floor(Math.max(0, safeNumber(xp)) * CREDITS_PER_XP))
}

export function isValidCallsign(value: string): boolean {
  const callsign = value.trim()
  return (
    callsign.length >= CALLSIGN_MIN &&
    callsign.length <= CALLSIGN_MAX &&
    /^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(callsign)
  )
}

/** An award is one completed unit of content; replays only pay improvements. */
export type Award =
  | {
      kind: 'main'
      xp: number
      composite: number
      rating: Rating
      hintsUsed: number
      mistakes: number
    }
  | { kind: 'sideOp'; id: string; xp: number }
  | { kind: 'bonus'; id: string; hidden: boolean }

export interface RankChange {
  from: RankName
  to: RankName
}

export interface ApplyAwardResult {
  newProgress: LevelProgress
  xpGained: number
  creditsGained: number
  rankUp?: RankChange
}

/** Award summary returned by store actions and rendered by the debrief. */
export interface AwardSummary {
  levelId?: LevelId
  xpGained: number
  creditsGained: number
  composite?: number
  rating?: Rating
  firstCompletion?: boolean
  rankUp?: RankChange
}

export function applyAward(
  progress: LevelProgress,
  award: Award,
  currentXp = 0,
): ApplyAwardResult {
  let newProgress: LevelProgress = { ...progress, stats: { ...progress.stats } }
  let xpGained = 0

  if (award.kind === 'main') {
    const composite = clampScore(safeNumber(award.composite))
    const xp = Math.max(0, Math.round(safeNumber(award.xp)))
    xpGained = Math.max(0, xp - progress.bestXp)
    newProgress = {
      ...newProgress,
      completed: true,
      bestXp: Math.max(progress.bestXp, xp),
      bestComposite: Math.max(progress.bestComposite, composite),
      rating: composite >= progress.bestComposite ? award.rating : progress.rating,
      stats: {
        ...newProgress.stats,
        lastHintsUsed: Math.max(0, Math.floor(safeNumber(award.hintsUsed))),
        lastMistakes: Math.max(0, Math.floor(safeNumber(award.mistakes))),
      },
    }
  } else if (award.kind === 'sideOp') {
    if (!progress.sideOpsDone.includes(award.id)) {
      xpGained = Math.max(0, Math.round(safeNumber(award.xp)))
      newProgress = {
        ...newProgress,
        sideOpsDone: [...progress.sideOpsDone, award.id],
      }
    }
  } else {
    if (!progress.bonusesEarned.includes(award.id)) {
      xpGained = award.hidden ? BONUS_XP.hidden : BONUS_XP.visible
      newProgress = {
        ...newProgress,
        bonusesEarned: [...progress.bonusesEarned, award.id],
      }
    }
  }

  const before = rankForXp(currentXp)
  const after = rankForXp(currentXp + xpGained)
  const rankUp = before.name !== after.name ? { from: before.name, to: after.name } : undefined

  return {
    newProgress,
    xpGained,
    creditsGained: creditsForXp(xpGained),
    rankUp,
  }
}

export function createLevelProgress(unlocked = false): LevelProgress {
  return {
    unlocked,
    completed: false,
    bestComposite: 0,
    bestXp: 0,
    sideOpsDone: [],
    bonusesEarned: [],
    attempts: 0,
    stats: {},
  }
}

export function createInitialLevels(): Record<LevelId, LevelProgress> {
  return {
    1: createLevelProgress(true),
    2: createLevelProgress(false),
    3: createLevelProgress(false),
    4: createLevelProgress(false),
    5: createLevelProgress(false),
    6: createLevelProgress(false),
    7: createLevelProgress(false),
  }
}

/** Level 1 is always open and each completed level unlocks the next. */
export function applyUnlockChain(
  levels: Record<LevelId, LevelProgress>,
): Record<LevelId, LevelProgress> {
  const next: Record<LevelId, LevelProgress> = { ...levels }
  for (const id of LEVEL_IDS) {
    if (id === 1 && !next[id].unlocked) {
      next[id] = { ...next[id], unlocked: true }
    } else if (next[id].completed && !next[id].unlocked) {
      next[id] = { ...next[id], unlocked: true }
    }
  }
  for (let index = 1; index < LEVEL_IDS.length; index += 1) {
    const previous = LEVEL_IDS[index - 1]
    const current = LEVEL_IDS[index]
    if (next[previous].completed && !next[current].unlocked) {
      next[current] = { ...next[current], unlocked: true }
    }
  }
  return next
}

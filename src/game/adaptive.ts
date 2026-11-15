// Adaptive difficulty (pure): recommend the next Level 04 tier and detect a struggling player.
import { ADAPTIVE_RULES } from './config'
import type { AdaptiveEntry, LevelId, Tier } from './types'

export const TIER_ORDER: readonly Tier[] = ['assisted', 'independent', 'expert']

const shift = (tier: Tier, delta: number): Tier => {
  const index = TIER_ORDER.indexOf(tier)
  return TIER_ORDER[Math.min(TIER_ORDER.length - 1, Math.max(0, index + delta))]
}

export interface TierRecommendation {
  tier: Tier
  reason: string
}

/**
 * No history for the level gives assisted. Otherwise the latest entry moves one
 * tier up (composite >= 85 and hints <= 1), one tier down (composite < 55 or
 * hints >= 4), or stays.
 */
export function recommendTier(history: readonly AdaptiveEntry[], levelId: LevelId): TierRecommendation {
  const latest = [...history].reverse().find((entry) => entry.levelId === levelId)
  if (!latest) return { tier: 'assisted', reason: 'First clearance: start with full analyst highlights.' }
  const score = Math.round(latest.composite)
  if (latest.composite >= ADAPTIVE_RULES.upComposite && latest.hintsUsed <= ADAPTIVE_RULES.upMaxHints) {
    const tier = shift(latest.tier, 1)
    return {
      tier,
      reason:
        tier === latest.tier
          ? `Last run scored ${score} on ${latest.tier}: you are already at the top clearance.`
          : `Last run scored ${score} with ${latest.hintsUsed} hint(s) on ${latest.tier}: step up.`,
    }
  }
  if (latest.composite < ADAPTIVE_RULES.downComposite || latest.hintsUsed >= ADAPTIVE_RULES.downMinHints) {
    const tier = shift(latest.tier, -1)
    return {
      tier,
      reason:
        tier === latest.tier
          ? `Last run scored ${score} with ${latest.hintsUsed} hint(s): stay on assisted and use the highlights.`
          : `Last run scored ${score} with ${latest.hintsUsed} hint(s) on ${latest.tier}: drop one clearance.`,
    }
  }
  return { tier: latest.tier, reason: `Last run scored ${score} on ${latest.tier}: hold this clearance.` }
}

export interface StruggleInput {
  badKeptDecisions: number
  stageMistakes: number
}

/** True when the player shows signs of struggling in the current stage. */
export const struggleSignals = ({ badKeptDecisions, stageMistakes }: StruggleInput): boolean =>
  badKeptDecisions >= ADAPTIVE_RULES.struggleBadDecisions || stageMistakes >= ADAPTIVE_RULES.struggleMistakes

// Adaptive tier recommendation and struggle detection tests, including both boundaries.
import { describe, expect, it } from 'vitest'
import { recommendTier, struggleSignals } from '../adaptive'
import type { AdaptiveEntry, Tier } from '../types'

const entry = (tier: Tier, composite: number, hintsUsed: number, levelId: AdaptiveEntry['levelId'] = 4): AdaptiveEntry => ({
  levelId,
  tier,
  composite,
  hintsUsed,
  mistakes: 0,
  at: 1,
})

describe('recommendTier', () => {
  it('starts on assisted with no history for the level', () => {
    expect(recommendTier([], 4).tier).toBe('assisted')
    expect(recommendTier([entry('expert', 99, 0, 1)], 4).tier).toBe('assisted')
  })
  it('moves up one tier at composite 85 with at most one hint', () => {
    expect(recommendTier([entry('assisted', 85, 1)], 4).tier).toBe('independent')
    expect(recommendTier([entry('independent', 92, 0)], 4).tier).toBe('expert')
    expect(recommendTier([entry('expert', 99, 0)], 4).tier).toBe('expert')
  })
  it('does not move up just below the boundary or with two hints', () => {
    expect(recommendTier([entry('assisted', 84.9, 0)], 4).tier).toBe('assisted')
    expect(recommendTier([entry('assisted', 95, 2)], 4).tier).toBe('assisted')
  })
  it('moves down below 55 or with four or more hints', () => {
    expect(recommendTier([entry('expert', 54.9, 0)], 4).tier).toBe('independent')
    expect(recommendTier([entry('independent', 70, 4)], 4).tier).toBe('assisted')
    expect(recommendTier([entry('assisted', 40, 5)], 4).tier).toBe('assisted')
    expect(recommendTier([entry('independent', 55, 3)], 4).tier).toBe('independent')
  })
  it('uses the latest entry for the level and explains itself', () => {
    const rec = recommendTier([entry('assisted', 90, 0), entry('independent', 40, 5)], 4)
    expect(rec.tier).toBe('assisted')
    expect(rec.reason).toMatch(/40/)
  })
})

describe('struggleSignals', () => {
  it('triggers on three bad kept decisions or six mistakes', () => {
    expect(struggleSignals({ badKeptDecisions: 3, stageMistakes: 0 })).toBe(true)
    expect(struggleSignals({ badKeptDecisions: 0, stageMistakes: 6 })).toBe(true)
    expect(struggleSignals({ badKeptDecisions: 2, stageMistakes: 5 })).toBe(false)
  })
})

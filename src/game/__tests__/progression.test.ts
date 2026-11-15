// Unit tests for scoring, ranks, awards and unlock progression.
import { describe, expect, it } from 'vitest'
import {
  aggregate,
  applyAward,
  applyUnlockChain,
  compositeScore,
  createInitialLevels,
  createLevelProgress,
  creditsForXp,
  hintFactor,
  isValidCallsign,
  nextRank,
  rankForXp,
  rankProgress,
  ratingForScore,
  xpForMain,
  xpForSideOp,
  xpToNextRank,
} from '../progression'
import type { Award } from '../progression'
import type { ChallengeResult } from '../types'

const challenge = (overrides: Partial<ChallengeResult> = {}): ChallengeResult => ({
  id: 'c1',
  accuracy: 1,
  decisionQuality: 1,
  efficiency: 1,
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  ...overrides,
})

describe('ranks', () => {
  it('maps XP boundaries to the correct rank', () => {
    expect(rankForXp(0).name).toBe('Trainee')
    expect(rankForXp(249).name).toBe('Trainee')
    expect(rankForXp(250).name).toBe('Junior Analyst')
    expect(rankForXp(699).name).toBe('Junior Analyst')
    expect(rankForXp(700).name).toBe('Analyst')
    expect(rankForXp(1299).name).toBe('Analyst')
    expect(rankForXp(1300).name).toBe('Senior Analyst')
    expect(rankForXp(1899).name).toBe('Senior Analyst')
    expect(rankForXp(1900).name).toBe('Lead Analyst')
    expect(rankForXp(2599).name).toBe('Lead Analyst')
    expect(rankForXp(2600).name).toBe('NEXUS Architect')
  })

  it('reports the next rank and XP still required', () => {
    expect(nextRank(0)?.name).toBe('Junior Analyst')
    expect(xpToNextRank(0)).toBe(250)
    expect(xpToNextRank(249)).toBe(1)
    expect(xpToNextRank(2600)).toBe(0)
    expect(nextRank(2600)).toBeNull()
  })

  it('reports rank-relative progress', () => {
    const progress = rankProgress(620)
    expect(progress.rank.name).toBe('Junior Analyst')
    expect(progress.next?.name).toBe('Analyst')
    expect(progress.intoRank).toBe(370)
    expect(progress.toNext).toBe(80)
    expect(progress.percent).toBeCloseTo((370 / 450) * 100)
  })
})

describe('rating and composite score', () => {
  it('applies the S/A/B/C rating thresholds', () => {
    expect(ratingForScore(100)).toBe('S')
    expect(ratingForScore(90)).toBe('S')
    expect(ratingForScore(89.9)).toBe('A')
    expect(ratingForScore(75)).toBe('A')
    expect(ratingForScore(74.9)).toBe('B')
    expect(ratingForScore(60)).toBe('B')
    expect(ratingForScore(59.9)).toBe('C')
  })

  it('weights accuracy, decisions, efficiency and hints', () => {
    expect(compositeScore(challenge())).toBeCloseTo(100)
    expect(
      compositeScore(challenge({ accuracy: 0.5, decisionQuality: 0.5, efficiency: 0.5 })),
    ).toBeCloseTo(57.5)
  })

  it('floors the hint factor at 0.3', () => {
    expect(hintFactor(0)).toBe(1)
    expect(hintFactor(3)).toBeCloseTo(0.7)
    expect(hintFactor(7)).toBe(0.3)
    expect(hintFactor(50)).toBe(0.3)
    expect(compositeScore(challenge({ hintsUsed: 7 }))).toBeCloseTo(89.5)
  })

  it('aggregates stage results with means and sums', () => {
    const result = aggregate([
      challenge({ accuracy: 1, hintsUsed: 1, mistakes: 2 }),
      challenge({ accuracy: 0, decisionQuality: 0.5, hintsUsed: 3, mistakes: 1 }),
    ])
    expect(result.accuracy).toBe(0.5)
    expect(result.decisionQuality).toBe(0.75)
    expect(result.hintsUsed).toBe(4)
    expect(result.mistakes).toBe(3)
    expect(aggregate([]).accuracy).toBe(0)
  })
})

describe('XP and credits formulas', () => {
  it('computes main XP from composite and tier', () => {
    expect(xpForMain(1, 100)).toBe(120)
    expect(xpForMain(1, 0)).toBe(48)
    expect(xpForMain(4, 100)).toBe(300)
    expect(xpForMain(4, 100, 'independent')).toBe(375)
    expect(xpForMain(4, 100, 'expert')).toBe(450)
    expect(xpForMain(1, 100, 'expert')).toBe(120)
    expect(xpForMain(7, 150)).toBe(260)
  })

  it('discounts side-op XP per hint with a floor', () => {
    expect(xpForSideOp(0)).toBe(60)
    expect(xpForSideOp(1)).toBe(50)
    expect(xpForSideOp(4)).toBe(20)
    expect(xpForSideOp(12)).toBe(20)
  })

  it('converts XP to credits with floor division', () => {
    expect(creditsForXp(0)).toBe(0)
    expect(creditsForXp(1)).toBe(0)
    expect(creditsForXp(3)).toBe(1)
    expect(creditsForXp(121)).toBe(60)
  })
})

describe('applyAward', () => {
  const mainAward = (xp: number, composite = 80): Award => ({
    kind: 'main',
    xp,
    composite,
    rating: ratingForScore(composite),
    hintsUsed: 0,
    mistakes: 0,
  })

  it('pays only the improvement on a replay', () => {
    const progress = { ...createLevelProgress(true), bestXp: 120, bestComposite: 80, completed: true }
    const better = applyAward(progress, mainAward(150, 85), 120)
    expect(better.xpGained).toBe(30)
    expect(better.creditsGained).toBe(15)
    expect(better.newProgress.bestXp).toBe(150)
    expect(better.newProgress.bestComposite).toBe(85)

    const worse = applyAward(better.newProgress, mainAward(100, 70), 150)
    expect(worse.xpGained).toBe(0)
    expect(worse.newProgress.bestXp).toBe(150)
    expect(worse.newProgress.bestComposite).toBe(85)
    expect(worse.newProgress.rating).toBe('A')
  })

  it('awards a bonus only once', () => {
    const first = applyAward(createLevelProgress(true), { kind: 'bonus', id: 'b1', hidden: true })
    expect(first.xpGained).toBe(60)
    expect(first.newProgress.bonusesEarned).toEqual(['b1'])

    const second = applyAward(first.newProgress, { kind: 'bonus', id: 'b1', hidden: true })
    expect(second.xpGained).toBe(0)
    expect(second.newProgress.bonusesEarned).toEqual(['b1'])
  })

  it('awards a side operation only once', () => {
    const first = applyAward(createLevelProgress(true), { kind: 'sideOp', id: 's1', xp: 40 })
    expect(first.xpGained).toBe(40)
    expect(first.creditsGained).toBe(20)
    expect(first.newProgress.sideOpsDone).toEqual(['s1'])
    const second = applyAward(first.newProgress, { kind: 'sideOp', id: 's1', xp: 60 })
    expect(second.xpGained).toBe(0)
  })

  it('reports a rank-up across a threshold', () => {
    const result = applyAward(createLevelProgress(true), { kind: 'sideOp', id: 's1', xp: 40 }, 240)
    expect(result.rankUp).toEqual({ from: 'Trainee', to: 'Junior Analyst' })
    expect(applyAward(createLevelProgress(true), { kind: 'sideOp', id: 's1', xp: 10 }, 0).rankUp).toBeUndefined()
  })
})

describe('unlocks and call signs', () => {
  it('starts with Level 1 open and every other level locked', () => {
    const levels = createInitialLevels()
    expect(levels[1].unlocked).toBe(true)
    expect(levels[2].unlocked).toBe(false)
    expect(levels[7].unlocked).toBe(false)
  })

  it('unlocks the next level only after the previous main mission completes', () => {
    const levels = createInitialLevels()
    levels[1] = { ...levels[1], sideOpsDone: ['l1-side-1'], bonusesEarned: ['l1-bonus-1'] }
    expect(applyUnlockChain(levels)[2].unlocked).toBe(false)

    const completed = { ...levels, 1: { ...levels[1], completed: true } }
    const next = applyUnlockChain(completed)
    expect(next[2].unlocked).toBe(true)
    expect(next[3].unlocked).toBe(false)
  })

  it('validates call signs between 3 and 16 characters', () => {
    expect(isValidCallsign('Test')).toBe(true)
    expect(isValidCallsign('  Vega-7 ')).toBe(true)
    expect(isValidCallsign('ab')).toBe(false)
    expect(isValidCallsign('a'.repeat(17))).toBe(false)
    expect(isValidCallsign('bad!')).toBe(false)
  })
})

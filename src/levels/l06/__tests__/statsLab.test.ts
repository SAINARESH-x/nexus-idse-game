// Level 06 stats lab: intervals, permutation test, z test, verdict validation, Bonferroni and the binomial target.
import { describe, expect, it } from 'vitest'
import { SEED_SLOTS, sessionSeed } from '../../../game/levelSession'
import { BINOM_N_MAX, BINOM_TARGET_K, BINOM_TARGET_P } from '../config'
import { targetP } from '../BinomialPanel'
import { l06Population } from '../population'
import { smallestNForTail } from '../probability'
import {
  bonferroniThreshold, confidenceInterval, correctVerdict, normalCdf, permutationTest, theoreticalSE, validateVerdict, zTestP, zFor,
} from '../statsLab'

describe('stats lab', () => {
  it('confidence interval by hand', () => {
    const ci = confidenceInterval([1, 0, 1, 1], 0.95) // mean .75, s = .5, se = .25
    expect(ci.mean).toBe(0.75)
    expect(ci.se).toBeCloseTo(0.25)
    expect(ci.lo).toBeCloseTo(0.75 - 1.96 * 0.25)
    expect(zFor(0.9)).toBe(1.645)
    expect(zFor(0.99)).toBe(2.576)
  })
  it('theoretical SE uses ddof 0', () => {
    expect(theoreticalSE([1, 3], 4)).toBeCloseTo(0.5)
  })
  it('permutation test: formula, seeding and null size', () => {
    const r = permutationTest([5, 6, 7], [1, 2, 3], 200, 11)
    expect(r.observed).toBe(4)
    expect(r.nulls).toHaveLength(200)
    expect(r).toEqual(permutationTest([5, 6, 7], [1, 2, 3], 200, 11))
    // only the two extreme splits of 20 reach |4|: p ~ (1 + 200/10)/201
    expect(r.pValue).toBeGreaterThan(0.05)
    expect(r.pValue).toBeLessThan(0.2)
    expect(permutationTest([1], [], 10, 1).pValue).toBeNaN()
  })
  it('normal cdf and z test', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(zTestP([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 6)
    expect(zTestP([10, 11, 12, 13], [1, 2, 3, 4])).toBeLessThan(0.001)
  })
  it('verdict: reject iff p <= alpha', () => {
    expect(correctVerdict(0.05, 0.05)).toBe('reject')
    expect(correctVerdict(0.0501, 0.05)).toBe('retain')
    expect(validateVerdict(0.03, 0.01, 'retain')).toBe(true)
    expect(validateVerdict(0.03, 0.01, 'reject')).toBe(false)
  })
  it('Bonferroni threshold', () => {
    expect(bonferroniThreshold(0.05, 20)).toBeCloseTo(0.0025)
  })
  it('binomial target is reachable for every slot', () => {
    for (let i = 0; i < SEED_SLOTS; i += 1) {
      const p = targetP(l06Population(sessionSeed(6, i)))
      expect(smallestNForTail(p, BINOM_TARGET_K, BINOM_TARGET_P, BINOM_N_MAX)).not.toBeNull()
    }
  }, 60000)
})

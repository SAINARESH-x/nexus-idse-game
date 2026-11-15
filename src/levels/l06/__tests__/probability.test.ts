// Level 06 exact probability helpers checked against hand-computed values.
import { describe, expect, it } from 'vitest'
import {
  additionRule, binomialAtLeast, binomialCdf, binomialMean, binomialPmf, binomialPmfAll, binomialSd, choose, conditionals,
  eventCode, eventLabel, exactProbability, simulateBinomial, simulateFrequency, smallestNForTail, tableRatio, twoWayTable,
} from '../probability'

describe('binomial', () => {
  it('matches hand values', () => {
    expect(choose(5, 2)).toBe(10)
    expect(binomialPmf(2, 4, 0.5)).toBeCloseTo(6 / 16, 12)
    expect(binomialPmf(0, 3, 0.2)).toBeCloseTo(0.512, 12)
    expect(binomialCdf(1, 3, 0.2)).toBeCloseTo(0.512 + 3 * 0.2 * 0.64, 12)
    expect(binomialAtLeast(2, 3, 0.2)).toBeCloseTo(3 * 0.04 * 0.8 + 0.008, 12)
    expect(binomialAtLeast(0, 3, 0.2)).toBe(1)
    expect(binomialPmfAll(10, 0.3).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    expect(binomialMean(20, 0.1)).toBe(2)
    expect(binomialSd(20, 0.1)).toBeCloseTo(Math.sqrt(1.8), 12)
    expect(binomialPmf(1.5, 3, 0.2)).toBe(0)
  })
  it('finds the smallest n for a tail target', () => {
    // P(X>=2) for p=0.5: n=2 -> 0.25, n=3 -> 0.5
    expect(smallestNForTail(0.5, 2, 0.5, 10)).toBe(3)
    expect(smallestNForTail(0.01, 2, 0.5, 10)).toBeNull()
  })
  it('simulation is seeded and tracks the PMF', () => {
    const a = simulateBinomial(10, 0.3, 2000, 7)
    expect(a).toEqual(simulateBinomial(10, 0.3, 2000, 7))
    expect(a.reduce((x, y) => x + y, 0)).toBe(2000)
    expect(a[3] / 2000).toBeCloseTo(binomialPmf(3, 10, 0.3), 1)
  })
})

describe('events and conditional probability', () => {
  // tiny table: R = low attendance, C = dropout
  const rows = [
    { r: true, c: true }, { r: true, c: true }, { r: true, c: false },
    { r: false, c: true }, { r: false, c: false }, { r: false, c: false }, { r: false, c: false }, { r: false, c: false },
  ]
  const t = twoWayTable(rows, (x) => x.r, (x) => x.c)
  it('counts cells', () => expect(t).toEqual({ rc: 2, rNotC: 1, notRc: 1, notRNotC: 4 }))
  it('computes both conditionals and the independence gap', () => {
    const c = conditionals(t)
    expect(c.pC).toBeCloseTo(3 / 8)
    expect(c.pCgivenR).toBeCloseTo(2 / 3)
    expect(c.pRgivenC).toBeCloseTo(2 / 3)
    expect(c.pCgivenNotR).toBeCloseTo(1 / 5)
    expect(c.independenceGap).toBeCloseTo(2 / 3 - 3 / 8)
    expect(tableRatio(t, 'rc', 'all')).toBeCloseTo(2 / 8)
  })
  it('P(A|B) differs from P(B|A) when P(A) != P(B)', () => {
    const t2 = twoWayTable([...rows, { r: false, c: true }], (x) => x.r, (x) => x.c)
    const c = conditionals(t2)
    expect(c.pCgivenR).toBeCloseTo(2 / 3)
    expect(c.pRgivenC).toBeCloseTo(2 / 4)
  })
  it('exact probability and the addition rule', () => {
    expect(exactProbability(rows, (x) => x.c)).toEqual({ count: 3, n: 8, p: 3 / 8 })
    const u = additionRule(rows, (x) => x.r, (x) => x.c)
    expect(u.pUnion).toBeCloseTo(4 / 8)
  })
  it('labels and pandas code', () => {
    const spec = { first: 'dropout', connector: 'and', second: 'lowAttendance' } as const
    expect(eventLabel(spec)).toBe('dropped_out = 1 AND attendance < 60')
    expect(eventCode(spec)).toBe("((df['dropped_out'] == 1) & (df['attendance'] < 60)).mean()")
  })
  it('law of large numbers simulation converges and is seeded', () => {
    const outcomes = Array.from({ length: 100 }, (_, i) => i < 30)
    const pts = simulateFrequency(outcomes, 5000, 3)
    expect(pts).toEqual(simulateFrequency(outcomes, 5000, 3))
    expect(pts[pts.length - 1].x).toBe(5000)
    expect(Math.abs(pts[pts.length - 1].y - 0.3)).toBeLessThan(0.03)
  })
})

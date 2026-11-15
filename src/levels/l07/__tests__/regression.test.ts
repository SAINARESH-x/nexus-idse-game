// Regression maths, data guarantees for every seed slot and hold-out isolation.
import { describe, expect, it } from 'vitest'
import { SEED_SLOTS, sessionSeed } from '../../../game/levelSession'
import { INTERCEPT_RANGE, LEGIT_FEATURES, SLOPE_RANGE } from '../config'
import { LEGIT_SPEC, finalSplit, fitSpec, metricsFor, prepareL07Data } from '../data'
import { lineSample, lineSse, snappedBest } from '../lineFit'
import { bestDegree, degreeAccepted, degreeCurve, fitDegree, makeOverfitData } from '../overfit'
import { SINGULAR_ERROR, adjustedR2, mae, ols, polynomialFeatures, predict, r2, rangeScaler, rmse, trainTestSplit } from '../regression'
import { fitWorkshop } from '../workshop'

const SLOTS = Array.from({ length: SEED_SLOTS }, (_, k) => sessionSeed(7, k))

describe('regression maths', () => {
  it('fits y = 2x + 1 exactly', () => {
    const x = [0, 1, 2, 3, 4]
    const fit = ols(x.map((v) => [v]), x.map((v) => 2 * v + 1))
    expect(fit.ok).toBe(true)
    if (!fit.ok) return
    expect(fit.model.coefficients[0]).toBeCloseTo(2, 10)
    expect(fit.model.intercept).toBeCloseTo(1, 10)
    expect(r2(x.map((v) => 2 * v + 1), predict(fit.model, x.map((v) => [v])))).toBeCloseTo(1, 12)
  })
  it('solves a known two-feature system', () => {
    const X = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 3]]
    const y = X.map(([a, b]) => 3 + 2 * a - 1.5 * b)
    const fit = ols(X, y)
    if (!fit.ok) throw new Error(fit.error)
    expect(fit.model.intercept).toBeCloseTo(3, 9)
    expect(fit.model.coefficients[0]).toBeCloseTo(2, 9)
    expect(fit.model.coefficients[1]).toBeCloseTo(-1.5, 9)
  })
  it('reports perfectly correlated features as singular', () => {
    const X = [[1, 2], [2, 4], [3, 6], [4, 8]]
    const fit = ols(X, [1, 2, 3, 5])
    expect(fit).toEqual({ ok: false, error: SINGULAR_ERROR })
  })
  it('splits disjointly and deterministically', () => {
    const a = trainTestSplit(100, 0.25, 9)
    expect(a).toEqual(trainTestSplit(100, 0.25, 9))
    expect(a.test).toHaveLength(25)
    expect(new Set([...a.train, ...a.test]).size).toBe(100)
    expect(a.train.some((i) => a.test.includes(i))).toBe(false)
    expect(trainTestSplit(100, 0.25, 10)).not.toEqual(a)
  })
  it('builds polynomial features and rescales on the training range', () => {
    expect(polynomialFeatures([2, -1], 3)).toEqual([[2, 4, 8], [-1, 1, -1]])
    const s = rangeScaler([10, 20])
    expect(s(10)).toBe(-1)
    expect(s(20)).toBe(1)
    expect(s(25)).toBe(2)
  })
  it('computes r2, rmse, mae and adjusted r2 on a hand example', () => {
    const y = [1, 2, 3, 4]
    const yhat = [1, 2, 3, 5]
    expect(r2(y, yhat)).toBeCloseTo(1 - 1 / 5, 12)
    expect(rmse(y, yhat)).toBeCloseTo(0.5, 12)
    expect(mae(y, yhat)).toBeCloseTo(0.25, 12)
    expect(adjustedR2(0.8, 4, 1)).toBeCloseTo(1 - (0.2 * 3) / 2, 12)
  })
  it('handles constant y', () => {
    expect(r2([3, 3, 3], [3, 3, 3])).toBe(1)
    expect(r2([3, 3, 3], [3, 4, 3])).toBe(0)
  })
})

describe('guarantees for every seed slot', () => {
  it('degree 9 on the overfit data is not singular', () => {
    for (const s of SLOTS) expect(fitDegree(makeOverfitData(s), 9)).not.toBeNull()
  })
  it('train RMSE never rises, validation is U-shaped with the minimum at 3..5', () => {
    for (const s of SLOTS) {
      const c = degreeCurve(makeOverfitData(s))
      expect(c).toHaveLength(9)
      for (let i = 1; i < c.length; i += 1) expect(c[i].trainRmse).toBeLessThanOrEqual(c[i - 1].trainRmse + 1e-9)
      const b = bestDegree(c)
      expect(b).toBeGreaterThanOrEqual(3)
      expect(b).toBeLessThanOrEqual(5)
      expect(c[0].valRmse).toBeGreaterThanOrEqual(1.25 * c[b - 1].valRmse)
      expect(c[8].valRmse).toBeGreaterThanOrEqual(1.25 * c[b - 1].valRmse)
      expect(degreeAccepted(1, b)).toBe(false)
      expect(degreeAccepted(9, b)).toBe(false)
      expect(degreeAccepted(b, b)).toBe(true)
    }
  })
  it('leak r2 > 0.97 while the best legitimate model stays in 0.4..0.97', () => {
    for (const s of SLOTS) {
      const data = prepareL07Data(s)
      const leak = fitWorkshop(data, { features: ['final_grade_points'], testFraction: 0.25, splitSeed: 42 })
      if (!leak.ok) throw new Error(leak.error)
      expect(leak.test.r2).toBeGreaterThan(0.97)
      expect(leak.tooGood).toBe(true)
      expect(leak.goalMet).toBe(false)
      expect(leak.bestTestR2).toBeGreaterThan(0.4)
      expect(leak.bestTestR2).toBeLessThan(0.97)
    }
  })
  it('Stage 1 slider ranges contain the OLS line and the snapped line is within 5 percent', () => {
    for (const s of SLOTS) {
      const smp = lineSample(prepareL07Data(s).working)
      expect(smp.best.slope).toBeGreaterThan(SLOPE_RANGE.min)
      expect(smp.best.slope).toBeLessThan(SLOPE_RANGE.max)
      expect(smp.best.intercept).toBeGreaterThan(INTERCEPT_RANGE.min)
      expect(smp.best.intercept).toBeLessThan(INTERCEPT_RANGE.max)
      const sn = snappedBest(smp)
      expect(lineSse(smp.x, smp.y, sn.slope, sn.intercept)).toBeLessThanOrEqual(1.05 * smp.minSse)
    }
  })
  it('Stage 2 goal is reachable with all legitimate features on the default split', () => {
    for (const s of SLOTS) {
      const out = fitWorkshop(prepareL07Data(s), { features: [...LEGIT_FEATURES], testFraction: 0.25, splitSeed: 42 })
      expect(out.ok && out.goalMet).toBe(true)
    }
  })
  it('achievable hold-out r2 is at least 0.4 for every slot', () => {
    for (const s of SLOTS) expect(prepareL07Data(s).evaluateHoldout(LEGIT_SPEC)?.achievableR2).toBeGreaterThanOrEqual(0.4)
  })
})

describe('hold-out isolation', () => {
  it('pre-submit outputs are identical with a poisoned hold-out', () => {
    for (const s of SLOTS.slice(0, 5)) {
      const a = prepareL07Data(s)
      const b = prepareL07Data(s, { poisonHoldout: true })
      expect(b.working).toEqual(a.working)
      for (const features of [['attendance', 'study_hours'], [...LEGIT_FEATURES], ['final_grade_points']] as const) {
        const input = { features: [...features], testFraction: 0.3, splitSeed: 7 }
        expect(fitWorkshop(b, input)).toEqual(fitWorkshop(a, input))
      }
      const sa = finalSplit(a)
      const sb = finalSplit(b)
      expect(sb).toEqual(sa)
      const fa = fitSpec(LEGIT_SPEC, sa.train)
      const fb = fitSpec(LEGIT_SPEC, sb.train)
      if ('error' in fa || 'error' in fb) throw new Error('fit failed')
      expect(metricsFor(fb, sb.val)).toEqual(metricsFor(fa, sa.val))
      expect(degreeCurve(makeOverfitData(s)).map((c) => c.valRmse)).toEqual(degreeCurve(makeOverfitData(s)).map((c) => c.valRmse))
      // Only the sealed evaluator sees the poison.
      expect(Number.isNaN(b.evaluateHoldout(LEGIT_SPEC)?.holdout.r2)).toBe(true)
      expect(Number.isFinite(a.evaluateHoldout(LEGIT_SPEC)?.holdout.r2)).toBe(true)
    }
  })
  it('the data object exposes no hold-out rows', () => {
    const d = prepareL07Data(sessionSeed(7, 0))
    expect(Object.keys(d).sort()).toEqual(['evaluateHoldout', 'seed', 'working'])
    expect(d.working).toHaveLength(240)
  })
})

// Forecast scoring, submissions, bonuses, validators and the Level 07 definition shape.
import { describe, expect, it } from 'vitest'
import type { MissionSession } from '../../../game/types'
import { ACHIEVABLE_FLOOR } from '../config'
import { LEVEL_7 } from '../definition'
import { honestModel, leakDetector, minimalist } from '../bonuses'
import { INITIAL_FORECAST, submitForecast } from '../forecast'
import { scoreForecast } from '../scoring'
import { INITIAL_S1, INITIAL_S2, INITIAL_S3, validateS1, validateS2, validateS3 } from '../state'
import { stage2GoalMet } from '../workshop'
import { L07_RUNTIME } from '../runtime'

const base = { holdoutR2: 0.6, achievableR2: 0.7, leak: false, peeked: false, fits: 3 }

describe('scoreForecast', () => {
  it('divides by the achievable r2', () => expect(scoreForecast(base).accuracy).toBeCloseTo(0.6 / 0.7, 12))
  it('uses the floor for zero, negative, NaN and tiny achievable r2', () => {
    for (const a of [0, -0.5, Number.NaN, 1e-9, Number.POSITIVE_INFINITY]) {
      const s = scoreForecast({ ...base, holdoutR2: 0.05, achievableR2: a })
      expect(s.accuracy).toBeCloseTo(0.05 / ACHIEVABLE_FLOOR, 12)
    }
  })
  it('clamps holdout r2 that is negative, NaN or above achievable', () => {
    expect(scoreForecast({ ...base, holdoutR2: -0.3 }).accuracy).toBe(0)
    expect(scoreForecast({ ...base, holdoutR2: Number.NaN }).accuracy).toBe(0)
    expect(scoreForecast({ ...base, holdoutR2: 0.9 }).accuracy).toBe(1)
  })
  it('scores decision quality with leak and peek penalties', () => {
    expect(scoreForecast(base).decisionQuality).toBe(1)
    expect(scoreForecast({ ...base, peeked: true }).decisionQuality).toBeCloseTo(0.8, 12)
    expect(scoreForecast({ ...base, leak: true }).decisionQuality).toBeCloseTo(0.2, 12)
    expect(scoreForecast({ ...base, leak: true, peeked: true }).decisionQuality).toBe(0)
  })
  it('scores efficiency including 0 fits', () => {
    expect(scoreForecast({ ...base, fits: 0 }).efficiency).toBe(1)
    expect(scoreForecast({ ...base, fits: 8 }).efficiency).toBe(1)
    expect(scoreForecast({ ...base, fits: 16 }).efficiency).toBe(0.5)
    expect(scoreForecast({ ...base, fits: 100 }).efficiency).toBe(0.3)
  })
})

describe('submissions', () => {
  const report = (r: number) => ({ holdout: { r2: r, mae: 0.3, rmse: 0.4 }, achievableR2: 0.7 })
  const model = { features: ['attendance' as const], degree: 1 as const, val: { r2: 0.55, mae: 0.3, rmse: 0.4 } }
  it('scores the first submission and marks later ones as peeked', () => {
    const one = submitForecast(INITIAL_FORECAST, model, report(0.5))
    expect(one.peeked).toBe(false)
    expect(one.scored?.holdoutR2).toBe(0.5)
    const two = submitForecast(one, model, report(0.9))
    expect(two.peeked).toBe(true)
    expect(two.scored?.holdoutR2).toBe(0.5)
    expect(two.submissions).toHaveLength(2)
  })
  it('keeps peeked and the scored result across a JSON round trip', () => {
    const two = submitForecast(submitForecast(INITIAL_FORECAST, model, report(0.5)), model, report(0.9))
    const restored = validateS3(JSON.parse(JSON.stringify({ ...INITIAL_S3, ...two })))
    expect(restored?.peeked).toBe(true)
    expect(restored?.scored?.holdoutR2).toBe(0.5)
    // Tampering that clears peeked after two submissions is rejected.
    expect(validateS3({ ...INITIAL_S3, ...two, peeked: false })).toBeNull()
  })
})

describe('Stage 2 goal and validators', () => {
  it('applies the goal rule', () => {
    expect(stage2GoalMet(0.95, 1, false)).toBe(true)
    expect(stage2GoalMet(0.94, 1, false)).toBe(false)
    expect(stage2GoalMet(0.99, 0.7, true)).toBe(false)
    expect(stage2GoalMet(Number.NaN, 0.7, false)).toBe(false)
  })
  it('accepts initial states and rejects junk', () => {
    expect(validateS1(INITIAL_S1)).toEqual(INITIAL_S1)
    expect(validateS2(INITIAL_S2)).toEqual(INITIAL_S2)
    expect(validateS3(INITIAL_S3)).toEqual(INITIAL_S3)
    expect(validateS1({ slope: 'x' })).toBeNull()
    expect(validateS2({ ...INITIAL_S2, features: ['bogus'] })).toBeNull()
    expect(validateS2({ ...INITIAL_S2, testFraction: 0.9 })).toBeNull()
    expect(validateS3({ ...INITIAL_S3, finalDegree: 5 })).toBeNull()
    expect(validateS3(null)).toBeNull()
  })
})

const session = (extra: Record<string, number | string | boolean>): MissionSession => ({
  levelId: 7,
  kind: 'main',
  results: { 'l7-stage-3': { id: 'l7-stage-3', accuracy: 1, decisionQuality: 1, efficiency: 1, hintsUsed: 0, mistakes: 0, decisions: [], extra } },
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  facts: {},
})

describe('bonuses and definition', () => {
  it('Honest Model', () => {
    expect(honestModel(session({ holdoutR2: 0.7, valR2: 0.72, peeked: false, leakInFinal: false }))).toBe(true)
    expect(honestModel(session({ holdoutR2: 0.99, valR2: 0.99, peeked: false, leakInFinal: true }))).toBe(false)
    expect(honestModel(session({ holdoutR2: 0.7, valR2: 0.72, peeked: true, leakInFinal: false }))).toBe(false)
    expect(honestModel(session({ holdoutR2: 0.6, valR2: 0.72, peeked: false, leakInFinal: false }))).toBe(false)
  })
  it('Minimalist and Leak Detector', () => {
    expect(minimalist(session({ minimalist: true }))).toBe(true)
    expect(minimalist(session({}))).toBe(false)
    expect(leakDetector({ ...session({}), facts: { leakReported: true } })).toBe(true)
    expect(leakDetector(session({}))).toBe(false)
  })
  it('definition has the required shape', () => {
    expect(LEVEL_7.stages.map((s) => s.id)).toEqual(['l7-stage-1', 'l7-stage-2', 'l7-stage-3'])
    expect(LEVEL_7.sideOps.map((s) => s.id)).toEqual(['l7-side-1', 'l7-side-2'])
    for (const d of [...LEVEL_7.stages, ...LEVEL_7.sideOps]) expect(d.hints).toHaveLength(3)
    expect(LEVEL_7.bonuses.map((b) => [b.id, b.hidden])).toEqual([['l7-bonus-1', false], ['l7-bonus-2', false], ['l7-bonus-hidden', true]])
    expect(LEVEL_7.fragmentId).toBe('F7')
    expect(Object.keys(L07_RUNTIME.persistent?.validators ?? {})).toHaveLength(3)
  })
})

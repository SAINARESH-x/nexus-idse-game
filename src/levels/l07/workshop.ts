// Stage 2 pure logic: fit a feature set on a seeded split, compare with the best legitimate model, apply the goal and leak rules.
import { LEAK_FEATURE, LEGIT_FEATURES, MINIMALIST_RATIO, STAGE2_GOAL_RATIO, TOO_GOOD_R2 } from './config'
import type { FeatureName } from './config'
import { LEGIT_SPEC, fitSpec, metricsFor, workshopSplit } from './data'
import type { L07Row, Metrics } from './data'
import { predict } from './regression'

export interface WorkshopInput {
  features: FeatureName[]
  testFraction: number
  splitSeed: number
}

export interface WorkshopFit {
  ok: true
  features: FeatureName[]
  intercept: number
  coefficients: Record<string, number>
  train: Metrics
  test: Metrics
  bestTestR2: number
  /** best - yours (positive means you are short). */
  gap: number
  leak: boolean
  tooGood: boolean
  goalMet: boolean
  minimalist: boolean
  points: { actual: number; predicted: number; set: 'train' | 'test' }[]
}
export type WorkshopOutcome = WorkshopFit | { ok: false; error: string }

/** Stage 2 goal: no leak and test r2 >= 0.95 x best legitimate test r2 on the same split. */
export function stage2GoalMet(testR2: number, bestR2: number, leak: boolean): boolean {
  return !leak && Number.isFinite(testR2) && testR2 >= STAGE2_GOAL_RATIO * bestR2
}

export function isTooGood(testR2: number, leak: boolean): boolean {
  return leak && testR2 > TOO_GOOD_R2
}

export function fitWorkshop(data: { seed: number; working: readonly L07Row[] }, input: WorkshopInput): WorkshopOutcome {
  const split = workshopSplit(data.seed, data.working.length, input.testFraction, input.splitSeed)
  const train = split.train.map((i) => data.working[i])
  const test = split.test.map((i) => data.working[i])
  const fitted = fitSpec({ features: input.features, degree: 1 }, train)
  if ('error' in fitted) return { ok: false, error: fitted.error }
  const best = fitSpec(LEGIT_SPEC, train)
  if ('error' in best) return { ok: false, error: best.error }
  const trainM = metricsFor(fitted, train)
  const testM = metricsFor(fitted, test)
  const bestTestR2 = metricsFor(best, test).r2
  const leak = input.features.includes(LEAK_FEATURE)
  const coefficients: Record<string, number> = {}
  input.features.forEach((f, j) => (coefficients[f] = fitted.model.coefficients[j]))
  const pts = (rows: L07Row[], set: 'train' | 'test') => {
    const yhat = predict(fitted.model, fitted.design(rows))
    return rows.map((r, i) => ({ actual: r.cgpa, predicted: yhat[i], set }))
  }
  return {
    ok: true,
    features: [...input.features],
    intercept: fitted.model.intercept,
    coefficients,
    train: trainM,
    test: testM,
    bestTestR2,
    gap: bestTestR2 - testM.r2,
    leak,
    tooGood: isTooGood(testM.r2, leak),
    goalMet: stage2GoalMet(testM.r2, bestTestR2, leak),
    minimalist: !leak && input.features.length <= 2 && testM.r2 >= MINIMALIST_RATIO * bestTestR2,
    points: [...pts(train, 'train'), ...pts(test, 'test')],
  }
}

const UNITS: Record<FeatureName, string> = {
  attendance: 'percentage point of attendance',
  study_hours: 'weekly study hour',
  sleep_hours: 'hour of nightly sleep',
  year: 'year of study',
  scholarship: 'scholarship (Yes vs No)',
  library_visits: 'library visit per month',
  final_grade_points: 'final grade point',
}

export function coefficientSentence(feature: FeatureName, coef: number): string {
  const dir = coef >= 0 ? 'higher' : 'lower'
  return `Each extra ${UNITS[feature]} is associated with ${Math.abs(coef).toFixed(3)} ${dir} cgpa, holding the other selected features fixed.`
}

/** Correlated-feature note: study_hours coefficient before and after library_visits joins. */
export function correlatedNote(previous: WorkshopFit | null, current: WorkshopFit): string | null {
  if (!previous) return null
  const added = current.features.includes('library_visits') && !previous.features.includes('library_visits')
  if (!added || !('study_hours' in previous.coefficients) || !('study_hours' in current.coefficients)) return null
  const a = previous.coefficients.study_hours
  const b = current.coefficients.study_hours
  return `study_hours coefficient moved from ${a.toFixed(4)} to ${b.toFixed(4)} (${(b - a >= 0 ? '+' : '') + (b - a).toFixed(4)}). library_visits is correlated with study_hours, so the two share credit for the same signal; individual coefficients become unstable while predictions barely change.`
}

export const isLegit = (f: string): boolean => (LEGIT_FEATURES as readonly string[]).includes(f)

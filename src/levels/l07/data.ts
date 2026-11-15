// Level 07 data: cohort plus the leak column, the working/hold-out split and the SEALED hold-out evaluator.
import { generateCohort } from '../../engine/cohort'
import { mixSeed, mulberry32 } from '../../engine/rng'
import { COHORT_N, FINAL_TRAIN_N, HOLDOUT_N, LEAK_FEATURE, LEGIT_FEATURES, SALTS } from './config'
import type { FeatureName } from './config'
import { mae, ols, predict, r2, rangeScaler, rmse, trainTestSplit } from './regression'
import type { OlsModel } from './regression'

export interface L07Row {
  id: string
  attendance: number
  study_hours: number
  sleep_hours: number
  year: number
  scholarship: number
  library_visits: number
  final_grade_points: number
  cgpa: number
}

export interface ModelSpec {
  features: FeatureName[]
  /** 1 = linear; 2 adds a squared term per feature (rescaled on the training range). */
  degree: 1 | 2
}

export interface Metrics {
  r2: number
  mae: number
  rmse: number
}

export interface FittedModel {
  spec: ModelSpec
  model: OlsModel
  design: (rows: readonly L07Row[]) => number[][]
}

export interface HoldoutReport {
  holdout: Metrics
  achievableR2: number
}

export interface L07Data {
  seed: number
  working: L07Row[]
  /** Only door to the hold-out rows; fits on the 180 final-train rows internally. */
  evaluateHoldout: (spec: ModelSpec) => HoldoutReport | null
}

const r1 = (x: number): number => Math.round(x * 10) / 10

/** Builds the design matrix for a spec; squared terms use the training range. */
export function makeDesign(spec: ModelSpec, train: readonly L07Row[]): (rows: readonly L07Row[]) => number[][] {
  const scalers = spec.features.map((f) => rangeScaler(train.map((r) => r[f])))
  return (rows) =>
    rows.map((r) => {
      const base = spec.features.map((f) => r[f])
      if (spec.degree === 1) return base
      return [...base, ...spec.features.map((f, j) => scalers[j](r[f]) ** 2)]
    })
}

export function fitSpec(spec: ModelSpec, train: readonly L07Row[]): FittedModel | { error: string } {
  if (spec.features.length === 0) return { error: 'select at least one feature' }
  const design = makeDesign(spec, train)
  const fit = ols(design(train), train.map((r) => r.cgpa))
  return fit.ok ? { spec, model: fit.model, design } : { error: fit.error }
}

export function metricsFor(fitted: FittedModel, rows: readonly L07Row[]): Metrics {
  const y = rows.map((r) => r.cgpa)
  const yhat = predict(fitted.model, fitted.design(rows))
  return { r2: r2(y, yhat), mae: mae(y, yhat), rmse: rmse(y, yhat) }
}

export const LEGIT_SPEC: ModelSpec = { features: [...LEGIT_FEATURES], degree: 1 }

/** Fixed 180/60 split of the working rows used in the final forecast. */
export function finalSplit(data: { seed: number; working: readonly L07Row[] }): { train: L07Row[]; val: L07Row[] } {
  const order = mulberry32(mixSeed(data.seed, SALTS.finalSplit)).shuffle(data.working.map((_, i) => i))
  return {
    train: order.slice(0, FINAL_TRAIN_N).map((i) => data.working[i]),
    val: order.slice(FINAL_TRAIN_N).map((i) => data.working[i]),
  }
}

export function prepareL07Data(seed: number, options: { poisonHoldout?: boolean } = {}): L07Data {
  const cohort = generateCohort({ seed, n: COHORT_N })
  const leakRng = mulberry32(mixSeed(seed, SALTS.leakNoise))
  const rows: L07Row[] = cohort.map((s) => ({
    id: s.student_id,
    attendance: s.attendance,
    study_hours: s.study_hours,
    sleep_hours: s.sleep_hours,
    year: s.year,
    scholarship: s.scholarship === 'Yes' ? 1 : 0,
    library_visits: s.library_visits,
    [LEAK_FEATURE]: r1(s.cgpa * 24 + leakRng.normal(0, 0.5)),
    cgpa: s.cgpa,
  }))
  const split = trainTestSplit(rows.length, HOLDOUT_N / COHORT_N, mixSeed(seed, SALTS.holdoutSplit))
  const working = split.train.map((i) => rows[i])
  // Sealed: these rows live only inside this closure.
  const sealed: L07Row[] = split.test.map((i) => (options.poisonHoldout ? { ...rows[i], cgpa: Number.NaN } : rows[i]))
  const evaluateHoldout = (spec: ModelSpec): HoldoutReport | null => {
    const { train } = finalSplit({ seed, working })
    const fitted = fitSpec(spec, train)
    const best = fitSpec(LEGIT_SPEC, train)
    if ('error' in fitted || 'error' in best) return null
    return { holdout: metricsFor(fitted, sealed), achievableR2: metricsFor(best, sealed).r2 }
  }
  return { seed, working, evaluateHoldout }
}

/** Seeded split of working rows for Stage 2. */
export function workshopSplit(seed: number, n: number, testFraction: number, splitSeed: number) {
  return trainTestSplit(n, testFraction, mixSeed(seed, SALTS.workshopSplit, splitSeed))
}

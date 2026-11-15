// Level 05 Outlier Hunt maths (pure): deterministic injection of 6 entry errors and zero-safe precision/recall.
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed, mulberry32 } from '../../engine/rng'
import { iqrOutliers, quantile } from '../../engine/stats'

export const OUTLIER_SALT = 5051
export const OUTLIER_MULTIPLIERS = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0] as const

export interface Injected {
  values: number[]
  injected: number[]
}

/** Six rows chosen by a seeded shuffle get study_hours = Q3 + m*IQR (one decimal). They may exceed 40. */
export function injectOutliers(rows: readonly Pick<CohortStudent, 'study_hours'>[], seed: number): Injected {
  const values = rows.map((r) => r.study_hours)
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1
  const order = mulberry32(mixSeed(seed, OUTLIER_SALT)).shuffle(values.map((_, i) => i))
  const injected = order.slice(0, OUTLIER_MULTIPLIERS.length)
  const out = [...values]
  injected.forEach((idx, j) => {
    out[idx] = Math.round((q3 + OUTLIER_MULTIPLIERS[j] * iqr) * 10) / 10
  })
  return { values: out, injected: [...injected].sort((a, b) => a - b) }
}

export interface OutlierScore {
  flagged: number[]
  tp: number
  /** 0 when nothing is flagged (shown as n/a). */
  precision: number
  recall: number
  precisionDefined: boolean
  upper: number
  lower: number
}

export function scoreOutliers(data: Injected, k: number): OutlierScore {
  const r = iqrOutliers(data.values, k)
  const truth = new Set(data.injected)
  const tp = r.indices.filter((i) => truth.has(i)).length
  return {
    flagged: r.indices,
    tp,
    precision: r.indices.length ? tp / r.indices.length : 0,
    precisionDefined: r.indices.length > 0,
    recall: truth.size ? tp / truth.size : 0,
    upper: r.upper,
    lower: r.lower,
  }
}

export type OutlierAction = 'keep' | 'cap' | 'remove'

/** The resulting column after the chosen action on the flagged rows. */
export function applyAction(data: Injected, score: OutlierScore, action: OutlierAction): number[] {
  const flagged = new Set(score.flagged)
  if (action === 'keep') return [...data.values]
  if (action === 'cap') return data.values.map((v, i) => (flagged.has(i) ? Math.min(v, score.upper) : v))
  return data.values.filter((_, i) => !flagged.has(i))
}

export const actionCode = (k: number, action: OutlierAction): string => {
  const fence = `q1, q3 = df['study_hours'].quantile([0.25, 0.75]); hi = q3 + ${k}*(q3 - q1)`
  if (action === 'keep') return `${fence}  # keep all rows`
  if (action === 'cap') return `${fence}; df['study_hours'] = df['study_hours'].clip(upper=hi)`
  return `${fence}; df = df[df['study_hours'] <= hi]`
}

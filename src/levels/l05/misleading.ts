// Level 05 Misleading Chart side op (pure): three flawed charts, their fix controls and honesty checks.
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed, mulberry32 } from '../../engine/rng'
import { histogramBins, rate } from '../../engine/stats'
import type { Bin } from '../../engine/stats'
import { DEPARTMENTS } from '../../engine/cohortConfig'

export const MISLEAD_SALT = 5052

/** Dropout rate per department (for the truncated-axis chart). */
export function departmentRates(rows: readonly CohortStudent[]): { categories: string[]; values: number[] } {
  const categories = [...DEPARTMENTS]
  return { categories, values: categories.map((d) => rate(rows.filter((r) => r.department === d).map((r) => r.dropped_out)) || 0) }
}

/** A deterministic bimodal sample: commute minutes of students living on campus (~15) or in the city (~50). */
export function bimodalSample(seed: number, n = 200): number[] {
  const rng = mulberry32(mixSeed(seed, MISLEAD_SALT, 1))
  return Array.from({ length: n }, (_, i) => {
    const centre = i % 2 === 0 ? 15 : 50
    return Math.round(Math.min(65, Math.max(0, rng.normal(centre, 5))) * 10) / 10
  })
}

export const BIMODAL_EDGES = (bins: number): number[] => Array.from({ length: bins + 1 }, (_, i) => (65 * i) / bins)

/** Two peaks are visible when some bin between two higher bins dips below 60% of the smaller peak. */
export function showsTwoPeaks(bins: readonly Bin[]): boolean {
  const c = bins.map((b) => b.count)
  for (let i = 1; i < c.length - 1; i += 1) {
    const left = Math.max(...c.slice(0, i))
    const right = Math.max(...c.slice(i + 1))
    if (c[i] < 0.6 * Math.min(left, right)) return true
  }
  return false
}

export const bimodalBins = (values: readonly number[], bins: number): Bin[] => histogramBins(values, BIMODAL_EDGES(bins))

/** Twelve terms of average attendance: flat overall, with a three-term upswing at the end that a cherry-picked window shows. */
export function termSeries(seed: number): { x: number; y: number }[] {
  const rng = mulberry32(mixSeed(seed, MISLEAD_SALT, 2))
  const shape = [80, 82, 79, 81, 83, 80, 79, 81, 78, 77, 80, 83]
  return shape.map((y, i) => ({ x: i + 1, y: Math.round((y + rng.float(-0.4, 0.4)) * 10) / 10 }))
}

export function slope(points: readonly { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return NaN
  const mx = points.reduce((a, p) => a + p.x, 0) / n
  const my = points.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my)
    sxx += (p.x - mx) ** 2
  }
  return sxx === 0 ? NaN : sxy / sxx
}

export type WindowChoice = 'last3' | 'last6' | 'all'
export const windowPoints = (pts: readonly { x: number; y: number }[], w: WindowChoice) =>
  w === 'all' ? [...pts] : pts.slice(w === 'last3' ? -3 : -6)

export interface MisleadState {
  zero: boolean
  bins: number
  window: WindowChoice
}

export const MISLEAD_START: MisleadState = { zero: false, bins: 2, window: 'last3' }

/** Which of the three charts is honest under the current fix settings. */
export function honesty(state: MisleadState, bimodal: readonly number[]): { axis: boolean; bins: boolean; range: boolean } {
  return { axis: state.zero, bins: showsTwoPeaks(bimodalBins(bimodal, state.bins)), range: state.window === 'all' }
}

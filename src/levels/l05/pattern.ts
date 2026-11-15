// Level 05 pattern maths (pure): brush range statistics, binned dropout rates and the Dropout Cliff check.
import type { CohortStudent } from '../../engine/cohort'
import { rate } from '../../engine/stats'

export const ATT_MIN = 35
export const ATT_MAX = 100
export const LIFT_GOAL = 2
export const COVERAGE_GOAL = 0.15
export const CLIFF_TOLERANCE = 3

export type Range = [number, number]

type Row = Pick<CohortStudent, 'attendance' | 'dropped_out'>

/** Inside the brush: lo <= attendance < hi (hi = 100 includes 100, like the last histogram bin). */
export const inRange = (att: number, [lo, hi]: Range): boolean => att >= lo && (att < hi || (hi >= ATT_MAX && att <= hi))

/** Normalise a brush: ordered, clamped to the attendance domain, rounded to one decimal. */
export function normaliseRange(r: Range): Range {
  const c = (x: number) => Math.round(Math.min(ATT_MAX, Math.max(ATT_MIN, x)) * 10) / 10
  const a = c(r[0])
  const b = c(r[1])
  return a <= b ? [a, b] : [b, a]
}

export interface BrushStats {
  nIn: number
  nOut: number
  rateIn: number
  rateOut: number
  overall: number
  /** rateIn / overall; NaN when nothing is selected or nobody dropped out. */
  lift: number
  coverage: number
  meetsGoal: boolean
}

export function brushStats(rows: readonly Row[], range: Range): BrushStats {
  const inside = rows.filter((r) => inRange(r.attendance, range))
  const outside = rows.filter((r) => !inRange(r.attendance, range))
  const overall = rate(rows.map((r) => r.dropped_out))
  const rateIn = rate(inside.map((r) => r.dropped_out))
  const rateOut = rate(outside.map((r) => r.dropped_out))
  const lift = inside.length > 0 && overall > 0 ? rateIn / overall : NaN
  const coverage = rows.length ? inside.length / rows.length : 0
  return {
    nIn: inside.length,
    nOut: outside.length,
    rateIn,
    rateOut,
    overall,
    lift,
    coverage,
    meetsGoal: Number.isFinite(lift) && lift >= LIFT_GOAL && coverage >= COVERAGE_GOAL,
  }
}

export interface RateBin {
  label: string
  lo: number
  hi: number
  n: number
  rate: number
}

/** Dropout rate in 5-point attendance bins from 35 (the same bins steepestFall uses). */
export function binnedRates(rows: readonly Row[]): RateBin[] {
  const out: RateBin[] = []
  for (let lo = ATT_MIN; lo < ATT_MAX; lo += 5) {
    const hi = lo + 5
    const members = rows.filter((r) => r.attendance >= lo && (r.attendance < hi || (hi === ATT_MAX && r.attendance <= hi)))
    out.push({ label: `${lo}-${hi}`, lo, hi, n: members.length, rate: members.length ? rate(members.map((r) => r.dropped_out)) : 0 })
  }
  return out
}

/** Bins that overlap the brush (for highlighting). */
export const binsInRange = (bins: readonly RateBin[], [lo, hi]: Range): string[] =>
  bins.filter((b) => b.hi > lo && b.lo < hi).map((b) => b.label)

/** Hidden bonus: a boundary of the selection lies within 3 points of steepestFall. */
export function isCliffBoundary(range: Range, fall: number): boolean {
  if (!Number.isFinite(fall)) return false
  return Math.abs(range[0] - fall) <= CLIFF_TOLERANCE || Math.abs(range[1] - fall) <= CLIFF_TOLERANCE
}

export function brushCode([lo, hi]: Range): string {
  return `sel = df[(df['attendance'] >= ${lo}) & (df['attendance'] < ${hi})]; sel['dropped_out'].mean() / df['dropped_out'].mean()`
}

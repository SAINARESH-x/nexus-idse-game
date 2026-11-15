// Stage 1 pure helpers: the 60-point study_hours vs cgpa sample, SSE for a line and slider snapping.
import { INTERCEPT_RANGE, LINE_FIT_N, LINE_FIT_TOLERANCE, SLOPE_RANGE } from './config'
import type { L07Row } from './data'
import { simpleLine } from './regression'

export interface LineSample {
  x: number[]
  y: number[]
  best: { slope: number; intercept: number }
  minSse: number
}

export function lineSample(working: readonly L07Row[]): LineSample {
  const rows = working.slice(0, LINE_FIT_N)
  const x = rows.map((r) => r.study_hours)
  const y = rows.map((r) => r.cgpa)
  const best = simpleLine(x, y)
  return { x, y, best, minSse: lineSse(x, y, best.slope, best.intercept) }
}

export function lineSse(x: readonly number[], y: readonly number[], slope: number, intercept: number): number {
  return x.reduce((s, v, i) => s + (y[i] - (intercept + slope * v)) ** 2, 0)
}

export const snap = (v: number, r: { min: number; max: number; step: number }): number =>
  Math.round((Math.min(r.max, Math.max(r.min, v)) - r.min) / r.step) * r.step + r.min

export function snappedBest(s: LineSample): { slope: number; intercept: number } {
  return { slope: snap(s.best.slope, SLOPE_RANGE), intercept: snap(s.best.intercept, INTERCEPT_RANGE) }
}

export const lineGoalMet = (sse: number, minSse: number): boolean => sse <= LINE_FIT_TOLERANCE * minSse

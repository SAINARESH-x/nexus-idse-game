// Level 05 INSIGHT builder (pure): chip options, sentence composition and validation against the computed numbers.
import { ATT_MAX, ATT_MIN } from './pattern'
import type { BrushStats, Range } from './pattern'

export const INSIGHT_LIFT_TOL = 0.5
export const INSIGHT_N_TOL = 0.05

export type InsightVariable = 'attendance' | 'cgpa' | 'study_hours'
export type InsightDirection = 'below' | 'above' | 'between'
export type InsightCaveat = 'association' | 'causation' | 'none'

export interface InsightChips {
  variable: InsightVariable | null
  direction: InsightDirection | null
  /** Claimed lift (times the overall rate). */
  magnitude: number | null
  caveat: InsightCaveat | null
}

export const VARIABLE_CHIPS: InsightVariable[] = ['attendance', 'cgpa', 'study_hours']
export const DIRECTION_CHIPS: InsightDirection[] = ['below', 'above', 'between']
export const MAGNITUDE_CHIPS = [1.5, 2, 2.5, 3, 3.5, 4, 5] as const
export const CAVEAT_CHIPS: { id: InsightCaveat; text: string }[] = [
  { id: 'association', text: 'This is an association, not proof of cause.' },
  { id: 'causation', text: 'This proves low attendance causes dropout.' },
  { id: 'none', text: '(no caveat)' },
]

export const EMPTY_CHIPS: InsightChips = { variable: null, direction: null, magnitude: null, caveat: null }

/** The direction a range actually describes. */
export function rangeDirection([lo, hi]: Range): InsightDirection {
  if (lo <= ATT_MIN) return 'below'
  if (hi >= ATT_MAX) return 'above'
  return 'between'
}

export function composeInsight(chips: InsightChips, range: Range, nIn: number): string {
  const v = chips.variable ?? '___'
  const d = chips.direction
  const where = d === 'below' ? `below ${range[1]}` : d === 'above' ? `of ${range[0]} or more` : d === 'between' ? `between ${range[0]} and ${range[1]}` : '___'
  const m = chips.magnitude === null ? '___' : chips.magnitude.toFixed(1)
  const caveat = chips.caveat ? CAVEAT_CHIPS.find((c) => c.id === chips.caveat)?.text ?? '' : '___'
  const unit = v === 'attendance' ? ' percent' : ''
  return `Students with ${v} ${where}${unit} drop out at ${m} times the overall rate (n = ${nIn}). ${chips.caveat === 'none' ? '' : caveat}`.trim()
}

export interface InsightClaim {
  variable: InsightVariable | null
  direction: InsightDirection | null
  lift: number | null
  n: number
  caveat: InsightCaveat | null
}

export interface InsightCheck {
  ok: boolean
  problems: string[]
}

/** Validate a claim against the brushed variable (attendance), the range and the computed stats. */
export function insightCheck(claim: InsightClaim, range: Range, stats: BrushStats): InsightCheck {
  const problems: string[] = []
  if (claim.variable !== 'attendance') problems.push('The selection was made on attendance, so the claim must be about attendance.')
  const dir = rangeDirection(range)
  if (claim.direction !== dir) problems.push(`Your range describes students ${dir} the boundary, not "${claim.direction ?? 'nothing'}".`)
  if (claim.lift === null || !Number.isFinite(stats.lift) || Math.abs(claim.lift - stats.lift) > INSIGHT_LIFT_TOL)
    problems.push(`The computed lift is ${Number.isFinite(stats.lift) ? stats.lift.toFixed(2) : 'n/a'}; the claimed magnitude must be within ${INSIGHT_LIFT_TOL}.`)
  if (stats.nIn === 0 || Math.abs(claim.n - stats.nIn) > INSIGHT_N_TOL * stats.nIn) problems.push(`The selection holds ${stats.nIn} students; the claimed n must match within 5%.`)
  if (claim.caveat === 'causation') problems.push('Observational data cannot prove cause: students who skip class may differ in many other ways.')
  else if (claim.caveat !== 'association') problems.push('An insight from observational data needs the caveat "association, not proof of cause".')
  return { ok: problems.length === 0, problems }
}

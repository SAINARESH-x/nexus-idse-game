// Level 05 data access: the n = 240 cohort, numeric/categorical column lists and per-column value extraction.
import { generateCohort } from '../../engine/cohort'
import type { CohortStudent } from '../../engine/cohort'

export const L05_COHORT_N = 240

export const NUMERIC_COLUMNS = ['study_hours', 'attendance', 'sleep_hours', 'library_visits', 'cgpa', 'dropped_out'] as const
export const CATEGORY_COLUMNS = ['department', 'year', 'scholarship'] as const
export type NumericColumn = (typeof NUMERIC_COLUMNS)[number]
export type CategoryColumn = (typeof CATEGORY_COLUMNS)[number]
export type CohortColumn = NumericColumn | CategoryColumn

const cache = new Map<number, CohortStudent[]>()

/** The Level 05 cohort for a seed (memoised; the generator is pure, so caching is safe). */
export function l05Cohort(seed: number): CohortStudent[] {
  const hit = cache.get(seed)
  if (hit) return hit
  const rows = generateCohort({ seed, n: L05_COHORT_N })
  if (cache.size > 8) cache.clear()
  cache.set(seed, rows)
  return rows
}

export const isNumericColumn = (c: string): c is NumericColumn => (NUMERIC_COLUMNS as readonly string[]).includes(c)
export const isCategoryColumn = (c: string): c is CategoryColumn => (CATEGORY_COLUMNS as readonly string[]).includes(c)

export function numericValues(rows: readonly CohortStudent[], col: NumericColumn): number[] {
  return rows.map((r) => r[col])
}

export const fmt = (x: number, digits = 2): string => (Number.isFinite(x) ? x.toFixed(digits) : 'n/a')

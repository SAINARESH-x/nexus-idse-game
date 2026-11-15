// Level 04 engine tunables: valid ranges, par operations, integrity weights, judge thresholds, labels.
import type { Tier } from './types'

export const VALID_RANGES: Record<string, { min: number; max: number }> = {
  age: { min: 16, max: 40 },
  cgpa: { min: 0, max: 10 },
  attendance: { min: 0, max: 100 },
  year: { min: 1, max: 4 },
}

export const PAR_OPS: Record<Tier, number> = { assisted: 8, independent: 12, expert: 16 }

export const INTEGRITY_WEIGHTS = {
  consistency: 30,
  identification: 15,
  decisions: 25,
  preservation: 20,
  economy: 10,
} as const

export const EFFICIENCY_FLOOR = 0.3
export const IDENTIFICATION_DEFAULT = 0.5

export const DECISION_VALUE = { good: 1, neutral: 0.7, badKept: 0, badUndone: 0.6 } as const

export const JUDGE = {
  /** dropna / filter_range losing more than this fraction of rows is bad. */
  maxRowLoss: 0.05,
  /** drop_duplicates with a subset removing more than this fraction is bad. */
  maxDedupeLoss: 0.1,
  /** to_numeric(coerce) nulling more than this many previously present values is bad. */
  maxCoerced: 10,
  /** |sample skewness| above this means a mean fill is questionable. */
  skewThreshold: 0.5,
} as const

export const CANONICAL_DEPARTMENTS = ['Computer Science', 'Mechanical', 'Electrical', 'Civil'] as const

export const PLACEHOLDERS = ['N/A', '-', '?'] as const

export const NUMERIC_COLUMNS = ['student_id', 'year', 'age', 'cgpa', 'attendance', 'dropped_out'] as const
export const TEXT_COLUMNS = ['name', 'department', 'scholarship'] as const

export const TIER_ORDER: Tier[] = ['assisted', 'independent', 'expert']

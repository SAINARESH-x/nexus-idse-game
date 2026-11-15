// Level 05 descriptive statistics: one-column summary (mean, median, mode, spread, quartiles, skewness) and group-by goals.
import { groupAgg, mean, median, mode, quantile, std, variance } from '../../engine/stats'
import type { AggFn, GroupAggRow, RecordRow } from '../../engine/stats'
import type { CohortStudent } from '../../engine/cohort'

export interface ColumnSummary {
  n: number
  mean: number
  median: number
  mode: number | undefined
  std: number
  variance: number
  q1: number
  q3: number
  iqr: number
  min: number
  max: number
  skew: number
  shape: 'right-skewed' | 'left-skewed' | 'roughly symmetric'
  note: string
}

/** Adjusted Fisher-Pearson sample skewness G1, the same estimator pandas Series.skew() uses. NaN when n < 3. */
export function skewness(values: readonly number[]): number {
  const n = values.length
  if (n < 3) return NaN
  const m = mean(values)
  const s = std(values)
  if (!Number.isFinite(s) || s === 0) return 0
  let acc = 0
  for (const x of values) acc += ((x - m) / s) ** 3
  return (n / ((n - 1) * (n - 2))) * acc
}

export const SKEW_THRESHOLD = 0.5

export function describeColumn(values: readonly number[]): ColumnSummary {
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const sk = skewness(values)
  const mu = mean(values)
  const md = median(values)
  const shape = sk > SKEW_THRESHOLD ? 'right-skewed' : sk < -SKEW_THRESHOLD ? 'left-skewed' : 'roughly symmetric'
  const note =
    shape === 'right-skewed'
      ? `Skew ${sk.toFixed(2)}: a long right tail pulls the mean (${mu.toFixed(2)}) above the median (${md.toFixed(2)}). The median describes a typical value better.`
      : shape === 'left-skewed'
        ? `Skew ${sk.toFixed(2)}: a long left tail pulls the mean below the median. Prefer the median for a typical value.`
        : `Skew ${Number.isFinite(sk) ? sk.toFixed(2) : 'n/a'}: mean and median sit close together, so either describes the centre.`
  return {
    n: values.length,
    mean: mu,
    median: md,
    mode: mode(values),
    std: std(values),
    variance: variance(values),
    q1,
    q3,
    iqr: q3 - q1,
    min: values.length ? Math.min(...values) : NaN,
    max: values.length ? Math.max(...values) : NaN,
    skew: sk,
    shape,
    note,
  }
}

export interface GroupBySpec {
  by: string
  col: string
  fn: AggFn
}

export const AGG_FNS: AggFn[] = ['count', 'mean', 'median', 'std', 'min', 'max']

/** The live result of the GroupBy builder (exactly stats.groupAgg over the cohort records). */
export function runGroupBy(rows: readonly CohortStudent[], spec: GroupBySpec): GroupAggRow[] {
  // CohortStudent has only scalar fields, so it is a RecordRow; interfaces lack an index signature, hence the cast.
  return groupAgg(rows as unknown as readonly RecordRow[], spec.by, spec.col, spec.fn)
}

export function groupByCode(spec: GroupBySpec): string {
  return `df.groupby('${spec.by}')['${spec.col}'].${spec.fn}()`
}

/** Keys tied (within 1e-9) for the highest value; ties all count as correct. */
export function topKeys(result: readonly GroupAggRow[]): string[] {
  const finite = result.filter((r) => Number.isFinite(r.value))
  if (finite.length === 0) return []
  const best = Math.max(...finite.map((r) => r.value))
  return finite.filter((r) => Math.abs(r.value - best) < 1e-9).map((r) => r.key)
}

export interface GroupGoal {
  id: 'a' | 'b'
  label: string
  spec: GroupBySpec
}

export const GROUP_GOALS: GroupGoal[] = [
  { id: 'a', label: 'Which department has the highest MEDIAN cgpa?', spec: { by: 'department', col: 'cgpa', fn: 'median' } },
  { id: 'b', label: 'Which year has the highest dropout rate (mean of dropped_out)?', spec: { by: 'year', col: 'dropped_out', fn: 'mean' } },
]

export const sameSpec = (a: GroupBySpec, b: GroupBySpec): boolean => a.by === b.by && a.col === b.col && a.fn === b.fn

export type PinVerdict = 'correct' | 'wrong-query' | 'wrong-key'

/** Judge a pinned answer: the builder must show the goal's query and the pinned key must be a top key. */
export function judgePin(rows: readonly CohortStudent[], goal: GroupGoal, built: GroupBySpec, key: string): PinVerdict {
  if (!sameSpec(goal.spec, built)) return 'wrong-query'
  return topKeys(runGroupBy(rows, goal.spec)).includes(key) ? 'correct' : 'wrong-key'
}

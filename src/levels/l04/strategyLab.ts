// Strategy Lab (pure): builds cleaning cases from the live frame and compares strategies on a forked session.
import { createDfSession, dropoutRate, liveHealth, mean, median, numbers, unique, columnDtype, isNumericDtype, isNull } from '../../engine'
import type { DF, Decision, Op, Tier } from '../../engine'
import { engineConfig } from '../../engine'

export interface StrategyCtx {
  tier?: Tier
  /** Column whose statistics are reported (mean, median, nulls). */
  column?: string
}

export interface StrategyComparison {
  ok: boolean
  error?: string
  rowsBefore: number
  rowsAfter: number
  rowsLost: number
  pctLost: number
  nullsBefore: number
  nullsAfter: number
  meanBefore: number | null
  meanAfter: number | null
  medianBefore: number | null
  medianAfter: number | null
  dropoutBefore: number | null
  dropoutAfter: number | null
  /** Percentage points, after minus before. */
  dropoutShiftPts: number | null
  /** Dropouts (dropped_out == 1) among the removed rows. */
  dropoutsRemoved: number
  /** Distinct non-null department labels before and after. */
  labelsBefore: number
  labelsAfter: number
  decision: Decision | null
  code: string
  why: string
}

const round = (x: number, d = 1): number => Math.round(x * 10 ** d) / 10 ** d

function colStats(df: DF, column?: string) {
  if (!column || !df.columns.includes(column)) return { nulls: 0, mean: null, median: null }
  const nulls = df.rows.filter((r) => isNull(r.v[column] ?? null)).length
  if (!isNumericDtype(columnDtype(df, column))) return { nulls, mean: null, median: null }
  const xs = numbers(df, column)
  return { nulls, mean: xs.length ? mean(xs) : null, median: xs.length ? median(xs) : null }
}

function whyText(c: Omit<StrategyComparison, 'why'>, column?: string): string {
  if (!c.ok) return `This strategy fails on the current data: ${c.error ?? 'unknown error'}`
  const parts: string[] = []
  if (c.rowsLost > 0) {
    parts.push(`It removes ${c.rowsLost} of ${c.rowsBefore} students (${round(c.pctLost)} percent), and ${c.dropoutsRemoved} of them had dropped out.`)
  } else {
    parts.push(`It keeps all ${c.rowsBefore} students.`)
  }
  if (column && c.meanBefore !== null && c.meanAfter !== null && c.medianBefore !== null && c.medianAfter !== null) {
    parts.push(`The ${column} mean moves from ${round(c.meanBefore)} to ${round(c.meanAfter)} and the median from ${round(c.medianBefore)} to ${round(c.medianAfter)}.`)
  }
  if (column) parts.push(`Blanks in ${column}: ${c.nullsBefore} before, ${c.nullsAfter} after.`)
  if (c.dropoutShiftPts !== null) {
    parts.push(
      Math.abs(c.dropoutShiftPts) < 0.05
        ? 'The dropout rate does not change.'
        : `The dropout rate shifts by ${c.dropoutShiftPts > 0 ? '+' : ''}${round(c.dropoutShiftPts)} percentage points, so any analysis of who leaves would be biased.`,
    )
  }
  if (c.decision) parts.push(`Verdict: ${c.decision.explanation}`)
  return parts.join(' ')
}

const labels = (df: DF): number => (df.columns.includes('department') ? unique(df, 'department').filter((v) => !isNull(v)).length : 0)

function measure(current: DF, after: DF, ok: boolean, decision: Decision | null, code: string, ctx: StrategyCtx, error?: string): StrategyComparison {
  const before = colStats(current, ctx.column)
  const aft = colStats(after, ctx.column)
  const kept = new Set(after.rows.map((x) => x.idx))
  const removed = current.rows.filter((x) => !kept.has(x.idx))
  const d0 = dropoutRate(current)
  const d1 = dropoutRate(after)
  const base: Omit<StrategyComparison, 'why'> = {
    ok,
    error,
    rowsBefore: current.rows.length,
    rowsAfter: after.rows.length,
    rowsLost: removed.length,
    pctLost: current.rows.length ? (removed.length / current.rows.length) * 100 : 0,
    nullsBefore: before.nulls,
    nullsAfter: aft.nulls,
    meanBefore: before.mean,
    meanAfter: aft.mean,
    medianBefore: before.median,
    medianAfter: aft.median,
    dropoutBefore: d0,
    dropoutAfter: d1,
    dropoutShiftPts: d0 !== null && d1 !== null ? (d1 - d0) * 100 : null,
    dropoutsRemoved: removed.filter((x) => x.v.dropped_out === 1).length,
    labelsBefore: labels(current),
    labelsAfter: labels(after),
    decision,
    code,
  }
  return { ...base, why: whyText(base, ctx.column) }
}

/** Runs `ops` on a fork of `current` (a fresh session) and measures what changes. Never touches the caller's session. */
export function compareStrategy(current: DF, ops: Op[], ctx: StrategyCtx = {}): StrategyComparison {
  const fork = createDfSession(current, { tier: ctx.tier })
  const r = fork.apply(ops, 'ui')
  return measure(current, r.ok ? fork.current : current, r.ok, r.entry?.decision ?? null, r.entry?.code ?? '', ctx, r.error)
}

export interface Strategy {
  id: string
  label: string
  ops: Op[]
}

export interface StrategyCase {
  id: 'missing-attendance' | 'duplicates' | 'invalid-values'
  title: string
  story: string
  column?: string
  /** Shown when the problem cannot be handled yet (e.g. attendance is still text). */
  note?: string
  strategies: Strategy[]
}

const R = engineConfig.VALID_RANGES

/** Cases that still exist in the current frame (a case disappears once its problem is solved). */
export function buildCases(df: DF): StrategyCase[] {
  const h = liveHealth(df)
  const cases: StrategyCase[] = []
  if (df.columns.includes('attendance') && ((h.nulls.attendance ?? 0) > 0 || (h.placeholders.attendance ?? 0) > 0)) {
    const isText = !isNumericDtype(columnDtype(df, 'attendance'))
    const prep: Op[] = isText
      ? [
          { type: 'str_replace', column: 'attendance', old: '%', new: '' },
          { type: 'astype', column: 'attendance', to: 'float' },
        ]
      : []
    const strategies: Strategy[] = []
    if (isText) strategies.push({ id: 'convert', label: "0. Strip '%' and convert to float", ops: prep })
    strategies.push(
      { id: 'drop', label: 'Drop rows with blank attendance', ops: [{ type: 'dropna', subset: ['attendance'] }] },
      { id: 'zero', label: 'Fill with 0', ops: [...prep, { type: 'fillna', column: 'attendance', value: 0 }] },
      { id: 'mean', label: 'Fill with the mean', ops: [...prep, { type: 'fillna', column: 'attendance', strategy: 'mean' }] },
      { id: 'median', label: 'Fill with the median', ops: [...prep, { type: 'fillna', column: 'attendance', strategy: 'median' }] },
    )
    cases.push({
      id: 'missing-attendance',
      title: 'MISSING ATTENDANCE',
      story: `${h.nulls.attendance ?? 0} students have no attendance recorded. How you treat the blanks decides who stays in the analysis.`,
      column: 'attendance',
      note: isText ? 'Attendance is still text: convert type first. The fill strategies below include that step.' : undefined,
      strategies,
    })
  }
  if (h.normalizedDuplicates > 0) {
    cases.push({
      id: 'duplicates',
      title: 'DUPLICATES',
      story: `${h.duplicates} exact and ${h.normalizedDuplicates} normalised duplicate rows remain. Near-duplicates differ only in text formatting.`,
      strategies: [
        { id: 'dedupe', label: 'drop_duplicates now', ops: [{ type: 'drop_duplicates' }] },
        {
          id: 'std-dedupe',
          label: 'Standardise department, then drop_duplicates',
          ops: [{ type: 'str_op', column: 'department', fn: 'strip' }, { type: 'str_op', column: 'department', fn: 'title' }, { type: 'drop_duplicates' }],
        },
      ],
    })
  }
  const invalidCol = ['age', 'cgpa'].find((c) => (h.outOfRange[c] ?? 0) > 0 && isNumericDtype(columnDtype(df, c)))
  if (invalidCol) {
    const r = R[invalidCol]
    cases.push({
      id: 'invalid-values',
      title: 'INVALID VALUES',
      story: `${h.outOfRange[invalidCol]} ${invalidCol} values fall outside ${r.min} to ${r.max}.`,
      column: invalidCol,
      strategies: [
        { id: 'filter', label: 'Filter rows to the valid range', ops: [{ type: 'filter_range', column: invalidCol, min: r.min, max: r.max }] },
        {
          id: 'mask-median',
          label: 'Mask invalid values, then fill with the median',
          ops: [{ type: 'mask_invalid', column: invalidCol, min: r.min, max: r.max }, { type: 'fillna', column: invalidCol, strategy: 'median' }],
        },
        { id: 'leave', label: 'Leave as is', ops: [] },
      ],
    })
  }
  return cases
}

/** Like compareStrategy, but a strategy with no ops ("leave as is") reports the untouched frame with its verdict. */
export function compareAny(current: DF, s: Strategy, ctx: StrategyCtx): StrategyComparison {
  if (s.ops.length > 0) return compareStrategy(current, s.ops, ctx)
  const leave: Decision = { label: 'Left invalid values in place', good: false, explanation: 'Impossible values stay in the data and distort every mean and model built on it.' }
  return measure(current, current, true, leave, '# no change', ctx)
}

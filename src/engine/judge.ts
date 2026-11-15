// Decision judge: explains whether a cleaning op was a good, neutral, bad or redundant choice.
import { JUDGE, PLACEHOLDERS } from './config'
import { apply } from './ops'
import { dfEquals, isNull, isNum, numbers, skewness, unique } from './dataframe'
import type { Cell, DF, Decision, Op, Tier } from './types'

export interface JudgeCtx {
  tier?: Tier
}

const pct = (x: number): string => `${(Math.round(x * 1000) / 10).toFixed(1)}`

/** Share of rows with dropped_out == 1, or null when the column is absent / non-numeric. */
export function dropoutRate(df: DF): number | null {
  if (!df.columns.includes('dropped_out')) return null
  const vals = df.rows.map((r) => r.v.dropped_out ?? null).filter(isNum)
  if (vals.length === 0) return null
  return vals.filter((v) => v === 1).length / vals.length
}

function distinctLabels(df: DF, col: string): number {
  return unique(df, col).filter((v) => !isNull(v)).length
}

const isPlaceholder = (c: Cell): boolean => typeof c === 'string' && (PLACEHOLDERS as readonly string[]).includes(c.trim())

function droppedNullAttendance(before: DF, after: DF): number {
  if (!before.columns.includes('attendance')) return 0
  const kept = new Set(after.rows.map((r) => r.idx))
  return before.rows.filter((r) => !kept.has(r.idx) && isNull(r.v.attendance ?? null)).length
}

function judgeSingle(before: DF, after: DF, op: Op, ctx: JudgeCtx): Decision | null {
  const n0 = before.rows.length
  const lost = n0 - after.rows.length
  const frac = n0 ? lost / n0 : 0

  // Expert: dropping rows with blank attendance hides who dropped out (informative missingness).
  if (ctx.tier === 'expert' && lost > 0 && (op.type === 'dropna' || op.type === 'filter_range' || op.type === 'drop_rows')) {
    if (droppedNullAttendance(before, after) > 0) {
      const a = dropoutRate(before)
      const b = dropoutRate(after)
      if (a !== null && b !== null) {
        return {
          label: 'Dropped rows with blank attendance',
          good: false,
          explanation: `The blanks were not random: dropout rate moved from ${pct(a)} percent to ${pct(b)} percent after removing ${lost} rows. Missing attendance carried information.`,
        }
      }
    }
  }

  switch (op.type) {
    case 'dropna': {
      if (frac > JUDGE.maxRowLoss) {
        const where = op.subset?.length ? op.subset.join(', ') : 'a few columns'
        return { label: 'Dropped rows with blanks', good: false, explanation: `Lost ${lost} rows, ${pct(frac)} percent of the dataset, to remove blanks in ${op.subset?.length === 1 ? 'one column' : where}. Filling (for example with the median) would keep those students.` }
      }
      return null
    }
    case 'fillna': {
      if (op.column === 'attendance' && op.value === 0) {
        return { label: 'Filled attendance with 0', good: false, explanation: 'An attendance of 0 means the student never attended. Unknown is not the same as zero; the median is a safer estimate.' }
      }
      if (op.strategy === 'mean' && op.column) {
        const sk = skewness(numbers(before, op.column))
        if (Math.abs(sk) > JUDGE.skewThreshold) {
          return { label: `Mean fill on ${op.column}`, good: null, explanation: `'${op.column}' is skewed (skewness ${sk.toFixed(2)}), so the mean is pulled by extreme values. Prefer the median.` }
        }
        return { label: `Mean fill on ${op.column}`, good: true, explanation: `'${op.column}' is roughly symmetric, so the mean is a fair estimate for the blanks.` }
      }
      if ((op.strategy === 'median' || op.strategy === 'mode') && op.column) {
        return { label: `${op.strategy === 'median' ? 'Median' : 'Mode'} fill on ${op.column}`, good: true, explanation: `Filled the blanks with the ${op.strategy}, which is robust to outliers and keeps every row.` }
      }
      return null
    }
    case 'drop_duplicates': {
      if (op.subset?.length && n0 && lost / n0 > JUDGE.maxDedupeLoss) {
        return { label: 'Deduplicated on a subset', good: false, explanation: `Comparing only [${op.subset.join(', ')}] removed ${lost} rows (${pct(lost / n0)} percent). Different students can share those values.` }
      }
      return null
    }
    case 'filter_range': {
      if (frac > JUDGE.maxRowLoss) {
        return { label: `Filtered rows on ${op.column}`, good: false, explanation: `Filtering removed ${lost} rows (${pct(frac)} percent), including any blank ${op.column}. Masking the invalid values with NaN keeps the students.` }
      }
      return null
    }
    case 'mask_invalid':
      return { label: `Masked invalid ${op.column}`, good: true, explanation: 'Impossible values became NaN while the row (the student) was kept, ready to be filled.' }
    case 'str_op':
    case 'str_replace':
    case 'replace_map': {
      if (op.column === 'department' && distinctLabels(after, 'department') < distinctLabels(before, 'department')) {
        return { label: 'Standardised department labels', good: true, explanation: `Distinct department labels went from ${distinctLabels(before, 'department')} to ${distinctLabels(after, 'department')}.` }
      }
      return null
    }
    case 'to_numeric': {
      if (op.errors !== 'coerce') return null
      const byIdx = new Map(before.rows.map((r) => [r.idx, r.v[op.column] ?? null]))
      let lostValues = 0
      for (const r of after.rows) {
        const was = byIdx.get(r.idx) ?? null
        if (isNull(r.v[op.column] ?? null) && !isNull(was) && !isPlaceholder(was)) lostValues += 1
      }
      if (lostValues > JUDGE.maxCoerced) {
        return { label: `Coerced ${op.column} to numbers`, good: false, explanation: `${lostValues} real values became NaN because text like '85%' cannot be parsed. Remove the '%' first with .str.replace('%', '').` }
      }
      return null
    }
    default:
      return null
  }
}

/**
 * Judge one history entry (one op or a chain). Returns null when no rule applies (not counted).
 * An entry that changes nothing is redundant.
 */
export function judgeOp(before: DF, after: DF, op: Op | Op[], ctx: JudgeCtx = {}): Decision | null {
  const ops = Array.isArray(op) ? op : [op]
  if (dfEquals(before, after)) {
    return { label: 'No effect', good: null, redundant: true, explanation: 'This operation changed nothing in the dataset, so it only cost time.' }
  }
  if (ops.length === 1) return judgeSingle(before, after, ops[0], ctx)
  // Chain: judge each step on its intermediate frame; the department rule uses the whole chain.
  const found: Decision[] = []
  let cur = before
  for (const o of ops) {
    const r = apply(cur, o)
    if (!r.ok) break
    const d = dfEquals(cur, r.df) ? null : judgeSingle(cur, r.df, o, ctx)
    if (d) found.push(d)
    cur = r.df
  }
  const bad = found.find((d) => d.good === false)
  if (bad) return bad
  const dept = ops.every((o) => (o.type === 'str_op' || o.type === 'str_replace' || o.type === 'replace_map') && o.column === 'department')
  if (dept) return judgeSingle(before, after, ops[0], ctx)
  return found.find((d) => d.good === true) ?? found[0] ?? null
}

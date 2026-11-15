// Pure data-frame helpers: pandas-like dtype inference, shape, null counts, duplicates, value counts, describe.
import type { Cell, DF, Dtype, Row } from './types'

export function isNum(c: Cell): c is number {
  return typeof c === 'number' && !Number.isNaN(c)
}

export function isNull(c: Cell): c is null {
  return c === null || (typeof c === 'number' && Number.isNaN(c))
}

/** Pandas-like inference: any string => object; all bool => bool; all numbers => int64 if integral with no nulls, else float64. */
export function columnDtype(df: DF, column: string): Dtype {
  let nulls = 0
  let nums = 0
  let bools = 0
  let allInt = true
  for (const r of df.rows) {
    const c = r.v[column] ?? null
    if (isNull(c)) nulls += 1
    else if (typeof c === 'string') return 'object'
    else if (typeof c === 'boolean') bools += 1
    else {
      nums += 1
      if (!Number.isInteger(c)) allInt = false
    }
  }
  if (nums === 0 && bools === 0) return nulls > 0 && df.floatCols?.includes(column) ? 'float64' : 'object'
  if (bools > 0 && nums === 0) return nulls > 0 ? 'object' : 'bool'
  if (bools > 0) return 'object'
  if (nulls > 0 || !allInt || df.floatCols?.includes(column)) return 'float64'
  return 'int64'
}

export function dtypes(df: DF): Record<string, Dtype> {
  const out: Record<string, Dtype> = {}
  for (const c of df.columns) out[c] = columnDtype(df, c)
  return out
}

export function isNumericDtype(d: Dtype): boolean {
  return d === 'int64' || d === 'float64'
}

export function shape(df: DF): [number, number] {
  return [df.rows.length, df.columns.length]
}

export function head(df: DF, n = 5): DF {
  return { ...df, rows: df.rows.slice(0, Math.max(0, n)) }
}

export function tail(df: DF, n = 5): DF {
  return { ...df, rows: n <= 0 ? [] : df.rows.slice(-n) }
}

export function column(df: DF, name: string): Cell[] {
  return df.rows.map((r) => r.v[name] ?? null)
}

export function hasColumn(df: DF, name: string): boolean {
  return df.columns.includes(name)
}

export function nullCounts(df: DF): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of df.columns) out[c] = df.rows.filter((r) => isNull(r.v[c] ?? null)).length
  return out
}

function keyOf(row: Row, cols: string[]): string {
  return JSON.stringify(cols.map((c) => {
    const v = row.v[c] ?? null
    return isNull(v) ? null : v
  }))
}

/** True for every row that repeats an earlier row (keep='first'). NaN equals NaN, as in pandas. */
export function duplicateMask(df: DF, subset?: string[]): boolean[] {
  const cols = subset && subset.length > 0 ? subset : df.columns
  const seen = new Set<string>()
  return df.rows.map((r) => {
    const k = keyOf(r, cols)
    if (seen.has(k)) return true
    seen.add(k)
    return false
  })
}

/** Counts of non-null values, sorted by count descending (ties keep first appearance). */
export function valueCounts(df: DF, col: string): Array<[Cell, number]> {
  const map = new Map<string, { value: Cell; n: number; first: number }>()
  df.rows.forEach((r, i) => {
    const v = r.v[col] ?? null
    if (isNull(v)) return
    const k = JSON.stringify(v)
    const e = map.get(k)
    if (e) e.n += 1
    else map.set(k, { value: v, n: 1, first: i })
  })
  return [...map.values()].sort((a, b) => b.n - a.n || a.first - b.first).map((e) => [e.value, e.n])
}

/** Unique values in order of appearance, null included once if present. */
export function unique(df: DF, col: string): Cell[] {
  const seen = new Set<string>()
  const out: Cell[] = []
  for (const r of df.rows) {
    const raw = r.v[col] ?? null
    const v = isNull(raw) ? null : raw
    const k = JSON.stringify(v)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

export function numbers(df: DF, col: string): number[] {
  return column(df, col).filter(isNum)
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Linear-interpolation quantile (pandas default). */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export function median(xs: number[]): number {
  return quantile(xs, 0.5)
}

/** Sample standard deviation (ddof=1). */
export function std(xs: number[]): number {
  if (xs.length < 2) return NaN
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}

/** Sample skewness (adjusted Fisher-Pearson, like pandas .skew()). */
export function skewness(xs: number[]): number {
  const n = xs.length
  if (n < 3) return 0
  const m = mean(xs)
  const s = std(xs)
  if (!s) return 0
  const m3 = xs.reduce((a, x) => a + ((x - m) / s) ** 3, 0)
  return (n / ((n - 1) * (n - 2))) * m3
}

/** Most frequent non-null value; ties broken by the smallest value (pandas sorts mode()). */
export function mode(values: Cell[]): Cell {
  const counts = new Map<string, { v: Cell; n: number }>()
  for (const v of values) {
    if (isNull(v)) continue
    const k = JSON.stringify(v)
    const e = counts.get(k)
    if (e) e.n += 1
    else counts.set(k, { v, n: 1 })
  }
  let best: { v: Cell; n: number } | null = null
  for (const e of counts.values()) {
    if (!best || e.n > best.n) best = e
    else if (e.n === best.n && typeof e.v === typeof best.v && (e.v as number | string) < (best.v as number | string)) best = e
  }
  return best ? best.v : null
}

export interface DescribeStats {
  count: number
  mean: number
  std: number
  min: number
  '25%': number
  '50%': number
  '75%': number
  max: number
}

export function describe(df: DF): Record<string, DescribeStats> {
  const out: Record<string, DescribeStats> = {}
  const types = dtypes(df)
  for (const c of df.columns) {
    if (!isNumericDtype(types[c])) continue
    const xs = numbers(df, c)
    out[c] = {
      count: xs.length,
      mean: mean(xs),
      std: std(xs),
      min: xs.length ? Math.min(...xs) : NaN,
      '25%': quantile(xs, 0.25),
      '50%': quantile(xs, 0.5),
      '75%': quantile(xs, 0.75),
      max: xs.length ? Math.max(...xs) : NaN,
    }
  }
  return out
}

/** Deep value equality of two frames (columns, idx order, cells, float markers). */
export function dfEquals(a: DF, b: DF): boolean {
  if (a === b) return true
  if (a.columns.join('\u0000') !== b.columns.join('\u0000')) return false
  if (a.rows.length !== b.rows.length) return false
  const fa = [...(a.floatCols ?? [])].sort().join(',')
  const fb = [...(b.floatCols ?? [])].sort().join(',')
  if (fa !== fb) return false
  for (let i = 0; i < a.rows.length; i += 1) {
    const ra = a.rows[i]
    const rb = b.rows[i]
    if (ra.idx !== rb.idx) return false
    for (const c of a.columns) if (!Object.is(ra.v[c] ?? null, rb.v[c] ?? null)) return false
  }
  return true
}

export function rowByIdx(df: DF, idx: number): Row | undefined {
  return df.rows.find((r) => r.idx === idx)
}

export { info, formatDf, formatSeries, formatCell, pyRepr } from './format'

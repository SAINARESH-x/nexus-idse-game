// Pure descriptive statistics helpers shared by Levels 05 to 07 (pandas/NumPy-compatible conventions).
import { mulberry32 } from './rng'

/**
 * Conventions: helpers ignore non-finite inputs only where stated; on empty input
 * mean/median/std/variance/quantile/corr return NaN (never throw). std and variance
 * use ddof=1 like pandas; popStd uses ddof=0 like NumPy's default.
 */

export type Scalar = string | number | boolean | null
export type RecordRow = Readonly<Record<string, Scalar>>
export type AggFn = 'count' | 'mean' | 'median' | 'std' | 'min' | 'max'

const finite = (values: readonly number[]): number[] => values.filter((x) => Number.isFinite(x))

export function sum(values: readonly number[]): number {
  let s = 0
  for (const x of values) s += x
  return s
}

/** Arithmetic mean; NaN for empty input. */
export function mean(values: readonly number[]): number {
  return values.length === 0 ? NaN : sum(values) / values.length
}

/** Median (average of the two middle values for even n); NaN for empty input. */
export function median(values: readonly number[]): number {
  return quantile(values, 0.5)
}

/** Sample variance (ddof=1). NaN when n < 2. */
export function variance(values: readonly number[]): number {
  const n = values.length
  if (n < 2) return NaN
  const m = mean(values)
  let ss = 0
  for (const x of values) ss += (x - m) * (x - m)
  return ss / (n - 1)
}

/** Sample standard deviation (ddof=1, pandas default). NaN when n < 2. */
export function std(values: readonly number[]): number {
  return Math.sqrt(variance(values))
}

/** Population standard deviation (ddof=0, NumPy default). NaN for empty, 0 for one value. */
export function popStd(values: readonly number[]): number {
  const n = values.length
  if (n === 0) return NaN
  const m = mean(values)
  let ss = 0
  for (const x of values) ss += (x - m) * (x - m)
  return Math.sqrt(ss / n)
}

/** Quantile with pandas' default linear interpolation: position q*(n-1). NaN for empty. */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0 || !Number.isFinite(q)) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const pos = Math.min(1, Math.max(0, q)) * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Pearson correlation. NaN if lengths differ, n < 2, or either side has zero variance. */
export function corr(x: readonly number[], y: readonly number[]): number {
  const n = x.length
  if (n < 2 || y.length !== n) return NaN
  const mx = mean(x)
  const my = mean(y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return NaN
  return sxy / Math.sqrt(sxx * syy)
}

/** Most frequent value (smallest on ties, like pandas mode()[0]); undefined for empty. */
export function mode<T extends string | number>(values: readonly T[]): T | undefined {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: T | undefined
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && best !== undefined && v < best)) {
      best = v
      bestCount = c
    }
  }
  return best
}

/** Share of truthy (1) values in a 0/1 column; NaN for empty. */
export function rate(values: readonly (number | boolean)[]): number {
  if (values.length === 0) return NaN
  let k = 0
  for (const v of values) if (v === true || v === 1) k += 1
  return k / values.length
}

/** z-scores with the sample std (ddof=1, like (s - s.mean()) / s.std()). All 0 when std is 0 or NaN. */
export function zscores(values: readonly number[]): number[] {
  const m = mean(values)
  const s = std(values)
  if (!Number.isFinite(s) || s === 0) return values.map(() => 0)
  return values.map((x) => (x - m) / s)
}

export interface GroupAggRow {
  key: string
  value: number
  n: number
}

function applyAgg(values: number[], fn: AggFn): number {
  switch (fn) {
    case 'count':
      return values.length
    case 'mean':
      return mean(values)
    case 'median':
      return median(values)
    case 'std':
      return std(values)
    case 'min':
      return values.length ? Math.min(...values) : NaN
    case 'max':
      return values.length ? Math.max(...values) : NaN
  }
}

/**
 * df.groupby(by)[col].agg(fn) over plain record rows (use df.rows.map(r => r.v) for a DF).
 * Keys are stringified and sorted (numeric keys numerically). Null/non-numeric values in col are skipped
 * (count counts the non-null numeric values, like pandas count()).
 */
export function groupAgg(rows: readonly RecordRow[], by: string, col: string, fn: AggFn): GroupAggRow[] {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const k = row[by]
    if (k === null || k === undefined) continue
    const key = String(k)
    const raw = row[col]
    const list = groups.get(key) ?? []
    if (typeof raw === 'number' && Number.isFinite(raw)) list.push(raw)
    else if (typeof raw === 'boolean') list.push(raw ? 1 : 0)
    groups.set(key, list)
  }
  const keys = [...groups.keys()]
  const numeric = keys.every((k) => k.trim() !== '' && Number.isFinite(Number(k)))
  keys.sort((a, b) => (numeric ? Number(a) - Number(b) : a < b ? -1 : a > b ? 1 : 0))
  return keys.map((key) => {
    const vals = groups.get(key) ?? []
    return { key, value: applyAgg(vals, fn), n: vals.length }
  })
}

export interface Bin {
  x0: number
  x1: number
  count: number
}

/**
 * Histogram bins. `bins` is a bin count (equal widths from min to max) or explicit ascending edges.
 * Bins are [x0, x1) except the last, which includes x1 (like numpy.histogram). Non-finite values are ignored.
 * Empty input with a count returns []; a constant input gets one bin [v - 0.5, v + 0.5].
 */
export function histogramBins(values: readonly number[], bins: number | readonly number[]): Bin[] {
  const vals = finite(values)
  let edges: number[]
  if (typeof bins === 'number') {
    if (vals.length === 0) return []
    const k = Math.max(1, Math.floor(bins))
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    if (lo === hi) {
      lo -= 0.5
      hi += 0.5
      edges = [lo, hi]
    } else {
      edges = Array.from({ length: k + 1 }, (_, i) => (i === k ? hi : lo + ((hi - lo) * i) / k))
    }
  } else {
    edges = [...bins]
    if (edges.length < 2) return []
  }
  const out: Bin[] = edges.slice(0, -1).map((x0, i) => ({ x0, x1: edges[i + 1], count: 0 }))
  const last = out.length - 1
  for (const v of vals) {
    if (v < edges[0] || v > edges[edges.length - 1]) continue
    let i = out.findIndex((b) => v >= b.x0 && v < b.x1)
    if (i === -1 && v === edges[edges.length - 1]) i = last
    if (i >= 0) out[i].count += 1
  }
  return out
}

export interface IqrResult {
  q1: number
  q3: number
  iqr: number
  lower: number
  upper: number
  /** Indices (into the input) of values outside [lower, upper]. */
  indices: number[]
  outliers: number[]
}

/** Tukey fences: outliers are below Q1 - k*IQR or above Q3 + k*IQR (pandas-linear quartiles). */
export function iqrOutliers(values: readonly number[], k = 1.5): IqrResult {
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1
  const lower = q1 - k * iqr
  const upper = q3 + k * iqr
  const indices: number[] = []
  values.forEach((v, i) => {
    if (v < lower || v > upper) indices.push(i)
  })
  return { q1, q3, iqr, lower, upper, indices, outliers: indices.map((i) => values[i]) }
}

/**
 * Two-sided permutation test p-value for mean(a) - mean(b):
 * p = (1 + count(|null| >= |observed|)) / (shuffles + 1). Deterministic for a given seed.
 * Returns NaN if either group is empty.
 */
export function permutationPValue(
  a: readonly number[],
  b: readonly number[],
  shuffles: number,
  seed: number,
): number {
  if (a.length === 0 || b.length === 0) return NaN
  const pooled = Float64Array.from([...a, ...b])
  const na = a.length
  const n = pooled.length
  const total = sum(Array.from(pooled))
  const observed = mean(a) - mean(b)
  const absObs = Math.abs(observed) - 1e-12
  const rng = mulberry32(seed)
  let extreme = 0
  for (let s = 0; s < shuffles; s += 1) {
    // Partial Fisher-Yates: only the first na slots need to be a uniform random subset.
    let sa = 0
    for (let i = 0; i < na; i += 1) {
      const j = i + Math.floor(rng.next() * (n - i))
      const tmp = pooled[i]
      pooled[i] = pooled[j]
      pooled[j] = tmp
      sa += pooled[i]
    }
    const diff = sa / na - (total - sa) / (n - na)
    if (Math.abs(diff) >= absObs) extreme += 1
  }
  return (1 + extreme) / (shuffles + 1)
}

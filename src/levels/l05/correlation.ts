// Level 05 correlation helpers (pure): Pearson r for column pairs, wording and the within-band confounder check.
import type { CohortStudent } from '../../engine/cohort'
import { corr, quantile } from '../../engine/stats'
import type { NumericColumn } from './data'

export function pairCorr(rows: readonly CohortStudent[], x: NumericColumn, y: NumericColumn): number {
  return corr(rows.map((r) => r[x]), rows.map((r) => r[y]))
}

export const corrCode = (x: string, y: string): string => `df['${x}'].corr(df['${y}'])`

/** Plain-language strength of |r| (a common rule of thumb, not a law). */
export function describeR(r: number): string {
  if (!Number.isFinite(r)) return 'undefined (a column is constant)'
  const a = Math.abs(r)
  const dir = r > 0 ? 'positive' : 'negative'
  if (a < 0.1) return 'essentially none'
  if (a < 0.3) return `weak ${dir}`
  if (a < 0.5) return `moderate ${dir}`
  return `strong ${dir}`
}

export interface BandResult {
  label: string
  n: number
  r: number
}

export interface StratifiedResult {
  raw: number
  bands: BandResult[]
  /** Size-weighted mean of the finite within-band correlations. */
  within: number
}

/** Correlation of x and y inside quantile bands of a confounder (pd.qcut), weighted by band size. */
export function withinBandCorr(rows: readonly CohortStudent[], x: NumericColumn, y: NumericColumn, by: NumericColumn, bands: number): StratifiedResult {
  const k = Math.max(1, Math.floor(bands))
  const cv = rows.map((r) => r[by])
  const edges = Array.from({ length: k + 1 }, (_, i) => quantile(cv, i / k))
  const groups: CohortStudent[][] = Array.from({ length: k }, () => [])
  for (const r of rows) {
    let i = edges.findIndex((e, j) => j > 0 && r[by] <= e) - 1
    if (i < 0) i = 0
    groups[Math.min(k - 1, i)].push(r)
  }
  const out: BandResult[] = groups.map((g, i) => ({
    label: `${edges[i].toFixed(1)}–${edges[i + 1].toFixed(1)}`,
    n: g.length,
    r: corr(g.map((s) => s[x]), g.map((s) => s[y])),
  }))
  const usable = out.filter((b) => Number.isFinite(b.r))
  const total = usable.reduce((a, b) => a + b.n, 0)
  const within = total > 0 ? usable.reduce((a, b) => a + b.r * b.n, 0) / total : NaN
  return { raw: pairCorr(rows, x, y), bands: out, within }
}

export const stratCode = (x: string, y: string, by: string, k: number): string =>
  `df.groupby(pd.qcut(df['${by}'], ${k})).apply(lambda g: g['${x}'].corr(g['${y}']))`

/** The confounder goal is shown once the within-band r has fallen clearly below the raw r. */
export const weakens = (s: StratifiedResult): boolean => Number.isFinite(s.within) && Math.abs(s.within) < 0.75 * Math.abs(s.raw)

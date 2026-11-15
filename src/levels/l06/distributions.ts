// Level 06 Distribution Detective data (pure): four stratified seeded datasets and the mean-vs-median relation.
import { mixSeed, mulberry32 } from '../../engine/rng'
import { mean, median, popStd } from '../../engine/stats'
import { DIST_SIZE, L06_SALTS, MEAN_MEDIAN_TOLERANCE } from './config'

export type ShapeId = 'normal' | 'skewed' | 'bimodal' | 'uniform'
export type Relation = 'above' | 'below' | 'equal'

export const SHAPES: readonly { id: ShapeId; label: string; description: string }[] = [
  { id: 'normal', label: 'Normal', description: 'One symmetric bell around the centre (e.g. sleep hours).' },
  { id: 'skewed', label: 'Right-skewed', description: 'Most values low, a long tail of large values (e.g. study hours).' },
  { id: 'bimodal', label: 'Bimodal', description: 'Two separate humps: two subgroups mixed together.' },
  { id: 'uniform', label: 'Uniform', description: 'Every value in the range is about equally likely (e.g. a fair die).' },
]

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normalQuantile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12)
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q))
    return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1)
  }
  if (q > 1 - 0.02425) return -normalQuantile(1 - q)
  const r = q - 0.5
  const s = r * r
  return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1)
}

const QUANTILE: Record<ShapeId, (u: number, half: boolean) => number> = {
  normal: (u) => 6.8 + 1.0 * normalQuantile(u),
  skewed: (u) => 2 + 6 * -Math.log(1 - u),
  bimodal: (u, upper) => (upper ? 75 : 45) + 6 * normalQuantile(u),
  uniform: (u) => 1 + 5 * u,
}

const ROUND = (x: number) => Math.round(x * 10) / 10

/** Stratified draws: value_i = F^-1((i + U_i) / n), so each shape is stable for every seed. */
export function makeShape(id: ShapeId, seed: number, n = DIST_SIZE): number[] {
  const rng = mulberry32(mixSeed(seed, L06_SALTS.distributions, SHAPES.findIndex((s) => s.id === id)))
  if (id === 'bimodal') {
    const half = Math.floor(n / 2)
    const lower = Array.from({ length: half }, (_, i) => ROUND(QUANTILE.bimodal((i + rng.next()) / half, false)))
    const upper = Array.from({ length: half }, (_, i) => ROUND(QUANTILE.bimodal((i + rng.next()) / half, true)))
    return rng.shuffle([...lower, ...upper])
  }
  return rng.shuffle(Array.from({ length: n }, (_, i) => ROUND(QUANTILE[id]((i + rng.next()) / n, false))))
}

export interface DetectiveCase {
  key: string
  shape: ShapeId
  values: number[]
  mean: number
  median: number
  relation: Relation
}

export function meanMedianRelation(values: readonly number[]): Relation {
  const gap = mean(values) - median(values)
  const sd = popStd(values)
  if (sd === 0 || Math.abs(gap) < MEAN_MEDIAN_TOLERANCE * sd) return 'equal'
  return gap > 0 ? 'above' : 'below'
}

/** Four cases labelled A-D in a seeded order. */
export function detectiveCases(seed: number): DetectiveCase[] {
  const order = mulberry32(mixSeed(seed, L06_SALTS.distributions, 99)).shuffle(SHAPES.map((s) => s.id))
  return order.map((shape, i) => {
    const values = makeShape(shape, seed)
    return { key: 'ABCD'[i], shape, values, mean: mean(values), median: median(values), relation: meanMedianRelation(values) }
  })
}

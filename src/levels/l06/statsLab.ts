// Level 06 stats lab (pure): sampling distributions, standard errors, confidence intervals, permutation and z tests, fishing trip.
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed, mulberry32, type Rng } from '../../engine/rng'
import { mean, popStd, std } from '../../engine/stats'
import {
  CONVENIENCE_ATTENDANCE,
  FISHING_ALPHA,
  FISHING_COMPARISONS,
  FISHING_MAX_TRIES,
  FISHING_SAMPLE,
  L06_SALTS,
  Z_TABLE,
} from './config'

export type SamplingMethod = 'random' | 'convenience'

/** Draw min(n, pool.length) values without replacement (partial Fisher-Yates on a copy). */
export function drawWithout(pool: readonly number[], n: number, rng: Rng): number[] {
  const copy = [...pool]
  const m = Math.min(Math.max(0, Math.floor(n)), copy.length)
  for (let i = 0; i < m; i += 1) {
    const j = i + Math.floor(rng.next() * (copy.length - i))
    const t = copy[i]
    copy[i] = copy[j]
    copy[j] = t
  }
  return copy.slice(0, m)
}

export interface SampleMeansResult {
  means: number[]
  effectiveN: number
  trueMean: number
}

/**
 * `reps` sample means of cgpa. 'random' draws from the whole population; 'convenience'
 * draws only from students with attendance above 80 (if n exceeds that frame, the whole frame).
 */
export function sampleMeans(
  rows: readonly CohortStudent[],
  n: number,
  reps: number,
  seed: number,
  method: SamplingMethod,
): SampleMeansResult {
  const all = rows.map((r) => r.cgpa)
  const pool = method === 'random' ? all : rows.filter((r) => r.attendance > CONVENIENCE_ATTENDANCE).map((r) => r.cgpa)
  const rng = mulberry32(seed)
  const effectiveN = Math.min(Math.floor(n), pool.length)
  const means = Array.from({ length: reps }, () => mean(drawWithout(pool, effectiveN, rng)))
  return { means, effectiveN, trueMean: mean(all) }
}

/** popStd(values) / sqrt(n), ddof 0 (numpy default). */
export const theoreticalSE = (values: readonly number[], n: number): number => (n > 0 ? popStd(values) / Math.sqrt(n) : NaN)

/** Standard deviation of the sample means, ddof 1. */
export const empiricalSE = (means: readonly number[]): number => std(means)

export const zFor = (level: number): number => Z_TABLE[String(level)] ?? 1.96

export interface Interval {
  mean: number
  lo: number
  hi: number
  se: number
  z: number
  width: number
  n: number
}

/** mean +- z * s / sqrt(n) with s the sample std (ddof 1). Works on 0/1 samples too. */
export function confidenceInterval(sample: readonly number[], level: number): Interval {
  const n = sample.length
  const m = mean(sample)
  const se = n > 1 ? std(sample) / Math.sqrt(n) : NaN
  const z = zFor(level)
  return { mean: m, lo: m - z * se, hi: m + z * se, se, z, width: 2 * z * se, n }
}

export const covers = (ci: Interval, truth: number): boolean => ci.lo <= truth && truth <= ci.hi

export interface CiDraw {
  interval: Interval
  trueRate: number
  covers: boolean
}

/** One DRAW of the Stage 2 dropout-rate interval; seed = mixSeed(seed, CI salt, drawIndex). */
export function dropoutCiDraw(rows: readonly CohortStudent[], n: number, level: number, seed: number, drawIndex: number): CiDraw {
  const pool = rows.map((r) => r.dropped_out as number)
  const sample = drawWithout(pool, n, mulberry32(mixSeed(seed, L06_SALTS.ci, drawIndex)))
  const interval = confidenceInterval(sample, level)
  const trueRate = mean(pool)
  return { interval, trueRate, covers: covers(interval, trueRate) }
}

export interface PermutationResult {
  observed: number
  nulls: number[]
  pValue: number
}

/** Two-sided permutation test on mean(a) - mean(b): p = (1 + #(|null| >= |obs|)) / (shuffles + 1). */
export function permutationTest(a: readonly number[], b: readonly number[], shuffles: number, seed: number): PermutationResult {
  if (a.length === 0 || b.length === 0) return { observed: NaN, nulls: [], pValue: NaN }
  const pooled = Float64Array.from([...a, ...b])
  const na = a.length
  const n = pooled.length
  let total = 0
  for (const v of pooled) total += v
  const observed = mean(a) - mean(b)
  const absObs = Math.abs(observed) - 1e-12
  const rng = mulberry32(seed)
  const nulls: number[] = []
  let extreme = 0
  for (let s = 0; s < shuffles; s += 1) {
    let sa = 0
    for (let i = 0; i < na; i += 1) {
      const j = i + Math.floor(rng.next() * (n - i))
      const t = pooled[i]
      pooled[i] = pooled[j]
      pooled[j] = t
      sa += pooled[i]
    }
    const diff = sa / na - (total - sa) / (n - na)
    nulls.push(diff)
    if (Math.abs(diff) >= absObs) extreme += 1
  }
  return { observed, nulls, pValue: (1 + extreme) / (shuffles + 1) }
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26 erf, |error| < 1.5e-7). */
export function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * z)
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const erf = 1 - poly * Math.exp(-z * z)
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
}

/** Two-sided z-test p-value for a difference of means (normal approximation, unpooled variances). */
export function zTestP(a: readonly number[], b: readonly number[]): number {
  if (a.length < 2 || b.length < 2) return NaN
  const se = Math.sqrt(std(a) ** 2 / a.length + std(b) ** 2 / b.length)
  if (se === 0) return 1
  const z = (mean(a) - mean(b)) / se
  return 2 * (1 - normalCdf(Math.abs(z)))
}

export const bonferroniThreshold = (alpha: number, m: number): number => alpha / m

export type Verdict = 'reject' | 'retain'
export const correctVerdict = (p: number, alpha: number): Verdict => (p <= alpha ? 'reject' : 'retain')
export const validateVerdict = (p: number, alpha: number, decision: Verdict): boolean => correctVerdict(p, alpha) === decision

export type Question = 'attendance' | 'scholarship'

export interface HypothesisGroups {
  a: number[]
  b: number[]
  statistic: 'means' | 'rates'
  labelA: string
  labelB: string
}

export function hypothesisGroups(rows: readonly CohortStudent[], q: Question): HypothesisGroups {
  if (q === 'attendance') {
    return {
      a: rows.filter((r) => r.attendance >= 75).map((r) => r.cgpa),
      b: rows.filter((r) => r.attendance < 75).map((r) => r.cgpa),
      statistic: 'means',
      labelA: 'attendance >= 75',
      labelB: 'attendance < 75',
    }
  }
  return {
    a: rows.filter((r) => r.scholarship === 'Yes').map((r) => r.dropped_out as number),
    b: rows.filter((r) => r.scholarship === 'No').map((r) => r.dropped_out as number),
    statistic: 'rates',
    labelA: 'scholarship = Yes',
    labelB: 'scholarship = No',
  }
}

/** Permutation seed for re-run index r: mixSeed(seed, PERM salt, r). */
export const permSeed = (seed: number, rerun: number): number => mixSeed(seed, L06_SALTS.perm, rerun)

export const FISHING_FACTORS = [
  'born in an odd month', 'left-handed', 'owns a cat', 'prefers tea', 'takes the bus', 'name starts A-M',
  'plays chess', 'early riser', 'has a sibling', 'likes rain', 'wears glasses', 'eats breakfast',
  'uses dark mode', 'sits near a window', 'listens to jazz', 'odd student number', 'cycles to campus',
  'likes spicy food', 'owns a plant', 'drinks coffee',
] as const

export interface FishingComparison {
  id: number
  label: string
  meanA: number
  meanB: number
  p: number
}

export interface FishingTrip {
  comparisons: FishingComparison[]
  rawSignificant: number
  bonferroniSignificant: number
  tryIndex: number
}

/**
 * 20 comparisons of cgpa between RANDOM coin-flip groups on a noise sample of 400 students.
 * Sub-seeds k = 0..499 are tried; the first set with >= 1 raw p < 0.05 and none below 0.05/20 is kept
 * (fallback: first set with >= 1 raw p < 0.05), so a false positive Bonferroni removes exists by construction.
 */
export function fishingTrip(rows: readonly CohortStudent[], seed: number): FishingTrip {
  const sample = drawWithout(rows.map((r) => r.cgpa), FISHING_SAMPLE, mulberry32(mixSeed(seed, L06_SALTS.fishing)))
  const bonf = bonferroniThreshold(FISHING_ALPHA, FISHING_COMPARISONS)
  let fallback: FishingTrip | null = null
  for (let k = 0; k < FISHING_MAX_TRIES; k += 1) {
    const rng = mulberry32(mixSeed(seed, L06_SALTS.fishing, k))
    const comparisons: FishingComparison[] = FISHING_FACTORS.slice(0, FISHING_COMPARISONS).map((label, id) => {
      const order = rng.shuffle(sample.map((_, i) => i))
      const half = Math.floor(sample.length / 2)
      const a = order.slice(0, half).map((i) => sample[i])
      const b = order.slice(half).map((i) => sample[i])
      return { id, label, meanA: mean(a), meanB: mean(b), p: zTestP(a, b) }
    })
    const raw = comparisons.filter((c) => c.p < FISHING_ALPHA).length
    const strict = comparisons.filter((c) => c.p < bonf).length
    const trip = { comparisons, rawSignificant: raw, bonferroniSignificant: strict, tryIndex: k }
    if (raw >= 1 && strict === 0) return trip
    if (raw >= 1 && !fallback) fallback = trip
  }
  return fallback ?? { comparisons: [], rawSignificant: 0, bonferroniSignificant: 0, tryIndex: -1 }
}

export interface CoverageInterval {
  lo: number
  hi: number
  covers: boolean
}

export interface CoverageRun {
  intervals: CoverageInterval[]
  covered: number
  meanWidth: number
  trueMean: number
}

/** `count` intervals for mean cgpa from independent samples of size n; seed = mixSeed(seed, COVERAGE salt, runIndex). */
export function coverageRun(
  rows: readonly CohortStudent[],
  n: number,
  level: number,
  seed: number,
  runIndex: number,
  count: number,
): CoverageRun {
  const pool = rows.map((r) => r.cgpa)
  const trueMean = mean(pool)
  const rng = mulberry32(mixSeed(seed, L06_SALTS.coverage, runIndex))
  const intervals = Array.from({ length: count }, () => {
    const ci = confidenceInterval(drawWithout(pool, n, rng), level)
    return { lo: ci.lo, hi: ci.hi, covers: covers(ci, trueMean) }
  })
  return {
    intervals,
    covered: intervals.filter((i) => i.covers).length,
    meanWidth: mean(intervals.map((i) => i.hi - i.lo)),
    trueMean,
  }
}

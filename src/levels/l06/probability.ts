// Level 06 probability helpers (pure): events on the cohort, simulation of frequencies, two-way tables, binomial law.
import type { CohortStudent } from '../../engine/cohort'
import { mulberry32 } from '../../engine/rng'

export type EventChipId = 'dropout' | 'lowAttendance' | 'scholarship' | 'highStudy'
export type Connector = 'none' | 'and' | 'or'

export interface EventChip {
  id: EventChipId
  label: string
  code: string
  test: (s: CohortStudent) => boolean
}

export const EVENT_CHIPS: readonly EventChip[] = [
  { id: 'dropout', label: 'dropped_out = 1', code: "(df['dropped_out'] == 1)", test: (s) => s.dropped_out === 1 },
  { id: 'lowAttendance', label: 'attendance < 60', code: "(df['attendance'] < 60)", test: (s) => s.attendance < 60 },
  { id: 'scholarship', label: 'scholarship = Yes', code: "(df['scholarship'] == 'Yes')", test: (s) => s.scholarship === 'Yes' },
  { id: 'highStudy', label: 'study_hours >= 15', code: "(df['study_hours'] >= 15)", test: (s) => s.study_hours >= 15 },
]

export const chipById = (id: EventChipId): EventChip => EVENT_CHIPS.find((c) => c.id === id) ?? EVENT_CHIPS[0]

export interface EventSpec {
  first: EventChipId
  connector: Connector
  second: EventChipId
}

export const isCompound = (spec: EventSpec): boolean => spec.connector !== 'none' && spec.first !== spec.second

export function eventTest(spec: EventSpec): (s: CohortStudent) => boolean {
  const a = chipById(spec.first).test
  const b = chipById(spec.second).test
  if (!isCompound(spec)) return a
  return spec.connector === 'and' ? (s) => a(s) && b(s) : (s) => a(s) || b(s)
}

export function eventLabel(spec: EventSpec): string {
  const a = chipById(spec.first).label
  if (!isCompound(spec)) return a
  return `${a} ${spec.connector === 'and' ? 'AND' : 'OR'} ${chipById(spec.second).label}`
}

export function eventCode(spec: EventSpec): string {
  const a = chipById(spec.first).code
  if (!isCompound(spec)) return `${a}.mean()`
  return `(${a} ${spec.connector === 'and' ? '&' : '|'} ${chipById(spec.second).code}).mean()`
}

export interface ExactProbability {
  count: number
  n: number
  p: number
}

export function exactProbability<T>(rows: readonly T[], test: (row: T) => boolean): ExactProbability {
  let count = 0
  for (const row of rows) if (test(row)) count += 1
  return { count, n: rows.length, p: rows.length ? count / rows.length : 0 }
}

/** Addition rule pieces: P(A), P(B), P(A and B) and P(A or B) = P(A) + P(B) - P(A and B). */
export function additionRule<T>(rows: readonly T[], a: (r: T) => boolean, b: (r: T) => boolean) {
  const pA = exactProbability(rows, a).p
  const pB = exactProbability(rows, b).p
  const pAB = exactProbability(rows, (r) => a(r) && b(r)).p
  return { pA, pB, pAB, pUnion: pA + pB - pAB }
}

export interface FrequencyPoint {
  x: number
  y: number
}

/**
 * Law of large numbers: k draws WITH replacement from the population; the running
 * relative frequency of the event is sampled at about `points` checkpoints.
 */
export function simulateFrequency(outcomes: readonly boolean[], k: number, seed: number, points = 50): FrequencyPoint[] {
  const total = Math.max(0, Math.floor(k))
  if (outcomes.length === 0 || total === 0) return []
  const rng = mulberry32(seed)
  const every = Math.max(1, Math.floor(total / points))
  const out: FrequencyPoint[] = []
  let hits = 0
  for (let i = 1; i <= total; i += 1) {
    if (outcomes[Math.floor(rng.next() * outcomes.length)]) hits += 1
    if (i % every === 0 || i === total) out.push({ x: i, y: hits / i })
  }
  return out
}

/** Two-way table counts for row event R and column event C. */
export interface TwoWay {
  rc: number
  rNotC: number
  notRc: number
  notRNotC: number
}

export function twoWayTable<T>(rows: readonly T[], r: (row: T) => boolean, c: (row: T) => boolean): TwoWay {
  const t: TwoWay = { rc: 0, rNotC: 0, notRc: 0, notRNotC: 0 }
  for (const row of rows) {
    const inR = r(row)
    const inC = c(row)
    if (inR && inC) t.rc += 1
    else if (inR) t.rNotC += 1
    else if (inC) t.notRc += 1
    else t.notRNotC += 1
  }
  return t
}

export type CellId = keyof TwoWay
export type MarginId = 'R' | 'notR' | 'C' | 'notC' | 'all'

export function cellCount(t: TwoWay, id: CellId): number {
  return t[id]
}

export function marginCount(t: TwoWay, id: MarginId): number {
  switch (id) {
    case 'R':
      return t.rc + t.rNotC
    case 'notR':
      return t.notRc + t.notRNotC
    case 'C':
      return t.rc + t.notRc
    case 'notC':
      return t.rNotC + t.notRNotC
    default:
      return t.rc + t.rNotC + t.notRc + t.notRNotC
  }
}

export interface Conditionals {
  /** P(C): the column event overall. */
  pC: number
  pR: number
  /** P(C | R) */
  pCgivenR: number
  /** P(R | C) */
  pRgivenC: number
  /** P(C | not R) */
  pCgivenNotR: number
  /** P(C | R) - P(C): zero under independence. */
  independenceGap: number
}

const ratio = (a: number, b: number): number => (b === 0 ? 0 : a / b)

export function conditionals(t: TwoWay): Conditionals {
  const all = marginCount(t, 'all')
  const pC = ratio(marginCount(t, 'C'), all)
  const pCgivenR = ratio(t.rc, marginCount(t, 'R'))
  return {
    pC,
    pR: ratio(marginCount(t, 'R'), all),
    pCgivenR,
    pRgivenC: ratio(t.rc, marginCount(t, 'C')),
    pCgivenNotR: ratio(t.notRc, marginCount(t, 'notR')),
    independenceGap: pCgivenR - pC,
  }
}

export const tableRatio = (t: TwoWay, num: CellId, den: MarginId): number => ratio(cellCount(t, num), marginCount(t, den))

/** n choose k as a float (exact for the small n used here). */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  const kk = Math.min(k, n - k)
  let c = 1
  for (let i = 1; i <= kk; i += 1) c = (c * (n - kk + i)) / i
  return c
}

export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0
  return choose(n, k) * p ** k * (1 - p) ** (n - k)
}

export function binomialPmfAll(n: number, p: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => binomialPmf(k, n, p))
}

/** P(X <= k) */
export function binomialCdf(k: number, n: number, p: number): number {
  let s = 0
  for (let i = 0; i <= Math.min(k, n); i += 1) s += binomialPmf(i, n, p)
  return Math.min(1, s)
}

/** P(X >= k) = 1 - P(X <= k - 1); scipy: binom.sf(k - 1, n, p). */
export function binomialAtLeast(k: number, n: number, p: number): number {
  if (k <= 0) return 1
  return Math.max(0, 1 - binomialCdf(k - 1, n, p))
}

export const binomialMean = (n: number, p: number): number => n * p
export const binomialSd = (n: number, p: number): number => Math.sqrt(n * p * (1 - p))

/** Simulated counts: how many of `reps` groups had exactly k successes, for k = 0..n. */
export function simulateBinomial(n: number, p: number, reps: number, seed: number): number[] {
  const rng = mulberry32(seed)
  const counts = new Array<number>(n + 1).fill(0)
  for (let r = 0; r < reps; r += 1) {
    let x = 0
    for (let i = 0; i < n; i += 1) if (rng.next() < p) x += 1
    counts[x] += 1
  }
  return counts
}

/** Smallest group size n in [1, maxN] with P(X >= k) >= target, or null. */
export function smallestNForTail(p: number, k: number, target: number, maxN: number): number | null {
  for (let n = 1; n <= maxN; n += 1) if (binomialAtLeast(k, n, p) >= target) return n
  return null
}

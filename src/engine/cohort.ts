// Deterministic synthetic student cohort for Levels 05-07, plus steepestFall and the invariant checks the tests rely on.
import { mixSeed, mulberry32 } from './rng'
import {
  ATTENDANCE_BANDS,
  CGPA,
  COHORT_SALTS as S,
  DEPARTMENTS,
  DROPOUT,
  DROPOUT_JITTER,
  DROPOUT_QUOTA_START,
  DROPOUT_QUOTA_WIDTH,
  DROPOUT_SCHOLARSHIP_LOGIT,
  LIBRARY_RHO,
  LIB_MEAN,
  LIB_SD,
  SCHOLARSHIP_SHARE,
  SLEEP_MEAN,
  SLEEP_SD,
  STUDY_MAX,
  STUDY_SCALE,
  STUDY_SHAPE,
} from './cohortConfig'
import { corr, mean, median, permutationPValue, popStd, rate } from './stats'

export interface CohortStudent {
  student_id: string
  department: string
  year: number
  study_hours: number
  attendance: number
  sleep_hours: number
  library_visits: number
  scholarship: 'Yes' | 'No'
  cgpa: number
  dropped_out: 0 | 1
}

export const COHORT_COLUMNS = [
  'student_id',
  'department',
  'year',
  'study_hours',
  'attendance',
  'sleep_hours',
  'library_visits',
  'scholarship',
  'cgpa',
  'dropped_out',
] as const

/** Structurally identical to the engine DF type. */
export interface CohortDF {
  columns: string[]
  rows: { idx: number; v: Record<string, string | number | boolean | null> }[]
}

const r1 = (x: number): number => Math.round(x * 10) / 10
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

function attendanceFromQuantile(u: number): number {
  let start = 0
  for (let b = 0; b < ATTENDANCE_BANDS.length; b += 1) {
    const band = ATTENDANCE_BANDS[b]
    const isLast = b === ATTENDANCE_BANDS.length - 1
    if (u < start + band.share || isLast) {
      const t = clamp((u - start) / band.share, 0, 1)
      const v = r1(band.lo + t * (band.hi - band.lo))
      return isLast ? clamp(v, band.lo, band.hi) : clamp(v, band.lo, r1(band.hi - 0.1))
    }
    start += band.share
  }
  return ATTENDANCE_BANDS[ATTENDANCE_BANDS.length - 1].hi
}

/** Remove from y (keeping its mean) the least-squares projection on the centred, Gram-Schmidt-orthogonalised xs. */
function residualize(y: readonly number[], xs: readonly (readonly number[])[]): number[] {
  const n = y.length
  if (n < 2) return [...y]
  const basis: number[][] = []
  for (const x of xs) {
    const m = x.reduce((a, b) => a + b, 0) / n
    const v = x.map((t) => t - m)
    for (const b of basis) {
      const bb = b.reduce((a, t) => a + t * t, 0)
      const vb = v.reduce((a, t, i) => a + t * b[i], 0)
      for (let i = 0; i < n; i += 1) v[i] -= (vb / bb) * b[i]
    }
    if (v.reduce((a, t) => a + t * t, 0) > 1e-9) basis.push(v)
  }
  const out = [...y]
  for (const b of basis) {
    const bb = b.reduce((a, t) => a + t * t, 0)
    const yb = out.reduce((a, t, i) => a + t * b[i], 0)
    for (let i = 0; i < n; i += 1) out[i] -= (yb / bb) * b[i]
  }
  return out
}

/** Generate n students. Same seed and n always give identical data. */
export function generateCohort({ seed, n }: { seed: number; n: number }): CohortStudent[] {
  const count = Math.max(0, Math.floor(n))
  const ids = Array.from({ length: count }, (_, i) => i)
  const rank = mulberry32(mixSeed(seed, S.attendanceRank)).shuffle(ids)
  const attJ = mulberry32(mixSeed(seed, S.attendanceJitter))
  const studyR = mulberry32(mixSeed(seed, S.studyHours))
  const sleepR = mulberry32(mixSeed(seed, S.sleep))
  const libR = mulberry32(mixSeed(seed, S.library))
  const noiseR = mulberry32(mixSeed(seed, S.cgpaNoise))
  const jitR = mulberry32(mixSeed(seed, S.dropoutJitter))
  const catR = mulberry32(mixSeed(seed, S.categorical))
  const scholOrder = mulberry32(mixSeed(seed, S.scholarship)).shuffle(ids)
  const scholSet = new Set(scholOrder.slice(0, Math.round(SCHOLARSHIP_SHARE * count)))
  const studyMean = STUDY_SHAPE * STUDY_SCALE
  const studySd = Math.sqrt(STUDY_SHAPE) * STUDY_SCALE
  const libNoise = Math.sqrt(1 - LIBRARY_RHO * LIBRARY_RHO)

  // Raw draws first; then sample-level orthogonalisation (below) removes chance correlations by construction.
  const attendance = ids.map((i) => attendanceFromQuantile((rank[i] + attJ.next()) / count))
  const gammaRaw = ids.map(() => {
    let g = 0
    for (let k = 0; k < STUDY_SHAPE; k += 1) g -= Math.log(1 - studyR.next())
    return g * STUDY_SCALE
  })
  const sleepRaw = ids.map(() => sleepR.normal(SLEEP_MEAN, SLEEP_SD))
  const noiseRaw = ids.map(() => noiseR.normal(0, CGPA.noise))
  const rawStudy = residualize(gammaRaw, [attendance])
  const study = rawStudy.map((x) => clamp(r1(x), 0, STUDY_MAX))
  const sleep = residualize(sleepRaw, [attendance, study]).map((x) => clamp(r1(x), 4, 9))
  const scholFlag = ids.map((i) => (scholSet.has(i) ? 1 : 0))
  const noise = residualize(noiseRaw, [attendance, study, sleep, scholFlag])

  const students: CohortStudent[] = []
  const score: number[] = []
  const prob: number[] = []
  for (let i = 0; i < count; i += 1) {
    const att = attendance[i]
    const study_hours = study[i]
    const sleep_hours = sleep[i]
    const z = (rawStudy[i] - studyMean) / studySd
    const library_visits = Math.max(0, Math.round(LIB_MEAN + LIB_SD * (LIBRARY_RHO * z + libNoise * libR.normal())))
    const schol = scholFlag[i] === 1
    const cgpa = clamp(
      r1(
        CGPA.base +
          CGPA.attendance * att +
          CGPA.study * study_hours +
          CGPA.sleep * (sleep_hours - CGPA.sleepPivot) +
          (schol ? CGPA.scholarship : 0) +
          noise[i],
      ),
      CGPA.min,
      CGPA.max,
    )
    const logit =
      DROPOUT.intercept +
      (att < 75 ? DROPOUT.midAttStep : 0) +
      (att < 60 ? DROPOUT.lowAttStep : 0) +
      DROPOUT.cgpa * (cgpa - DROPOUT.cgpaPivot) +
      (schol ? DROPOUT_SCHOLARSHIP_LOGIT : 0)
    prob.push(sigmoid(logit))
    score.push(logit + jitR.normal(0, DROPOUT_JITTER))
    students.push({
      student_id: `S${String(i + 1).padStart(4, '0')}`,
      department: DEPARTMENTS[catR.int(0, DEPARTMENTS.length - 1)],
      year: catR.int(1, 4),
      study_hours,
      attendance: att,
      sleep_hours,
      library_visits,
      scholarship: schol ? 'Yes' : 'No',
      cgpa,
      dropped_out: 0,
    })
  }
  // Rank-based dropout: quota cells are 5-point attendance bins (nested in the <60 / 60-75 / >=75 bands).
  const cells = new Map<number, number[]>()
  students.forEach((s, i) => {
    const c = Math.min(12, Math.floor((s.attendance - DROPOUT_QUOTA_START) / DROPOUT_QUOTA_WIDTH))
    const list = cells.get(c) ?? []
    list.push(i)
    cells.set(c, list)
  })
  // Band quota = round(sum p) over the band; it is apportioned to the band's 5-point cells by size
  // (largest remainder), so every cell in a band has nearly the same rate; inside a cell the highest p + jitter drop out.
  const bandOf = (c: number): number => (c < 5 ? 0 : c < 8 ? 1 : 2)
  const keys = [...cells.keys()].sort((x, y) => x - y)
  for (let b = 0; b < 3; b += 1) {
    const bandCells = keys.filter((c) => bandOf(c) === b)
    const members = bandCells.flatMap((c) => cells.get(c) ?? [])
    if (members.length === 0) continue
    const total = Math.round(members.reduce((acc, i) => acc + prob[i], 0))
    const exact = bandCells.map((c) => ((cells.get(c) ?? []).length * total) / members.length)
    const quota = exact.map(Math.floor)
    let left = total - quota.reduce((x, y) => x + y, 0)
    const order = exact.map((e, j) => ({ j, r: e - Math.floor(e) })).sort((x, y) => y.r - x.r || x.j - y.j)
    for (const { j } of order) {
      if (left <= 0) break
      quota[j] += 1
      left -= 1
    }
    bandCells.forEach((c, j) => {
      const ordered = [...(cells.get(c) ?? [])].sort((x, y) => score[y] - score[x] || x - y)
      for (const i of ordered.slice(0, quota[j])) students[i].dropped_out = 1
    })
  }
  return students
}

/** Convert cohort records to the engine DF shape. */
export function toDF(rows: readonly CohortStudent[]): CohortDF {
  return { columns: [...COHORT_COLUMNS], rows: rows.map((s, idx) => ({ idx, v: { ...s } })) }
}

type FallRow = Pick<CohortStudent, 'attendance' | 'dropped_out'>

/**
 * Bins of width 5 starting at 35 ([35,40) ... [95,100], last inclusive); bins with fewer than 8 students ignored.
 * Returns the shared edge between adjacent kept bins where rate(left) - rate(right) is largest (NaN if none).
 */
export function steepestFall(rows: readonly FallRow[]): number {
  const bins: { lo: number; d: number; n: number }[] = []
  for (let lo = 35; lo < 100; lo += 5) bins.push({ lo, d: 0, n: 0 })
  for (const r of rows) {
    const i = Math.min(bins.length - 1, Math.floor((r.attendance - 35) / 5))
    if (i < 0) continue
    bins[i].n += 1
    bins[i].d += r.dropped_out
  }
  let best = NaN
  let bestFall = -Infinity
  for (let i = 0; i + 1 < bins.length; i += 1) {
    const a = bins[i]
    const b = bins[i + 1]
    if (a.n < 8 || b.n < 8) continue
    const fall = a.d / a.n - b.d / b.n
    if (fall > bestFall) {
      bestFall = fall
      best = b.lo
    }
  }
  return best
}

export interface Invariant {
  name: string
  ok: boolean
  value: number
}

const col = <K extends keyof CohortStudent>(rows: readonly CohortStudent[], k: K): CohortStudent[K][] =>
  rows.map((r) => r[k])

/** Every guarantee of kit Phase 10 A2. The n=2000-only checks are included when rows.length >= 2000. */
export function cohortInvariants(rows: readonly CohortStudent[], permSeed = 0): Invariant[] {
  const n = rows.length
  const out: Invariant[] = []
  const add = (name: string, value: number, ok: boolean): void => {
    out.push({ name, value, ok: ok && Number.isFinite(value) })
  }
  const att = col(rows, 'attendance')
  const cg = col(rows, 'cgpa')
  const sh = col(rows, 'study_hours')
  const drop = col(rows, 'dropped_out')
  const below = rows.filter((r) => r.attendance < 60)
  const above = rows.filter((r) => r.attendance > 75)
  add('below60Count', below.length, below.length === Math.floor(0.18 * n) || below.length === Math.ceil(0.18 * n))
  const rAtt = corr(att, cg)
  add('corrAttendanceCgpa', rAtt, rAtt >= 0.4 && rAtt <= 0.8)
  const rSh = corr(sh, cg)
  add('corrStudyCgpa', rSh, rSh >= 0.4 && rSh <= 0.8)
  const rSl = corr(col(rows, 'sleep_hours'), cg)
  add('corrSleepCgpa', rSl, rSl >= 0.05 && rSl <= 0.35)
  const rLib = corr(col(rows, 'library_visits'), cg)
  add('corrLibraryCgpa', rLib, rLib >= 0.2 && rLib <= 0.6)
  const rAS = Math.abs(corr(att, sh))
  add('absCorrAttendanceStudy', rAS, rAS < 0.15)
  const rSL = corr(sh, col(rows, 'library_visits'))
  add('corrStudyLibrary', rSL, rSL > 0.5)
  const overall = rate(drop)
  const rBelow = rate(col(below, 'dropped_out'))
  const rAbove = rate(col(above, 'dropped_out'))
  add('dropBelow60VsAbove75', rBelow / rAbove, rBelow >= 2 * rAbove)
  add('liftBelow60', rBelow / overall, rBelow >= 2 * overall)
  add('coverageBelow60', below.length / n, below.length / n >= 0.15)
  const fall = steepestFall(rows)
  add('steepestFall', fall, fall >= 55 && fall <= 65)
  const skew = mean(sh) - median(sh)
  add('studyMeanMinusMedian', skew, skew >= 0.5)
  const inRange = rows.every(
    (r) =>
      r.student_id.length > 0 &&
      DEPARTMENTS.includes(r.department as (typeof DEPARTMENTS)[number]) &&
      Number.isInteger(r.year) && r.year >= 1 && r.year <= 4 &&
      r.study_hours >= 0 && r.study_hours <= 40 &&
      r.attendance >= 35 && r.attendance <= 100 &&
      r.sleep_hours >= 4 && r.sleep_hours <= 9 &&
      Number.isInteger(r.library_visits) && r.library_visits >= 0 &&
      (r.scholarship === 'Yes' || r.scholarship === 'No') &&
      r.cgpa >= 3 && r.cgpa <= 9.8 &&
      (r.dropped_out === 0 || r.dropped_out === 1) &&
      Object.values(r).every((v) => v !== null && v !== undefined && !(typeof v === 'number' && !Number.isFinite(v))),
  )
  add('rangesAndNoNulls', inRange ? 1 : 0, inRange && n > 0)
  if (n >= 2000) {
    const conv = rows.filter((r) => r.attendance > 80)
    const bias = mean(col(conv, 'cgpa')) - mean(cg)
    add('convenienceBias', bias, bias >= 0.4)
    add('convenienceSubsetSize', conv.length, conv.length >= 500)
    const ps = popStd(cg)
    add('popStdCgpa', ps, ps >= 0.6 && ps <= 1.5)
    const yes = rows.filter((r) => r.scholarship === 'Yes')
    const no = rows.filter((r) => r.scholarship === 'No')
    const share = yes.length / n
    add('scholarshipShare', share, share >= 0.2 && share <= 0.3)
    const a = col(no, 'dropped_out')
    const b = col(yes, 'dropped_out')
    const gap = rate(a) - rate(b)
    add('scholarshipDropGap', gap, gap >= 0.02)
    const p = permutationPValue(a, b, 1000, permSeed)
    add('scholarshipPermP', p, p <= 0.005)
  }
  return out
}

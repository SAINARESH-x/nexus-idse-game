// Seeded Level 04 student dataset generator: clean truth, dirty copy, injected issue list and ghost rows.
import { CANONICAL_DEPARTMENTS, PLACEHOLDERS, TIER_ORDER } from './config'
import { ASSISTED_VARIANTS, DEPT_VARIANTS, FIRST_NAMES, GHOST_COUNT, LAST_NAMES, RECIPES } from './generatorData'
import { mixSeed, mulberry32, type Rng } from './rng'
import type { Cell, DF, Issue, IssueKind, Tier } from './types'

export const STUDENT_COLUMNS = ['student_id', 'name', 'department', 'year', 'age', 'cgpa', 'attendance', 'scholarship', 'dropped_out']

export interface GeneratorMeta {
  seed: number
  tier: Tier
  rows: number
  legit: number
  ghostCount: number
  duplicateCount: number
  issueCounts: Record<IssueKind, number>
}

export interface GeneratedDataset {
  clean: DF
  dirty: DF
  issues: Issue[]
  /** Row idx values of the fabricated ghost enrolments (not issues). */
  ghosts: number[]
  meta: GeneratorMeta
}

export function tierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier)
}

/** Level 04 clearance seed: 1000 + attempt*17 + tierIndex. */
export function clearanceSeed(attempt: number, tier: Tier): number {
  return 1000 + attempt * 17 + tierIndex(tier)
}

interface Student {
  student_id: number
  name: string
  department: string
  year: number
  age: number
  cgpa: number
  attendance: number
  scholarship: string
  dropped_out: number
  ghost: boolean
}

interface Slot {
  s: Student
  copyOf?: Student
  near?: string
  idx: number
  dirty: Record<string, Cell>
}

const round1 = (x: number): number => Math.round(x * 10) / 10
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))

function pickDept(rng: Rng): string {
  const r = rng.next()
  return r < 0.35 ? 'Computer Science' : r < 0.6 ? 'Mechanical' : r < 0.8 ? 'Electrical' : 'Civil'
}

function makeStudent(rng: Rng, name: string, ghost: boolean): Student {
  const year = rng.int(1, 4)
  const age = clamp(16 + year + rng.int(0, 2), 17, 25)
  const department = pickDept(rng)
  if (ghost) {
    return { student_id: 0, name, department, year, age, cgpa: 10, attendance: 100, scholarship: 'Yes', dropped_out: 0, ghost }
  }
  const cgpa = round1(clamp(rng.normal(7, 1.1), 4, 9.8))
  const attendance = Math.round(clamp(rng.normal(77, 14), 35, 99))
  const z = -1.6 - 0.09 * (attendance - 75) - 0.8 * (cgpa - 7)
  const dropped_out = rng.chance(1 / (1 + Math.exp(-z))) ? 1 : 0
  const scholarship = rng.chance(cgpa >= 8.3 ? 0.7 : 0.1) ? 'Yes' : 'No'
  return { student_id: 0, name, department, year, age, cgpa, attendance, scholarship, dropped_out, ghost }
}

function uniqueNames(rng: Rng, n: number): string[] {
  const all: string[] = []
  for (const f of FIRST_NAMES) for (const l of LAST_NAMES) all.push(`${f} ${l}`)
  return rng.shuffle(all).slice(0, n)
}

/** Generate the Level 04 dataset. Same seed and tier always give identical output. */
export function generateStudents({ seed, tier }: { seed: number; tier: Tier }): GeneratedDataset {
  const rec = RECIPES[tier]
  const rng = mulberry32(mixSeed(seed, tierIndex(tier), 404))
  const names = uniqueNames(rng, rec.legit + GHOST_COUNT)
  const base: Student[] = names.map((n, i) => makeStudent(rng, n, i >= rec.legit))
  rng.shuffle(base.map((_, i) => i)).forEach((pos, i) => {
    base[pos].student_id = 1001 + i
  })

  const legit = base.filter((s) => !s.ghost)
  const dupOriginals = rng.shuffle(legit).slice(0, rec.exactDup + rec.nearDup)
  const slots: Slot[] = base.map((s) => ({ s, idx: 0, dirty: {} }))
  dupOriginals.forEach((s, i) => {
    const near = i >= rec.exactDup ? rng.pick(DEPT_VARIANTS[s.department]) : undefined
    slots.push({ s, copyOf: s, near, idx: 0, dirty: {} })
  })
  const order = rng.shuffle(slots)
  order.forEach((slot, i) => {
    slot.idx = i
  })

  const dupSet = new Set(dupOriginals)
  const eligible = order.filter((sl) => !sl.copyOf && !sl.s.ghost && !dupSet.has(sl.s))
  const usedRows = new Set<Slot>()
  const usedCells = new Set<string>()
  const exclusive = tier === 'assisted'
  const take = (col: string, pool: Slot[], pred: (sl: Slot) => boolean = () => true): Slot | undefined => {
    const free = pool.filter((sl) => pred(sl) && !usedCells.has(`${sl.idx}|${col}`) && !(exclusive && usedRows.has(sl)))
    if (!free.length) return undefined
    const sl = rng.pick(free)
    usedCells.add(`${sl.idx}|${col}`)
    usedRows.add(sl)
    return sl
  }

  const issues: Issue[] = []
  const add = (kind: IssueKind, rowIdx: number, column: string | undefined, truth: Cell | undefined, note: string): void => {
    issues.push({ id: `${kind}-${issues.length + 1}`, kind, rowIdx, column, truth, note })
  }

  // Department variants (assisted: the six listed labels on rows whose true department matches).
  const variantPlan: Array<[string, string]> = exclusive
    ? ASSISTED_VARIANTS
    : Array.from({ length: rec.deptVariants }, () => {
        const d = rng.pick(CANONICAL_DEPARTMENTS)
        return [d, rng.pick(DEPT_VARIANTS[d])] as [string, string]
      })
  for (const [truth, variant] of variantPlan) {
    let sl = take('department', eligible, (x) => x.s.department === truth)
    if (!sl) {
      sl = take('department', eligible)
      if (!sl) continue
      sl.s.department = truth
    }
    sl.dirty.department = variant
    add('inconsistent', sl.idx, 'department', truth, `'${variant}' should be '${truth}'`)
  }

  // Attendance blanks (expert: most belong to dropouts).
  const dropoutBlanks = Math.round(rec.attendanceNull * rec.attendanceNullDropoutShare)
  for (let i = 0; i < rec.attendanceNull; i += 1) {
    const sl = take('attendance', eligible, (x) => (i < dropoutBlanks ? x.s.dropped_out === 1 : rec.attendanceNullDropoutShare === 0 || x.s.dropped_out === 0)) ?? take('attendance', eligible)
    if (!sl) continue
    sl.dirty.attendance = null
    add('missing', sl.idx, 'attendance', sl.s.attendance, 'attendance is blank')
  }
  for (let i = 0; i < rec.attendanceHigh + rec.attendanceNegative; i += 1) {
    const sl = take('attendance', eligible)
    if (!sl) continue
    const v = i < rec.attendanceHigh ? rng.int(101, 130) : -rng.int(1, 15)
    sl.dirty.attendance = v
    add('invalid', sl.idx, 'attendance', sl.s.attendance, `attendance ${v} is outside 0 to 100`)
  }

  // cgpa blanks, placeholders and scale slips.
  for (let i = 0; i < rec.cgpaNull; i += 1) {
    const sl = take('cgpa', eligible)
    if (!sl) continue
    sl.dirty.cgpa = null
    add('missing', sl.idx, 'cgpa', sl.s.cgpa, 'cgpa is blank')
  }
  for (let i = 0; i < rec.cgpaPlaceholder; i += 1) {
    const sl = take('cgpa', eligible)
    if (!sl) continue
    const ph = rng.pick(PLACEHOLDERS)
    sl.dirty.cgpa = ph
    add('missing', sl.idx, 'cgpa', sl.s.cgpa, `cgpa holds the placeholder '${ph}'`)
  }
  for (let i = 0; i < rec.invalidCgpa; i += 1) {
    const sl = take('cgpa', eligible)
    if (!sl) continue
    const v = Math.round(sl.s.cgpa * 10)
    sl.dirty.cgpa = v
    add('invalid', sl.idx, 'cgpa', sl.s.cgpa, `cgpa ${v} looks like a 100-point value (true ${sl.s.cgpa})`)
  }

  // Impossible ages.
  const agePool = tier === 'assisted' ? [199, -4] : tier === 'independent' ? [199, -4, 0, 150] : [2003, 2004, 2002, 199, -3, 0]
  for (let i = 0; i < rec.invalidAge; i += 1) {
    const sl = take('age', eligible)
    if (!sl) continue
    const v = agePool[i % agePool.length]
    sl.dirty.age = v
    add('invalid', sl.idx, 'age', sl.s.age, v > 1900 ? `age ${v} is a birth year` : `age ${v} is impossible`)
  }

  // Duplicates.
  for (const sl of order) {
    if (!sl.copyOf) continue
    if (sl.near) sl.dirty.department = sl.near
    const orig = order.find((o) => o.s === sl.s && !o.copyOf)
    add('duplicate', sl.idx, 'student_id', sl.s.student_id, `row ${sl.idx} repeats row ${orig?.idx ?? '?'}${sl.near ? ` (department written '${sl.near}')` : ''}`)
  }

  // Column-level type issues.
  add('type', -1, 'attendance', undefined, "attendance is stored as text like '85%'")
  if (rec.cgpaAsText) add('type', -1, 'cgpa', undefined, 'cgpa is stored as text')

  const truthRow = (s: Student): Record<string, Cell> => ({
    student_id: s.student_id,
    name: s.name,
    department: s.department,
    year: s.year,
    age: s.age,
    cgpa: s.cgpa,
    attendance: s.attendance,
    scholarship: s.scholarship,
    dropped_out: s.dropped_out,
  })
  const dirtyRows = order.map((sl) => {
    const v = { ...truthRow(sl.s), ...sl.dirty }
    const a = v.attendance
    if (typeof a === 'number') v.attendance = `${a}%`
    if (rec.cgpaAsText && typeof v.cgpa === 'number') v.cgpa = v.cgpa.toFixed(1)
    return { idx: sl.idx, v }
  })
  const dirty: DF = { columns: [...STUDENT_COLUMNS], rows: dirtyRows }
  if (!rec.cgpaAsText) dirty.floatCols = ['cgpa']
  const clean: DF = {
    columns: [...STUDENT_COLUMNS],
    rows: order.filter((sl) => !sl.copyOf).map((sl) => ({ idx: sl.idx, v: truthRow(sl.s) })),
    floatCols: ['attendance', 'cgpa'],
  }
  const ghosts = order.filter((sl) => sl.s.ghost).map((sl) => sl.idx).sort((a, b) => a - b)
  const issueCounts: Record<IssueKind, number> = { missing: 0, duplicate: 0, inconsistent: 0, type: 0, invalid: 0 }
  for (const i of issues) issueCounts[i.kind] += 1
  return {
    clean,
    dirty,
    issues,
    ghosts,
    meta: { seed, tier, rows: dirty.rows.length, legit: rec.legit, ghostCount: ghosts.length, duplicateCount: rec.exactDup + rec.nearDup, issueCounts },
  }
}

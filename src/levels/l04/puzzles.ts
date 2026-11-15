// Field Puzzles (pure): case stories built from the live frame, candidate repairs and their judged decisions.
import { columnDtype, engineConfig, isNumericDtype, liveHealth, median, numbers, titleCase, unique } from '../../engine'
import type { Cell, DF, Decision, Op } from '../../engine'

export interface PuzzleCandidate {
  id: string
  label: string
  ops: Op[]
  decision: Decision
}

export interface Puzzle {
  id: 'impossible-age' | 'which-cs' | 'scale-slip'
  title: string
  story: string
  evidence: string[]
  /** True when this kind of problem no longer exists: 'Already resolved in the field'. */
  resolved: boolean
  candidates: PuzzleCandidate[]
}

const AGE = engineConfig.VALID_RANGES.age
const CGPA = engineConfig.VALID_RANGES.cgpa
const CANON = engineConfig.CANONICAL_DEPARTMENTS as readonly string[]

function numericCol(df: DF, c: string): boolean {
  return df.columns.includes(c) && isNumericDtype(columnDtype(df, c))
}

export function impossibleAgePuzzle(df: DF): Puzzle {
  const bad = numericCol(df, 'age') ? df.rows.find((r) => typeof r.v.age === 'number' && (r.v.age < AGE.min || r.v.age > AGE.max)) : undefined
  const ages = numericCol(df, 'age') ? numbers(df, 'age').filter((a) => a >= AGE.min && a <= AGE.max) : []
  const med = ages.length ? median(ages) : 20
  const base: Omit<Puzzle, 'candidates' | 'evidence' | 'story'> = { id: 'impossible-age', title: 'The impossible age', resolved: !bad }
  if (!bad) return { ...base, story: 'Every age is inside the valid range.', evidence: [], candidates: [] }
  const age = bad.v.age as number
  const name = String(bad.v.name ?? 'a student')
  return {
    ...base,
    story: `Row ${bad.idx} (${name}) claims an age of ${age}. Students here are ${AGE.min} to ${AGE.max}.`,
    evidence: [
      `Valid ages run ${AGE.min} to ${AGE.max}; ${ages.length} valid ages have median ${med}.`,
      `The rest of row ${bad.idx} looks real: cgpa ${String(bad.v.cgpa)}, attendance ${String(bad.v.attendance)}.`,
    ],
    candidates: [
      {
        id: 'mask-median',
        label: 'Mask invalid ages to NaN, then fill with the median',
        ops: [{ type: 'mask_invalid', column: 'age', min: AGE.min, max: AGE.max }, { type: 'fillna', column: 'age', strategy: 'median' }],
        decision: { label: 'Masked then median-filled the age', good: true, explanation: `The impossible ${age} becomes NaN and then the median ${med}; the student and every other field are kept.` },
      },
      {
        id: 'drop-row',
        label: `Drop row ${bad.idx}`,
        ops: [{ type: 'drop_rows', idxs: [bad.idx] }],
        decision: { label: 'Dropped a real student', good: false, explanation: `Only the age is wrong. Dropping row ${bad.idx} throws away a real student and their attendance, cgpa and dropout record.` },
      },
      {
        id: 'guess',
        label: 'Overwrite it with a plausible guess (20)',
        ops: [{ type: 'set_cell', idx: bad.idx, column: 'age', value: 20 }],
        decision: { label: 'Invented an age', good: false, explanation: 'A guessed number looks real but is invented data. A documented estimate (the median of the column) is honest; a guess is not.' },
      },
      {
        id: 'leave',
        label: 'Leave it',
        ops: [],
        decision: { label: 'Left an impossible age', good: false, explanation: `An age of ${age} stays in the data and drags the mean age by itself.` },
      },
    ],
  }
}

/** Canonical department for a stripped, title-cased label, or null when unknown. */
export function canonicalDept(label: string): string | null {
  const l = label.trim().toLowerCase()
  if (l === 'cs' || l.startsWith('comp')) return 'Computer Science'
  if (l.startsWith('mech')) return 'Mechanical'
  if (l.startsWith('elec')) return 'Electrical'
  if (l.startsWith('civ')) return 'Civil'
  return null
}

/** replace() mapping for every non-canonical label after strip + title. */
export function departmentMapping(df: DF): Record<string, Cell> {
  const map: Record<string, Cell> = {}
  for (const v of unique(df, 'department')) {
    if (typeof v !== 'string') continue
    const t = titleCase(v.trim())
    const c = canonicalDept(t)
    if (c && t !== c && !CANON.includes(t)) map[t] = c
  }
  return map
}

export function whichCsPuzzle(df: DF): Puzzle {
  const h = df.columns.includes('department') ? liveHealth(df) : null
  const variants = h ? h.unknownLabelValues : []
  const base = { id: 'which-cs' as const, title: 'Which CS is which' }
  if (!h || variants.length === 0 || columnDtype(df, 'department') !== 'object') {
    return { ...base, resolved: true, story: 'Every department label is already canonical.', evidence: [], candidates: [] }
  }
  const labels = unique(df, 'department').filter((v) => typeof v === 'string').length
  const strip: Op = { type: 'str_op', column: 'department', fn: 'strip' }
  const title: Op = { type: 'str_op', column: 'department', fn: 'title' }
  const mapping = departmentMapping(df)
  return {
    ...base,
    resolved: false,
    story: `The department column holds ${labels} distinct labels for ${CANON.length} real departments.`,
    evidence: [`Unknown labels: ${variants.map((v) => `'${v}'`).join(', ')}.`, `Canonical set: ${CANON.join(', ')}.`],
    candidates: [
      { id: 'strip', label: 'str.strip() only', ops: [strip], decision: { label: 'Stripped department', good: null, explanation: 'Removes stray spaces, but case differences and abbreviations like CS remain separate labels.' } },
      { id: 'strip-title', label: 'str.strip().str.title()', ops: [strip, title], decision: { label: 'Stripped and title-cased department', good: null, explanation: 'Fixes spacing and case, but abbreviations (Cs, Comp Sci, Mech) still differ from the canonical names.' } },
      {
        id: 'full',
        label: 'strip + title + replace map',
        ops: [strip, title, ...(Object.keys(mapping).length ? [{ type: 'replace_map', column: 'department', mapping } as Op] : [])],
        decision: { label: 'Mapped departments to the canonical set', good: true, explanation: `Spacing, case and ${Object.keys(mapping).length} abbreviation(s) are fixed, so only the canonical departments remain.` },
      },
    ],
  }
}

export function scaleSlipPuzzle(df: DF): Puzzle {
  const base = { id: 'scale-slip' as const, title: 'The scale slip' }
  const slip = numericCol(df, 'cgpa') ? df.rows.find((r) => typeof r.v.cgpa === 'number' && r.v.cgpa > CGPA.max && r.v.cgpa <= 100) : undefined
  if (!slip) return { ...base, resolved: true, story: 'No cgpa value sits on a 100-point scale.', evidence: [], candidates: [] }
  const value = slip.v.cgpa as number
  const others = numbers(df, 'cgpa').filter((x) => x !== value)
  const below = others.filter((x) => x <= CGPA.max).length
  const scaled = Math.round(value) / 10
  const scaleSafe = below === others.length && scaled >= CGPA.min && scaled <= CGPA.max
  return {
    ...base,
    resolved: false,
    story: `Row ${slip.idx} has a cgpa of ${value} on a 0 to 10 scale.`,
    evidence: [`${below} of ${others.length} other cgpa values are at most ${CGPA.max}.`, `${value} / 10 = ${scaled}, ${scaled <= CGPA.max ? 'inside' : 'outside'} the valid range.`],
    candidates: [
      {
        id: 'divide',
        label: `Divide by 10 (set ${scaled})`,
        ops: [{ type: 'set_cell', idx: slip.idx, column: 'cgpa', value: scaled }],
        decision: scaleSafe
          ? { label: 'Rescaled a 100-point cgpa', good: true, explanation: `Every other cgpa is on the 10-point scale, so ${value} is almost certainly ${scaled} typed on a 100-point scale.` }
          : { label: 'Rescaled without evidence', good: false, explanation: 'Other values are also off-scale, so dividing by 10 is a guess, not a correction.' },
      },
      {
        id: 'mask-median',
        label: 'Mask invalid cgpa, then fill with the median',
        ops: [{ type: 'mask_invalid', column: 'cgpa', min: CGPA.min, max: CGPA.max }, { type: 'fillna', column: 'cgpa', strategy: 'median' }],
        decision: { label: 'Masked then median-filled cgpa', good: null, explanation: 'Acceptable and safe: the row is kept, but the student loses their real grade, which the rescale would have recovered.' },
      },
      {
        id: 'drop-row',
        label: `Drop row ${slip.idx}`,
        ops: [{ type: 'drop_rows', idxs: [slip.idx] }],
        decision: { label: 'Dropped a real student', good: false, explanation: 'One mis-scaled grade does not make the student fake; dropping loses the whole record.' },
      },
    ],
  }
}

export function buildPuzzles(df: DF): Puzzle[] {
  return [impossibleAgePuzzle(df), whichCsPuzzle(df), scaleSlipPuzzle(df)]
}

/** The judged decision for one candidate (an unknown id is treated as a bad pick). */
export function judgePuzzleChoice(puzzle: Puzzle, choiceId: string): Decision {
  const c = puzzle.candidates.find((x) => x.id === choiceId)
  return c ? c.decision : { label: 'Unknown choice', good: false, explanation: 'That candidate does not exist for this puzzle.' }
}

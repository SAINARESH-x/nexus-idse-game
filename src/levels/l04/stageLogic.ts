// Stage objectives and health meters (pure): what each Level 04 stage checks before PROCEED appears.
import { liveHealth } from '../../engine'
import type { DF, LiveHealth } from '../../engine'
import type { L04Record } from './missionRecord'

export interface Objective {
  id: string
  label: string
  done: boolean
}

export interface Meter {
  id: 'missing' | 'duplicates' | 'inconsistent' | 'types' | 'invalid'
  label: string
  now: number
  original: number
  /** Column the meter jumps to in the spreadsheet. */
  column: string
}

export const SKIP_AFTER_OPS = 10
export const METERS_REQUIRED = 3

function firstKey(o: Record<string, number>, fallback: string): string {
  return Object.entries(o).find(([, v]) => v > 0)?.[0] ?? fallback
}

function counts(h: LiveHealth) {
  return {
    missing: h.totalNulls + h.totalPlaceholders,
    duplicates: h.normalizedDuplicates,
    inconsistent: h.totalUnknownLabels,
    types: h.dtypeMismatches.length,
    invalid: h.totalOutOfRange,
  }
}

export function meters(original: DF, current: DF): Meter[] {
  const h0 = liveHealth(original)
  const h1 = liveHealth(current)
  const a = counts(h0)
  const b = counts(h1)
  const nullCol = firstKey(Object.fromEntries(Object.keys(h1.nulls).map((k) => [k, (h1.nulls[k] ?? 0) + (h1.placeholders[k] ?? 0)])), 'attendance')
  return [
    { id: 'missing', label: 'Missing', now: b.missing, original: a.missing, column: nullCol },
    { id: 'duplicates', label: 'Duplicates', now: b.duplicates, original: a.duplicates, column: 'student_id' },
    { id: 'inconsistent', label: 'Inconsistent', now: b.inconsistent, original: a.inconsistent, column: 'department' },
    { id: 'types', label: 'Types', now: b.types, original: a.types, column: h1.dtypeMismatches[0]?.column ?? h0.dtypeMismatches[0]?.column ?? 'attendance' },
    { id: 'invalid', label: 'Invalid', now: b.invalid, original: a.invalid, column: firstKey(h1.outOfRange, 'age') },
  ]
}

export function stage1Objectives(r: L04Record): Objective[] {
  return [
    { id: 'shape', label: 'Open Shape in Dataset Info (df.shape)', done: r.stage1.shape },
    { id: 'dtypes', label: 'Open Dtypes in Dataset Info (df.dtypes)', done: r.stage1.dtypes },
    { id: 'flags', label: `Flag 3 suspicious cells or rows with the FLAG tool (${Math.min(3, r.stage1.marks.length)}/3)`, done: r.stage1.marks.length >= 3 },
  ]
}

export function stage2Objectives(r: L04Record): Objective[] {
  return [
    { id: 'flag', label: 'Flag problems with the matching brush', done: r.flags.filter((f) => f.kind !== 'anomaly').length > 0 },
    { id: 'submit', label: 'SUBMIT REPORT: F1 of at least 60%, or a second submission', done: r.stage2.passed },
  ]
}

export function stage3Objectives(r: L04Record, m: Meter[]): Objective[] {
  const zero = m.filter((x) => x.now === 0).length
  return [
    { id: 'builder', label: 'Make one repair with the Builder', done: r.stage3.builderRepair },
    { id: 'blank', label: "Complete one 'Fill the blank' command", done: r.stage3.fillBlank },
    { id: 'meters', label: `Bring at least ${METERS_REQUIRED} of 5 meters to 0 (${zero}/5)`, done: zero >= METERS_REQUIRED },
  ]
}

export function stage4Objectives(r: L04Record): Objective[] {
  return [
    { id: 'checks', label: 'Run the five integrity checks', done: r.stage4.checksRun },
    { id: 'submit', label: 'SUBMIT FOR AUDIT', done: false },
  ]
}

export function objectivesFor(r: L04Record, m: Meter[]): Objective[] {
  return [stage1Objectives, stage2Objectives, (x: L04Record) => stage3Objectives(x, m), stage4Objectives][r.stage](r)
}

export function canProceed(r: L04Record, m: Meter[]): boolean {
  if (r.stage === 3) return false
  return objectivesFor(r, m).every((o) => o.done)
}

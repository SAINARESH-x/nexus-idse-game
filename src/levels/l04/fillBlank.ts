// Fill-the-blank command drills (pure): templates with gaps, a chip tray, and an explanation for every wrong chip.
import { applyAll, parse } from '../../engine'
import type { DF } from '../../engine'

export interface BlankChip {
  id: string
  text: string
  /** Why this chip is wrong for each gap it does not fit (gap index -> reason). */
  wrong?: Record<number, string>
}

export interface BlankTemplate {
  id: string
  title: string
  /** Text segments around the gaps: parts.length === answers.length + 1. */
  parts: string[]
  answers: string[]
  chips: BlankChip[]
}

export const BLANK_TEMPLATES: BlankTemplate[] = [
  {
    id: 'attendance-median',
    title: 'Fill attendance blanks with the median',
    parts: ["df['attendance'] = df['attendance'].", "(df['attendance'].", '())'],
    answers: ['fillna', 'median'],
    chips: [
      { id: 'fillna', text: 'fillna', wrong: { 1: 'fillna is the method that fills; inside it you need the statistic that produces the fill value.' } },
      { id: 'median', text: 'median', wrong: { 0: 'median() computes one number; it cannot fill blanks by itself. Use it as the argument of fillna.' } },
      { id: 'dropna', text: 'dropna', wrong: { 0: 'dropna deletes rows with blanks instead of filling them, and on a single column it would not even update the frame.' } },
      { id: 'mean', text: 'mean', wrong: { 1: 'The mean works, but it is pulled by extreme values. This drill asks for the robust choice.', 0: 'mean() computes one number; it cannot fill blanks by itself.' } },
      { id: 'sum', text: 'sum', wrong: { 1: 'The sum of all attendance values is not a plausible attendance for one student.', 0: 'sum() is an aggregate, not a fill method.' } },
    ],
  },
  {
    id: 'department-clean',
    title: 'Trim and title-case the department labels',
    parts: ["df['department'] = df['department'].str.", '().str.', '()'],
    answers: ['strip', 'title'],
    chips: [
      { id: 'strip', text: 'strip', wrong: { 1: 'strip removes spaces; it does not fix the letter case.' } },
      { id: 'title', text: 'title', wrong: { 0: 'Title-case first leaves the surrounding spaces in place; strip them first.' } },
      { id: 'upper', text: 'upper', wrong: { 0: 'upper does not remove spaces.', 1: "upper gives 'COMPUTER SCIENCE', which is not the canonical label." } },
      { id: 'lower', text: 'lower', wrong: { 0: 'lower does not remove spaces.', 1: "lower gives 'computer science', which is not the canonical label." } },
      { id: 'split', text: 'split', wrong: { 0: 'split breaks text into lists; this console does not support it and it would not clean the labels.', 1: 'split breaks text into lists instead of cleaning it.' } },
    ],
  },
  {
    id: 'dedupe',
    title: 'Remove exact duplicate rows',
    parts: ['df = df.', '()'],
    answers: ['drop_duplicates'],
    chips: [
      { id: 'drop_duplicates', text: 'drop_duplicates' },
      { id: 'dropna', text: 'dropna', wrong: { 0: 'dropna removes rows with blanks, not repeated rows.' } },
      { id: 'duplicated', text: 'duplicated', wrong: { 0: 'duplicated() only marks copies with True/False; assigning it to df would replace the table with a mask.' } },
      { id: 'sort_values', text: 'sort_values', wrong: { 0: 'Sorting changes the order, not the content; copies remain.' } },
    ],
  },
]

export interface ChipCheck {
  correct: boolean
  explanation: string
}

export function checkChip(t: BlankTemplate, gap: number, chipId: string): ChipCheck {
  if (t.answers[gap] === chipId) return { correct: true, explanation: 'Correct.' }
  const chip = t.chips.find((c) => c.id === chipId)
  return { correct: false, explanation: chip?.wrong?.[gap] ?? `${chip?.text ?? chipId} does not fit here.` }
}

export function assemble(t: BlankTemplate, filled: Array<string | null>): string {
  return t.parts.map((p, i) => p + (i < t.answers.length ? (filled[i] ?? '____') : '')).join('')
}

export const isComplete = (t: BlankTemplate, filled: Array<string | null>): boolean => t.answers.every((a, i) => filled[i] === a)

/** Whether the finished command would run on the current frame (else the engine error). */
export function dryRun(df: DF, t: BlankTemplate): { ok: boolean; error?: string } {
  const p = parse(assemble(t, t.answers))
  if (p.kind !== 'ops') return { ok: false, error: p.kind === 'error' ? p.message : 'Not an operation.' }
  const r = applyAll(df, p.ops)
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

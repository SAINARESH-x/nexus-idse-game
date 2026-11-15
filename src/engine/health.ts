// liveHealth: schema-based validation with no ground truth, plus a cell-level problem map for highlights.
import { CANONICAL_DEPARTMENTS, NUMERIC_COLUMNS, PLACEHOLDERS, VALID_RANGES } from './config'
import { columnDtype, duplicateMask, isNull, isNumericDtype } from './dataframe'
import type { Cell, DF, Dtype, Row } from './types'

export type CellProblem = 'missing' | 'placeholder' | 'duplicate' | 'out_of_range' | 'wrong_type' | 'unknown_label'

export interface LiveHealth {
  rows: number
  nulls: Record<string, number>
  placeholders: Record<string, number>
  totalNulls: number
  totalPlaceholders: number
  /** Exact duplicate rows (keep first). */
  duplicates: number
  /** Duplicates after normalising text case and whitespace (includes exact ones). */
  normalizedDuplicates: number
  dtypeMismatches: Array<{ column: string; dtype: Dtype; expected: 'numeric' }>
  outOfRange: Record<string, number>
  totalOutOfRange: number
  unknownLabels: Record<string, number>
  unknownLabelValues: string[]
  totalUnknownLabels: number
  /** Sum of every problem count above (0 means the frame looks clean). */
  total: number
  /** Key `${idx}|${column}` -> problems for that cell. */
  cells: Record<string, CellProblem[]>
  /** Row idx -> 'duplicate' when the row repeats an earlier row (exact or normalised). */
  rowProblems: Record<number, CellProblem[]>
}

export const cellKey = (idx: number, column: string): string => `${idx}|${column}`

const isPlaceholder = (c: Cell): boolean => typeof c === 'string' && (PLACEHOLDERS as readonly string[]).includes(c.trim())

function normRow(row: Row, cols: string[]): Row {
  const v: Record<string, Cell> = {}
  for (const c of cols) {
    const x = row.v[c] ?? null
    v[c] = typeof x === 'string' ? x.trim().replace(/\s+/g, ' ').toLowerCase() : x
  }
  return { idx: row.idx, v }
}

/** Every problem kind at one cell, including row-level duplicate flags. */
export function problemsAt(h: LiveHealth, idx: number, column: string): CellProblem[] {
  return [...(h.cells[cellKey(idx, column)] ?? []), ...(h.rowProblems[idx] ?? [])]
}

export function liveHealth(df: DF): LiveHealth {
  const cells: Record<string, CellProblem[]> = {}
  const mark = (idx: number, col: string, p: CellProblem): void => {
    const k = cellKey(idx, col)
    ;(cells[k] ??= []).push(p)
  }
  const nulls: Record<string, number> = {}
  const placeholders: Record<string, number> = {}
  const outOfRange: Record<string, number> = {}
  const unknownLabels: Record<string, number> = {}
  const unknownValues = new Set<string>()
  const dtypeMismatches: LiveHealth['dtypeMismatches'] = []
  const canon = new Set<string>(CANONICAL_DEPARTMENTS)

  for (const col of df.columns) {
    const numericExpected = (NUMERIC_COLUMNS as readonly string[]).includes(col)
    const range = VALID_RANGES[col]
    let n = 0
    let p = 0
    let o = 0
    let u = 0
    for (const r of df.rows) {
      const c = r.v[col] ?? null
      if (isNull(c)) {
        n += 1
        mark(r.idx, col, 'missing')
        continue
      }
      if (isPlaceholder(c)) {
        p += 1
        mark(r.idx, col, 'placeholder')
        continue
      }
      if (numericExpected && typeof c !== 'number') mark(r.idx, col, 'wrong_type')
      if (range && typeof c === 'number' && (c < range.min || c > range.max)) {
        o += 1
        mark(r.idx, col, 'out_of_range')
      }
      if (col === 'department' && typeof c === 'string' && !canon.has(c)) {
        u += 1
        unknownValues.add(c)
        mark(r.idx, col, 'unknown_label')
      }
    }
    nulls[col] = n
    placeholders[col] = p
    if (range) outOfRange[col] = o
    if (col === 'department') unknownLabels[col] = u
    if (numericExpected) {
      const t = columnDtype(df, col)
      if (!isNumericDtype(t) && df.rows.some((r) => !isNull(r.v[col] ?? null))) dtypeMismatches.push({ column: col, dtype: t, expected: 'numeric' })
    }
  }

  const exact = duplicateMask(df)
  const normDf: DF = { columns: df.columns, rows: df.rows.map((r) => normRow(r, df.columns)) }
  const norm = duplicateMask(normDf)
  const rowProblems: Record<number, CellProblem[]> = {}
  df.rows.forEach((r, i) => {
    if (norm[i]) rowProblems[r.idx] = ['duplicate']
  })
  const sum = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0)
  const totalNulls = sum(nulls)
  const totalPlaceholders = sum(placeholders)
  const totalOutOfRange = sum(outOfRange)
  const totalUnknownLabels = sum(unknownLabels)
  const normalizedDuplicates = norm.filter(Boolean).length
  return {
    rows: df.rows.length,
    nulls,
    placeholders,
    totalNulls,
    totalPlaceholders,
    duplicates: exact.filter(Boolean).length,
    normalizedDuplicates,
    dtypeMismatches,
    outOfRange,
    totalOutOfRange,
    unknownLabels,
    unknownLabelValues: [...unknownValues].sort(),
    totalUnknownLabels,
    total: totalNulls + totalPlaceholders + normalizedDuplicates + dtypeMismatches.length + totalOutOfRange + totalUnknownLabels,
    cells,
    rowProblems,
  }
}

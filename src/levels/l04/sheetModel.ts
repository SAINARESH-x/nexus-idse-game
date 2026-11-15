// Spreadsheet view model (pure): view-only sort and filters, problem styling, and the VIEW ribbon line.
import { displayCell, isNull, problemsAt } from '../../engine'
import type { CellProblem, DF, LiveHealth, Row } from '../../engine'

export interface SortState {
  column: string
  ascending: boolean
}

export type ChipFilter = 'none' | 'missing' | 'duplicates' | 'suspicious'

export function sortCode(s: SortState): string {
  return `df.sort_values('${s.column}'${s.ascending ? '' : ', ascending=False'})`
}

function cmp(a: Row, b: Row, col: string): number {
  const x = a.v[col] ?? null
  const y = b.v[col] ?? null
  if (isNull(x) && isNull(y)) return 0
  if (isNull(x)) return 1 // NaN last, like pandas
  if (isNull(y)) return -1
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y))
}

/** Rows to display: filters and sort only change the VIEW; the frame and history are untouched. */
export function viewRows(df: DF, h: LiveHealth | null, sort: SortState | null, filters: Record<string, string>, chip: ChipFilter, health: LiveHealth): Row[] {
  let rows = df.rows
  const active = Object.entries(filters).filter(([, v]) => v.trim() !== '')
  if (active.length) {
    rows = rows.filter((r) => active.every(([c, f]) => displayCell(df, c, r.v[c] ?? null).toLowerCase().includes(f.trim().toLowerCase())))
  }
  if (chip === 'missing') rows = rows.filter((r) => df.columns.some((c) => problemsAt(health, r.idx, c).some((p) => p === 'missing' || p === 'placeholder')))
  if (chip === 'duplicates') rows = rows.filter((r) => (health.rowProblems[r.idx] ?? []).includes('duplicate'))
  if (chip === 'suspicious' && h) rows = rows.filter((r) => df.columns.some((c) => problemsAt(h, r.idx, c).length > 0))
  if (sort) {
    const dir = sort.ascending ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const k = cmp(a, b, sort.column)
      return k === 0 ? a.idx - b.idx : isNull(a.v[sort.column] ?? null) || isNull(b.v[sort.column] ?? null) ? k : k * dir
    })
  }
  return rows
}

export const PROBLEM_LABEL: Record<CellProblem, string> = {
  missing: 'missing value',
  placeholder: 'placeholder text',
  duplicate: 'duplicate row',
  out_of_range: 'out of valid range',
  wrong_type: 'number stored as text',
  unknown_label: 'unknown label',
}

/** Tailwind classes for a cell's problems (colour is always paired with an icon or text in the cell). */
export function problemClass(ps: CellProblem[]): string {
  const c: string[] = []
  if (ps.includes('missing')) c.push('bg-red/20 text-red')
  if (ps.includes('placeholder')) c.push('outline outline-1 outline-dashed outline-red -outline-offset-2 text-red')
  if (ps.includes('out_of_range')) c.push('text-magenta font-semibold')
  if (ps.includes('unknown_label')) c.push('bg-violet/15 text-violet')
  return c.join(' ')
}

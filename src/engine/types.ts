// Level 04 engine core types: cells, rows, immutable data frames, operations, issues and parse results.
import type { Decision, Tier } from '../game/types'

export type { Decision, Tier }

export type Cell = string | number | boolean | null

/** idx = original pandas-style index, preserved after drops. */
export interface Row {
  idx: number
  v: Record<string, Cell>
}

/**
 * IMMUTABLE frame: every engine function returns a new DF.
 * `floatCols` remembers numeric columns pandas would keep as float64 even when every value is
 * integral (for example after astype(float), or a fillna on a column that held NaN).
 */
export interface DF {
  columns: string[]
  rows: Row[]
  floatCols?: string[]
}

export type Dtype = 'int64' | 'float64' | 'object' | 'bool'

export type FillStrategy = 'mean' | 'median' | 'mode'
export type StrFn = 'strip' | 'lower' | 'upper' | 'title'

export type Op =
  | { type: 'drop_duplicates'; subset?: string[] }
  | { type: 'dropna'; subset?: string[] }
  | { type: 'fillna'; column?: string; value?: Cell; strategy?: FillStrategy }
  | { type: 'str_op'; column: string; fn: StrFn }
  | { type: 'str_replace'; column: string; old: string; new: string }
  | { type: 'replace_map'; column: string; mapping: Record<string, Cell> }
  | { type: 'astype'; column: string; to: 'int' | 'float' | 'str' }
  | { type: 'to_numeric'; column: string; errors: 'coerce' | 'raise' }
  | {
      type: 'filter_range'
      column: string
      min?: number
      max?: number
      /** Strict bounds for the `<` / `>` console forms. Default inclusive (between()). */
      minExclusive?: boolean
      maxExclusive?: boolean
      /** `==` / `!=` console forms. */
      eq?: Cell
      ne?: Cell
    }
  | { type: 'mask_invalid'; column: string; min?: number; max?: number }
  | { type: 'set_cell'; idx: number; column: string; value: Cell }
  | { type: 'drop_rows'; idxs: number[] }

export type OpType = Op['type']

export type OpResult =
  | { ok: true; df: DF; summary: string; rowsBefore: number; rowsAfter: number; changedCells: number }
  | { ok: false; error: string }

export type IssueKind = 'missing' | 'duplicate' | 'inconsistent' | 'type' | 'invalid'

export interface Issue {
  id: string
  kind: IssueKind
  /** -1 for column-level issues (e.g. a text column that should be numeric). */
  rowIdx: number
  column?: string
  truth?: Cell
  note: string
}

export type InspectQuery =
  | { type: 'df' }
  | { type: 'head'; n: number }
  | { type: 'tail'; n: number }
  | { type: 'shape' }
  | { type: 'columns' }
  | { type: 'info' }
  | { type: 'dtypes' }
  | { type: 'describe' }
  | { type: 'isnull_sum' }
  | { type: 'duplicated_sum' }
  | { type: 'duplicated_rows' }
  | { type: 'column'; column: string }
  | { type: 'value_counts'; column: string }
  | { type: 'unique'; column: string }
  | { type: 'col_isnull_sum'; column: string }
  | { type: 'help' }

export type ParseResult =
  | { kind: 'ops'; ops: Op[]; code: string }
  | { kind: 'inspect'; query: InspectQuery; code: string }
  | { kind: 'error'; message: string; suggestion?: string }

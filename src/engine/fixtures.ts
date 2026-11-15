// Hand-written test fixtures for the Level 04 engine (tinyDirty: 12 messy student rows).
import type { Cell, DF } from './types'

const COLS = ['student_id', 'department', 'age', 'cgpa', 'attendance']

const DATA: Cell[][] = [
  [1001, 'Computer Science', 19, 8.2, '85%'],
  [1002, 'CS', 20, 7.5, '92%'],
  [1003, 'Mechanical', 21, 6.9, null],
  [1004, ' cs  ', 22, 8.8, '78%'],
  [1005, 'mech', 19, 7.1, '64%'],
  [1006, 'Electrical', 199, 6.4, '88%'],
  [1007, 'Computer Science', 23, 9.1, '95%'],
  [1008, 'Electrical', 20, 5.8, '41%'],
  [1004, ' cs  ', 22, 8.8, '78%'],
  [1009, 'Mechanical', 18, 7.7, null],
  [1010, 'CS', 24, 74.0, '70%'],
  [1011, 'Computer Science', 21, 8.4, '99%'],
]

/** 12 rows: idx 8 copies idx 3; attendance null at 2 and 9; age 199 at 5; cgpa 74.0 at 10. */
export const tinyDirty: DF = {
  columns: COLS,
  rows: DATA.map((vals, idx) => ({ idx, v: Object.fromEntries(COLS.map((c, i) => [c, vals[i]])) })),
  floatCols: ['cgpa'],
}

/** A fresh copy (frames are immutable, but callers sometimes like their own object). */
export function makeTinyDirty(): DF {
  return { columns: [...tinyDirty.columns], rows: tinyDirty.rows.map((r) => ({ idx: r.idx, v: { ...r.v } })), floatCols: ['cgpa'] }
}

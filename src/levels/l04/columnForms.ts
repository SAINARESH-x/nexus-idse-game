// Spreadsheet column-menu forms (pure): each form's inputs become engine ops; cell text becomes a typed value.
import type { Cell, Op, StrFn } from '../../engine'

export type FillHow = 'median' | 'mean' | 'mode' | 'value'
export type ConvertTo = 'float' | 'int' | 'str' | 'numeric'

/** Text typed into a cell or form: numbers become numbers on numeric columns, 'nan' or empty becomes NaN. */
export function parseCellInput(text: string, numeric: boolean): Cell {
  const t = text.trim()
  if (t === '' || t.toLowerCase() === 'nan') return null
  if (numeric && /^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return text
}

export function fillOps(column: string, how: FillHow, value: string, numeric: boolean): Op[] {
  if (how === 'value') return [{ type: 'fillna', column, value: parseCellInput(value, numeric) }]
  return [{ type: 'fillna', column, strategy: how }]
}

export function standardiseOps(column: string, fns: StrFn[]): Op[] {
  return fns.map((fn) => ({ type: 'str_op', column, fn }))
}

export function convertOps(column: string, to: ConvertTo, stripPercent: boolean): Op[] {
  const pre: Op[] = stripPercent ? [{ type: 'str_replace', column, old: '%', new: '' }] : []
  if (to === 'numeric') return [...pre, { type: 'to_numeric', column, errors: 'coerce' }]
  return [...pre, { type: 'astype', column, to }]
}

export function replaceOps(column: string, mode: 'label' | 'substring', from: string, to: string, numeric: boolean): Op[] {
  if (mode === 'substring') return [{ type: 'str_replace', column, old: from, new: to }]
  return [{ type: 'replace_map', column, mapping: { [from]: parseCellInput(to, numeric) } }]
}

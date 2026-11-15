// Command Builder model (pure): methods filtered by target dtype, argument specs, and the generated pandas line.
import { applyAll, columnDtype, isNumericDtype, parse } from '../../engine'
import type { DF, Op } from '../../engine'

export type ArgKind = 'select' | 'text' | 'number' | 'columns'

export interface ArgDef {
  key: string
  label: string
  kind: ArgKind
  options?: string[]
  initial: string
}

export type TargetKind = 'frame' | 'text' | 'numeric'

export interface MethodDef {
  id: string
  label: string
  targets: TargetKind[]
  args: ArgDef[]
  line: (column: string, a: Record<string, string>) => string
  explain: string
}

const q = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const c = (col: string): string => `df[${q(col)}]`
const literal = (v: string): string => {
  const t = v.trim()
  if (t === '') return "''"
  if (/^-?\d+(\.\d+)?$/.test(t)) return t
  return q(v)
}
const subset = (cols: string): string => {
  const list = cols.split(',').map((x) => x.trim()).filter(Boolean)
  return list.length ? `subset=[${list.map(q).join(', ')}]` : ''
}

export const BUILDER_METHODS: MethodDef[] = [
  { id: 'drop_duplicates', label: 'drop_duplicates()', targets: ['frame'], args: [{ key: 'subset', label: 'subset (optional, comma separated)', kind: 'columns', initial: '' }], line: (_c, a) => `df = df.drop_duplicates(${subset(a.subset)})`, explain: 'Remove rows that repeat an earlier row.' },
  { id: 'dropna', label: 'dropna()', targets: ['frame'], args: [{ key: 'subset', label: 'subset (optional, comma separated)', kind: 'columns', initial: '' }], line: (_c, a) => `df = df.dropna(${subset(a.subset)})`, explain: 'Delete rows with blanks.' },
  { id: 'str.strip', label: 'str.strip()', targets: ['text'], args: [], line: (col) => `${c(col)} = ${c(col)}.str.strip()`, explain: 'Trim spaces around each value.' },
  { id: 'str.lower', label: 'str.lower()', targets: ['text'], args: [], line: (col) => `${c(col)} = ${c(col)}.str.lower()`, explain: 'Lower-case each value.' },
  { id: 'str.title', label: 'str.title()', targets: ['text'], args: [], line: (col) => `${c(col)} = ${c(col)}.str.title()`, explain: 'Capitalise each word.' },
  { id: 'str.upper', label: 'str.upper()', targets: ['text'], args: [], line: (col) => `${c(col)} = ${c(col)}.str.upper()`, explain: 'Upper-case each value.' },
  {
    id: 'str.replace',
    label: 'str.replace(old, new)',
    targets: ['text'],
    args: [
      { key: 'old', label: 'old text', kind: 'text', initial: '%' },
      { key: 'new', label: 'new text', kind: 'text', initial: '' },
      { key: 'then', label: 'then convert', kind: 'select', options: ['nothing', 'astype(float)'], initial: 'nothing' },
    ],
    line: (col, a) => `${c(col)} = ${c(col)}.str.replace(${q(a.old)}, ${q(a.new)})${a.then === 'astype(float)' ? '.astype(float)' : ''}`,
    explain: 'Replace a piece of text inside every value.',
  },
  {
    id: 'replace',
    label: 'replace({old: new})',
    targets: ['text'],
    args: [
      { key: 'from', label: 'exact label', kind: 'text', initial: '' },
      { key: 'to', label: 'becomes', kind: 'text', initial: '' },
    ],
    line: (col, a) => `${c(col)} = ${c(col)}.replace({${q(a.from)}: ${literal(a.to)}})`,
    explain: 'Rename one exact label.',
  },
  {
    id: 'fillna',
    label: 'fillna(...)',
    targets: ['text', 'numeric'],
    args: [
      { key: 'with', label: 'fill with', kind: 'select', options: ['median()', 'mean()', 'mode()[0]', 'value'], initial: 'median()' },
      { key: 'value', label: 'value (when "value")', kind: 'text', initial: '0' },
    ],
    line: (col, a) => `${c(col)} = ${c(col)}.fillna(${a.with === 'value' ? literal(a.value) : `${c(col)}.${a.with}`})`,
    explain: 'Fill blanks with a statistic or a value.',
  },
  { id: 'astype', label: 'astype(type)', targets: ['text', 'numeric'], args: [{ key: 'to', label: 'type', kind: 'select', options: ['float', 'int', 'str'], initial: 'float' }], line: (col, a) => `${c(col)} = ${c(col)}.astype(${a.to})`, explain: 'Change the column type.' },
  { id: 'to_numeric', label: "pd.to_numeric(errors='coerce')", targets: ['text'], args: [], line: (col) => `${c(col)} = pd.to_numeric(${c(col)}, errors='coerce')`, explain: 'Convert to numbers; unreadable values become NaN.' },
  {
    id: 'between',
    label: 'between(min, max) filter',
    targets: ['numeric'],
    args: [
      { key: 'min', label: 'min', kind: 'number', initial: '0' },
      { key: 'max', label: 'max', kind: 'number', initial: '100' },
    ],
    line: (col, a) => `df = df[${c(col)}.between(${Number(a.min)}, ${Number(a.max)})]`,
    explain: 'Keep rows inside the range (blanks are dropped too).',
  },
  {
    id: 'mask',
    label: 'mask invalid -> np.nan',
    targets: ['numeric'],
    args: [
      { key: 'min', label: 'min', kind: 'number', initial: '0' },
      { key: 'max', label: 'max', kind: 'number', initial: '100' },
    ],
    line: (col, a) => `df.loc[(${c(col)} < ${Number(a.min)}) | (${c(col)} > ${Number(a.max)}), ${q(col)}] = np.nan`,
    explain: 'Blank out impossible values but keep the rows.',
  },
]

export function targetKind(df: DF, target: string): TargetKind {
  if (target === 'df') return 'frame'
  return isNumericDtype(columnDtype(df, target)) ? 'numeric' : 'text'
}

export function methodsFor(df: DF, target: string): MethodDef[] {
  const k = targetKind(df, target)
  return BUILDER_METHODS.filter((m) => m.targets.includes(k))
}

export function initialArgs(m: MethodDef): Record<string, string> {
  return Object.fromEntries(m.args.map((a) => [a.key, a.initial]))
}

export function buildLine(method: MethodDef, target: string, args: Record<string, string>): string {
  return method.line(target, { ...initialArgs(method), ...args })
}

/** Parses and dry-runs a line on a copy: preview text for the builder ('will change N cells', or the error). */
export function previewLine(df: DF, line: string): { ok: boolean; text: string; ops?: Op[] } {
  const p = parse(line)
  if (p.kind === 'error') return { ok: false, text: p.message }
  if (p.kind === 'inspect') return { ok: true, text: 'Inspect command: shows output only.' }
  return previewOps(df, p.ops)
}

export function previewOps(df: DF, ops: Op[]): { ok: boolean; text: string; ops: Op[] } {
  const r = applyAll(df, ops)
  if (!r.ok) return { ok: false, text: r.error, ops }
  const lost = r.rowsBefore - r.rowsAfter
  if (lost > 0) return { ok: true, text: `PREVIEW: will remove ${lost} row${lost === 1 ? '' : 's'}.`, ops }
  return { ok: true, text: `PREVIEW: will change ${r.changedCells} cell${r.changedCells === 1 ? '' : 's'}.`, ops }
}

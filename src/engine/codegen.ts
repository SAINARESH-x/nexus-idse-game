// Canonical pandas code for ops (toCode / toCodeLine) and plain-English descriptions (describeOp).
import { pyRepr } from './format'
import type { Cell, Op } from './types'

const q = (s: string): string => pyRepr(s)
const col = (c: string): string => `df[${q(c)}]`
const list = (xs: string[]): string => `[${xs.map(q).join(', ')}]`

function lit(v: Cell): string {
  if (v === null) return 'np.nan'
  if (typeof v === 'number' && !Number.isInteger(v)) return String(v)
  return pyRepr(v)
}

function num(n: number): string {
  return String(n)
}

/** The column-method suffix for ops that can appear in a single-column chain, else null. */
function chainPart(op: Op): string | null {
  switch (op.type) {
    case 'str_op':
      return `.str.${op.fn}()`
    case 'str_replace':
      return `.str.replace(${q(op.old)}, ${q(op.new)})`
    case 'replace_map':
      return `.replace({${Object.entries(op.mapping).map(([k, v]) => `${q(k)}: ${lit(v)}`).join(', ')}})`
    case 'astype':
      return `.astype(${op.to})`
    case 'fillna':
      if (op.column === undefined) return null
      if (op.strategy === 'mode') return `.fillna(${col(op.column)}.mode()[0])`
      if (op.strategy) return `.fillna(${col(op.column)}.${op.strategy}())`
      return `.fillna(${lit(op.value ?? null)})`
    default:
      return null
  }
}

function opColumn(op: Op): string | undefined {
  return 'column' in op ? op.column : undefined
}

function cond(c: string, sym: string, v: number): string {
  return `(${col(c)} ${sym} ${num(v)})`
}

/** Canonical pandas line for one op. */
export function toCode(op: Op): string {
  switch (op.type) {
    case 'drop_duplicates':
      return op.subset?.length ? `df = df.drop_duplicates(subset=${list(op.subset)})` : 'df = df.drop_duplicates()'
    case 'dropna':
      return op.subset?.length ? `df = df.dropna(subset=${list(op.subset)})` : 'df = df.dropna()'
    case 'fillna':
      if (op.column === undefined) return `df = df.fillna(${lit(op.value ?? null)})`
      return `${col(op.column)} = ${col(op.column)}${chainPart(op)}`
    case 'str_op':
    case 'str_replace':
    case 'replace_map':
    case 'astype':
      return `${col(op.column)} = ${col(op.column)}${chainPart(op)}`
    case 'to_numeric':
      return `${col(op.column)} = pd.to_numeric(${col(op.column)}, errors=${q(op.errors)})`
    case 'filter_range': {
      const c = op.column
      if (op.eq !== undefined) return `df = df[${col(c)} == ${lit(op.eq)}]`
      if (op.ne !== undefined) return `df = df[${col(c)} != ${lit(op.ne)}]`
      if (op.min !== undefined && op.max !== undefined && !op.minExclusive && !op.maxExclusive)
        return `df = df[${col(c)}.between(${num(op.min)}, ${num(op.max)})]`
      const parts: string[] = []
      if (op.min !== undefined) parts.push(cond(c, op.minExclusive ? '>' : '>=', op.min))
      if (op.max !== undefined) parts.push(cond(c, op.maxExclusive ? '<' : '<=', op.max))
      if (parts.length === 1) return `df = df[${parts[0].slice(1, -1)}]`
      if (parts.length === 0) return `df = df[${col(c)}.notna()]`
      return `df = df[${parts.join(' & ')}]`
    }
    case 'mask_invalid': {
      const parts: string[] = []
      if (op.min !== undefined) parts.push(cond(op.column, '<', op.min))
      if (op.max !== undefined) parts.push(cond(op.column, '>', op.max))
      const c = parts.length === 1 ? parts[0].slice(1, -1) : parts.join(' | ')
      return `df.loc[${c}, ${q(op.column)}] = np.nan`
    }
    case 'set_cell':
      return `df.at[${op.idx}, ${q(op.column)}] = ${lit(op.value)}`
    case 'drop_rows':
      return `df = df.drop(index=[${op.idxs.join(', ')}])`
  }
}

/**
 * One line for a history entry. Several chainable ops on the same column render as one chain,
 * e.g. df['c'] = df['c'].str.strip().str.title(); a trailing to_numeric wraps the chain.
 */
export function toCodeLine(ops: Op[]): string {
  if (ops.length === 0) return ''
  if (ops.length === 1) return toCode(ops[0])
  const c = opColumn(ops[0])
  const last = ops[ops.length - 1]
  const body = last.type === 'to_numeric' ? ops.slice(0, -1) : ops
  const sameCol = c !== undefined && ops.every((o) => opColumn(o) === c)
  const parts = body.map(chainPart)
  if (sameCol && c !== undefined && parts.every((p) => p !== null)) {
    const chain = `${col(c)}${parts.join('')}`
    if (last.type === 'to_numeric') return `${col(c)} = pd.to_numeric(${chain}, errors=${q(last.errors)})`
    return `${col(c)} = ${chain}`
  }
  return ops.map(toCode).join('; ')
}

function range(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `between ${min} and ${max}`
  if (min !== undefined) return `of at least ${min}`
  if (max !== undefined) return `of at most ${max}`
  return 'in range'
}

/** One plain-English sentence describing what an op does. */
export function describeOp(op: Op): string {
  switch (op.type) {
    case 'drop_duplicates':
      return op.subset?.length
        ? `Remove rows that repeat an earlier row in ${op.subset.join(', ')}, keeping the first copy.`
        : 'Remove rows that are exact copies of an earlier row, keeping the first copy.'
    case 'dropna':
      return op.subset?.length ? `Delete every row with a blank in ${op.subset.join(', ')}.` : 'Delete every row that has a blank in any column.'
    case 'fillna':
      if (op.column === undefined) return `Fill every blank cell in the table with ${pyRepr(op.value ?? null)}.`
      if (op.strategy) return `Fill blanks in ${op.column} with the column ${op.strategy}.`
      return `Fill blanks in ${op.column} with ${pyRepr(op.value ?? null)}.`
    case 'str_op': {
      const what = { strip: 'Trim surrounding spaces from', lower: 'Lower-case', upper: 'Upper-case', title: 'Title-case' }[op.fn]
      return `${what} every text value in ${op.column}.`
    }
    case 'str_replace':
      return `Replace the text ${pyRepr(op.old)} with ${pyRepr(op.new)} inside every value of ${op.column}.`
    case 'replace_map':
      return `Rename labels in ${op.column}: ${Object.entries(op.mapping).map(([k, v]) => `${pyRepr(k)} to ${pyRepr(v)}`).join(', ')}.`
    case 'astype':
      return `Convert ${op.column} to ${op.to === 'str' ? 'text' : op.to === 'int' ? 'whole numbers' : 'decimal numbers'}.`
    case 'to_numeric':
      return op.errors === 'coerce'
        ? `Convert ${op.column} to numbers, turning anything unreadable into a blank.`
        : `Convert ${op.column} to numbers, stopping with an error on anything unreadable.`
    case 'filter_range':
      if (op.eq !== undefined) return `Keep only rows where ${op.column} equals ${pyRepr(op.eq)}.`
      if (op.ne !== undefined) return `Keep only rows where ${op.column} is not ${pyRepr(op.ne)}.`
      return `Keep only rows whose ${op.column} is ${range(op.min, op.max)}; other rows, including blanks, are deleted.`
    case 'mask_invalid':
      return `Blank out ${op.column} values outside ${range(op.min, op.max)}, keeping the rows.`
    case 'set_cell':
      return `Set ${op.column} in row ${op.idx} to ${pyRepr(op.value)}.`
    case 'drop_rows':
      return `Delete the rows with index ${op.idxs.join(', ')}.`
  }
}

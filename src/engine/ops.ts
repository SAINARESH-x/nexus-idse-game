// Immutable pandas-like operations: apply(df, op) returns a new frame plus a summary, or a pandas-style error.
import {
  columnDtype,
  duplicateMask,
  isNull,
  isNum,
  mean,
  median,
  mode,
  numbers,
} from './dataframe'
import { pyNum, pyRepr } from './format'
import type { Cell, DF, Dtype, Op, OpResult, Row, StrFn } from './types'

type Fail = { ok: false; error: string }
const fail = (error: string): Fail => ({ ok: false, error })

const FLOAT_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/
const INT_RE = /^[+-]?\d+$/

/** Python float(str). Returns undefined when Python would raise ValueError; null for 'nan'. */
export function parsePyFloat(s: string): number | null | undefined {
  const t = s.trim().replace(/_/g, '')
  if (FLOAT_RE.test(t)) return Number(t)
  const l = t.toLowerCase().replace(/^[+-]/, '')
  if (l === 'nan') return null
  if (l === 'inf' || l === 'infinity') return t.startsWith('-') ? -Infinity : Infinity
  return undefined
}

export function titleCase(s: string): string {
  let out = ''
  let prevLetter = false
  for (const ch of s) {
    const isLetter = ch.toLowerCase() !== ch.toUpperCase()
    out += isLetter ? (prevLetter ? ch.toLowerCase() : ch.toUpperCase()) : ch
    prevLetter = isLetter
  }
  return out
}

function strFn(fn: StrFn, s: string): string {
  switch (fn) {
    case 'strip':
      return s.trim()
    case 'lower':
      return s.toLowerCase()
    case 'upper':
      return s.toUpperCase()
    case 'title':
      return titleCase(s)
  }
}

function missingColumn(df: DF, col: string | undefined): Fail | null {
  if (col !== undefined && !df.columns.includes(col)) return fail(`KeyError: '${col}'`)
  return null
}

function mapColumn(df: DF, col: string, f: (c: Cell) => Cell): { rows: Row[]; changed: number } {
  let changed = 0
  const rows = df.rows.map((r) => {
    const before = r.v[col] ?? null
    const after = f(before)
    if (Object.is(before, after)) return r
    changed += 1
    return { idx: r.idx, v: { ...r.v, [col]: after } }
  })
  return { rows, changed }
}

function withFloat(df: DF, cols: string[], add: boolean): string[] | undefined {
  const set = new Set(df.floatCols ?? [])
  for (const c of cols) {
    if (add) set.add(c)
    else set.delete(c)
  }
  return set.size ? [...set].sort() : undefined
}

function frame(df: DF, rows: Row[], ...fc: [string[] | undefined] | []): DF {
  const floatCols = fc.length ? fc[0] : df.floatCols
  const out: DF = { columns: [...df.columns], rows }
  if (floatCols && floatCols.length) out.floatCols = [...floatCols]
  return out
}

function hasStrings(df: DF, col: string): boolean {
  return df.rows.some((r) => typeof r.v[col] === 'string')
}

function cmpError(df: DF, col: string, sym: string): Fail | null {
  const s = df.rows.find((r) => typeof r.v[col] === 'string')
  if (!s) return null
  return fail(`TypeError: '${sym}' not supported between instances of 'str' and 'int' (column '${col}' is text, for example ${pyRepr(s.v[col])}; convert it to numbers first)`)
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

type Inner = { ok: true; df: DF; summary: string; changedCells?: number } | Fail

function applyInner(df: DF, op: Op): Inner {
  switch (op.type) {
    case 'drop_duplicates': {
      for (const c of op.subset ?? []) {
        const m = missingColumn(df, c)
        if (m) return fail(`KeyError: Index(['${c}'], dtype='object')`)
      }
      const mask = duplicateMask(df, op.subset)
      const rows = df.rows.filter((_, i) => !mask[i])
      const removed = df.rows.length - rows.length
      const on = op.subset?.length ? ` on [${op.subset.join(', ')}]` : ''
      return { ok: true, df: frame(df, rows), summary: `Removed ${plural(removed, 'duplicate row')}${on} (kept the first copy).` }
    }
    case 'dropna': {
      for (const c of op.subset ?? []) if (!df.columns.includes(c)) return fail(`KeyError: ['${c}']`)
      const cols = op.subset?.length ? op.subset : df.columns
      const rows = df.rows.filter((r) => !cols.some((c) => isNull(r.v[c] ?? null)))
      const removed = df.rows.length - rows.length
      const on = op.subset?.length ? ` with a blank in [${op.subset.join(', ')}]` : ' with a blank in any column'
      return { ok: true, df: frame(df, rows), summary: `Dropped ${plural(removed, 'row')}${on}.` }
    }
    case 'fillna': {
      const m = missingColumn(df, op.column)
      if (m) return m
      if (op.column === undefined) {
        if (op.strategy) return fail('ValueError: a fill strategy needs a column, for example df[\'c\'].fillna(df[\'c\'].median())')
        const value = op.value ?? null
        if (isNull(value)) return fail("ValueError: Must specify a fill 'value' or 'method'.")
        let changed = 0
        const rows = df.rows.map((r) => {
          const v = { ...r.v }
          let touched = false
          for (const c of df.columns) {
            if (isNull(v[c] ?? null)) {
              v[c] = value
              changed += 1
              touched = true
            }
          }
          return touched ? { idx: r.idx, v } : r
        })
        return { ok: true, df: frame(df, rows), summary: `Filled ${plural(changed, 'blank cell')} across the whole frame with ${pyRepr(value)}.`, changedCells: changed }
      }
      const col = op.column
      let value: Cell
      let how: string
      if (op.strategy) {
        const isText = hasStrings(df, col)
        if (op.strategy === 'mode') {
          value = mode(df.rows.map((r) => r.v[col] ?? null))
        } else {
          if (isText) {
            const s = df.rows.find((r) => typeof r.v[col] === 'string')
            return fail(`TypeError: could not convert string to float: ${pyRepr(s?.v[col] ?? '')} (cannot take the ${op.strategy} of text column '${col}'; convert it to numbers first)`)
          }
          const xs = numbers(df, col)
          value = op.strategy === 'mean' ? mean(xs) : median(xs)
          if (Number.isNaN(value)) return fail(`ValueError: column '${col}' has no values to take the ${op.strategy} of.`)
        }
        if (isNull(value)) return fail(`ValueError: column '${col}' has no values to take the mode of.`)
        how = `the ${op.strategy} (${pyRepr(value)})`
      } else {
        value = op.value ?? null
        if (isNull(value)) return fail("ValueError: Must specify a fill 'value' or 'method'.")
        how = pyRepr(value)
      }
      const fillWith = value
      const { rows, changed } = mapColumn(df, col, (c) => (isNull(c) ? fillWith : c))
      return { ok: true, df: frame(df, rows), summary: `Filled ${plural(changed, 'blank')} in '${col}' with ${how}.`, changedCells: changed }
    }
    case 'str_op':
    case 'str_replace': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const col = op.column
      const nonNull = df.rows.filter((r) => !isNull(r.v[col] ?? null))
      if (nonNull.length > 0 && !hasStrings(df, col)) return fail('AttributeError: Can only use .str accessor with string values!')
      const f = (s: string): string => (op.type === 'str_op' ? strFn(op.fn, s) : s.split(op.old).join(op.new))
      let nonString = 0
      const { rows, changed } = mapColumn(df, col, (c) => {
        if (isNull(c)) return null
        if (typeof c !== 'string') {
          nonString += 1
          return null
        }
        return f(c)
      })
      const what = op.type === 'str_op' ? `str.${op.fn}()` : `str.replace(${pyRepr(op.old)}, ${pyRepr(op.new)})`
      const extra = nonString ? ` ${plural(nonString, 'non-text value')} became NaN (pandas behaviour).` : ''
      return { ok: true, df: frame(df, rows, withFloat(df, [col], false)), summary: `Applied ${what} to '${col}': ${plural(changed, 'value')} changed.${extra}`, changedCells: changed }
    }
    case 'replace_map': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const { rows, changed } = mapColumn(df, op.column, (c) =>
        typeof c === 'string' && Object.prototype.hasOwnProperty.call(op.mapping, c) ? op.mapping[c] : c,
      )
      return { ok: true, df: frame(df, rows), summary: `Replaced ${plural(changed, 'value')} in '${op.column}' using a mapping of ${plural(Object.keys(op.mapping).length, 'label')}.`, changedCells: changed }
    }
    case 'astype': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const col = op.column
      if (op.to === 'str') {
        const t = columnDtype(df, col)
        const { rows, changed } = mapColumn(df, col, (c) => {
          if (isNull(c)) return 'nan'
          if (typeof c === 'number') return pyNum(c, t === 'float64')
          if (typeof c === 'boolean') return c ? 'True' : 'False'
          return c
        })
        return { ok: true, df: frame(df, rows, withFloat(df, [col], false)), summary: `Converted '${col}' to text (object). Blanks became the string 'nan'.`, changedCells: changed }
      }
      const out: Cell[] = []
      for (const r of df.rows) {
        const c = r.v[col] ?? null
        if (op.to === 'int') {
          if (isNull(c) || (typeof c === 'number' && !Number.isFinite(c))) return fail('IntCastingNaNError: Cannot convert non-finite values (NA or inf) to integer')
          if (typeof c === 'boolean') out.push(c ? 1 : 0)
          else if (typeof c === 'number') out.push(Math.trunc(c))
          else {
            const t = c.trim()
            if (!INT_RE.test(t)) return fail(`ValueError: invalid literal for int() with base 10: ${pyRepr(c)}`)
            out.push(Number(t))
          }
        } else {
          if (isNull(c)) out.push(null)
          else if (typeof c === 'boolean') out.push(c ? 1 : 0)
          else if (typeof c === 'number') out.push(c)
          else {
            const p = parsePyFloat(c)
            if (p === undefined) return fail(`ValueError: could not convert string to float: ${pyRepr(c)}`)
            out.push(p)
          }
        }
      }
      let changed = 0
      const rows = df.rows.map((r, i) => {
        if (Object.is(r.v[col] ?? null, out[i])) return r
        changed += 1
        return { idx: r.idx, v: { ...r.v, [col]: out[i] } }
      })
      const target: Dtype = op.to === 'int' ? 'int64' : 'float64'
      return {
        ok: true,
        df: frame(df, rows, withFloat(df, [col], op.to === 'float')),
        summary: `Converted '${col}' to ${target}: ${plural(changed, 'value')} changed.`,
        changedCells: changed,
      }
    }
    case 'to_numeric': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const col = op.column
      let coerced = 0
      let sawFloat = false
      const out: Cell[] = []
      for (let i = 0; i < df.rows.length; i += 1) {
        const c = df.rows[i].v[col] ?? null
        if (isNull(c)) out.push(null)
        else if (typeof c === 'number') {
          if (!Number.isInteger(c)) sawFloat = true
          out.push(c)
        } else if (typeof c === 'boolean') out.push(c ? 1 : 0)
        else {
          const p = parsePyFloat(c)
          if (p === undefined) {
            if (op.errors === 'raise') return fail(`ValueError: Unable to parse string ${JSON.stringify(c)} at position ${i}`)
            coerced += 1
            out.push(null)
          } else {
            if (p === null || !INT_RE.test(c.trim())) sawFloat = true
            out.push(p)
          }
        }
      }
      let changed = 0
      const rows = df.rows.map((r, i) => {
        if (Object.is(r.v[col] ?? null, out[i])) return r
        changed += 1
        return { idx: r.idx, v: { ...r.v, [col]: out[i] } }
      })
      const fl = sawFloat || df.floatCols?.includes(col) === true
      const warn = coerced ? ` WARNING: ${plural(coerced, 'value')} could not be parsed and ${coerced === 1 ? 'was' : 'were'} coerced to NaN.` : ' No values were coerced.'
      return {
        ok: true,
        df: frame(df, rows, withFloat(df, [col], fl)),
        summary: `Converted '${col}' to numbers (errors='${op.errors}'): ${plural(changed, 'value')} changed.${warn}`,
        changedCells: changed,
      }
    }
    case 'filter_range': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const col = op.column
      const numericTest = op.eq === undefined && op.ne === undefined
      if (numericTest) {
        const e = cmpError(df, col, op.min !== undefined ? '>=' : '<=')
        if (e) return e
      }
      let nullDropped = 0
      const rows = df.rows.filter((r) => {
        const c = r.v[col] ?? null
        if (op.ne !== undefined) return !Object.is(c, op.ne) && !(isNull(c) && isNull(op.ne))
        if (isNull(c)) {
          nullDropped += 1
          return false
        }
        if (op.eq !== undefined) return Object.is(c, op.eq)
        if (!isNum(c)) return false
        if (op.min !== undefined && (op.minExclusive ? c <= op.min : c < op.min)) return false
        if (op.max !== undefined && (op.maxExclusive ? c >= op.max : c > op.max)) return false
        return true
      })
      const removed = df.rows.length - rows.length
      const note = nullDropped ? ` ${plural(nullDropped, 'row')} with a blank '${col}' ${nullDropped === 1 ? 'was' : 'were'} also dropped, exactly like pandas between().` : ''
      return { ok: true, df: frame(df, rows), summary: `Kept rows matching the '${col}' condition: ${plural(removed, 'row')} removed.${note}` }
    }
    case 'mask_invalid': {
      const m = missingColumn(df, op.column)
      if (m) return m
      const e = cmpError(df, op.column, op.min !== undefined ? '<' : '>')
      if (e) return e
      const { rows, changed } = mapColumn(df, op.column, (c) => {
        if (!isNum(c)) return c
        if ((op.min !== undefined && c < op.min) || (op.max !== undefined && c > op.max)) return null
        return c
      })
      return {
        ok: true,
        df: frame(df, rows, withFloat(df, [op.column], true)),
        summary: `Set ${plural(changed, 'out-of-range value')} in '${op.column}' to NaN. Every row was kept.`,
        changedCells: changed,
      }
    }
    case 'set_cell': {
      const m = missingColumn(df, op.column)
      if (m) return m
      if (!df.rows.some((r) => r.idx === op.idx)) return fail(`KeyError: ${op.idx} (no row with that index; .at does not create rows in this console)`)
      let changed = 0
      const rows = df.rows.map((r) => {
        if (r.idx !== op.idx) return r
        if (Object.is(r.v[op.column] ?? null, op.value)) return r
        changed = 1
        return { idx: r.idx, v: { ...r.v, [op.column]: op.value } }
      })
      const fl = isNull(op.value) ? withFloat(df, [op.column], true) : df.floatCols
      return { ok: true, df: frame(df, rows, fl), summary: `Set row ${op.idx}, '${op.column}' to ${pyRepr(op.value)}.`, changedCells: changed }
    }
    case 'drop_rows': {
      const present = new Set(df.rows.map((r) => r.idx))
      const missing = op.idxs.filter((i) => !present.has(i))
      if (missing.length) return fail(`KeyError: '[${missing.join(', ')}] not found in axis'`)
      const drop = new Set(op.idxs)
      const rows = df.rows.filter((r) => !drop.has(r.idx))
      return { ok: true, df: frame(df, rows), summary: `Dropped ${plural(df.rows.length - rows.length, 'row')} by index.` }
    }
  }
}

function countChanged(a: DF, b: DF): number {
  const byIdx = new Map(a.rows.map((r) => [r.idx, r]))
  let n = 0
  for (const r of b.rows) {
    const o = byIdx.get(r.idx)
    if (!o) continue
    for (const c of b.columns) if (!Object.is(o.v[c] ?? null, r.v[c] ?? null)) n += 1
  }
  return n
}

/** Keep pandas float64 columns as float64 when an op leaves them all-numeric (NaN-holding ints are floats). */
function stickFloats(before: DF, after: DF, op: Op): DF {
  const skip = op.type === 'astype' && op.to !== 'float' ? op.column : op.type === 'str_op' || op.type === 'str_replace' ? op.column : undefined
  const add: string[] = []
  for (const c of after.columns) {
    if (c === skip) continue
    if (columnDtype(before, c) === 'float64' && after.rows.every((r) => typeof r.v[c] !== 'string' && typeof r.v[c] !== 'boolean')) add.push(c)
  }
  if (add.length === 0) return after
  const set = new Set([...(after.floatCols ?? []), ...add])
  return { ...after, floatCols: [...set].sort() }
}

/** Apply one op. Never mutates the input; a failure leaves df untouched and returns a pandas-style error. */
export function apply(df: DF, op: Op): OpResult {
  const res = applyInner(df, op)
  if (!res.ok) return res
  const out = stickFloats(df, res.df, op)
  return {
    ok: true,
    df: out,
    summary: res.summary,
    rowsBefore: df.rows.length,
    rowsAfter: out.rows.length,
    changedCells: res.changedCells ?? countChanged(df, out),
  }
}

/** Apply several ops in order; stops at the first failure. */
export function applyAll(df: DF, ops: Op[]): OpResult {
  let cur = df
  const summaries: string[] = []
  let changed = 0
  for (const op of ops) {
    const r = apply(cur, op)
    if (!r.ok) return r
    cur = r.df
    summaries.push(r.summary)
    changed += r.changedCells
  }
  return { ok: true, df: cur, summary: summaries.join(' '), rowsBefore: df.rows.length, rowsAfter: cur.rows.length, changedCells: changed }
}

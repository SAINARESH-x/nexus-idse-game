// Safe console parser: interprets a small pandas subset into Ops or inspect queries. Never evaluates user text.
import { toCode, toCodeLine } from './codegen'
import { SyntaxErr, parseStatement, stripComment, type Node } from './tokenizer'
import type { Cell, FillStrategy, InspectQuery, Op, ParseResult } from './types'

export { runInspect } from './inspect'

export const SUBSET_MESSAGE = 'This console understands a simplified subset of pandas.'

/** Cheat sheet: every supported form with a one-line explanation. */
export const SUPPORTED_COMMANDS: ReadonlyArray<{ code: string; explain: string }> = [
  { code: 'df', explain: 'Show the table.' },
  { code: 'df.head(10) / df.tail(10)', explain: 'First or last n rows.' },
  { code: 'df.shape', explain: '(rows, columns).' },
  { code: 'df.info()', explain: 'Columns, non-null counts and dtypes.' },
  { code: 'df.dtypes', explain: 'Data type of each column.' },
  { code: 'df.describe()', explain: 'Summary statistics of numeric columns.' },
  { code: 'df.isnull().sum()', explain: 'Blank (NaN) cells per column. df.isna() works too.' },
  { code: 'df.duplicated().sum()', explain: 'How many rows repeat an earlier row.' },
  { code: 'df[df.duplicated()]', explain: 'Show the repeated rows.' },
  { code: "df['c'].value_counts()", explain: 'How often each value appears.' },
  { code: "df['c'].unique()", explain: 'Distinct values of a column.' },
  { code: "df['c'].isnull().sum()", explain: 'Blank cells in one column.' },
  { code: 'df = df.drop_duplicates()', explain: "Remove exact copies (subset=['a','b'] to compare some columns)." },
  { code: "df = df.dropna(subset=['c'])", explain: 'Delete rows with blanks (all columns if no subset).' },
  { code: "df['c'] = df['c'].fillna(df['c'].median())", explain: 'Fill blanks with a number, text, mean(), median() or mode()[0].' },
  { code: 'df = df.fillna(0)', explain: 'Fill every blank in the table with one value.' },
  { code: "df['c'] = df['c'].str.strip().str.title()", explain: 'Text clean-up chain: strip, lower, upper, title, replace(a, b).' },
  { code: "df['c'] = df['c'].replace({'a': 'b'})", explain: 'Rename exact labels.' },
  { code: "df['c'] = df['c'].astype(float)", explain: 'Change type: int, float or str.' },
  { code: "df['c'] = pd.to_numeric(df['c'], errors='coerce')", explain: 'To numbers; unreadable values become NaN.' },
  { code: "df = df[df['c'].between(a, b)]", explain: 'Keep rows in range (also <, <=, >, >=, ==, !=). Blank rows are dropped.' },
  { code: "df.loc[(df['c'] < a) | (df['c'] > b), 'c'] = np.nan", explain: 'Blank out invalid values but keep the rows.' },
  { code: "df.at[12, 'c'] = value", explain: 'Set one cell.' },
  { code: 'df = df.drop(index=[3, 7])', explain: 'Delete rows by index.' },
]

class Reject extends Error {
  constructor(msg: string, public suggestion?: string) {
    super(msg)
  }
}

const isName = (n: Node, id: string): boolean => n.k === 'name' && n.id === id
const isDf = (n: Node): boolean => isName(n, 'df')

function attrCall(n: Node): { obj: Node; name: string; args: Node[]; kwargs: Record<string, Node> } | null {
  if (n.k === 'call' && n.fn.k === 'attr') return { obj: n.fn.obj, name: n.fn.name, args: n.args, kwargs: n.kwargs }
  return null
}

function str(n: Node | undefined): string | undefined {
  return n?.k === 'str' ? n.v : undefined
}

function numLit(n: Node | undefined): number | undefined {
  if (!n) return undefined
  if (n.k === 'num') return n.v
  if (n.k === 'neg') {
    const v = numLit(n.v)
    return v === undefined ? undefined : -v
  }
  return undefined
}

function isNan(n: Node): boolean {
  return (n.k === 'attr' && n.name === 'nan' && (isName(n.obj, 'np') || isName(n.obj, 'numpy'))) || isName(n, 'None') || (n.k === 'attr' && n.name === 'NA' && isName(n.obj, 'pd'))
}

function literal(n: Node): Cell | undefined {
  const v = numLit(n)
  if (v !== undefined) return v
  if (n.k === 'str') return n.v
  if (isName(n, 'True')) return true
  if (isName(n, 'False')) return false
  if (isNan(n)) return null
  return undefined
}

/** df['c'] -> 'c'. */
function colOf(n: Node): string | undefined {
  if (n.k === 'index' && isDf(n.obj) && n.keys.length === 1) return str(n.keys[0])
  return undefined
}

function strList(n: Node | undefined): string[] | undefined {
  if (!n) return undefined
  if (n.k === 'str') return [n.v]
  if (n.k !== 'list') return undefined
  const out: string[] = []
  for (const it of n.items) {
    if (it.k !== 'str') return undefined
    out.push(it.v)
  }
  return out
}

function fillArg(n: Node, column: string): { value?: Cell; strategy?: FillStrategy } {
  const lit = literal(n)
  if (lit !== undefined) {
    if (lit === null) throw new Reject("fillna(np.nan) fills nothing. Use a number, text, or df['c'].median().")
    return { value: lit }
  }
  let inner: Node = n
  let modeIndexed = false
  if (n.k === 'index' && n.keys.length === 1 && numLit(n.keys[0]) === 0) {
    inner = n.obj
    modeIndexed = true
  }
  const c = attrCall(inner)
  if (c && c.args.length === 0) {
    const src = colOf(c.obj)
    if (src !== undefined && (c.name === 'mean' || c.name === 'median' || c.name === 'mode')) {
      if (src !== column) throw new Reject(`Fill '${column}' with a statistic of the same column, for example df['${column}'].median().`)
      if (c.name === 'mode' && !modeIndexed) throw new Reject("mode() returns a Series. Use df['c'].mode()[0].")
      if (c.name !== 'mode' && modeIndexed) throw new Reject(SUBSET_MESSAGE)
      return { strategy: c.name }
    }
  }
  throw new Reject(SUBSET_MESSAGE, "Try df['c'].fillna(df['c'].median()) or .fillna(0).")
}

function astypeTarget(n: Node | undefined): 'int' | 'float' | 'str' {
  const id = n?.k === 'name' ? n.id : n?.k === 'str' ? n.v : n?.k === 'attr' && (isName(n.obj, 'np') || isName(n.obj, 'numpy')) ? n.name : undefined
  if (id === 'int' || id === 'int64' || id === 'int32') return 'int'
  if (id === 'float' || id === 'float64' || id === 'float32') return 'float'
  if (id === 'str' || id === 'object' || id === 'string') return 'str'
  throw new Reject('astype supports int, float and str in this console.')
}

/** Parse a single-column chain such as df['c'].str.strip().fillna(0). */
function columnChain(n: Node): { column: string; ops: Op[] } {
  const direct = colOf(n)
  if (direct !== undefined) return { column: direct, ops: [] }
  if (n.k === 'call' && n.fn.k === 'attr' && isName(n.fn.obj, 'pd') && n.fn.name === 'to_numeric') {
    if (n.args.length !== 1) throw new Reject("pd.to_numeric takes one column: pd.to_numeric(df['c'], errors='coerce').")
    const inner = columnChain(n.args[0])
    const e = n.kwargs.errors ? str(n.kwargs.errors) : 'raise'
    if (e !== 'coerce' && e !== 'raise') throw new Reject("errors must be 'coerce' or 'raise'.")
    return { column: inner.column, ops: [...inner.ops, { type: 'to_numeric', column: inner.column, errors: e }] }
  }
  const c = attrCall(n)
  if (!c) throw new Reject(SUBSET_MESSAGE)
  const isStr = c.obj.k === 'attr' && c.obj.name === 'str'
  const base = columnChain(isStr && c.obj.k === 'attr' ? c.obj.obj : c.obj)
  const column = base.column
  const push = (op: Op): { column: string; ops: Op[] } => ({ column, ops: [...base.ops, op] })
  if (isStr) {
    if (c.name === 'strip' || c.name === 'lower' || c.name === 'upper' || c.name === 'title') {
      if (c.args.length) throw new Reject(`.str.${c.name}() takes no arguments in this console.`)
      return push({ type: 'str_op', column, fn: c.name })
    }
    if (c.name === 'replace') {
      const a = str(c.args[0])
      const b = str(c.args[1])
      if (a === undefined || b === undefined || c.args.length !== 2) throw new Reject(".str.replace needs two texts, for example .str.replace('%', '').")
      return push({ type: 'str_replace', column, old: a, new: b })
    }
    throw new Reject(SUBSET_MESSAGE, 'String methods: .str.strip(), .str.lower(), .str.upper(), .str.title(), .str.replace(a, b).')
  }
  switch (c.name) {
    case 'replace': {
      const d = c.args[0]
      if (d?.k !== 'dict') throw new Reject("Use a mapping: .replace({'old': 'new'}).")
      const mapping: Record<string, Cell> = {}
      for (const [k, v] of d.entries) {
        const kk = str(k)
        const vv = literal(v)
        if (kk === undefined || vv === undefined) throw new Reject('replace() mapping keys must be text and values must be plain values.')
        mapping[kk] = vv
      }
      return push({ type: 'replace_map', column, mapping })
    }
    case 'astype':
      return push({ type: 'astype', column, to: astypeTarget(c.args[0]) })
    case 'fillna': {
      if (!c.args[0]) throw new Reject('fillna needs a value.')
      return push({ type: 'fillna', column, ...fillArg(c.args[0], column) })
    }
    default:
      throw new Reject(SUBSET_MESSAGE)
  }
}

type Bound = { min?: number; max?: number; minExclusive?: boolean; maxExclusive?: boolean; eq?: Cell; ne?: Cell }

function comparison(n: Node): { column: string; b: Bound } | null {
  if (n.k !== 'bin' || !['<', '<=', '>', '>=', '==', '!='].includes(n.op)) return null
  const column = colOf(n.l)
  if (column === undefined) return null
  if (n.op === '==' || n.op === '!=') {
    const v = literal(n.r)
    if (v === undefined) return null
    return { column, b: n.op === '==' ? { eq: v } : { ne: v } }
  }
  const v = numLit(n.r)
  if (v === undefined) return null
  if (n.op === '<') return { column, b: { max: v, maxExclusive: true } }
  if (n.op === '<=') return { column, b: { max: v } }
  if (n.op === '>') return { column, b: { min: v, minExclusive: true } }
  return { column, b: { min: v } }
}

function filterCond(n: Node): Op {
  const bt = attrCall(n)
  if (bt && bt.name === 'between') {
    const column = colOf(bt.obj)
    const a = numLit(bt.args[0])
    const b = numLit(bt.args[1])
    if (column === undefined || a === undefined || b === undefined) throw new Reject("Use df[df['c'].between(a, b)] with two numbers.")
    return { type: 'filter_range', column, min: a, max: b }
  }
  const one = comparison(n)
  if (one) return { type: 'filter_range', column: one.column, ...one.b }
  if (n.k === 'bin' && n.op === '&') {
    const l = comparison(n.l)
    const r = comparison(n.r)
    if (l && r && l.column === r.column && l.b.eq === undefined && r.b.eq === undefined && l.b.ne === undefined && r.b.ne === undefined) {
      const lo = l.b.min !== undefined ? l.b : r.b
      const hi = l.b.max !== undefined ? l.b : r.b
      if (lo.min !== undefined && hi.max !== undefined && lo !== hi) {
        const op: Op = { type: 'filter_range', column: l.column, min: lo.min, max: hi.max }
        if (lo.minExclusive) op.minExclusive = true
        if (hi.maxExclusive) op.maxExclusive = true
        return op
      }
    }
  }
  throw new Reject(SUBSET_MESSAGE, "Filters: df[df['c'].between(a, b)] or df[df['c'] <= x].")
}

function maskCond(n: Node, column: string): Op {
  const side = (x: Node): { min?: number; max?: number } | null => {
    if (x.k !== 'bin' || colOf(x.l) !== column) return null
    const v = numLit(x.r)
    if (v === undefined) return null
    if (x.op === '<') return { min: v }
    if (x.op === '>') return { max: v }
    return null
  }
  const one = side(n)
  if (one) return { type: 'mask_invalid', column, ...one }
  if (n.k === 'bin' && n.op === '|') {
    const l = side(n.l)
    const r = side(n.r)
    if (l && r) {
      const min = l.min ?? r.min
      const max = l.max ?? r.max
      if (min !== undefined && max !== undefined) return { type: 'mask_invalid', column, min, max }
    }
  }
  throw new Reject(SUBSET_MESSAGE, `Mask form: df.loc[(df['${column}'] < a) | (df['${column}'] > b), '${column}'] = np.nan`)
}

function frameOp(n: Node): Op | null {
  const c = attrCall(n)
  if (!c || !isDf(c.obj)) return null
  switch (c.name) {
    case 'drop_duplicates': {
      const subset = strList(c.kwargs.subset ?? c.args[0])
      if ((c.kwargs.subset || c.args[0]) && !subset) throw new Reject("subset must be a list of column names, for example subset=['student_id'].")
      return subset ? { type: 'drop_duplicates', subset } : { type: 'drop_duplicates' }
    }
    case 'dropna': {
      const subset = strList(c.kwargs.subset)
      if (c.kwargs.subset && !subset) throw new Reject("subset must be a list of column names, for example subset=['attendance'].")
      return subset ? { type: 'dropna', subset } : { type: 'dropna' }
    }
    case 'fillna': {
      const v = c.args[0] ? literal(c.args[0]) : undefined
      if (v === undefined || v === null) throw new Reject('df.fillna() takes one plain value here, for example df.fillna(0).')
      return { type: 'fillna', value: v }
    }
    case 'drop': {
      const target = c.kwargs.index ?? c.args[0]
      const items = target?.k === 'list' ? target.items : target ? [target] : []
      const idxs = items.map(numLit)
      if (!items.length || idxs.some((x) => x === undefined || !Number.isInteger(x))) throw new Reject('Use df.drop(index=[3, 7]) with whole-number row labels.')
      return { type: 'drop_rows', idxs: idxs as number[] }
    }
    default:
      return null
  }
}

function inspectOf(n: Node): InspectQuery | null {
  if (isDf(n)) return { type: 'df' }
  if (isName(n, 'help')) return { type: 'help' }
  if (n.k === 'call' && isName(n.fn, 'help') && n.args.length === 0) return { type: 'help' }
  if (n.k === 'attr' && isDf(n.obj)) {
    if (n.name === 'shape') return { type: 'shape' }
    if (n.name === 'dtypes') return { type: 'dtypes' }
    if (n.name === 'columns') return { type: 'columns' }
  }
  const col = colOf(n)
  if (col !== undefined) return { type: 'column', column: col }
  if (n.k === 'index' && isDf(n.obj) && n.keys.length === 1) {
    const d = attrCall(n.keys[0])
    if (d && d.name === 'duplicated' && isDf(d.obj)) return { type: 'duplicated_rows' }
  }
  const c = attrCall(n)
  if (!c) return null
  if (isDf(c.obj)) {
    const k = numLit(c.args[0] ?? c.kwargs.n)
    if (c.name === 'head') return { type: 'head', n: k ?? 5 }
    if (c.name === 'tail') return { type: 'tail', n: k ?? 5 }
    if (c.name === 'info') return { type: 'info' }
    if (c.name === 'describe') return { type: 'describe' }
  }
  const cc = colOf(c.obj)
  if (cc !== undefined) {
    if (c.name === 'value_counts') return { type: 'value_counts', column: cc }
    if (c.name === 'unique') return { type: 'unique', column: cc }
  }
  if (c.name === 'sum' && c.args.length === 0) {
    const inner = attrCall(c.obj)
    if (inner && (inner.name === 'isnull' || inner.name === 'isna')) {
      if (isDf(inner.obj)) return { type: 'isnull_sum' }
      const ic = colOf(inner.obj)
      if (ic !== undefined) return { type: 'col_isnull_sum', column: ic }
    }
    if (inner && inner.name === 'duplicated' && isDf(inner.obj)) return { type: 'duplicated_sum' }
  }
  return null
}

function interpret(src: string): ParseResult {
  const st = parseStatement(src)
  if (!st.target) {
    const q = inspectOf(st.value)
    if (q) return { kind: 'inspect', query: q, code: inspectCode(q) }
    const op = frameOp(st.value)
    if (op) return ok([op])
    throw new Reject(SUBSET_MESSAGE)
  }
  const t = st.target
  if (isDf(t)) {
    const op = frameOp(st.value)
    if (op) return ok([op])
    if (st.value.k === 'index' && isDf(st.value.obj) && st.value.keys.length === 1) return ok([filterCond(st.value.keys[0])])
    throw new Reject(SUBSET_MESSAGE)
  }
  const tc = colOf(t)
  if (tc !== undefined) {
    const chain = columnChain(st.value)
    if (chain.column !== tc) throw new Reject(`Assign a column from the same column: df['${tc}'] = df['${tc}']...`)
    if (chain.ops.length === 0) throw new Reject('That assignment changes nothing.')
    return ok(chain.ops)
  }
  if (t.k === 'index' && t.obj.k === 'attr' && isDf(t.obj.obj) && t.keys.length === 2) {
    const column = str(t.keys[1])
    if (t.obj.name === 'loc' && column !== undefined) {
      if (!isNan(st.value)) throw new Reject("This console supports df.loc[<condition>, 'c'] = np.nan (mask invalid values).")
      return ok([maskCond(t.keys[0], column)])
    }
    if (t.obj.name === 'at' && column !== undefined) {
      const idx = numLit(t.keys[0])
      const value = literal(st.value)
      if (idx === undefined || !Number.isInteger(idx) || value === undefined) throw new Reject("Use df.at[12, 'c'] = value with a row label and a plain value.")
      return ok([{ type: 'set_cell', idx, column, value }])
    }
  }
  throw new Reject(SUBSET_MESSAGE)
}

function ok(ops: Op[]): ParseResult {
  return { kind: 'ops', ops, code: ops.length === 1 ? toCode(ops[0]) : toCodeLine(ops) }
}

export function inspectCode(q: InspectQuery): string {
  switch (q.type) {
    case 'df': return 'df'
    case 'head': return `df.head(${q.n})`
    case 'tail': return `df.tail(${q.n})`
    case 'shape': return 'df.shape'
    case 'columns': return 'df.columns'
    case 'info': return 'df.info()'
    case 'dtypes': return 'df.dtypes'
    case 'describe': return 'df.describe()'
    case 'isnull_sum': return 'df.isnull().sum()'
    case 'duplicated_sum': return 'df.duplicated().sum()'
    case 'duplicated_rows': return 'df[df.duplicated()]'
    case 'column': return `df['${q.column}']`
    case 'value_counts': return `df['${q.column}'].value_counts()`
    case 'unique': return `df['${q.column}'].unique()`
    case 'col_isnull_sum': return `df['${q.column}'].isnull().sum()`
    case 'help': return 'help'
  }
}

const DEFAULT_SUGGESTION = "Try df.head(), df.isnull().sum(), df.duplicated().sum(), df['c'].value_counts() or type help."

/** Parse one console line. Accepts an optional 'df = ' prefix handled by the grammar, quotes of either kind and # comments. */
export function parse(line: string): ParseResult {
  const src = stripComment(line).trim().replace(/;$/, '').trim()
  if (!src) return { kind: 'error', message: 'Type a command, or help for the list.', suggestion: DEFAULT_SUGGESTION }
  try {
    return interpret(src)
  } catch (e) {
    if (e instanceof Reject) {
      const generic = e.message === SUBSET_MESSAGE
      return { kind: 'error', message: e.message, suggestion: e.suggestion ?? (generic ? DEFAULT_SUGGESTION : undefined) }
    }
    if (e instanceof SyntaxErr) return { kind: 'error', message: `${SUBSET_MESSAGE} (${e.message})`, suggestion: DEFAULT_SUGGESTION }
    throw e
  }
}

// Pandas-like text rendering of frames, series and df.info() for the console.
import { columnDtype, dtypes, isNull, nullCounts } from './dataframe'
import type { Cell, DF, Dtype } from './types'

/** Python-style repr of a cell: 'text', 85.0, 3, True, nan. */
export function pyRepr(c: Cell): string {
  if (isNull(c)) return 'nan'
  if (typeof c === 'string') return `'${c.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (typeof c === 'boolean') return c ? 'True' : 'False'
  return pyNum(c)
}

export function pyNum(n: number, asFloat = false): string {
  if (Number.isNaN(n)) return 'NaN'
  if (!Number.isFinite(n)) return n > 0 ? 'inf' : '-inf'
  if (Number.isInteger(n)) return asFloat ? `${n}.0` : String(n)
  return String(Number(n.toPrecision(12)))
}

function decimalsOf(n: number): number {
  const s = String(Number(n.toPrecision(12)))
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

function columnDecimals(df: DF, col: string): number {
  let d = 1
  for (const r of df.rows) {
    const v = r.v[col]
    if (typeof v === 'number' && Number.isFinite(v)) d = Math.max(d, Math.min(6, decimalsOf(v)))
  }
  return d
}

/** Display text of one cell in a column of the given dtype. */
export function formatCell(c: Cell, dtype: Dtype = 'object', decimals = 1): string {
  if (isNull(c)) return dtype === 'object' ? 'NaN' : 'NaN'
  if (typeof c === 'boolean') return c ? 'True' : 'False'
  if (typeof c === 'number') return dtype === 'float64' ? c.toFixed(decimals) : pyNum(c)
  return c
}

export interface FormatDfOptions {
  maxRows?: number
}

/** Render a frame like print(df). Frames longer than maxRows show the first and last 5 rows. */
export function formatDf(df: DF, opts: FormatDfOptions = {}): string {
  const maxRows = opts.maxRows ?? 60
  if (df.columns.length === 0 || df.rows.length === 0) {
    return `Empty DataFrame\nColumns: [${df.columns.join(', ')}]\nIndex: []`
  }
  const types = dtypes(df)
  const dec: Record<string, number> = {}
  for (const c of df.columns) if (types[c] === 'float64') dec[c] = columnDecimals(df, c)
  const truncated = df.rows.length > maxRows
  const rows = truncated ? [...df.rows.slice(0, 5), null, ...df.rows.slice(-5)] : df.rows
  const idxCol = rows.map((r) => (r ? String(r.idx) : '...'))
  const cols = df.columns.map((c) => {
    const cells = rows.map((r) => (r ? formatCell(r.v[c] ?? null, types[c], dec[c]) : '...'))
    const w = Math.max(c.length, ...cells.map((s) => s.length))
    return { header: c.padStart(w), cells: cells.map((s) => s.padStart(w)) }
  })
  const iw = Math.max(...idxCol.map((s) => s.length))
  const lines = [' '.repeat(iw) + '  ' + cols.map((c) => c.header).join('  ')]
  rows.forEach((_, i) => {
    lines.push(idxCol[i].padEnd(iw) + '  ' + cols.map((c) => c.cells[i]).join('  '))
  })
  if (truncated) lines.push('', `[${df.rows.length} rows x ${df.columns.length} columns]`)
  return lines.join('\n')
}

export interface SeriesOptions {
  name?: string
  dtype: string
  indexName?: string
}

/** Render a Series: left-aligned labels, right-aligned values, pandas footer line. */
export function formatSeries(entries: Array<[string, string]>, opts: SeriesOptions): string {
  const footer = opts.name !== undefined ? `Name: ${opts.name}, dtype: ${opts.dtype}` : `dtype: ${opts.dtype}`
  if (entries.length === 0) return `Series([], ${footer})`
  const lw = Math.max(...entries.map(([l]) => l.length))
  const vw = Math.max(...entries.map(([, v]) => v.length))
  const lines: string[] = []
  if (opts.indexName) lines.push(opts.indexName)
  for (const [l, v] of entries) lines.push(`${l.padEnd(lw)}    ${v.padStart(vw)}`)
  lines.push(footer)
  return lines.join('\n')
}

/** Render df.info(). */
export function info(df: DF): string {
  const n = df.rows.length
  const contiguous = df.rows.every((r, i) => r.idx === i)
  const types = dtypes(df)
  const nulls = nullCounts(df)
  const lines = ["<class 'pandas.core.frame.DataFrame'>"]
  if (n === 0) lines.push('Index: 0 entries')
  else if (contiguous) lines.push(`RangeIndex: ${n} entries, 0 to ${n - 1}`)
  else lines.push(`Index: ${n} entries, ${df.rows[0].idx} to ${df.rows[n - 1].idx}`)
  lines.push(`Data columns (total ${df.columns.length} columns):`)
  const cw = Math.max(6, ...df.columns.map((c) => c.length))
  lines.push(` #   ${'Column'.padEnd(cw)}  Non-Null Count  Dtype  `)
  lines.push(`---  ${'------'.padEnd(cw)}  --------------  -----  `)
  df.columns.forEach((c, i) => {
    const nn = `${n - nulls[c]} non-null`
    lines.push(` ${String(i).padEnd(3)} ${c.padEnd(cw)}  ${nn.padEnd(14)}  ${types[c]}`)
  })
  const tally = new Map<string, number>()
  for (const c of df.columns) tally.set(types[c], (tally.get(types[c]) ?? 0) + 1)
  lines.push(
    'dtypes: ' +
      [...tally.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, k]) => `${t}(${k})`)
        .join(', '),
  )
  return lines.join('\n')
}

/** Cell text for a column, using that column's dtype (handy for table UIs). */
export function displayCell(df: DF, col: string, c: Cell): string {
  const t = columnDtype(df, col)
  return formatCell(c, t, t === 'float64' ? columnDecimals(df, col) : 1)
}

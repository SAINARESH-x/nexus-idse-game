// Runs console inspect queries (df.head(), df.isnull().sum(), value_counts, ...) and renders pandas-like text.
import { columnDtype, describe, dtypes, duplicateMask, head, isNull, nullCounts, shape, tail, unique, valueCounts } from './dataframe'
import { displayCell, formatDf, formatSeries, info, pyNum, pyRepr } from './format'
import { SUPPORTED_COMMANDS } from './parser'
import type { DF, InspectQuery } from './types'

function needCol(df: DF, c: string): string | null {
  return df.columns.includes(c) ? null : `KeyError: '${c}'`
}

/** Execute a read-only query against df and return the text pandas would print. */
export function runInspect(df: DF, q: InspectQuery): string {
  switch (q.type) {
    case 'df':
      return formatDf(df)
    case 'head':
      return formatDf(head(df, q.n))
    case 'tail':
      return formatDf(tail(df, q.n))
    case 'shape': {
      const [r, c] = shape(df)
      return `(${r}, ${c})`
    }
    case 'columns':
      return `Index([${df.columns.map((c) => pyRepr(c)).join(', ')}], dtype='object')`
    case 'info':
      return info(df)
    case 'dtypes': {
      const t = dtypes(df)
      return formatSeries(df.columns.map((c) => [c, t[c]]), { dtype: 'object' })
    }
    case 'describe': {
      const d = describe(df)
      const cols = Object.keys(d)
      if (cols.length === 0) return 'ValueError: no numeric columns to describe (convert text columns to numbers first).'
      const stats = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'] as const
      const cells = cols.map((c) => stats.map((s) => (Number.isNaN(d[c][s]) ? 'NaN' : d[c][s].toFixed(6))))
      const widths = cols.map((c, i) => Math.max(c.length, ...cells[i].map((x) => x.length)))
      const lines = ['     ' + '  ' + cols.map((c, i) => c.padStart(widths[i])).join('  ')]
      stats.forEach((s, si) => lines.push(s.padEnd(5) + '  ' + cols.map((_, i) => cells[i][si].padStart(widths[i])).join('  ')))
      return lines.join('\n')
    }
    case 'isnull_sum': {
      const n = nullCounts(df)
      return formatSeries(df.columns.map((c) => [c, String(n[c])]), { dtype: 'int64' })
    }
    case 'duplicated_sum':
      return String(duplicateMask(df).filter(Boolean).length)
    case 'duplicated_rows': {
      const m = duplicateMask(df)
      return formatDf({ ...df, rows: df.rows.filter((_, i) => m[i]) })
    }
    case 'column': {
      const e = needCol(df, q.column)
      if (e) return e
      const rows = df.rows.length > 60 ? [...df.rows.slice(0, 5), ...df.rows.slice(-5)] : df.rows
      const entries: Array<[string, string]> = rows.map((r) => [String(r.idx), displayCell(df, q.column, r.v[q.column] ?? null)])
      if (df.rows.length > 60) entries.splice(5, 0, ['...', '...'])
      const footer = df.rows.length > 60 ? `Name: ${q.column}, Length: ${df.rows.length}` : q.column
      return formatSeries(entries, { name: footer, dtype: columnDtype(df, q.column) })
    }
    case 'value_counts': {
      const e = needCol(df, q.column)
      if (e) return e
      const t = columnDtype(df, q.column)
      const entries: Array<[string, string]> = valueCounts(df, q.column).map(([v, n]) => [
        typeof v === 'number' ? (t === 'float64' ? pyNum(v, true) : pyNum(v)) : String(v),
        String(n),
      ])
      return formatSeries(entries, { name: 'count', dtype: 'int64', indexName: q.column })
    }
    case 'unique': {
      const e = needCol(df, q.column)
      if (e) return e
      const t = columnDtype(df, q.column)
      const vals = unique(df, q.column).map((v) => (isNull(v) ? 'nan' : typeof v === 'number' ? pyNum(v, t === 'float64') : pyRepr(v)))
      return `array([${vals.join(', ')}]${t === 'object' ? ', dtype=object' : ''})`
    }
    case 'col_isnull_sum': {
      const e = needCol(df, q.column)
      if (e) return e
      return String(nullCounts(df)[q.column])
    }
    case 'help':
      return [
        'Supported commands (a simplified subset of pandas):',
        ...SUPPORTED_COMMANDS.map((c) => `  ${c.code.padEnd(52)} ${c.explain}`),
      ].join('\n')
  }
}

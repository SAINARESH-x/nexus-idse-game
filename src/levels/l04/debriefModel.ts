// Level 04 debrief model (pure): metric sentences, before/after table, missed issues, why-it-matters and ghosts.
import { columnDtype, dropoutRate, isNull, isNumericDtype, liveHealth, mean, median, unique } from '../../engine'
import type { Cell, DF, Flag, Issue, IssueKind, QualityReport, Tier } from '../../engine'
import { ghostSignals } from './ghostHunt'
import { compareStrategy } from './strategyLab'

const pct = (x: number): string => `${Math.round(x * 100)}%`

export interface MetricLine {
  key: string
  label: string
  value: number
  weight: number
  sentence: string
}

export function metricLines(q: QualityReport, opsCount: number, badKept: number, redundant: number): MetricLine[] {
  const lostStudents = Math.round((1 - q.preservation) * 1000) / 1000
  return [
    { key: 'consistency', label: 'Consistency', value: q.consistency, weight: 30, sentence: q.unresolved.length ? `Share of injected issues fixed: ${q.resolved} of ${q.totalIssues}. ${q.unresolved.length} remain (see WHAT YOU MISSED).` : `Share of injected issues fixed: all ${q.totalIssues} are resolved.` },
    { key: 'identification', label: 'Identification', value: q.identification, weight: 15, sentence: q.flagPrecision === null ? 'No corruption report was scored, so identification sits at the 50% default.' : `F1 of your corruption report: precision ${pct(q.flagPrecision)}, recall ${pct(q.flagRecall ?? 0)}.` },
    { key: 'decisions', label: 'Decisions', value: q.decisions, weight: 25, sentence: opsCount === 0 ? 'No operations were applied, so no decision could earn credit.' : badKept ? `${badKept} bad decision(s) were kept, each scoring 0; undone bad decisions still cost a little.` : 'Every judged decision was good or neutral, or was undone in time.' },
    { key: 'preservation', label: 'Preservation', value: q.preservation, weight: 20, sentence: lostStudents > 0 ? `Share of real students kept: ${pct(q.preservation)}. Deleting rows removed legitimate students.` : 'Every legitimate student is still in the table.' },
    { key: 'economy', label: 'Economy', value: q.economy, weight: 10, sentence: opsCount === 0 ? 'No operations applied.' : redundant ? `${redundant} of ${opsCount} operation(s) changed nothing.` : `None of your ${opsCount} operation(s) was redundant.` },
  ]
}

/** Attendance as numbers even while it is still text like '85%' (for the BEFORE column). */
function numericValues(df: DF, col: string): number[] {
  if (!df.columns.includes(col)) return []
  const out: number[] = []
  for (const r of df.rows) {
    const c: Cell = r.v[col] ?? null
    if (typeof c === 'number') out.push(c)
    else if (typeof c === 'string') {
      const n = Number(c.replace('%', '').trim())
      if (c.trim() !== '' && Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

export interface CompareRow {
  label: string
  before: string
  after: string
  changed: boolean
}

const fmt = (x: number | null, d = 1): string => (x === null || Number.isNaN(x) ? 'n/a' : (Math.round(x * 10 ** d) / 10 ** d).toFixed(d))

export function beforeAfterRows(before: DF, after: DF): CompareRow[] {
  const hb = liveHealth(before)
  const ha = liveHealth(after)
  const labels = (df: DF): number => unique(df, 'department').filter((v) => !isNull(v)).length
  const stat = (df: DF, col: string, f: (xs: number[]) => number): number | null => {
    const xs = numericValues(df, col)
    return xs.length ? f(xs) : null
  }
  const dr = (df: DF): string => {
    const d = dropoutRate(df)
    return d === null ? 'n/a' : `${fmt(d * 100)}%`
  }
  const rows: Array<[string, string, string]> = [
    ['Shape', `(${before.rows.length}, ${before.columns.length})`, `(${after.rows.length}, ${after.columns.length})`],
    ['Blank cells (NaN + placeholders)', String(hb.totalNulls + hb.totalPlaceholders), String(ha.totalNulls + ha.totalPlaceholders)],
    ['Duplicate rows', String(hb.normalizedDuplicates), String(ha.normalizedDuplicates)],
    ['Distinct department labels', String(labels(before)), String(labels(after))],
    ['Attendance dtype', columnDtype(before, 'attendance'), columnDtype(after, 'attendance')],
    ['Mean attendance', fmt(stat(before, 'attendance', mean)), fmt(stat(after, 'attendance', mean))],
    ['Median attendance', fmt(stat(before, 'attendance', median)), fmt(stat(after, 'attendance', median))],
    ['Mean cgpa', fmt(stat(before, 'cgpa', mean), 2), fmt(stat(after, 'cgpa', mean), 2)],
    ['Dropout rate', dr(before), dr(after)],
  ]
  return rows.map(([label, b, a]) => ({ label, before: b, after: a, changed: a !== b }))
}

export const FIX_LINE: Record<IssueKind, string> = {
  missing: "df['attendance'] = df['attendance'].fillna(df['attendance'].median())",
  duplicate: 'df = df.drop_duplicates()',
  inconsistent: "df['department'] = df['department'].str.strip().str.title().replace({'Cs': 'Computer Science'})",
  type: "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)",
  invalid: "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan",
}

export interface MissedGroup {
  kind: IssueKind
  count: number
  locations: string[]
  fix: string
}

export function missedGroups(unresolved: Issue[]): MissedGroup[] {
  const kinds: IssueKind[] = ['missing', 'duplicate', 'inconsistent', 'type', 'invalid']
  return kinds
    .map((kind) => {
      const list = unresolved.filter((i) => i.kind === kind)
      const col = list[0]?.column
      let fix = FIX_LINE[kind]
      if (col && (kind === 'missing' || kind === 'type')) fix = fix.split("'attendance'").join(`'${col}'`)
      return { kind, count: list.length, locations: list.slice(0, 5).map((i) => (i.rowIdx >= 0 ? `row ${i.rowIdx}${i.column ? `, ${i.column}` : ''}` : `column ${i.column ?? ''}`)), fix }
    })
    .filter((g) => g.count > 0)
}

export interface NaiveStrategy {
  code: string
  rowsLost: number
  pctLost: number
  dropoutBefore: number | null
  dropoutAfter: number | null
  shiftPts: number | null
  dropoutsLost: number
}

export interface WhyItMatters {
  strategies: NaiveStrategy[]
  expertNote: string | null
}

export function whyItMatters(dirty: DF, tier: Tier): WhyItMatters {
  const run = (code: string, subset?: string[]): NaiveStrategy => {
    const c = compareStrategy(dirty, [{ type: 'dropna', subset }], { tier })
    return { code, rowsLost: c.rowsLost, pctLost: c.pctLost, dropoutBefore: c.dropoutBefore, dropoutAfter: c.dropoutAfter, shiftPts: c.dropoutShiftPts, dropoutsLost: c.dropoutsRemoved }
  }
  const strategies = [run('df = df.dropna()'), run("df = df.dropna(subset=['attendance'])", ['attendance'])]
  let expertNote: string | null = null
  if (tier === 'expert' && dirty.columns.includes('attendance')) {
    const blank = dirty.rows.filter((r) => isNull(r.v.attendance ?? null))
    const rest = dirty.rows.filter((r) => !isNull(r.v.attendance ?? null))
    const rate = (rs: typeof blank): number => (rs.length ? rs.filter((r) => r.v.dropped_out === 1).length / rs.length : 0)
    expertNote = `Informative missingness: ${blank.length} students have blank attendance and ${fmt(rate(blank) * 100)}% of them dropped out, against ${fmt(rate(rest) * 100)}% of the others. The blanks are not random, so deleting them hides exactly the students the analysis is about; fill them and keep the rows.`
  }
  return { strategies, expertNote }
}

export interface GhostLine {
  idx: number
  name: string
  hit: boolean
  signals: string[]
}

export function ghostLines(dirty: DF, ghosts: number[], flags: Flag[]): { lines: GhostLine[]; falsePositives: number[] } {
  const anomaly = new Set(flags.filter((f) => f.kind === 'anomaly').map((f) => f.rowIdx))
  const g = new Set(ghosts)
  const num: DF = { ...dirty, rows: dirty.rows.map((r) => ({ idx: r.idx, v: { ...r.v, attendance: numOrSelf(r.v.attendance ?? null), cgpa: numOrSelf(r.v.cgpa ?? null) } })) }
  return {
    lines: ghosts.map((idx) => ({ idx, name: String(dirty.rows.find((r) => r.idx === idx)?.v.name ?? '?'), hit: anomaly.has(idx), signals: ghostSignals(num, idx) })),
    falsePositives: [...anomaly].filter((x) => !g.has(x)),
  }
}

function numOrSelf(c: Cell): Cell {
  if (typeof c !== 'string') return c
  const n = Number(c.replace('%', '').trim())
  return c.trim() !== '' && Number.isFinite(n) ? n : c
}

/** CSV text of a frame (RFC 4180 quoting; NaN as empty). */
export function toCsv(df: DF): string {
  const esc = (c: Cell): string => {
    if (c === null) return ''
    const s = typeof c === 'boolean' ? (c ? 'True' : 'False') : String(c)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [['', ...df.columns].join(',')]
  for (const r of df.rows) lines.push([String(r.idx), ...df.columns.map((c) => esc(r.v[c] ?? null))].join(','))
  return lines.join('\n')
}

export const numericColumn = (df: DF, col: string): boolean => isNumericDtype(columnDtype(df, col))

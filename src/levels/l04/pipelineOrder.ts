// Pipeline Order side op (pure): six cleaning cards run in the player's order on the independent dataset.
import { assessQuality, clearanceSeed, columnDtype, createDfSession, engineConfig, generateStudents, isNumericDtype, liveHealth, unique } from '../../engine'
import type { DF, Op } from '../../engine'
import { departmentMapping } from './puzzles'

export type CardId = 'dedupe' | 'department' | 'attendance-type' | 'attendance-fill' | 'age' | 'cgpa'

export interface PipelineCard {
  id: CardId
  title: string
  code: string
}

const R = engineConfig.VALID_RANGES

export const PIPELINE_CARDS: PipelineCard[] = [
  { id: 'dedupe', title: 'Drop duplicate rows', code: 'df = df.drop_duplicates()' },
  { id: 'department', title: 'Standardise department (strip + title + replace map)', code: "df['department'] = df['department'].str.strip().str.title().replace({...})" },
  { id: 'attendance-type', title: "Strip '%' and convert attendance to float", code: "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)" },
  { id: 'attendance-fill', title: 'Mask impossible attendance, fill with the median', code: "df['attendance'] = df['attendance'].fillna(df['attendance'].median())" },
  { id: 'age', title: 'Mask invalid age, fill with the median', code: "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan" },
  { id: 'cgpa', title: 'Mask invalid cgpa, fill with the median', code: "df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan" },
]

/** The independent-tier dataset Pipeline Order always runs on (first independent clearance seed). */
export const PIPELINE_SEED = clearanceSeed(0, 'independent')
export const PIPELINE_PASS = 85
export const GOOD_ORDER: CardId[] = ['department', 'dedupe', 'attendance-type', 'attendance-fill', 'age', 'cgpa']

/** Ops for one card, computed from the frame it runs on (the department mapping depends on the labels present). */
export function cardOps(id: CardId, df: DF): Op[] {
  const fill = (column: string): Op => ({ type: 'fillna', column, strategy: 'median' })
  const mask = (column: string): Op => ({ type: 'mask_invalid', column, min: R[column].min, max: R[column].max })
  switch (id) {
    case 'dedupe':
      return [{ type: 'drop_duplicates' }]
    case 'department': {
      const strip: Op = { type: 'str_op', column: 'department', fn: 'strip' }
      const title: Op = { type: 'str_op', column: 'department', fn: 'title' }
      const mapping = departmentMapping(df)
      return Object.keys(mapping).length ? [strip, title, { type: 'replace_map', column: 'department', mapping }] : [strip, title]
    }
    case 'attendance-type':
      return [{ type: 'str_replace', column: 'attendance', old: '%', new: '' }, { type: 'astype', column: 'attendance', to: 'float' }]
    case 'attendance-fill':
      return isNumericDtype(columnDtype(df, 'attendance')) ? [mask('attendance'), fill('attendance')] : [fill('attendance')]
    case 'age':
      return [mask('age'), fill('age')]
    case 'cgpa':
      return isNumericDtype(columnDtype(df, 'cgpa'))
        ? [mask('cgpa'), fill('cgpa')]
        : [{ type: 'to_numeric', column: 'cgpa', errors: 'coerce' }, mask('cgpa'), fill('cgpa')]
  }
}

export interface PipelineStep {
  card: CardId
  ok: boolean
  error?: string
  code: string
  shape: [number, number]
  nulls: number
  duplicates: number
  labels: number
}

export interface PipelineRun {
  steps: PipelineStep[]
  failed: boolean
  integrity: number
  passed: boolean
  explanations: string[]
  final: DF
}

function stats(df: DF): Omit<PipelineStep, 'card' | 'ok' | 'error' | 'code'> {
  const h = liveHealth(df)
  return { shape: [df.rows.length, df.columns.length], nulls: h.totalNulls + h.totalPlaceholders, duplicates: h.normalizedDuplicates, labels: unique(df, 'department').filter((v) => v !== null).length }
}

export function runPipeline(order: CardId[], seed = PIPELINE_SEED): PipelineRun {
  const g = generateStudents({ seed, tier: 'independent' })
  const s = createDfSession(g.dirty, { seed, tier: 'independent' })
  const steps: PipelineStep[] = []
  for (const card of order) {
    const ops = cardOps(card, s.current)
    const r = s.apply(ops, 'ui')
    steps.push({ card, ok: r.ok, error: r.error, code: r.entry?.code ?? ops.map((o) => o.type).join(', '), ...stats(s.current) })
  }
  const q = assessQuality(s.current, { ...g, tier: 'independent', history: s.history, decisions: s.decisions })
  const h = liveHealth(s.current)
  const pos = (id: CardId): number => order.indexOf(id)
  const explanations: string[] = []
  if (pos('dedupe') < pos('department') && h.normalizedDuplicates > 0) {
    explanations.push(`drop_duplicates ran before the department labels were standardised, so ${h.normalizedDuplicates} near-duplicate(s) survived: they only became identical after the clean-up.`)
  }
  if (pos('attendance-fill') < pos('attendance-type')) {
    const fail = steps.find((x) => x.card === 'attendance-fill' && !x.ok)
    explanations.push(`The median fill ran while attendance was still text${fail?.error ? ` (${fail.error})` : ''}. Convert the type first.`)
  }
  if ((h.nulls.attendance ?? 0) > 0) explanations.push(`${h.nulls.attendance} attendance blank(s) remain at the end of the pipeline.`)
  for (const x of steps) if (!x.ok && x.card !== 'attendance-fill') explanations.push(`Step '${x.card}' failed: ${x.error ?? 'unknown error'}`)
  if (explanations.length === 0 && h.total === 0) explanations.push(`Every step ran on data that was ready for it: ${q.resolved} of ${q.totalIssues} issues resolved with ${s.current.rows.length} rows kept.`)
  const failed = steps.some((x) => !x.ok)
  // Pass needs the integrity bar AND a frame with no remaining schema problems, so a wrong order cannot slip through.
  const passed = q.integrity >= PIPELINE_PASS && !failed && h.total === 0
  if (!passed && !failed && h.total > 0 && explanations.length === 0) explanations.push(`${h.total} problem(s) remain after the last step.`)
  return { steps, failed, integrity: q.integrity, passed, explanations, final: s.current }
}

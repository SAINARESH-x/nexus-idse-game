// Stage 2 flag scoring (pure): precision, recall and F1 of the corruption report, with tier-dependent feedback.
import { scoreFlags } from '../../engine'
import type { DF, Flag, FlagKind, Issue, IssueKind, Tier } from '../../engine'

export const ISSUE_KINDS: IssueKind[] = ['missing', 'duplicate', 'inconsistent', 'type', 'invalid']

export const KIND_LABEL: Record<FlagKind, string> = {
  missing: 'Missing',
  duplicate: 'Duplicate',
  inconsistent: 'Inconsistent text',
  type: 'Wrong type',
  invalid: 'Invalid value',
  anomaly: 'Anomaly',
}

/** Stage 2 passes at this F1, or automatically on the second submission (never a soft-lock). */
export const PASS_F1 = 0.6

export interface FlagReport {
  precision: number
  recall: number
  f1: number
  truePositives: number
  falsePositives: number
  missedByKind: Record<IssueKind, number>
  totalByKind: Record<IssueKind, number>
  missed: Issue[]
  ghostsFound: number
  ghostFalsePositives: number
  passed: boolean
  feedback: string[]
}

const sameFlag = (a: Flag, b: Flag): boolean => a.rowIdx === b.rowIdx && a.kind === b.kind && (a.column ?? '') === (b.column ?? '')

/** Adds the flag, or removes it when the same flag is already present (toggle). */
export function toggleFlag(flags: Flag[], flag: Flag): Flag[] {
  return flags.some((f) => sameFlag(f, flag)) ? flags.filter((f) => !sameFlag(f, flag)) : [...flags, flag]
}

function idOf(df: DF | undefined, rowIdx: number): number | null {
  const v = df?.rows.find((r) => r.idx === rowIdx)?.v.student_id ?? null
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\s*\d+\s*$/.test(v)) return Number(v)
  return null
}

/**
 * Normalises flags before scoring: a duplicate flag on ANY copy of a duplicated student counts for that
 * issue (the generator records one copy, the highlights mark the later one); a wrong-type flag on a cell
 * counts as the column-level type issue. Duplicates of the same normalised flag are removed.
 */
export function normaliseFlags(flags: Flag[], issues: Issue[], dirty?: DF): Flag[] {
  const out: Flag[] = []
  for (const f of flags) {
    let n: Flag = f
    if (f.kind === 'duplicate') {
      const id = idOf(dirty, f.rowIdx)
      const match = issues.find((i) => i.kind === 'duplicate' && (i.rowIdx === f.rowIdx || (id !== null && i.truth === id)))
      n = { rowIdx: match ? match.rowIdx : f.rowIdx, kind: 'duplicate' }
    } else if (f.kind === 'type' && f.column) {
      const colIssue = issues.find((i) => i.kind === 'type' && i.column === f.column)
      if (colIssue) n = { rowIdx: colIssue.rowIdx, column: f.column, kind: 'type' }
    }
    if (!out.some((o) => sameFlag(o, n))) out.push(n)
  }
  return out
}

const pct = (x: number): number => Math.round(x * 100)

export function scoreReport(flags: Flag[], issues: Issue[], ghosts: number[], tier: Tier, submission: number, dirty?: DF): FlagReport {
  const norm = normaliseFlags(flags, issues, dirty)
  const s = scoreFlags(norm, issues, ghosts)
  const issueFlags = norm.filter((f) => f.kind !== 'anomaly')
  const matched = new Set<string>()
  let tp = 0
  for (const f of issueFlags) {
    const m = issues.find((i) => i.kind === f.kind && i.rowIdx === f.rowIdx && (i.column === undefined || f.column === undefined || i.column === f.column))
    if (m) {
      tp += 1
      matched.add(m.id)
    }
  }
  const missed = issues.filter((i) => !matched.has(i.id))
  const zero = (): Record<IssueKind, number> => ({ missing: 0, duplicate: 0, inconsistent: 0, type: 0, invalid: 0 })
  const missedByKind = zero()
  const totalByKind = zero()
  for (const i of issues) totalByKind[i.kind] += 1
  for (const i of missed) missedByKind[i.kind] += 1
  const passed = s.f1 >= PASS_F1 || submission >= 2

  const feedback: string[] = []
  feedback.push(`Report accuracy: ${pct(s.f1)} percent (F1).`)
  if (tier !== 'expert') {
    feedback.push(`Precision ${pct(s.precision)} percent: ${tp} of ${issueFlags.length} flags matched a real issue. Recall ${pct(s.recall)} percent: ${matched.size} of ${issues.length} issues found.`)
  }
  if (tier === 'assisted') {
    for (const i of missed.slice(0, 12)) feedback.push(`Missed ${KIND_LABEL[i.kind].toLowerCase()}: ${i.rowIdx >= 0 ? `row ${i.rowIdx}` : 'column'}${i.column ? `, ${i.column}` : ''}. ${i.note}.`)
    if (missed.length > 12) feedback.push(`...and ${missed.length - 12} more.`)
  } else if (tier === 'independent') {
    for (const k of ISSUE_KINDS) if (missedByKind[k] > 0) feedback.push(`${KIND_LABEL[k]}: ${missedByKind[k]} of ${totalByKind[k]} not flagged.`)
  }
  if (issueFlags.length - tp > 0 && tier !== 'expert') feedback.push(`${issueFlags.length - tp} flag(s) did not match a known issue (wrong brush or a clean cell).`)
  feedback.push('Anomaly flags are scored separately and never count against this report.')
  if (!passed) feedback.push(`Reach ${pct(PASS_F1)} percent to pass, or submit once more to continue anyway.`)
  return {
    precision: s.precision,
    recall: s.recall,
    f1: s.f1,
    truePositives: tp,
    falsePositives: issueFlags.length - tp,
    missedByKind,
    totalByKind,
    missed,
    ghostsFound: s.ghostsFound,
    ghostFalsePositives: s.ghostFalsePositives,
    passed,
    feedback,
  }
}

/** Per-brush counts for the CORRUPTION REPORT panel. */
export function countFlags(flags: Flag[]): Record<FlagKind, number> {
  const c: Record<FlagKind, number> = { missing: 0, duplicate: 0, inconsistent: 0, type: 0, invalid: 0, anomaly: 0 }
  for (const f of flags) c[f.kind] += 1
  return c
}

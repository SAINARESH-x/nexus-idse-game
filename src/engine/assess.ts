// assessQuality: ground-truth scoring of a cleaned frame (integrity, efficiency and the five metrics).
import { DECISION_VALUE, EFFICIENCY_FLOOR, IDENTIFICATION_DEFAULT, INTEGRITY_WEIGHTS, PAR_OPS, PLACEHOLDERS, VALID_RANGES } from './config'
import { columnDtype, isNull, isNumericDtype } from './dataframe'
import type { HistoryEntry, JudgedDecision } from './session'
import type { Cell, DF, Issue, IssueKind, Tier } from './types'

export { liveHealth, problemsAt, cellKey } from './health'
export type { LiveHealth, CellProblem } from './health'
export { judgeOp, dropoutRate } from './judge'
export type { JudgeCtx } from './judge'

export type FlagKind = IssueKind | 'anomaly'

/** A player flag from Stage 2. rowIdx -1 with a column = a column-level flag. 'anomaly' = ghost brush. */
export interface Flag {
  rowIdx: number
  column?: string
  kind: FlagKind
}

export interface AssessCtx {
  clean: DF
  dirty: DF
  issues: Issue[]
  ghosts: number[]
  tier: Tier
  /** Omit when the player submitted no flags (identification then defaults to 0.5). */
  flags?: Flag[]
  /** Applied history entries (session.history: up to the cursor). */
  history: HistoryEntry[]
  /** Every judged decision with its undone status (session.decisions). */
  decisions: JudgedDecision[]
}

export interface QualityReport {
  consistency: number
  identification: number
  decisions: number
  preservation: number
  economy: number
  integrity: number
  efficiency: number
  counts: { before: number; after: number }
  resolved: number
  totalIssues: number
  unresolved: Issue[]
  ghostsFound: number
  ghostFalsePositives: number
  flagPrecision: number | null
  flagRecall: number | null
}

const isPlaceholder = (c: Cell): boolean => typeof c === 'string' && (PLACEHOLDERS as readonly string[]).includes(c.trim())

function idOf(c: Cell): number | null {
  if (typeof c === 'number') return c
  if (typeof c === 'string' && /^\s*\d+\s*$/.test(c)) return Number(c)
  return null
}

export function isIssueResolved(issue: Issue, df: DF): boolean {
  const row = df.rows.find((r) => r.idx === issue.rowIdx)
  const cell = row && issue.column ? (row.v[issue.column] ?? null) : null
  switch (issue.kind) {
    case 'duplicate': {
      const id = idOf(issue.truth ?? null)
      return df.rows.filter((r) => idOf(r.v.student_id ?? null) === id).length <= 1
    }
    case 'type':
      return issue.column !== undefined && df.columns.includes(issue.column) && isNumericDtype(columnDtype(df, issue.column))
    case 'missing':
      return !row || (!isNull(cell) && !isPlaceholder(cell))
    case 'inconsistent':
      return !row || cell === issue.truth
    case 'invalid': {
      if (!row || isNull(cell)) return true
      const r = issue.column ? VALID_RANGES[issue.column] : undefined
      return typeof cell === 'number' && (!r || (cell >= r.min && cell <= r.max))
    }
  }
}

function flagMatches(f: Flag, i: Issue): boolean {
  return f.kind === i.kind && f.rowIdx === i.rowIdx && (i.column === undefined || f.column === undefined || f.column === i.column)
}

export function scoreFlags(flags: Flag[], issues: Issue[], ghosts: number[]) {
  const issueFlags = flags.filter((f) => f.kind !== 'anomaly')
  const anomaly = flags.filter((f) => f.kind === 'anomaly')
  const ghostSet = new Set(ghosts)
  const ghostRows = new Set(anomaly.map((f) => f.rowIdx))
  const ghostsFound = [...ghostRows].filter((r) => ghostSet.has(r)).length
  const ghostFalsePositives = [...ghostRows].filter((r) => !ghostSet.has(r)).length
  const hit = new Set<string>()
  let tpFlags = 0
  for (const f of issueFlags) {
    const m = issues.find((i) => flagMatches(f, i))
    if (m) {
      tpFlags += 1
      hit.add(m.id)
    }
  }
  const precision = issueFlags.length ? tpFlags / issueFlags.length : 0
  const recall = issues.length ? hit.size / issues.length : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  return { f1, precision, recall, ghostsFound, ghostFalsePositives }
}

export function decisionValue(d: JudgedDecision): number | null {
  if (d.decision.redundant) return null
  if (d.decision.good === false) return d.undone ? DECISION_VALUE.badUndone : DECISION_VALUE.badKept
  if (d.undone) return null
  return d.decision.good === true ? DECISION_VALUE.good : DECISION_VALUE.neutral
}

export function assessQuality(current: DF, ctx: AssessCtx): QualityReport {
  const unresolved = ctx.issues.filter((i) => !isIssueResolved(i, current))
  const total = ctx.issues.length
  const consistency = total ? (total - unresolved.length) / total : 1

  const ghostSet = new Set(ctx.ghosts)
  const legitIds = new Set(ctx.clean.rows.filter((r) => !ghostSet.has(r.idx)).map((r) => idOf(r.v.student_id ?? null)))
  const present = new Set(current.rows.map((r) => idOf(r.v.student_id ?? null)))
  const kept = [...legitIds].filter((id) => present.has(id)).length
  const preservation = legitIds.size ? kept / legitIds.size : 1

  const opsCount = ctx.history.length
  let decisions = 0
  let economy = 0
  if (opsCount > 0) {
    const vals = ctx.decisions.map(decisionValue).filter((v): v is number => v !== null)
    decisions = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1
    const redundant = ctx.history.filter((e) => e.decision?.redundant).length
    economy = 1 - redundant / Math.max(1, opsCount)
  }

  let identification = IDENTIFICATION_DEFAULT
  let ghostsFound = 0
  let ghostFalsePositives = 0
  let flagPrecision: number | null = null
  let flagRecall: number | null = null
  if (ctx.flags) {
    const s = scoreFlags(ctx.flags, ctx.issues, ctx.ghosts)
    identification = s.f1
    ghostsFound = s.ghostsFound
    ghostFalsePositives = s.ghostFalsePositives
    flagPrecision = s.precision
    flagRecall = s.recall
  }

  const W = INTEGRITY_WEIGHTS
  const integrity = W.consistency * consistency + W.identification * identification + W.decisions * decisions + W.preservation * preservation + W.economy * economy
  const par = PAR_OPS[ctx.tier]
  const efficiency = Math.min(1, Math.max(EFFICIENCY_FLOOR, opsCount ? par / opsCount : 1)) * 100

  return {
    consistency,
    identification,
    decisions,
    preservation,
    economy,
    integrity,
    efficiency,
    counts: { before: ctx.dirty.rows.length, after: current.rows.length },
    resolved: total - unresolved.length,
    totalIssues: total,
    unresolved,
    ghostsFound,
    ghostFalsePositives,
    flagPrecision,
    flagRecall,
  }
}

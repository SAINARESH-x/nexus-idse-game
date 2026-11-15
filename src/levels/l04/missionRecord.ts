// Level 04 mission record (pure + storage): the JSON saved under 'nexus-l04-session' and its replay-based restore.
import { fromJSON, generateStudents } from '../../engine'
import type { DfSession, Flag, QualityReport, SessionJSON, Tier } from '../../engine'
import type { AwardSummary } from '../../game/progression'
import type { ChallengeResult, Decision, MissionAggregate, Rating } from '../../game/types'
import type { MissionBonusAward } from '../../shell/missionSession'

export const L04_KEY = 'nexus-l04-session'
export const STAGE_COUNT = 4

export interface PuzzlePick {
  entryId: string
  puzzleId: string
  decision: Decision
}

export interface FinishedReport {
  quality: QualityReport
  flagScore: { f1: number; precision: number; recall: number; ghostsFound: number; ghostFalsePositives: number } | null
  results: ChallengeResult[]
  aggregate: MissionAggregate
  composite: number
  rating: Rating
  award: AwardSummary | null
  bonuses: MissionBonusAward[]
  facts: Record<string, number | string | boolean>
  finishedAt: number
}

export interface L04Record {
  v: 1
  status: 'active' | 'finished'
  seed: number
  tier: Tier
  attemptIndex: number
  session: SessionJSON
  /** 0..3 */
  stage: number
  stage1: { shape: boolean; dtypes: boolean; marks: Array<{ rowIdx: number; column?: string }> }
  flags: Flag[]
  stage2: { submissions: number; passed: boolean; f1: number | null; feedback: string[] }
  stage3: { builderRepair: boolean; fillBlank: boolean; skipped: boolean; introSeen: boolean; tipShown: boolean }
  stage4: { checksRun: boolean }
  /** Hints revealed per stage (0..3 each). */
  hints: number[]
  /** Analyst Scan activations that cost a hint, per stage. */
  scanHints: number[]
  scanOn: boolean
  /** Stage index where the free adaptive scan is active, or -1. */
  freeScanStage: number
  assistOffered: boolean
  adaptiveAssistUsed: boolean
  /** session.decisions.length when the current stage started (stage-scoped struggle signal). */
  stageDecisionStart: number
  puzzlePicks: PuzzlePick[]
  report?: FinishedReport
}

export function newRecord(seed: number, tier: Tier, attemptIndex: number, session: SessionJSON): L04Record {
  return {
    v: 1,
    status: 'active',
    seed,
    tier,
    attemptIndex,
    session,
    stage: 0,
    stage1: { shape: false, dtypes: false, marks: [] },
    flags: [],
    stage2: { submissions: 0, passed: false, f1: null, feedback: [] },
    stage3: { builderRepair: false, fillBlank: false, skipped: false, introSeen: false, tipShown: false },
    stage4: { checksRun: false },
    hints: [0, 0, 0, 0],
    scanHints: [0, 0, 0, 0],
    scanOn: false,
    freeScanStage: -1,
    assistOffered: false,
    adaptiveAssistUsed: false,
    stageDecisionStart: 0,
    puzzlePicks: [],
  }
}

export const totalHints = (r: L04Record): number => [...r.hints, ...r.scanHints].reduce((a, b) => a + b, 0)

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const TIERS: Tier[] = ['assisted', 'independent', 'expert']

/** Structural validation; returns null for anything that is not a usable record. */
export function validateRecord(raw: unknown): L04Record | null {
  if (!isObj(raw) || raw.v !== 1) return null
  if (raw.status !== 'active' && raw.status !== 'finished') return null
  if (typeof raw.seed !== 'number' || typeof raw.attemptIndex !== 'number' || !TIERS.includes(raw.tier as Tier)) return null
  if (typeof raw.stage !== 'number' || raw.stage < 0 || raw.stage >= STAGE_COUNT) return null
  if (!isObj(raw.session) || !isObj(raw.stage1) || !isObj(raw.stage2) || !isObj(raw.stage3) || !isObj(raw.stage4)) return null
  if (!Array.isArray(raw.flags) || !Array.isArray(raw.hints) || !Array.isArray(raw.scanHints) || !Array.isArray(raw.puzzlePicks)) return null
  if (raw.status === 'finished' && !isObj(raw.report)) return null
  return raw as unknown as L04Record
}

/** Replays the stored ops on the regenerated dirty frame. Throws on a broken history. */
export function restoreSession(record: L04Record): DfSession {
  return fromJSON(record.session, () => generateStudents({ seed: record.seed, tier: record.tier }).dirty)
}

export type LoadResult = { kind: 'none' } | { kind: 'corrupt' } | { kind: 'ok'; record: L04Record; session: DfSession }

export function loadRecord(storage: Storage | undefined = safeStorage()): LoadResult {
  let text: string | null = null
  try {
    text = storage?.getItem(L04_KEY) ?? null
  } catch {
    return { kind: 'none' }
  }
  if (text === null) return { kind: 'none' }
  try {
    const record = validateRecord(JSON.parse(text))
    if (!record) return { kind: 'corrupt' }
    return { kind: 'ok', record, session: restoreSession(record) }
  } catch {
    return { kind: 'corrupt' }
  }
}

export function saveRecord(record: L04Record, storage: Storage | undefined = safeStorage()): boolean {
  try {
    storage?.setItem(L04_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export function clearRecord(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.removeItem(L04_KEY)
  } catch {
    // Blocked storage: nothing to clear.
  }
}

/** True when an unfinished mission is saved (drives CONTINUE MISSION on the briefing). */
export function hasActiveRecord(storage: Storage | undefined = safeStorage()): boolean {
  const r = loadRecord(storage)
  return r.kind === 'ok' && r.record.status === 'active'
}

export function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

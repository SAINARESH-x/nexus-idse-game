// Level 05-07 session records (pure): seeds, the persisted record shape, parsing with repair rules, and storage helpers.
import type { AwardSummary } from './progression'
import type { ChallengeResult, LevelId } from './types'

/** Distinct seeds per level; attempts wrap after this many replays (documented in PROGRESS.md). */
export const SEED_SLOTS = 50

export const sessionSeed = (levelId: number, attemptIndex: number): number =>
  levelId * 1000 + (((Math.floor(attemptIndex) % SEED_SLOTS) + SEED_SLOTS) % SEED_SLOTS) * 17

export const sessionKey = (levelId: LevelId): string => `nexus-l${String(levelId).padStart(2, '0')}-session`

export type StageStatus = 'locked' | 'open' | 'done'

export interface StageRecord {
  status: StageStatus
  hintsUsed: number
  mistakes: number
  /** Player inputs and progress only (never datasets or simulation output). */
  state: unknown
  /** The stage's ChallengeResult once it is done (needed to score a resumed mission). */
  result?: ChallengeResult
}

/** The serialisable part of a finished run, enough for F5 on the debrief. */
export interface SessionReport {
  summary: unknown
  award: AwardSummary | null
}

export interface LevelSessionRecord {
  v: 1
  levelId: LevelId
  attemptIndex: number
  seed: number
  status: 'active' | 'finished'
  stageId: string
  stages: Record<string, StageRecord>
  objectives: string[]
  report?: SessionReport
}

/** Validates one stage's `state`; return the cleaned state or null when it is invalid. */
export type StageStateValidator = (raw: unknown) => unknown | null

export interface ParseContext {
  stageIds: readonly string[]
  attempts: number
  validators?: Record<string, StageStateValidator>
  initialStates?: Record<string, unknown>
}

export type ParseSessionResult =
  | { ok: true; session: LevelSessionRecord; repairs: string[] }
  | { ok: false; reason: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0

const STAGE_STATUSES: readonly StageStatus[] = ['locked', 'open', 'done']

export function createSessionRecord(
  levelId: LevelId,
  attemptIndex: number,
  stageIds: readonly string[],
  initialStates: Record<string, unknown> = {},
): LevelSessionRecord {
  const stages: Record<string, StageRecord> = {}
  stageIds.forEach((id, index) => {
    stages[id] = {
      status: index === 0 ? 'open' : 'locked',
      hintsUsed: 0,
      mistakes: 0,
      state: initialStates[id] ?? null,
    }
  })
  return {
    v: 1,
    levelId,
    attemptIndex,
    seed: sessionSeed(levelId, attemptIndex),
    status: 'active',
    stageId: stageIds[0] ?? '',
    stages,
    objectives: [],
  }
}

function isChallengeResult(value: unknown): value is ChallengeResult {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    ['accuracy', 'decisionQuality', 'efficiency', 'hintsUsed', 'mistakes'].every(
      (key) => typeof value[key] === 'number' && Number.isFinite(value[key]),
    ) &&
    Array.isArray(value.decisions)
  )
}

/**
 * Parses a raw stored value. Steps 1 and 2 (JSON, version, ids, seed, attempt
 * index, status, stage id) invalidate the whole record. Step 3 repairs stage
 * entries one by one: an invalid state resets only that stage, stages after
 * the current one are locked, unknown keys are dropped, counters are clamped.
 */
export function parseSession(levelId: LevelId, raw: string | null, ctx: ParseContext): ParseSessionResult {
  if (raw === null) return { ok: false, reason: 'missing' }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'Saved session is not valid JSON.' }
  }
  if (!isRecord(value)) return { ok: false, reason: 'Saved session is not an object.' }
  if (value.v !== 1) return { ok: false, reason: 'Unsupported session version.' }
  if (value.levelId !== levelId) return { ok: false, reason: 'Session belongs to another level.' }
  if (!isInt(value.seed) || !isInt(value.attemptIndex) || value.attemptIndex < 0) {
    return { ok: false, reason: 'Session seed or attempt index is not an integer.' }
  }
  if (value.seed !== sessionSeed(levelId, value.attemptIndex)) {
    return { ok: false, reason: 'Session seed does not match its attempt.' }
  }
  if (value.attemptIndex >= ctx.attempts) {
    return { ok: false, reason: 'Session was not started from a counted mission.' }
  }
  if (value.status !== 'active' && value.status !== 'finished') {
    return { ok: false, reason: 'Session status is invalid.' }
  }
  if (typeof value.stageId !== 'string' || !ctx.stageIds.includes(value.stageId)) {
    return { ok: false, reason: 'Session stage is not part of this level.' }
  }

  const repairs: string[] = []
  const rawStages = isRecord(value.stages) ? value.stages : {}
  const currentIndex = ctx.stageIds.indexOf(value.stageId)
  const stages: Record<string, StageRecord> = {}
  ctx.stageIds.forEach((id, index) => {
    const entry = rawStages[id]
    const initialState = ctx.initialStates?.[id] ?? null
    if (index > currentIndex) {
      stages[id] = { status: 'locked', hintsUsed: 0, mistakes: 0, state: initialState }
      return
    }
    if (!isRecord(entry)) {
      repairs.push(`${id}: missing stage entry reset`)
      stages[id] = { status: index === currentIndex ? 'open' : 'done', hintsUsed: 0, mistakes: 0, state: initialState }
      return
    }
    let status: StageStatus = STAGE_STATUSES.includes(entry.status as StageStatus) ? (entry.status as StageStatus) : 'open'
    if (index < currentIndex && status !== 'done') status = 'done'
    if (index === currentIndex && status === 'locked') status = 'open'
    let state: unknown = entry.state ?? null
    const validator = ctx.validators?.[id]
    if (validator) {
      let cleaned: unknown | null = null
      try {
        cleaned = state === null ? initialState : validator(state)
      } catch {
        cleaned = null
      }
      if (cleaned === null && state !== null) {
        repairs.push(`${id}: invalid saved state reset`)
        state = initialState
      } else {
        state = cleaned
      }
    }
    const result = isChallengeResult(entry.result) ? entry.result : undefined
    if (status === 'done' && !result) {
      // A done stage must carry its result to be scored; reopen it instead.
      repairs.push(`${id}: missing result, stage reopened`)
      status = 'open'
    }
    stages[id] = {
      status,
      hintsUsed: count(entry.hintsUsed),
      mistakes: count(entry.mistakes),
      state,
      ...(result ? { result } : {}),
    }
  })

  // If an earlier stage was reopened, the current stage moves back to it.
  const firstOpen = ctx.stageIds.find((id) => stages[id].status !== 'done') ?? value.stageId
  const stageId = ctx.stageIds.indexOf(firstOpen) < currentIndex ? firstOpen : value.stageId
  ctx.stageIds.forEach((id, index) => {
    if (index > ctx.stageIds.indexOf(stageId) && stages[id].status !== 'locked') {
      stages[id] = { ...stages[id], status: 'locked', result: undefined }
    }
  })

  const objectives = Array.isArray(value.objectives)
    ? value.objectives.filter((item): item is string => typeof item === 'string')
    : []
  const report = isRecord(value.report) ? (value.report as unknown as SessionReport) : undefined

  return {
    ok: true,
    repairs,
    session: {
      v: 1,
      levelId,
      attemptIndex: value.attemptIndex,
      seed: value.seed,
      status: value.status,
      stageId,
      stages,
      objectives,
      ...(report && value.status === 'finished' ? { report } : {}),
    },
  }
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Reads and parses a level session; storage errors count as missing. */
export function readSession(levelId: LevelId, ctx: ParseContext): ParseSessionResult {
  let raw: string | null = null
  try {
    raw = storage()?.getItem(sessionKey(levelId)) ?? null
  } catch {
    raw = null
  }
  return parseSession(levelId, raw, ctx)
}

/** Writes a session; returns false when storage is unavailable or full (QuotaExceeded). */
export function writeSession(record: LevelSessionRecord): boolean {
  try {
    const store = storage()
    if (!store) return false
    store.setItem(sessionKey(record.levelId), JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export function removeSession(levelId: LevelId): void {
  try {
    storage()?.removeItem(sessionKey(levelId))
  } catch {
    // ignore: nothing to remove when storage is unavailable
  }
}

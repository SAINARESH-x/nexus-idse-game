// Level 05-07 session record tests: seeds, round trip, whole-record failures and per-stage repairs.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  SEED_SLOTS,
  createSessionRecord,
  parseSession,
  readSession,
  removeSession,
  sessionKey,
  sessionSeed,
  writeSession,
} from '../levelSession'
import type { ParseContext } from '../levelSession'
import type { ChallengeResult } from '../types'

const STAGES = ['l6-stage-1', 'l6-stage-2', 'l6-stage-3'] as const
const isN = (raw: unknown) =>
  typeof raw === 'object' && raw !== null && typeof (raw as { n?: unknown }).n === 'number' ? raw : null
const ctx = (attempts = 1, stageIds: readonly string[] = STAGES): ParseContext => ({
  stageIds,
  attempts,
  validators: { 'l6-stage-1': isN },
  initialStates: { 'l6-stage-1': { n: 5 } },
})
const result = (id: string): ChallengeResult => ({
  id,
  accuracy: 1,
  decisionQuality: 1,
  efficiency: 1,
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
})

beforeEach(() => localStorage.clear())

describe('sessionSeed', () => {
  it('stays inside the level range and wraps after SEED_SLOTS attempts', () => {
    expect(sessionSeed(6, 0)).toBe(6000)
    expect(sessionSeed(6, 1)).toBe(6017)
    expect(sessionSeed(6, SEED_SLOTS)).toBe(sessionSeed(6, 0))
    expect(sessionSeed(7, SEED_SLOTS - 1)).toBeLessThan(8000)
  })
})

describe('parseSession', () => {
  it('round-trips a populated record without changing the seed', () => {
    const record = createSessionRecord(6, 0, STAGES, { 'l6-stage-1': { n: 5 } })
    record.stages['l6-stage-1'] = { status: 'done', hintsUsed: 2, mistakes: 1, state: { n: 200 }, result: result('l6-stage-1') }
    record.stages['l6-stage-2'] = { status: 'open', hintsUsed: 0, mistakes: 0, state: { pairs: [1, 2] } }
    record.stageId = 'l6-stage-2'
    record.objectives = ['obj-a']
    const parsed = parseSession(6, JSON.stringify(record), ctx())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.repairs).toEqual([])
    expect(parsed.session.seed).toBe(6000)
    expect(parsed.session.stages['l6-stage-1'].state).toEqual({ n: 200 })
    expect(parsed.session.stages['l6-stage-1'].hintsUsed).toBe(2)
    expect(parsed.session.objectives).toEqual(['obj-a'])
  })

  it.each([
    ['bad JSON', '{oops'],
    ['wrong version', JSON.stringify({ ...createSessionRecord(6, 0, STAGES), v: 2 })],
    ['wrong level', JSON.stringify(createSessionRecord(5, 0, STAGES))],
    ['NaN seed', JSON.stringify({ ...createSessionRecord(6, 0, STAGES), seed: 'NaN' })],
    ['seed mismatch', JSON.stringify({ ...createSessionRecord(6, 0, STAGES), seed: 1 })],
    ['uncounted attempt', JSON.stringify(createSessionRecord(6, 3, STAGES))],
    ['unknown stage', JSON.stringify({ ...createSessionRecord(6, 0, STAGES), stageId: 'nope' })],
  ])('rejects the whole record on %s', (_label, raw) => {
    expect(parseSession(6, raw, ctx()).ok).toBe(false)
  })

  it('rejects a stage id that a two-stage lean registry does not have', () => {
    const record = { ...createSessionRecord(6, 0, STAGES), stageId: 'l6-stage-3' }
    expect(parseSession(6, JSON.stringify(record), ctx(1, ['l6-stage-1', 'l6-stage-2'])).ok).toBe(false)
  })

  it('resets only the stage whose state is invalid and clamps counters', () => {
    const record = createSessionRecord(6, 0, STAGES)
    record.stages['l6-stage-1'] = { status: 'open', hintsUsed: -4, mistakes: 2.7, state: { n: 'many' } }
    const parsed = parseSession(6, JSON.stringify({ ...record, extra: 'drop me' }), ctx())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.repairs).toHaveLength(1)
    expect(parsed.session.stages['l6-stage-1'].state).toEqual({ n: 5 })
    expect(parsed.session.stages['l6-stage-1'].hintsUsed).toBe(0)
    expect(parsed.session.stages['l6-stage-1'].mistakes).toBe(2)
    expect('extra' in parsed.session).toBe(false)
  })

  it('locks stages after the current one and reopens a done stage without a result', () => {
    const record = createSessionRecord(6, 0, STAGES)
    record.stageId = 'l6-stage-2'
    record.stages['l6-stage-1'] = { status: 'done', hintsUsed: 0, mistakes: 0, state: { n: 9 } }
    record.stages['l6-stage-3'] = { status: 'open', hintsUsed: 0, mistakes: 0, state: null }
    const parsed = parseSession(6, JSON.stringify(record), ctx())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.session.stageId).toBe('l6-stage-1')
    expect(parsed.session.stages['l6-stage-1'].status).toBe('open')
    expect(parsed.session.stages['l6-stage-3'].status).toBe('locked')
  })

  it('restores a finished record with its report', () => {
    const record = { ...createSessionRecord(6, 0, STAGES), status: 'finished' as const, report: { summary: { a: 1 }, award: null } }
    const parsed = parseSession(6, JSON.stringify(record), ctx())
    expect(parsed.ok && parsed.session.report?.summary).toEqual({ a: 1 })
  })
})

describe('storage helpers', () => {
  it('writes, reads and removes under the level key', () => {
    const record = createSessionRecord(7, 0, STAGES)
    expect(writeSession(record)).toBe(true)
    expect(localStorage.getItem(sessionKey(7))).not.toBeNull()
    expect(readSession(7, ctx()).ok).toBe(true)
    removeSession(7)
    expect(readSession(7, ctx()).ok).toBe(false)
  })
})

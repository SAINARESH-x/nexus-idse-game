// Level 06 bonus evaluators, definition shape and persisted-state validators.
import { describe, expect, it } from 'vitest'
import type { MissionSession } from '../../../game/types'
import { fishingExpedition, noAssistance, replicator } from '../bonuses'
import { LEVEL_6 } from '../definition'
import { L06_RUNTIME } from '../runtime'
import { PROBABILITY_INITIAL, SAMPLING_INITIAL, VERDICT_INITIAL, validateProbability, validateSampling, validateVerdict } from '../stageStates'

const result = (id: string, extra?: Record<string, number | string | boolean>) => ({ id, accuracy: 1, decisionQuality: 1, efficiency: 1, hintsUsed: 0, mistakes: 0, decisions: [], extra })
const session = (p: Partial<MissionSession>): MissionSession => ({
  levelId: 6, kind: 'main', results: {}, hintsUsed: 0, mistakes: 0, decisions: [], facts: {}, ...p,
})
const all = { 'l6-stage-1': result('l6-stage-1'), 'l6-stage-2': result('l6-stage-2'), 'l6-stage-3': result('l6-stage-3') }

describe('Level 06 bonuses', () => {
  it('replicator needs 3 stable re-runs', () => {
    expect(replicator(session({ facts: { l6Reruns: 3, l6VerdictStable: true } }))).toBe(true)
    expect(replicator(session({ facts: { l6Reruns: 2, l6VerdictStable: true } }))).toBe(false)
    expect(replicator(session({ facts: { l6Reruns: 5, l6VerdictStable: false } }))).toBe(false)
    expect(replicator(session({ results: { 'l6-stage-3': result('l6-stage-3', { l6Reruns: 3, l6VerdictStable: true }) } }))).toBe(true)
  })
  it('no assistance needs zero hints and all stages', () => {
    expect(noAssistance(session({ results: all }))).toBe(true)
    expect(noAssistance(session({ results: all, hintsUsed: 1 }))).toBe(false)
    expect(noAssistance(session({ results: { 'l6-stage-1': all['l6-stage-1'] } }))).toBe(false)
    expect(noAssistance(session({ results: all, kind: 'side' }))).toBe(false)
  })
  it('fishing expedition reads the flag fact', () => {
    expect(fishingExpedition(session({ facts: { l6FalsePositiveFlagged: true } }))).toBe(true)
    expect(fishingExpedition(session({}))).toBe(false)
  })
  it('definition shape', () => {
    expect(LEVEL_6.stages.map((s) => s.id)).toEqual(['l6-stage-1', 'l6-stage-2', 'l6-stage-3'])
    expect(LEVEL_6.sideOps.map((s) => s.id)).toEqual(['l6-side-1', 'l6-side-2'])
    for (const s of [...LEVEL_6.stages, ...LEVEL_6.sideOps]) expect(s.hints).toHaveLength(3)
    expect(LEVEL_6.bonuses.map((b) => [b.id, b.hidden])).toEqual([['l6-bonus-1', false], ['l6-bonus-2', false], ['l6-bonus-hidden', true]])
    expect(LEVEL_6.fragmentId).toBe('F6')
    expect(L06_RUNTIME.persistent?.validators?.['l6-stage-2']).toBe(validateSampling)
  })
})

describe('Level 06 validators', () => {
  it('accept initial and plain-JSON round trips', () => {
    expect(validateProbability(JSON.parse(JSON.stringify(PROBABILITY_INITIAL)))).toEqual(PROBABILITY_INITIAL)
    expect(validateSampling(JSON.parse(JSON.stringify({ ...SAMPLING_INITIAL, lastRun: { n: 50, method: 'random', runIndex: 2 } })))).not.toBeNull()
    expect(validateVerdict(JSON.parse(JSON.stringify({ ...VERDICT_INITIAL, flagged: [3], shuffles: 1000 })))).not.toBeNull()
  })
  it('reject corrupted state', () => {
    expect(validateProbability(null)).toBeNull()
    expect(validateProbability({ ...PROBABILITY_INITIAL, k: 7 })).toBeNull()
    expect(validateProbability({ ...PROBABILITY_INITIAL, miss: { a: -1, b: 0, c: 0 } })).toBeNull()
    expect(validateSampling({ ...SAMPLING_INITIAL, n: 9999 })).toBeNull()
    expect(validateSampling({ ...SAMPLING_INITIAL, method: 'stratified' })).toBeNull()
    expect(validateVerdict({ ...VERDICT_INITIAL, alpha: 0.1 })).toBeNull()
    expect(validateVerdict({ ...VERDICT_INITIAL, flagged: [42] })).toBeNull()
    expect(validateVerdict([])).toBeNull()
  })
})

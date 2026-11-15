// Level 02 bonus evaluator tests: rule economy, first-run functions and hidden dead code.
import { describe, expect, it } from 'vitest'
import { LEVEL_2 } from '../definition'
import { deadCode, elegantRules, zeroRetries } from '../bonuses'
import type { ChallengeResult, MissionSession } from '../../../game/types'

const result = (id: string, extra: ChallengeResult['extra'] = {}): ChallengeResult => ({
  id,
  accuracy: 1,
  decisionQuality: 1,
  efficiency: 1,
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  extra,
})

const session = (
  results: Record<string, ChallengeResult>,
  facts: MissionSession['facts'] = {},
): MissionSession => ({
  levelId: 2,
  kind: 'main',
  results,
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  facts,
})

describe('level 02 bonuses', () => {
  it('pays ELEGANT RULES only for a solved stack of four rules or fewer', () => {
    expect(elegantRules(session({ 'l2-stage-1': result('l2-stage-1', { elegant: true }) }))).toBe(true)
    expect(elegantRules(session({ 'l2-stage-1': result('l2-stage-1', { elegant: false }) }))).toBe(false)
    expect(elegantRules(session({}))).toBe(false)
  })

  it('pays ZERO RETRIES only when every function test passed on the first run', () => {
    expect(zeroRetries(session({ 'l2-stage-3': result('l2-stage-3', { zeroRetries: true }) }))).toBe(true)
    expect(zeroRetries(session({ 'l2-stage-3': result('l2-stage-3', { zeroRetries: false }) }))).toBe(false)
  })

  it('finds the hidden DEAD CODE fact in the session or the stage result', () => {
    expect(deadCode(session({}, { deadCodeSpotted: true }))).toBe(true)
    expect(deadCode(session({ 'l2-stage-1': result('l2-stage-1', { deadCodeSpotted: true }) }))).toBe(true)
    expect(deadCode(session({}))).toBe(false)
  })

  it('wires the evaluators to the real bonus definitions', () => {
    const scene = session({
      'l2-stage-1': result('l2-stage-1', { elegant: true, deadCodeSpotted: true }),
      'l2-stage-3': result('l2-stage-3', { zeroRetries: true }),
    })
    expect(LEVEL_2.bonuses.map((bonus) => bonus.evaluate(scene))).toEqual([true, true, true])
  })
})

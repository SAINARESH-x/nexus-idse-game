// Bonus evaluator tests: pure functions over a completed Level 01 session.
import { describe, expect, it } from 'vitest'
import type { ChallengeResult, MissionSession } from '../../../game/types'
import { cleanSweep, easterEgg, noAssistance } from '../bonuses'

const result = (overrides: Partial<ChallengeResult> = {}): ChallengeResult => ({
  id: 'stage',
  accuracy: 1,
  decisionQuality: 1,
  efficiency: 1,
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  ...overrides,
})

const session = (overrides: Partial<MissionSession> = {}): MissionSession => ({
  levelId: 1,
  kind: 'main',
  results: {
    'l1-stage-1': result({ id: 'l1-stage-1' }),
    'l1-stage-2': result({ id: 'l1-stage-2' }),
    'l1-stage-3': result({ id: 'l1-stage-3' }),
  },
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  facts: {},
  ...overrides,
})

describe('Level 01 bonuses', () => {
  it('CLEAN SWEEP requires a mistake-free Intake Sorting stage', () => {
    expect(cleanSweep(session())).toBe(true)
    expect(cleanSweep(session({ results: { 'l1-stage-1': result({ id: 'l1-stage-1', mistakes: 1 }) } }))).toBe(false)
    expect(cleanSweep(session({ results: {} }))).toBe(false)
  })

  it('NO ASSISTANCE requires a hint-free main mission with all stages', () => {
    expect(noAssistance(session())).toBe(true)
    expect(noAssistance(session({ hintsUsed: 1 }))).toBe(false)
    expect(noAssistance(session({ kind: 'side' }))).toBe(false)
    expect(
      noAssistance(
        session({
          results: { 'l1-stage-1': result({ id: 'l1-stage-1' }) },
        }),
      ),
    ).toBe(false)
  })

  it('EASTER EGG reads either the flattened fact or the stage extra', () => {
    expect(easterEgg(session())).toBe(false)
    expect(easterEgg(session({ facts: { easterEgg: true } }))).toBe(true)
    expect(
      easterEgg(
        session({
          results: {
            'l1-stage-2': result({ id: 'l1-stage-2', extra: { easterEgg: true } }),
          },
        }),
      ),
    ).toBe(true)
  })
})

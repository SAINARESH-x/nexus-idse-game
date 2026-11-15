// Level 03 bonus evaluator tests: one-line drift search, no hints and the hidden pattern.
import { describe, expect, it } from 'vitest'
import { LEVEL_3 } from '../definition'
import { driftPattern, noHints, oneLiner } from '../bonuses'
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

const results = (): Record<string, ChallengeResult> => ({
  'l3-stage-1': result('l3-stage-1'),
  'l3-stage-2': result('l3-stage-2'),
  'l3-stage-3': result('l3-stage-3', { oneLiner: true, patternNoticed: true }),
})

const session = (patch: Partial<MissionSession> = {}): MissionSession => ({
  levelId: 3,
  kind: 'main',
  results: results(),
  hintsUsed: 0,
  mistakes: 0,
  decisions: [],
  facts: {},
  ...patch,
})

describe('level 03 bonuses', () => {
  it('pays ONE-LINER only when the chained argmax expression was used', () => {
    expect(oneLiner(session())).toBe(true)
    expect(
      oneLiner(
        session({
          results: {
            ...results(),
            'l3-stage-3': result('l3-stage-3', { oneLiner: false }),
          },
        }),
      ),
    ).toBe(false)
  })

  it('pays NO HINTS only for a complete main mission with zero hints', () => {
    expect(noHints(session())).toBe(true)
    expect(noHints(session({ hintsUsed: 1 }))).toBe(false)
    expect(noHints(session({ kind: 'side' }))).toBe(false)
    const missingStage = results()
    delete missingStage['l3-stage-2']
    expect(noHints(session({ results: missingStage }))).toBe(false)
  })

  it('finds the hidden PATTERN fact in the session or the stage result', () => {
    expect(driftPattern(session({ facts: { patternNoticed: true } }))).toBe(true)
    expect(
      driftPattern(
        session({
          results: {
            ...results(),
            'l3-stage-3': result('l3-stage-3', { patternNoticed: true }),
          },
        }),
      ),
    ).toBe(true)
    expect(
      driftPattern(
        session({
          results: {
            ...results(),
            'l3-stage-3': result('l3-stage-3', { patternNoticed: false }),
          },
          facts: { patternNoticed: false },
        }),
      ),
    ).toBe(false)
  })

  it('wires the evaluators to the real bonus definitions', () => {
    expect(LEVEL_3.bonuses.map((bonus) => bonus.evaluate(session()))).toEqual([true, true, true])
  })
})

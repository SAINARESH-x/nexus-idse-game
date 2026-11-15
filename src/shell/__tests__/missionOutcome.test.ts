// Mission aggregation: stage results must become one deterministic composite.
import { describe, expect, it } from 'vitest'
import { compositeScore } from '../../game/progression'
import type { ChallengeResult } from '../../game/types'
import { buildMissionOutcome } from '../missionOutcome'

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

describe('buildMissionOutcome', () => {
  it('aggregates three perfect stages into a 100 composite and an S rating', () => {
    const outcome = buildMissionOutcome(
      1,
      'main',
      [
        result({ id: 'l1-stage-1' }),
        result({ id: 'l1-stage-2' }),
        result({ id: 'l1-stage-3' }),
      ],
      0,
    )
    expect(outcome.composite).toBeCloseTo(100)
    expect(outcome.rating).toBe('S')
    expect(outcome.session.results['l1-stage-2']).toBeDefined()
    expect(outcome.hintsUsed).toBe(0)
  })

  it('averages accuracy, decision quality and efficiency', () => {
    const outcome = buildMissionOutcome(
      1,
      'main',
      [
        result({ id: 'a' }),
        result({
          id: 'b',
          accuracy: 0.5,
          decisionQuality: 0.5,
          efficiency: 0.5,
          hintsUsed: 1,
          mistakes: 2,
          decisions: [{ label: 'Wrong drop', good: false, explanation: 'Quoted text is a string.' }],
        }),
      ],
      1,
    )
    expect(outcome.aggregate.accuracy).toBeCloseTo(0.75)
    expect(outcome.aggregate.decisionQuality).toBeCloseTo(0.75)
    expect(outcome.aggregate.efficiency).toBeCloseTo(0.75)
    expect(outcome.mistakes).toBe(2)
    expect(outcome.hintsUsed).toBe(1)
    expect(outcome.composite).toBeCloseTo(77.25)
    expect(outcome.rating).toBe('A')
    expect(outcome.decisions).toHaveLength(1)
  })

  it('uses the shell hint counter and merges extra facts', () => {
    const outcome = buildMissionOutcome(
      1,
      'main',
      [
        result({ id: 'one', extra: { easterEgg: true, firstTryCorrect: 9 } }),
        result({ id: 'two', extra: { firstTryCorrect: 3 } }),
      ],
      2,
    )
    expect(outcome.hintsUsed).toBe(2)
    expect(outcome.session.hintsUsed).toBe(2)
    expect(outcome.facts.easterEgg).toBe(true)
    expect(outcome.facts.firstTryCorrect).toBe(3)
  })

  it('matches the shared composite formula', () => {
    const outcome = buildMissionOutcome(1, 'side', [result()], 0)
    expect(outcome.composite).toBeCloseTo(compositeScore(outcome.aggregate))
  })
})

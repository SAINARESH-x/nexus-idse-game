// Level 02/03 wiring tests: real definitions replace placeholders and every challenge id resolves.
import { describe, expect, it } from 'vitest'
import { LEVEL_BY_ID, LEVELS, visibleBonuses } from '../../../game/levels/registry'
import { LEVEL_2 } from '../definition'
import { LEVEL_3 } from '../../l03/definition'
import { L02_OBJECTIVES, L02_SIDE_OBJECTIVES, L02_STAGES, L02_SIDE_OPS } from '../content'
import { L03_OBJECTIVES, L03_SIDE_OBJECTIVES, L03_STAGES, L03_SIDE_OPS } from '../../l03/content'
import { renderL02Challenge } from '../challenges'
import { renderL03Challenge } from '../../l03/challenges'
import type { ChallengeProps } from '../../../game/types'

const props: ChallengeProps = {
  id: 'probe',
  difficulty: 'assisted',
  hints: [],
  onComplete: () => {
    throw new Error('probe component should not complete')
  },
}

describe('level 02 wiring', () => {
  it('uses the real Level 02 definition in the registry', () => {
    expect(LEVELS[1]).toBe(LEVEL_2)
    expect(LEVEL_BY_ID[2]).toBe(LEVEL_2)
    expect(LEVEL_2.objectives).toEqual(L02_OBJECTIVES.map((objective) => objective.label))
    expect(LEVEL_2.stages).toEqual(L02_STAGES)
    expect(LEVEL_2.sideOps).toEqual(L02_SIDE_OPS)
  })

  it('wires the two visible bonuses and the hidden one to real evaluators', () => {
    expect(visibleBonuses(2).map((bonus) => bonus.title)).toEqual(['ELEGANT RULES', 'ZERO RETRIES'])
    expect(LEVEL_2.bonuses.find((bonus) => bonus.hidden)?.title).toBe('DEAD CODE')
  })

  it('defines side-op objectives for both side ops', () => {
    for (const op of L02_SIDE_OPS) {
      expect(L02_SIDE_OBJECTIVES[op.id]).toBeTruthy()
    }
  })

  it('resolves every Level 02 stage and side-op challenge id', () => {
    for (const stage of [...L02_STAGES, ...L02_SIDE_OPS]) {
      expect(renderL02Challenge(stage.id, props)).not.toBeNull()
    }
    expect(renderL02Challenge('unknown', props)).toBeNull()
  })
})

describe('level 03 wiring', () => {
  it('uses the real Level 03 definition in the registry', () => {
    expect(LEVELS[2]).toBe(LEVEL_3)
    expect(LEVEL_BY_ID[3]).toBe(LEVEL_3)
    expect(LEVEL_3.objectives).toEqual(L03_OBJECTIVES.map((objective) => objective.label))
    expect(LEVEL_3.stages).toEqual(L03_STAGES)
    expect(LEVEL_3.sideOps).toEqual(L03_SIDE_OPS)
  })

  it('wires the two visible bonuses and the hidden one to real evaluators', () => {
    expect(visibleBonuses(3).map((bonus) => bonus.title)).toEqual(['ONE-LINER', 'NO HINTS'])
    expect(LEVEL_3.bonuses.find((bonus) => bonus.hidden)?.title).toBe('PATTERN')
  })

  it('defines side-op objectives for both side ops', () => {
    for (const op of L03_SIDE_OPS) {
      expect(L03_SIDE_OBJECTIVES[op.id]).toBeTruthy()
    }
  })

  it('resolves every Level 03 stage and side-op challenge id', () => {
    for (const stage of [...L03_STAGES, ...L03_SIDE_OPS]) {
      expect(renderL03Challenge(stage.id, props)).not.toBeNull()
    }
    expect(renderL03Challenge('unknown', props)).toBeNull()
  })
})
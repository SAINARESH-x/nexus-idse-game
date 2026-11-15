// Registry integrity: counts derive from the registry, match EXPECTED_SHAPE, 3 hints everywhere, unique ids and fragments.
import { describe, expect, it } from 'vitest'
import { getRegistryCounts } from '../counts'
import { LEVELS } from '../registry'

/** The only hand-written copy of the level shapes (AGENTS.md section 8, normal configuration). */
const EXPECTED_SHAPE: Record<number, { stages: number; sideOps: number; visible: number; hidden: number }> = {
  1: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
  2: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
  3: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
  4: { stages: 4, sideOps: 2, visible: 2, hidden: 1 },
  5: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
  6: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
  7: { stages: 3, sideOps: 2, visible: 2, hidden: 1 },
}

describe('registry integrity', () => {
  const counts = getRegistryCounts(LEVELS)

  it('derives counts from the definition arrays', () => {
    for (const level of LEVELS) {
      expect(counts.perLevel[level.id]).toEqual({
        stages: level.stages.length,
        sideOps: level.sideOps.length,
        bonusesVisible: level.bonuses.filter((b) => !b.hidden).length,
        bonusesHidden: level.bonuses.filter((b) => b.hidden).length,
      })
    }
    expect(counts.sideOps).toBe(LEVELS.reduce((sum, level) => sum + level.sideOps.length, 0))
  })

  it('matches EXPECTED_SHAPE for every level', () => {
    for (const level of LEVELS) {
      const shape = EXPECTED_SHAPE[level.id]
      expect(counts.perLevel[level.id]).toEqual({
        stages: shape.stages,
        sideOps: shape.sideOps,
        bonusesVisible: shape.visible,
        bonusesHidden: shape.hidden,
      })
    }
  })

  it('gives every stage and side op exactly 3 hints', () => {
    for (const level of LEVELS) {
      for (const item of [...level.stages, ...level.sideOps]) expect(item.hints, `${item.id}`).toHaveLength(3)
    }
  })

  it('uses unique ids and fragments F1 to F7', () => {
    const ids = LEVELS.flatMap((level) => [...level.stages, ...level.sideOps, ...level.bonuses].map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(LEVELS.map((level) => level.fragmentId)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'])
    expect(LEVELS.every((level) => level.stages.length >= 1)).toBe(true)
  })
})

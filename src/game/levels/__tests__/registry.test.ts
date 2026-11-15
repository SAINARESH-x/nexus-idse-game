// Registry shape test: level counts must match the campaign table in AGENTS.md.
import { describe, expect, it } from 'vitest'
import { FRAGMENT_TEXT, LEVELS, parseLevelId, visibleBonuses } from '../registry'

describe('level registry', () => {
  it('has seven levels with the documented stage, side-op and bonus counts', () => {
    expect(LEVELS).toHaveLength(7)
    expect(LEVELS.map((level) => level.stages.length)).toEqual([3, 3, 3, 4, 3, 3, 3])
    for (const level of LEVELS) {
      expect(level.sideOps).toHaveLength(2)
      expect(visibleBonuses(level.id)).toHaveLength(2)
      expect(level.bonuses.filter((bonus) => bonus.hidden)).toHaveLength(1)
      expect(level.objectives.length).toBeGreaterThan(0)
      expect(FRAGMENT_TEXT[level.fragmentId]).toBeTruthy()
    }
  })

  it('keeps the Level 04 stage names from the phase brief', () => {
    expect(LEVELS[3].stages.map((stage) => stage.title)).toEqual([
      'DATABASE BREACH',
      'IDENTIFY THE CORRUPTION',
      'DATA RECONSTRUCTION',
      'INTEGRITY CHECK',
    ])
  })

  it('parses only real level route ids', () => {
    expect(parseLevelId('4')).toBe(4)
    expect(parseLevelId('0')).toBeNull()
    expect(parseLevelId('8')).toBeNull()
    expect(parseLevelId(undefined)).toBeNull()
  })
})

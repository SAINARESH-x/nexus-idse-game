// Integration tests for the persisted campaign store and its public actions.
import { beforeEach, describe, expect, it } from 'vitest'
import { DEV_DEMO_AGGREGATE } from '../config'
import { rankForXp } from '../progression'
import { useGameStore } from '../store'
import type { LevelId } from '../types'

const state = () => useGameStore.getState()

beforeEach(() => {
  state().resetAll()
})

describe('campaign lifecycle', () => {
  it('creates a new game with Level 1 open and zero progress', () => {
    state().newGame('Test')
    expect(state().profile.callsign).toBe('Test')
    expect(state().profile.xp).toBe(0)
    expect(state().profile.credits).toBe(0)
    expect(state().levels[1].unlocked).toBe(true)
    expect(state().levels[2].unlocked).toBe(false)
    expect(state().fragments).toEqual([])
  })

  it('rejects an invalid callsign without changing the save', () => {
    state().newGame('Test')
    state().newGame('ab')
    expect(state().profile.callsign).toBe('Test')
  })

  it('completes Level 1, awards XP/credits and unlocks Level 2 only', () => {
    state().newGame('Test')
    const award = state().completeMission(1, DEV_DEMO_AGGREGATE)
    expect(award.xpGained).toBe(120)
    expect(award.creditsGained).toBe(60)
    expect(award.composite).toBeCloseTo(100)
    expect(award.rating).toBe('S')
    expect(state().profile.xp).toBe(120)
    expect(state().profile.credits).toBe(60)
    expect(state().levels[1].completed).toBe(true)
    expect(state().levels[1].rating).toBe('S')
    expect(state().levels[2].unlocked).toBe(true)
    expect(state().levels[3].unlocked).toBe(false)
    expect(state().fragments).toEqual(['F1'])
  })

  it('pays nothing for a repeated main mission with no improvement', () => {
    state().newGame('Test')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    const replay = state().completeMission(1, DEV_DEMO_AGGREGATE)
    expect(replay.xpGained).toBe(0)
    expect(replay.creditsGained).toBe(0)
    expect(state().profile.xp).toBe(120)
    expect(state().levels[1].attempts).toBe(2)
    expect(state().fragments).toEqual(['F1'])
  })

  it('awards side operations and bonuses exactly once', () => {
    state().newGame('Test')
    const side = state().completeSideOp(1, 'l1-side-1', 2)
    expect(side.xpGained).toBe(40)
    expect(state().completeSideOp(1, 'l1-side-1', 0).xpGained).toBe(0)
    expect(state().levels[1].sideOpsDone).toEqual(['l1-side-1'])

    const bonus = state().completeBonus(1, 'l1-bonus-1')
    expect(bonus.xpGained).toBe(40)
    expect(state().completeBonus(1, 'l1-bonus-1').xpGained).toBe(0)
    expect(state().completeBonus(1, 'l1-bonus-hidden').xpGained).toBe(60)
    expect(state().levels[1].bonusesEarned).toHaveLength(2)
  })

  it('marks stages complete and ignores unknown stages', () => {
    state().newGame('Test')
    state().completeStage(1, 'l1-stage-1')
    expect(state().levels[1].stats['stage:l1-stage-1']).toBe(true)
    state().completeStage(1, 'does-not-exist')
    expect(state().levels[1].stats['stage:does-not-exist']).toBeUndefined()
  })
})

describe('dev actions', () => {
  it('adds XP and credits and crosses a rank threshold', () => {
    state().newGame('Test')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    state().addXp(500)
    expect(state().profile.xp).toBe(620)
    expect(state().profile.credits).toBe(310)
    expect(rankForXp(state().profile.xp).name).toBe('Junior Analyst')
  })

  it('unlocks every level', () => {
    state().newGame('Test')
    state().unlockAll()
    expect([1, 2, 3, 4, 5, 6, 7].every((id) => state().levels[id as LevelId].unlocked)).toBe(true)
  })
})

describe('save import and export', () => {
  it('round-trips a campaign save', () => {
    state().newGame('Pilot')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    const exported = state().exportSave()

    state().resetAll()
    expect(state().profile.callsign).toBe('')
    expect(state().profile.xp).toBe(0)

    const result = state().importSave(exported)
    expect(result.ok).toBe(true)
    expect(state().profile.callsign).toBe('Pilot')
    expect(state().profile.xp).toBe(120)
    expect(state().levels[1].completed).toBe(true)
    expect(state().levels[2].unlocked).toBe(true)
    expect(state().fragments).toEqual(['F1'])
  })

  it('rejects malformed JSON and wrong schemas without touching the save', () => {
    state().newGame('Pilot')
    expect(state().importSave('not json').ok).toBe(false)
    expect(state().importSave('{"version":1,"data":{"profile":{}}}').ok).toBe(false)
    expect(state().importSave(JSON.stringify({ version: 99, data: {} })).ok).toBe(false)
    expect(state().profile.callsign).toBe('Pilot')
  })

  it('clears every nexus key on reset', () => {
    state().newGame('Pilot')
    localStorage.setItem('nexus-l01-session', 'temporary')
    state().resetAll()
    expect(localStorage.getItem('nexus-save-v1')).toBeNull()
    expect(localStorage.getItem('nexus-l01-session')).toBeNull()
    expect(state().profile.callsign).toBe('')
    expect(state().levels[1].completed).toBe(false)
    expect(state().levels[2].unlocked).toBe(false)
  })

  it('rehydrates the campaign from localStorage after a reload', async () => {
    state().newGame('Pilot')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    const stored = localStorage.getItem('nexus-save-v1')
    expect(stored).not.toBeNull()

    state().resetAll()
    localStorage.setItem('nexus-save-v1', stored ?? '')
    await useGameStore.persist.rehydrate()

    expect(state().profile.callsign).toBe('Pilot')
    expect(state().profile.xp).toBe(120)
    expect(state().levels[1].completed).toBe(true)
    expect(state().levels[2].unlocked).toBe(true)
  })
})

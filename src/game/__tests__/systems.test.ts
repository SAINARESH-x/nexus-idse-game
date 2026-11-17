// Phase 12 systems: achievements (normal and lean registries), sync-once, Tool Bay, settings, migration and persistence.
import { beforeEach, describe, expect, it } from 'vitest'
import { achievementContext, achievementsFor, evaluateAchievements } from '../achievements'
import { DEV_DEMO_AGGREGATE, SAVE_KEY } from '../config'
import { LEVELS } from '../levels/registry'
import { clearCorruptSave, corruptSave, migrateSave, saveStorage } from '../persistence'
import { normalizeSettings } from '../settings'
import { createDefaultSaveData, useGameStore } from '../store'
import { availableThemes, buy, canBuy } from '../toolbay'
import type { LevelDefinition, SaveData } from '../types'

const state = () => useGameStore.getState()

const baseSave = (): SaveData => ({ ...createDefaultSaveData(), profile: { ...createDefaultSaveData().profile, callsign: 'Ana' } })

/** A lean registry: fewer side ops and no hidden bonuses on two levels. */
const leanRegistry: LevelDefinition[] = LEVELS.map((level) =>
  level.id === 5 || level.id === 6
    ? { ...level, sideOps: level.sideOps.slice(0, 1), bonuses: level.bonuses.filter((bonus) => !bonus.hidden) }
    : level,
)

const fullSave = (registry: readonly LevelDefinition[]): SaveData => {
  const save = baseSave()
  for (const level of registry) {
    save.levels[level.id] = {
      ...save.levels[level.id],
      unlocked: true,
      completed: true,
      rating: 'S',
      sideOpsDone: level.sideOps.map((op) => op.id),
      bonusesEarned: level.bonuses.map((bonus) => bonus.id),
      stats: { minHints: 0 },
    }
  }
  save.levels[4].stats = { minHints: 0, bestIntegrity: 96, bestEfficiency: 100, tiersCleared: 'assisted,independent,expert', ghostsFound: 4 }
  save.levels[7].stats = { minHints: 0, holdoutR2: 0.61, valR2: 0.63, peeked: false, leakReported: true }
  save.campaignComplete = true
  save.profile.xp = 2700
  save.owned = ['theme-magenta']
  return save
}

beforeEach(() => {
  clearCorruptSave()
  useGameStore.getState().resetAll()
})

describe('achievements', () => {
  it.each([
    ['normal', LEVELS],
    ['lean', leanRegistry],
  ])('every rule is reachable with a full save on the %s registry and none on an empty one', (_name, registry) => {
    const catalogue = achievementsFor(registry)
    expect(evaluateAchievements(fullSave(registry), registry).sort()).toEqual(catalogue.map((item) => item.id).sort())
    expect(evaluateAchievements(baseSave(), registry)).toEqual([])
  })

  it('derives side-op thresholds from the registry', () => {
    const fieldAgent = achievementsFor(LEVELS).find((item) => item.id === 'field-agent')
    const save = baseSave()
    const total = LEVELS.reduce((sum, level) => sum + level.sideOps.length, 0)
    const progress = fieldAgent?.progress?.(achievementContext(save, LEVELS))
    expect(progress?.target).toBe(Math.ceil(total / 2))
  })

  it('drops secret-seeker when the registry has no hidden bonuses', () => {
    const noHidden = LEVELS.map((level) => ({ ...level, bonuses: level.bonuses.filter((bonus) => !bonus.hidden) }))
    expect(achievementsFor(noHidden).some((item) => item.id === 'secret-seeker')).toBe(false)
  })

  it('rejects each rule individually when its condition is missing', () => {
    const save = fullSave(LEVELS)
    save.levels[4].stats = { minHints: 0, bestIntegrity: 94, bestEfficiency: 98, tiersCleared: 'assisted', ghostsFound: 3 }
    save.levels[7].stats = { holdoutR2: 0.5, valR2: 0.7, peeked: false, leakReported: false }
    const earned = evaluateAchievements(save, LEVELS)
    for (const id of ['data-janitor', 'par-ace', 'expert-cleaner', 'all-clearances', 'ghost-hunter', 'honest-forecaster', 'leak-detector']) {
      expect(earned).not.toContain(id)
    }
  })

  it('syncs once through the store and queues a toast', () => {
    state().newGame('Ana')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    expect(state().achievements).toContain('first-contact')
    expect(state().recentAchievements).toContain('first-contact')
    state().clearRecentAchievements()
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    expect(state().achievements.filter((id) => id === 'first-contact')).toHaveLength(1)
    expect(state().recentAchievements).toEqual([])
  })
})

describe('tool bay', () => {
  it('checks credits, buys once and lists themes', () => {
    const save = baseSave()
    expect(canBuy(save, 'theme-magenta')).toEqual({ ok: false, reason: 'credits', missing: 200 })
    save.profile.credits = 250
    expect(canBuy(save, 'theme-magenta')).toEqual({ ok: true })
    const bought = buy(save, 'theme-magenta')
    expect(bought?.profile.credits).toBe(50)
    expect(bought?.owned).toEqual(['theme-magenta'])
    expect(buy({ ...save, owned: ['theme-magenta'] }, 'theme-magenta')).toBeNull()
    expect(canBuy(save, 'nope').ok).toBe(false)
    expect(availableThemes([])).toEqual(['nexus', 'theme-magenta', 'theme-amber', 'theme-matrix', 'theme-crimson'])
  })

  it('spends credits in the store and unlocks supply-run', () => {
    state().newGame('Ana')
    state().addXp(500)
    expect(state().buyItem('theme-magenta')).toBe(true)
    expect(state().profile.credits).toBe(50)
    expect(state().achievements).toContain('supply-run')
    state().setTheme('theme-magenta')
    expect(state().profile.theme).toBe('theme-magenta')
    state().setTheme('theme-amber')
    expect(state().profile.theme).toBe('theme-amber')
    state().setTheme('theme-crimson')
    expect(state().profile.theme).toBe('theme-crimson')
    state().setTheme('invalid-theme')
    expect(state().profile.theme).toBe('theme-crimson')
  })
})

describe('settings', () => {
  it('normalises bad values and persists updates', () => {
    expect(normalizeSettings({ volume: 7, reducedMotion: 'x', textSize: 3 })).toEqual({ volume: 1, reducedMotion: 'auto', textSize: 100 })
    state().newGame('Ana')
    state().updateSettings({ textSize: 115, reducedMotion: 'on' })
    expect(state().settings).toMatchObject({ textSize: 115, reducedMotion: 'on' })
    state().setSoundOn(false)
    expect(state().profile.soundOn).toBe(false)
  })
})

describe('save migration and corruption', () => {
  it('migrates three older shapes', () => {
    const modern = baseSave()
    const noAttempts = JSON.parse(JSON.stringify(modern))
    for (const id of Object.keys(noAttempts.levels)) delete noAttempts.levels[id].attempts
    expect(migrateSave(noAttempts)?.levels[1].attempts).toBe(0)
    const noExtras = JSON.parse(JSON.stringify(modern))
    delete noExtras.campaignComplete
    delete noExtras.owned
    delete noExtras.achievements
    expect(migrateSave(noExtras)).toMatchObject({ campaignComplete: false, owned: [], achievements: [] })
    const noStats = JSON.parse(JSON.stringify(modern))
    for (const id of Object.keys(noStats.levels)) delete noStats.levels[id].stats
    delete noStats.adaptive
    expect(migrateSave(noStats)?.levels[3].stats).toEqual({})
    expect(migrateSave({ profile: 3 })).toBeNull()
  })

  it('import rejects a broken file without touching the current save', () => {
    state().newGame('Ana')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    const before = state().exportSave()
    expect(state().importSave(before.slice(0, -5)).ok).toBe(false)
    expect(state().exportSave()).toBe(before)
    const legacy = JSON.parse(before)
    delete legacy.data.owned
    expect(state().importSave(JSON.stringify(legacy)).ok).toBe(true)
  })

  it('keeps an unreadable save untouched and reports it for recovery', () => {
    localStorage.setItem(SAVE_KEY, '{"state": {broken')
    expect(saveStorage.getItem(SAVE_KEY)).toBeNull()
    expect(corruptSave()).toBe('{"state": {broken')
    saveStorage.setItem(SAVE_KEY, { state: baseSave(), version: 1 })
    expect(localStorage.getItem(SAVE_KEY)).toBe('{"state": {broken')
    clearCorruptSave()
    saveStorage.setItem(SAVE_KEY, { state: baseSave(), version: 1 })
    expect(localStorage.getItem(SAVE_KEY)).not.toBe('{"state": {broken')
  })

  it('treats a reset (empty callsign) save as empty, not corrupt', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: createDefaultSaveData(), version: 1 }))
    expect(saveStorage.getItem(SAVE_KEY)).toBeNull()
    expect(corruptSave()).toBeNull()
  })

  it('resetAll clears every nexus- key', () => {
    localStorage.setItem('nexus-l05-session', '1')
    localStorage.setItem('nexus-l07-session', '1')
    localStorage.setItem('other-app', '1')
    state().resetAll()
    expect(localStorage.getItem('nexus-l05-session')).toBeNull()
    expect(localStorage.getItem('nexus-l07-session')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('1')
  })
})

describe('sound', () => {
  it('never throws without an AudioContext and stays silent before a gesture', async () => {
    const { playSound, unlockAudio, configureSound, resetSoundForTest } = await import('../sound')
    resetSoundForTest()
    expect(playSound('click')).toBe(false)
    unlockAudio()
    expect(() => playSound('success')).not.toThrow()
    configureSound({ enabled: false, volume: 1 })
    expect(playSound('achievement')).toBe(false)
  })
})

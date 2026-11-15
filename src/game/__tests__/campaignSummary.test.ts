// buildCampaignSummary against the real registry and a lean fixture registry.
import { describe, expect, it } from 'vitest'
import { achievementsFor } from '../achievements'
import { buildCampaignSummary } from '../campaignSummary'
import { getRegistryCounts } from '../levels/counts'
import { LEVELS } from '../levels/registry'
import { createInitialLevels } from '../progression'
import type { LevelDefinition, SaveData } from '../types'

const save = (): SaveData => {
  const levels = createInitialLevels()
  levels[1] = { ...levels[1], completed: true, rating: 'S', sideOpsDone: ['l1-side-1'], bonusesEarned: ['l1-bonus-1', 'l1-bonus-hidden'] }
  levels[4] = { ...levels[4], completed: true, rating: 'A', stats: { bestIntegrity: 88.5, bestEfficiency: 72 } }
  return {
    profile: { callsign: 'ACE', xp: 1400, credits: 700, theme: 'cyan', soundOn: true },
    levels,
    achievements: ['a', 'b'],
    fragments: ['F1'],
    adaptive: { history: [
      { levelId: 1, tier: 'assisted', composite: 80, hintsUsed: 0, mistakes: 0, at: 1 },
      { levelId: 2, tier: 'expert', composite: 90, hintsUsed: 0, mistakes: 0, at: 2 },
    ] },
    campaignComplete: true,
  }
}

describe('buildCampaignSummary', () => {
  it('uses the real registry totals', () => {
    const s = buildCampaignSummary(save(), LEVELS)
    const c = getRegistryCounts(LEVELS)
    expect(s.rank).toBe('Senior Analyst')
    expect(s.xp).toBe(1400)
    expect(s.credits).toBe(700)
    expect(s.sideOps.total).toBe(c.sideOps)
    expect(s.bonusesVisible.total).toBe(c.bonusesVisible)
    expect(s.bonusesHidden.total).toBe(c.bonusesHidden)
    expect(s.achievements).toEqual({ earned: 2, total: achievementsFor(LEVELS).length })
    expect(s.ratings).toHaveLength(LEVELS.length)
    expect(s.ratings[0].rating).toBe('S')
    expect(s.l04).toEqual({ bestIntegrity: 88.5, bestEfficiency: 72 })
    expect(s.tiers).toEqual(['assisted', 'expert'])
  })
  it('follows a lean fixture registry', () => {
    const lean: LevelDefinition[] = LEVELS.map((l) => ({ ...l, sideOps: l.sideOps.slice(0, 1), bonuses: l.bonuses.filter((b) => !b.hidden).slice(0, 1) }))
    const s = buildCampaignSummary(save(), lean)
    const c = getRegistryCounts(lean)
    expect(s.sideOps).toEqual({ done: 1, total: c.sideOps })
    expect(s.bonusesVisible).toEqual({ earned: 1, total: c.bonusesVisible })
    expect(s.bonusesHidden).toEqual({ earned: 0, total: c.bonusesHidden })
    expect(c.bonusesHidden).toBe(0)
  })
})

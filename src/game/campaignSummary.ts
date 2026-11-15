// Campaign summary (pure): final rank, ratings, side-op/bonus/achievement totals from the registry, L04 bests and tiers used.
import { achievementsFor } from './achievements'
import { getRegistryCounts } from './levels/counts'
import { rankForXp } from './progression'
import type { LevelDefinition, LevelId, Rating, SaveData, Tier } from './types'

export interface CampaignSummary {
  callsign: string
  rank: string
  xp: number
  credits: number
  ratings: { levelId: LevelId; title: string; rating: Rating | null; completed: boolean }[]
  sideOps: { done: number; total: number }
  bonusesVisible: { earned: number; total: number }
  bonusesHidden: { earned: number; total: number }
  achievements: { earned: number; total: number }
  l04: { bestIntegrity: number | null; bestEfficiency: number | null }
  tiers: Tier[]
  tierLine: string
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function buildCampaignSummary(save: SaveData, registry: readonly LevelDefinition[]): CampaignSummary {
  const counts = getRegistryCounts(registry)
  let sideDone = 0
  let visEarned = 0
  let hidEarned = 0
  const ratings = registry.map((level) => {
    const p = save.levels[level.id]
    const sideIds = new Set(level.sideOps.map((s) => s.id))
    sideDone += (p?.sideOpsDone ?? []).filter((id) => sideIds.has(id)).length
    for (const b of level.bonuses) {
      if (!p?.bonusesEarned.includes(b.id)) continue
      if (b.hidden) hidEarned += 1
      else visEarned += 1
    }
    return { levelId: level.id, title: level.title, rating: p?.rating ?? null, completed: Boolean(p?.completed) }
  })
  const order: Tier[] = ['assisted', 'independent', 'expert']
  const used = new Set((save.adaptive?.history ?? []).map((h) => h.tier))
  const tiers = order.filter((t) => used.has(t))
  const l4 = save.levels[4]?.stats ?? {}
  return {
    callsign: save.profile.callsign,
    rank: rankForXp(save.profile.xp).name,
    xp: save.profile.xp,
    credits: save.profile.credits,
    ratings,
    sideOps: { done: sideDone, total: counts.sideOps },
    bonusesVisible: { earned: visEarned, total: counts.bonusesVisible },
    bonusesHidden: { earned: hidEarned, total: counts.bonusesHidden },
    achievements: { earned: save.achievements.length, total: achievementsFor(registry).length },
    l04: { bestIntegrity: numOrNull(l4.bestIntegrity), bestEfficiency: numOrNull(l4.bestEfficiency) },
    tiers,
    tierLine:
      tiers.length === 0
        ? 'No adaptive tier was recorded.'
        : tiers.length === 1
          ? `You played every mission on the ${tiers[0]} tier.`
          : `NEXUS adapted to you across ${tiers.length} tiers: ${tiers.join(', ')}.`,
  }
}

// Registry counts (pure): every stage, side-op and bonus total shown in the game is derived here.
import type { LevelDefinition, LevelId } from '../types'

export interface LevelCounts {
  stages: number
  sideOps: number
  bonusesVisible: number
  bonusesHidden: number
}

export interface RegistryCounts {
  perLevel: Record<number, LevelCounts>
  levels: number
  stages: number
  sideOps: number
  bonusesVisible: number
  bonusesHidden: number
  bonuses: number
}

export function levelCounts(level: LevelDefinition): LevelCounts {
  const hidden = level.bonuses.filter((bonus) => bonus.hidden).length
  return {
    stages: level.stages.length,
    sideOps: level.sideOps.length,
    bonusesVisible: level.bonuses.length - hidden,
    bonusesHidden: hidden,
  }
}

export function getRegistryCounts(registry: readonly LevelDefinition[]): RegistryCounts {
  const perLevel: Record<number, LevelCounts> = {}
  let stages = 0
  let sideOps = 0
  let bonusesVisible = 0
  let bonusesHidden = 0
  for (const level of registry) {
    const counts = levelCounts(level)
    perLevel[level.id as LevelId] = counts
    stages += counts.stages
    sideOps += counts.sideOps
    bonusesVisible += counts.bonusesVisible
    bonusesHidden += counts.bonusesHidden
  }
  return {
    perLevel,
    levels: registry.length,
    stages,
    sideOps,
    bonusesVisible,
    bonusesHidden,
    bonuses: bonusesVisible + bonusesHidden,
  }
}

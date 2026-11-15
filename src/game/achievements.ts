// Achievements (pure): catalogue, progress and evaluation; every count-based threshold derives from the registry.
import { getRegistryCounts } from './levels/counts'
import type { RegistryCounts } from './levels/counts'
import { RANKS } from './config'
import { rankForXp } from './progression'
import type { LevelDefinition, LevelId, SaveData } from './types'

export interface AchievementContext {
  save: SaveData
  registry: readonly LevelDefinition[]
  counts: RegistryCounts
}

export interface AchievementProgress {
  current: number
  target: number
  label: string
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  secret?: boolean
  check: (ctx: AchievementContext) => boolean
  progress?: (ctx: AchievementContext) => AchievementProgress
}

const LEVEL_IDS: LevelId[] = [1, 2, 3, 4, 5, 6, 7]

const stat = (save: SaveData, levelId: LevelId, key: string): number | boolean | string | undefined =>
  save.levels[levelId]?.stats[key]

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const sideOpsDone = ({ save, registry }: AchievementContext): number =>
  registry.reduce(
    (total, level) =>
      total + save.levels[level.id].sideOpsDone.filter((id) => level.sideOps.some((op) => op.id === id)).length,
    0,
  )

const bonusesEarned = ({ save, registry }: AchievementContext, hiddenOnly = false): number =>
  registry.reduce(
    (total, level) =>
      total +
      save.levels[level.id].bonusesEarned.filter((id) =>
        level.bonuses.some((bonus) => bonus.id === id && (!hiddenOnly || bonus.hidden)),
      ).length,
    0,
  )

const tiersCleared = (save: SaveData): string[] => {
  const raw = stat(save, 4, 'tiersCleared')
  return typeof raw === 'string' ? raw.split(',').map((item) => item.trim()).filter(Boolean) : []
}

const rankIndex = (xp: number): number => RANKS.findIndex((rank) => rank.name === rankForXp(xp).name)

const completed = (save: SaveData, levelId: LevelId): boolean => save.levels[levelId]?.completed === true

const ALL: AchievementDef[] = [
  {
    id: 'first-contact',
    title: 'FIRST CONTACT',
    description: 'Complete Level 01.',
    check: ({ save }) => completed(save, 1),
  },
  {
    id: 'halfway',
    title: 'HALFWAY THROUGH THE VAULT',
    description: 'Complete Level 04, the data-cleaning mission.',
    check: ({ save }) => completed(save, 4),
  },
  {
    id: 'campaign-complete',
    title: 'NEXUS RESTORED',
    description: 'Complete the whole campaign.',
    check: ({ save }) => save.campaignComplete === true,
    progress: ({ save, registry }) => ({
      current: registry.filter((level) => completed(save, level.id)).length,
      target: registry.length,
      label: 'levels',
    }),
  },
  {
    id: 's-rank',
    title: 'S-RANK ANALYST',
    description: 'Earn an S rating on any main mission.',
    check: ({ save }) => LEVEL_IDS.some((id) => save.levels[id]?.rating === 'S'),
  },
  {
    id: 'all-s',
    title: 'FLAWLESS RECORD',
    description: 'Earn an S rating on every main mission.',
    check: ({ save, registry }) => registry.every((level) => save.levels[level.id]?.rating === 'S'),
    progress: ({ save, registry }) => ({
      current: registry.filter((level) => save.levels[level.id]?.rating === 'S').length,
      target: registry.length,
      label: 'S ratings',
    }),
  },
  {
    id: 'self-reliant',
    title: 'SELF-RELIANT',
    description: 'Finish any main mission without using a hint.',
    check: ({ save }) => LEVEL_IDS.some((id) => num(stat(save, id, 'minHints')) === 0),
  },
  {
    id: 'bonus-hunter',
    title: 'BONUS HUNTER',
    description: 'Earn bonus objectives across the campaign.',
    check: (ctx) => bonusesEarned(ctx) >= Math.min(5, ctx.counts.bonuses),
    progress: (ctx) => ({ current: bonusesEarned(ctx), target: Math.min(5, ctx.counts.bonuses), label: 'bonuses' }),
  },
  {
    id: 'secret-seeker',
    title: 'SECRET SEEKER',
    description: 'Discover hidden bonus objectives.',
    check: (ctx) => bonusesEarned(ctx, true) >= Math.min(3, ctx.counts.bonusesHidden),
    progress: (ctx) => ({
      current: bonusesEarned(ctx, true),
      target: Math.min(3, ctx.counts.bonusesHidden),
      label: 'hidden bonuses',
    }),
  },
  {
    id: 'field-agent',
    title: 'FIELD AGENT',
    description: 'Complete half of all side operations.',
    check: (ctx) => sideOpsDone(ctx) >= Math.ceil(ctx.counts.sideOps / 2),
    progress: (ctx) => ({ current: sideOpsDone(ctx), target: Math.ceil(ctx.counts.sideOps / 2), label: 'side ops' }),
  },
  {
    id: 'full-spectrum',
    title: 'FULL SPECTRUM',
    description: 'Complete every side operation.',
    check: (ctx) => sideOpsDone(ctx) >= ctx.counts.sideOps,
    progress: (ctx) => ({ current: sideOpsDone(ctx), target: ctx.counts.sideOps, label: 'side ops' }),
  },
  {
    id: 'data-janitor',
    title: 'DATA JANITOR',
    description: 'Reach an integrity score of 95 or more in Level 04.',
    check: ({ save }) => (num(stat(save, 4, 'bestIntegrity')) ?? 0) >= 95,
  },
  {
    id: 'expert-cleaner',
    title: 'EXPERT CLEARANCE',
    description: 'Complete Level 04 on the EXPERT tier.',
    check: ({ save }) => tiersCleared(save).includes('expert'),
  },
  {
    id: 'all-clearances',
    title: 'ALL CLEARANCES',
    description: 'Complete Level 04 on all three tiers.',
    check: ({ save }) => ['assisted', 'independent', 'expert'].every((tier) => tiersCleared(save).includes(tier)),
    progress: ({ save }) => ({ current: tiersCleared(save).length, target: 3, label: 'tiers' }),
  },
  {
    id: 'ghost-hunter',
    title: 'GHOST HUNTER',
    description: 'Expose all four fabricated enrolments in Level 04.',
    secret: true,
    check: ({ save }) => (num(stat(save, 4, 'ghostsFound')) ?? 0) >= 4,
  },
  {
    id: 'par-ace',
    title: 'PAR ACE',
    description: 'Finish Level 04 at or under par (efficiency 100).',
    check: ({ save }) => (num(stat(save, 4, 'bestEfficiency')) ?? 0) >= 99.9,
  },
  {
    id: 'honest-forecaster',
    title: 'HONEST FORECASTER',
    description: 'Submit a Level 07 forecast whose hold-out score matches validation, without peeking.',
    check: ({ save }) => {
      const holdout = num(stat(save, 7, 'holdoutR2'))
      const validation = num(stat(save, 7, 'valR2'))
      return holdout !== null && validation !== null && stat(save, 7, 'peeked') === false && Math.abs(holdout - validation) <= 0.05
    },
  },
  {
    id: 'leak-detector',
    title: 'LEAK DETECTOR',
    description: 'Report the leaking feature in Level 07.',
    secret: true,
    check: ({ save }) => stat(save, 7, 'leakReported') === true,
  },
  {
    id: 'rank-analyst',
    title: 'ANALYST',
    description: 'Reach the Analyst rank.',
    check: ({ save }) => rankIndex(save.profile.xp) >= RANKS.findIndex((rank) => rank.name === 'Analyst'),
    progress: ({ save }) => ({
      current: Math.min(save.profile.xp, RANKS[2].minXp),
      target: RANKS[2].minXp,
      label: 'XP',
    }),
  },
  {
    id: 'rank-architect',
    title: 'NEXUS ARCHITECT',
    description: 'Reach the top rank.',
    check: ({ save }) => rankIndex(save.profile.xp) === RANKS.length - 1,
    progress: ({ save }) => ({
      current: Math.min(save.profile.xp, RANKS[RANKS.length - 1].minXp),
      target: RANKS[RANKS.length - 1].minXp,
      label: 'XP',
    }),
  },
  {
    id: 'supply-run',
    title: 'SUPPLY RUN',
    description: 'Buy an item in the Tool Bay.',
    check: ({ save }) => (save.owned ?? []).length > 0,
  },
]

/** The catalogue for a registry: secret-seeker is dropped when no hidden bonuses exist. */
export function achievementsFor(registry: readonly LevelDefinition[]): AchievementDef[] {
  const counts = getRegistryCounts(registry)
  return ALL.filter((item) => item.id !== 'secret-seeker' || counts.bonusesHidden > 0)
}

export const ACHIEVEMENTS: readonly AchievementDef[] = ALL

export function achievementContext(save: SaveData, registry: readonly LevelDefinition[]): AchievementContext {
  return { save, registry, counts: getRegistryCounts(registry) }
}

/** Ids of every achievement the save currently satisfies. */
export function evaluateAchievements(save: SaveData, registry: readonly LevelDefinition[]): string[] {
  const ctx = achievementContext(save, registry)
  return achievementsFor(registry)
    .filter((item) => {
      try {
        return item.check(ctx)
      } catch {
        return false
      }
    })
    .map((item) => item.id)
}

/** Achievements newly earned compared with the ids already stored. */
export function newAchievements(save: SaveData, registry: readonly LevelDefinition[]): string[] {
  const owned = new Set(save.achievements)
  return evaluateAchievements(save, registry).filter((id) => !owned.has(id))
}

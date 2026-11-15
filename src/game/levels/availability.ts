// Level availability: every campaign level is playable in the final build (the interim gate is kept for future use).
import type { LevelId } from '../types'

/** Levels with real, playable missions. All seven ship in the final build. */
export const PLAYABLE_LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5, 6, 7]

export const isLevelInDevelopment = (levelId: LevelId): boolean => !PLAYABLE_LEVEL_IDS.includes(levelId)

export const IN_DEVELOPMENT_LABEL = 'In development'

export const inDevelopmentMessage = (levelId: LevelId): string =>
  `Level ${levelId} is in development and not playable in this build.`

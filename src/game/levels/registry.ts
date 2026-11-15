// Level registry: the seven campaign definitions (each owned by its level folder) and the story fragments.
import type { BonusDef, LevelDefinition, LevelId } from '../types'
import { LEVEL_IDS } from '../config'
import { LEVEL_1 } from '../../levels/l01/definition'
import { LEVEL_2 } from '../../levels/l02/definition'
import { LEVEL_3 } from '../../levels/l03/definition'
import { LEVEL_4 } from '../../levels/l04/definition'
import { LEVEL_5 } from '../../levels/l05/definition'
import { LEVEL_6 } from '../../levels/l06/definition'
import { LEVEL_7 } from '../../levels/l07/definition'

/** Story fragments revealed when the matching main mission is completed. */
export const FRAGMENT_TEXT: Record<string, string> = {
  F1: 'I used to know every student by name. Then the feed turned to noise and I forgot how to read.',
  F2: 'I learned rules. Accept, quarantine, reject. A rule is only as wise as its order.',
  F3: 'A hundred sensors, and one lied slowly, four tenths at a time. Nobody looked.',
  F4: 'Forty-seven records walked in. I trusted every one. Some were copies. Some never existed.',
  F5: 'When I finally looked, the pattern was plain: the students who stopped coming were the ones who left.',
  F6: 'A pattern is not a reason. I learned to ask whether it was signal or chance.',
  F7: 'Predict, then test on what you have never seen. That is the only honest forecast.',
}

export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_7]

export const LEVEL_BY_ID: Record<LevelId, LevelDefinition> = {
  1: LEVELS[0],
  2: LEVELS[1],
  3: LEVELS[2],
  4: LEVELS[3],
  5: LEVELS[4],
  6: LEVELS[5],
  7: LEVELS[6],
}

export function levelDefinition(levelId: LevelId): LevelDefinition {
  return LEVEL_BY_ID[levelId]
}

export function visibleBonuses(levelId: LevelId): BonusDef[] {
  return levelDefinition(levelId).bonuses.filter((item) => !item.hidden)
}

/** Parses a route parameter such as `4`; returns null for unknown levels. */
export function parseLevelId(raw: string | undefined): LevelId | null {
  if (!raw) return null
  const value = Number(raw)
  return (LEVEL_IDS as readonly number[]).includes(value) ? (value as LevelId) : null
}

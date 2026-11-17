// Tool Bay (pure): accent-theme items bought with credits.
import { THEME_ACCENTS } from './settings'
import type { SaveData } from './types'

export interface ToolBayItem {
  id: string
  name: string
  cost: number
  description: string
}

export const TOOL_BAY_ITEMS: readonly ToolBayItem[] = [
  { id: 'theme-magenta', name: THEME_ACCENTS['theme-magenta'].name, cost: 200, description: 'Recolours every accent in magenta.' },
  { id: 'theme-amber', name: THEME_ACCENTS['theme-amber'].name, cost: 300, description: 'A warm amber terminal accent.' },
  { id: 'theme-matrix', name: THEME_ACCENTS['theme-matrix'].name, cost: 300, description: 'Classic green-on-black accent.' },
]

export type CanBuy = { ok: true } | { ok: false; reason: 'unknown' | 'owned' | 'credits'; missing?: number }

export function canBuy(save: Pick<SaveData, 'profile' | 'owned'>, itemId: string): CanBuy {
  const item = TOOL_BAY_ITEMS.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, reason: 'unknown' }
  if ((save.owned ?? []).includes(itemId)) return { ok: false, reason: 'owned' }
  if (save.profile.credits < item.cost) return { ok: false, reason: 'credits', missing: item.cost - save.profile.credits }
  return { ok: true }
}

/** Returns the updated profile and owned list, or null when the purchase is not allowed. */
export function buy(
  save: Pick<SaveData, 'profile' | 'owned'>,
  itemId: string,
): { profile: SaveData['profile']; owned: string[] } | null {
  const check = canBuy(save, itemId)
  const item = TOOL_BAY_ITEMS.find((entry) => entry.id === itemId)
  if (!check.ok || !item) return null
  return {
    profile: { ...save.profile, credits: save.profile.credits - item.cost },
    owned: [...(save.owned ?? []), itemId],
  }
}

/** Themes the player may apply: the free default plus owned ones. */
export const availableThemes = (_owned: readonly string[]): string[] => Object.keys(THEME_ACCENTS)

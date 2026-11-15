// Save helpers: guarded localStorage access, serialisation and schema validation.
import type { StateStorage } from 'zustand/middleware'
import { LEVEL_IDS, SAVE_VERSION } from './config'
import type { AdaptiveEntry, LevelId, LevelProgress, Rating, SaveData, Tier } from './types'

const RATINGS: readonly Rating[] = ['S', 'A', 'B', 'C']
const TIERS: readonly Tier[] = ['assisted', 'independent', 'expert']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isLevelId(value: unknown): value is LevelId {
  return isFiniteNumber(value) && (LEVEL_IDS as readonly number[]).includes(value)
}

function isRating(value: unknown): value is Rating {
  return typeof value === 'string' && (RATINGS as readonly string[]).includes(value)
}

function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value)
}

function isStats(value: unknown): value is Record<string, number | boolean | string> {
  if (!isRecord(value)) return false
  return Object.values(value).every(
    (item) =>
      typeof item === 'string' ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item)),
  )
}

function isLevelProgress(value: unknown): value is LevelProgress {
  if (!isRecord(value)) return false
  return (
    typeof value.unlocked === 'boolean' &&
    typeof value.completed === 'boolean' &&
    isFiniteNumber(value.bestComposite) &&
    isFiniteNumber(value.bestXp) &&
    (value.rating === undefined || isRating(value.rating)) &&
    isStringArray(value.sideOpsDone) &&
    isStringArray(value.bonusesEarned) &&
    isFiniteNumber(value.attempts) &&
    isStats(value.stats)
  )
}

function isAdaptiveEntry(value: unknown): value is AdaptiveEntry {
  if (!isRecord(value)) return false
  return (
    isLevelId(value.levelId) &&
    isTier(value.tier) &&
    isFiniteNumber(value.composite) &&
    isFiniteNumber(value.hintsUsed) &&
    isFiniteNumber(value.mistakes) &&
    isFiniteNumber(value.at)
  )
}

export function isSaveData(value: unknown): value is SaveData {
  if (!isRecord(value)) return false
  const { profile, levels, achievements, fragments, adaptive } = value
  if (!isRecord(profile)) return false
  if (
    typeof profile.callsign !== 'string' ||
    profile.callsign.length === 0 ||
    !isFiniteNumber(profile.xp) ||
    !isFiniteNumber(profile.credits) ||
    typeof profile.theme !== 'string' ||
    typeof profile.soundOn !== 'boolean'
  ) {
    return false
  }
  if (!isRecord(levels)) return false
  if (!LEVEL_IDS.every((id) => isLevelProgress(levels[String(id)]))) return false
  if (!isStringArray(achievements) || !isStringArray(fragments)) return false
  if (!isRecord(adaptive) || !Array.isArray(adaptive.history)) return false
  if (!adaptive.history.every(isAdaptiveEntry)) return false
  if (value.campaignComplete !== undefined && typeof value.campaignComplete !== 'boolean') {
    return false
  }
  if (value.owned !== undefined && !isStringArray(value.owned)) return false
  return true
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify({ version: SAVE_VERSION, data })
}

export type ParseSaveResult =
  | { ok: true; data: SaveData }
  | { ok: false; error: string }

/** Parse either the export envelope or a raw SaveData object. */
export function parseSave(json: string): ParseSaveResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Save file is not valid JSON.' }
  }

  if (!isRecord(raw)) {
    return { ok: false, error: 'Save file must contain an object.' }
  }

  if (raw.version !== undefined && raw.version !== SAVE_VERSION) {
    return { ok: false, error: `Unsupported save version: ${String(raw.version)}.` }
  }

  const candidate = raw.data !== undefined ? raw.data : raw
  if (!isSaveData(candidate)) {
    return { ok: false, error: 'Save data does not match the expected schema.' }
  }

  return { ok: true, data: candidate }
}

/** localStorage can be blocked, full or unavailable; every access is guarded. */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(name, value)
    } catch {
      // Quota errors and blocked storage must never break the game.
    }
  },
  removeItem: (name) => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(name)
    } catch {
      // Ignore.
    }
  },
}

/** Removes the save and every future `nexus-*` session key. */
export function clearNexusStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith('nexus-')) localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage failures on reset.
  }
}

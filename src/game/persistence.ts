// Save persistence: storage probing with an in-memory fallback, save migration, corruption capture and quota errors.
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { LEVEL_IDS, SAVE_KEY, SAVE_VERSION } from './config'
import { isRecord, isSaveData } from './save'
import type { SaveData } from './types'

// ---------- storage availability ----------

const memory = new Map<string, string>()
let probed: boolean | null = null

/** True when real localStorage can be written and read back. */
export function storageAvailable(): boolean {
  if (probed !== null) return probed
  try {
    if (typeof localStorage === 'undefined') {
      probed = false
      return probed
    }
    const key = '__nexus_probe__'
    localStorage.setItem(key, '1')
    const ok = localStorage.getItem(key) === '1'
    localStorage.removeItem(key)
    probed = ok
  } catch {
    probed = false
  }
  return probed
}

/** Test helper: forget the cached probe result. */
export function resetStorageProbe(): void {
  probed = null
  memory.clear()
}

type StorageErrorListener = (kind: 'quota' | 'unavailable') => void
const errorListeners = new Set<StorageErrorListener>()

export function onStorageError(listener: StorageErrorListener): () => void {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}

function emitStorageError(kind: 'quota' | 'unavailable'): void {
  for (const listener of errorListeners) listener(kind)
}

/** Raw string access that falls back to memory when localStorage is unavailable. */
export const rawStorage = {
  get(name: string): string | null {
    if (!storageAvailable()) return memory.get(name) ?? null
    try {
      return localStorage.getItem(name)
    } catch {
      return memory.get(name) ?? null
    }
  },
  set(name: string, value: string): boolean {
    if (!storageAvailable()) {
      memory.set(name, value)
      return false
    }
    try {
      localStorage.setItem(name, value)
      return true
    } catch {
      memory.set(name, value)
      emitStorageError('quota')
      return false
    }
  },
  remove(name: string): void {
    memory.delete(name)
    if (!storageAvailable()) return
    try {
      localStorage.removeItem(name)
    } catch {
      // ignore
    }
  },
}

// ---------- migration ----------

/**
 * Upgrades older save shapes to the current one: missing attempts or stats per
 * level, missing campaignComplete, owned, settings or adaptive history. Returns
 * null when the value cannot be turned into valid SaveData.
 */
export function migrateSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null
  const candidate: Record<string, unknown> = { ...raw }
  if (isRecord(candidate.levels)) {
    const levels: Record<string, unknown> = { ...candidate.levels }
    for (const id of LEVEL_IDS) {
      const level = levels[String(id)]
      if (!isRecord(level)) continue
      levels[String(id)] = {
        ...level,
        attempts: typeof level.attempts === 'number' && Number.isFinite(level.attempts) ? level.attempts : 0,
        stats: isRecord(level.stats) ? level.stats : {},
        sideOpsDone: Array.isArray(level.sideOpsDone) ? level.sideOpsDone : [],
        bonusesEarned: Array.isArray(level.bonusesEarned) ? level.bonusesEarned : [],
      }
    }
    candidate.levels = levels
  }
  if (!Array.isArray(candidate.achievements)) candidate.achievements = []
  if (!Array.isArray(candidate.fragments)) candidate.fragments = []
  if (!isRecord(candidate.adaptive) || !Array.isArray(candidate.adaptive.history)) {
    candidate.adaptive = { history: [] }
  }
  if (typeof candidate.campaignComplete !== 'boolean') candidate.campaignComplete = false
  if (!Array.isArray(candidate.owned)) candidate.owned = []
  if (isRecord(candidate.profile)) {
    const profile: Record<string, unknown> = { ...candidate.profile }
    if (typeof profile.theme !== 'string') profile.theme = 'nexus'
    if (typeof profile.soundOn !== 'boolean') profile.soundOn = true
    candidate.profile = profile
  }
  return isSaveData(candidate) ? (candidate as unknown as SaveData) : null
}

// ---------- corrupted save capture ----------

let corruptRaw: string | null = null

/** The unreadable raw save found at startup, if any (shown on the recovery screen). */
export const corruptSave = (): string | null => corruptRaw

/** Called after RESET on the recovery screen: writes resume normally. */
export function clearCorruptSave(): void {
  corruptRaw = null
}

/** Test helper. */
export function setCorruptSaveForTest(value: string | null): void {
  corruptRaw = value
}

/**
 * zustand PersistStorage for the campaign save. An unreadable save is kept
 * untouched (writes are paused) and exposed through corruptSave() so the app
 * can show a recovery screen instead of silently replacing it with defaults.
 */
export const saveStorage: PersistStorage<SaveData> = {
  getItem: (name) => {
    const raw = rawStorage.get(name)
    if (raw === null) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) throw new Error('not an object')
      const state = migrateSave(parsed.state)
      if (!state || state.profile.callsign.length === 0) {
        // An empty callsign is a reset, not corruption; anything else invalid is corrupt.
        if (isRecord(parsed.state) && isRecord(parsed.state.profile) && parsed.state.profile.callsign === '') return null
        throw new Error('invalid save')
      }
      const version = typeof parsed.version === 'number' ? parsed.version : SAVE_VERSION
      return { state, version } as StorageValue<SaveData>
    } catch {
      corruptRaw = raw
      return null
    }
  },
  setItem: (name, value) => {
    if (corruptRaw !== null && name === SAVE_KEY) return
    rawStorage.set(name, JSON.stringify(value))
  },
  removeItem: (name) => rawStorage.remove(name),
}

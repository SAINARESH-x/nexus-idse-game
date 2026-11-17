// Campaign store: persisted save data plus progression, awards and import/export.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ADAPTIVE_HISTORY_CAP, LEVEL_IDS, SAVE_KEY, SAVE_VERSION } from './config'
import { levelDefinition } from './levels/registry'
import {
  applyAward,
  applyUnlockChain,
  compositeScore,
  createInitialLevels,
  creditsForXp,
  isValidCallsign,
  ratingForScore,
  xpForMain,
  xpForSideOp,
} from './progression'
import type { Award, AwardSummary } from './progression'
import { clearNexusStorage, isRecord, serializeSave } from './save'
import { migrateSave, saveStorage } from './persistence'
import { newAchievements } from './achievements'
import { LEVELS } from './levels/registry'
import { buy } from './toolbay'
import { DEFAULT_SETTINGS, normalizeSettings, THEME_ACCENTS } from './settings'
import type { Settings } from './settings'
import type {
  AdaptiveEntry,
  LevelId,
  LevelProgress,
  MissionAggregate,
  PlayerProfile,
  SaveData,
  Tier,
} from './types'

export interface GameStore extends SaveData {
  /** Award from the most recent mission; transient and never persisted. */
  lastAward: AwardSummary | null
  newGame: (callsign: string) => void
  resetAll: () => void
  completeStage: (levelId: LevelId, stageId: string) => void
  completeSideOp: (levelId: LevelId, sideOpId: string, hintsUsed?: number) => AwardSummary
  completeBonus: (levelId: LevelId, bonusId: string) => AwardSummary
  completeMission: (levelId: LevelId, aggregate: MissionAggregate, tier?: Tier) => AwardSummary
  /**
   * Counts a started mission: the ONLY place `attempts` is incremented. Returns
   * the attempt index (the value before the increment) used to derive seeds.
   */
  startMission: (levelId: LevelId) => number
  /** Merges per-level facts into LevelProgress.stats (numbers, flags, strings). */
  recordStats: (levelId: LevelId, stats: Record<string, number | boolean | string>) => void
  /** DEV_ONLY direct XP grant used by the developer panel. */
  addXp: (amount: number) => void
  /** DEV_ONLY opens every level for testing. */
  unlockAll: () => void
  /** DEV_ONLY appends an adaptive history entry (Level 04 tier tuning checks). */
  addAdaptiveEntry: (entry: Omit<AdaptiveEntry, 'at'>) => void
  /** DEV_ONLY completes every main mission in order through completeMission. */
  completeAllLevels: () => void
  exportSave: () => string
  importSave: (json: string) => { ok: boolean; error?: string }
  /** Adds newly earned achievements once; returns their ids. */
  syncAchievements: () => string[]
  /** Achievements unlocked since the UI last showed them (transient). */
  recentAchievements: string[]
  clearRecentAchievements: () => void
  buyItem: (itemId: string) => boolean
  setTheme: (themeId: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  setSoundOn: (on: boolean) => void
}

export function createDefaultSaveData(): SaveData {
  return {
    profile: {
      callsign: '',
      xp: 0,
      credits: 0,
      theme: 'nexus',
      soundOn: true,
    },
    levels: createInitialLevels(),
    achievements: [],
    fragments: [],
    adaptive: { history: [] },
    campaignComplete: false,
    owned: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

const EMPTY_AWARD: AwardSummary = { xpGained: 0, creditsGained: 0 }

function normalizeAggregate(input: MissionAggregate): MissionAggregate {
  const unit = (value: number) =>
    Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
  const count = (value: number) =>
    Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  return {
    accuracy: unit(input.accuracy),
    decisionQuality: unit(input.decisionQuality),
    efficiency: unit(input.efficiency),
    hintsUsed: count(input.hintsUsed),
    mistakes: count(input.mistakes),
  }
}

function withAward(
  state: GameStore,
  levelId: LevelId,
  award: Award,
): { summary: AwardSummary; levels: Record<LevelId, LevelProgress>; profile: PlayerProfile } {
  const result = applyAward(state.levels[levelId], award, state.profile.xp)
  const levels = applyUnlockChain({ ...state.levels, [levelId]: result.newProgress })
  const profile: PlayerProfile = {
    ...state.profile,
    xp: state.profile.xp + result.xpGained,
    credits: state.profile.credits + result.creditsGained,
  }
  return {
    summary: {
      levelId,
      xpGained: result.xpGained,
      creditsGained: result.creditsGained,
      rankUp: result.rankUp,
    },
    levels,
    profile,
  }
}

function toSaveData(state: GameStore): SaveData {
  return {
    profile: state.profile,
    levels: state.levels,
    achievements: state.achievements,
    fragments: state.fragments,
    adaptive: state.adaptive,
    campaignComplete: state.campaignComplete ?? false,
    ...(state.campaignCompletedAt !== undefined ? { campaignCompletedAt: state.campaignCompletedAt } : {}),
    owned: state.owned ?? [],
    settings: normalizeSettings(state.settings),
  }
}

/** Accepts an export envelope or a raw save, migrating older shapes. */
function parseImport(json: string): { ok: true; data: SaveData } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Save file is not valid JSON.' }
  }
  if (!isRecord(raw)) return { ok: false, error: 'Save file must contain an object.' }
  if (raw.version !== undefined && raw.version !== SAVE_VERSION) {
    return { ok: false, error: `Unsupported save version: ${String(raw.version)}.` }
  }
  const data = migrateSave(raw.data !== undefined ? raw.data : raw)
  if (!data) return { ok: false, error: 'Save data does not match the expected schema.' }
  return { ok: true, data }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createDefaultSaveData(),
      lastAward: null,
      recentAchievements: [],

      newGame: (callsign) => {
        const name = callsign.trim()
        if (!isValidCallsign(name)) return
        clearNexusStorage()
        const defaults = createDefaultSaveData()
        const settings = get().settings
        set({ ...defaults, settings: settings ?? defaults.settings, profile: { ...defaults.profile, callsign: name }, lastAward: null, recentAchievements: [] })
      },

      resetAll: () => {
        set({ ...createDefaultSaveData(), lastAward: null, recentAchievements: [] })
        clearNexusStorage()
      },

      completeStage: (levelId, stageId) => {
        const level = levelDefinition(levelId)
        if (!level.stages.some((item) => item.id === stageId)) return
        const state = get()
        const progress = state.levels[levelId]
        const key = `stage:${stageId}`
        if (progress.stats[key] === true) return
        set({
          levels: {
            ...state.levels,
            [levelId]: { ...progress, stats: { ...progress.stats, [key]: true } },
          },
        })
      },

      completeSideOp: (levelId, sideOpId, hintsUsed = 0) => {
        const level = levelDefinition(levelId)
        if (!level.sideOps.some((item) => item.id === sideOpId)) return EMPTY_AWARD
        const state = get()
        const award: Award = { kind: 'sideOp', id: sideOpId, xp: xpForSideOp(hintsUsed) }
        const { summary, levels, profile } = withAward(state, levelId, award)
        set({ levels, profile, lastAward: summary })
        get().syncAchievements()
        return summary
      },

      completeBonus: (levelId, bonusId) => {
        const level = levelDefinition(levelId)
        const definition = level.bonuses.find((item) => item.id === bonusId)
        if (!definition) return EMPTY_AWARD
        const state = get()
        const award: Award = { kind: 'bonus', id: bonusId, hidden: definition.hidden }
        const { summary, levels, profile } = withAward(state, levelId, award)
        set({ levels, profile, lastAward: summary })
        get().syncAchievements()
        return summary
      },

      completeMission: (levelId, aggregateInput, tier = 'assisted') => {
        const state = get()
        const level = levelDefinition(levelId)
        const progress = state.levels[levelId]
        const aggregate = normalizeAggregate(aggregateInput)
        const composite = compositeScore(aggregate)
        const rating = ratingForScore(composite)
        const xp = xpForMain(levelId, composite, tier)
        const award: Award = {
          kind: 'main',
          xp,
          composite,
          rating,
          hintsUsed: aggregate.hintsUsed,
          mistakes: aggregate.mistakes,
        }
        const firstCompletion = !progress.completed
        const { summary, levels, profile } = withAward(state, levelId, award)

        const completedStages: Record<string, boolean> = {}
        for (const stage of level.stages) completedStages[`stage:${stage.id}`] = true
        const previousMinHints = levels[levelId].stats.minHints
        const minHints =
          typeof previousMinHints === 'number'
            ? Math.min(previousMinHints, aggregate.hintsUsed)
            : aggregate.hintsUsed
        const updatedProgress: LevelProgress = {
          ...levels[levelId],
          stats: { ...levels[levelId].stats, ...completedStages, minHints },
        }
        const nextLevels = applyUnlockChain({ ...levels, [levelId]: updatedProgress })

        const fragments =
          firstCompletion && !state.fragments.includes(level.fragmentId)
            ? [...state.fragments, level.fragmentId]
            : state.fragments

        const fullSummary: AwardSummary = {
          ...summary,
          composite,
          rating,
          firstCompletion,
        }

        const finishesCampaign = levelId === 7 && !state.campaignComplete
        set({
          levels: nextLevels,
          profile,
          fragments,
          ...(finishesCampaign ? { campaignComplete: true, campaignCompletedAt: Date.now() } : {}),
          adaptive: {
            history: [
              ...state.adaptive.history,
              {
                levelId,
                tier,
                composite,
                hintsUsed: aggregate.hintsUsed,
                mistakes: aggregate.mistakes,
                at: Date.now(),
              },
            ].slice(-ADAPTIVE_HISTORY_CAP),
          },
          lastAward: fullSummary,
        })
        get().syncAchievements()
        return fullSummary
      },

      startMission: (levelId) => {
        const state = get()
        const attemptIndex = state.levels[levelId].attempts
        set({
          levels: {
            ...state.levels,
            [levelId]: { ...state.levels[levelId], attempts: attemptIndex + 1 },
          },
        })
        return attemptIndex
      },

      recordStats: (levelId, stats) => {
        const state = get()
        const progress = state.levels[levelId]
        set({
          levels: { ...state.levels, [levelId]: { ...progress, stats: { ...progress.stats, ...stats } } },
        })
        get().syncAchievements()
      },

      syncAchievements: () => {
        const state = get()
        if (!state.profile.callsign) return []
        const earned = newAchievements(toSaveData(state), LEVELS)
        if (earned.length === 0) return []
        set({
          achievements: [...state.achievements, ...earned],
          recentAchievements: [...state.recentAchievements, ...earned],
        })
        return earned
      },

      clearRecentAchievements: () => set({ recentAchievements: [] }),

      buyItem: (itemId) => {
        const state = get()
        const result = buy(state, itemId)
        if (!result) return false
        set({ profile: result.profile, owned: result.owned })
        get().syncAchievements()
        return true
      },

      setTheme: (themeId) => {
        if (!(themeId in THEME_ACCENTS)) return
        set({ profile: { ...get().profile, theme: themeId } })
      },

      updateSettings: (patch) => {
        const state = get()
        set({ settings: normalizeSettings({ ...normalizeSettings(state.settings), ...patch }) })
      },

      setSoundOn: (on) => {
        const state = get()
        set({ profile: { ...state.profile, soundOn: on } })
      },

      addXp: (amount) => {
        const gained = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0))
        if (gained === 0) return
        const state = get()
        set({
          profile: {
            ...state.profile,
            xp: state.profile.xp + gained,
            credits: state.profile.credits + creditsForXp(gained),
          },
        })
      },

      unlockAll: () => {
        const state = get()
        const levels: Record<LevelId, LevelProgress> = { ...state.levels }
        for (const id of LEVEL_IDS) {
          levels[id] = { ...levels[id], unlocked: true }
        }
        set({ levels })
        get().syncAchievements()
      },

      addAdaptiveEntry: (entry) => {
        const state = get()
        set({ adaptive: { history: [...state.adaptive.history, { ...entry, at: Date.now() }].slice(-ADAPTIVE_HISTORY_CAP) } })
      },

      completeAllLevels: () => {
        for (const id of LEVEL_IDS) {
          get().completeMission(id, { accuracy: 1, decisionQuality: 1, efficiency: 1, hintsUsed: 0, mistakes: 0 })
        }
      },

      exportSave: () => serializeSave(toSaveData(get())),

      importSave: (json) => {
        const parsed = parseImport(json)
        if (!parsed.ok) return { ok: false, error: parsed.error }
        const data = parsed.data
        set({
          profile: data.profile,
          levels: applyUnlockChain(data.levels),
          achievements: data.achievements,
          fragments: data.fragments,
          adaptive: data.adaptive,
          campaignComplete: data.campaignComplete ?? false,
          campaignCompletedAt: data.campaignCompletedAt,
          owned: data.owned ?? [],
          settings: normalizeSettings(data.settings),
          lastAward: null,
          recentAchievements: [],
        })
        return { ok: true }
      },
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: saveStorage,
      partialize: (state) => toSaveData(state),
      migrate: (persisted) => migrateSave(persisted) ?? createDefaultSaveData(),
      merge: (persisted, current) => {
        const data = migrateSave(persisted)
        if (!data) return current
        return {
          ...current,
          ...data,
          settings: normalizeSettings(data.settings),
          levels: applyUnlockChain(data.levels),
          lastAward: null,
          recentAchievements: [],
        }
      },
    },
  ),
)

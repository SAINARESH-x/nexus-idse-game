// Transient mission store: one active run plus the most recent debrief snapshot.
import { create } from 'zustand'
import type {
  ChallengeResult,
  Decision,
  LevelId,
  MissionAggregate,
  MissionSession,
  Rating,
  Tier,
} from '../game/types'

export interface MissionBonusAward {
  id: string
  title: string
  xpGained: number
  hidden: boolean
}

export interface MissionRunState {
  levelId: LevelId
  kind: 'main' | 'side'
  sideOpId?: string
  tier: Tier
  results: ChallengeResult[]
  hintsUsed: number
  startedAt: number
}

export interface MissionRunSummary {
  levelId: LevelId
  kind: 'main' | 'side'
  sideOpId?: string
  tier: Tier
  results: ChallengeResult[]
  aggregate: MissionAggregate
  composite: number
  rating: Rating
  session: MissionSession
  hintsUsed: number
  mistakes: number
  decisions: Decision[]
  bonuses: MissionBonusAward[]
  finishedAt: number
}

interface StartRunInput {
  levelId: LevelId
  kind: 'main' | 'side'
  sideOpId?: string
  tier?: Tier
  /** Restored stage results when a persisted mission resumes after a reload. */
  results?: ChallengeResult[]
  /** Restored mission-wide hint count. */
  hintsUsed?: number
}

interface MissionSessionStore {
  run: MissionRunState | null
  summary: MissionRunSummary | null
  startRun: (input: StartRunInput) => void
  recordResult: (result: ChallengeResult) => void
  addHints: (count?: number) => void
  finishRun: (summary: MissionRunSummary) => void
  clearRun: () => void
  clearSummary: () => void
}

export const useMissionSessionStore = create<MissionSessionStore>((set) => ({
  run: null,
  summary: null,

  startRun: ({ levelId, kind, sideOpId, tier = 'assisted', results = [], hintsUsed = 0 }) => {
    set({
      run: {
        levelId,
        kind,
        sideOpId,
        tier,
        results: [...results],
        hintsUsed: Math.max(0, Math.floor(hintsUsed)),
        startedAt: Date.now(),
      },
      summary: null,
    })
  },

  recordResult: (result) => {
    set((state) => {
      if (!state.run) return state
      const withoutSame = state.run.results.filter((item) => item.id !== result.id)
      return { run: { ...state.run, results: [...withoutSame, result] } }
    })
  },

  addHints: (count = 1) => {
    set((state) => {
      if (!state.run) return state
      return {
        run: {
          ...state.run,
          hintsUsed: state.run.hintsUsed + Math.max(0, Math.floor(count)),
        },
      }
    })
  },

  finishRun: (summary) => set({ summary, run: null }),
  clearRun: () => set({ run: null }),
  clearSummary: () => set({ summary: null }),
}))

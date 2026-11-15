// Stage state context: persisted per-stage inputs and the mission seed for Levels 05-07 (local state elsewhere).
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { sessionSeed } from '../game/levelSession'
import { useGameStore } from '../game/store'
import type { LevelId } from '../game/types'

export interface StageStateApi {
  seed: number
  attemptIndex: number
  get: (stageId: string) => unknown
  set: (stageId: string, state: unknown) => void
  /** Adds mistakes to the persisted stage counter. */
  addMistakes: (stageId: string, count: number) => void
}

const StageStateContext = createContext<StageStateApi | null>(null)

export function StageStateProvider({ value, children }: { value: StageStateApi; children: ReactNode }) {
  return <StageStateContext.Provider value={value}>{children}</StageStateContext.Provider>
}

export function useStageStateApi(): StageStateApi | null {
  return useContext(StageStateContext)
}

/**
 * Like useState, but inside a persistent main mission the value is restored
 * from and written to the level session record (inputs only, plain JSON).
 * Outside one (side ops, tests) it is ordinary component state.
 */
export function useStageState<T>(stageId: string, initial: T): [T, (next: T | ((previous: T) => T)) => void] {
  const api = useContext(StageStateContext)
  const [local, setLocal] = useState<T>(() => {
    const saved = api?.get(stageId)
    return saved === undefined || saved === null ? initial : (saved as T)
  })
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setLocal((previous) => {
        const value = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
        api?.set(stageId, value)
        return value
      })
    },
    [api, stageId],
  )
  return [local, update]
}

/**
 * The seed for a level's datasets and simulations. Main missions use the
 * persisted session seed; side ops (not persisted) use the seed of the
 * player's latest started attempt, so a refresh keeps the same numbers.
 */
export function useLevelSeed(levelId: LevelId): number {
  const api = useContext(StageStateContext)
  const attempts = useGameStore((state) => state.levels[levelId].attempts)
  if (api) return api.seed
  return sessionSeed(levelId, Math.max(0, attempts - 1))
}

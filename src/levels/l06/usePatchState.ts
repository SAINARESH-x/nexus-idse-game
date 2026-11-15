// Level 06 hook: persisted stage state (useStageState) with a shallow-merge patch updater.
import { useCallback } from 'react'
import { useStageState } from '../../shell/stageState'

export type Patch<T> = (p: Partial<T> | ((s: T) => Partial<T>)) => void

export function usePatchState<T extends object>(stageId: string, initial: T): [T, Patch<T>] {
  const [state, setState] = useStageState<T>(stageId, initial)
  const patch = useCallback<Patch<T>>(
    (p) => setState((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) })),
    [setState],
  )
  return [state, patch]
}

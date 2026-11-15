// Objective checklist state: challenges mark objectives complete as they work.
import { useCallback, useState } from 'react'

export interface MissionObjectiveDef {
  id: string
  label: string
}

export interface MissionObjectiveState extends MissionObjectiveDef {
  done: boolean
}

export interface ObjectivesApi {
  objectives: MissionObjectiveState[]
  completed: number
  allDone: boolean
  complete: (id: string) => void
}

export function useObjectives(definitions: MissionObjectiveDef[], initialDone: string[] = []): ObjectivesApi {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialDone.map((id) => [id, true])),
  )

  const complete = useCallback((id: string) => {
    setDone((current) => (current[id] ? current : { ...current, [id]: true }))
  }, [])

  const objectives = definitions.map((objective) => ({
    ...objective,
    done: Boolean(done[objective.id]),
  }))
  const completed = objectives.filter((objective) => objective.done).length

  return {
    objectives,
    completed,
    allDone: definitions.length > 0 && completed === definitions.length,
    complete,
  }
}

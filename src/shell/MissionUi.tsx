// Mission UI context: challenges can tick objectives and append log entries.
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type MissionLogTone = 'info' | 'good' | 'bad' | 'tip'

export interface MissionLogEntry {
  id: number
  title: string
  detail?: string
  tone: MissionLogTone
  at: number
}

export interface MissionLogInput {
  title: string
  detail?: string
  tone?: MissionLogTone
}

export interface MissionUiApi {
  completeObjective: (id: string) => void
  log: (entry: MissionLogInput) => void
}

const noop = () => undefined

const MissionUiContext = createContext<MissionUiApi>({
  completeObjective: noop,
  log: noop,
})

export function MissionUiProvider({
  value,
  children,
}: {
  value: MissionUiApi
  children: ReactNode
}) {
  return <MissionUiContext.Provider value={value}>{children}</MissionUiContext.Provider>
}

export function useMissionUi(): MissionUiApi {
  return useContext(MissionUiContext)
}

// PersistentMission: runs a Level 05-07 main mission in MissionShell and keeps its progress in nexus-lNN-session.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readSession, removeSession, writeSession } from '../game/levelSession'
import type { LevelSessionRecord, ParseContext } from '../game/levelSession'
import type { LevelRuntime } from '../game/levels/runtime'
import { useGameStore } from '../game/store'
import type { ChallengeProps, LevelDefinition, LevelId, StageDef } from '../game/types'
import { useToast } from '../ui/Toast'
import { MissionShell } from './MissionShell'
import { StageStateProvider } from './stageState'
import type { StageStateApi } from './stageState'
import type { MissionProgressSnapshot, MissionRestore } from './useMissionFlow'
import type { MissionRunSummary } from './missionSession'
import type { AwardSummary } from '../game/progression'

export interface PersistentMissionProps {
  levelId: LevelId
  level: LevelDefinition
  runtime: LevelRuntime
}

export const DAMAGED_SESSION_MESSAGE = 'Saved session was damaged, the mission starts over.'
export const STORAGE_FAILED_MESSAGE = 'Progress could not be saved in this browser. The mission continues.'

export function parseContextFor(level: LevelDefinition, runtime: LevelRuntime, attempts: number): ParseContext {
  return {
    stageIds: level.stages.map((stage) => stage.id),
    attempts,
    validators: runtime.persistent?.validators,
    initialStates: runtime.persistent?.initialStates,
  }
}

type LoadState =
  | { kind: 'ready'; record: LevelSessionRecord; repairs: string[] }
  | { kind: 'redirect'; to: string; message: string; tone: 'info' | 'warning' }

export function PersistentMission({ levelId, level, runtime }: PersistentMissionProps) {
  const navigate = useNavigate()
  const { push } = useToast()
  const attempts = useGameStore((state) => state.levels[levelId].attempts)

  // Read once on mount: later store changes (e.g. completion) must not reload the record.
  const [load] = useState<LoadState>(() => {
    const parsed = readSession(levelId, parseContextFor(level, runtime, attempts))
    if (!parsed.ok) {
      if (parsed.reason === 'missing') {
        return { kind: 'redirect', to: `/level/${levelId}`, message: 'Press BEGIN MISSION to start a new run.', tone: 'info' }
      }
      removeSession(levelId)
      return { kind: 'redirect', to: `/level/${levelId}`, message: DAMAGED_SESSION_MESSAGE, tone: 'warning' }
    }
    if (parsed.session.status === 'finished') {
      return { kind: 'redirect', to: `/level/${levelId}/debrief`, message: 'This run is finished. Here is its debrief.', tone: 'info' }
    }
    return { kind: 'ready', record: parsed.session, repairs: parsed.repairs }
  })

  const recordRef = useRef<LevelSessionRecord | null>(load.kind === 'ready' ? load.record : null)
  const warnedRef = useRef(false)

  const persist = useCallback(() => {
    const record = recordRef.current
    if (!record) return
    if (!writeSession(record) && !warnedRef.current) {
      warnedRef.current = true
      push({ message: STORAGE_FAILED_MESSAGE, tone: 'warning' })
    }
  }, [push])

  useEffect(() => {
    if (load.kind === 'redirect') {
      push({ message: load.message, tone: load.tone })
      navigate(load.to, { replace: true })
    } else if (load.repairs.length > 0) {
      push({ message: 'Part of the saved session was reset.', tone: 'warning' })
      persist()
    }
    // Runs once for the mount-time load result.
  }, [])

  const stageApi = useMemo<StageStateApi | null>(() => {
    const record = recordRef.current
    if (!record) return null
    return {
      seed: record.seed,
      attemptIndex: record.attemptIndex,
      get: (stageId) => recordRef.current?.stages[stageId]?.state,
      set: (stageId, state) => {
        const current = recordRef.current
        if (!current || !current.stages[stageId]) return
        current.stages[stageId] = { ...current.stages[stageId], state }
        persist()
      },
      addMistakes: (stageId, count) => {
        const current = recordRef.current
        if (!current || !current.stages[stageId]) return
        const entry = current.stages[stageId]
        current.stages[stageId] = { ...entry, mistakes: entry.mistakes + Math.max(0, Math.floor(count)) }
        persist()
      },
    }
  }, [persist])

  const restore = useMemo<MissionRestore | undefined>(() => {
    const record = recordRef.current
    if (!record) return undefined
    const stageIndex = Math.max(0, level.stages.findIndex((stage) => stage.id === record.stageId))
    const results = level.stages.flatMap((stage) => {
      const result = record.stages[stage.id]?.result
      return result ? [result] : []
    })
    const revealed: Record<string, number> = {}
    for (const stage of level.stages) revealed[stage.id] = record.stages[stage.id]?.hintsUsed ?? 0
    return { stageIndex, results, revealed }
  }, [level.stages])

  const onProgress = useCallback(
    (snapshot: MissionProgressSnapshot) => {
      const record = recordRef.current
      if (!record) return
      const current = level.stages[snapshot.stageIndex]
      if (!current) return
      record.stageId = current.id
      level.stages.forEach((stage, index) => {
        const entry = record.stages[stage.id]
        if (!entry) return
        const result = snapshot.results.find((item) => item.id === stage.id)
        const status = result ? 'done' : index <= snapshot.stageIndex ? 'open' : 'locked'
        record.stages[stage.id] = {
          ...entry,
          status,
          hintsUsed: snapshot.revealed[stage.id] ?? entry.hintsUsed,
          ...(result ? { result } : {}),
        }
      })
      persist()
    },
    [level.stages, persist],
  )

  const onObjective = useCallback(
    (id: string) => {
      const record = recordRef.current
      if (!record || record.objectives.includes(id)) return
      record.objectives = [...record.objectives, id]
      persist()
    },
    [persist],
  )

  const onFinished = useCallback(
    (summary: MissionRunSummary, award: AwardSummary | null) => {
      const record = recordRef.current
      if (!record) return
      record.status = 'finished'
      record.report = { summary, award }
      persist()
    },
    [persist],
  )

  const onAbort = useCallback(() => {
    recordRef.current = null
    removeSession(levelId)
  }, [levelId])

  if (load.kind === 'redirect' || !stageApi || !runtime.renderChallenge) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Restoring mission…
      </main>
    )
  }

  const renderChallenge = runtime.renderChallenge
  return (
    <StageStateProvider value={stageApi}>
      <MissionShell
        levelId={levelId}
        levelTitle={level.title}
        missionTitle={level.mission}
        kind="main"
        stages={level.stages}
        objectives={runtime.mainObjectives ?? []}
        renderChallenge={(stage: StageDef, props: ChallengeProps) => renderChallenge(stage.id, props)}
        restore={restore}
        onProgress={onProgress}
        onFinished={onFinished}
        onAbort={onAbort}
        onObjective={onObjective}
        initialObjectives={load.record.objectives}
      />
    </StageStateProvider>
  )
}

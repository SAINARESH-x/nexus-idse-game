// Mission flow: ordered stages, progressive hints, final scoring and navigation.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { levelDefinition } from '../game/levels/registry'
import { useGameStore } from '../game/store'
import type { ChallengeResult, LevelId, StageDef, Tier } from '../game/types'
import { buildMissionOutcome } from './missionOutcome'
import { useMissionSessionStore } from './missionSession'
import type { MissionBonusAward, MissionRunSummary } from './missionSession'

export type MissionFlowStatus = 'active' | 'stage-clear' | 'done'

export interface UseMissionFlowOptions {
  levelId: LevelId
  kind: 'main' | 'side'
  sideOpId?: string
  stages: StageDef[]
  tier?: Tier
}

export interface MissionFlow {
  stage: StageDef
  stageIndex: number
  totalStages: number
  isLastStage: boolean
  status: MissionFlowStatus
  currentResult: ChallengeResult | null
  results: ChallengeResult[]
  hintsUsed: number
  currentHints: string[]
  canRevealHint: boolean
  revealHint: () => void
  completeStage: (result: ChallengeResult) => void
  next: () => void
  abort: () => void
}

const FALLBACK_STAGE: StageDef = {
  id: 'empty',
  title: 'NO STAGE',
  subtitle: 'This mission has no stages.',
  hints: [],
}

export function useMissionFlow({
  levelId,
  kind,
  sideOpId,
  stages,
  tier = 'assisted',
}: UseMissionFlowOptions): MissionFlow {
  const navigate = useNavigate()
  const startRun = useMissionSessionStore((state) => state.startRun)
  const clearRun = useMissionSessionStore((state) => state.clearRun)
  const recordResult = useMissionSessionStore((state) => state.recordResult)
  const addHints = useMissionSessionStore((state) => state.addHints)
  const finishRun = useMissionSessionStore((state) => state.finishRun)
  const run = useMissionSessionStore((state) => state.run)
  const completeMission = useGameStore((state) => state.completeMission)
  const completeSideOp = useGameStore((state) => state.completeSideOp)
  const completeBonus = useGameStore((state) => state.completeBonus)

  const [stageIndex, setStageIndex] = useState(0)
  const [status, setStatus] = useState<MissionFlowStatus>('active')
  const [currentResult, setCurrentResult] = useState<ChallengeResult | null>(null)
  const [revealed, setRevealed] = useState<Record<string, number>>({})

  useEffect(() => {
    startRun({ levelId, kind, sideOpId, tier })
    setStageIndex(0)
    setStatus('active')
    setCurrentResult(null)
    setRevealed({})
    return () => clearRun()
  }, [levelId, kind, sideOpId, tier, startRun, clearRun])

  const stage = stages[Math.min(stageIndex, Math.max(stages.length - 1, 0))] ?? FALLBACK_STAGE
  const shownHints = revealed[stage.id] ?? 0
  const currentHints = stage.hints.slice(0, shownHints)
  const hintsUsed = run?.hintsUsed ?? 0

  const revealHint = useCallback(() => {
    const shown = revealed[stage.id] ?? 0
    if (shown >= stage.hints.length) return
    setRevealed({ ...revealed, [stage.id]: shown + 1 })
    addHints(1)
  }, [addHints, revealed, stage.hints.length, stage.id])

  const completeStage = useCallback(
    (result: ChallengeResult) => {
      if (status !== 'active') return
      const normalised: ChallengeResult = {
        ...result,
        id: stage.id,
        hintsUsed: revealed[stage.id] ?? 0,
      }
      recordResult(normalised)
      setCurrentResult(normalised)
      setStatus('stage-clear')
    },
    [recordResult, revealed, stage.id, status],
  )

  const next = useCallback(() => {
    if (status !== 'stage-clear') return
    if (stageIndex + 1 < stages.length) {
      setStageIndex((index) => index + 1)
      setCurrentResult(null)
      setStatus('active')
      return
    }

    const activeRun = useMissionSessionStore.getState().run
    if (!activeRun || activeRun.results.length === 0) {
      setStatus('done')
      navigate(kind === 'side' ? `/level/${levelId}` : `/level/${levelId}/debrief`)
      return
    }

    const outcome = buildMissionOutcome(levelId, kind, activeRun.results, activeRun.hintsUsed)
    const level = levelDefinition(levelId)
    const bonuses: MissionBonusAward[] = []

    if (kind === 'main') {
      const earned = useGameStore.getState().levels[levelId].bonusesEarned
      for (const bonus of level.bonuses) {
        if (earned.includes(bonus.id)) continue
        let passed = false
        try {
          passed = bonus.evaluate(outcome.session)
        } catch {
          passed = false
        }
        if (!passed) continue
        const award = completeBonus(levelId, bonus.id)
        if (award.xpGained > 0) {
          bonuses.push({ id: bonus.id, title: bonus.title, xpGained: award.xpGained, hidden: bonus.hidden })
        }
      }
      completeMission(levelId, outcome.aggregate, tier)
    } else if (sideOpId) {
      completeSideOp(levelId, sideOpId, outcome.hintsUsed)
    }

    const summary: MissionRunSummary = {
      levelId,
      kind,
      sideOpId,
      tier,
      results: activeRun.results,
      aggregate: outcome.aggregate,
      composite: outcome.composite,
      rating: outcome.rating,
      session: outcome.session,
      hintsUsed: outcome.hintsUsed,
      mistakes: outcome.mistakes,
      decisions: outcome.decisions,
      bonuses,
      finishedAt: Date.now(),
    }
    finishRun(summary)
    setStatus('done')
    navigate(
      kind === 'side' && sideOpId
        ? `/level/${levelId}/debrief?side=${encodeURIComponent(sideOpId)}`
        : `/level/${levelId}/debrief`,
    )
  }, [
    completeBonus,
    completeMission,
    completeSideOp,
    finishRun,
    kind,
    levelId,
    navigate,
    sideOpId,
    stageIndex,
    stages.length,
    status,
    tier,
  ])

  const abort = useCallback(() => {
    clearRun()
    setStatus('done')
    navigate(`/level/${levelId}`)
  }, [clearRun, levelId, navigate])

  return {
    stage,
    stageIndex,
    totalStages: stages.length,
    isLastStage: stageIndex === stages.length - 1,
    status,
    currentResult,
    results: run?.results ?? [],
    hintsUsed,
    currentHints,
    canRevealHint: status === 'active' && shownHints < stage.hints.length,
    revealHint,
    completeStage,
    next,
    abort,
  }
}

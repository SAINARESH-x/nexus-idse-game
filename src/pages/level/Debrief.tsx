// Mission debrief route: resolves the award and run snapshot (or a finished saved session), then renders the debrief.
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readSession } from '../../game/levelSession'
import type { AwardSummary } from '../../game/progression'
import { useGameStore } from '../../game/store'
import { runtimeFor } from '../../levels/runtimes'
import { DebriefScreen } from '../../shell/DebriefScreen'
import { parseContextFor } from '../../shell/PersistentMission'
import { useMissionSessionStore } from '../../shell/missionSession'
import type { MissionRunSummary } from '../../shell/missionSession'
import { useLevelContext } from './LevelGate'

export function Debrief() {
  const { levelId, level } = useLevelContext()
  const [params] = useSearchParams()
  const lastAward = useGameStore((state) => state.lastAward)
  const attempts = useGameStore((state) => state.levels[levelId].attempts)
  const summary = useMissionSessionStore((state) => state.summary)
  const runtime = runtimeFor(levelId)

  const rawSide = params.get('side')
  const sideOpId = rawSide && level.sideOps.some((item) => item.id === rawSide) ? rawSide : null
  const award = lastAward && lastAward.levelId === levelId ? lastAward : null

  const liveRun =
    summary && summary.levelId === levelId
      ? sideOpId
        ? summary.kind === 'side' && summary.sideOpId === sideOpId
          ? summary
          : null
        : summary.kind === 'main'
          ? summary
          : null
      : null

  // F5 on a Level 05-07 debrief: rebuild it from the finished session record.
  const saved = useMemo<{ run: MissionRunSummary; award: AwardSummary | null } | null>(() => {
    if (liveRun || sideOpId || !runtime.persistent) return null
    const parsed = readSession(levelId, parseContextFor(level, runtime, attempts))
    if (!parsed.ok || parsed.session.status !== 'finished' || !parsed.session.report) return null
    const run = parsed.session.report.summary as MissionRunSummary
    if (!run || typeof run !== 'object' || run.levelId !== levelId || !Array.isArray(run.results)) return null
    return { run, award: parsed.session.report.award }
  }, [attempts, level, levelId, liveRun, runtime, sideOpId])

  if (runtime.Debrief) return <runtime.Debrief sideOpId={sideOpId} />

  const run = liveRun ?? saved?.run ?? null
  const shownAward = liveRun ? award : saved ? saved.award : award
  return (
    <>
      <DebriefScreen levelId={levelId} level={level} award={shownAward} run={run} sideOpId={sideOpId} />
      {runtime.DebriefExtra && run && <runtime.DebriefExtra sideOpId={sideOpId} />}
    </>
  )
}

// Mission debrief route: resolves the award and run snapshot, then renders the debrief.
import { useSearchParams } from 'react-router-dom'
import { useGameStore } from '../../game/store'
import { useMissionSessionStore } from '../../shell/missionSession'
import { DebriefScreen } from '../../shell/DebriefScreen'
import { useLevelContext } from './LevelGate'

export function Debrief() {
  const { levelId, level } = useLevelContext()
  const [params] = useSearchParams()
  const lastAward = useGameStore((state) => state.lastAward)
  const summary = useMissionSessionStore((state) => state.summary)

  const rawSide = params.get('side')
  const sideOpId = rawSide && level.sideOps.some((item) => item.id === rawSide) ? rawSide : null
  const award = lastAward && lastAward.levelId === levelId ? lastAward : null

  const run =
    summary && summary.levelId === levelId
      ? sideOpId
        ? summary.kind === 'side' && summary.sideOpId === sideOpId
          ? summary
          : null
        : summary.kind === 'main'
          ? summary
          : null
      : null

  return <DebriefScreen levelId={levelId} level={level} award={award} run={run} sideOpId={sideOpId} />
}

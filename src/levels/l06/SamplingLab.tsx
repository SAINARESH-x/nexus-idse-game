// Level 06 Stage 2 SAMPLING LAB: random vs convenience sampling, the standard error, and a confidence interval for dropouts.
import { useEffect, useMemo, useRef } from 'react'
import type { ChallengeProps } from '../../game/types'
import { useLevelSeed } from '../../shell/stageState'
import { useMissionUi } from '../../shell/MissionUi'
import { CiPanel } from './CiPanel'
import { MeansPanel } from './MeansPanel'
import { l06Population } from './population'
import { buildResult } from './results'
import { SAMPLING_INITIAL } from './stageStates'
import { usePatchState } from './usePatchState'

export function SamplingLab({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(6)
  const rows = useMemo(() => l06Population(seed), [seed])
  const [state, patch] = usePatchState(id, SAMPLING_INITIAL)
  const ui = useMissionUi()
  const reported = useRef(false)

  useEffect(() => { if (state.aDone) ui.completeObjective('l6-obj-se') }, [state.aDone, ui])
  useEffect(() => { if (state.bDone) ui.completeObjective('l6-obj-bias') }, [state.bDone, ui])
  useEffect(() => { if (state.cDone) ui.completeObjective('l6-obj-ci') }, [state.cDone, ui])

  useEffect(() => {
    if (!(state.aDone && state.bDone && state.cDone) || reported.current) return
    reported.current = true
    onComplete(
      buildResult(id, {
        mistakes: state.miss.a + state.miss.b + state.miss.c,
        steps: 3,
        runs: state.runIndex + state.drawIndex,
        parRuns: 4,
        decisions: [
          { label: 'Reached SE <= 0.10 with random sampling', good: true, explanation: 'SE = sigma / sqrt(n): precision is bought with sample size, at a square-root rate.' },
          { label: 'Rejected "just sample more" for a biased frame', good: state.miss.b === 0, explanation: 'Selection bias does not shrink with n; only the selection method can remove it.' },
          { label: `Interval covered the true rate after ${state.drawIndex} draw(s)`, good: null, explanation: 'Coverage is a property of the method: about 95% of 95% intervals contain the truth, so a miss is not a mistake.' },
        ],
        extra: { l6CiDraws: state.drawIndex },
      }),
    )
  }, [state, id, onComplete])

  return (
    <div className="flex flex-col gap-4" data-testid="sampling-lab">
      <p className="text-sm text-muted">LAB BENCH 2. You cannot survey all {rows.length} students. How much can a sample tell you, and when does it lie?</p>
      <MeansPanel rows={rows} seed={seed} state={state} patch={patch} />
      {state.aDone && state.bDone ? <CiPanel rows={rows} seed={seed} state={state} patch={patch} /> : <p className="text-xs text-muted">Bench C unlocks after both sampling goals.</p>}
    </div>
  )
}

// Level 06 Stage 3 THE VERDICT: permutation-test hypothesis lab, replication re-runs, and the fishing trip.
import { useEffect, useMemo, useRef } from 'react'
import type { ChallengeProps } from '../../game/types'
import { useLevelSeed } from '../../shell/stageState'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { L06_FACTS } from './bonuses'
import { FISHING_ALPHA } from './config'
import { FishingPanel } from './FishingPanel'
import { HypothesisPanel } from './HypothesisPanel'
import { l06Population } from './population'
import { buildResult } from './results'
import { VERDICT_INITIAL } from './stageStates'
import { fishingTrip } from './statsLab'
import { usePatchState } from './usePatchState'

export function VerdictLab({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(6)
  const rows = useMemo(() => l06Population(seed), [seed])
  const [state, patch] = usePatchState(id, VERDICT_INITIAL)
  const ui = useMissionUi()
  const reported = useRef(false)
  const ready = state.verdictDone && state.fishDone && state.bonferroni

  useEffect(() => { if (state.verdictDone) ui.completeObjective('l6-obj-verdict') }, [state.verdictDone, ui])
  useEffect(() => { if (state.fishDone && state.bonferroni) ui.completeObjective('l6-obj-fishing') }, [state.fishDone, state.bonferroni, ui])

  const file = () => {
    if (!ready || reported.current) return
    reported.current = true
    const trip = fishingTrip(rows, seed)
    const flaggedFalsePositive = state.flagged.some((i) => (trip.comparisons[i]?.p ?? 1) < FISHING_ALPHA)
    onComplete(
      buildResult(id, {
        mistakes: state.miss.a + state.miss.b,
        steps: 4,
        runs: 1 + state.reruns,
        parRuns: 1 + state.reruns,
        decisions: [
          { label: 'Stated the null as "no difference"', good: state.miss.a === 0, explanation: 'H0 is the no-effect world; the permutation test builds that world by shuffling labels.' },
          { label: `Verdict: ${state.verdict === 'reject' ? 'reject' : 'do not reject'} H0 at alpha ${state.alpha}`, good: true, explanation: 'Reject if and only if p <= alpha. With 1000 shuffles p is precise enough to decide.' },
          { label: 'Explained the fishing-trip hit', good: state.miss.b === 0, explanation: '20 tests at 0.05 expect one false positive on noise; Bonferroni tests each at 0.05/20.' },
        ],
        extra: {
          [L06_FACTS.reruns]: state.reruns,
          [L06_FACTS.verdictStable]: state.stable,
          [L06_FACTS.falsePositiveFlagged]: flaggedFalsePositive,
          l6Question: state.question,
        },
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="verdict-lab">
      <p className="text-sm text-muted">LAB BENCH 3. Is the pattern a signal, or could chance alone produce it?</p>
      <HypothesisPanel rows={rows} seed={seed} state={state} patch={patch} />
      {state.verdictDone ? <FishingPanel rows={rows} seed={seed} state={state} patch={patch} /> : <p className="text-xs text-muted">Bench B unlocks after the verdict.</p>}
      <div>
        <NeonButton onClick={file} disabled={!ready} tooltip={!ready ? 'Deliver the verdict and finish the fishing trip first' : undefined} data-testid="file-report">
          FILE THE REPORT
        </NeonButton>
      </div>
    </div>
  )
}

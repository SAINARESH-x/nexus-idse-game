// Level 06 Stage 1 PROBABILITY LAB: events and the law of large numbers, conditional probability, binomial distribution.
import { useEffect, useMemo, useRef } from 'react'
import type { ChallengeProps } from '../../game/types'
import { useLevelSeed } from '../../shell/stageState'
import { useMissionUi } from '../../shell/MissionUi'
import { BinomialPanel } from './BinomialPanel'
import { ConditionalPanel } from './ConditionalPanel'
import { EventPanel } from './EventPanel'
import { l06Population } from './population'
import { buildResult } from './results'
import { PROBABILITY_INITIAL } from './stageStates'
import { usePatchState } from './usePatchState'

export function ProbabilityLab({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(6)
  const rows = useMemo(() => l06Population(seed), [seed])
  const [state, patch] = usePatchState(id, PROBABILITY_INITIAL)
  const ui = useMissionUi()
  const reported = useRef(false)

  useEffect(() => { if (state.aDone) ui.completeObjective('l6-obj-events') }, [state.aDone, ui])
  useEffect(() => { if (state.bDone) ui.completeObjective('l6-obj-conditional') }, [state.bDone, ui])
  useEffect(() => { if (state.cDone) ui.completeObjective('l6-obj-binomial') }, [state.cDone, ui])

  useEffect(() => {
    if (!(state.aDone && state.bDone && state.cDone) || reported.current) return
    reported.current = true
    const m = state.miss
    onComplete(
      buildResult(id, {
        mistakes: m.a + m.b + m.c,
        steps: 3 + 3,
        runs: state.runs + state.binRuns,
        parRuns: 3,
        decisions: [
          { label: 'Simulated a compound event to 1000+ draws', good: true, explanation: 'The relative frequency converges to the exact probability count/n (law of large numbers).' },
          { label: 'Conditioned on the right denominator', good: m.b === 0, explanation: 'P(dropout | att<60) divides the joint count by the number of low attenders; P(A|B) differs from P(B|A).' },
          { label: `Found the smallest group size n = ${state.bin ?? '?'}`, good: m.c === 0, explanation: 'P(X >= 2) = 1 - P(X = 0) - P(X = 1) grows with n; the binomial mean is np and the sd is sqrt(np(1-p)).' },
        ],
      }),
    )
  }, [state, id, onComplete])

  return (
    <div className="flex flex-col gap-4" data-testid="probability-lab">
      <p className="text-sm text-muted">LAB BENCH 1. Population: {rows.length} students (seed {seed}). Every number below is computed from them.</p>
      <EventPanel rows={rows} seed={seed} state={state} patch={patch} />
      {state.aDone ? <ConditionalPanel rows={rows} state={state} patch={patch} /> : <p className="text-xs text-muted">Bench B unlocks after bench A.</p>}
      {state.bDone ? <BinomialPanel rows={rows} seed={seed} state={state} patch={patch} /> : <p className="text-xs text-muted">Bench C unlocks after bench B.</p>}
    </div>
  )
}

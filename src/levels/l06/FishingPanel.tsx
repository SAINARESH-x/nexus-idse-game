// Level 06 Stage 3b: the fishing trip, 20 noise comparisons, explaining the false positive, and the Bonferroni correction.
import { useMemo } from 'react'
import { Flag } from 'lucide-react'
import type { CohortStudent } from '../../engine/cohort'
import { ChoiceSimulator, type ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { NeonButton } from '../../ui/NeonButton'
import { FISHING_ALPHA, FISHING_COMPARISONS } from './config'
import { BenchPanel, CodeLine, f3 } from './LabBench'
import type { VerdictState } from './stageStates'
import { bonferroniThreshold, fishingTrip, type FishingTrip } from './statsLab'
import type { Patch } from './usePatchState'

export function fishingScenario(trip: FishingTrip): ChoiceScenario {
  const best = [...trip.comparisons].sort((a, b) => a.p - b.p)[0]
  const expected = FISHING_COMPARISONS * FISHING_ALPHA
  return {
    id: 'fishing',
    title: 'Why did it light up?',
    prompt: `"${best?.label ?? '?'}" gives p = ${f3(best?.p ?? NaN)} < 0.05. Every group label here was a coin flip. What explains it?`,
    options: [
      { id: 'real', label: 'A real effect we just discovered', correct: false, simulate: () => ({ ok: true, output: `The labels were random: the true difference is exactly 0 by construction.` }), explanation: 'Random labels cannot have a real effect. This is a false positive (Type I error).' },
      { id: 'multiple', label: 'Many tests: some pass by chance', correct: true, simulate: () => ({ ok: true, output: `Expected false positives = ${FISHING_COMPARISONS} x ${FISHING_ALPHA} = ${expected.toFixed(1)}; observed ${trip.rawSignificant}.` }), explanation: 'At alpha 0.05 each test on pure noise passes 5% of the time; run 20 and about one will.' },
      { id: 'small', label: 'The sample of 400 is too small', correct: false, simulate: () => ({ ok: true, output: 'With more data noise comparisons still pass 5% of the time at alpha 0.05.' }), explanation: 'The false-positive rate of a valid test is alpha at any n.' },
    ],
  }
}

export function FishingPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: VerdictState; patch: Patch<VerdictState> }) {
  const trip = useMemo(() => fishingTrip(rows, seed), [rows, seed])
  const scenarios = useMemo(() => [fishingScenario(trip)], [trip])
  const bonf = bonferroniThreshold(FISHING_ALPHA, FISHING_COMPARISONS)
  const survivors = trip.comparisons.filter((c) => c.p < bonf).length

  const toggleFlag = (id: number) =>
    patch((s) => ({ flagged: s.flagged.includes(id) ? s.flagged.filter((x) => x !== id) : [...s.flagged, id] }))

  return (
    <BenchPanel title="B. FISHING TRIP" goal="explain the raw hits, then apply Bonferroni" done={state.fishDone && state.bonferroni} testId="panel-fishing">
      <p className="mb-2 text-sm text-muted">
        A dean ran {FISHING_COMPARISONS} comparisons of cgpa on 400 students. Every split was a random coin flip dressed up as a factor.
      </p>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full font-mono text-xs" aria-label="fishing trip comparisons">
          <thead>
            <tr className="text-muted"><th className="text-left">factor</th><th>mean yes</th><th>mean no</th><th>p</th><th>p &lt; 0.05</th>{state.bonferroni && <th>p &lt; {bonf}</th>}<th>flag</th></tr>
          </thead>
          <tbody>
            {trip.comparisons.map((c) => {
              const raw = c.p < FISHING_ALPHA
              return (
                <tr key={c.id} className={raw ? 'text-amber' : ''}>
                  <td>{c.label}</td>
                  <td className="text-right">{c.meanA.toFixed(2)}</td>
                  <td className="text-right">{c.meanB.toFixed(2)}</td>
                  <td className="text-right">{c.p.toFixed(3)}</td>
                  <td className="text-center">{raw ? 'YES *' : 'no'}</td>
                  {state.bonferroni && <td className="text-center">{c.p < bonf ? 'YES' : 'no'}</td>}
                  <td className="text-center">
                    <button type="button" onClick={() => toggleFlag(c.id)} aria-pressed={state.flagged.includes(c.id)} aria-label={`flag ${c.label} as a false positive`} data-testid={`flag-${c.id}`} className="rounded p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
                      <Flag size={12} aria-hidden className={state.flagged.includes(c.id) ? 'text-magenta' : 'text-muted'} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 font-mono text-xs" data-testid="fishing-raw">Raw hits at 0.05: {trip.rawSignificant} of {FISHING_COMPARISONS}.</p>
      <CodeLine code="[scipy.stats.ttest_ind(df.cgpa[g], df.cgpa[~g]).pvalue for g in coin_flip_groups]  # z approximation in game" label="scipy" />
      {!state.fishDone && (
        <div className="mt-3">
          <ChoiceSimulator scenarios={scenarios} onComplete={(sum) => patch((s) => ({ fishDone: true, miss: { ...s.miss, b: s.miss.b + sum.mistakes } }))} />
        </div>
      )}
      {state.fishDone && !state.bonferroni && (
        <NeonButton className="mt-3" size="sm" onClick={() => patch({ bonferroni: true })} data-testid="apply-bonferroni">
          APPLY BONFERRONI (alpha / {FISHING_COMPARISONS} = {bonf})
        </NeonButton>
      )}
      {state.bonferroni && (
        <>
          <p className="mt-2 text-sm text-green" data-testid="bonferroni-result">Bonferroni threshold {bonf}: {survivors} comparison(s) survive. The false positives vanish.</p>
          <CodeLine code={`statsmodels.stats.multitest.multipletests(pvals, alpha=0.05, method='bonferroni')`} label="statsmodels" />
        </>
      )}
    </BenchPanel>
  )
}

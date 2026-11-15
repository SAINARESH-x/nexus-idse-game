// Level 06 Stage 1c: the binomial distribution of dropouts in a group, simulated histogram vs exact PMF, tail probability goal.
import { useMemo, useState } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed } from '../../engine/rng'
import { BarChart } from '../../components/charts/BarChart'
import { NeonButton } from '../../ui/NeonButton'
import { BINOM_N_MAX, BINOM_N_MIN, BINOM_SIM_REPS, BINOM_TARGET_K, BINOM_TARGET_P, L06_SALTS } from './config'
import { BenchControls, BenchPanel, CodeLine, Readout, f3 } from './LabBench'
import { binomialAtLeast, binomialMean, binomialPmfAll, binomialSd, simulateBinomial, smallestNForTail } from './probability'
import type { ProbabilityState } from './stageStates'
import type { Patch } from './usePatchState'

/** The cohort dropout rate rounded to two decimals: the p the player must set. */
export function targetP(rows: readonly CohortStudent[]): number {
  const rate = rows.filter((r) => r.dropped_out === 1).length / Math.max(1, rows.length)
  return Math.round(rate * 100) / 100
}

export function BinomialPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: ProbabilityState; patch: Patch<ProbabilityState> }) {
  const { binN: n, binP: p } = state
  const tp = useMemo(() => targetP(rows), [rows])
  const answer = useMemo(() => smallestNForTail(tp, BINOM_TARGET_K, BINOM_TARGET_P, BINOM_N_MAX), [tp])
  const pmf = useMemo(() => binomialPmfAll(n, p), [n, p])
  const sim = useMemo(
    () => (state.binRuns > 0 ? simulateBinomial(n, p, BINOM_SIM_REPS, mixSeed(seed, L06_SALTS.binomial, state.binRuns)) : null),
    [n, p, seed, state.binRuns],
  )
  const tail = binomialAtLeast(BINOM_TARGET_K, n, p)
  const simTail = sim ? sim.slice(BINOM_TARGET_K).reduce((a, b) => a + b, 0) / BINOM_SIM_REPS : null
  const [feedback, setFeedback] = useState<string | null>(null)
  const categories = pmf.map((_, k) => String(k))

  const submit = () => {
    const pOk = Math.abs(p - tp) < 1e-9
    if (pOk && n === answer) {
      setFeedback(`Correct: with p = ${tp}, n = ${n} is the smallest group where P(X >= 2) = ${f3(tail)} >= 0.5.`)
      patch({ cDone: true, bin: n })
      return
    }
    patch((s) => ({ miss: { ...s.miss, c: s.miss.c + 1 } }))
    if (!pOk) setFeedback(`p must be the cohort dropout rate (${tp}); you used ${p.toFixed(2)}.`)
    else if (tail < BINOM_TARGET_P) setFeedback(`P(X >= 2) = ${f3(tail)} is still below 0.5: the group is too small.`)
    else setFeedback(`P(X >= 2) = ${f3(tail)} passes, but a smaller group also does. Find the smallest n.`)
  }

  return (
    <BenchPanel title="C. BINOMIAL DISTRIBUTION" goal={`set p = cohort dropout rate (${tp}) and find the smallest n with P(X >= 2) >= 0.5`} done={state.cDone} testId="panel-binomial">
      <p className="mb-2 text-sm text-muted">
        X = number of dropouts in an advisor group of n students, each dropping out independently with probability p.
        X ~ Binomial(n, p). (The game assumes independence; real groups can share causes.)
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col font-mono text-xs text-muted">
          group size n = {n}
          <input type="range" min={BINOM_N_MIN} max={BINOM_N_MAX} value={n} onChange={(e) => patch({ binN: Number(e.target.value) })} aria-label="group size n" data-testid="binom-n" className="accent-cyan" />
        </label>
        <label className="flex flex-col font-mono text-xs text-muted">
          probability p = {p.toFixed(2)}
          <input type="range" min={0.01} max={0.5} step={0.01} value={p} onChange={(e) => patch({ binP: Math.round(Number(e.target.value) * 100) / 100 })} aria-label="probability p" data-testid="binom-p" className="accent-cyan" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Readout label="mean n*p" value={f3(binomialMean(n, p))} tone="cyan" />
        <Readout label="sd sqrt(np(1-p))" value={f3(binomialSd(n, p))} />
        <Readout label="exact P(X >= 2)" value={f3(tail)} tone={tail >= BINOM_TARGET_P ? 'green' : 'amber'} />
        <Readout label="simulated P(X >= 2)" value={simTail === null ? 'not run' : f3(simTail)} />
      </div>
      <CodeLine code={`scipy.stats.binom.sf(${BINOM_TARGET_K - 1}, ${n}, ${p.toFixed(2)})  # P(X >= ${BINOM_TARGET_K}) = ${f3(tail)}`} label="scipy" />
      <CodeLine code={`np.random.default_rng(seed).binomial(${n}, ${p.toFixed(2)}, size=${BINOM_SIM_REPS})`} label="numpy" />
      <div className="mt-3 flex flex-wrap gap-2">
        <BenchControls testPrefix="binom" runLabel={`SIMULATE ${BINOM_SIM_REPS} GROUPS`} onRun={() => patch((s) => ({ binRuns: s.binRuns + 1 }))} onReset={() => patch({ binN: 10, binP: 0.2 })} />
        <NeonButton size="sm" onClick={submit} disabled={state.binRuns === 0 || state.cDone} tooltip={state.binRuns === 0 ? 'Simulate at least once first' : undefined} data-testid="binom-submit">
          SUBMIT n
        </NeonButton>
      </div>
      {feedback && <p className={`mt-2 text-sm ${state.cDone ? 'text-green' : 'text-amber'}`} role="status">{feedback}</p>}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <BarChart title="Exact PMF P(X = k)" categories={categories} values={pmf} highlighted={categories.slice(BINOM_TARGET_K)} xLabel="dropouts k" yLabel="probability" valueFormat={(v) => v.toFixed(2)} />
        {sim && <BarChart title={`Simulated share of ${BINOM_SIM_REPS} groups`} categories={categories} values={sim.map((c) => c / BINOM_SIM_REPS)} highlighted={categories.slice(BINOM_TARGET_K)} xLabel="dropouts k" yLabel="share" valueFormat={(v) => v.toFixed(2)} />}
      </div>
    </BenchPanel>
  )
}

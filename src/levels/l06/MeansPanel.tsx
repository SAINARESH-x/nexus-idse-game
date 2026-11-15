// Level 06 Stage 2a/2b: sampling distribution of the mean, empirical vs theoretical SE, and convenience-sample bias.
import { useMemo } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed } from '../../engine/rng'
import { mean, popStd } from '../../engine/stats'
import { Histogram } from '../../components/charts/Histogram'
import { ChoiceSimulator, type ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import {
  CONVENIENCE_ATTENDANCE, CONVENIENCE_BIAS_MIN, CONVENIENCE_LARGE_N, L06_SALTS, REPEAT_REPS, SAMPLE_N_MAX, SAMPLE_N_MIN, SE_TARGET,
} from './config'
import { BenchControls, BenchPanel, CodeLine, Readout, Segmented, f3 } from './LabBench'
import type { SamplingState } from './stageStates'
import { empiricalSE, sampleMeans, theoreticalSE, type SamplingMethod } from './statsLab'
import type { Patch } from './usePatchState'

export function biggerSampleScenario(rows: readonly CohortStudent[], seed: number): ChoiceScenario {
  const run = (n: number, method: SamplingMethod) => {
    const r = sampleMeans(rows, n, REPEAT_REPS, mixSeed(seed, L06_SALTS.sampling, 9999), method)
    return `${method} n=${r.effectiveN}: centre ${f3(mean(r.means))}, true ${f3(r.trueMean)}, bias ${f3(mean(r.means) - r.trueMean)}`
  }
  return {
    id: 'bigger',
    title: 'Would a bigger sample fix this?',
    prompt: `The convenience frame (attendance > ${CONVENIENCE_ATTENDANCE}) overestimates mean cgpa. A colleague proposes sampling more of the same students.`,
    options: [
      { id: 'more', label: 'Yes: sample 500 from the same frame', code: `df[df.attendance > ${CONVENIENCE_ATTENDANCE}].sample(500)`, correct: false, simulate: () => ({ ok: true, output: run(500, 'convenience') }), explanation: 'More students from the wrong frame shrink the spread, not the bias. The centre stays off.' },
      { id: 'random', label: 'No: draw a random sample from everyone', code: 'df.sample(500)', correct: true, simulate: () => ({ ok: true, output: run(500, 'random') }), explanation: 'Bias comes from how the sample is chosen. Random selection removes it; size only reduces variance.' },
    ],
  }
}

export function MeansPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: SamplingState; patch: Patch<SamplingState> }) {
  const cgpa = useMemo(() => rows.map((r) => r.cgpa), [rows])
  const sigma = useMemo(() => popStd(cgpa), [cgpa])
  const trueMean = useMemo(() => mean(cgpa), [cgpa])
  const last = state.lastRun
  const result = useMemo(
    () => (last ? sampleMeans(rows, last.n, REPEAT_REPS, mixSeed(seed, L06_SALTS.sampling, last.runIndex), last.method) : null),
    [rows, seed, last],
  )
  const scenario = useMemo(() => [biggerSampleScenario(rows, seed)], [rows, seed])
  const seNow = theoreticalSE(cgpa, state.n)

  const repeat = () =>
    patch((s) => {
      const lastRun = { n: s.n, method: s.method, runIndex: s.runIndex }
      const res = sampleMeans(rows, s.n, REPEAT_REPS, mixSeed(seed, L06_SALTS.sampling, s.runIndex), s.method)
      const bias = mean(res.means) - res.trueMean
      return {
        lastRun,
        runIndex: s.runIndex + 1,
        aDone: s.aDone || (s.method === 'random' && theoreticalSE(cgpa, s.n) <= SE_TARGET),
        biasShown: s.biasShown || (s.method === 'convenience' && s.n >= CONVENIENCE_LARGE_N && Math.abs(bias) > CONVENIENCE_BIAS_MIN),
      }
    })

  const centre = result ? mean(result.means) : NaN
  return (
    <BenchPanel
      title="A. SAMPLING DISTRIBUTION"
      goal={`random sample with SE <= ${SE_TARGET}, then a convenience run at n >= ${CONVENIENCE_LARGE_N}`}
      done={state.aDone && state.bDone}
      testId="panel-means"
    >
      <div className="flex flex-col gap-2">
        <label className="flex flex-col font-mono text-xs text-muted">
          sample size n = {state.n}
          <input type="range" min={SAMPLE_N_MIN} max={SAMPLE_N_MAX} value={state.n} onChange={(e) => patch({ n: Number(e.target.value) })} aria-label="sample size n" data-testid="sample-n" className="accent-cyan" />
        </label>
        <Segmented<SamplingMethod> label="method" value={state.method} options={['random', 'convenience']} onChange={(v) => patch({ method: v })} testId="method" />
        <BenchControls testPrefix="sampling" runLabel={`REPEAT x${REPEAT_REPS}`} onRun={repeat} onReset={() => patch({ lastRun: null })} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Readout label="true mean cgpa" value={f3(trueMean)} tone="cyan" />
        <Readout label="theoretical SE at n" value={f3(seNow)} tone={seNow <= SE_TARGET ? 'green' : 'amber'} />
        <Readout label="empirical SE (last run)" value={result ? f3(empiricalSE(result.means)) : 'not run'} />
        <Readout label="centre - truth" value={result ? f3(centre - trueMean) : 'not run'} tone={result && Math.abs(centre - trueMean) > CONVENIENCE_BIAS_MIN ? 'red' : 'text'} />
      </div>
      <CodeLine code={`df.cgpa.std(ddof=0) / np.sqrt(${state.n})  # sigma / sqrt(n) = ${f3(sigma)} / ${Math.sqrt(state.n).toFixed(2)} = ${f3(seNow)}`} label="numpy" />
      <CodeLine code={`means = [${state.method === 'random' ? 'df' : `df[df.attendance > ${CONVENIENCE_ATTENDANCE}]`}.cgpa.sample(${state.n}).mean() for _ in range(${REPEAT_REPS})]; np.std(means, ddof=1)`} label="pandas" />
      {result && last && (
        <>
          {last.method === 'convenience' && result.effectiveN < last.n && (
            <p className="mt-2 text-xs text-amber">The convenience frame only has {result.effectiveN} students, so every sample is the whole frame (effective n = {result.effectiveN}).</p>
          )}
          <Histogram
            title={`${REPEAT_REPS} sample means (${last.method}, n = ${result.effectiveN})`}
            values={result.means}
            binCount={15}
            xLabel="sample mean cgpa"
            markers={[{ x: trueMean, label: 'true mean', colour: 'green' }, { x: centre, label: 'centre', colour: 'magenta' }]}
          />
        </>
      )}
      {state.aDone && <p className="mt-2 text-sm text-green">SE goal met: random samples centre on the truth, and the spread matches sigma / sqrt(n).</p>}
      {state.biasShown && !state.bDone && (
        <div className="mt-3">
          <ChoiceSimulator scenarios={scenario} onComplete={(sum) => patch((s) => ({ bDone: true, miss: { ...s.miss, b: s.miss.b + sum.mistakes } }))} />
        </div>
      )}
      {state.bDone && <p className="mt-2 text-sm text-green">Bias is about who is sampled, not how many.</p>}
    </BenchPanel>
  )
}

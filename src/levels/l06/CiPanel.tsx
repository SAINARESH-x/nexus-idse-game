// Level 06 Stage 2c: a confidence interval for the dropout rate, with persisted draw indices and DRAW AGAIN.
import { useMemo } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { CI_LEVELS, CI_SIZES } from './config'
import { BenchControls, BenchPanel, CodeLine, Readout, Segmented, f3, pct } from './LabBench'
import type { SamplingState } from './stageStates'
import { dropoutCiDraw } from './statsLab'
import type { Patch } from './usePatchState'

export function CiPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: SamplingState; patch: Patch<SamplingState> }) {
  const last = state.lastDraw
  const draw = useMemo(() => (last ? dropoutCiDraw(rows, last.n, last.level, seed, last.drawIndex) : null), [rows, seed, last])

  const run = () =>
    patch((s) => {
      const res = dropoutCiDraw(rows, s.ciN, s.ciLevel, seed, s.drawIndex)
      return { lastDraw: { n: s.ciN, level: s.ciLevel, drawIndex: s.drawIndex }, drawIndex: s.drawIndex + 1, cDone: s.cDone || res.covers }
    })

  return (
    <BenchPanel title="C. CONFIDENCE INTERVAL" goal="draw a sample whose interval contains the true dropout rate" done={state.cDone} testId="panel-ci">
      <div className="flex flex-col gap-2">
        <Segmented label="sample n" value={state.ciN} options={CI_SIZES} onChange={(v) => patch({ ciN: v })} testId="ci-n" />
        <Segmented label="confidence" value={state.ciLevel} options={CI_LEVELS} format={(v) => pct(v, 0)} onChange={(v) => patch({ ciLevel: v })} testId="ci-level" />
        <BenchControls testPrefix="ci" runLabel={last ? 'DRAW AGAIN' : 'DRAW'} onRun={run} onReset={() => patch({ lastDraw: null })} />
      </div>
      {draw && last && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Readout label="sample rate" value={f3(draw.interval.mean)} />
            <Readout label={`${pct(last.level, 0)} interval`} value={`[${f3(draw.interval.lo)}, ${f3(draw.interval.hi)}]`} tone="cyan" />
            <Readout label="true rate" value={f3(draw.trueRate)} />
            <Readout label="covers?" value={draw.covers ? 'YES, covers' : 'NO, missed'} tone={draw.covers ? 'green' : 'red'} />
          </div>
          <p className="mt-2 text-xs text-muted">Draw #{last.drawIndex + 1}. Width {f3(draw.interval.width)} = 2 x {draw.interval.z} x SE {f3(draw.interval.se)}.</p>
        </>
      )}
      <CodeLine code={`s = df.dropped_out.sample(${state.ciN}); s.mean() + np.array([-1, 1]) * ${state.ciLevel === 0.9 ? 1.645 : state.ciLevel === 0.99 ? 2.576 : 1.96} * s.std(ddof=1) / np.sqrt(${state.ciN})`} label="numpy" />
      <CodeLine code={`scipy.stats.norm.interval(${state.ciLevel}, loc=s.mean(), scale=s.sem())`} label="scipy" />
      <p className="mt-2 text-xs text-muted">Normal-approximation interval (the game simplifies: no finite-population correction, no Wilson interval).</p>
    </BenchPanel>
  )
}

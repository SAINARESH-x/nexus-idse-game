// Level 06 Stage 1a: build an event from chips, read its exact probability, and simulate the law of large numbers.
import { useMemo } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { mixSeed } from '../../engine/rng'
import { LineChart } from '../../components/charts/LineChart'
import { L06_SALTS, LLN_SIZES, LLN_STEP } from './config'
import { BenchControls, BenchPanel, CodeLine, Readout, Segmented, f3 } from './LabBench'
import {
  EVENT_CHIPS, additionRule, chipById, eventCode, eventLabel, eventTest, exactProbability, isCompound, simulateFrequency,
  type Connector, type EventChipId,
} from './probability'
import type { ProbabilityState } from './stageStates'
import type { Patch } from './usePatchState'

const CHIP_IDS = EVENT_CHIPS.map((c) => c.id)
const chipLabel = (id: EventChipId) => chipById(id).label

export function EventPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: ProbabilityState; patch: Patch<ProbabilityState> }) {
  const spec = { first: state.first, connector: state.connector, second: state.second }
  const compound = isCompound(spec)
  const { first, connector, second } = state
  const outcomes = useMemo(() => rows.map(eventTest({ first, connector, second })), [rows, first, connector, second])
  const exact = useMemo(() => exactProbability(outcomes, (x) => x), [outcomes])
  const points = useMemo(
    () => simulateFrequency(outcomes, state.drawn, mixSeed(seed, L06_SALTS.lln, state.runs)),
    [outcomes, state.drawn, seed, state.runs],
  )
  const last = points[points.length - 1]
  const union = spec.connector === 'or' && compound ? additionRule(rows, chipById(spec.first).test, chipById(spec.second).test) : null

  const changeEvent = (p: Partial<ProbabilityState>) => patch({ ...p, drawn: 0 })
  const settle = (drawn: number) => (compound && drawn >= 1000 ? { aDone: true } : {})
  const run = () => patch((s) => ({ runs: s.runs + 1, drawn: s.k, ...settle(s.k) }))
  const step = () => patch((s) => ({ drawn: s.drawn + LLN_STEP, ...settle(s.drawn + LLN_STEP) }))

  return (
    <BenchPanel title="A. SAMPLE SPACE AND EVENTS" goal="build a compound event (AND / OR) and simulate at least 1000 draws" done={state.aDone} testId="panel-events">
      <p className="mb-2 text-sm text-muted">
        The sample space is the 2000 students. An event is a subset of them; its exact probability is count / n.
      </p>
      <div className="flex flex-col gap-2">
        <Segmented label="event A" value={state.first} options={CHIP_IDS} format={chipLabel} onChange={(v) => changeEvent({ first: v })} />
        <Segmented<Connector> label="combine" value={state.connector} options={['none', 'and', 'or']} format={(v) => v.toUpperCase()} onChange={(v) => changeEvent({ connector: v })} testId="connector" />
        {state.connector !== 'none' && (
          <Segmented label="event B" value={state.second} options={CHIP_IDS} format={chipLabel} onChange={(v) => changeEvent({ second: v })} testId="second-chip" />
        )}
      </div>
      {state.connector !== 'none' && !compound && <p className="mt-1 text-xs text-amber">Pick a different chip for B to make a compound event.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Readout label="event" value={eventLabel(spec)} />
        <Readout label="exact P" value={`${exact.count} / ${exact.n} = ${f3(exact.p)}`} tone="cyan" />
        <Readout label="draws" value={state.drawn} />
        <Readout label="frequency" value={last ? `${f3(last.y)} (gap ${f3(Math.abs(last.y - exact.p))})` : 'not run'} tone="green" />
      </div>
      {union && (
        <p className="mt-2 font-mono text-xs text-muted" data-testid="addition-rule">
          Addition rule: P(A or B) = P(A) + P(B) - P(A and B) = {f3(union.pA)} + {f3(union.pB)} - {f3(union.pAB)} = {f3(union.pUnion)}
        </p>
      )}
      <CodeLine code={`${eventCode(spec)}  # = ${f3(exact.p)}`} label="pandas" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmented label="draws k" value={state.k} options={LLN_SIZES} onChange={(v) => patch({ k: v })} testId="lln-k" />
        <BenchControls testPrefix="lln" onRun={run} onStep={state.drawn > 0 ? step : undefined} onReset={() => patch({ drawn: 0 })} runLabel={`RUN ${state.k} DRAWS`} />
      </div>
      <CodeLine code={`rng.choice(df.index, size=${state.k}, replace=True)  # then the running mean of the event`} label="numpy" />
      {points.length > 0 && (
        <LineChart
          title="Running frequency vs exact probability"
          xLabel="draws"
          yLabel="relative frequency"
          series={[
            { name: 'simulated frequency', points },
            { name: 'exact P', points: [{ x: points[0].x, y: exact.p }, { x: last.x, y: exact.p }] },
          ]}
        />
      )}
      {state.aDone && <p className="mt-2 text-sm text-green">Law of large numbers: as draws grow, the frequency settles on the exact probability.</p>}
    </BenchPanel>
  )
}

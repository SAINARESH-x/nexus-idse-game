// Level 06 side op COVERAGE CASINO: deal 100 confidence intervals, count coverage, compare confidence levels and widths.
import { useMemo, useRef, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { ChoiceSimulator, type ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { useLevelSeed } from '../../shell/stageState'
import { useMissionUi } from '../../shell/MissionUi'
import { COVERAGE_COUNT, COVERAGE_LEVELS, COVERAGE_SIZES } from './config'
import { BenchControls, CodeLine, Readout, Segmented, f3, pct } from './LabBench'
import { l06Population } from './population'
import { buildResult } from './results'
import { coverageRun, type CoverageRun } from './statsLab'

function IntervalStrip({ run }: { run: CoverageRun }) {
  const lo = Math.min(...run.intervals.map((i) => i.lo))
  const hi = Math.max(...run.intervals.map((i) => i.hi))
  const x = (v: number) => 10 + ((v - lo) / (hi - lo || 1)) * 460
  return (
    <svg viewBox="0 0 480 310" className="w-full max-w-xl" role="img" aria-label={`${run.covered} of ${run.intervals.length} intervals cover the true mean`}>
      <line x1={x(run.trueMean)} x2={x(run.trueMean)} y1={0} y2={305} className="stroke-green" strokeWidth={1.5} />
      {run.intervals.map((iv, k) => (
        <line key={k} x1={x(iv.lo)} x2={x(iv.hi)} y1={4 + k * 3} y2={4 + k * 3} strokeWidth={1.5} strokeDasharray={iv.covers ? undefined : '3 2'} className={iv.covers ? 'stroke-cyan' : 'stroke-red'} />
      ))}
    </svg>
  )
}

const scenario = (c95: number | null): ChoiceScenario[] => [
  {
    id: 'meaning',
    title: 'What does 95% confidence mean?',
    prompt: `Your 95% deal caught the true mean ${c95 ?? '?'} times out of 100.`,
    options: [
      { id: 'method', label: 'The method catches the truth in about 95% of samples', correct: true, simulate: () => ({ ok: true, output: `Observed coverage ${c95 ?? '?'} / 100.` }), explanation: 'Confidence describes the procedure over repeated samples, not one interval.' },
      { id: 'this', label: 'This one interval has a 95% chance of containing it', correct: false, simulate: () => ({ ok: true, output: 'Each dealt interval either contains the fixed true mean or does not.' }), explanation: 'The true mean is fixed; after the draw there is no probability left for one interval.' },
      { id: 'data', label: '95% of students fall inside the interval', correct: false, simulate: () => ({ ok: true, output: 'The interval is about the mean, far narrower than the spread of students.' }), explanation: 'That would be a prediction range for individuals, not a confidence interval for the mean.' },
    ],
  },
]

export function CoverageCasino({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(6)
  const rows = useMemo(() => l06Population(seed), [seed])
  const [level, setLevel] = useState<number>(0.95)
  const [n, setN] = useState<number>(50)
  const [runIndex, setRunIndex] = useState(0)
  const [shown, setShown] = useState<{ level: number; n: number; runIndex: number } | null>(null)
  const [levelsRun, setLevelsRun] = useState<number[]>([])
  const [c95, setC95] = useState<number | null>(null)
  const [explained, setExplained] = useState(false)
  const done = useRef(false)
  const ui = useMissionUi()
  const run = useMemo(() => (shown ? coverageRun(rows, shown.n, shown.level, seed, shown.runIndex, COVERAGE_COUNT) : null), [rows, seed, shown])

  const deal = () => {
    const next = { level, n, runIndex }
    const res = coverageRun(rows, n, level, seed, runIndex, COVERAGE_COUNT)
    setShown(next)
    setRunIndex((r) => r + 1)
    setLevelsRun((l) => (l.includes(level) ? l : [...l, level]))
    if (level === 0.95) {
      setC95(res.covered)
      ui.completeObjective('l6-side-2-run')
    }
    if (levelsRun.length >= 1 && !levelsRun.includes(level)) ui.completeObjective('l6-side-2-compare')
  }
  const compared = levelsRun.length >= 2 && levelsRun.includes(0.95)

  const finish = (mistakes: number) => {
    setExplained(true)
    ui.completeObjective('l6-side-2-explain')
    if (done.current) return
    done.current = true
    onComplete(
      buildResult(id, {
        mistakes,
        steps: 3,
        runs: runIndex,
        parRuns: 2,
        decisions: [
          { label: `95% coverage: ${c95 ?? '?'} / 100`, good: null, explanation: 'Close to 95 but rarely exactly 95: coverage itself varies from deal to deal.' },
          { label: 'Explained confidence as a property of the method', good: mistakes === 0, explanation: 'Higher confidence widens intervals; larger n narrows them.' },
        ],
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="coverage-casino">
      <p className="text-sm text-muted">Each deal draws 100 samples of mean cgpa and builds an interval from each. Solid cyan: covers. Dashed red: missed.</p>
      <Segmented label="confidence" value={level} options={COVERAGE_LEVELS} format={(v) => pct(v, 0)} onChange={setLevel} testId="cov-level" />
      <Segmented label="n" value={n} options={COVERAGE_SIZES} onChange={setN} testId="cov-n" />
      <BenchControls testPrefix="cov" runLabel="DEAL 100 INTERVALS" onRun={deal} onReset={() => setShown(null)} />
      {run && shown && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Readout label="covered" value={`${run.covered} / ${COVERAGE_COUNT}`} tone="green" />
            <Readout label="expected" value={pct(shown.level, 0)} />
            <Readout label="mean width" value={f3(run.meanWidth)} tone="cyan" />
            <Readout label="true mean" value={f3(run.trueMean)} />
          </div>
          <IntervalStrip run={run} />
        </>
      )}
      <p className="text-xs text-muted" data-testid="levels-run">Levels dealt: {levelsRun.map((l) => pct(l, 0)).join(', ') || 'none'}</p>
      <CodeLine code={`[scipy.stats.norm.interval(${level}, s.mean(), s.sem()) for s in (df.cgpa.sample(${n}) for _ in range(100))]`} label="scipy" />
      {compared && !explained && <ChoiceSimulator scenarios={scenario(c95)} onComplete={(s) => finish(s.mistakes)} />}
      {explained && <p className="text-sm text-green">Confidence buys coverage with width. Sample size buys narrower intervals at the same coverage.</p>}
    </div>
  )
}

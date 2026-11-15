// Stage 2 BUILD AND EVALUATE: feature chips, test-fraction slider, FIT, coefficients, plots, metrics, leak rules, REPORT LEAK.
import { useMemo, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { useGameStore } from '../../game/store'
import { Scatter } from '../../components/charts'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState, useStageStateApi } from '../../shell/stageState'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ALL_FEATURES, LEAK_FEATURE } from './config'
import type { FeatureName } from './config'
import { prepareL07Data } from './data'
import { actionEfficiency } from './scoring'
import { INITIAL_S2 } from './state'
import type { Stage2State } from './state'
import { coefficientSentence, correlatedNote, fitWorkshop } from './workshop'
import { CodeLines, Goal, MetricTable, Slider, WorkshopLayout, clamp01 } from './Workshop'

export function ModelWorkshop({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(7)
  const ui = useMissionUi()
  const api = useStageStateApi()
  const data = useMemo(() => prepareL07Data(seed), [seed])
  const [s, setS] = useStageState<Stage2State>(id, INITIAL_S2)
  const [report, setReport] = useState<FeatureName>('attendance')
  const [done, setDone] = useState(false)
  const fit = useMemo(() => (s.lastInput ? fitWorkshop(data, s.lastInput) : null), [data, s.lastInput])
  const prev = useMemo(() => (s.prevInput ? fitWorkshop(data, s.prevInput) : null), [data, s.prevInput])
  const note = fit?.ok && prev?.ok ? correlatedNote(prev, fit) : null

  const toggle = (f: FeatureName) =>
    setS((p) => ({ ...p, features: p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f] }))

  const doFit = () => {
    const input = { features: [...s.features], testFraction: s.testFraction, splitSeed: s.splitSeed }
    const out = fitWorkshop(data, input)
    setS((p) => ({
      ...p,
      fits: p.fits + 1,
      prevInput: p.lastInput,
      lastInput: input,
      goalHit: p.goalHit || (out.ok && out.goalMet),
      leakEverFitted: p.leakEverFitted || input.features.includes(LEAK_FEATURE),
      minimalist: p.minimalist || (out.ok && out.minimalist),
    }))
    if (out.ok && out.tooGood) ui.log({ title: 'Too good to be true', detail: 'r2 above 0.97 with final_grade_points', tone: 'bad' })
  }

  const reportLeak = () => {
    if (report === LEAK_FEATURE) {
      setS((p) => ({ ...p, leakReported: true }))
      useGameStore.getState().recordStats(7, { leakReported: true })
      ui.log({ title: 'Leak reported: final_grade_points', tone: 'good' })
    } else {
      setS((p) => ({ ...p, wrongReports: p.wrongReports + 1 }))
      api?.addMistakes(id, 1)
      ui.log({ title: `${report} is known before cgpa: not a leak`, tone: 'bad' })
    }
  }

  const finish = () => {
    if (done || !fit?.ok || !fit.goalMet) return
    setDone(true)
    ui.completeObjective('l7-obj-model')
    onComplete({
      id,
      accuracy: clamp01(fit.test.r2 / Math.max(fit.bestTestR2, 0.1)),
      decisionQuality: s.leakReported ? 1 : s.leakEverFitted ? 0.6 : 0.85,
      efficiency: actionEfficiency(s.fits, 4),
      hintsUsed: 0,
      mistakes: s.wrongReports,
      decisions: [
        { label: `Kept a leak-free model (${fit.features.join(', ')})`, good: true, explanation: `Test r2 ${fit.test.r2.toFixed(3)} vs best legitimate ${fit.bestTestR2.toFixed(3)}.` },
        {
          label: s.leakReported ? 'Reported final_grade_points as a leak' : 'Did not report the leak column',
          good: s.leakReported ? true : null,
          explanation: 'final_grade_points is computed from the grade itself; it cannot exist before cgpa.',
        },
      ],
      extra: { fits: s.fits, testR2: fit.test.r2, bestR2: fit.bestTestR2, minimalist: s.minimalist, leakReported: s.leakReported },
    })
  }

  return (
    <WorkshopLayout
      title="Build and evaluate"
      controls={
        <>
          <fieldset>
            <legend className="mb-2 font-mono text-xs text-muted">features</legend>
            <div className="flex flex-wrap gap-2">
              {ALL_FEATURES.map((f) => {
                const on = s.features.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={on}
                    data-testid={`chip-${f}`}
                    onClick={() => toggle(f)}
                    className={cn('rounded border px-2 py-1 font-mono text-xs', on ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border text-muted')}
                  >
                    {on ? '[x] ' : '[ ] '}
                    {f}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <Slider id="l7-test-fraction" label="test_size" min={0.1} max={0.4} step={0.05} value={s.testFraction} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setS((p) => ({ ...p, testFraction: v }))} />
          <label className="block font-mono text-xs text-muted">
            random_state
            <input
              type="number"
              min={0}
              max={999}
              value={s.splitSeed}
              onChange={(e) => setS((p) => ({ ...p, splitSeed: Math.max(0, Math.min(999, Math.floor(Number(e.target.value) || 0))) }))}
              className="ml-2 w-20 rounded border border-border bg-bg px-1 text-text"
            />
          </label>
          <NeonButton onClick={doFit} disabled={s.features.length === 0} tooltip={s.features.length === 0 ? 'Select at least one feature' : undefined} data-testid="l7-fit">
            FIT
          </NeonButton>
          <p className="font-mono text-xs text-muted">fits: {s.fits}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-mono text-xs text-muted">
              suspect column
              <select value={report} onChange={(e) => setReport(e.target.value as FeatureName)} className="ml-2 rounded border border-border bg-bg text-text" data-testid="l7-leak-select">
                {ALL_FEATURES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <NeonButton size="sm" variant="danger" onClick={reportLeak} disabled={s.leakReported} data-testid="l7-report-leak">REPORT LEAK</NeonButton>
          </div>
          {s.leakReported && <p className="text-xs text-green">Leak flagged: final_grade_points is derived from the target.</p>}
          <CodeLines
            lines={[
              `X_train, X_test, y_train, y_test = train_test_split(X[${JSON.stringify(s.features)}], y, test_size=${s.testFraction}, random_state=${s.splitSeed})`,
              'model = LinearRegression().fit(X_train, y_train)',
              `r2_score(y_test, model.predict(X_test))${fit?.ok ? `  # ${fit.test.r2.toFixed(3)}` : ''}`,
            ]}
          />
        </>
      }
      plots={
        fit === null ? (
          <p className="text-sm text-muted">Select features and press FIT to train a model on the working data (240 rows).</p>
        ) : !fit.ok ? (
          <p className="text-sm text-red" role="alert">FIT failed: {fit.error}</p>
        ) : (
          <>
            {fit.tooGood && (
              <p role="alert" data-testid="l7-too-good" className="rounded border border-amber/50 bg-amber/10 p-2 text-sm text-amber">
                Too good to be true: could you know final_grade_points before cgpa exists? This goal is not accepted.
              </p>
            )}
            <Goal met={fit.goalMet} testId="l7-model-goal">
              test r2 {fit.test.r2.toFixed(3)} vs best legitimate {fit.bestTestR2.toFixed(3)} (gap {fit.gap.toFixed(3)}; need at least {(0.95 * fit.bestTestR2).toFixed(3)}, no leak)
            </Goal>
            <MetricTable rows={[{ label: 'train', ...fit.train }, { label: 'test', ...fit.test }]} />
            <ul className="space-y-1 text-xs text-text">
              {fit.features.map((f) => (
                <li key={f}>
                  <span className="font-mono text-cyan">{f} = {fit.coefficients[f].toFixed(4)}</span> {coefficientSentence(f, fit.coefficients[f])}
                </li>
              ))}
            </ul>
            {note && <p data-testid="l7-corr-note" className="rounded border border-violet/50 p-2 text-xs text-violet">{note}</p>}
            <div className="grid gap-3 xl:grid-cols-2">
              <Scatter title="predicted vs actual" xLabel="actual cgpa" yLabel="predicted" categories={['train', 'test']} points={fit.points.map((p) => ({ x: p.actual, y: p.predicted, category: p.set }))} line={{ slope: 1, intercept: 0 }} />
              <Scatter title="residuals vs predicted" xLabel="predicted" yLabel="residual" categories={['train', 'test']} points={fit.points.map((p) => ({ x: p.predicted, y: p.actual - p.predicted, category: p.set }))} line={{ slope: 0, intercept: 0 }} />
            </div>
            <NeonButton onClick={finish} disabled={!fit.goalMet || done} tooltip={!fit.goalMet ? 'Meet the goal with a leak-free model' : undefined} data-testid="l7-lock-model">
              LOCK MODEL
            </NeonButton>
          </>
        )
      }
    />
  )
}

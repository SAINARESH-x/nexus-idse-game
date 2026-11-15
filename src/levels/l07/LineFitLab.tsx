// Stage 1 FIT THE LINE: slope/intercept sliders, residual segments, live SSE/MSE/r2, reveal least squares, slope reading.
import { useMemo, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { Scatter } from '../../components/charts'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState, useStageStateApi } from '../../shell/stageState'
import { NeonButton } from '../../ui/NeonButton'
import { INTERCEPT_RANGE, SLOPE_RANGE } from './config'
import { prepareL07Data } from './data'
import { lineGoalMet, lineSample, lineSse } from './lineFit'
import { r2 } from './regression'
import { INITIAL_S1 } from './state'
import type { Stage1State } from './state'
import { CodeLines, Goal, Slider, WorkshopLayout, clamp01 } from './Workshop'

const PREDICT_AT = 20

export function LineFitLab({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(7)
  const ui = useMissionUi()
  const api = useStageStateApi()
  const sample = useMemo(() => lineSample(prepareL07Data(seed).working), [seed])
  const [s, setS] = useStageState<Stage1State>(id, INITIAL_S1)
  const [done, setDone] = useState(false)
  const sse = lineSse(sample.x, sample.y, s.slope, s.intercept)
  const fitR2 = r2(sample.y, sample.x.map((v) => s.intercept + s.slope * v))
  const goalNow = lineGoalMet(sse, sample.minSse)

  const move = (patch: Partial<Stage1State>) =>
    setS((prev) => {
      const next = { ...prev, ...patch, moves: prev.moves + 1 }
      const hit = lineGoalMet(lineSse(sample.x, sample.y, next.slope, next.intercept), sample.minSse)
      if (hit && !prev.goalHit) ui.log({ title: 'Line within 15% of the minimum SSE', tone: 'good' })
      return { ...next, goalHit: prev.goalHit || hit }
    })

  const b = sample.best
  const yhat = b.intercept + b.slope * PREDICT_AT
  const scenarios: ChoiceScenario[] = [
    {
      id: 'slope',
      title: 'Read the slope',
      prompt: `Least squares gives cgpa = ${b.intercept.toFixed(2)} + ${b.slope.toFixed(3)} x study_hours. For ${PREDICT_AT} weekly hours it predicts ${yhat.toFixed(2)}. What does the slope mean?`,
      options: [
        {
          id: 'assoc',
          label: `Each extra weekly study hour is associated with about ${b.slope.toFixed(3)} more cgpa`,
          correct: true,
          simulate: () => ({ ok: true, output: `predict(${PREDICT_AT + 1}) - predict(${PREDICT_AT}) = ${b.slope.toFixed(3)}` }),
          explanation: 'The slope is the change in the prediction per unit of x. Observational data shows association, not proof of cause.',
        },
        {
          id: 'cause',
          label: `Studying one more hour will cause cgpa to rise by ${b.slope.toFixed(3)}`,
          correct: false,
          simulate: () => ({ ok: false, output: 'No experiment was run: attendance and habits move together, so cause is not established.' }),
          explanation: 'Regression on observational data does not prove causation.',
        },
        {
          id: 'zero',
          label: `A student who never studies has cgpa ${b.slope.toFixed(3)}`,
          correct: false,
          simulate: () => ({ ok: false, output: `predict(0) = ${b.intercept.toFixed(2)}: that is the intercept, not the slope.` }),
          explanation: 'The value at x = 0 is the intercept.',
        },
      ],
    },
  ]

  const finish = (mistakes: number) => {
    if (done) return
    setDone(true)
    api?.addMistakes(id, mistakes)
    ui.completeObjective('l7-obj-line')
    onComplete({
      id,
      accuracy: clamp01(sample.minSse / sse),
      decisionQuality: mistakes === 0 ? 1 : 0.6,
      efficiency: s.moves <= 30 ? 1 : Math.max(0.3, 30 / s.moves),
      hintsUsed: 0,
      mistakes,
      decisions: [
        { label: 'Fitted the line by minimising squared residuals', good: true, explanation: `Your SSE ${sse.toFixed(2)} vs minimum ${sample.minSse.toFixed(2)}.` },
        { label: 'Read the slope as an association', good: mistakes === 0, explanation: 'A slope is a rate of change in the prediction, not a causal effect.' },
      ],
      extra: { lineSse: sse, minSse: sample.minSse },
    })
  }

  return (
    <WorkshopLayout
      title="Fit the line"
      controls={
        <>
          <Slider id="l7-slope" label="slope" {...SLOPE_RANGE} value={s.slope} format={(v) => v.toFixed(3)} onChange={(v) => move({ slope: v })} />
          <Slider id="l7-intercept" label="intercept" {...INTERCEPT_RANGE} value={s.intercept} format={(v) => v.toFixed(2)} onChange={(v) => move({ intercept: v })} />
          <dl className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div><dt className="text-muted">SSE</dt><dd data-testid="l7-sse">{sse.toFixed(2)}</dd></div>
            <div><dt className="text-muted">MSE</dt><dd>{(sse / sample.x.length).toFixed(3)}</dd></div>
            <div><dt className="text-muted">r2</dt><dd>{fitR2.toFixed(3)}</dd></div>
          </dl>
          <Goal met={s.goalHit} testId="l7-line-goal">SSE within 15% of the least-squares minimum {goalNow ? '(now)' : ''}</Goal>
          <NeonButton
            disabled={!s.goalHit || s.revealed}
            tooltip={!s.goalHit ? 'Reach the goal first' : undefined}
            onClick={() => setS((p) => ({ ...p, revealed: true }))}
            data-testid="l7-reveal"
          >
            REVEAL LEAST SQUARES
          </NeonButton>
          {s.revealed && (
            <>
              <p className="text-sm text-text" data-testid="l7-revealed">
                Least squares: slope {b.slope.toFixed(3)} (yours {s.slope.toFixed(3)}), intercept {b.intercept.toFixed(2)} (yours {s.intercept.toFixed(2)}).
              </p>
              <CodeLines lines={['model = LinearRegression().fit(X, y)', `model.coef_      # [${b.slope.toFixed(3)}]`, `model.intercept_ # ${b.intercept.toFixed(2)}`]} />
            </>
          )}
        </>
      }
      plots={
        <>
          <Scatter
            title="study_hours vs cgpa"
            xLabel="study_hours"
            yLabel="cgpa"
            points={sample.x.map((x, i) => ({ x, y: sample.y[i] }))}
            line={{ slope: s.slope, intercept: s.intercept }}
            showResiduals
          />
          {s.revealed && <ChoiceSimulator scenarios={scenarios} onComplete={(sum) => finish(sum.mistakes)} />}
        </>
      }
    />
  )
}

// RTL flows: each Level 07 stage and side op can be progressed to completion; Stage 3 persistence keeps the peek.
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { sessionSeed } from '../../../game/levelSession'
import type { ChallengeResult } from '../../../game/types'
import { StageStateProvider } from '../../../shell/stageState'
import type { StageStateApi } from '../../../shell/stageState'
import { LEGIT_FEATURES } from '../config'
import { prepareL07Data } from '../data'
import { ForecastStage } from '../ForecastStage'
import { LineFitLab } from '../LineFitLab'
import { lineSample, snappedBest } from '../lineFit'
import { ModelWorkshop } from '../ModelWorkshop'
import { OutlierInfluence } from '../OutlierInfluence'
import { bestDegree, degreeCurve, makeOverfitData } from '../overfit'
import { ResidualReading } from '../ResidualReading'
import { CORRECT_FIX, RESIDUAL_ORDER } from '../sideLogic'
import { validateS3 } from '../state'

const SEED = sessionSeed(7, 0)
const provider = (store: Map<string, unknown>): StageStateApi => ({
  seed: SEED,
  attemptIndex: 0,
  get: (id) => store.get(id),
  set: (id, v) => void store.set(id, JSON.parse(JSON.stringify(v))),
  addMistakes: () => undefined,
})
const wrap = (store: Map<string, unknown>, node: ReactNode) => <StageStateProvider value={provider(store)}>{node}</StageStateProvider>
const props = (id: string, results: ChallengeResult[]) => ({ id, difficulty: 'assisted' as const, hints: [], onComplete: (r: ChallengeResult) => results.push(r) })
const click = (id: string) => fireEvent.click(screen.getByTestId(id))
const range = (id: string, v: number) => fireEvent.change(screen.getByTestId(id), { target: { value: String(v) } })

describe('Level 07 flows', () => {
  it('Stage 1: reach the goal, reveal, read the slope', () => {
    const results: ChallengeResult[] = []
    render(wrap(new Map(), <LineFitLab {...props('l7-stage-1', results)} />))
    expect(screen.getByTestId('l7-reveal')).toBeDisabled()
    const b = snappedBest(lineSample(prepareL07Data(SEED).working))
    range('l7-slope', b.slope)
    range('l7-intercept', b.intercept)
    expect(screen.getByTestId('l7-line-goal')).toHaveTextContent('GOAL MET')
    click('l7-reveal')
    expect(screen.getByText(/LinearRegression\(\)\.fit\(X, y\)/)).toBeInTheDocument()
    click('choice-slope-assoc')
    click('choice-continue')
    expect(results).toHaveLength(1)
    expect(results[0].accuracy).toBeGreaterThan(0.9)
  })

  it('Stage 2: leak warning, report leak, legit goal and lock', () => {
    const results: ChallengeResult[] = []
    render(wrap(new Map(), <ModelWorkshop {...props('l7-stage-2', results)} />))
    click('chip-final_grade_points')
    click('l7-fit')
    expect(screen.getByTestId('l7-too-good')).toBeInTheDocument()
    expect(screen.getByTestId('l7-lock-model')).toBeDisabled()
    fireEvent.change(screen.getByTestId('l7-leak-select'), { target: { value: 'final_grade_points' } })
    click('l7-report-leak')
    click('chip-final_grade_points')
    click('chip-study_hours')
    click('l7-fit')
    click('chip-library_visits')
    click('l7-fit')
    expect(screen.getByTestId('l7-corr-note')).toHaveTextContent('study_hours coefficient moved')
    for (const f of LEGIT_FEATURES) if (f !== 'study_hours' && f !== 'library_visits') click(`chip-${f}`)
    click('l7-fit')
    expect(screen.getByTestId('l7-model-goal')).toHaveTextContent('GOAL MET')
    click('l7-lock-model')
    expect(results[0].extra?.leakReported).toBe(true)
    expect(results[0].extra?.fits).toBe(4)
  })

  it('Stage 3: degree, scenario, submit twice; peeked survives a remount', () => {
    const results: ChallengeResult[] = []
    const store = new Map<string, unknown>()
    const view = render(wrap(store, <ForecastStage {...props('l7-stage-3', results)} />))
    range('l7-degree', 9)
    click('l7-lock-degree')
    expect(screen.getByTestId('l7-lock-degree')).toBeInTheDocument()
    range('l7-degree', bestDegree(degreeCurve(makeOverfitData(SEED))))
    click('l7-lock-degree')
    click('choice-why-val')
    click('choice-continue')
    for (const f of LEGIT_FEATURES) click(`final-chip-${f}`)
    click('l7-final-fit')
    click('l7-submit')
    const first = screen.getByTestId('holdout-r2-0').textContent
    click('l7-submit')
    expect(screen.getByTestId('l7-peeked')).toBeInTheDocument()
    view.unmount()
    const saved = validateS3(store.get('l7-stage-3'))
    expect(saved?.peeked).toBe(true)
    expect(saved?.submissions).toHaveLength(2)
    render(wrap(store, <ForecastStage {...props('l7-stage-3', results)} />))
    expect(screen.getByTestId('l7-peeked')).toBeInTheDocument()
    expect(screen.getByTestId('holdout-r2-0').textContent).toBe(first)
    act(() => click('l7-finish-forecast'))
    expect(results[0].extra?.peeked).toBe(true)
    expect(results[0].decisionQuality).toBeCloseTo(0.8, 9)
  })

  it('Outlier Influence: move, exclude, decide', () => {
    const results: ChallengeResult[] = []
    render(<OutlierInfluence {...props('l7-side-1', results)} />)
    range('l7-out-y', 4)
    click('l7-exclude')
    expect(screen.getByTestId('l7-loo')).toHaveTextContent('leave-one-out')
    click('choice-remove-evidence')
    click('choice-continue')
    expect(results).toHaveLength(1)
  })

  it('Residual Reading: diagnose and fix all three', () => {
    const results: ChallengeResult[] = []
    render(<ResidualReading {...props('l7-side-2', results)} />)
    RESIDUAL_ORDER.forEach((k, i) => {
      click(`l7-plot-${i}`)
      click(`l7-diag-${k}`)
      click(`l7-fix-${CORRECT_FIX[k]}`)
      expect(screen.getByTestId('l7-measures')).toHaveTextContent('PATTERN-FREE')
    })
    click('l7-residual-done')
    expect(results[0].mistakes).toBe(0)
  })
})

// Stage 3 part 1 OVERFIT TRAP: polynomial degree slider, fitted curve, train vs validation RMSE curve and a consequence scenario.
import { useMemo } from 'react'
import { LineChart, Scatter } from '../../components/charts'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { NeonButton } from '../../ui/NeonButton'
import { OVERFIT_MAX_DEGREE } from './config'
import { bestDegree, curveY, degreeAccepted, degreeCurve, makeOverfitData } from './overfit'
import { CodeLines, Goal, Slider } from './Workshop'

export interface OverfitLabProps {
  seed: number
  degree: number
  accepted: boolean
  onDegree: (d: number) => void
  onLock: (ok: boolean, explanation: string) => void
  onChoiceDone: (mistakes: number) => void
}

export function OverfitLab({ seed, degree, accepted, onDegree, onLock, onChoiceDone }: OverfitLabProps) {
  const data = useMemo(() => makeOverfitData(seed), [seed])
  const curve = useMemo(() => degreeCurve(data), [data])
  const best = bestDegree(curve)
  const fit = curve.find((c) => c.degree === degree) ?? curve[0]
  const xs = Array.from({ length: 81 }, (_, i) => -1 + i / 40)

  const lock = () => {
    const ok = degreeAccepted(degree, best)
    const why = ok
      ? `Degree ${degree} sits at the bottom of the validation curve (best ${best}).`
      : degree === 1
        ? 'Degree 1 underfits: both errors are high.'
        : degree >= best + 2
          ? `Degree ${degree} chases noise: training error is low but validation RMSE rose to ${fit.valRmse.toFixed(3)}.`
          : `Degree ${degree} is still too simple; validation RMSE keeps falling past it.`
    onLock(ok, why)
  }

  const hi = curve[curve.length - 1]
  const scenarios: ChoiceScenario[] = [
    {
      id: 'why',
      title: 'Why is training error a poor guide?',
      prompt: `Training RMSE at degree ${OVERFIT_MAX_DEGREE} is ${hi.trainRmse.toFixed(3)}, the lowest of all. Should you ship degree ${OVERFIT_MAX_DEGREE}?`,
      options: [
        {
          id: 'ship',
          label: `Yes, lowest training error means the best model`,
          correct: false,
          simulate: () => ({ ok: false, output: `On unseen points, degree ${OVERFIT_MAX_DEGREE} RMSE = ${hi.valRmse.toFixed(3)} vs ${curve[best - 1].valRmse.toFixed(3)} at degree ${best}.` }),
          explanation: 'Training error always falls as flexibility grows; the extra wiggles fit noise.',
        },
        {
          id: 'val',
          label: 'No: the model has already seen the training points; judge it on held-out validation data',
          correct: true,
          simulate: () => ({ ok: true, output: `Validation picks degree ${best} (RMSE ${curve[best - 1].valRmse.toFixed(3)}).` }),
          explanation: 'Validation error estimates performance on new data and exposes overfitting.',
        },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <Slider id="l7-degree" label="PolynomialFeatures(degree)" min={1} max={OVERFIT_MAX_DEGREE} step={1} value={degree} onChange={onDegree} />
      <p className="font-mono text-xs text-text" data-testid="l7-degree-rmse">
        degree {degree}: train RMSE {fit.trainRmse.toFixed(3)} / validation RMSE {fit.valRmse.toFixed(3)}
      </p>
      <div className="grid gap-3 xl:grid-cols-2">
        <Scatter
          title="25 training points (validation in second colour)"
          xLabel="x"
          yLabel="y"
          categories={['train', 'validation']}
          points={[...data.train.map((p) => ({ ...p, category: 'train' })), ...data.val.map((p) => ({ ...p, category: 'validation' }))]}
        />
        <LineChart title={`fitted degree-${degree} curve`} xLabel="x" yLabel="prediction" series={[{ name: `degree ${degree}`, points: xs.map((x) => ({ x, y: curveY(fit, x) })) }]} />
      </div>
      <LineChart
        title="RMSE vs degree"
        integerX
        xLabel="degree"
        yLabel="RMSE"
        markedX={{ x: degree, label: 'yours' }}
        series={[
          { name: 'train RMSE', points: curve.map((c) => ({ x: c.degree, y: c.trainRmse })) },
          { name: 'validation RMSE', points: curve.map((c) => ({ x: c.degree, y: c.valRmse })) },
        ]}
      />
      <CodeLines lines={[`make_pipeline(PolynomialFeatures(${degree}), LinearRegression()).fit(x_train, y_train)`, 'mean_squared_error(y_val, model.predict(x_val)) ** 0.5']} />
      <Goal met={accepted}>pick the degree with the lowest validation RMSE (one degree of tolerance)</Goal>
      {!accepted && <NeonButton onClick={lock} data-testid="l7-lock-degree">LOCK DEGREE</NeonButton>}
      {accepted && <ChoiceSimulator scenarios={scenarios} onComplete={(sum) => onChoiceDone(sum.mistakes)} />}
    </div>
  )
}

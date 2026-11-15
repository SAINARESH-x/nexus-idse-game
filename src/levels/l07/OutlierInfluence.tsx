// Side op OUTLIER INFLUENCE: move one extreme point, see the line bend, toggle EXCLUDE for the leave-one-out slope, then decide.
import { useMemo, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { Scatter } from '../../components/charts'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed } from '../../shell/stageState'
import { NeonButton } from '../../ui/NeonButton'
import { simpleLine } from './regression'
import { OUTLIER_START, looSlopes, outlierBase } from './sideLogic'
import { CodeLines, Slider, WorkshopLayout } from './Workshop'

export function OutlierInfluence({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(7)
  const ui = useMissionUi()
  const base = useMemo(() => outlierBase(seed), [seed])
  const [pt, setPt] = useState(OUTLIER_START)
  const [moved, setMoved] = useState(false)
  const [exclude, setExclude] = useState(false)
  const [toggled, setToggled] = useState(false)
  const loo = looSlopes(base, pt)
  const pts = exclude ? base : [...base, pt]
  const line = simpleLine(pts.map((p) => p.x), pts.map((p) => p.y))

  const scenarios: ChoiceScenario[] = [
    {
      id: 'remove',
      title: 'Is removal justified?',
      prompt: `The record shows ${OUTLIER_START.x} study hours and cgpa ${OUTLIER_START.y}. The registry confirms that student's cgpa was typed on the old 4-point scale. Including it changes the slope by ${loo.change.toFixed(3)}.`,
      options: [
        { id: 'influence', label: 'Remove it because it changes the slope a lot', correct: false,
          simulate: () => ({ ok: false, output: 'Influence alone is not evidence of error: dropping every inconvenient point biases the model.' }),
          explanation: 'Remove points for documented reasons, not because they disagree with you.' },
        { id: 'keep', label: 'Keep it: never touch data', correct: false,
          simulate: () => ({ ok: false, output: `Slope stays at ${loo.withPoint.toFixed(3)}, distorted by a value on the wrong scale.` }),
          explanation: 'A verified entry error should be corrected or excluded, and the change logged.' },
        { id: 'evidence', label: 'Exclude (or correct) it because the record is a verified entry error, and log the change', correct: true,
          simulate: () => ({ ok: true, output: `Slope without it: ${loo.without.toFixed(3)}. Reason recorded.` }),
          explanation: 'Justified removal rests on evidence about the record.' },
      ],
    },
  ]

  return (
    <WorkshopLayout
      title="Outlier influence"
      controls={
        <>
          <Slider id="l7-out-x" label="extreme point study_hours" min={5} max={45} step={0.5} value={pt.x} onChange={(x) => { setPt((p) => ({ ...p, x })); setMoved(true) }} />
          <Slider id="l7-out-y" label="extreme point cgpa" min={3} max={10} step={0.1} value={pt.y} format={(v) => v.toFixed(1)} onChange={(y) => { setPt((p) => ({ ...p, y })); setMoved(true) }} />
          <NeonButton variant="ghost" aria-pressed={exclude} onClick={() => { setExclude((e) => !e); setToggled(true) }} data-testid="l7-exclude">
            {exclude ? 'INCLUDE POINT' : 'EXCLUDE POINT'}
          </NeonButton>
          <dl className="font-mono text-xs text-text" data-testid="l7-loo">
            <div>slope with point: {loo.withPoint.toFixed(4)}</div>
            <div>slope without (leave-one-out): {loo.without.toFixed(4)}</div>
            <div>change: {loo.change.toFixed(4)}</div>
          </dl>
          <CodeLines lines={['LinearRegression().fit(X, y).coef_', 'LinearRegression().fit(X.drop(i), y.drop(i)).coef_  # leave-one-out']} />
        </>
      }
      plots={
        <>
          <Scatter title="study_hours vs cgpa" xLabel="study_hours" yLabel="cgpa" categories={['cohort', 'extreme']}
            points={[...base.map((p) => ({ ...p, category: 'cohort' })), ...(exclude ? [] : [{ ...pt, category: 'extreme' }])]} line={line} xDomain={[0, 46]} yDomain={[2, 10]} />
          {moved && toggled ? (
            <ChoiceSimulator scenarios={scenarios} onComplete={(sum) => {
              ui.completeObjective('l7-side-1-obj')
              onComplete({ id, accuracy: 1, decisionQuality: sum.mistakes === 0 ? 1 : 0.5, efficiency: 1, hintsUsed: 0, mistakes: sum.mistakes,
                decisions: [{ label: 'Removal justified by evidence', good: true, explanation: 'Influence measured with leave-one-out; removal based on a verified entry error.' }],
                extra: { looChange: loo.change } })
            }} />
          ) : (
            <p className="text-sm text-muted">Move the extreme point and toggle EXCLUDE to unlock the decision.</p>
          )}
        </>
      }
    />
  )
}

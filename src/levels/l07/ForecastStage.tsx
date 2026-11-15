// Stage 3 OVERFIT TRAP AND FINAL FORECAST: wires OverfitLab and HoldOut to the persisted stage state and scores the forecast.
import { useMemo, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { useGameStore } from '../../game/store'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState, useStageStateApi } from '../../shell/stageState'
import { NeonButton } from '../../ui/NeonButton'
import { LEAK_FEATURE } from './config'
import { prepareL07Data } from './data'
import { submitForecast } from './forecast'
import { HoldOut } from './HoldOut'
import { OverfitLab } from './OverfitLab'
import { scoreForecast } from './scoring'
import { INITIAL_S3 } from './state'
import type { Stage3State } from './state'
import { WorkshopLayout } from './Workshop'

export function ForecastStage({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(7)
  const ui = useMissionUi()
  const api = useStageStateApi()
  const data = useMemo(() => prepareL07Data(seed), [seed])
  const [s, setS] = useStageState<Stage3State>(id, INITIAL_S3)
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const stage2 = api?.get('l7-stage-2') as { fits?: unknown } | undefined
  const stage2Fits = typeof stage2?.fits === 'number' ? stage2.fits : 0

  const finish = () => {
    const sc = s.scored
    if (!sc || done) return
    setDone(true)
    const leak = sc.features.includes(LEAK_FEATURE)
    const fits = stage2Fits + s.fits
    const score = scoreForecast({ holdoutR2: sc.holdoutR2, achievableR2: sc.achievableR2, leak, peeked: s.peeked, fits })
    useGameStore.getState().recordStats(7, { holdoutR2: sc.holdoutR2, valR2: sc.valR2, peeked: s.peeked })
    ui.completeObjective('l7-obj-forecast')
    onComplete({
      id,
      ...score,
      hintsUsed: 0,
      mistakes: 0,
      decisions: [
        { label: 'Chose the degree by validation error', good: true, explanation: 'Validation RMSE, not training RMSE, estimates error on new data.' },
        { label: leak ? 'Final model used the leak feature' : 'Final model is leak-free', good: !leak, explanation: 'Features must be available before the target exists.' },
        { label: s.peeked ? 'Peeked at the hold-out more than once' : 'Submitted to the hold-out once', good: !s.peeked, explanation: 'Re-using the hold-out to choose models turns it into another validation set.' },
      ],
      extra: { holdoutR2: sc.holdoutR2, valR2: sc.valR2, achievableR2: sc.achievableR2, peeked: s.peeked, leakInFinal: leak, fits },
    })
  }

  const part1Done = s.degreeAccepted && s.choiceDone
  return (
    <WorkshopLayout
      title="Overfit trap and final forecast"
      controls={
        <div className="space-y-2 text-sm text-muted">
          <p>Part 1: {part1Done ? 'done' : 'pick a degree using validation RMSE.'}</p>
          <p>Part 2: {s.scored ? 'forecast submitted' : 'fit a final model and submit once.'}</p>
          <p className="font-mono text-xs">model fits: Stage 2 {stage2Fits} + final {s.fits}</p>
          {message && <p role="status" className="text-xs text-amber">{message}</p>}
          <NeonButton onClick={finish} disabled={!s.scored || done} tooltip={!s.scored ? 'Submit a forecast first' : undefined} data-testid="l7-finish-forecast">
            FILE FORECAST
          </NeonButton>
        </div>
      }
      plots={
        !part1Done ? (
          <OverfitLab
            seed={seed}
            degree={s.degree}
            accepted={s.degreeAccepted}
            onDegree={(d) => setS((p) => ({ ...p, degree: d }))}
            onLock={(ok, why) => {
              setMessage(why)
              if (ok) setS((p) => ({ ...p, degreeAccepted: true }))
              else api?.addMistakes(id, 1)
              ui.log({ title: ok ? 'Degree accepted' : 'Degree refused', detail: why, tone: ok ? 'good' : 'bad' })
            }}
            onChoiceDone={(m) => {
              if (m) api?.addMistakes(id, m)
              setS((p) => ({ ...p, choiceDone: true }))
            }}
          />
        ) : (
          <HoldOut
            data={data}
            features={s.features}
            degree={s.finalDegree}
            fitted={s.fitted}
            submissions={s.submissions}
            scored={s.scored}
            peeked={s.peeked}
            onFeatures={(f) => setS((p) => ({ ...p, features: f, fitted: false }))}
            onDegree={(d) => setS((p) => ({ ...p, finalDegree: d, fitted: false }))}
            onFit={() => setS((p) => ({ ...p, fits: p.fits + 1, fitted: true }))}
            onSubmit={(val) => {
              const report = data.evaluateHoldout({ features: s.features, degree: s.finalDegree })
              if (!report) return
              setS((p) => ({ ...p, ...submitForecast(p, { features: p.features, degree: p.finalDegree, val }, report) }))
            }}
          />
        )
      }
    />
  )
}

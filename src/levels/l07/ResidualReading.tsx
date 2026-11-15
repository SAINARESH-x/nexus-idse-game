// Side op RESIDUAL READING: diagnose random, curved and funnel residual plots, apply a fix and re-check with computed measures.
import { useMemo, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { Scatter } from '../../components/charts'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed } from '../../shell/stageState'
import { NeonButton } from '../../ui/NeonButton'
import { CORRECT_FIX, PATTERN_THRESHOLD, RESIDUAL_ORDER, checkResiduals, residualDataset } from './sideLogic'
import type { FixKind, PatternKind } from './sideLogic'
import { CodeLines, WorkshopLayout } from './Workshop'

const FIX_LABEL: Record<FixKind, string> = { none: 'no fix needed', square: 'add x squared', log: 'log(y) target' }
const FIX_CODE: Record<FixKind, string> = { none: 'LinearRegression().fit(X, y)', square: 'X["x2"] = X["x"] ** 2', log: 'y = np.log(y)' }

export function ResidualReading({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(7)
  const ui = useMissionUi()
  const sets = useMemo(() => RESIDUAL_ORDER.map((k) => residualDataset(seed, k)), [seed])
  const [idx, setIdx] = useState(0)
  const [diag, setDiag] = useState<Record<number, PatternKind>>({})
  const [fix, setFix] = useState<Record<number, FixKind>>({})
  const [mistakes, setMistakes] = useState(0)
  const [done, setDone] = useState(false)
  const kind = RESIDUAL_ORDER[idx]
  const applied = fix[idx] ?? 'none'
  const check = checkResiduals(sets[idx], applied)
  const solved = (i: number) => diag[i] === RESIDUAL_ORDER[i] && checkResiduals(sets[i], fix[i] ?? 'none').clean && (fix[i] ?? 'none') === CORRECT_FIX[RESIDUAL_ORDER[i]]
  const allSolved = RESIDUAL_ORDER.every((_, i) => solved(i))

  const diagnose = (k: PatternKind) => {
    if (k !== kind) { setMistakes((m) => m + 1); ui.log({ title: `Plot ${idx + 1} is not ${k}`, tone: 'bad' }) }
    setDiag((d) => ({ ...d, [idx]: k }))
  }
  const applyFix = (f: FixKind) => {
    const c = checkResiduals(sets[idx], f)
    if (f !== CORRECT_FIX[kind]) setMistakes((m) => m + 1)
    setFix((x) => ({ ...x, [idx]: f }))
    ui.log({ title: `Re-check: curvature ${c.curvature.toFixed(2)}, funnel ${c.funnel.toFixed(2)}`, tone: c.clean ? 'good' : 'bad' })
  }

  return (
    <WorkshopLayout
      title="Residual reading"
      controls={
        <>
          <div className="flex gap-2" role="tablist">
            {RESIDUAL_ORDER.map((_, i) => (
              <NeonButton key={i} size="sm" variant={i === idx ? 'primary' : 'ghost'} onClick={() => setIdx(i)} data-testid={`l7-plot-${i}`}>
                PLOT {i + 1}{solved(i) ? ' OK' : ''}
              </NeonButton>
            ))}
          </div>
          <p className="font-mono text-xs text-muted">diagnosis</p>
          <div className="flex flex-wrap gap-2">
            {RESIDUAL_ORDER.map((k) => (
              <NeonButton key={k} size="sm" variant={diag[idx] === k ? 'primary' : 'ghost'} onClick={() => diagnose(k)} data-testid={`l7-diag-${k}`}>{k}</NeonButton>
            ))}
          </div>
          <p className="font-mono text-xs text-muted">fix</p>
          <div className="flex flex-wrap gap-2">
            {(['none', 'square', 'log'] as FixKind[]).map((f) => (
              <NeonButton key={f} size="sm" variant={applied === f && fix[idx] ? 'primary' : 'ghost'} disabled={diag[idx] !== kind} tooltip={diag[idx] !== kind ? 'Diagnose correctly first' : undefined} onClick={() => applyFix(f)} data-testid={`l7-fix-${f}`}>
                {FIX_LABEL[f]}
              </NeonButton>
            ))}
          </div>
          <dl className="font-mono text-xs text-text" data-testid="l7-measures">
            <div>curvature |corr(resid, (fit - mean)^2)| = {check.curvature.toFixed(3)}</div>
            <div>funnel |corr(|resid|, fit)| = {check.funnel.toFixed(3)}</div>
            <div>{check.clean ? 'PATTERN-FREE' : 'PATTERN LEFT'} (threshold {PATTERN_THRESHOLD})</div>
          </dl>
          <CodeLines lines={[FIX_CODE[applied], 'resid = y - model.predict(X)']} />
          <NeonButton disabled={!allSolved || done} tooltip={!allSolved ? 'Fix all three plots' : undefined} data-testid="l7-residual-done" onClick={() => {
            setDone(true)
            ui.completeObjective('l7-side-2-obj')
            onComplete({ id, accuracy: 1, decisionQuality: Math.max(0.3, 1 - 0.15 * mistakes), efficiency: 1, hintsUsed: 0, mistakes,
              decisions: RESIDUAL_ORDER.map((k) => ({ label: `${k}: ${FIX_LABEL[CORRECT_FIX[k]]}`, good: true, explanation: 'Residual measure dropped below the threshold.' })) })
          }}>CONFIRM DIAGNOSES</NeonButton>
        </>
      }
      plots={<Scatter title={`plot ${idx + 1}: residuals vs fitted`} xLabel="fitted" yLabel="residual" points={check.fitted.map((f, i) => ({ x: f, y: check.resid[i] }))} line={{ slope: 0, intercept: 0 }} />}
    />
  )
}

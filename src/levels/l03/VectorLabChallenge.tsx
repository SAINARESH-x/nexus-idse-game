// Stage 3 challenge: normalise the grid, find the drifting sensor with a vector op, compare with a Python loop.
import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Gauge, Play, Sigma, Sparkles, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { argmax } from './nd'
import {
  DRIFT_COLUMN,
  DRIFT_PER_CYCLE,
  L03_BROADCAST_RESULT,
  L03_BROADCAST_ROW,
  L03_BROADCAST_SAMPLE,
  SENSOR_COLS,
  SENSOR_COLUMN_MEANS,
  SENSOR_GRID,
  SENSOR_NORMALISED,
  SENSOR_ROWS,
} from './content'
import { ArrayGrid, ArrayValues, formatNumber } from './ArrayGrid'
import type { CellTone } from './ArrayGrid'
import {
  applyVectorOp,
  countOperations,
  driftExpression,
  findDriftingSensor,
  normaliseCode,
} from './vectorLabLogic'
import type { VectorOp } from './vectorLabLogic'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const OPS: Array<{ id: VectorOp; label: string; hint: string }> = [
  { id: 'none', label: 'arr (unchanged)', hint: 'The identity operation; the grid is left as-is.' },
  { id: 'subtract-mean', label: 'arr - arr.mean(axis=0)', hint: 'Subtract each column mean to centre every sensor.' },
  { id: 'add-row', label: 'arr + row', hint: 'Add a broadcast row vector to every row.' },
]

/** The full inspection palette: each chip applies one NumPy-like vector operation. */
const PREVIEW_OPS: Array<{ id: VectorOp; label: string }> = [
  { id: 'multiply-2', label: 'arr * 2' },
  { id: 'subtract-global-mean', label: 'arr - arr.mean()' },
  { id: 'subtract-mean', label: 'arr - arr.mean(axis=0)' },
  { id: 'sum-axis-0', label: 'arr.sum(axis=0)' },
  { id: 'mean-axis-1', label: 'arr.mean(axis=1)' },
  { id: 'argmax-columns', label: 'np.argmax(arr.mean(axis=0))' },
  { id: 'add-row', label: 'arr + row' },
]

type DriftMethod = 'none' | 'mean-then-argmax' | 'one-liner'

export function VectorLabChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [op, setOp] = useState<VectorOp>('subtract-mean')
  const [previewOp, setPreviewOp] = useState<VectorOp>('multiply-2')
  const [normalised, setNormalised] = useState(false)
  const [method, setMethod] = useState<DriftMethod>('none')
  const [driftFound, setDriftFound] = useState(false)
  const [patternNoticed, setPatternNoticed] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const finished = useRef(false)

  const result = useMemo(
    () => applyVectorOp(SENSOR_GRID, op, L03_BROADCAST_ROW),
    [op],
  )
  const preview = useMemo(
    () => applyVectorOp(SENSOR_GRID, previewOp, L03_BROADCAST_ROW),
    [previewOp],
  )
  const opCount = useMemo(() => countOperations(SENSOR_ROWS, SENSOR_COLS), [])
  const columnMeans = SENSOR_COLUMN_MEANS.data.map(formatNumber)

  const finishIfReady = (
    nextNormalised: boolean,
    nextDrift: boolean,
    nextMethod: DriftMethod = method,
    nextPattern: boolean = patternNoticed,
  ) => {
    if (finished.current || !nextNormalised || !nextDrift) return
    finished.current = true
    ui.completeObjective('l3-obj-vector')
    decisions.current.push({
      label: 'Grid normalised and drifting sensor located',
      good: true,
      explanation:
        'Subtracting column means centres each sensor so a slow drift stands out. The largest column mean points to the drifting sensor; one vector op replaced the whole Python loop.',
    })
    ui.log({
      title: 'Vector analysis locked',
      detail: `Drifting sensor is column ${DRIFT_COLUMN}; the loop touched ${opCount.loopOps} cells versus ${opCount.vectorOps} vector ops.`,
      tone: 'good',
    })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + mistakes)),
      efficiency: clamp01(Math.max(0.3, 3 / (3 + mistakes))),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: {
        normalised: nextNormalised,
        driftColumn: DRIFT_COLUMN,
        oneLiner: nextMethod === 'one-liner',
        patternNoticed: nextPattern,
      },
    })
  }

  const runNormalise = () => {
    if (op !== 'subtract-mean') {
      const next = mistakes + 1
      setMistakes(next)
      setFeedback('That operation does not centre the columns. Subtracting arr.mean(axis=0) does.')
      decisions.current.push({
        label: 'Normalisation used the wrong operation',
        good: false,
        explanation: `${result.code} does not subtract the column means, so the drift stays hidden behind each sensor's baseline.`,
      })
      ui.log({ title: 'Normalisation mismatch', detail: result.code, tone: 'bad' })
      return
    }
    setNormalised(true)
    setFeedback('Columns centred: every sensor now averages to zero.')
    decisions.current.push({
      label: 'Grid normalised with column means',
      good: true,
      explanation: `${normaliseCode} broadcasts the length-${SENSOR_COLS} mean vector across all ${SENSOR_ROWS} rows.`,
    })
    ui.log({ title: 'Grid normalised', detail: normaliseCode, tone: 'good' })
    finishIfReady(true, driftFound, method, patternNoticed)
  }

  const runDrift = (chosen: DriftMethod) => {
    setMethod(chosen)
    if (chosen === 'none') return
    if (chosen === 'mean-then-argmax') {
      const index = argmax(SENSOR_COLUMN_MEANS)
      const ok = index === DRIFT_COLUMN
      if (ok) {
        setDriftFound(true)
        decisions.current.push({
          label: 'Drifting sensor found with two steps',
          good: true,
          explanation: `Column means peaked at index ${index}, which is the sensor climbing ${DRIFT_PER_CYCLE} per cycle.`,
        })
        ui.log({ title: 'Drifting sensor located', detail: `Column ${index}.`, tone: 'good' })
        finishIfReady(normalised, true, chosen, patternNoticed)
        return
      }
    }
    if (chosen === 'one-liner') {
      const index = findDriftingSensor(SENSOR_GRID)
      if (index === DRIFT_COLUMN) {
        setDriftFound(true)
        setFeedback(`Drifting sensor is column ${index}. One chained expression did it.`)
        decisions.current.push({
          label: 'Drifting sensor found with one expression',
          good: true,
          explanation: `${driftExpression} returns ${index}: argmax of the column means.`,
        })
        ui.log({ title: 'One-liner located the drift', detail: driftExpression, tone: 'good' })
        finishIfReady(normalised, true, chosen, patternNoticed)
        return
      }
    }
    const next = mistakes + 1
    setMistakes(next)
    setFeedback('That did not point at the drifting column. Take the column means, then the argmax.')
    decisions.current.push({
      label: 'Drift search missed the column',
      good: false,
      explanation: 'The drifting sensor is the column with the largest mean after centring, found with argmax.',
    })
    ui.log({ title: 'Drift search missed', detail: driftExpression, tone: 'bad' })
  }

  const flagPattern = () => {
    if (patternNoticed) return
    setPatternNoticed(true)
    decisions.current.push({
      label: 'Flagged the +0.4 drift in the Mission Log',
      good: true,
      explanation: `Column ${DRIFT_COLUMN} climbs ${DRIFT_PER_CYCLE} every cycle, a steady linear drift that a plain mean hides.`,
    })
    ui.log({
      title: 'Drift pattern flagged',
      detail: `Column ${DRIFT_COLUMN} rises ${DRIFT_PER_CYCLE} per cycle.`,
      tone: 'tip',
    })
  }

  const normalisedTone = (row: number, col: number): CellTone => {
    if (!normalised) return 'default'
    const value = SENSOR_NORMALISED.data[row * SENSOR_COLS + col]
    if (value > 2) return 'amber'
    if (value < -2) return 'cyan'
    return 'default'
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Part A · normalise the grid</p>
            <Badge tone={normalised ? 'green' : 'muted'}>{normalised ? 'Centred' : 'Not centred'}</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Pick the operation that subtracts each column mean so a slow drift is visible.
          </p>
          <div className="mt-2 space-y-1.5">
            {OPS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setOp(option.id)}
                className={cn(
                  'block w-full rounded border px-2 py-1.5 text-left font-mono text-[11px]',
                  op === option.id
                    ? 'border-cyan/60 bg-cyan/[0.06] text-cyan'
                    : 'border-border bg-panel2/50 text-text hover:border-cyan/40',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <NeonButton size="sm" onClick={runNormalise} data-testid="btn-normalise">
              <Play size={12} aria-hidden="true" />
              Run operation
            </NeonButton>
            {result.error && (
              <span className="flex items-center gap-1 text-[11px] text-red">
                <XCircle size={12} aria-hidden="true" />
                {result.error}
              </span>
            )}
          </div>
          <pre className="mt-2 overflow-auto rounded border border-border bg-bg/80 p-2 font-mono text-[10px] text-cyan/90">
            {result.code}
          </pre>
        </div>

        <div className="rounded border border-border bg-panel2/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Result</p>
            <Badge tone={normalised ? 'cyan' : 'muted'}>{normalised ? 'centred grid' : 'preview'}</Badge>
          </div>
          {normalised ? (
            <div className="mt-2">
              <ArrayGrid
                array={SENSOR_NORMALISED}
                label="Normalised sensor grid"
                tone={normalisedTone}
              />
            </div>
          ) : (
            <div className="mt-2">
              <ArrayGrid array={SENSOR_GRID} label="Original sensor grid" />
            </div>
          )}
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            column means: [{columnMeans.join(', ')}]
          </p>
        </div>
      </div>

      <div className="rounded border border-border bg-panel2/50 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Operation chips</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Try each operation on the whole grid. Notice how one expression changes every cell, a reduction collapses an
          axis, and a row vector broadcasts across all rows.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PREVIEW_OPS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreviewOp(option.id)}
              className={cn(
                'rounded border px-2 py-1 font-mono text-[10px]',
                previewOp === option.id
                  ? 'border-cyan/60 bg-cyan/[0.06] text-cyan'
                  : 'border-border bg-panel text-muted hover:border-cyan/40 hover:text-cyan',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <pre className="mt-2 overflow-auto rounded border border-border bg-bg/80 p-2 font-mono text-[10px] text-cyan/90">
          {preview.code}
        </pre>
        {preview.error ? (
          <p className="mt-1 flex items-start gap-1.5 text-[11px] text-red">
            <XCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            {preview.error}
          </p>
        ) : preview.result ? (
          <div className="mt-1">
            <ArrayValues array={preview.result} />
          </div>
        ) : preview.display ? (
          <p className="mt-1 font-mono text-[11px] text-green">{preview.display}</p>
        ) : (
          <p className="mt-1 font-mono text-[11px] text-muted">The grid is unchanged.</p>
        )}
      </div>

      <div className="border-t border-border/70 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Part B · find the drifting sensor</p>
          <Badge tone={driftFound ? 'green' : 'muted'}>{driftFound ? `Column ${DRIFT_COLUMN}` : 'Searching'}</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Column means summarise each sensor. The largest mean is the one climbing {DRIFT_PER_CYCLE} per cycle.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <NeonButton size="sm" variant="ghost" onClick={() => runDrift('mean-then-argmax')} data-testid="btn-drift-two-step">
            <Sigma size={12} aria-hidden="true" />
            mean then argmax
          </NeonButton>
          <NeonButton size="sm" onClick={() => runDrift('one-liner')} data-testid="btn-drift-one-liner">
            <Sparkles size={12} aria-hidden="true" />
            One expression
          </NeonButton>
          <NeonButton
            size="sm"
            variant="ghost"
            onClick={flagPattern}
            disabled={patternNoticed}
            tooltip={patternNoticed ? 'Already flagged in the Mission Log.' : 'Spot the steady +0.4 rise and flag it.'}
            data-testid="btn-flag-pattern"
          >
            {patternNoticed ? 'Pattern flagged' : 'Flag the +0.4 pattern'}
          </NeonButton>
        </div>
        <code className="mt-2 block rounded border border-border bg-bg/70 p-2 font-mono text-[11px] text-cyan">
          {driftExpression}
        </code>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
            <Gauge size={12} aria-hidden="true" />
            Vector vs Python loop
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            The naive double loop touches every cell one at a time; the vector op touches the whole array once.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded border border-amber/40 bg-amber/[0.05] p-2 text-center">
              <p className="font-display text-lg text-amber">{opCount.loopOps}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">Python loop ops</p>
            </div>
            <div className="rounded border border-green/40 bg-green/[0.05] p-2 text-center">
              <p className="font-display text-lg text-green">{opCount.vectorOps}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">Vector ops</p>
            </div>
          </div>
        </div>

        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Broadcasting · arr + row</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            A 1D row vector stretches across every row without copying data.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">arr</p>
              <div className="mt-1"><ArrayValues array={L03_BROADCAST_SAMPLE} /></div>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">row</p>
              <div className="mt-1"><ArrayValues array={L03_BROADCAST_ROW} /></div>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">result</p>
              <div className="mt-1"><ArrayValues array={L03_BROADCAST_RESULT} /></div>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <p className="flex items-start gap-1.5 rounded border border-cyan/30 bg-cyan/[0.04] p-2 text-[11px] text-cyan" aria-live="polite">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {feedback}
        </p>
      )}
    </div>
  )
}
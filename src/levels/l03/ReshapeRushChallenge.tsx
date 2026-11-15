// Side op 1: reshape the same twelve values into three valid shapes, explaining shape errors.
import { useRef, useState } from 'react'
import { CheckCircle2, Play, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { reshape } from './nd'
import type { NDArray } from './nd'
import { L03_RESHAPE_TARGETS, L03_RESHAPE_VALUES } from './content'
import { ArrayValues } from './ArrayGrid'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface ReshapeResult {
  array: NDArray | null
  code: string
  error: string | null
}

const attempt = (shape: number[]): ReshapeResult => {
  const code = `arr.reshape(${shape.join(', ')})`
  try {
    return { array: reshape(L03_RESHAPE_VALUES, shape), code, error: null }
  } catch (error) {
    return { array: null, code, error: error instanceof Error ? error.message : 'cannot reshape' }
  }
}

export function ReshapeRushChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [shapeIndex, setShapeIndex] = useState(0)
  const [depth, setDepth] = useState('')
  const [rows, setRows] = useState('3')
  const [cols, setCols] = useState('4')
  const [doneTargets, setDoneTargets] = useState<string[]>([])
  const [result, setResult] = useState<ReshapeResult | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const finished = useRef(false)

  const target = L03_RESHAPE_TARGETS[shapeIndex]

  const finishIfReady = (nextDone: string[]) => {
    if (finished.current || nextDone.length !== L03_RESHAPE_TARGETS.length) return
    finished.current = true
    ui.completeObjective('l3-side-1-obj')
    decisions.current.push({
      label: 'All three reshape targets built',
      good: true,
      explanation:
        'reshape only changes shape metadata; the twelve values stay in the same order, so 3x4, 2x6 and 2x2x3 all keep all twelve values.',
    })
    ui.log({ title: 'Reshape rush complete', detail: '3x4, 2x6 and 2x2x3 verified.', tone: 'good' })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + mistakes)),
      efficiency: clamp01(Math.max(0.3, 3 / (3 + mistakes))),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: { reshapeTargets: nextDone.length },
    })
  }

  const check = () => {
    const r = Number(rows)
    const c = Number(cols)
    // A non-empty depth input builds a 3D shape; leaving it blank keeps the target 2D.
    const shape = depth.trim() === '' ? [r, c] : [Number(depth), r, c]
    const attemptResult = attempt(shape)
    setResult(attemptResult)
    if (attemptResult.error || !attemptResult.array) {
      const next = mistakes + 1
      setMistakes(next)
      setFeedback(attemptResult.error ?? 'That shape is not valid.')
      decisions.current.push({
        label: `Reshape failed for (${shape.join(', ')})`,
        good: false,
        explanation: attemptResult.error ?? 'cannot reshape',
      })
      ui.log({ title: 'Cannot reshape', detail: attemptResult.code, tone: 'bad' })
      return
    }
    const matches =
      attemptResult.array.shape.length === target.shape.length &&
      attemptResult.array.shape.every((value, index) => value === target.shape[index])
    if (matches) {
      const nextDone = doneTargets.includes(target.id) ? doneTargets : [...doneTargets, target.id]
      setDoneTargets(nextDone)
      setFeedback(`${target.label} reshaped correctly.`)
      decisions.current.push({
        label: `${target.label} reshaped`,
        good: true,
        explanation: `${attemptResult.code} produced shape (${attemptResult.array.shape.join(', ')}).`,
      })
      ui.log({ title: `${target.label} reshaped`, detail: attemptResult.code, tone: 'good' })
      const nextIndex = L03_RESHAPE_TARGETS.findIndex((item) => !nextDone.includes(item.id))
      if (nextIndex >= 0) {
        setShapeIndex(nextIndex)
        setDepth('')
      }
      finishIfReady(nextDone)
      return
    }
    const next = mistakes + 1
    setMistakes(next)
    setFeedback(
      `Shape (${attemptResult.array.shape.join(', ')}) is valid but not the target (${target.shape.join(', ')}).`,
    )
    decisions.current.push({
      label: `${target.label} shape mismatch`,
      good: false,
      explanation: `Built (${attemptResult.array.shape.join(', ')}) instead of (${target.shape.join(', ')}).`,
    })
    ui.log({ title: 'Wrong target shape', detail: attemptResult.code, tone: 'bad' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {L03_RESHAPE_TARGETS.map((item, index) => {
          const done = doneTargets.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setShapeIndex(index)
                setDepth('')
                setResult(null)
                setFeedback(null)
              }}
              className={cn(
                'rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
                index === shapeIndex
                  ? 'border-cyan/60 bg-cyan/[0.06] text-cyan'
                  : 'border-border bg-panel2/50 text-muted hover:border-cyan/40',
              )}
            >
              {done ? '✓ ' : ''}
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Source values · 12</p>
          <p className="mt-1 text-[11px] text-muted">
            Reshape these twelve values into <span className="text-cyan">{target.label}</span>. A shape is valid only if
            its product is twelve.
          </p>
          <div className="mt-2">
            <ArrayValues array={L03_RESHAPE_VALUES} />
          </div>
        </div>

        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Reshape to</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              layers (3D)
              <input
                type="number"
                value={depth}
                onChange={(event) => setDepth(event.target.value)}
                placeholder="—"
                className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
              />
            </label>
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              rows
              <input
                type="number"
                value={rows}
                onChange={(event) => setRows(event.target.value)}
                className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
              />
            </label>
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              cols
              <input
                type="number"
                value={cols}
                onChange={(event) => setCols(event.target.value)}
                className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
              />
            </label>
          </div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            leave layers blank for a 2D shape
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <NeonButton size="sm" onClick={check} data-testid="btn-reshape-check">
              <Play size={12} aria-hidden="true" />
              Reshape
            </NeonButton>
            {feedback && <span className="text-[11px] text-muted">{feedback}</span>}
          </div>
          {result && (
            <div className="mt-2">
              <p className="font-mono text-[10px] text-cyan/90">{result.code}</p>
              {result.error ? (
                <p className="mt-1 flex items-start gap-1.5 text-[11px] text-red">
                  <XCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {result.error}
                </p>
              ) : (
                result.array && (
                  <div className="mt-1 flex items-start gap-1.5 text-[11px] text-green">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p>shape ({result.array.shape.join(', ')})</p>
                      <div className="mt-1"><ArrayValues array={result.array} /></div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
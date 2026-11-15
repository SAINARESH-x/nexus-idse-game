// Stage 1 challenge: read array anatomy, then build target arrays with constructor chips.
import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Play, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { arange, array, equalsArray, reshape, zeros } from './nd'
import type { NDArray } from './nd'
import {
  DTYPE_OPTIONS,
  L03_ANATOMY,
  L03_BUILD_TARGETS,
  NDIM_OPTIONS,
  SHAPE_OPTIONS,
} from './content'
import { ArrayGrid, ArrayValues } from './ArrayGrid'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

type Constructor = 'array' | 'zeros' | 'arange'

interface BuildConfig {
  constructor: Constructor
  flat: string
  start: number
  stop: number
  step: number
  rows: string
  cols: string
}

interface BuildResult {
  array: NDArray | null
  code: string
  error: string | null
}

const parseFlat = (text: string): number[] | null => {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const values = parts.map(Number)
  return values.every(Number.isFinite) ? values : null
}

const buildArray = (config: BuildConfig): BuildResult => {
  const rows = Number(config.rows)
  const cols = Number(config.cols)
  const hasReshape = config.rows.trim() !== '' && config.cols.trim() !== ''
  if (hasReshape && (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0)) {
    return { array: null, code: 'shape error', error: 'reshape needs positive integer rows and columns' }
  }
  try {
    if (config.constructor === 'zeros') {
      if (!hasReshape) return { array: null, code: 'np.zeros(?)', error: 'np.zeros needs a shape' }
      return {
        array: zeros([rows, cols]),
        code: `np.zeros((${rows}, ${cols}))`,
        error: null,
      }
    }
    if (config.constructor === 'arange') {
      const base = arange(config.start, config.stop, config.step)
      const code = `np.arange(${config.start}, ${config.stop}, ${config.step})`
      if (!hasReshape) return { array: base, code, error: null }
      return {
        array: reshape(base, [rows, cols]),
        code: `${code}.reshape(${rows}, ${cols})`,
        error: null,
      }
    }
    const values = parseFlat(config.flat)
    if (!values) return { array: null, code: 'np.array(?)', error: 'np.array needs comma-separated numbers' }
    const base = array(values)
    const code = `np.array([${values.join(', ')}])`
    if (!hasReshape) return { array: base, code, error: null }
    return {
      array: reshape(base, [rows, cols]),
      code: `${code}.reshape(${rows}, ${cols})`,
      error: null,
    }
  } catch (error) {
    return {
      array: null,
      code: 'error',
      error: error instanceof Error ? error.message : 'Could not build the array',
    }
  }
}

interface AnatomyAnswer {
  shape: string
  ndim: string
  dtype: string
}

const emptyAnswer = (): AnatomyAnswer => ({
  shape: SHAPE_OPTIONS[0],
  ndim: NDIM_OPTIONS[1],
  dtype: DTYPE_OPTIONS[0],
})

export function ArrayWorkbenchChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [answers, setAnswers] = useState<Record<string, AnatomyAnswer>>(() =>
    Object.fromEntries(L03_ANATOMY.map((item) => [item.id, emptyAnswer()])),
  )
  const [anatomyDone, setAnatomyDone] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [targetIndex, setTargetIndex] = useState(0)
  const [config, setConfig] = useState<BuildConfig>({
    constructor: 'arange',
    flat: '2, 4, 6, 8',
    start: 0,
    stop: 6,
    step: 1,
    rows: '2',
    cols: '3',
  })
  const [builtTargets, setBuiltTargets] = useState<string[]>([])
  const [builderFeedback, setBuilderFeedback] = useState<string | null>(null)
  const finished = useRef(false)

  const target = L03_BUILD_TARGETS[targetIndex]
  const built = useMemo(() => buildArray(config), [config])

  const finishIfReady = (nextAnatomy: boolean, nextBuilt: string[]) => {
    if (finished.current) return
    if (!nextAnatomy || nextBuilt.length !== L03_BUILD_TARGETS.length) return
    finished.current = true
    ui.completeObjective('l3-obj-anatomy')
    decisions.current.push({
      label: 'Array anatomy and construction complete',
      good: true,
      explanation:
        'shape lists axis lengths, ndim counts axes and dtype names the value type. The constructors created each target with the same number of values.',
    })
    ui.log({ title: 'Array workbench calibrated', detail: 'Four anatomies and three target arrays verified.', tone: 'good' })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + mistakes)),
      efficiency: clamp01(Math.max(0.3, 7 / (7 + mistakes))),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: { arraysBuilt: nextBuilt.length, anatomyRead: 4 },
    })
  }

  const checkAnatomy = () => {
    const wrong = L03_ANATOMY.filter((item) => {
      const answer = answers[item.id]
      return answer.shape !== item.shape || answer.ndim !== item.ndim || answer.dtype !== item.dtype
    })
    if (wrong.length === 0) {
      setAnatomyDone(true)
      decisions.current.push({
        label: 'All four calibration arrays read correctly',
        good: true,
        explanation: 'shape, ndim and dtype were read from the brackets and the values, not guessed.',
      })
      ui.log({ title: 'Anatomy verified', detail: 'Four arrays read correctly.', tone: 'good' })
      finishIfReady(true, builtTargets)
      return
    }
    const nextMistakes = mistakes + 1
    setMistakes(nextMistakes)
    decisions.current.push({
      label: `${wrong.length} calibration array(s) misread`,
      good: false,
      explanation: `Check ${wrong.map((item) => item.label).join(', ')}. shape counts axis lengths, ndim counts axes and dtype follows the values.`,
    })
    ui.log({ title: 'Anatomy mismatch', detail: `${wrong.length} array(s) need another look.`, tone: 'bad' })
  }

  const checkBuild = () => {
    if (!built.array) {
      const nextMistakes = mistakes + 1
      setMistakes(nextMistakes)
      setBuilderFeedback(built.error ?? 'The builder did not produce an array.')
      ui.log({ title: 'Constructor failed', detail: built.error ?? 'No array produced.', tone: 'bad' })
      return
    }
    if (equalsArray(built.array, target.target)) {
      const nextBuilt = builtTargets.includes(target.id) ? builtTargets : [...builtTargets, target.id]
      setBuiltTargets(nextBuilt)
      setBuilderFeedback(`${target.label} matched.`)
      decisions.current.push({
        label: `${target.label} constructed`,
        good: true,
        explanation: `${built.code} produced shape (${built.array.shape.join(', ')}) with the target values.`,
      })
      ui.log({ title: `${target.label} matched`, detail: built.code, tone: 'good' })
      if (nextBuilt.length < L03_BUILD_TARGETS.length && builtTargets.length === nextBuilt.length - 1) {
        const nextIndex = L03_BUILD_TARGETS.findIndex((item) => !nextBuilt.includes(item.id))
        if (nextIndex >= 0) setTargetIndex(nextIndex)
      }
      finishIfReady(anatomyDone, nextBuilt)
      return
    }
    const nextMistakes = mistakes + 1
    setMistakes(nextMistakes)
    setBuilderFeedback(
      `Shape (${built.array.shape.join(', ')}) is not the target shape (${target.target.shape.join(', ')}), or the values differ.`,
    )
    decisions.current.push({
      label: `${target.label} did not match`,
      good: false,
      explanation: `Built shape (${built.array.shape.join(', ')}) with ${built.array.data.length} values; the target is (${target.target.shape.join(', ')}).`,
    })
    ui.log({ title: 'Target array mismatch', detail: built.code, tone: 'bad' })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Part A · read the anatomy</p>
          <Badge tone={anatomyDone ? 'green' : 'muted'}>{anatomyDone ? 'Verified' : '4 arrays'}</Badge>
        </div>
        <div className="mt-2 space-y-2">
          {L03_ANATOMY.map((item) => {
            const answer = answers[item.id]
            return (
              <div key={item.id} className="rounded border border-border bg-panel2/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text">{item.label}</p>
                    <code className="mt-0.5 block font-mono text-[10px] text-cyan/90">{item.code}</code>
                  </div>
                  <div className="w-full max-w-[300px]">
                    <ArrayGrid array={item.array} label={`${item.label} values`} />
                  </div>
                </div>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    shape
                    <select
                      value={answer.shape}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], shape: event.target.value },
                        }))
                      }
                      className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                    >
                      {SHAPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    ndim
                    <select
                      value={answer.ndim}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], ndim: event.target.value },
                        }))
                      }
                      className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                    >
                      {NDIM_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    dtype
                    <select
                      value={answer.dtype}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], dtype: event.target.value },
                        }))
                      }
                      className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                    >
                      {DTYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <NeonButton size="sm" className="mt-2" onClick={checkAnatomy} data-testid="btn-check-anatomy">
          <CheckCircle2 size={12} aria-hidden="true" />
          Verify anatomy
        </NeonButton>
      </div>

      <div className="border-t border-border/70 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Part B · build the target arrays</p>
          <div className="flex flex-wrap gap-1.5">
            {L03_BUILD_TARGETS.map((item, index) => {
              const done = builtTargets.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTargetIndex(index)}
                  className={cn(
                    'rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]',
                    index === targetIndex
                      ? 'border-cyan/60 bg-cyan/10 text-cyan'
                      : 'border-border bg-panel2/50 text-muted hover:border-cyan/40',
                  )}
                >
                  {done ? '✓ ' : ''}
                  {item.label.split(' · ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-border bg-panel2/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text">{target.label}</p>
            <p className="mt-1 text-[11px] text-muted">{target.hint}</p>
            <div className="mt-2">
              <ArrayGrid array={target.target} label="Target values" />
            </div>
          </div>

          <div className="rounded border border-border bg-panel2/50 p-3">
            <label className="block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              constructor
              <select
                value={config.constructor}
                onChange={(event) => setConfig((current) => ({ ...current, constructor: event.target.value as Constructor }))}
                className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
              >
                <option value="array">np.array</option>
                <option value="zeros">np.zeros</option>
                <option value="arange">np.arange</option>
              </select>
            </label>

            {config.constructor === 'array' && (
              <label className="mt-2 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                values (comma separated)
                <input
                  value={config.flat}
                  onChange={(event) => setConfig((current) => ({ ...current, flat: event.target.value }))}
                  className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                />
              </label>
            )}

            {config.constructor === 'arange' && (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(['start', 'stop', 'step'] as const).map((field) => (
                  <label key={field} className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {field}
                    <input
                      type="number"
                      value={config[field]}
                      onChange={(event) =>
                        setConfig((current) => ({ ...current, [field]: Number(event.target.value) }))
                      }
                      className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                reshape rows
                <input
                  value={config.rows}
                  onChange={(event) => setConfig((current) => ({ ...current, rows: event.target.value }))}
                  className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                />
              </label>
              <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                reshape cols
                <input
                  value={config.cols}
                  onChange={(event) => setConfig((current) => ({ ...current, cols: event.target.value }))}
                  className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-1.5 font-mono text-[11px] text-text"
                />
              </label>
            </div>

            <pre className="mt-2 overflow-auto rounded border border-border bg-bg/80 p-2 font-mono text-[10px] text-cyan/90">
              {built.code}
            </pre>
            {built.error ? (
              <p className="mt-1 flex items-start gap-1.5 text-[11px] text-red">
                <XCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                {built.error}
              </p>
            ) : (
              built.array && <div className="mt-2"><ArrayValues array={built.array} /></div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <NeonButton size="sm" onClick={checkBuild} disabled={!built.array} data-testid="btn-check-build">
                <Play size={12} aria-hidden="true" />
                Check against target
              </NeonButton>
              {builderFeedback && <span className="text-[11px] text-muted">{builderFeedback}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

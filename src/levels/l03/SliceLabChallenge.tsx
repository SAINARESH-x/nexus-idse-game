// Stage 2 challenge: keep a clickable 6x6 grid in sync with Python slicing and boolean masks.
import { useRef, useState } from 'react'
import { CheckCircle2, Crosshair, Grid3X3, Play, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import {
  countTrue,
  formatSelection,
  maskGreaterThan,
  parseSliceExpression,
} from './nd'
import { SENSOR_GRID, SENSOR_COLS, SENSOR_ROWS, L03_SLICE_GOALS, maskGoalMatches, selectionMatches } from './content'
import { ArrayGrid, formatNumber } from './ArrayGrid'
import type { CellTone } from './ArrayGrid'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const ALL_ROWS = Array.from({ length: SENSOR_ROWS }, (_, index) => index)
const ALL_COLS = Array.from({ length: SENSOR_COLS }, (_, index) => index)

interface Selection {
  rows: number[]
  cols: number[]
  cells: Array<[number, number]>
  rectangular: boolean
}

const fullSelection = (): Selection => ({
  rows: ALL_ROWS,
  cols: ALL_COLS,
  cells: ALL_ROWS.flatMap((row) => ALL_COLS.map((col) => [row, col] as [number, number])),
  rectangular: true,
})

const range = (from: number, to: number): number[] => {
  const start = Math.min(from, to)
  const stop = Math.max(from, to)
  return Array.from({ length: stop - start + 1 }, (_, index) => start + index)
}

const rectSelection = (r1: number, c1: number, r2: number, c2: number): Selection => {
  const rows = range(r1, r2)
  const cols = range(c1, c2)
  return {
    rows,
    cols,
    cells: rows.flatMap((row) => cols.map((col) => [row, col] as [number, number])),
    rectangular: true,
  }
}

const NON_RECT_MESSAGE =
  'A single slice always selects a rectangle (or a stepped rectangle). These cells are not one rectangle, so no arr[rows, columns] expression can describe them. Use a boolean mask instead: arr[arr > 30].'

export function SliceLabChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [expression, setExpression] = useState('arr')
  const [selection, setSelection] = useState<Selection>(fullSelection)
  const [parseError, setParseError] = useState<string | null>(null)
  const [activeGoal, setActiveGoal] = useState(0)
  const [doneGoals, setDoneGoals] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [threshold, setThreshold] = useState(30)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [nonRectMessage, setNonRectMessage] = useState<string | null>(null)
  const dragAnchor = useRef<[number, number] | null>(null)
  const dragging = useRef(false)
  const finished = useRef(false)

  const goal = L03_SLICE_GOALS[activeGoal]
  const mask = maskGreaterThan(SENSOR_GRID, threshold)
  const maskCount = countTrue(mask)

  const applySelection = (next: Selection) => {
    setSelection(next)
    setNonRectMessage(next.rectangular ? null : NON_RECT_MESSAGE)
    if (next.rectangular) {
      const text = formatSelection(SENSOR_GRID, next.rows, next.cols)
      if (text) {
        setExpression(text)
        setParseError(null)
      }
    } else {
      setExpression('arr[non-rectangular]')
    }
  }

  const updateExpression = (value: string) => {
    setExpression(value)
    const parsed = parseSliceExpression(value, SENSOR_GRID)
    if (!parsed.ok) {
      setParseError(parsed.error)
      return
    }
    setParseError(null)
    if (parsed.mask) {
      setSelection({ rows: [], cols: [], cells: parsed.cells, rectangular: false })
      // Keep the slider in sync with a typed mask so the preview and the checked threshold agree.
      if (parsed.maskThreshold !== null) setThreshold(parsed.maskThreshold)
      setNonRectMessage(
        `The boolean mask selected ${parsed.cells.length} cell(s). A mask is not a rectangle; it filters cells by value.`,
      )
      return
    }
    setSelection({
      rows: parsed.rowIndices,
      cols: parsed.colIndices,
      cells: parsed.cells,
      rectangular: true,
    })
    setNonRectMessage(null)
  }

  const beginDrag = (row: number, col: number) => {
    dragAnchor.current = [row, col]
    dragging.current = true
    applySelection(rectSelection(row, col, row, col))
  }

  const continueDrag = (row: number, col: number) => {
    if (!dragging.current || !dragAnchor.current) return
    applySelection(rectSelection(dragAnchor.current[0], dragAnchor.current[1], row, col))
  }

  const endDrag = () => {
    dragging.current = false
    dragAnchor.current = null
  }

  const toggleFreeCell = (row: number, col: number) => {
    const exists = selection.cells.some(([r, c]) => r === row && c === col)
    const cells = exists
      ? selection.cells.filter(([r, c]) => !(r === row && c === col))
      : [...selection.cells, [row, col] as [number, number]]
    applySelection({ rows: [], cols: [], cells, rectangular: false })
  }

  const selectDiagonal = () => {
    const cells = Array.from({ length: Math.min(SENSOR_ROWS, SENSOR_COLS) }, (_, index) => [index, index] as [number, number])
    applySelection({ rows: [], cols: [], cells, rectangular: false })
    setExpression('arr[diagonal]')
    setNonRectMessage(NON_RECT_MESSAGE)
  }

  const applyMaskExpression = () => {
    updateExpression(`arr[arr > ${threshold}]`)
  }

  const cellTone = (row: number, col: number): CellTone => {
    const selected = selection.cells.some(([r, c]) => r === row && c === col)
    if (selected) return 'cyan'
    if (mask[row * SENSOR_COLS + col]) return 'amber'
    return 'default'
  }

  const finishIfReady = (nextDone: string[]) => {
    if (finished.current || nextDone.length !== L03_SLICE_GOALS.length) return
    finished.current = true
    ui.completeObjective('l3-obj-slices')
    decisions.current.push({
      label: 'Every slice and mask goal extracted',
      good: true,
      explanation:
        'Rows, columns and blocks are slices; a step selects every other column; a boolean mask filters values that are not a rectangle.',
    })
    ui.log({ title: 'Signal slices locked', detail: 'All five extraction goals matched.', tone: 'good' })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + mistakes)),
      efficiency: clamp01(Math.max(0.3, 5 / (5 + mistakes))),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: { sliceGoals: nextDone.length, maskThreshold: threshold },
    })
  }

  const lockSelection = () => {
    if (!goal) return
    const selectionIsMask =
      selection.cells.length === maskCount &&
      selection.cells.every(([row, col]) => mask[row * SENSOR_COLS + col])
    const pass =
      goal.kind === 'mask'
        ? maskGoalMatches(goal, threshold, maskCount) && selectionIsMask
        : selection.rectangular && selectionMatches(goal, selection.rows, selection.cols)

    if (pass) {
      if (doneGoals.includes(goal.id)) return
      const nextDone = [...doneGoals, goal.id]
      setDoneGoals(nextDone)
      setFeedback(`Goal met: ${goal.label}.`)
      decisions.current.push({
        label: `Extraction goal met: ${goal.label}`,
        good: true,
        explanation:
          goal.kind === 'mask'
            ? `arr[arr > ${threshold}] selected ${maskCount} cell(s), exactly the target.`
            : `${expression} selected rows [${selection.rows.join(', ')}] and columns [${selection.cols.join(', ')}].`,
      })
      ui.log({ title: `Slice goal met: ${goal.label}`, detail: goal.kind === 'mask' ? `Mask count ${maskCount}.` : expression, tone: 'good' })
      const nextIndex = L03_SLICE_GOALS.findIndex((item, index) => index > activeGoal && !nextDone.includes(item.id))
      if (nextIndex >= 0) {
        setActiveGoal(nextIndex)
      } else {
        const wrap = L03_SLICE_GOALS.findIndex((item) => !nextDone.includes(item.id))
        if (wrap >= 0) setActiveGoal(wrap)
      }
      finishIfReady(nextDone)
      return
    }

    const nextMistakes = mistakes + 1
    setMistakes(nextMistakes)
    setFeedback(
      goal.kind === 'mask'
        ? maskGoalMatches(goal, threshold, maskCount) && !selectionIsMask
          ? 'The threshold is correct, but the mask is not applied to the grid yet. Choose Apply mask, then lock it.'
          : `The mask selected ${maskCount} cell(s) at threshold ${threshold}; the target is ${goal.count} at ${goal.threshold}.`
        : 'That selection does not match the active goal. Check the row and column indices, and remember that stops are exclusive.',
    )
    decisions.current.push({
      label: `Extraction goal missed: ${goal.label}`,
      good: false,
      explanation:
        goal.kind === 'mask'
          ? `Threshold ${threshold} produced ${maskCount} cells instead of ${goal.count} at threshold ${goal.threshold}.`
          : expression,
    })
    ui.log({ title: `Slice goal missed: ${goal.label}`, detail: goal.hint, tone: 'bad' })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        {L03_SLICE_GOALS.map((item, index) => {
          const done = doneGoals.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveGoal(index)}
              className={cn(
                'rounded border p-2 text-left',
                index === activeGoal
                  ? 'border-cyan/60 bg-cyan/[0.06]'
                  : 'border-border bg-panel2/50 hover:border-cyan/40',
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">Goal {index + 1}</span>
                {done ? <CheckCircle2 size={12} className="text-green" aria-label="complete" /> : <Badge tone="muted">open</Badge>}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-text">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Sensor grid · 6 x 6</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              drag a rectangle · ctrl-click for free cells
            </p>
          </div>
          <div
            className="mt-2 rounded border border-border bg-bg/40 p-2"
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            role="presentation"
          >
            <ArrayGrid
              array={SENSOR_GRID}
              label="Sensor grid"
              tone={cellTone}
              onCellMouseDown={(row, col, event) => {
                if (event.ctrlKey || event.metaKey) return
                event.preventDefault()
                beginDrag(row, col)
              }}
              onCellMouseEnter={(row, col) => continueDrag(row, col)}
              onCell={(row, col, event) => {
                if (event.ctrlKey || event.metaKey) {
                  toggleFreeCell(row, col)
                  return
                }
                if (event.detail === 0) {
                  applySelection(rectSelection(row, col, row, col))
                }
              }}
              cellLabel={(row, col) => {
                const selected = selection.cells.some(([r, c]) => r === row && c === col)
                return `row ${row}, column ${col}, value ${formatNumber(SENSOR_GRID.data[row * SENSOR_COLS + col])}${selected ? ', selected' : ''}`
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <NeonButton size="sm" variant="ghost" onClick={selectDiagonal} data-testid="btn-select-diagonal">
                <Crosshair size={12} aria-hidden="true" />
                Try diagonal
              </NeonButton>
              <NeonButton size="sm" variant="ghost" onClick={() => applySelection(fullSelection())}>
                <Grid3X3 size={12} aria-hidden="true" />
                Select all
              </NeonButton>
            </div>
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              slice expression
              <input
                value={expression}
                onChange={(event) => updateExpression(event.target.value)}
                className="mt-0.5 h-8 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-cyan"
              />
            </label>
            <div className="self-end font-mono text-[10px] text-muted">
              selected: <span className="text-cyan">{selection.cells.length}</span> cell(s)
            </div>
          </div>
          {parseError && (
            <p className="mt-1 flex items-start gap-1.5 rounded border border-red/40 bg-red/[0.05] p-2 text-[11px] text-red">
              <XCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {parseError}
            </p>
          )}
          {nonRectMessage && (
            <p className="mt-1 rounded border border-amber/40 bg-amber/[0.05] p-2 text-[11px] leading-relaxed text-amber" aria-live="polite">
              {nonRectMessage}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded border border-border bg-panel2/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Boolean mask</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              A mask keeps every cell whose value passes a comparison. Move the threshold to preview the mask.
            </p>
            <label className="mt-2 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              threshold: {threshold}
              <input
                type="range"
                min={15}
                max={32}
                step={0.5}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <code className="mt-1 block rounded border border-border bg-bg/70 p-2 font-mono text-[11px] text-cyan">
              arr[arr &gt; {threshold}]
            </code>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              mask selects <span className="text-amber">{maskCount}</span> cell(s)
            </p>
            <NeonButton size="sm" variant="ghost" className="mt-2" onClick={applyMaskExpression}>
              Apply mask
            </NeonButton>
          </div>

          <div className="rounded border border-border bg-panel2/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Active goal</p>
            <p className="mt-1 text-xs text-text">{goal?.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{goal?.hint}</p>
            {goal?.kind === 'selection' && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                target rows [{goal.rows?.join(', ')}] · cols [{goal.cols?.join(', ')}]
              </p>
            )}
            {goal?.kind === 'mask' && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                target threshold {goal.threshold} · count {goal.count}
              </p>
            )}
            <NeonButton size="sm" className="mt-2" onClick={lockSelection} data-testid="btn-lock-slice">
              <Play size={12} aria-hidden="true" />
              Lock selection
            </NeonButton>
            {feedback && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber" aria-live="polite">
                {feedback}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

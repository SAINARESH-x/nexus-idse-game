// DragSort: native HTML5 drag-and-drop plus a click-to-select fallback.
import { useState } from 'react'
import { CheckCircle2, GripVertical, MousePointerClick, XCircle } from 'lucide-react'
import { cn } from '../../ui/cn'
import {
  attemptDrop,
  createDragSortState,
  firstTryCorrect,
  isSolved,
  remainingItems,
} from './dragSortLogic'
import type { DragSortBin, DragSortItem } from './dragSortLogic'

export interface DragSortSummary {
  mistakes: number
  firstTryCorrect: number
  solved: number
}

export interface DragSortProps {
  items: DragSortItem[]
  bins: DragSortBin[]
  onPlace?: (item: DragSortItem, bin: DragSortBin, correct: boolean, message: string) => void
  onComplete?: (summary: DragSortSummary) => void
  label?: string
}

export function DragSort({ items, bins, onPlace, onComplete, label = 'Values to classify' }: DragSortProps) {
  const [state, setState] = useState(createDragSortState)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pool = remainingItems(state, items)
  const solved = isSolved(state, items)

  const place = (itemId: string, binId: string) => {
    const item = items.find((candidate) => candidate.id === itemId)
    const bin = bins.find((candidate) => candidate.id === binId)
    if (!item || !bin) return
    const next = attemptDrop(state, item, binId)
    if (next === state) return

    setState(next)
    const feedback = next.feedback
    if (feedback) onPlace?.(item, bin, feedback.correct, feedback.message)
    setSelectedId(null)

    if (!solved && isSolved(next, items)) {
      onComplete?.({
        mistakes: next.mistakes,
        firstTryCorrect: firstTryCorrect(next, items),
        solved: items.length,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {pool.length} of {items.length} values remaining
        </p>
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <MousePointerClick size={12} aria-hidden="true" />
          Drag a value, or select it then click a bin
        </p>
      </div>

      <div aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {pool.map((item) => (
          <button
            key={item.id}
            type="button"
            draggable
            aria-pressed={selectedId === item.id}
            data-testid={`drag-item-${item.id}`}
            onClick={() => setSelectedId((current) => (current === item.id ? null : item.id))}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', item.id)
              event.dataTransfer.effectAllowed = 'move'
              setSelectedId(item.id)
            }}
            className={cn(
              'flex min-h-[54px] items-center justify-between gap-2 rounded border bg-panel2 px-3 py-2 text-left transition-colors',
              selectedId === item.id
                ? 'border-cyan text-cyan shadow-glow-cyan-sm'
                : 'border-border text-text hover:border-cyan/50',
            )}
          >
            <span className="break-all font-mono text-xs">{item.label}</span>
            <GripVertical size={14} className="shrink-0 text-muted" aria-hidden="true" />
          </button>
        ))}
        {pool.length === 0 && (
          <p className="col-span-full rounded border border-green/40 bg-green/[0.06] p-3 text-xs text-green">
            Every value is filed. Intake sorting complete.
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {bins.map((bin) => {
          const placed = items.filter((item) => state.placements[item.id] === bin.id)
          return (
            <button
              key={bin.id}
              type="button"
              data-testid={`drag-bin-${bin.id}`}
              onClick={() => {
                if (selectedId) place(selectedId, bin.id)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const itemId = event.dataTransfer.getData('text/plain') || selectedId
                if (itemId) place(itemId, bin.id)
              }}
              className={cn(
                'min-h-[92px] rounded border border-dashed p-3 text-left transition-colors',
                selectedId ? 'border-cyan/50 bg-cyan/[0.03] hover:border-cyan' : 'border-border bg-panel/60',
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-xs uppercase tracking-[0.16em] text-text">{bin.label}</span>
                <span className="font-mono text-[10px] text-muted">{placed.length}</span>
              </span>
              {bin.hint && <span className="mt-1 block text-[11px] text-muted">{bin.hint}</span>}
              <span className="mt-2 flex flex-wrap gap-1">
                {placed.map((item) => (
                  <span
                    key={item.id}
                    className="rounded border border-green/40 bg-green/10 px-1.5 py-0.5 font-mono text-[10px] text-green"
                  >
                    {item.label}
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div aria-live="polite" className="min-h-[44px]">
        {state.feedback && (
          <p
            className={cn(
              'flex items-start gap-2 rounded border p-3 text-xs',
              state.feedback.correct
                ? 'border-green/40 bg-green/[0.06] text-green'
                : 'border-red/50 bg-red/[0.08] text-red',
            )}
          >
            {state.feedback.correct ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{state.feedback.message}</span>
          </p>
        )}
      </div>
    </div>
  )
}

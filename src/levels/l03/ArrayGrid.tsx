// ArrayGrid: compact read-only or clickable display for the mini-NumPy arrays.
import type { MouseEvent } from 'react'
import type { NDArray } from './nd'
import { toRows } from './nd'
import { cn } from '../../ui/cn'

export type CellTone = 'default' | 'cyan' | 'green' | 'amber' | 'red' | 'muted'

const toneClasses: Record<CellTone, string> = {
  default: 'border-border bg-panel2/60 text-text',
  cyan: 'border-cyan/60 bg-cyan/10 text-cyan',
  green: 'border-green/50 bg-green/10 text-green',
  amber: 'border-amber/50 bg-amber/10 text-amber',
  red: 'border-red/50 bg-red/10 text-red',
  muted: 'border-border/60 bg-panel/40 text-muted',
}

export const formatNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 100) / 100)
}

export interface ArrayGridProps {
  array: NDArray
  label?: string
  tone?: (row: number, col: number) => CellTone
  onCell?: (row: number, col: number, event: MouseEvent<HTMLButtonElement>) => void
  /** Fires on mouse-down so a caller can start a click-drag selection. */
  onCellMouseDown?: (row: number, col: number, event: MouseEvent<HTMLButtonElement>) => void
  /** Fires on mouse-enter so a drag can extend the selection across cells. */
  onCellMouseEnter?: (row: number, col: number, event: MouseEvent<HTMLButtonElement>) => void
  cellLabel?: (row: number, col: number) => string
}

export function ArrayGrid({
  array,
  label,
  tone,
  onCell,
  onCellMouseDown,
  onCellMouseEnter,
  cellLabel,
}: ArrayGridProps) {
  const rows = toRows(array)
  const cols = array.shape[1] ?? array.data.length
  return (
    <div aria-label={label ? `${label}, shape ${array.shape.join(' x ')}` : undefined}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {rows.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const cellTone = tone?.(rowIndex, colIndex) ?? 'default'
            const content = (
              <>
                <span className="block text-[8px] leading-none text-muted">
                  {rowIndex},{colIndex}
                </span>
                <span className="block font-mono text-xs">{formatNumber(value)}</span>
              </>
            )
            if (!onCell) {
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn('rounded border px-1 py-1 text-center', toneClasses[cellTone])}
                >
                  {content}
                </div>
              )
            }
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={(event) => onCell(rowIndex, colIndex, event)}
                onMouseDown={onCellMouseDown ? (event) => onCellMouseDown(rowIndex, colIndex, event) : undefined}
                onMouseEnter={onCellMouseEnter ? (event) => onCellMouseEnter(rowIndex, colIndex, event) : undefined}
                aria-label={cellLabel ? cellLabel(rowIndex, colIndex) : `row ${rowIndex}, column ${colIndex}, value ${value}`}
                aria-pressed={cellTone === 'cyan'}
                className={cn('rounded border px-1 py-1 text-center transition-colors hover:border-cyan', toneClasses[cellTone])}
              >
                {content}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export interface ArrayValuesProps {
  array: NDArray
}

/** Displays 1D, 2D and reshaped 3D values without pretending the module slices 3D. */
export function ArrayValues({ array }: ArrayValuesProps) {
  const rows = toRows(array)
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        shape ({array.shape.join(', ')}) · {array.dtype}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {rows.map((row, index) => (
          <div key={index} className="rounded border border-border bg-panel2/50 px-1.5 py-1">
            <span className="mr-1 font-mono text-[8px] text-muted">{index}</span>
            <span className="font-mono text-[11px] text-text">[{row.map(formatNumber).join(', ')}]</span>
          </div>
        ))}
      </div>
    </div>
  )
}

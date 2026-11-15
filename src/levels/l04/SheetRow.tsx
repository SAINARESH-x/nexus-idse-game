// One memoised spreadsheet row: sticky idx cell, checkbox, highlight layer, flag markers and inline editor.
import { memo, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Flag as FlagIcon, Copy } from 'lucide-react'
import { displayCell } from '../../engine'
import type { CellProblem, DF, Row } from '../../engine'
import { cn } from '../../ui/cn'
import { PROBLEM_LABEL, problemClass } from './sheetModel'

export interface SheetRowProps {
  row: Row
  df: DF
  columns: string[]
  /** column -> problems (only when highlights are on). */
  problems: Record<string, CellProblem[]> | null
  duplicate: boolean
  selectedCol: string | null
  editing: boolean
  checked: boolean
  /** Marker signature: column names (and '*' for the whole row) flagged on this row, with their label. */
  marks: Record<string, string> | null
  onSelect: (idx: number, col: string) => void
  onStartEdit: (idx: number, col: string) => void
  onCommit: (idx: number, col: string, text: string) => void
  onCancel: () => void
  onToggle: (idx: number) => void
  onMarkRow: ((idx: number) => void) | null
}

function Editor({ initial, onCommit, onCancel }: { initial: string; onCommit: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      aria-label="Edit cell value"
      className="w-full min-w-[4rem] rounded border border-cyan bg-bg px-1 font-mono text-[11px] text-text outline-none"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') onCommit(text)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
    />
  )
}

function SheetRowInner(p: SheetRowProps) {
  const { row, df, columns, problems } = p
  const rowMark = p.marks?.['*']
  return (
    <tr className={cn('border-b border-border/50', p.duplicate && 'bg-[repeating-linear-gradient(135deg,rgba(255,176,32,0.12)_0_6px,transparent_6px_12px)]', p.checked && 'bg-cyan/10')} data-row-idx={row.idx}>
      <td className={cn('sticky left-0 z-10 border-r border-border bg-panel px-1.5 py-1 font-mono text-[10px] text-muted', p.duplicate && 'border-l-2 border-l-amber')}>
        <div className="flex items-center gap-1">
          <input type="checkbox" aria-label={`Select row ${row.idx}`} checked={p.checked} onChange={() => p.onToggle(row.idx)} className="accent-cyan" />
          {p.onMarkRow ? (
            <button type="button" className="hover:text-cyan" onClick={() => p.onMarkRow?.(row.idx)} aria-label={`Flag row ${row.idx}`}>
              {row.idx}
            </button>
          ) : (
            <span>{row.idx}</span>
          )}
          {p.duplicate && (
            <span className="flex items-center text-amber" title="duplicate row">
              <Copy size={10} aria-hidden="true" />
              <span className="sr-only">duplicate row</span>
            </span>
          )}
          {rowMark && (
            <span className="rounded bg-amber/20 px-1 text-[9px] uppercase text-amber" title={`Flagged: ${rowMark}`}>
              <FlagIcon size={9} className="inline" aria-hidden="true" /> {rowMark.slice(0, 4)}
            </span>
          )}
        </div>
      </td>
      {columns.map((col) => {
        const cell = row.v[col] ?? null
        const ps = problems?.[col] ?? []
        const text = displayCell(df, col, cell)
        const selected = p.selectedCol === col
        const mark = p.marks?.[col]
        return (
          <td
            key={col}
            tabIndex={-1}
            data-cell={`${row.idx}|${col}`}
            aria-selected={selected}
            title={ps.length ? ps.map((x) => PROBLEM_LABEL[x]).join(', ') : undefined}
            onClick={() => p.onSelect(row.idx, col)}
            onDoubleClick={() => p.onStartEdit(row.idx, col)}
            className={cn('relative cursor-cell whitespace-nowrap px-2 py-1 font-mono text-[11px] text-text', problemClass(ps), selected && 'ring-2 ring-inset ring-cyan', mark && 'shadow-[inset_0_0_0_2px_rgba(255,176,32,0.9)]')}
          >
            {p.editing && selected ? (
              <Editor initial={cell === null ? '' : String(cell)} onCommit={(t) => p.onCommit(row.idx, col, t)} onCancel={p.onCancel} />
            ) : (
              <span className="flex items-center gap-1">
                {ps.includes('out_of_range') && <AlertTriangle size={10} aria-label="out of range" />}
                {ps.includes('unknown_label') && <span aria-hidden="true">?</span>}
                {text}
                {mark && (
                  <span className="ml-1 rounded bg-amber/25 px-0.5 text-[8px] uppercase text-amber" title={`Flagged: ${mark}`}>
                    {mark.slice(0, 4)}
                  </span>
                )}
              </span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

export const SheetRow = memo(SheetRowInner)

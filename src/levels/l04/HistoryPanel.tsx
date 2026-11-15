// HistoryPanel: every entry with source icon, rows before/after and a BEFORE/AFTER health summary; UNDO/REDO/RESET.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, MousePointer2, Puzzle, Redo2, RotateCcw, Terminal, Undo2 } from 'lucide-react'
import { applyAll, liveHealth } from '../../engine'
import type { DF, OpSource } from '../../engine'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { useDfSession, useL04 } from './session'

const SOURCE_ICON: Record<OpSource, typeof Terminal> = { ui: MousePointer2, puzzle: Puzzle, command: Terminal }

function brief(df: DF): string {
  const h = liveHealth(df)
  return `(${df.rows.length}, ${df.columns.length}) · ${h.totalNulls} null · ${h.normalizedDuplicates} dup`
}

export function HistoryPanel() {
  const { session } = useL04()
  const state = useDfSession((s) => s)
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const entries = useMemo(() => (state ? session.allEntries : []), [session, state])

  const snapshots = useMemo(() => {
    if (!open) return []
    const out: DF[] = [state.original]
    let cur = state.original
    for (const e of entries) {
      const r = applyAll(cur, e.ops)
      cur = r.ok ? r.df : cur
      out.push(cur)
    }
    return out
  }, [open, entries, state.original])

  return (
    <div className="rounded border border-border bg-panel/80">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
          {open ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronUp size={12} aria-hidden="true" />}
          History ({state.history.length})
        </button>
        <span className="font-mono text-[10px] text-muted" data-testid="history-rows">
          Original: {state.original.rows.length} rows · Current: {state.current.rows.length} rows
        </span>
        <span className="ml-auto flex gap-2">
          <NeonButton size="sm" variant="ghost" onClick={() => session.undo()} disabled={!state.canUndo} tooltip="Undo (Ctrl+Z)" data-testid="btn-undo">
            <Undo2 size={12} aria-hidden="true" /> Undo
          </NeonButton>
          <NeonButton size="sm" variant="ghost" onClick={() => session.redo()} disabled={!state.canRedo} tooltip="Redo (Ctrl+Shift+Z)" data-testid="btn-redo">
            <Redo2 size={12} aria-hidden="true" /> Redo
          </NeonButton>
          <NeonButton size="sm" variant="danger" onClick={() => setConfirm(true)} disabled={entries.length === 0} tooltip={entries.length ? 'Back to the original data' : 'Nothing to reset'}>
            <RotateCcw size={12} aria-hidden="true" /> Reset dataset
          </NeonButton>
        </span>
      </div>
      {open && (
        <ol className="max-h-64 space-y-1 overflow-auto border-t border-border px-3 py-2" data-testid="history-list">
          {entries.length === 0 && <li className="text-xs text-muted">No operations yet.</li>}
          {entries.map((e, i) => {
            const Icon = SOURCE_ICON[e.source]
            const undone = i >= state.cursor
            return (
              <li key={e.id} className={cn('rounded border border-border/60 bg-panel2/40 p-2', undone && 'opacity-50')}>
                <div className="flex flex-wrap items-center gap-2">
                  <Icon size={12} className="text-cyan" aria-label={`source ${e.source}`} />
                  <code className="font-mono text-[11px] text-text">{e.code}</code>
                  <span className="font-mono text-[10px] text-muted">{e.rowsBefore} to {e.rowsAfter} rows</span>
                  {e.decision && <Badge tone={e.decision.good === true ? 'green' : e.decision.good === false ? 'red' : 'amber'}>{e.decision.good === true ? 'good' : e.decision.good === false ? 'bad' : e.decision.redundant ? 'no effect' : 'neutral'}</Badge>}
                  {undone && <Badge tone="muted">undone</Badge>}
                </div>
                {snapshots[i + 1] && (
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    BEFORE {brief(snapshots[i])} → AFTER {brief(snapshots[i + 1])}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset dataset?"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setConfirm(false)}>Keep my work</NeonButton>
            <NeonButton variant="danger" onClick={() => { session.reset(); setConfirm(false) }} data-testid="btn-reset-confirm">Reset to original</NeonButton>
          </>
        }
      >
        <p>Every operation is undone and the table returns to the original dirty data. Your decisions stay on record as undone.</p>
      </Modal>
    </div>
  )
}

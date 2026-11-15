// Stage 1 (FLAG tool) and Stage 2 (brushes + CORRUPTION REPORT) control panels.
import { Flag as FlagIcon, Send } from 'lucide-react'
import type { FlagKind } from '../../engine'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ISSUE_KINDS, KIND_LABEL, countFlags, scoreReport } from './flagScoring'
import { useL04 } from './session'

export function Stage1Panel({ flagMode, setFlagMode }: { flagMode: boolean; setFlagMode: (v: boolean) => void }) {
  const { record } = useL04()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted">The vault is open. Look before you touch: check the size and the types, then mark three things that look wrong.</p>
      <NeonButton size="sm" variant={flagMode ? 'primary' : 'ghost'} onClick={() => setFlagMode(!flagMode)} aria-pressed={flagMode} data-testid="btn-flag-tool">
        <FlagIcon size={12} aria-hidden="true" /> FLAG tool {flagMode ? 'ON' : 'OFF'}
      </NeonButton>
      <Badge tone="amber">{record.stage1.marks.length} flagged</Badge>
      {flagMode && <span className="text-[11px] text-amber">Click cells, row numbers or column names to flag them. Click again to remove a flag.</span>}
    </div>
  )
}

const BRUSHES: FlagKind[] = [...ISSUE_KINDS, 'anomaly']
const BRUSH_TONE: Record<FlagKind, string> = {
  missing: 'border-red text-red',
  duplicate: 'border-amber text-amber',
  inconsistent: 'border-violet text-violet',
  type: 'border-cyan text-cyan',
  invalid: 'border-magenta text-magenta',
  anomaly: 'border-green text-green',
}

export function Stage2Panel({ brush, setBrush }: { brush: FlagKind | null; setBrush: (b: FlagKind | null) => void }) {
  const { record, update, gen, addLog } = useL04()
  const counts = countFlags(record.flags)
  const submit = () => {
    const n = record.stage2.submissions + 1
    const rep = scoreReport(record.flags, gen.issues, gen.ghosts, record.tier, n, gen.dirty)
    update((x) => ({ ...x, stage2: { submissions: n, passed: x.stage2.passed || rep.passed, f1: rep.f1, feedback: rep.feedback } }))
    addLog({ title: `Corruption report #${n}: F1 ${Math.round(rep.f1 * 100)}%`, detail: rep.passed ? 'Report accepted.' : 'Report below the bar; refine and resubmit.', tone: rep.passed ? 'good' : 'bad' })
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Flag brushes">
        {BRUSHES.map((b) => (
          <button key={b} type="button" aria-pressed={brush === b} data-testid={`brush-${b}`} onClick={() => setBrush(brush === b ? null : b)} className={cn('rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]', brush === b ? `${BRUSH_TONE[b]} bg-panel2` : 'border-border text-muted')}>
            {KIND_LABEL[b]}
          </button>
        ))}
        <span className="text-[11px] text-muted">{brush ? `Painting ${KIND_LABEL[brush]}: click cells, row numbers or (for Wrong type) a column name.` : 'Pick a brush to start flagging.'}</span>
      </div>
      <div className="rounded border border-border bg-panel2/40 p-3" aria-label="Corruption report">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Corruption report</p>
        <ul className="mt-2 grid grid-cols-3 gap-2 text-xs md:grid-cols-6">
          {BRUSHES.map((b) => (
            <li key={b} className="rounded border border-border/60 p-1.5 text-center">
              <span className="block font-display text-lg text-text">{counts[b]}</span>
              <span className="text-[10px] text-muted">{KIND_LABEL[b]}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <NeonButton size="sm" onClick={submit} data-testid="btn-submit-report">
            <Send size={12} aria-hidden="true" /> Submit report
          </NeonButton>
          <span className="font-mono text-[10px] text-muted">Submissions: {record.stage2.submissions}</span>
          {record.stage2.passed && <Badge tone="green">Report accepted</Badge>}
        </div>
        {record.stage2.feedback.length > 0 && (
          <ul className="mt-2 space-y-1 text-[11px] text-text" aria-live="polite" data-testid="report-feedback">
            {record.stage2.feedback.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

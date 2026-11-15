// Stage 3 DATA RECONSTRUCTION: five health meters, NEW TOOL UNLOCKED intro, Field Puzzles drawer, SKIP REMAINING.
import { useState } from 'react'
import { Puzzle, Sparkles } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { FieldPuzzles } from './FieldPuzzles'
import { useDfSession, useL04 } from './session'
import type { Meter } from './stageLogic'
import { SKIP_AFTER_OPS } from './stageLogic'

export function Meters({ meters }: { meters: Meter[] }) {
  const { jumpToColumn } = useL04()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Health meters">
      {meters.map((m) => {
        const frac = m.original ? m.now / m.original : m.now > 0 ? 1 : 0
        return (
          <button key={m.id} type="button" data-testid={`meter-${m.id}`} onClick={() => jumpToColumn(m.column)} className={cn('rounded border p-2 text-left hover:border-cyan/60', m.now === 0 ? 'border-green/50 bg-green/5' : 'border-border bg-panel2/40')} title={`Jump to ${m.column}`}>
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{m.label}</span>
            <span className={cn('font-display text-lg', m.now === 0 ? 'text-green' : 'text-amber')}>{m.now}</span>
            <span className="font-mono text-[10px] text-muted"> / {m.original} {m.now === 0 ? '✓ clear' : 'left'}</span>
            <span className="mt-1 block h-1 rounded bg-border"><span className={cn('block h-1 rounded', m.now === 0 ? 'bg-green' : 'bg-amber')} style={{ width: `${Math.round(frac * 100)}%` }} /></span>
          </button>
        )
      })}
    </div>
  )
}

export function Stage3Panel({ meters, onSkip }: { meters: Meter[]; onSkip: () => void }) {
  const { record, update } = useL04()
  const ops = useDfSession((s) => s.history.length)
  const [puzzles, setPuzzles] = useState(false)
  const [skip, setSkip] = useState(false)
  return (
    <div className="space-y-3">
      <Meters meters={meters} />
      <div className="flex flex-wrap items-center gap-2">
        <NeonButton size="sm" variant="ghost" onClick={() => setPuzzles(true)} data-testid="btn-field-puzzles">
          <Puzzle size={12} aria-hidden="true" /> Field puzzles (optional)
        </NeonButton>
        {ops >= SKIP_AFTER_OPS && (
          <NeonButton size="sm" variant="danger" onClick={() => setSkip(true)} data-testid="btn-skip-remaining">Skip remaining</NeonButton>
        )}
        <span className="font-mono text-[10px] text-muted">Repair in any tab and any order. Click a meter to jump to its column.</span>
      </div>
      <Modal open={puzzles} onClose={() => setPuzzles(false)} title="Field puzzles" size="lg">
        <FieldPuzzles />
      </Modal>
      <Modal
        open={skip}
        onClose={() => setSkip(false)}
        title="Skip the remaining repairs?"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setSkip(false)}>Keep repairing</NeonButton>
            <NeonButton variant="danger" onClick={() => { setSkip(false); onSkip() }} data-testid="btn-skip-confirm">Skip to the audit</NeonButton>
          </>
        }
      >
        <p>Leftover problems stay in the data and are reported as unresolved in the debrief.</p>
      </Modal>
      <Modal
        open={!record.stage3.introSeen}
        onClose={() => update((x) => ({ ...x, stage3: { ...x.stage3, introSeen: true } }))}
        title="NEW TOOL UNLOCKED"
        footer={<NeonButton onClick={() => update((x) => ({ ...x, stage3: { ...x.stage3, introSeen: true } }))} data-testid="btn-intro-ok">Got it</NeonButton>}
      >
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-display uppercase tracking-[0.16em] text-cyan motion-safe:animate-pulse"><Sparkles size={16} aria-hidden="true" /> Console · Builder · Strategy Lab</p>
          <p>A click in the spreadsheet, a choice in the Builder and a line typed in the Console are the same thing: one pandas operation on the same table, recorded in the same History.</p>
          <p className="text-muted">The Builder assembles commands from parts. The Console reads typed pandas (optional, never required). The Strategy Lab compares strategies on a copy before you commit.</p>
        </div>
      </Modal>
    </div>
  )
}

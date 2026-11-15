// Clearance screen: three tier cards with the adaptive RECOMMENDED badge; confirming a tier starts the mission.
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { recommendTier } from '../../game/adaptive'
import { useGameStore } from '../../game/store'
import type { Tier } from '../../game/types'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { cn } from '../../ui/cn'

const CARDS: Array<{ tier: Tier; title: string; lines: string[] }> = [
  { tier: 'assisted', title: 'ASSISTED', lines: ['47 rows, 18 injected issues', 'Analyst highlights always on', 'Exact copies and obvious label variants', 'XP x1.0 · par 8 operations'] },
  { tier: 'independent', title: 'INDEPENDENT', lines: ['About 160 rows, near-duplicates', 'No highlights: Analyst Scan costs a hint', 'cgpa stored as text with placeholders', 'XP x1.25 · par 12 operations'] },
  { tier: 'expert', title: 'EXPERT', lines: ['About 324 rows, many variants', 'No highlights: Analyst Scan costs a hint', 'Blank attendance hides dropouts', 'XP x1.5 · par 16 operations'] },
]

export function Clearance({ onConfirm, notice }: { onConfirm: (tier: Tier) => void; notice?: string }) {
  const history = useGameStore((s) => s.adaptive.history)
  const rec = recommendTier(history, 4)
  const [picked, setPicked] = useState<Tier>(rec.tier)
  const [busy, setBusy] = useState(false)
  return (
    <main className="mx-auto max-w-5xl px-6 py-10" data-testid="l04-clearance">
      <Panel eyebrow="Level 04 · DATA VAULT" title="CLEARANCE" tone="cyan">
        <p className="text-sm text-muted">Choose how much help NEXUS gives you. The same seed and tier always produce the same vault.</p>
        {notice && <p className="mt-2 text-xs text-amber">{notice}</p>}
        <p className="mt-3 flex items-center gap-2 text-xs text-cyan" data-testid="recommend-reason">
          <ShieldCheck size={14} aria-hidden="true" /> Recommended: {rec.tier.toUpperCase()}. {rec.reason}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Clearance tier">
          {CARDS.map((c) => (
            <button
              key={c.tier}
              type="button"
              role="radio"
              aria-checked={picked === c.tier}
              data-testid={`tier-${c.tier}`}
              onClick={() => setPicked(c.tier)}
              className={cn('rounded border p-4 text-left transition-colors', picked === c.tier ? 'border-cyan bg-cyan/10 shadow-[0_0_18px_rgba(0,229,255,0.2)]' : 'border-border bg-panel2/50 hover:border-cyan/50')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm tracking-[0.16em] text-text">{c.title}</span>
                {rec.tier === c.tier && <Badge tone="green">Recommended</Badge>}
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {c.lines.map((l) => <li key={l}>• {l}</li>)}
              </ul>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <NeonButton
            size="lg"
            data-testid="btn-confirm-tier"
            disabled={busy}
            onClick={() => {
              if (busy) return
              setBusy(true)
              onConfirm(picked)
            }}
          >
            Confirm {picked} clearance
          </NeonButton>
        </div>
      </Panel>
    </main>
  )
}

// Mission workspace placeholder with the developer-only completion shortcut.
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Cpu } from 'lucide-react'
import { isDevEnabled } from '../../app/dev'
import { DEV_DEMO_AGGREGATE } from '../../game/config'
import { useGameStore } from '../../game/store'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { useLevelContext } from './LevelGate'

export function Play() {
  const { levelId, level } = useLevelContext()
  const navigate = useNavigate()
  const { push } = useToast()
  const completeMission = useGameStore((state) => state.completeMission)
  const dev = isDevEnabled()

  const handleDevComplete = () => {
    const award = completeMission(levelId, DEV_DEMO_AGGREGATE)
    push({
      message:
        award.xpGained > 0
          ? `Mission logged: +${award.xpGained} XP.`
          : 'Mission logged: no XP improvement on this replay.',
      tone: award.xpGained > 0 ? 'success' : 'info',
    })
    navigate(`/level/${levelId}/debrief`)
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/level/${levelId}`)}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted transition-colors hover:text-cyan"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to briefing
        </button>
        <Badge tone="cyan">Level {String(levelId).padStart(2, '0')}</Badge>
      </div>

      <Panel
        eyebrow="Mission workspace"
        title={level.mission}
        action={<Badge tone="amber">Placeholder</Badge>}
        tone="cyan"
      >
        <div className="flex items-start gap-3 rounded border border-border bg-panel2/60 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan/40 bg-cyan/10 text-cyan">
            <Cpu size={14} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm text-text">Mission workspace online.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              The interactive mechanics for <span className="text-cyan">{level.title}</span> arrive in the phase
              that owns this level. No simulated controls are shown here.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton variant="ghost" onClick={() => navigate('/hub')} data-testid="btn-workspace-hub">
            Return to hub
          </NeonButton>
          {dev && (
            // DEV_ONLY: mission completion shortcut for verification.
            <NeonButton
              variant="danger"
              data-testid="btn-dev-complete"
              onClick={handleDevComplete}
              title="DEV_ONLY shortcut used for verification"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Complete mission (dev)
            </NeonButton>
          )}
        </div>
      </Panel>
    </main>
  )
}

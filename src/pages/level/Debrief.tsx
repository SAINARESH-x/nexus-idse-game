// Mission debrief: award summary, fragment recovery and rank-up notification.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Coins, Star, Trophy } from 'lucide-react'
import { FRAGMENT_TEXT } from '../../game/levels/registry'
import { useGameStore } from '../../game/store'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { Stat } from '../../ui/Stat'
import { useLevelContext } from './LevelGate'

export function Debrief() {
  const { levelId, level } = useLevelContext()
  const navigate = useNavigate()
  const lastAward = useGameStore((state) => state.lastAward)
  const award = lastAward && lastAward.levelId === levelId ? lastAward : null
  const [rankOpen, setRankOpen] = useState(Boolean(award?.rankUp))

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Panel
        eyebrow="Mission debrief"
        title={level.mission}
        action={<Badge tone="green">Mission logged</Badge>}
        tone="cyan"
      >
        {award ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="XP awarded" value={`+${award.xpGained}`} icon={<Star size={14} />} />
              <Stat
                label="Credits"
                value={`+${award.creditsGained}`}
                tone="amber"
                icon={<Coins size={14} />}
              />
              <Stat
                label="Composite"
                value={award.composite !== undefined ? Math.round(award.composite) : '—'}
                tone="green"
                icon={<Trophy size={14} />}
                hint={award.rating ? `Rating ${award.rating}` : undefined}
              />
            </div>

            {award.firstCompletion && (
              <div className="mt-5 rounded border border-magenta/40 bg-magenta/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-magenta">
                  Fragment {level.fragmentId} recovered
                </p>
                <p className="mt-2 text-sm text-muted">{FRAGMENT_TEXT[level.fragmentId]}</p>
              </div>
            )}

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {award.xpGained === 0 ? 'Replay: only improvements over your best XP are paid.' : 'New best score recorded.'}
            </p>
          </>
        ) : (
          <p className="rounded border border-border bg-panel2/60 p-4 text-sm text-muted">
            No award summary is loaded for this session. Open the mission again to record a debrief.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <NeonButton size="lg" onClick={() => navigate('/hub')} data-testid="btn-debrief-hub">
            Return to hub
            <ArrowRight size={15} aria-hidden="true" />
          </NeonButton>
          <NeonButton variant="ghost" size="lg" onClick={() => navigate(`/level/${levelId}`)}>
            Review briefing
          </NeonButton>
        </div>
      </Panel>

      <Modal
        open={rankOpen && Boolean(award?.rankUp)}
        onClose={() => setRankOpen(false)}
        title="Rank up"
        footer={
          <NeonButton onClick={() => setRankOpen(false)} data-testid="btn-rank-continue">
            Continue
          </NeonButton>
        }
      >
        {award?.rankUp && (
          <div className="text-center">
            <Trophy size={32} className="mx-auto text-amber" aria-hidden="true" />
            <p className="mt-3 text-sm text-text">
              Promoted from <span className="font-mono text-muted">{award.rankUp.from}</span> to{' '}
              <span className="font-display uppercase tracking-wider text-cyan">{award.rankUp.to}</span>.
            </p>
          </div>
        )}
      </Modal>
    </main>
  )
}

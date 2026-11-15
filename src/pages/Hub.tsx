// Campaign hub: top bar, seven-level campaign grid and the recruit archive.
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Radio } from 'lucide-react'
import { HubSidebar } from '../components/hub/HubSidebar'
import { HubTopBar } from '../components/hub/HubTopBar'
import { LevelCard } from '../components/hub/LevelCard'
import { LEVELS } from '../game/levels/registry'
import { useGameStore } from '../game/store'
import { Badge } from '../ui/Badge'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'

function NoCampaign() {
  const navigate = useNavigate()
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Panel eyebrow="Campaign hub" title="NO ACTIVE CAMPAIGN" tone="cyan" className="w-full max-w-lg">
        <p className="text-sm text-muted">
          NEXUS has no callsign bound to this device. Start a new campaign to open Level 1 and begin recovering
          the memory fragments.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton onClick={() => navigate('/new')} data-testid="hub-new-game">
            <Radio size={14} aria-hidden="true" />
            New game
          </NeonButton>
          <NeonButton variant="ghost" onClick={() => navigate('/')}>
            Return to title
          </NeonButton>
        </div>
      </Panel>
    </main>
  )
}

export function Hub() {
  const callsign = useGameStore((state) => state.profile.callsign)
  const levels = useGameStore((state) => state.levels)
  const completed = LEVELS.filter((level) => levels[level.id].completed).length
  const campaignComplete = useGameStore((state) => state.campaignComplete === true)
  const navigate = useNavigate()

  if (!callsign) return <NoCampaign />

  return (
    <main className="min-h-screen pb-16">
      <HubTopBar />
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Campaign levels">
          <Panel
            eyebrow="Campaign"
            title="SEVEN SYSTEMS"
            action={<Badge tone={completed === LEVELS.length ? 'green' : 'cyan'}>{completed}/{LEVELS.length} restored</Badge>}
          >
            <p className="text-sm text-muted">
              Each restored system unlocks the next. Side operations and bonuses are optional, but they pay.
            </p>
            {campaignComplete && (
              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-green/40 bg-green/10 px-3 py-2"
                data-testid="hub-campaign-complete"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-green">Campaign complete · NEXUS restored</span>
                <NeonButton size="sm" variant="ghost" onClick={() => navigate('/ending')} data-testid="btn-replay-finale">
                  Replay finale
                </NeonButton>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {LEVELS.map((level) => (
                <LevelCard key={level.id} level={level} progress={levels[level.id]} />
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              <ArrowRight size={12} aria-hidden="true" />
              Complete a main mission to decrypt the next level
            </p>
          </Panel>
        </section>
        <HubSidebar />
      </div>
    </main>
  )
}

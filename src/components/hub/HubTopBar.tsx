// Hub top bar: identity, rank, XP progress and credits.
import { useNavigate } from 'react-router-dom'
import { Coins, Zap } from 'lucide-react'
import { nextRank, rankForXp, rankProgress } from '../../game/progression'
import { useGameStore } from '../../game/store'
import { Badge } from '../../ui/Badge'
import { ProgressBar } from '../../ui/ProgressBar'

export function HubTopBar() {
  const navigate = useNavigate()
  const profile = useGameStore((state) => state.profile)
  const rank = rankForXp(profile.xp)
  const next = nextRank(profile.xp)
  const progress = rankProgress(profile.xp)
  const xpMax = next ? next.minXp : rank.minXp

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded font-display text-lg uppercase tracking-[0.24em] text-text transition-colors hover:text-cyan"
          aria-label="Return to title screen"
        >
          NEXUS
        </button>

        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">Callsign</p>
          <p className="truncate font-display text-sm uppercase tracking-[0.14em] text-text" data-testid="hub-callsign">
            {profile.callsign}
          </p>
        </div>

        <Badge tone="cyan" data-testid="hub-rank">
          {rank.name}
        </Badge>

        <div className="min-w-[200px] flex-1">
          <ProgressBar
            value={profile.xp}
            max={Math.max(xpMax, 1)}
            label={next ? `${rank.name} → ${next.name}` : `${rank.name} · max rank`}
            showValue={false}
          />
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span data-testid="hub-xp">
              XP {profile.xp} / {next ? next.minXp : rank.minXp}
            </span>
            <span>{next ? `${progress.toNext} to next rank` : 'MAX RANK'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-xs text-amber" data-testid="hub-credits">
            <Coins size={14} aria-hidden="true" />
            {profile.credits}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-cyan">
            <Zap size={14} aria-hidden="true" />
            {profile.xp}
          </span>
        </div>
      </div>
    </header>
  )
}

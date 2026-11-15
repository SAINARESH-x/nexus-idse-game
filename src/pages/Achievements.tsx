// Achievements page: earned and locked cards with registry-derived progress; secret ones stay ??? until earned.
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, Lock, Sparkles } from 'lucide-react'
import { achievementContext, achievementsFor } from '../game/achievements'
import { LEVELS } from '../game/levels/registry'
import { createDefaultSaveData, useGameStore } from '../game/store'
import type { SaveData } from '../game/types'
import { Badge } from '../ui/Badge'
import { Panel } from '../ui/Panel'
import { ProgressBar } from '../ui/ProgressBar'
import { cn } from '../ui/cn'

export function Achievements() {
  const navigate = useNavigate()
  const state = useGameStore()
  const save: SaveData = {
    ...createDefaultSaveData(),
    profile: state.profile,
    levels: state.levels,
    achievements: state.achievements,
    fragments: state.fragments,
    adaptive: state.adaptive,
    campaignComplete: state.campaignComplete,
    owned: state.owned,
  }
  const catalogue = achievementsFor(LEVELS)
  const ctx = achievementContext(save, LEVELS)
  const earned = new Set(state.achievements)
  const count = catalogue.filter((item) => earned.has(item.id)).length

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <button
        type="button"
        onClick={() => navigate(state.profile.callsign ? '/hub' : '/')}
        className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted hover:text-cyan"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Back
      </button>
      <Panel
        eyebrow="Records"
        title="ACHIEVEMENTS"
        tone="cyan"
        action={<Badge tone={count === catalogue.length ? 'green' : 'cyan'}>{count}/{catalogue.length} unlocked</Badge>}
      >
        {catalogue.length === 0 ? (
          <p className="text-sm text-muted">No achievements are defined.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Achievement list">
            {catalogue.map((item) => {
              const isEarned = earned.has(item.id)
              const hidden = item.secret && !isEarned
              const progress = !isEarned && !hidden && item.progress ? item.progress(ctx) : null
              return (
                <li
                  key={item.id}
                  data-testid={`achievement-${item.id}`}
                  className={cn(
                    'rounded border p-3',
                    isEarned ? 'border-green/40 bg-green/[0.05]' : 'border-border bg-panel2/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('mt-0.5', isEarned ? 'text-green' : 'text-muted')}>
                      {isEarned ? <Award size={16} aria-hidden="true" /> : hidden ? <Sparkles size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                    </span>
                    <Badge tone={isEarned ? 'green' : hidden ? 'magenta' : 'muted'}>
                      {isEarned ? 'Unlocked' : hidden ? 'Secret' : 'Locked'}
                    </Badge>
                  </div>
                  <p className="mt-2 font-display text-xs uppercase tracking-[0.14em] text-text">{hidden ? '???' : item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {hidden ? 'A secret achievement. Keep exploring.' : item.description}
                  </p>
                  {progress && progress.target > 0 && (
                    <div className="mt-2">
                      <ProgressBar value={Math.min(1, progress.current / progress.target) * 100} label={`${progress.label} ${progress.current} of ${progress.target}`} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </main>
  )
}

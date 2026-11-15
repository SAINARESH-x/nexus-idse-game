// HubSidebar: recruit summary, fragment archive, achievements and Tool Bay panels.
import { useNavigate } from 'react-router-dom'
import { Award, Coins, Lock, Settings as SettingsIcon, User, Wrench, Zap } from 'lucide-react'
import { achievementsFor } from '../../game/achievements'
import { TOOL_BAY_ITEMS } from '../../game/toolbay'
import { FRAGMENT_TEXT, LEVELS } from '../../game/levels/registry'
import { rankForXp } from '../../game/progression'
import { useGameStore } from '../../game/store'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { Stat } from '../../ui/Stat'
import { cn } from '../../ui/cn'

function ProfileSummary() {
  const profile = useGameStore((state) => state.profile)
  const levels = useGameStore((state) => state.levels)
  const fragments = useGameStore((state) => state.fragments)
  const rank = rankForXp(profile.xp)
  const completed = LEVELS.filter((level) => levels[level.id].completed).length

  return (
    <Panel eyebrow="Recruit" title={profile.callsign} action={<Badge tone="cyan">{rank.name}</Badge>}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total XP" value={profile.xp} icon={<Zap size={13} />} />
        <Stat label="Credits" value={profile.credits} tone="amber" icon={<Coins size={13} />} />
        <Stat label="Missions" value={`${completed}/${LEVELS.length}`} tone="green" icon={<Award size={13} />} />
        <Stat label="Fragments" value={`${fragments.length}/${LEVELS.length}`} icon={<User size={13} />} />
      </div>
    </Panel>
  )
}

function FragmentArchive() {
  const fragments = useGameStore((state) => state.fragments)

  return (
    <Panel
      eyebrow="Memory"
      title="Story fragments"
      action={<Badge tone="magenta">{fragments.length}/{LEVELS.length}</Badge>}
      data-testid="fragment-archive"
    >
      <ul className="space-y-2">
        {LEVELS.map((level) => {
          const recovered = fragments.includes(level.fragmentId)
          return (
            <li
              key={level.fragmentId}
              data-testid={`fragment-${level.fragmentId}`}
              className={cn(
                'rounded border p-2.5',
                recovered ? 'border-magenta/40 bg-magenta/[0.06]' : 'border-border bg-panel2/50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'font-mono text-[10px] uppercase tracking-[0.24em]',
                    recovered ? 'text-magenta' : 'text-muted',
                  )}
                >
                  Fragment {level.fragmentId}
                </span>
                {recovered ? (
                  <Badge tone="magenta">Recovered</Badge>
                ) : (
                  <Badge tone="muted">
                    <Lock size={9} aria-hidden="true" />
                    Locked
                  </Badge>
                )}
              </div>
              <p
                className={cn(
                  'mt-1.5',
                  recovered
                    ? 'text-xs text-muted'
                    : 'font-mono text-[10px] uppercase tracking-[0.3em] text-muted/50',
                )}
              >
                {recovered ? FRAGMENT_TEXT[level.fragmentId] : 'ENCRYPTED'}
              </p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function AchievementsPanel() {
  const navigate = useNavigate()
  const earned = useGameStore((state) => state.achievements.length)
  const total = achievementsFor(LEVELS).length
  return (
    <Panel eyebrow="Records" title="Achievements" action={<Badge tone="cyan">{earned}/{total}</Badge>} data-testid="achievements-panel">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-cyan/40 bg-cyan/10 text-cyan">
          <Award size={15} aria-hidden="true" />
        </span>
        <p className="text-xs text-muted">Milestones for missions, side operations, bonuses and secrets across the campaign.</p>
      </div>
      <NeonButton size="sm" variant="ghost" fullWidth className="mt-3" data-testid="achievements-panel-button" onClick={() => navigate('/achievements')}>
        View achievements
      </NeonButton>
    </Panel>
  )
}

function ToolBayPanel() {
  const navigate = useNavigate()
  const owned = useGameStore((state) => (state.owned ?? []).length)
  return (
    <Panel eyebrow="Equipment" title="Tool Bay" action={<Badge tone="amber">{owned}/{TOOL_BAY_ITEMS.length} owned</Badge>} data-testid="toolbay-panel">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-amber/40 bg-amber/10 text-amber">
          <Wrench size={15} aria-hidden="true" />
        </span>
        <p className="text-xs text-muted">Spend mission credits on accent themes for the whole interface.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NeonButton size="sm" variant="ghost" data-testid="toolbay-panel-button" onClick={() => navigate('/toolbay')}>
          Open Tool Bay
        </NeonButton>
        <NeonButton size="sm" variant="ghost" data-testid="settings-link" onClick={() => navigate('/settings')}>
          <SettingsIcon size={12} aria-hidden="true" />
          Settings
        </NeonButton>
      </div>
    </Panel>
  )
}

export function HubSidebar() {
  return (
    <aside className="space-y-5" aria-label="Recruit archive">
      <ProfileSummary />
      <FragmentArchive />
      <AchievementsPanel />
      <ToolBayPanel />
    </aside>
  )
}

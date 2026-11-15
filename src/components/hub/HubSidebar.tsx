// HubSidebar: recruit summary, fragment archive and locked feature placeholders.
import { Award, Coins, Lock, User, Wrench, Zap } from 'lucide-react'
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
        <Stat label="Missions" value={`${completed}/7`} tone="green" icon={<Award size={13} />} />
        <Stat label="Fragments" value={`${fragments.length}/7`} icon={<User size={13} />} />
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
      action={<Badge tone="magenta">{fragments.length}/7</Badge>}
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

function PlaceholderPanel({
  eyebrow,
  title,
  body,
  action,
  icon,
  testId,
  buttonLabel,
}: {
  eyebrow: string
  title: string
  body: string
  action: string
  icon: 'award' | 'wrench'
  testId: string
  buttonLabel: string
}) {
  const Icon = icon === 'award' ? Award : Wrench
  return (
    <Panel
      eyebrow={eyebrow}
      title={title}
      action={<Badge tone="muted">Soon</Badge>}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-panel2 text-muted">
          <Icon size={15} aria-hidden="true" />
        </span>
        <p className="text-xs text-muted">{body}</p>
      </div>
      <NeonButton
        size="sm"
        variant="ghost"
        fullWidth
        disabled
        tooltip={action}
        className="mt-3"
        data-testid={`${testId}-button`}
      >
        <Lock size={12} aria-hidden="true" />
        {buttonLabel}
      </NeonButton>
    </Panel>
  )
}

export function HubSidebar() {
  return (
    <aside className="space-y-5" aria-label="Recruit archive">
      <ProfileSummary />
      <FragmentArchive />
      <PlaceholderPanel
        eyebrow="Records"
        title="Achievements"
        body="The achievement grid is sealed until the records phase. Completed missions still count toward it."
        action="Achievements arrive in a later phase"
        icon="award"
        testId="achievements-panel"
        buttonLabel="View achievements"
      />
      <PlaceholderPanel
        eyebrow="Equipment"
        title="Tool Bay"
        body="Purchased upgrades and analysis tools will live here once the Tool Bay is unlocked."
        action="Tool Bay unlocks in a later phase"
        icon="wrench"
        testId="toolbay-panel"
        buttonLabel="Open Tool Bay"
      />
    </aside>
  )
}

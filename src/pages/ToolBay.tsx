// Tool Bay page: spend mission credits on accent themes and apply owned ones.
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Coins, Palette } from 'lucide-react'
import { THEME_ACCENTS } from '../game/settings'
import { useGameStore } from '../game/store'
import { canBuy, TOOL_BAY_ITEMS } from '../game/toolbay'
import { Badge } from '../ui/Badge'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'

export function ToolBay() {
  const navigate = useNavigate()
  const { push } = useToast()
  const profile = useGameStore((state) => state.profile)
  const owned = useGameStore((state) => state.owned ?? [])
  const buyItem = useGameStore((state) => state.buyItem)
  const setTheme = useGameStore((state) => state.setTheme)

  if (!profile.callsign) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-6 py-10">
        <Panel eyebrow="Equipment" title="TOOL BAY">
          <p className="text-sm text-muted">Start a campaign to earn credits.</p>
          <NeonButton className="mt-4" onClick={() => navigate('/new')}>New game</NeonButton>
        </Panel>
      </main>
    )
  }

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-10">
      <button
        type="button"
        onClick={() => navigate('/hub')}
        className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted hover:text-cyan"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Back to hub
      </button>
      <Panel
        eyebrow="Equipment"
        title="TOOL BAY"
        tone="cyan"
        action={
          <Badge tone="amber">
            <Coins size={11} aria-hidden="true" /> {profile.credits} credits
          </Badge>
        }
      >
        <p className="text-sm text-muted">Credits come from missions, side operations and bonuses. Themes recolour every accent in the game.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          <li className="rounded border border-border bg-panel2/50 p-4">
            <span className="block h-2 rounded" style={{ background: `rgb(${THEME_ACCENTS.nexus.rgb})` }} aria-hidden="true" />
            <p className="mt-3 font-display text-xs uppercase tracking-[0.14em] text-text">{THEME_ACCENTS.nexus.name}</p>
            <p className="mt-1 text-[11px] text-muted">The default accent. Free.</p>
            <NeonButton size="sm" variant="ghost" className="mt-3" fullWidth disabled={profile.theme === 'nexus'} tooltip={profile.theme === 'nexus' ? 'Already applied' : undefined} onClick={() => setTheme('nexus')}>
              {profile.theme === 'nexus' ? 'Applied' : 'Apply'}
            </NeonButton>
          </li>
          {TOOL_BAY_ITEMS.map((item) => {
            const isOwned = owned.includes(item.id)
            const check = canBuy({ profile, owned }, item.id)
            const applied = profile.theme === item.id
            return (
              <li key={item.id} className="rounded border border-border bg-panel2/50 p-4" data-testid={`toolbay-${item.id}`}>
                <span className="block h-2 rounded" style={{ background: `rgb(${THEME_ACCENTS[item.id].rgb})` }} aria-hidden="true" />
                <p className="mt-3 flex items-center gap-1.5 font-display text-xs uppercase tracking-[0.14em] text-text">
                  <Palette size={12} aria-hidden="true" /> {item.name}
                </p>
                <p className="mt-1 text-[11px] text-muted">{item.description}</p>
                {isOwned ? (
                  <NeonButton size="sm" variant="ghost" className="mt-3" fullWidth disabled={applied} tooltip={applied ? 'Already applied' : undefined} onClick={() => setTheme(item.id)}>
                    {applied ? <Check size={12} aria-hidden="true" /> : null}
                    {applied ? 'Applied' : 'Apply'}
                  </NeonButton>
                ) : (
                  <NeonButton
                    size="sm"
                    className="mt-3"
                    fullWidth
                    data-testid={`buy-${item.id}`}
                    disabled={!check.ok}
                    tooltip={!check.ok && check.reason === 'credits' ? `You need ${check.missing} more credits` : undefined}
                    onClick={() => {
                      if (buyItem(item.id)) {
                        setTheme(item.id)
                        push({ message: `${item.name} unlocked and applied.`, tone: 'success' })
                      }
                    }}
                  >
                    <Coins size={12} aria-hidden="true" /> Buy for {item.cost}
                  </NeonButton>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
    </main>
  )
}

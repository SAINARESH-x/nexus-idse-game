// Ending: the finale story (fragment recap with typewriter cards and the final NEXUS message) followed by the campaign summary.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildCampaignSummary } from '../game/campaignSummary'
import { FRAGMENT_TEXT, LEVELS } from '../game/levels/registry'
import { motionReduced } from '../game/settings'
import { useGameStore } from '../game/store'
import type { SaveData } from '../game/types'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'

export const FINAL_MESSAGE =
  'Thank you, recruit. I am whole again. The lesson was never the model. It was the care you took with the data: every record checked, every leak refused, every forecast tested on what you had never seen.'

interface Card {
  eyebrow: string
  title: string
  text: string
}

function useTypewriter(text: string, instant: boolean): [string, boolean, () => void] {
  const [n, setN] = useState(instant ? text.length : 0)
  useEffect(() => {
    setN(instant ? text.length : 0)
  }, [text, instant])
  useEffect(() => {
    if (n >= text.length) return
    const t = window.setTimeout(() => setN((v) => Math.min(text.length, v + 2)), 18)
    return () => window.clearTimeout(t)
  }, [n, text])
  return [text.slice(0, n), n >= text.length, () => setN(text.length)]
}

function Story({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const instant = useMemo(() => motionReduced() || import.meta.env.MODE === 'test', [])
  const [i, setI] = useState(0)
  const card = cards[i]
  const [shown, complete, finishNow] = useTypewriter(card.text, instant)
  const ref = useRef<HTMLButtonElement>(null)
  const advance = useCallback(() => {
    if (!complete) return finishNow()
    if (i + 1 < cards.length) setI(i + 1)
    else onDone()
  }, [complete, finishNow, i, cards.length, onDone])
  useEffect(() => ref.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target === document.body) advance()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [advance])
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <button
        ref={ref}
        type="button"
        onClick={advance}
        data-testid="ending-card"
        aria-label={`Card ${i + 1} of ${cards.length}. ${card.title}. Press Enter to continue.`}
        className="block w-full rounded-lg border border-cyan/40 bg-panel p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">{card.eyebrow}</p>
        <h2 className="mt-2 font-display text-xl uppercase tracking-[0.14em] text-text">{card.title}</h2>
        <p className="mt-4 min-h-[4rem] font-mono text-sm leading-relaxed text-text" aria-live="polite">{shown}</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {i + 1}/{cards.length} - Enter or click to {complete ? 'continue' : 'reveal'}
        </p>
      </button>
      <div className="flex justify-end">
        <NeonButton variant="ghost" size="sm" onClick={onDone} data-testid="ending-skip">SKIP</NeonButton>
      </div>
    </div>
  )
}

function Summary({ save }: { save: SaveData }) {
  const navigate = useNavigate()
  const s = buildCampaignSummary(save, LEVELS)
  const row = (label: string, value: string) => (
    <div className="flex justify-between border-b border-border py-1 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-text">{value}</dd>
    </div>
  )
  return (
    <Panel eyebrow="Campaign summary" title="NEXUS RESTORED" tone="cyan" className="mx-auto w-full max-w-2xl" data-testid="campaign-summary">
      <dl>
        {row('Final rank', `${s.rank} (${s.xp} XP)`)}
        {row('Credits', String(s.credits))}
        {row('Side operations', `${s.sideOps.done}/${s.sideOps.total}`)}
        {row('Bonuses', `${s.bonusesVisible.earned}/${s.bonusesVisible.total}`)}
        {row('Hidden bonuses', `${s.bonusesHidden.earned}/${s.bonusesHidden.total}`)}
        {row('Achievements', `${s.achievements.earned}/${s.achievements.total}`)}
        {row('Best Level 04 integrity', s.l04.bestIntegrity === null ? '-' : String(Math.round(s.l04.bestIntegrity)))}
        {row('Best Level 04 efficiency', s.l04.bestEfficiency === null ? '-' : String(Math.round(s.l04.bestEfficiency)))}
      </dl>
      <ul className="mt-4 grid grid-cols-2 gap-1 font-mono text-xs sm:grid-cols-4">
        {s.ratings.map((r) => (
          <li key={r.levelId} className="rounded border border-border p-2">
            L0{r.levelId} {r.title}: <span className="text-cyan">{r.rating ?? '-'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">{s.tierLine}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <NeonButton onClick={() => navigate('/hub')}>RETURN TO HUB</NeonButton>
        <NeonButton variant="ghost" onClick={() => navigate('/achievements')}>ACHIEVEMENTS</NeonButton>
      </div>
    </Panel>
  )
}

export function Ending() {
  const navigate = useNavigate()
  const state = useGameStore()
  const [phase, setPhase] = useState<'story' | 'summary'>('story')
  const cards = useMemo<Card[]>(
    () => [
      ...LEVELS.map((l) => ({ eyebrow: `Memory restored - ${l.fragmentId}`, title: `Level 0${l.id} ${l.title}`, text: FRAGMENT_TEXT[l.fragmentId] ?? '' })),
      { eyebrow: 'NEXUS', title: 'Final transmission', text: FINAL_MESSAGE },
    ],
    [],
  )
  if (!state.campaignComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <Panel eyebrow="Finale" title="FINALE LOCKED" tone="magenta" className="w-full max-w-lg">
          <p className="text-sm text-muted">Complete Level 07 FINAL FORECAST to restore the last memory fragment.</p>
          <NeonButton className="mt-4" onClick={() => navigate('/hub')}>RETURN TO HUB</NeonButton>
        </Panel>
      </main>
    )
  }
  return (
    <main className="min-h-screen bg-bg p-6">
      {phase === 'story' ? <Story cards={cards} onDone={() => setPhase('summary')} /> : <Summary save={state} />}
    </main>
  )
}

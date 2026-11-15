// Level 04 debrief: full audit report rebuilt from the finished session (survives F5); side ops use the shared debrief.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coins, Download, Star } from 'lucide-react'
import { generateStudents } from '../../engine'
import { FRAGMENT_TEXT, levelDefinition } from '../../game/levels/registry'
import { motionReduced } from '../../game/settings'
import { useGameStore } from '../../game/store'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { Stat } from '../../ui/Stat'
import { DebriefScreen } from '../../shell/DebriefScreen'
import { useMissionSessionStore } from '../../shell/missionSession'
import { toCsv } from './debriefModel'
import { BeforeAfter, DecisionsList, GhostsPanel, MetricBars, WhatYouMissed, WhyItMattersPanel } from './DebriefSections'
import { loadRecord } from './missionRecord'
import { normaliseFlags } from './flagScoring'

const instant = () => import.meta.env.MODE === 'test' || motionReduced()

function Gauge({ label, value, testId }: { label: string; value: number; testId: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      <svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label={`${label} ${Math.round(v)} of 100`}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="#1E2A4A" strokeWidth="9" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={v >= 85 ? '#3DFF9A' : v >= 60 ? '#FFB020' : '#FF4D6D'} strokeWidth="9" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 55 55)" strokeLinecap="round" />
        <text x="55" y="61" textAnchor="middle" className="fill-text font-display" fontSize="22">{Math.round(v)}</text>
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
    </div>
  )
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(instant() ? value : 0)
  useEffect(() => {
    if (instant()) return setN(value)
    const start = performance.now()
    let f = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 750)
      setN(Math.round(value * p))
      if (p < 1) f = requestAnimationFrame(tick)
    }
    f = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(f)
  }, [value])
  return <span>+{n}</span>
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(instant() ? text.length : 0)
  useEffect(() => {
    if (instant()) return setN(text.length)
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 28)
    return () => clearInterval(id)
  }, [text])
  return <p className="font-mono text-sm text-cyan" data-testid="fragment-text">{text.slice(0, n)}<span className="sr-only">{text}</span></p>
}

function SideOpDebrief({ sideOpId }: { sideOpId: string }) {
  const summary = useMissionSessionStore((s) => s.summary)
  const lastAward = useGameStore((s) => s.lastAward)
  const run = summary && summary.levelId === 4 && summary.kind === 'side' && summary.sideOpId === sideOpId ? summary : null
  return <DebriefScreen levelId={4} level={levelDefinition(4)} award={run && lastAward?.levelId === 4 ? lastAward : null} run={run} sideOpId={sideOpId} />
}

export function L04Debrief({ sideOpId }: { sideOpId: string | null }) {
  if (sideOpId) return <SideOpDebrief sideOpId={sideOpId} />
  return <MainDebrief />
}

function MainDebrief() {
  const navigate = useNavigate()
  const levels = useGameStore((s) => s.levels)
  const loaded = useMemo(() => {
    const r = loadRecord()
    if (r.kind !== 'ok' || r.record.status !== 'finished' || !r.record.report) return null
    return { record: r.record, session: r.session, gen: generateStudents({ seed: r.record.seed, tier: r.record.tier }) }
  }, [])
  const [rankOpen, setRankOpen] = useState(true)

  if (!loaded) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Panel eyebrow="Debrief" title="NO AUDIT ON FILE">
          <p className="text-sm text-muted">There is no finished Level 04 audit to show. Start or continue the mission from the briefing.</p>
          <div className="mt-4 flex gap-3">
            <NeonButton onClick={() => navigate('/level/4')}>Back to briefing</NeonButton>
            <NeonButton variant="ghost" onClick={() => navigate('/hub')}>Hub</NeonButton>
          </div>
        </Panel>
      </main>
    )
  }
  const { record, session, gen } = loaded
  const rep = record.report as NonNullable<typeof record.report>
  const q = rep.quality
  const award = rep.award
  const level = levelDefinition(4)
  const progress = levels[4]
  const next = levels[5]
  const badKept = Number(rep.facts.badKept) || 0
  const redundant = session.history.filter((e) => e.decision?.redundant).length
  const flags = normaliseFlags(record.flags, gen.issues, gen.dirty)
  const exportCsv = () => {
    try {
      const url = URL.createObjectURL(new Blob([toCsv(session.current)], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus-vault-${record.tier}-${record.seed}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // Blob downloads unavailable: nothing to do.
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6" data-testid="l04-debrief">
      <Panel eyebrow="Level 04 · DATA VAULT · Audit" title="THE PURGE: DEBRIEF" tone="cyan">
        <div className="flex flex-wrap items-center gap-6">
          <Gauge label="Integrity" value={q.integrity} testId="gauge-integrity" />
          <Gauge label="Efficiency" value={q.efficiency} testId="gauge-efficiency" />
          <div className="text-center">
            <p className="font-display text-5xl text-cyan" data-testid="debrief-rating">{rep.rating}</p>
            <p className="font-mono text-[10px] uppercase text-muted">Rating · composite {Math.round(rep.composite)}</p>
          </div>
          <Badge tone="violet">{record.tier}</Badge>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <Stat label="XP awarded" value={<CountUp value={award?.xpGained ?? 0} />} icon={<Star size={14} />} />
            <Stat label="Credits" value={<CountUp value={award?.creditsGained ?? 0} />} icon={<Coins size={14} />} tone="amber" />
          </div>
        </div>
        {award && award.xpGained === 0 && <p className="mt-3 text-xs text-muted">Replays pay only the improvement over your best run, so no new XP this time.</p>}
        <p className="mt-2 text-xs text-muted">{q.counts.before} rows in, {q.counts.after} rows out · {session.history.length} operation(s) against a par of {String(rep.facts.par)} · {String(rep.facts.adaptiveAssistUsed) === 'true' ? 'adaptive assist used (one free Analyst Scan)' : 'no adaptive assist'}</p>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricBars q={q} opsCount={session.history.length} badKept={badKept} redundant={redundant} />
        <BeforeAfter before={session.original} after={session.current} />
        <DecisionsList decisions={session.decisions} picks={record.puzzlePicks} />
        <WhatYouMissed q={q} />
        <WhyItMattersPanel dirty={gen.dirty} tier={record.tier} />
        <GhostsPanel dirty={gen.dirty} ghosts={gen.ghosts} flags={flags} hiddenEarned={progress.bonusesEarned.includes('l4-bonus-hidden')} />
      </div>
      <Panel eyebrow="Rewards and next steps" title="Memory fragment F4">
        <Typewriter text={FRAGMENT_TEXT[level.fragmentId]} />
        <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2" data-testid="debrief-rewards">
          {level.bonuses.map((b) => {
            const got = progress.bonusesEarned.includes(b.id)
            const now = rep.bonuses.find((x) => x.id === b.id)
            return <li key={b.id} className={got ? 'text-green' : 'text-muted'}>{got ? '✓' : '○'} Bonus {b.hidden && !got ? '???' : b.title}{now ? ` (+${now.xpGained} XP this run)` : ''}</li>
          })}
          {level.sideOps.map((s) => <li key={s.id} className={progress.sideOpsDone.includes(s.id) ? 'text-green' : 'text-muted'}>{progress.sideOpsDone.includes(s.id) ? '✓' : '○'} Side op {s.title}</li>)}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton onClick={() => navigate('/level/4?tab=side')} data-testid="btn-debrief-side-ops">Side operations</NeonButton>
          <NeonButton variant="ghost" onClick={() => navigate('/level/4/play')} data-testid="btn-debrief-replay">Replay</NeonButton>
          {next.unlocked && <NeonButton variant="ghost" onClick={() => navigate('/level/5')} data-testid="btn-debrief-next">Next level</NeonButton>}
          <NeonButton variant="ghost" onClick={exportCsv} data-testid="btn-export-csv"><Download size={13} aria-hidden="true" /> Export cleaned data</NeonButton>
          <NeonButton variant="ghost" onClick={() => navigate('/hub')} data-testid="btn-debrief-hub">Hub</NeonButton>
        </div>
      </Panel>
      {award?.rankUp && (
        <Modal open={rankOpen} onClose={() => setRankOpen(false)} title="Rank up" footer={<NeonButton onClick={() => setRankOpen(false)}>Continue</NeonButton>}>
          <p>Promoted from {award.rankUp.from} to <span className="text-cyan">{award.rankUp.to}</span>.</p>
        </Modal>
      )}
    </main>
  )
}

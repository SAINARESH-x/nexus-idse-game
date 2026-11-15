// DebriefScreen: rating, score breakdown, decisions, XP count-up, fragment and exits.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  MinusCircle,
  RotateCcw,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { AwardSummary } from '../game/progression'
import { hintFactor } from '../game/progression'
import { FRAGMENT_TEXT } from '../game/levels/registry'
import { useGameStore } from '../game/store'
import type { Decision, LevelDefinition, LevelId } from '../game/types'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'
import { ProgressBar } from '../ui/ProgressBar'
import { Stat } from '../ui/Stat'
import { cn } from '../ui/cn'
import type { MissionRunSummary } from './missionSession'

export interface DebriefScreenProps {
  levelId: LevelId
  level: LevelDefinition
  award: AwardSummary | null
  run: MissionRunSummary | null
  sideOpId?: string | null
}

const instantMotion = () =>
  import.meta.env.MODE === 'test' ||
  (typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)

function CountUp({ value, prefix = '+' }: { value: number; prefix?: string }) {
  const [instant] = useState(instantMotion)
  const [display, setDisplay] = useState(instant ? value : 0)

  useEffect(() => {
    if (instant) {
      setDisplay(value)
      return
    }
    const duration = 750
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setDisplay(value * progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [instant, value])

  return (
    <span>
      {prefix}
      {Math.round(display)}
    </span>
  )
}

function Typewriter({ text }: { text: string }) {
  const [instant] = useState(instantMotion)
  const [count, setCount] = useState(instant ? text.length : 0)

  useEffect(() => {
    if (instant) {
      setCount(text.length)
      return
    }
    const timer = setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 24)
    return () => clearInterval(timer)
  }, [instant, text])

  return (
    <span aria-label={text}>
      {text.slice(0, count)}
      {!instant && count < text.length && <span className="nx-caret text-cyan">▌</span>}
    </span>
  )
}

function DecisionRow({ decision }: { decision: Decision }) {
  const Icon = decision.good === true ? CheckCircle2 : decision.good === false ? XCircle : MinusCircle
  const tone = decision.good === true ? 'text-green' : decision.good === false ? 'text-red' : 'text-muted'
  return (
    <li className="flex items-start gap-2 rounded border border-border bg-panel2/50 p-2.5">
      <Icon size={14} className={cn('mt-0.5 shrink-0', tone)} aria-hidden="true" />
      <div>
        <p className="text-xs text-text">{decision.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{decision.explanation}</p>
      </div>
    </li>
  )
}

export function DebriefScreen({ levelId, level, award, run, sideOpId }: DebriefScreenProps) {
  const navigate = useNavigate()
  const levels = useGameStore((state) => state.levels)
  const [rankOpen, setRankOpen] = useState(Boolean(award?.rankUp))
  const nextLevel = levelId < 7 ? levels[(levelId + 1) as LevelId] : null
  const isSide = Boolean(sideOpId)
  const sideOp = sideOpId ? level.sideOps.find((item) => item.id === sideOpId) : undefined

  const title = isSide ? sideOp?.title ?? 'Side operation' : level.mission
  const fragment = award?.firstCompletion && !isSide ? FRAGMENT_TEXT[level.fragmentId] : null
  const decisions = run?.decisions ?? []

  const breakdown = run
    ? [
        { label: 'Accuracy', value: Math.round(run.aggregate.accuracy * 100), tone: 'green' as const },
        { label: 'Decision quality', value: Math.round(run.aggregate.decisionQuality * 100), tone: 'cyan' as const },
        { label: 'Efficiency', value: Math.round(run.aggregate.efficiency * 100), tone: 'amber' as const },
        { label: 'Hint use', value: Math.round(hintFactor(run.hintsUsed) * 100), tone: 'magenta' as const },
      ]
    : []

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Panel
        eyebrow={isSide ? `Side operation · ${sideOp?.title ?? ''}` : 'Mission debrief'}
        title={title}
        action={<Badge tone="green">{isSide ? 'Side op logged' : 'Mission logged'}</Badge>}
        tone="cyan"
      >
        {award ? (
          <>
            <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded border border-border bg-panel2/60 p-4">
                {isSide ? (
                  <>
                    <Star size={28} className="text-cyan" aria-hidden="true" />
                    <p className="mt-2 font-display text-3xl font-semibold text-cyan">{award.xpGained}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">XP earned</p>
                  </>
                ) : (
                  <>
                    <p className="nx-rating-pop font-display text-7xl font-extrabold leading-none text-cyan">
                      {award.rating ?? '—'}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      Rating · composite {award.composite !== undefined ? Math.round(award.composite) : '—'}
                    </p>
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="XP awarded" value={<CountUp value={award.xpGained} />} icon={<Star size={14} />} />
                <Stat
                  label="Credits"
                  value={<CountUp value={award.creditsGained} />}
                  tone="amber"
                  icon={<Coins size={14} />}
                />
                <Stat
                  label={isSide ? 'Side op' : 'Composite'}
                  value={
                    isSide
                      ? award.xpGained > 0
                        ? 'Recorded'
                        : 'Replay'
                      : award.composite !== undefined
                        ? Math.round(award.composite)
                        : '—'
                  }
                  tone="green"
                  icon={<Trophy size={14} />}
                  hint={award.rating ? `Rating ${award.rating}` : undefined}
                />
              </div>
            </div>

            {breakdown.length > 0 && (
              <section aria-label="Composite breakdown" className="mt-5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">Composite breakdown</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {breakdown.map((item) => (
                    <ProgressBar key={item.label} value={item.value} label={item.label} tone={item.tone} />
                  ))}
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Hints used: {run?.hintsUsed ?? 0} · Mistakes: {run?.mistakes ?? 0}
                </p>
              </section>
            )}

            {run && run.bonuses.length > 0 && (
              <section aria-label="Bonus objectives earned" className="mt-5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-magenta">Bonus objectives</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {run.bonuses.map((bonus) => (
                    <li
                      key={bonus.id}
                      className="rounded border border-magenta/40 bg-magenta/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-magenta"
                    >
                      {bonus.title} · +{bonus.xpGained} XP
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {run ? (
              <section aria-label="Decisions and consequences" className="mt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">Decisions and consequences</h3>
                {decisions.length > 0 ? (
                  <ul className="mt-2 max-h-64 space-y-2 overflow-auto pr-1">
                    {decisions.map((decision, index) => (
                      <DecisionRow key={`${decision.label}-${index}`} decision={decision} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded border border-border bg-panel2/60 p-3 text-xs text-muted">
                    No individual decisions were recorded for this run.
                  </p>
                )}
              </section>
            ) : (
              <p className="mt-5 rounded border border-border bg-panel2/60 p-3 text-xs text-muted">
                Detailed breakdown is available when a mission is completed through the workspace. This award came from
                a developer shortcut.
              </p>
            )}

            {fragment && (
              <div className="mt-6 rounded border border-magenta/40 bg-magenta/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-magenta">
                  Fragment {level.fragmentId} recovered
                </p>
                <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-muted">
                  <Typewriter text={fragment} />
                </p>
              </div>
            )}

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {award.xpGained === 0
                ? 'Replay: only improvements over your best XP are paid.'
                : 'New best score recorded.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {isSide ? (
                <>
                  <NeonButton
                    onClick={() => navigate(`/level/${levelId}/play?side=${encodeURIComponent(sideOpId ?? '')}`)}
                    data-testid="btn-debrief-replay"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Retry side op
                  </NeonButton>
                  <NeonButton variant="ghost" onClick={() => navigate(`/level/${levelId}?tab=side`)} data-testid="btn-debrief-side-ops">
                    Side operations
                  </NeonButton>
                </>
              ) : (
                <>
                  <NeonButton onClick={() => navigate(`/level/${levelId}?tab=side`)} data-testid="btn-debrief-side-ops">
                    Side operations
                  </NeonButton>
                  <NeonButton variant="ghost" onClick={() => navigate(`/level/${levelId}/play`)} data-testid="btn-debrief-replay">
                    <RotateCcw size={14} aria-hidden="true" />
                    Replay mission
                  </NeonButton>
                  {nextLevel?.unlocked && (
                    <NeonButton variant="ghost" onClick={() => navigate(`/level/${levelId + 1}`)} data-testid="btn-debrief-next">
                      Next level
                      <ArrowRight size={14} aria-hidden="true" />
                    </NeonButton>
                  )}
                </>
              )}
              <NeonButton variant="ghost" onClick={() => navigate('/hub')} data-testid="btn-debrief-hub">
                Return to hub
                <ArrowRight size={14} aria-hidden="true" />
              </NeonButton>
            </div>
          </>
        ) : (
          <>
            <p className="rounded border border-border bg-panel2/60 p-4 text-sm text-muted">
              No award summary is loaded for this session. Open the mission again to record a debrief.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <NeonButton onClick={() => navigate(isSide && sideOpId ? `/level/${levelId}/play?side=${sideOpId}` : `/level/${levelId}/play`)}>
                Replay
              </NeonButton>
              <NeonButton variant="ghost" onClick={() => navigate('/hub')} data-testid="btn-debrief-hub">
                Return to hub
                <ArrowRight size={14} aria-hidden="true" />
              </NeonButton>
            </div>
          </>
        )}
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

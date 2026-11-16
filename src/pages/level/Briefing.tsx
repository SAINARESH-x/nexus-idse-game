// Level briefing: BRIEFING | SIDE OPS | BONUS tabs and the mission entry point.
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Play, Radio, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { BONUS_XP } from '../../game/config'
import { createSessionRecord, readSession, removeSession, writeSession } from '../../game/levelSession'
import { useGameStore } from '../../game/store'
import { runtimeFor } from '../../levels/runtimes'
import { parseContextFor } from '../../shell/PersistentMission'
import { Modal } from '../../ui/Modal'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { Tabs } from '../../ui/Tabs'
import { cn } from '../../ui/cn'
import { useLevelContext } from './LevelGate'

type LevelTab = 'briefing' | 'side' | 'bonus'

const TAB_IDS: LevelTab[] = ['briefing', 'side', 'bonus']

export function Briefing() {
  const { levelId, level } = useLevelContext()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const progress = useGameStore((state) => state.levels[levelId])
  const startMission = useGameStore((state) => state.startMission)
  const runtime = runtimeFor(levelId)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const starting = useRef(false)

  // Levels 05-07: an unfinished saved run offers CONTINUE MISSION.
  const activeSession = useMemo(() => {
    if (!runtime.persistent) return false
    const parsed = readSession(levelId, parseContextFor(level, runtime, progress.attempts))
    return parsed.ok && parsed.session.status === 'active'
  }, [level, levelId, progress.attempts, runtime])

  /** BEGIN MISSION: the single counted start (attempts + 1), guarded against double clicks. */
  const beginMission = () => {
    if (starting.current) return
    starting.current = true
    const attemptIndex = startMission(levelId)
    if (runtime.persistent) {
      removeSession(levelId)
      writeSession(
        createSessionRecord(
          levelId,
          attemptIndex,
          level.stages.map((stage) => stage.id),
          runtime.persistent.initialStates,
        ),
      )
    }
    navigate(`/level/${levelId}/play`)
  }

  const rawTab = params.get('tab')
  const tab: LevelTab = TAB_IDS.includes(rawTab as LevelTab) ? (rawTab as LevelTab) : 'briefing'
  const setTab = (id: string) => {
    const next = new URLSearchParams(params)
    if (id === 'briefing') next.delete('tab')
    else next.set('tab', id)
    setParams(next, { replace: true })
  }

  const sideOpsPlayable = Boolean(runtime.SideOp || runtime.renderChallenge)

  const briefing = (
    <div>
      <div className="flex items-start gap-3 rounded border border-border bg-panel2/60 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan/40 bg-cyan/10 text-cyan">
          <Radio size={14} aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted">{level.briefing}</p>
      </div>

      <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">Mission objectives</h3>
      <ul className="mt-3 space-y-2">
        {level.objectives.map((objective, index) => (
          <li key={objective} className="flex items-start gap-3 text-sm text-text">
            <span className="mt-0.5 font-mono text-[10px] text-cyan">{String(index + 1).padStart(2, '0')}</span>
            <span>{objective}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {level.stages.map((stage, index) => (
          <div key={stage.id} className="rounded border border-border bg-panel2/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Stage {index + 1}
            </p>
            <p className="mt-1 font-display text-xs uppercase tracking-[0.12em] text-text">{stage.title}</p>
            {stage.subtitle && <p className="mt-1 text-[11px] text-muted">{stage.subtitle}</p>}
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-border/70 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Memory fragment {level.fragmentId} is encrypted until this mission is complete
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {runtime.BriefingActions ? (
          <runtime.BriefingActions />
        ) : activeSession ? (
          <>
            <NeonButton size="lg" data-testid="btn-continue-mission" onClick={() => navigate(`/level/${levelId}/play`)}>
              <Play size={15} aria-hidden="true" />
              Continue mission
            </NeonButton>
            <NeonButton variant="ghost" size="lg" data-testid="btn-begin-mission" onClick={() => setConfirmRestart(true)}>
              <RotateCcw size={15} aria-hidden="true" />
              Begin new run
            </NeonButton>
          </>
        ) : (
          <NeonButton size="lg" data-testid="btn-begin-mission" onClick={beginMission}>
            <Play size={15} aria-hidden="true" />
            Begin mission
          </NeonButton>
        )}
        <NeonButton variant="ghost" size="lg" data-testid="btn-briefing-back" onClick={() => navigate('/hub')}>
          Back to hub
        </NeonButton>
      </div>
    </div>
  )

  const sideOps = (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Optional operations pay once, whether or not the main mission is complete. They never gate the campaign.
      </p>
      {level.sideOps.map((op) => {
        const done = progress.sideOpsDone.includes(op.id)
        return (
          <div key={op.id} className="rounded border border-border bg-panel2/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm uppercase tracking-[0.14em] text-text">{op.title}</p>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{op.blurb}</p>
              </div>
              <Badge tone={done ? 'green' : 'cyan'}>{done ? 'Completed' : 'Available'}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <NeonButton
                size="sm"
                variant={done ? 'ghost' : 'primary'}
                disabled={!sideOpsPlayable}
                tooltip={sideOpsPlayable ? undefined : 'This side operation is unavailable.'}
                data-testid={`btn-side-op-${op.id}`}
                onClick={() => navigate(`/level/${levelId}/play?side=${encodeURIComponent(op.id)}`)}
              >
                <Play size={12} aria-hidden="true" />
                {done ? 'Replay side op' : 'Run side op'}
              </NeonButton>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {op.hints.length} progressive hints
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  const bonus = (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Bonus objectives are checked when the main mission completes. Visible bonuses pay {BONUS_XP.visible} XP; the
        hidden one pays {BONUS_XP.hidden} XP.
      </p>
      {level.bonuses.map((item) => {
        const earned = progress.bonusesEarned.includes(item.id)
        const secret = item.hidden && !earned && progress.stats.devRevealHiddenBonuses !== true
        return (
          <div
            key={item.id}
            className={cn(
              'rounded border p-4',
              earned ? 'border-green/40 bg-green/[0.05]' : 'border-border bg-panel2/50',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className={cn('mt-0.5', earned ? 'text-green' : 'text-muted')}>
                  {earned ? <Trophy size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                </span>
                <div>
                  <p className="font-display text-sm uppercase tracking-[0.14em] text-text">
                    {secret ? '???' : item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {secret ? 'Undisclosed objective. Find it by exploring this level.' : item.description}
                  </p>
                </div>
              </div>
              <Badge tone={earned ? 'green' : secret ? 'magenta' : 'muted'}>
                {earned ? 'Earned' : secret ? 'Hidden' : 'Locked'}
              </Badge>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {earned ? (
                <span className="flex items-center gap-1 text-green">
                  <CheckCircle2 size={11} aria-hidden="true" /> +{item.hidden ? BONUS_XP.hidden : BONUS_XP.visible} XP paid
                </span>
              ) : (
                `+${item.hidden ? BONUS_XP.hidden : BONUS_XP.visible} XP`
              )}
            </p>
          </div>
        )
      })}
    </div>
  )

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/hub')}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted transition-colors hover:text-cyan"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to hub
        </button>
        <div className="flex items-center gap-2">
          {progress.completed && <Badge tone="green">Completed</Badge>}
          <Badge tone="cyan">Level {String(levelId).padStart(2, '0')}</Badge>
        </div>
      </div>

      <Panel
        eyebrow={`${level.syllabus} · ${level.stages.length} stages · ${level.sideOps.length} side ops`}
        title={level.title}
        action={<Badge tone="magenta">{level.mission}</Badge>}
        tone="cyan"
      >
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'briefing', label: 'Briefing', content: briefing },
            { id: 'side', label: 'Side ops', content: sideOps },
            { id: 'bonus', label: 'Bonus', content: bonus },
          ]}
        />
      </Panel>
      <Modal
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title="Discard the saved run?"
      >
        <p className="text-sm text-muted">
          Your unfinished run will be deleted and a new run starts with a new dataset. Nothing from the old run is paid.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <NeonButton variant="ghost" onClick={() => setConfirmRestart(false)}>
            Keep it
          </NeonButton>
          <NeonButton
            variant="danger"
            data-testid="btn-confirm-restart"
            onClick={() => {
              setConfirmRestart(false)
              beginMission()
            }}
          >
            Discard and begin
          </NeonButton>
        </div>
      </Modal>
    </main>
  )
}

// MissionShell: header, objectives, workspace, collapsible log, hints and abort.
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  Flag,
  Info,
  Lightbulb,
  ListChecks,
  XCircle,
} from 'lucide-react'
import { isDevEnabled } from '../app/dev'
import { DEV_DEMO_AGGREGATE } from '../game/config'
import { xpForMain, xpForSideOp } from '../game/progression'
import { useGameStore } from '../game/store'
import type { ChallengeProps, ChallengeResult, LevelId, StageDef, Tier } from '../game/types'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'
import { ProgressBar } from '../ui/ProgressBar'
import { useToast } from '../ui/Toast'
import { cn } from '../ui/cn'
import { MissionUiProvider } from './MissionUi'
import type { MissionLogEntry, MissionLogInput, MissionLogTone } from './MissionUi'
import { useMissionFlow } from './useMissionFlow'
import type { MissionProgressSnapshot, MissionRestore } from './useMissionFlow'
import type { MissionRunSummary } from './missionSession'
import type { AwardSummary } from '../game/progression'
import { useObjectives } from './useObjectives'
import type { MissionObjectiveDef } from './useObjectives'

export interface MissionShellProps {
  levelId: LevelId
  levelTitle: string
  missionTitle: string
  kind: 'main' | 'side'
  sideOpId?: string
  stages: StageDef[]
  objectives: MissionObjectiveDef[]
  tier?: Tier
  renderChallenge: (stage: StageDef, props: ChallengeProps) => ReactNode
  /** Optional persistence hooks (Levels 5 to 7 resume a mission after a reload). */
  restore?: MissionRestore
  onProgress?: (snapshot: MissionProgressSnapshot) => void
  onFinished?: (summary: MissionRunSummary, award: AwardSummary | null) => void
  onAbort?: () => void
  /** Restored objective ids that were already ticked. */
  initialObjectives?: string[]
  /** Called when a challenge ticks an objective (so it can be persisted). */
  onObjective?: (id: string) => void
}

const toneIcon: Record<MissionLogTone, typeof Info> = {
  info: Info,
  good: CheckCircle2,
  bad: XCircle,
  tip: Lightbulb,
}

const toneClass: Record<MissionLogTone, string> = {
  info: 'text-cyan',
  good: 'text-green',
  bad: 'text-red',
  tip: 'text-amber',
}

const toneBorder: Record<MissionLogTone, string> = {
  info: 'border-cyan/30',
  good: 'border-green/30',
  bad: 'border-red/30',
  tip: 'border-amber/30',
}

export function MissionShell({
  levelId,
  levelTitle,
  missionTitle,
  kind,
  sideOpId,
  stages,
  objectives: objectiveDefs,
  tier = 'assisted',
  renderChallenge,
  restore,
  onProgress,
  onFinished,
  onAbort,
  initialObjectives,
  onObjective,
}: MissionShellProps) {
  const navigate = useNavigate()
  const { push } = useToast()
  const completeMission = useGameStore((state) => state.completeMission)
  const flow = useMissionFlow({ levelId, kind, sideOpId, stages, tier, restore, onProgress, onFinished, onAbort })
  const objectivesApi = useObjectives(objectiveDefs, initialObjectives)
  const [abortOpen, setAbortOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(true)
  const [log, setLog] = useState<MissionLogEntry[]>([
    {
      id: 0,
      title: 'Mission uplink established',
      detail: 'Objectives are live. Hints are optional and reduce the final score.',
      tone: 'info',
      at: Date.now(),
    },
  ])
  const nextLogId = useRef(1)

  const addLog = useCallback((entry: MissionLogInput) => {
    setLog((current) => [
      {
        id: nextLogId.current++,
        title: entry.title,
        detail: entry.detail,
        tone: entry.tone ?? 'info',
        at: Date.now(),
      },
      ...current,
    ])
  }, [])

  const objectiveRef = useRef(onObjective)
  objectiveRef.current = onObjective
  const completeObjective = objectivesApi.complete
  const missionUi = useMemo(
    () => ({
      completeObjective: (id: string) => {
        completeObjective(id)
        objectiveRef.current?.(id)
      },
      log: addLog,
    }),
    [addLog, completeObjective],
  )

  const handleComplete = (result: ChallengeResult) => {
    if (flow.status !== 'active') return
    flow.completeStage(result)
    addLog({
      title: `Stage cleared: ${flow.stage.title}`,
      detail: `${result.mistakes} mistake(s) · ${result.hintsUsed} hint(s) this stage.`,
      tone: 'good',
    })
  }

  const xpPreview = kind === 'main' ? xpForMain(levelId, 100, tier) : xpForSideOp(0)

  const handleAbort = () => {
    setAbortOpen(false)
    push({ message: 'Mission aborted. No XP, credits or bonuses were awarded.', tone: 'warning' })
    flow.abort()
  }

  const handleDevComplete = () => {
    // DEV_ONLY: mission completion shortcut for verification.
    const award = completeMission(levelId, DEV_DEMO_AGGREGATE, tier)
    push({
      message:
        award.xpGained > 0
          ? `Mission logged: +${award.xpGained} XP.`
          : 'Mission logged: no XP improvement on this replay.',
      tone: award.xpGained > 0 ? 'success' : 'info',
    })
    navigate(`/level/${levelId}/debrief`)
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="rounded border border-cyan/40 bg-panel/90 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
              Level {String(levelId).padStart(2, '0')} · {levelTitle}
            </p>
            <h1 className="mt-1 font-display text-xl uppercase tracking-[0.14em] text-text">{missionTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kind === 'side' && <Badge tone="magenta">Side operation</Badge>}
            <Badge tone="cyan">
              Stage {Math.min(flow.stageIndex + 1, flow.totalStages)}/{flow.totalStages}
            </Badge>
            <Badge tone="green">Max +{xpPreview} XP</Badge>
            {isDevEnabled() && kind === 'main' && (
              // DEV_ONLY: verification shortcut.
              <NeonButton
                size="sm"
                variant="danger"
                data-testid="btn-dev-complete"
                onClick={handleDevComplete}
                title="DEV_ONLY shortcut used for verification"
              >
                <CheckCircle2 size={12} aria-hidden="true" />
                Complete mission (dev)
              </NeonButton>
            )}
          </div>
        </div>

        <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Stage progress">
          {stages.map((stage, index) => {
            const done = index < flow.stageIndex || flow.status === 'stage-clear' && index === flow.stageIndex
            const active = index === flow.stageIndex
            return (
              <li
                key={stage.id}
                className={cn(
                  'flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]',
                  done
                    ? 'border-green/40 bg-green/10 text-green'
                    : active
                      ? 'border-cyan/50 bg-cyan/10 text-cyan'
                      : 'border-border bg-panel2 text-muted',
                )}
              >
                {done ? (
                  <CheckCircle2 size={11} aria-hidden="true" />
                ) : (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[8px]">
                    {index + 1}
                  </span>
                )}
                {stage.title}
              </li>
            )
          })}
        </ol>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_280px]">
        <aside aria-label="Mission objectives">
          <Panel eyebrow="Objectives" title={`${objectivesApi.completed}/${objectiveDefs.length}`} padded>
            <ul className="space-y-2.5">
              {objectivesApi.objectives.map((objective) => (
                <li key={objective.id} className="flex items-start gap-2">
                  {objective.done ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
                  ) : (
                    <Circle size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                  )}
                  <span className={cn('text-xs leading-relaxed', objective.done ? 'text-muted line-through' : 'text-text')}>
                    {objective.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Hints used: <span className="text-amber">{flow.hintsUsed}</span>
            </p>
          </Panel>
        </aside>

        <section aria-label="Mission workspace" className="min-w-0">
          <Panel
            eyebrow={flow.status === 'stage-clear' ? 'Stage complete' : `Stage ${flow.stageIndex + 1}`}
            title={flow.stage.title}
            action={<Badge tone={flow.status === 'stage-clear' ? 'green' : 'cyan'}>{flow.stage.subtitle ?? ''}</Badge>}
          >
            {flow.status === 'stage-clear' && flow.currentResult ? (
              <div className="space-y-4" data-testid="stage-clear">
                <div className="rounded border border-green/40 bg-green/[0.06] p-4">
                  <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.16em] text-green">
                    <Flag size={15} aria-hidden="true" />
                    Stage clear
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {flow.isLastStage
                      ? 'All main stages are logged. Finish to run the integrity checks and open the debrief.'
                      : 'The next stage unlocks only after this result is logged.'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ProgressBar value={Math.round(flow.currentResult.accuracy * 100)} label="Accuracy" tone="green" />
                  <ProgressBar
                    value={Math.round(flow.currentResult.decisionQuality * 100)}
                    label="Decision quality"
                    tone="cyan"
                  />
                  <ProgressBar
                    value={Math.round(flow.currentResult.efficiency * 100)}
                    label="Efficiency"
                    tone="amber"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <NeonButton onClick={flow.next} data-testid="btn-stage-next">
                    {flow.isLastStage ? 'Finish mission' : 'Next stage'}
                    <ChevronRight size={15} aria-hidden="true" />
                  </NeonButton>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {flow.currentResult.mistakes} mistake(s) · {flow.currentResult.hintsUsed} hint(s)
                  </span>
                </div>
              </div>
            ) : (
              <MissionUiProvider value={missionUi}>
                {renderChallenge(flow.stage, {
                  id: flow.stage.id,
                  difficulty: tier,
                  hints: flow.stage.hints.slice(0, 3),
                  onComplete: handleComplete,
                })}
              </MissionUiProvider>
            )}
          </Panel>
        </section>

        <aside aria-label="Mission log" className="min-w-0">
          <Panel
            eyebrow="Mission log"
            title="Decisions and tips"
            action={
              <button
                type="button"
                onClick={() => setLogOpen((open) => !open)}
                aria-expanded={logOpen}
                aria-label={logOpen ? 'Collapse mission log' : 'Expand mission log'}
                className="rounded border border-border p-1 text-muted hover:border-cyan/60 hover:text-cyan"
              >
                {logOpen ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
              </button>
            }
          >
            {logOpen ? (
              <ol className="max-h-[26rem] space-y-2 overflow-auto pr-1">
                {log.map((entry) => {
                  const Icon = toneIcon[entry.tone]
                  return (
                    <li key={entry.id} className={cn('rounded border bg-panel2/50 p-2', toneBorder[entry.tone])}>
                      <p className={cn('flex items-start gap-1.5 text-[11px] font-semibold', toneClass[entry.tone])}>
                        <Icon size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {entry.title}
                      </p>
                      {entry.detail && <p className="mt-1 text-[11px] leading-relaxed text-muted">{entry.detail}</p>}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-border py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-cyan/50 hover:text-cyan"
              >
                <ChevronDown size={12} aria-hidden="true" />
                Show {log.length} entries
              </button>
            )}
          </Panel>
        </aside>
      </div>

      <footer className="mt-4 rounded border border-border bg-panel/90 p-3">
        {flow.currentHints.length > 0 && (
          <div aria-live="polite" className="mb-3 space-y-1.5">
            {flow.currentHints.map((hint, index) => (
              <p
                key={index}
                className="flex items-start gap-2 rounded border border-amber/40 bg-amber/[0.06] p-2 text-xs text-amber"
              >
                <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Hint {index + 1}: </span>
                  {hint}
                </span>
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={flow.revealHint}
              disabled={!flow.canRevealHint}
              data-testid="btn-hint"
              tooltip={flow.canRevealHint ? 'Reveal the next hint' : 'No more hints for this stage'}
            >
              <Lightbulb size={13} aria-hidden="true" />
              Hint
            </NeonButton>
            <span
              data-testid="hints-used"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
            >
              Hints used: <span className="text-amber">{flow.hintsUsed}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <ListChecks size={11} aria-hidden="true" />
              {flow.results.length}/{flow.totalStages} stages logged
            </span>
          </div>
          <NeonButton
            size="sm"
            variant="danger"
            onClick={() => setAbortOpen(true)}
            data-testid="btn-abort-mission"
          >
            <AlertTriangle size={13} aria-hidden="true" />
            Abort mission
          </NeonButton>
        </div>
      </footer>

      <Modal
        open={abortOpen}
        onClose={() => setAbortOpen(false)}
        title="Abort mission?"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setAbortOpen(false)} data-testid="btn-abort-cancel">
              Keep playing
            </NeonButton>
            <NeonButton variant="danger" onClick={handleAbort} data-testid="btn-abort-confirm">
              Abort and award nothing
            </NeonButton>
          </>
        }
      >
        <p>
          Returning to the briefing ends this run. No XP, credits, side-op payout or bonus will be recorded for the
          current attempt.
        </p>
      </Modal>
    </main>
  )
}

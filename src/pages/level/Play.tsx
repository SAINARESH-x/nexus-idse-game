// Mission workspace: Level 01 runs the real shell; other levels stay honest placeholders.
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Cpu, Lock } from 'lucide-react'
import { isDevEnabled } from '../../app/dev'
import { DEV_DEMO_AGGREGATE } from '../../game/config'
import { useGameStore } from '../../game/store'
import { renderL01Challenge } from '../../levels/l01/challenges'
import { L01_OBJECTIVES, L01_SIDE_OBJECTIVES } from '../../levels/l01/content'
import type { ChallengeProps, StageDef } from '../../game/types'
import { MissionShell } from '../../shell/MissionShell'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { useLevelContext } from './LevelGate'

function PlaceholderWorkspace() {
  const { levelId, level } = useLevelContext()
  const navigate = useNavigate()
  const { push } = useToast()
  const completeMission = useGameStore((state) => state.completeMission)
  const dev = isDevEnabled()

  const handleDevComplete = () => {
    // DEV_ONLY: mission completion shortcut for verification.
    const award = completeMission(levelId, DEV_DEMO_AGGREGATE)
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/level/${levelId}`)}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted transition-colors hover:text-cyan"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to briefing
        </button>
        <Badge tone="cyan">Level {String(levelId).padStart(2, '0')}</Badge>
      </div>

      <Panel
        eyebrow="Mission workspace"
        title={level.mission}
        action={<Badge tone="amber">Placeholder</Badge>}
        tone="cyan"
      >
        <div className="flex items-start gap-3 rounded border border-border bg-panel2/60 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan/40 bg-cyan/10 text-cyan">
            <Cpu size={14} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm text-text">Mission workspace online.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              The interactive mechanics for <span className="text-cyan">{level.title}</span> arrive in the phase that
              owns this level. No simulated controls are shown here.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton variant="ghost" onClick={() => navigate('/hub')} data-testid="btn-workspace-hub">
            Return to hub
          </NeonButton>
          {dev && (
            // DEV_ONLY: mission completion shortcut for verification.
            <NeonButton
              variant="danger"
              data-testid="btn-dev-complete"
              onClick={handleDevComplete}
              title="DEV_ONLY shortcut used for verification"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Complete mission (dev)
            </NeonButton>
          )}
        </div>
      </Panel>
    </main>
  )
}

function SideOpUnavailable() {
  const { levelId } = useLevelContext()
  const navigate = useNavigate()
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Panel eyebrow="Side operation" title="NOT AVAILABLE" action={<Badge tone="amber">Later phase</Badge>}>
        <p className="flex items-start gap-2 rounded border border-border bg-panel2/60 p-4 text-sm text-muted">
          <Lock size={15} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
          This side operation has no playable challenge yet. Level 01 is the only level with side operations in this
          phase; no simulated controls are shown.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton onClick={() => navigate(`/level/${levelId}?tab=side`)}>Back to side ops</NeonButton>
          <NeonButton variant="ghost" onClick={() => navigate('/hub')}>
            Return to hub
          </NeonButton>
        </div>
      </Panel>
    </main>
  )
}

export function Play() {
  const { levelId, level } = useLevelContext()
  const [params] = useSearchParams()
  const sideOpId = params.get('side')

  if (levelId !== 1) {
    if (sideOpId) return <SideOpUnavailable />
    return <PlaceholderWorkspace />
  }

  const sideOp = sideOpId ? level.sideOps.find((item) => item.id === sideOpId) : undefined

  if (sideOpId && !sideOp) return <SideOpUnavailable />

  const renderChallenge = (stage: StageDef, props: ChallengeProps) => renderL01Challenge(stage.id, props)

  if (sideOp) {
    const stage: StageDef = {
      id: sideOp.id,
      title: sideOp.title,
      subtitle: sideOp.blurb,
      hints: sideOp.hints,
    }
    return (
      <MissionShell
        levelId={levelId}
        levelTitle={level.title}
        missionTitle={sideOp.title}
        kind="side"
        sideOpId={sideOp.id}
        stages={[stage]}
        objectives={
          L01_SIDE_OBJECTIVES[sideOp.id] ?? [{ id: `${sideOp.id}-obj`, label: sideOp.blurb }]
        }
        renderChallenge={renderChallenge}
      />
    )
  }

  return (
    <MissionShell
      levelId={levelId}
      levelTitle={level.title}
      missionTitle={level.mission}
      kind="main"
      stages={level.stages}
      objectives={L01_OBJECTIVES}
      renderChallenge={renderChallenge}
    />
  )
}

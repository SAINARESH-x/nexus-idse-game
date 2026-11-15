// Mission workspace: resolves a level's runtime and renders its main mission or side operation.
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import type { ChallengeProps, StageDef } from '../../game/types'
import { runtimeFor } from '../../levels/runtimes'
import { MissionShell } from '../../shell/MissionShell'
import { PersistentMission } from '../../shell/PersistentMission'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { useLevelContext } from './LevelGate'

function SideOpUnavailable() {
  const { levelId } = useLevelContext()
  const navigate = useNavigate()
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Panel eyebrow="Side operation" title="UNKNOWN OPERATION" action={<Badge tone="amber">Not found</Badge>}>
        <p className="flex items-start gap-2 rounded border border-border bg-panel2/60 p-4 text-sm text-muted">
          <Lock size={15} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
          This side operation does not exist for this level. Choose one from the side-ops list.
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
  const runtime = runtimeFor(levelId)

  if (sideOpId) {
    const sideOp = level.sideOps.find((item) => item.id === sideOpId)
    if (!sideOp) return <SideOpUnavailable />
    if (runtime.SideOp) return <runtime.SideOp key={sideOp.id} sideOpId={sideOp.id} />
    const render = runtime.renderChallenge
    if (!render) return <SideOpUnavailable />
    const stage: StageDef = { id: sideOp.id, title: sideOp.title, subtitle: sideOp.blurb, hints: sideOp.hints }
    return (
      <MissionShell
        key={sideOp.id}
        levelId={levelId}
        levelTitle={level.title}
        missionTitle={sideOp.title}
        kind="side"
        sideOpId={sideOp.id}
        stages={[stage]}
        objectives={runtime.sideObjectives?.[sideOp.id] ?? [{ id: `${sideOp.id}-obj`, label: sideOp.blurb }]}
        renderChallenge={(item: StageDef, props: ChallengeProps) => render(item.id, props)}
      />
    )
  }

  if (runtime.MainMission) return <runtime.MainMission />
  if (runtime.persistent && runtime.renderChallenge) {
    return <PersistentMission levelId={levelId} level={level} runtime={runtime} />
  }
  const render = runtime.renderChallenge
  if (!render) return <SideOpUnavailable />
  return (
    <MissionShell
      levelId={levelId}
      levelTitle={level.title}
      missionTitle={level.mission}
      kind="main"
      stages={level.stages}
      objectives={runtime.mainObjectives ?? []}
      renderChallenge={(stage: StageDef, props: ChallengeProps) => render(stage.id, props)}
    />
  )
}

// Mission briefing: level identity, objectives and the entry point to the workspace.
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Radio } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { useLevelContext } from './LevelGate'

export function Briefing() {
  const { levelId, level } = useLevelContext()
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/hub')}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted transition-colors hover:text-cyan"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to hub
        </button>
        <Badge tone="cyan">Level {String(levelId).padStart(2, '0')}</Badge>
      </div>

      <Panel
        eyebrow={`${level.syllabus} · ${level.stages.length} stages · ${level.sideOps.length} side ops`}
        title={level.title}
        action={<Badge tone="magenta">{level.mission}</Badge>}
        tone="cyan"
      >
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

        <p className="mt-6 border-t border-border/70 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Memory fragment {level.fragmentId} is encrypted until this mission is complete
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <NeonButton
            size="lg"
            data-testid="btn-begin-mission"
            onClick={() => navigate(`/level/${levelId}/play`)}
          >
            <Play size={15} aria-hidden="true" />
            Begin mission
          </NeonButton>
          <NeonButton
            variant="ghost"
            size="lg"
            data-testid="btn-briefing-back"
            onClick={() => navigate('/hub')}
          >
            Back to hub
          </NeonButton>
        </div>
      </Panel>
    </main>
  )
}

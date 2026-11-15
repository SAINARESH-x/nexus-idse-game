// LevelCard: campaign node with lock, completion and progress states.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react'
import { visibleBonuses } from '../../game/levels/registry'
import type { LevelDefinition, LevelProgress, Rating } from '../../game/types'
import { Badge } from '../../ui/Badge'
import type { BadgeTone } from '../../ui/Badge'
import { cn } from '../../ui/cn'
import { useToast } from '../../ui/Toast'

const ratingTone: Record<Rating, BadgeTone> = {
  S: 'cyan',
  A: 'green',
  B: 'amber',
  C: 'red',
}

export interface LevelCardProps {
  level: LevelDefinition
  progress: LevelProgress
}

export function LevelCard({ level, progress }: LevelCardProps) {
  const navigate = useNavigate()
  const { push } = useToast()
  const [shaking, setShaking] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const stagesDone = level.stages.filter((stage) => progress.stats[`stage:${stage.id}`] === true).length
  const sideOpsDone = progress.sideOpsDone.filter((id) =>
    level.sideOps.some((item) => item.id === id),
  ).length
  const bonusDone = progress.bonusesEarned.filter((id) =>
    level.bonuses.some((item) => item.id === id),
  ).length
  const visibleBonusTotal = visibleBonuses(level.id).length
  const locked = !progress.unlocked

  const activate = () => {
    if (locked) {
      setShaking(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setShaking(false), 450)
      push({
        message: `Level ${level.id} is locked. Complete Level ${level.id - 1} first.`,
        tone: 'warning',
      })
      return
    }
    navigate(`/level/${level.id}`)
  }

  return (
    <button
      type="button"
      data-testid={`level-card-${level.id}`}
      aria-label={`Level ${level.id}, ${level.title}, ${locked ? 'locked' : progress.completed ? 'completed' : 'available'}`}
      title={locked ? `Complete Level ${level.id - 1}` : `Open Level ${level.id}`}
      onClick={activate}
      className={cn(
        'group relative flex w-full flex-col rounded border bg-panel/90 p-4 text-left transition-colors',
        'nx-panel-glow',
        locked
          ? 'cursor-not-allowed border-border opacity-60'
          : progress.completed
            ? 'border-green/40 hover:border-green/70'
            : 'border-cyan/40 hover:border-cyan/80 hover:bg-cyan/[0.04]',
        shaking && 'nx-shake',
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded border font-display text-sm tracking-wider',
            locked
              ? 'border-border bg-panel2 text-muted'
              : progress.completed
                ? 'border-green/50 bg-green/10 text-green'
                : 'border-cyan/50 bg-cyan/10 text-cyan',
          )}
        >
          {String(level.id).padStart(2, '0')}
        </span>
        <span className="flex flex-wrap justify-end gap-1.5">
          {locked && (
            <Badge tone="muted">
              <Lock size={10} aria-hidden="true" />
              Locked
            </Badge>
          )}
          {!locked && progress.completed && (
            <Badge tone="green">
              <CheckCircle2 size={10} aria-hidden="true" />
              Completed
            </Badge>
          )}
          {!locked && !progress.completed && <Badge tone="cyan">Available</Badge>}
          {progress.rating && <Badge tone={ratingTone[progress.rating]}>Rating {progress.rating}</Badge>}
        </span>
      </span>

      <span className="mt-3 flex items-center gap-1.5">
        <span className="font-display text-sm uppercase tracking-[0.14em] text-text">{level.title}</span>
        {!locked && (
          <ChevronRight
            size={14}
            aria-hidden="true"
            className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-cyan"
          />
        )}
      </span>
      <span className="mt-1 block text-xs text-muted">{level.syllabus}</span>

      <span className="mt-3 block border-t border-border/70 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        Stages {stagesDone}/{level.stages.length} - Side ops {sideOpsDone}/{level.sideOps.length} - Bonus{' '}
        {bonusDone}/{visibleBonusTotal}
      </span>

      {locked && (
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
          Complete Level {level.id - 1}
        </span>
      )}
    </button>
  )
}

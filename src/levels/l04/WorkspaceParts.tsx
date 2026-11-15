// Workspace pieces: mission header with stage stepper, tool tabs with coding-level badges, Mission Log, objectives.
import type { ReactNode } from 'react'
import { CheckCircle2, Circle, Info, Lightbulb, Lock, XCircle } from 'lucide-react'
import { isDevEnabled } from '../../app/dev'
import { xpForMain } from '../../game/progression'
import { levelDefinition } from '../../game/levels/registry'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { cn } from '../../ui/cn'
import { Builder } from './Builder'
import { Console } from './Console'
import { useL04 } from './session'
import type { ToolTab } from './session'
import type { FlagController } from './Spreadsheet'
import { Spreadsheet } from './Spreadsheet'
import { StrategyLab } from './StrategyLab'
import type { Objective } from './stageLogic'

export function MissionHeader({ onDevComplete }: { onDevComplete: () => void }) {
  const { record } = useL04()
  const level = levelDefinition(4)
  return (
    <header className="rounded border border-cyan/40 bg-panel/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">Level 04 · {level.title}</p>
          <h1 className="mt-1 font-display text-xl uppercase tracking-[0.14em] text-text">{level.mission}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet" data-testid="tier-badge">{record.tier}</Badge>
          <Badge tone="cyan">Stage {record.stage + 1}/4</Badge>
          <Badge tone="green">Max +{xpForMain(4, 100, record.tier)} XP</Badge>
          {isDevEnabled() && (
            // DEV_ONLY: verification shortcut, completes through the real audit and store.
            <NeonButton size="sm" variant="danger" data-testid="btn-dev-complete" onClick={onDevComplete} title="DEV_ONLY shortcut used for verification">
              <CheckCircle2 size={12} aria-hidden="true" /> Complete mission (dev)
            </NeonButton>
          )}
        </div>
      </div>
      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Stage progress">
        {level.stages.map((s, i) => (
          <li key={s.id} aria-current={i === record.stage ? 'step' : undefined} className={cn('flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]', i < record.stage ? 'border-green/40 bg-green/10 text-green' : i === record.stage ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-border bg-panel2 text-muted')}>
            {i < record.stage ? <CheckCircle2 size={11} aria-hidden="true" /> : <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[8px]">{i + 1}</span>}
            {s.title}
          </li>
        ))}
      </ol>
    </header>
  )
}

const TABS: Array<{ id: ToolTab; label: string; level: string }> = [
  { id: 'sheet', label: 'Spreadsheet', level: 'VISUAL' },
  { id: 'console', label: 'Console', level: 'CODE' },
  { id: 'builder', label: 'Builder', level: 'COMMAND BUILDING' },
  { id: 'lab', label: 'Strategy Lab', level: 'ANALYSIS' },
]

export function ToolArea({ flag, onScanToggle }: { flag: FlagController | null; onScanToggle: () => void }) {
  const { tab, setTab, record } = useL04()
  const unlocked = record.stage >= 2
  const active = unlocked ? tab : 'sheet'
  const content: Record<ToolTab, ReactNode> = {
    sheet: <Spreadsheet flag={flag} onScanToggle={onScanToggle} />,
    console: <Console />,
    builder: <Builder />,
    lab: <StrategyLab />,
  }
  return (
    <div>
      <div role="tablist" aria-label="Tools" className="mb-3 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const locked = t.id !== 'sheet' && !unlocked
          return (
            <button key={t.id} role="tab" type="button" aria-selected={active === t.id} disabled={locked} title={locked ? 'Unlocks at Stage 3' : undefined} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)} className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]', active === t.id ? 'border-cyan text-cyan' : 'border-transparent text-muted hover:text-text', locked && 'cursor-not-allowed opacity-50')}>
              {locked && <Lock size={10} aria-hidden="true" />}
              {t.label}
              <span className="rounded border border-border px-1 text-[8px] text-muted">{t.level}</span>
            </button>
          )
        })}
      </div>
      <div role="tabpanel">{content[active]}</div>
    </div>
  )
}

export function ObjectivesPanel({ objectives, proceed, hints }: { objectives: Objective[]; proceed: ReactNode; hints: number }) {
  return (
    <Panel eyebrow="Objectives" title={`${objectives.filter((o) => o.done).length}/${objectives.length}`} padded>
      <ul className="space-y-2.5" data-testid="objectives">
        {objectives.map((o) => (
          <li key={o.id} className="flex items-start gap-2">
            {o.done ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" aria-label="done" /> : <Circle size={14} className="mt-0.5 shrink-0 text-muted" aria-label="open" />}
            <span className={cn('text-xs leading-relaxed', o.done ? 'text-muted line-through' : 'text-text')}>{o.label}</span>
          </li>
        ))}
      </ul>
      {proceed}
      <p className="mt-3 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Hints used: <span className="text-amber">{hints}</span></p>
    </Panel>
  )
}

const LOG_ICON = { info: Info, good: CheckCircle2, bad: XCircle, tip: Lightbulb } as const
const LOG_TONE = { info: 'text-cyan border-cyan/30', good: 'text-green border-green/30', bad: 'text-red border-red/30', tip: 'text-amber border-amber/30' } as const

export function MissionLogPanel() {
  const { log } = useL04()
  return (
    <Panel eyebrow="Mission log" title="Decisions and tips">
      <ol className="max-h-[32rem] space-y-2 overflow-auto pr-1" data-testid="mission-log">
        {log.map((e) => {
          const Icon = LOG_ICON[e.tone]
          return (
            <li key={e.id} className={cn('rounded border bg-panel2/50 p-2', LOG_TONE[e.tone].split(' ')[1])}>
              <p className={cn('flex items-start gap-1.5 text-[11px] font-semibold', LOG_TONE[e.tone].split(' ')[0])}>
                <Icon size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="break-all">{e.title}</span>
              </p>
              {e.detail && <p className="mt-1 text-[11px] leading-relaxed text-muted">{e.detail}</p>}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

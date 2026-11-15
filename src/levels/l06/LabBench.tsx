// Level 06 lab-bench primitives: bench panel with goal status, code line, RUN/STEP/RESET controls and readouts.
import type { ReactNode } from 'react'
import { CheckCircle2, CircleDashed, Play, RotateCcw, StepForward } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'

export function BenchPanel({ title, goal, done, children, testId }: { title: string; goal: string; done: boolean; children: ReactNode; testId?: string }) {
  return (
    <section className={cn('rounded-lg border bg-panel p-4', done ? 'border-green/50' : 'border-border')} aria-label={title} data-testid={testId}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-widest text-cyan">{title}</h3>
        <p className={cn('flex items-center gap-1 font-mono text-xs', done ? 'text-green' : 'text-muted')}>
          {done ? <CheckCircle2 size={14} aria-hidden /> : <CircleDashed size={14} aria-hidden />}
          <span>{done ? 'GOAL MET: ' : 'GOAL: '}{goal}</span>
        </p>
      </header>
      {children}
    </section>
  )
}

/** The equivalent Python line (text only, never executed). */
export function CodeLine({ code, label = 'python' }: { code: string; label?: string }) {
  return (
    <p className="mt-2 overflow-x-auto rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-muted">
      <span className="mr-2 text-violet">{label}</span>
      <code className="text-text">{code}</code>
    </p>
  )
}

export interface BenchControlsProps {
  onRun: () => void
  onStep?: () => void
  onReset: () => void
  runLabel?: string
  runDisabled?: boolean
  disabledReason?: string
  testPrefix: string
}

export function BenchControls({ onRun, onStep, onReset, runLabel = 'RUN', runDisabled, disabledReason, testPrefix }: BenchControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <NeonButton size="sm" onClick={onRun} disabled={runDisabled} tooltip={runDisabled ? disabledReason : undefined} data-testid={`${testPrefix}-run`}>
        <Play size={14} aria-hidden /> {runLabel}
      </NeonButton>
      {onStep && (
        <NeonButton size="sm" variant="ghost" onClick={onStep} disabled={runDisabled} tooltip={runDisabled ? disabledReason : undefined} data-testid={`${testPrefix}-step`}>
          <StepForward size={14} aria-hidden /> STEP
        </NeonButton>
      )}
      <NeonButton size="sm" variant="ghost" onClick={onReset} data-testid={`${testPrefix}-reset`}>
        <RotateCcw size={14} aria-hidden /> RESET
      </NeonButton>
    </div>
  )
}

const TONES = { text: 'text-text', cyan: 'text-cyan', green: 'text-green', amber: 'text-amber', red: 'text-red', magenta: 'text-magenta' } as const

export function Readout({ label, value, tone = 'text' }: { label: string; value: ReactNode; tone?: 'text' | 'cyan' | 'green' | 'amber' | 'red' | 'magenta' }) {
  return (
    <div className="rounded border border-border bg-panel2/60 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className={cn('font-mono text-sm', TONES[tone])}>{value}</div>
    </div>
  )
}

/** Segmented toggle (radio group) used for methods, levels and alphas. */
export function Segmented<T extends string | number>({ label, value, options, onChange, format = String, testId }: {
  label: string
  value: T | null
  options: readonly T[]
  onChange: (v: T) => void
  format?: (v: T) => string
  testId?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1" data-testid={testId}>
      <span className="mr-1 font-mono text-xs text-muted">{label}</span>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded border px-2 py-1 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan',
            value === o ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border text-text hover:border-cyan/60',
          )}
        >
          {format(o)}
        </button>
      ))}
    </div>
  )
}

export const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`
export const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '-')

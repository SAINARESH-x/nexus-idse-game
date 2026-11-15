// Level 05 analysis-desk widgets: pandas code line, goal card, chip group and labelled select.
import type { ReactNode } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '../../ui/cn'

export function CodeLine({ code, testId }: { code: string; testId?: string }) {
  return (
    <code data-testid={testId} className="block break-all rounded border border-border bg-bg/70 px-2 py-1 font-mono text-[11px] text-cyan/90">
      {code}
    </code>
  )
}

export function GoalCard({ done, label, children, testId }: { done: boolean; label: string; children?: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} data-done={done} className={cn('rounded border p-3', done ? 'border-green/50 bg-green/[0.05]' : 'border-border bg-panel2/50')}>
      <p className="flex items-center gap-2 text-xs text-text">
        {done ? <CheckCircle2 size={14} className="text-green" aria-hidden="true" /> : <Circle size={14} className="text-muted" aria-hidden="true" />}
        <span>{label}</span>
        <span className="sr-only">{done ? '(done)' : '(open)'}</span>
      </p>
      {children && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

export function ChipGroup<T extends string | number>({ label, options, value, onChange, render }: {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (v: T) => void
  render?: (v: T) => string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn('rounded border px-2 py-1 font-mono text-[11px]', value === o ? 'border-cyan bg-cyan/10 text-cyan' : 'border-border text-muted hover:border-cyan/60')}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  )
}

export function Select<T extends string>({ label, value, options, onChange, testId }: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  testId?: string
}) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
      {label}
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded border border-border bg-panel2 px-2 py-1 font-mono text-xs normal-case tracking-normal text-text"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === '' ? '(none)' : o}</option>
        ))}
      </select>
    </label>
  )
}

export const pct = (x: number): string => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : 'n/a')
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

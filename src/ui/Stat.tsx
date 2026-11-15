// Stat: compact metric block with label, value and optional hint.
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface StatProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: 'cyan' | 'green' | 'amber' | 'magenta'
  className?: string
}

const tones = {
  cyan: 'text-cyan',
  green: 'text-green',
  amber: 'text-amber',
  magenta: 'text-magenta',
} as const

export function Stat({ label, value, hint, icon, tone = 'cyan', className }: StatProps) {
  return (
    <div className={cn('rounded border border-border bg-panel2/60 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</span>
        {icon && (
          <span className={tones[tone]} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={cn('mt-1 font-display text-xl font-semibold', tones[tone])}>{value}</div>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

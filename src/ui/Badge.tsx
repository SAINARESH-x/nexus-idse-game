// Badge: compact status label whose colour is always paired with text.
import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export type BadgeTone = 'cyan' | 'green' | 'amber' | 'red' | 'magenta' | 'violet' | 'muted'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const tones: Record<BadgeTone, string> = {
  cyan: 'border-cyan/40 bg-cyan/10 text-cyan',
  green: 'border-green/40 bg-green/10 text-green',
  amber: 'border-amber/40 bg-amber/10 text-amber',
  red: 'border-red/40 bg-red/10 text-red',
  magenta: 'border-magenta/40 bg-magenta/10 text-magenta',
  violet: 'border-violet/40 bg-violet/10 text-violet',
  muted: 'border-border bg-panel2 text-muted',
}

export function Badge({ tone = 'muted', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

// Panel: bordered dark surface with optional eyebrow, title and action slot.
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string
  title?: string
  action?: ReactNode
  tone?: 'default' | 'cyan' | 'magenta'
  padded?: boolean
}

const toneBorder: Record<NonNullable<PanelProps['tone']>, string> = {
  default: 'border-border',
  cyan: 'border-cyan/40',
  magenta: 'border-magenta/40',
}

export function Panel({
  eyebrow,
  title,
  action,
  tone = 'default',
  padded = true,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn(
        'nx-panel-glow rounded border bg-panel/90 backdrop-blur-sm',
        toneBorder[tone],
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {(eyebrow || title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">{eyebrow}</p>
            )}
            {title && <h2 className="mt-1 font-display text-lg tracking-wide text-text">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

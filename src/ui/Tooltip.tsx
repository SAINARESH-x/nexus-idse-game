// Tooltip: CSS-only hint shown on hover or keyboard focus.
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface TooltipProps {
  label: string
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

const positions = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
} as const

export function Tooltip({ label, side = 'top', children, className }: TooltipProps) {
  return (
    <span className={cn('group relative inline-flex', className)} tabIndex={0} title={label}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-40 w-max max-w-[16rem] rounded border border-border bg-panel2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-text opacity-0 shadow-lg transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          positions[side],
        )}
      >
        {label}
      </span>
    </span>
  )
}

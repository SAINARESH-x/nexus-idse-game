// ProgressBar: labelled 0–100 meter with a text value for screen readers.
import { cn } from './cn'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  tone?: 'cyan' | 'green' | 'amber' | 'red' | 'magenta'
  className?: string
}

const fills = {
  cyan: 'bg-cyan',
  green: 'bg-green',
  amber: 'bg-amber',
  red: 'bg-red',
  magenta: 'bg-magenta',
} as const

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  tone = 'cyan',
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const percent = Math.round((clamped / safeMax) * 100)

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</span>}
          {showValue && (
            <span className="font-mono text-xs text-text">
              {Math.round(clamped)} / {safeMax}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(clamped)}
        className="h-2 overflow-hidden rounded-full border border-border bg-panel2"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', fills[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

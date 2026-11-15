// GridBackground: fixed decorative grid, glow and optional scanlines behind the app.
import { cn } from './cn'

export interface GridBackgroundProps {
  variant?: 'grid' | 'fine'
  scanlines?: boolean
  className?: string
}

export function GridBackground({ variant = 'grid', scanlines = false, className }: GridBackgroundProps) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <div className={cn('absolute inset-0', variant === 'grid' ? 'nx-grid' : 'nx-grid-fine', 'opacity-70')} />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-cyan/[0.06] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-magenta/[0.04] to-transparent" />
      {scanlines && <div className="nx-scanlines absolute inset-0 opacity-50" />}
    </div>
  )
}

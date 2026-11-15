// NeonButton: primary/ghost/danger action button with sm/md/lg sizes and a disabled tooltip.
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export type NeonButtonVariant = 'primary' | 'ghost' | 'danger'
export type NeonButtonSize = 'sm' | 'md' | 'lg'

export interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonButtonVariant
  size?: NeonButtonSize
  fullWidth?: boolean
  /** Tooltip text; shown natively even when the button is disabled. */
  tooltip?: string
}

const variants: Record<NeonButtonVariant, string> = {
  primary:
    'border-cyan/70 bg-cyan/10 text-cyan hover:bg-cyan/20 hover:shadow-glow-cyan-sm disabled:border-border disabled:bg-panel2 disabled:text-muted',
  ghost:
    'border-border bg-transparent text-text hover:border-cyan/60 hover:text-cyan disabled:text-muted',
  danger:
    'border-red/60 bg-red/10 text-red hover:bg-red/20 disabled:border-border disabled:bg-panel2 disabled:text-muted',
}

const sizes: Record<NeonButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(function NeonButton(
  { variant = 'primary', size = 'md', fullWidth, tooltip, className, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      title={tooltip}
      aria-disabled={disabled || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded border font-display uppercase tracking-[0.16em] transition-colors',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        disabled && 'cursor-not-allowed opacity-70',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

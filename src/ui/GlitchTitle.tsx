// GlitchTitle: display heading with a subtle CSS-only chromatic glitch.
import type { ElementType, ReactNode } from 'react'
import { cn } from './cn'

export interface GlitchTitleProps {
  children: string
  as?: ElementType
  size?: 'sm' | 'md' | 'xl'
  className?: string
  subtitle?: ReactNode
}

const sizes = {
  sm: 'text-2xl',
  md: 'text-4xl',
  xl: 'text-6xl sm:text-7xl lg:text-8xl',
} as const

export function GlitchTitle({ children, as: Tag = 'h1', size = 'md', className, subtitle }: GlitchTitleProps) {
  return (
    <div className={className}>
      <Tag
        className={cn(
          'nx-glitch inline-block font-display font-extrabold uppercase tracking-[0.18em] text-text',
          sizes[size],
        )}
        data-text={children}
      >
        {children}
      </Tag>
      {subtitle && <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-muted">{subtitle}</p>}
    </div>
  )
}

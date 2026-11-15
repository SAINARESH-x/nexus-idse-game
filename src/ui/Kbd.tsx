// Kbd: keyboard key cap for shortcuts and hints.
import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Kbd({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[1.6rem] items-center justify-center rounded border border-border bg-panel2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  )
}

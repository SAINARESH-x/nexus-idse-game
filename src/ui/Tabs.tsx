// Tabs: accessible tab list with arrow-key navigation and optional panel content.
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface TabItem {
  id: string
  label: string
  content?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id ?? '')
  const active = value ?? internal
  const baseId = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const select = (id: string) => {
    if (value === undefined) setInternal(id)
    onChange?.(id)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = items.length - 1
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowRight'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length
    const target = items[next]
    if (!target) return
    select(target.id)
    refs.current[next]?.focus()
  }

  const activeItem = items.find((item) => item.id === active)

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-1 border-b border-border"
        onKeyDown={(event) => {
          const index = items.findIndex((item) => item.id === active)
          onKeyDown(event, Math.max(index, 0))
        }}
      >
        {items.map((item, index) => {
          const selected = item.id === active
          return (
            <button
              key={item.id}
              ref={(node) => {
                refs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 font-display text-xs uppercase tracking-[0.18em] transition-colors',
                selected
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-muted hover:border-border hover:text-text',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {activeItem?.content !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className="pt-4"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  )
}

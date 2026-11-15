// Dataset Info panel: Shape, Info, Dtypes, Describe, Missing values and Duplicates as real inspect queries.
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { inspectCode, runInspect } from '../../engine'
import type { InspectQuery } from '../../engine'
import { cn } from '../../ui/cn'
import { useDfSession, useL04 } from './session'

const QUERIES: Array<{ id: string; label: string; q: InspectQuery; sentence: string }> = [
  { id: 'shape', label: 'Shape', q: { type: 'shape' }, sentence: 'Number of rows and columns.' },
  { id: 'info', label: 'Info', q: { type: 'info' }, sentence: 'Columns, non-null counts and dtypes.' },
  { id: 'dtypes', label: 'Dtypes', q: { type: 'dtypes' }, sentence: 'The data type pandas inferred for each column.' },
  { id: 'describe', label: 'Describe', q: { type: 'describe' }, sentence: 'Summary statistics of the numeric columns.' },
  { id: 'missing', label: 'Missing values', q: { type: 'isnull_sum' }, sentence: 'Blank (NaN) cells per column.' },
  { id: 'dups', label: 'Duplicates', q: { type: 'duplicated_sum' }, sentence: 'Rows that repeat an earlier row exactly.' },
]

export function DatasetInfo({ onQuery }: { onQuery?: (id: string) => void }) {
  const { setRibbon } = useL04()
  const df = useDfSession((s) => s.current)
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const q = QUERIES.find((x) => x.id === active)
  const output = q ? runInspect(df, q.q) : null

  return (
    <section className="rounded border border-border bg-panel/80 p-3" aria-label="Dataset info">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
        Dataset info
        {open ? <ChevronLeft size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
      </button>
      {open && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {QUERIES.map((x) => (
              <button
                key={x.id}
                type="button"
                data-testid={`info-${x.id}`}
                onClick={() => {
                  setActive(x.id)
                  setRibbon({ kind: 'inspect', code: inspectCode(x.q), sentence: x.sentence })
                  onQuery?.(x.id)
                }}
                className={cn('rounded border px-2 py-1 text-left font-mono text-[10px]', active === x.id ? 'border-cyan bg-cyan/10 text-cyan' : 'border-border text-muted hover:text-text')}
              >
                {x.label}
              </button>
            ))}
          </div>
          {output !== null && (
            <pre data-testid="info-output" className="mt-2 max-h-56 overflow-auto rounded border border-border bg-bg p-2 font-mono text-[10px] leading-snug text-text">
              {output}
            </pre>
          )}
        </>
      )}
    </section>
  )
}

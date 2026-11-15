// MODEL WORKSHOP layout pieces for Level 07: control panel + live plot area, labelled sliders, code lines and metric tables.
import type { ReactNode } from 'react'
import { cn } from '../../ui/cn'

export function WorkshopLayout({ controls, plots, title }: { controls: ReactNode; plots: ReactNode; title: string }) {
  return (
    <section aria-label={title} className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
      <div className="space-y-4 rounded-lg border border-cyan/30 bg-panel2/60 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Model workshop / controls</p>
        {controls}
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-panel/60 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Live plot area</p>
        {plots}
      </div>
    </section>
  )
}

export function Slider(props: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const { id, label, value, min, max, step, onChange, format = (v) => String(v) } = props
  return (
    <label htmlFor={id} className="block text-sm text-text">
      <span className="flex justify-between font-mono text-xs text-muted">
        <span>{label}</span>
        <span className="text-cyan">{format(value)}</span>
      </span>
      <input
        id={id}
        data-testid={id}
        type="range"
        className="mt-1 w-full accent-cyan"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function CodeLines({ lines }: { lines: string[] }) {
  return (
    <pre aria-label="Equivalent scikit-learn code" className="overflow-x-auto rounded border border-border bg-bg p-3 font-mono text-xs text-green">
      {lines.join('\n')}
    </pre>
  )
}

export function Goal({ met, children, testId }: { met: boolean; children: ReactNode; testId?: string }) {
  return (
    <p
      data-testid={testId}
      className={cn('rounded border p-2 text-sm', met ? 'border-green/50 bg-green/10 text-green' : 'border-border text-muted')}
    >
      {met ? 'GOAL MET: ' : 'GOAL: '}
      {children}
    </p>
  )
}

export function MetricTable({ rows }: { rows: { label: string; r2: number; mae?: number; rmse: number }[] }) {
  const f = (v: number | undefined) => (v === undefined ? '-' : Number.isFinite(v) ? v.toFixed(3) : 'n/a')
  return (
    <table className="w-full font-mono text-xs">
      <thead>
        <tr className="text-muted">
          <th className="text-left">set</th>
          <th className="text-right">r2</th>
          <th className="text-right">MAE</th>
          <th className="text-right">RMSE</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="text-text">
            <td>{r.label}</td>
            <td className="text-right" data-testid={`metric-${r.label}-r2`}>{f(r.r2)}</td>
            <td className="text-right">{f(r.mae)}</td>
            <td className="text-right">{f(r.rmse)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

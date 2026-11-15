// Shared SVG frame for charts: responsive viewBox, accessible title, and x/y axes with mono ticks.
import type { ReactNode } from 'react'
import { fmt } from './scale'

export const CHART_W = 480
export const CHART_H = 300
export const MARGIN = { top: 16, right: 16, bottom: 40, left: 48 }

export interface ChartFrameProps {
  summary: string
  width?: number
  height?: number
  className?: string
  children: ReactNode
}

/** Root <svg> with role="img", aria-label = computed summary, and a <title>. */
export function ChartFrame({ summary, width = CHART_W, height = CHART_H, className, children }: ChartFrameProps) {
  return (
    <svg
      role="img"
      aria-label={summary}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={`block select-none ${className ?? ''}`}
    >
      <title>{summary}</title>
      {children}
    </svg>
  )
}

export interface AxisProps {
  ticks: { value: number | string; pos: number }[]
  /** Fixed coordinate: y for a bottom axis, x for a left axis. */
  at: number
  from: number
  to: number
  orient: 'bottom' | 'left'
  label?: string
}

export function Axis({ ticks, at, from, to, orient, label }: AxisProps) {
  const bottom = orient === 'bottom'
  return (
    <g className="text-muted" aria-hidden="true">
      {bottom ? (
        <line x1={from} x2={to} y1={at} y2={at} className="stroke-border" />
      ) : (
        <line y1={from} y2={to} x1={at} x2={at} className="stroke-border" />
      )}
      {ticks.map((t, i) =>
        bottom ? (
          <g key={i}>
            <line x1={t.pos} x2={t.pos} y1={at} y2={at + 4} className="stroke-border" />
            <text x={t.pos} y={at + 15} textAnchor="middle" className="fill-muted font-mono" fontSize={10}>
              {typeof t.value === 'number' ? fmt(t.value) : t.value}
            </text>
          </g>
        ) : (
          <g key={i}>
            <line y1={t.pos} y2={t.pos} x1={at - 4} x2={at} className="stroke-border" />
            <text x={at - 6} y={t.pos + 3} textAnchor="end" className="fill-muted font-mono" fontSize={10}>
              {typeof t.value === 'number' ? fmt(t.value) : t.value}
            </text>
          </g>
        ),
      )}
      {label &&
        (bottom ? (
          <text x={(from + to) / 2} y={at + 32} textAnchor="middle" className="fill-muted font-mono" fontSize={10}>
            {label}
          </text>
        ) : (
          <text
            transform={`translate(${at - 36} ${(from + to) / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-muted font-mono"
            fontSize={10}
          >
            {label}
          </text>
        ))}
    </g>
  )
}

/** Fill/stroke class pairs for categorical series, in a fixed order. */
export const SERIES_COLOURS = [
  { fill: 'fill-cyan', stroke: 'stroke-cyan', bg: 'bg-cyan' },
  { fill: 'fill-magenta', stroke: 'stroke-magenta', bg: 'bg-magenta' },
  { fill: 'fill-amber', stroke: 'stroke-amber', bg: 'bg-amber' },
  { fill: 'fill-green', stroke: 'stroke-green', bg: 'bg-green' },
  { fill: 'fill-violet', stroke: 'stroke-violet', bg: 'bg-violet' },
  { fill: 'fill-red', stroke: 'stroke-red', bg: 'bg-red' },
] as const

export type ColourName = 'cyan' | 'magenta' | 'amber' | 'green' | 'violet' | 'red' | 'muted' | 'text'

/** Literal class strings (so Tailwind's scanner keeps them) for marker colours. */
export const MARK_CLASS: Record<ColourName, string> = {
  cyan: 'stroke-cyan fill-cyan',
  magenta: 'stroke-magenta fill-magenta',
  amber: 'stroke-amber fill-amber',
  green: 'stroke-green fill-green',
  violet: 'stroke-violet fill-violet',
  red: 'stroke-red fill-red',
  muted: 'stroke-muted fill-muted',
  text: 'stroke-text fill-text',
}

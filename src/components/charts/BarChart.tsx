// Bar chart: categories + values, optional start-at-zero axis, highlighted bars and a horizontal threshold line.
import { Axis, CHART_H, CHART_W, ChartFrame, MARGIN } from './ChartFrame'
import { bandScale, extent, fmt, linearScale, niceDomain, niceTicks } from './scale'

export interface BarChartProps {
  categories: readonly string[]
  values: readonly number[]
  /** true (default): the value axis starts at 0. false: it zooms to the data range (to show how that exaggerates). */
  startAtZero?: boolean
  highlighted?: readonly string[]
  threshold?: { value: number; label?: string }
  xLabel?: string
  yLabel?: string
  title?: string
  valueFormat?: (v: number) => string
}

export function BarChart({ categories, values, startAtZero = true, highlighted = [], threshold, xLabel, yLabel, title, valueFormat = (v) => fmt(v) }: BarChartProps) {
  const n = Math.min(categories.length, values.length)
  const cats = categories.slice(0, n)
  const vals = values.slice(0, n)
  const ext = extent([...vals, ...(threshold ? [threshold.value] : [])])
  const yd: [number, number] = startAtZero
    ? niceDomain(Math.min(0, ext[0]), Math.max(0, ext[1]))
    : niceDomain(ext[0] - (ext[1] - ext[0]) * 0.1, ext[1])
  const x = bandScale(cats, [MARGIN.left, CHART_W - MARGIN.right], 0.25)
  const y = linearScale(yd, [CHART_H - MARGIN.bottom, MARGIN.top])
  const base = y(Math.min(yd[1], Math.max(yd[0], 0)))
  const finiteIdx = vals.map((_, i) => i).filter((i) => Number.isFinite(vals[i]))
  const top = finiteIdx.reduce<number | null>((b, i) => (b === null || vals[i] > vals[b] ? i : b), null)
  const summary =
    `${title ? `${title}. ` : ''}Bar chart of ${n} categories` +
    (yLabel ? ` showing ${yLabel}` : '') +
    (top !== null ? `; highest ${cats[top]} at ${valueFormat(vals[top])}` : '') +
    `. ${cats.map((c, i) => `${c}: ${valueFormat(vals[i])}`).join('; ')}.` +
    (startAtZero ? '' : ' Axis does not start at zero.') +
    (threshold ? ` Threshold ${threshold.label ?? ''} at ${valueFormat(threshold.value)}.` : '')
  return (
    <ChartFrame summary={summary}>
      <Axis orient="left" at={MARGIN.left} from={MARGIN.top} to={CHART_H - MARGIN.bottom}
        ticks={niceTicks(yd[0], yd[1], 4).map((v) => ({ value: v, pos: y(v) }))} label={yLabel} />
      <Axis orient="bottom" at={CHART_H - MARGIN.bottom} from={MARGIN.left} to={CHART_W - MARGIN.right}
        ticks={cats.map((c) => ({ value: c, pos: x(c) + x.bandwidth / 2 }))} label={xLabel} />
      {cats.map((c, i) => {
        const v = vals[i]
        if (!Number.isFinite(v)) return null
        const yv = y(Math.min(yd[1], Math.max(yd[0], v)))
        const hi = highlighted.includes(c)
        return (
          <g key={c}>
            <rect x={x(c)} width={Math.max(1, x.bandwidth)} y={Math.min(yv, base)} height={Math.abs(base - yv)}
              className={hi ? 'fill-magenta stroke-text' : 'fill-cyan'} fillOpacity={hi ? 0.9 : 0.6} strokeWidth={hi ? 1 : 0} />
            {hi && (
              <text x={x(c) + x.bandwidth / 2} y={Math.min(yv, base) - 4} textAnchor="middle" className="fill-text font-mono" fontSize={10}>
                ▲ {valueFormat(v)}
              </text>
            )}
          </g>
        )
      })}
      {threshold && Number.isFinite(threshold.value) && (
        <g className="stroke-amber fill-amber">
          <line x1={MARGIN.left} x2={CHART_W - MARGIN.right} y1={y(threshold.value)} y2={y(threshold.value)} strokeDasharray="5 4" strokeWidth={1.5} />
          {threshold.label && (
            <text x={CHART_W - MARGIN.right} y={y(threshold.value) - 4} textAnchor="end" stroke="none" className="font-mono" fontSize={10}>
              {threshold.label}
            </text>
          )}
        </g>
      )}
    </ChartFrame>
  )
}

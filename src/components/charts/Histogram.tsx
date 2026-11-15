// Histogram: precomputed bins or raw values + bin count, with optional labelled vertical markers (mean, median, observed...).
import { histogramBins, mean, type Bin } from '../../engine/stats'
import { Axis, CHART_H, CHART_W, ChartFrame, MARGIN, MARK_CLASS, type ColourName } from './ChartFrame'
import { fmt, linearScale, niceDomain, niceTicks } from './scale'

export interface HistogramMarker {
  x: number
  label: string
  colour?: ColourName
}

export interface HistogramProps {
  bins?: readonly Bin[]
  values?: readonly number[]
  binCount?: number
  markers?: readonly HistogramMarker[]
  xLabel?: string
  yLabel?: string
  title?: string
  /** Bars whose interval satisfies this are drawn highlighted (e.g. the tail beyond an observed value). */
  highlight?: (bin: Bin) => boolean
}

export function Histogram({ bins, values, binCount = 10, markers = [], xLabel, yLabel = 'count', title, highlight }: HistogramProps) {
  const data = bins ? [...bins] : histogramBins(values ?? [], binCount)
  const total = data.reduce((a, b) => a + b.count, 0)
  const lo = data.length ? data[0].x0 : 0
  const hi = data.length ? data[data.length - 1].x1 : 1
  const mx = markers.filter((m) => Number.isFinite(m.x)).map((m) => m.x)
  const xd: [number, number] = [Math.min(lo, ...mx), Math.max(hi, ...mx)]
  const ymax = Math.max(1, ...data.map((b) => b.count))
  const yd = niceDomain(0, ymax)
  const x = linearScale(xd, [MARGIN.left, CHART_W - MARGIN.right])
  const y = linearScale(yd, [CHART_H - MARGIN.bottom, MARGIN.top])
  const peak = data.reduce<Bin | null>((best, b) => (best === null || b.count > best.count ? b : best), null)
  const centre = values && values.length ? mean(values) : NaN
  const summary =
    `${title ? `${title}. ` : ''}Histogram of ${total} values in ${data.length} bins` +
    (data.length ? ` from ${fmt(lo)} to ${fmt(hi)}` : '') +
    (peak && total > 0 ? `; tallest bin ${fmt(peak.x0)} to ${fmt(peak.x1)} with ${peak.count}` : '') +
    (Number.isFinite(centre) ? `; mean ${fmt(centre)}` : '') +
    '.' +
    (markers.length ? ` Markers: ${markers.map((m) => `${m.label} at ${fmt(m.x)}`).join(', ')}.` : '')
  return (
    <ChartFrame summary={summary}>
      <Axis orient="bottom" at={CHART_H - MARGIN.bottom} from={MARGIN.left} to={CHART_W - MARGIN.right}
        ticks={niceTicks(xd[0], xd[1]).map((v) => ({ value: v, pos: x(v) }))} label={xLabel} />
      <Axis orient="left" at={MARGIN.left} from={MARGIN.top} to={CHART_H - MARGIN.bottom}
        ticks={niceTicks(yd[0], yd[1], 4).map((v) => ({ value: v, pos: y(v) }))} label={yLabel} />
      {data.map((b, i) => (
        <rect key={i} x={x(b.x0) + 0.5} width={Math.max(0.5, x(b.x1) - x(b.x0) - 1)} y={y(b.count)}
          height={Math.max(0, y(0) - y(b.count))}
          className={highlight?.(b) ? 'fill-magenta' : 'fill-cyan'} fillOpacity={0.7} />
      ))}
      {markers.filter((m) => Number.isFinite(m.x)).map((m, i) => (
        <g key={`m${i}`} className={MARK_CLASS[m.colour ?? 'amber']}>
          <line x1={x(m.x)} x2={x(m.x)} y1={MARGIN.top} y2={CHART_H - MARGIN.bottom} strokeWidth={2} strokeDasharray="4 3" />
          <text x={x(m.x) + 3} y={MARGIN.top + 10 + i * 12} stroke="none" className="font-mono" fontSize={10}>
            {m.label}
          </text>
        </g>
      ))}
    </ChartFrame>
  )
}

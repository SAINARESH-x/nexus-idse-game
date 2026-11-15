// Line chart: one or more series over a shared numeric x (e.g. train vs validation RMSE by degree), optional marked x.
import { Axis, CHART_H, CHART_W, ChartFrame, MARGIN, SERIES_COLOURS } from './ChartFrame'
import { extent, fmt, linearScale, niceDomain, niceTicks } from './scale'

export interface LineSeries {
  name: string
  points: readonly { x: number; y: number }[]
}

export interface LineChartProps {
  series: readonly LineSeries[]
  markedX?: { x: number; label?: string }
  xLabel?: string
  yLabel?: string
  title?: string
  /** Use integer ticks on x (e.g. polynomial degree). */
  integerX?: boolean
}

export function LineChart({ series, markedX, xLabel, yLabel, title, integerX }: LineChartProps) {
  const clean = series.map((s) => ({ name: s.name, points: s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) }))
  const all = clean.flatMap((s) => s.points)
  const xe = extent(all.map((p) => p.x))
  const xd: [number, number] = xe[0] === xe[1] ? [xe[0] - 1, xe[1] + 1] : xe
  const yd = niceDomain(...extent(all.map((p) => p.y)))
  const x = linearScale(xd, [MARGIN.left, CHART_W - MARGIN.right])
  const y = linearScale(yd, [CHART_H - MARGIN.bottom, MARGIN.top])
  const xt = niceTicks(xd[0], xd[1]).filter((v) => !integerX || Number.isInteger(v))
  const summary =
    `${title ? `${title}. ` : ''}Line chart with ${clean.length} series. ` +
    clean
      .map((s) => {
        if (s.points.length === 0) return `${s.name}: no data`
        const min = s.points.reduce((b, p) => (p.y < b.y ? p : b))
        return `${s.name}: ${s.points.length} points, minimum ${fmt(min.y)} at x = ${fmt(min.x)}`
      })
      .join('; ') +
    '.' +
    (markedX ? ` Marked x = ${fmt(markedX.x)}${markedX.label ? ` (${markedX.label})` : ''}.` : '')
  return (
    <figure className="w-full">
      <ChartFrame summary={summary}>
        <Axis orient="bottom" at={CHART_H - MARGIN.bottom} from={MARGIN.left} to={CHART_W - MARGIN.right}
          ticks={xt.map((v) => ({ value: v, pos: x(v) }))} label={xLabel} />
        <Axis orient="left" at={MARGIN.left} from={MARGIN.top} to={CHART_H - MARGIN.bottom}
          ticks={niceTicks(yd[0], yd[1]).map((v) => ({ value: v, pos: y(v) }))} label={yLabel} />
        {markedX && Number.isFinite(markedX.x) && (
          <g className="stroke-amber fill-amber">
            <line x1={x(markedX.x)} x2={x(markedX.x)} y1={MARGIN.top} y2={CHART_H - MARGIN.bottom} strokeDasharray="4 3" />
            {markedX.label && (
              <text x={x(markedX.x) + 3} y={MARGIN.top + 10} stroke="none" className="font-mono" fontSize={10}>{markedX.label}</text>
            )}
          </g>
        )}
        {clean.map((s, i) => {
          const c = SERIES_COLOURS[i % SERIES_COLOURS.length]
          const sorted = [...s.points].sort((a, b) => a.x - b.x)
          return (
            <g key={s.name}>
              {sorted.length > 1 && (
                <polyline points={sorted.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')} fill="none" className={c.stroke}
                  strokeWidth={2} strokeDasharray={i % 2 === 1 ? '6 3' : undefined} />
              )}
              {sorted.map((p, j) => (
                <circle key={j} cx={x(p.x)} cy={y(p.y)} r={3} className={c.fill} />
              ))}
            </g>
          )
        })}
      </ChartFrame>
      {clean.length > 0 && (
        <figcaption className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
          {clean.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1">
              <span aria-hidden="true" className={`inline-block h-0.5 w-4 ${SERIES_COLOURS[i % SERIES_COLOURS.length].bg}`} />
              {s.name}{i % 2 === 1 ? ' (dashed)' : ''}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

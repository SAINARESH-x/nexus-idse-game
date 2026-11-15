// Box plot for one or several groups: Q1/median/Q3 (pandas-linear), whiskers at k*IQR (default 1.5) and outlier dots.
import { iqrOutliers, median } from '../../engine/stats'
import { Axis, CHART_H, CHART_W, ChartFrame, MARGIN } from './ChartFrame'
import { bandScale, extent, fmt, linearScale, niceDomain, niceTicks } from './scale'

export interface BoxGroup {
  label: string
  values: readonly number[]
}

export interface BoxStats {
  label: string
  n: number
  q1: number
  median: number
  q3: number
  whiskerLo: number
  whiskerHi: number
  outliers: number[]
}

/** Box statistics; whiskers reach the most extreme values inside the fences. */
export function boxStats(label: string, raw: readonly number[], k = 1.5): BoxStats {
  const values = raw.filter((v) => Number.isFinite(v))
  const r = iqrOutliers(values, k)
  const inside = values.filter((v) => v >= r.lower && v <= r.upper)
  return {
    label,
    n: values.length,
    q1: r.q1,
    median: median(values),
    q3: r.q3,
    whiskerLo: inside.length ? Math.min(...inside) : NaN,
    whiskerHi: inside.length ? Math.max(...inside) : NaN,
    outliers: r.outliers,
  }
}

export interface BoxPlotProps {
  groups: readonly BoxGroup[]
  k?: number
  yLabel?: string
  title?: string
}

export function BoxPlot({ groups, k = 1.5, yLabel, title }: BoxPlotProps) {
  const stats = groups.map((g) => boxStats(g.label, g.values, k))
  const yd = niceDomain(...extent(groups.flatMap((g) => [...g.values])))
  const x = bandScale(stats.map((s) => s.label), [MARGIN.left, CHART_W - MARGIN.right], 0.5)
  const y = linearScale(yd, [CHART_H - MARGIN.bottom, MARGIN.top])
  const summary =
    `${title ? `${title}. ` : ''}Box plot of ${stats.length} group${stats.length === 1 ? '' : 's'} (whiskers at ${fmt(k)} IQR). ` +
    stats
      .map((s) => `${s.label}: n ${s.n}, median ${fmt(s.median)}, Q1 ${fmt(s.q1)}, Q3 ${fmt(s.q3)}, ${s.outliers.length} outlier${s.outliers.length === 1 ? '' : 's'}`)
      .join('; ') +
    '.'
  return (
    <ChartFrame summary={summary}>
      <Axis orient="left" at={MARGIN.left} from={MARGIN.top} to={CHART_H - MARGIN.bottom}
        ticks={niceTicks(yd[0], yd[1]).map((v) => ({ value: v, pos: y(v) }))} label={yLabel} />
      <Axis orient="bottom" at={CHART_H - MARGIN.bottom} from={MARGIN.left} to={CHART_W - MARGIN.right}
        ticks={stats.map((s) => ({ value: s.label, pos: x(s.label) + x.bandwidth / 2 }))} />
      {stats.map((s) => {
        if (s.n === 0) return null
        const cx = x(s.label) + x.bandwidth / 2
        const w = x.bandwidth
        return (
          <g key={s.label}>
            <line x1={cx} x2={cx} y1={y(s.whiskerLo)} y2={y(s.q1)} className="stroke-muted" />
            <line x1={cx} x2={cx} y1={y(s.q3)} y2={y(s.whiskerHi)} className="stroke-muted" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(s.whiskerLo)} y2={y(s.whiskerLo)} className="stroke-muted" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(s.whiskerHi)} y2={y(s.whiskerHi)} className="stroke-muted" />
            <rect x={x(s.label)} width={w} y={y(s.q3)} height={Math.max(1, y(s.q1) - y(s.q3))}
              className="fill-cyan stroke-cyan" fillOpacity={0.2} />
            <line x1={x(s.label)} x2={x(s.label) + w} y1={y(s.median)} y2={y(s.median)} className="stroke-text" strokeWidth={2} />
            {s.outliers.map((v, i) => (
              <circle key={i} cx={cx} cy={y(v)} r={3} className="fill-magenta stroke-bg" />
            ))}
          </g>
        )
      })}
    </ChartFrame>
  )
}

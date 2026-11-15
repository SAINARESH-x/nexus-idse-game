// Scatter plot: points, optional regression line, colour-by-category legend, residuals, and an x-range brush (pointer + keyboard).
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { corr } from '../../engine/stats'
import { Axis, CHART_H, CHART_W, ChartFrame, MARGIN, SERIES_COLOURS } from './ChartFrame'
import { extent, fmt, linearScale, niceDomain, niceTicks } from './scale'

export interface ScatterPoint {
  x: number
  y: number
  category?: string
}

export interface ScatterProps {
  points: readonly ScatterPoint[]
  xLabel?: string
  yLabel?: string
  line?: { slope: number; intercept: number }
  /** Draw vertical residual segments from each point to `line`. */
  showResiduals?: boolean
  /** Fixed category order for colours and the legend (defaults to first-seen order). */
  categories?: string[]
  /** Enables the brush; receives the selected [lo, hi] in data units (null when cleared). */
  onBrush?: (range: [number, number] | null) => void
  /** Controlled brush range. */
  brush?: [number, number] | null
  /** Keyboard step in data units (default: 1/50 of the x domain). */
  brushStep?: number
  xDomain?: [number, number]
  yDomain?: [number, number]
  title?: string
}

const ok = (p: ScatterPoint): boolean => Number.isFinite(p.x) && Number.isFinite(p.y)

export function Scatter(props: ScatterProps) {
  const { points, xLabel, yLabel, line, showResiduals, onBrush, title } = props
  const valid = useMemo(() => points.filter(ok), [points])
  const xd = props.xDomain ?? niceDomain(...extent(valid.map((p) => p.x)))
  const yd = props.yDomain ?? niceDomain(...extent(valid.map((p) => p.y)))
  const x = linearScale(xd, [MARGIN.left, CHART_W - MARGIN.right])
  const y = linearScale(yd, [CHART_H - MARGIN.bottom, MARGIN.top])
  const cats = useMemo(() => {
    if (props.categories) return props.categories
    const seen: string[] = []
    for (const p of valid) if (p.category !== undefined && !seen.includes(p.category)) seen.push(p.category)
    return seen
  }, [props.categories, valid])
  const colour = (c?: string) => SERIES_COLOURS[Math.max(0, c === undefined ? 0 : cats.indexOf(c)) % SERIES_COLOURS.length]

  const [inner, setInner] = useState<[number, number] | null>(null)
  const range = props.brush !== undefined ? props.brush : inner
  const setRange = (r: [number, number] | null): void => {
    const norm: [number, number] | null = r ? [Math.min(r[0], r[1]), Math.max(r[0], r[1])] : null
    setInner(norm)
    onBrush?.(norm)
  }
  const dragStart = useRef<number | null>(null)
  const svgX = (e: PointerEvent<SVGRectElement>): number => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    const px = rect && rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * CHART_W : MARGIN.left
    return Math.min(xd[1], Math.max(xd[0], x.invert(px)))
  }
  const step = props.brushStep ?? (xd[1] - xd[0]) / 50
  const onKey = (e: KeyboardEvent<SVGRectElement>): void => {
    const cur = range ?? [xd[0], xd[0] + (xd[1] - xd[0]) / 4]
    const clampX = (v: number) => Math.min(xd[1], Math.max(xd[0], v))
    let next: [number, number] | null = null
    if (e.key === 'ArrowRight') next = e.shiftKey ? [cur[0], clampX(cur[1] + step)] : [clampX(cur[0] + step), clampX(cur[1] + step)]
    else if (e.key === 'ArrowLeft') next = e.shiftKey ? [cur[0], clampX(cur[1] - step)] : [clampX(cur[0] - step), clampX(cur[1] - step)]
    else if (e.key === 'ArrowUp') next = [clampX(cur[0] - step), clampX(cur[1] + step)]
    else if (e.key === 'ArrowDown') next = cur[1] - cur[0] > 2 * step ? [cur[0] + step, cur[1] - step] : cur
    else if (e.key === 'Escape') {
      e.preventDefault()
      setRange(null)
      return
    }
    if (next) {
      e.preventDefault()
      setRange(next)
    }
  }

  const r = corr(valid.map((p) => p.x), valid.map((p) => p.y))
  const inBrush = range ? valid.filter((p) => p.x >= range[0] && p.x <= range[1]).length : 0
  const summary =
    `${title ? `${title}. ` : ''}Scatter plot of ${valid.length} points` +
    `${xLabel || yLabel ? `, ${yLabel ?? 'y'} against ${xLabel ?? 'x'}` : ''}. ` +
    `Pearson r = ${fmt(r)}.` +
    (line ? ` Line y = ${fmt(line.slope, 3)}x + ${fmt(line.intercept, 3)}.` : '') +
    (cats.length ? ` Categories: ${cats.join(', ')}.` : '') +
    (range ? ` Selected x from ${fmt(range[0])} to ${fmt(range[1])}: ${inBrush} points.` : '')

  const lineY = (xv: number) => (line ? line.slope * xv + line.intercept : NaN)
  const plotTop = MARGIN.top
  const plotH = CHART_H - MARGIN.bottom - MARGIN.top
  return (
    <figure className="w-full">
      <ChartFrame summary={summary}>
        <Axis orient="bottom" at={CHART_H - MARGIN.bottom} from={MARGIN.left} to={CHART_W - MARGIN.right}
          ticks={niceTicks(xd[0], xd[1]).map((v) => ({ value: v, pos: x(v) }))} label={xLabel} />
        <Axis orient="left" at={MARGIN.left} from={MARGIN.top} to={CHART_H - MARGIN.bottom}
          ticks={niceTicks(yd[0], yd[1]).map((v) => ({ value: v, pos: y(v) }))} label={yLabel} />
        {range && (
          <rect x={x(range[0])} width={Math.max(1, x(range[1]) - x(range[0]))} y={plotTop} height={plotH}
            className="fill-cyan stroke-cyan" fillOpacity={0.12} strokeOpacity={0.6} />
        )}
        {line && showResiduals &&
          valid.map((p, i) => (
            <line key={`r${i}`} x1={x(p.x)} x2={x(p.x)} y1={y(p.y)} y2={y(lineY(p.x))} className="stroke-amber" strokeOpacity={0.6} />
          ))}
        <g>
          {valid.map((p, i) => (
            <circle key={i} cx={x(p.x)} cy={y(p.y)} r={3} className={colour(p.category).fill} fillOpacity={0.75} />
          ))}
        </g>
        {line && Number.isFinite(lineY(xd[0])) && (
          <line x1={x(xd[0])} x2={x(xd[1])} y1={y(lineY(xd[0]))} y2={y(lineY(xd[1]))} className="stroke-magenta" strokeWidth={2} />
        )}
        {onBrush && (
          <rect
            x={MARGIN.left} y={plotTop} width={CHART_W - MARGIN.left - MARGIN.right} height={plotH}
            fill="transparent" tabIndex={0} role="slider"
            aria-label={`Brush over ${xLabel ?? 'x'}. Arrow keys move, Shift+arrows resize, Up/Down widen or narrow, Escape clears.`}
            aria-valuemin={xd[0]} aria-valuemax={xd[1]} aria-valuenow={range ? range[0] : xd[0]}
            aria-valuetext={range ? `${fmt(range[0])} to ${fmt(range[1])}` : 'no selection'}
            className="cursor-crosshair outline-none focus-visible:stroke-cyan"
            onPointerDown={(e) => {
              dragStart.current = svgX(e)
              e.currentTarget.setPointerCapture?.(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (dragStart.current !== null) setRange([dragStart.current, svgX(e)])
            }}
            onPointerUp={(e) => {
              if (dragStart.current !== null) {
                const end = svgX(e)
                setRange(Math.abs(end - dragStart.current) < 1e-9 ? null : [dragStart.current, end])
              }
              dragStart.current = null
            }}
            onKeyDown={onKey}
          />
        )}
      </ChartFrame>
      {cats.length > 0 && (
        <figcaption className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
          {cats.map((c) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${colour(c).bg}`} />
              {c}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

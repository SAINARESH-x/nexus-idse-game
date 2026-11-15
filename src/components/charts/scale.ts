// Pure scale helpers for the in-house SVG charts: linear scale, nice ticks, band scale, safe extents.

export interface LinearScale {
  (v: number): number
  domain: [number, number]
  range: [number, number]
  invert: (px: number) => number
}

/** Linear map domain -> range. A zero-width or non-finite domain maps everything to the range midpoint. */
export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const width = d1 - d0
  const ok = Number.isFinite(width) && width !== 0
  const f = ((v: number): number => (ok ? r0 + ((v - d0) / width) * (r1 - r0) : (r0 + r1) / 2)) as LinearScale
  f.domain = [d0, d1]
  f.range = [r0, r1]
  f.invert = (px: number): number => (ok && r1 !== r0 ? d0 + ((px - r0) / (r1 - r0)) * width : d0)
  return f
}

/** A "nice" step (1, 2, 5 x 10^k) for roughly `count` intervals. */
export function niceStep(span: number, count = 5): number {
  if (!Number.isFinite(span) || span <= 0) return 1
  const raw = span / Math.max(1, count)
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

/** Tick values on multiples of a nice step inside [lo, hi]; a degenerate range yields [lo]. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
  if (lo === hi) return [lo]
  const a = Math.min(lo, hi)
  const b = Math.max(lo, hi)
  const step = niceStep(b - a, count)
  const out: number[] = []
  for (let t = Math.ceil(a / step - 1e-9) * step; t <= b + step * 1e-9; t += step) {
    out.push(Number(t.toFixed(10)))
    if (out.length > 100) break
  }
  return out
}

/** Expand [lo, hi] outward to nice step boundaries. */
export function niceDomain(lo: number, hi: number, count = 5): [number, number] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) return lo === 0 ? [0, 1] : [lo - Math.abs(lo) * 0.1, hi + Math.abs(hi) * 0.1]
  const step = niceStep(hi - lo, count)
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
}

/** Min and max of the finite values; [0, 1] when there are none. */
export function extent(values: readonly number[]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return lo === Infinity ? [0, 1] : [lo, hi]
}

export interface BandScale {
  (key: string): number
  bandwidth: number
  keys: string[]
}

/** Evenly spaced bands for categories; `padding` is the inner gap fraction (0..1). Unknown keys map to NaN. */
export function bandScale(keys: readonly string[], range: [number, number], padding = 0.2): BandScale {
  const n = keys.length
  const [r0, r1] = range
  const step = n > 0 ? (r1 - r0) / n : 0
  const pad = Math.min(0.9, Math.max(0, padding))
  const f = ((key: string): number => {
    const i = keys.indexOf(key)
    return i < 0 ? NaN : r0 + i * step + (step * pad) / 2
  }) as BandScale
  f.bandwidth = step * (1 - pad)
  f.keys = [...keys]
  return f
}

/** Short number label for ticks and summaries. */
export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return 'n/a'
  const r = Number(v.toFixed(digits))
  return String(r)
}

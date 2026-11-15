// Side-op pure logic: Outlier Influence (leave-one-out slope) and Residual Reading (computed pattern measures).
import { corr } from '../../engine/stats'
import { mixSeed, mulberry32 } from '../../engine/rng'
import { SALTS } from './config'
import { ols, predict, residuals, simpleLine } from './regression'

export interface P {
  x: number
  y: number
}

export const OUTLIER_START: P = { x: 38, y: 3.2 }

export function outlierBase(seed: number): P[] {
  const r = mulberry32(mixSeed(seed, SALTS.outlier))
  return Array.from({ length: 20 }, (_, i) => {
    const x = 5 + i * 1.2 + r.float(-0.4, 0.4)
    return { x: Math.round(x * 10) / 10, y: Math.round((5.4 + 0.09 * x + r.normal(0, 0.3)) * 100) / 100 }
  })
}

export function looSlopes(base: readonly P[], extreme: P): { withPoint: number; without: number; change: number } {
  const all = [...base, extreme]
  const withPoint = simpleLine(all.map((p) => p.x), all.map((p) => p.y)).slope
  const without = simpleLine(base.map((p) => p.x), base.map((p) => p.y)).slope
  return { withPoint, without, change: withPoint - without }
}

export type PatternKind = 'random' | 'curved' | 'funnel'
export type FixKind = 'none' | 'square' | 'log'
export const PATTERN_THRESHOLD = 0.35

export const RESIDUAL_ORDER: PatternKind[] = ['random', 'curved', 'funnel']

export function residualDataset(seed: number, kind: PatternKind): P[] {
  const r = mulberry32(mixSeed(seed, SALTS.residual, RESIDUAL_ORDER.indexOf(kind)))
  return Array.from({ length: 80 }, (_, i) => {
    const x = 1 + (9 * i) / 79
    if (kind === 'random') return { x, y: 2 + 0.5 * x + r.normal(0, 0.4) }
    if (kind === 'curved') return { x, y: 1 + 0.2 * x + 0.15 * x * x + r.normal(0, 0.4) }
    return { x, y: Math.exp(0.3 + 0.2 * x + r.normal(0, 0.18)) }
  })
}

export interface ResidualCheck {
  fitted: number[]
  resid: number[]
  curvature: number
  funnel: number
  clean: boolean
}

/** Fits the linear model (with an optional fix) and measures leftover structure in the residuals. */
export function checkResiduals(points: readonly P[], fix: FixKind): ResidualCheck {
  const X = points.map((p) => (fix === 'square' ? [p.x, p.x * p.x] : [p.x]))
  const y = points.map((p) => (fix === 'log' ? Math.log(Math.max(p.y, 1e-6)) : p.y))
  const fit = ols(X, y)
  const fitted = fit.ok ? predict(fit.model, X) : y.map(() => 0)
  const resid = residuals(y, fitted)
  const m = fitted.reduce((s, v) => s + v, 0) / fitted.length
  const curvature = Math.abs(corr(resid, fitted.map((v) => (v - m) ** 2)))
  const funnel = Math.abs(corr(resid.map(Math.abs), fitted))
  const safe = (v: number) => (Number.isFinite(v) ? v : 0)
  return {
    fitted,
    resid,
    curvature: safe(curvature),
    funnel: safe(funnel),
    clean: safe(curvature) < PATTERN_THRESHOLD && safe(funnel) < PATTERN_THRESHOLD,
  }
}

export const CORRECT_FIX: Record<PatternKind, FixKind> = { random: 'none', curved: 'square', funnel: 'log' }

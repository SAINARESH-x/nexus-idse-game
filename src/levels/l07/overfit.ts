// Stage 3 part 1 data: a fixed nonlinear truth with seeded noise, and train/validation RMSE per polynomial degree.
import { mixSeed, mulberry32 } from '../../engine/rng'
import { OVERFIT_JITTER, OVERFIT_MAX_DEGREE, OVERFIT_NOISE, OVERFIT_TRAIN_N, OVERFIT_TRAIN_SPAN, OVERFIT_VAL_N, SALTS, overfitTruth } from './config'
import { ols, polynomialFeatures, predict, rangeScaler, rmse } from './regression'
import type { OlsModel } from './regression'

export interface Pt {
  x: number
  y: number
}
export interface OverfitData {
  train: Pt[]
  val: Pt[]
}

export function makeOverfitData(seed: number): OverfitData {
  const jit = mulberry32(mixSeed(seed, SALTS.overfitTrain))
  const noise = mulberry32(mixSeed(seed, SALTS.overfitNoise))
  const train = Array.from({ length: OVERFIT_TRAIN_N }, (_, i) => {
    const x = -OVERFIT_TRAIN_SPAN + (2 * OVERFIT_TRAIN_SPAN * i) / (OVERFIT_TRAIN_N - 1) + jit.float(-OVERFIT_JITTER, OVERFIT_JITTER)
    return { x, y: overfitTruth(x) + noise.normal(0, OVERFIT_NOISE) }
  })
  const val = Array.from({ length: OVERFIT_VAL_N }, (_, i) => {
    const x = -1 + (2 * (i + 0.5)) / OVERFIT_VAL_N
    return { x, y: overfitTruth(x) + noise.normal(0, OVERFIT_NOISE) }
  })
  return { train, val }
}

export interface DegreeFit {
  degree: number
  model: OlsModel
  scale: (v: number) => number
  trainRmse: number
  valRmse: number
}

export function fitDegree(data: OverfitData, degree: number): DegreeFit | null {
  const scale = rangeScaler(data.train.map((p) => p.x))
  const X = polynomialFeatures(data.train.map((p) => scale(p.x)), degree)
  const fit = ols(X, data.train.map((p) => p.y))
  if (!fit.ok) return null
  const pr = (pts: Pt[]) => predict(fit.model, polynomialFeatures(pts.map((p) => scale(p.x)), degree))
  return {
    degree,
    model: fit.model,
    scale,
    trainRmse: rmse(data.train.map((p) => p.y), pr(data.train)),
    valRmse: rmse(data.val.map((p) => p.y), pr(data.val)),
  }
}

export function degreeCurve(data: OverfitData): DegreeFit[] {
  const out: DegreeFit[] = []
  for (let d = 1; d <= OVERFIT_MAX_DEGREE; d += 1) {
    const f = fitDegree(data, d)
    if (f) out.push(f)
  }
  return out
}

/** Degree with the lowest validation RMSE (ties to the lower degree). */
export function bestDegree(curve: readonly DegreeFit[]): number {
  let best = curve[0]
  for (const f of curve) if (f.valRmse < best.valRmse - 1e-12) best = f
  return best.degree
}

/** Accepted: within one degree of the best, never 1 or the max degree. */
export function degreeAccepted(degree: number, best: number): boolean {
  return degree !== 1 && degree !== OVERFIT_MAX_DEGREE && Math.abs(degree - best) <= 1
}

export function curveY(fit: DegreeFit, x: number): number {
  return predict(fit.model, polynomialFeatures([fit.scale(x)], fit.degree))[0]
}

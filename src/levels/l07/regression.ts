// Pure regression maths: OLS by normal equations, metrics, splits and polynomial features (no libraries).
import { mulberry32 } from '../../engine/rng'

export interface OlsModel {
  intercept: number
  coefficients: number[]
}
export type OlsResult = { ok: true; model: OlsModel } | { ok: false; error: string }

export const SINGULAR_ERROR = 'features are perfectly correlated'

/** Solves A x = b by Gaussian elimination with partial pivoting; null when singular (relative tolerance). */
export function solve(A: readonly (readonly number[])[], b: readonly number[]): number[] | null {
  const n = b.length
  const m = A.map((row, i) => [...row, b[i]])
  let largest = 0
  for (const row of A) for (const v of row) largest = Math.max(largest, Math.abs(v))
  const tol = 1e-12 * (largest || 1)
  for (let c = 0; c < n; c += 1) {
    let p = c
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r
    if (!(Math.abs(m[p][c]) > tol)) return null
    ;[m[c], m[p]] = [m[p], m[c]]
    for (let r = c + 1; r < n; r += 1) {
      const f = m[r][c] / m[c][c]
      if (f === 0) continue
      for (let k = c; k <= n; k += 1) m[r][k] -= f * m[c][k]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = m[r][n]
    for (let k = r + 1; k < n; k += 1) s -= m[r][k] * x[k]
    x[r] = s / m[r][r]
  }
  return x
}

/** Ordinary least squares with an intercept. X is rows x features. */
export function ols(X: readonly (readonly number[])[], y: readonly number[]): OlsResult {
  if (X.length !== y.length || X.length === 0) return { ok: false, error: 'X and y must have the same, non-zero length' }
  const p = X[0].length + 1
  if (X.length < p) return { ok: false, error: 'not enough rows for the number of features' }
  const xtx = Array.from({ length: p }, () => new Array<number>(p).fill(0))
  const xty = new Array<number>(p).fill(0)
  X.forEach((row, i) => {
    const r = [1, ...row]
    for (let a = 0; a < p; a += 1) {
      xty[a] += r[a] * y[i]
      for (let b = 0; b < p; b += 1) xtx[a][b] += r[a] * r[b]
    }
  })
  const beta = solve(xtx, xty)
  if (!beta || beta.some((v) => !Number.isFinite(v))) return { ok: false, error: SINGULAR_ERROR }
  return { ok: true, model: { intercept: beta[0], coefficients: beta.slice(1) } }
}

export function predict(model: OlsModel, X: readonly (readonly number[])[]): number[] {
  return X.map((row) => row.reduce((s, v, j) => s + v * (model.coefficients[j] ?? 0), model.intercept))
}

export function residuals(y: readonly number[], yhat: readonly number[]): number[] {
  return y.map((v, i) => v - yhat[i])
}

export function sse(y: readonly number[], yhat: readonly number[]): number {
  return y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0)
}

/** 1 - SSE/SST; constant y gives 1 when SSE is 0, otherwise 0. */
export function r2(y: readonly number[], yhat: readonly number[]): number {
  if (y.length === 0) return 0
  const m = y.reduce((s, v) => s + v, 0) / y.length
  const sst = y.reduce((s, v) => s + (v - m) ** 2, 0)
  const e = sse(y, yhat)
  if (sst === 0) return e === 0 ? 1 : 0
  return 1 - e / sst
}

export function adjustedR2(r2value: number, n: number, p: number): number {
  if (n - p - 1 <= 0) return r2value
  return 1 - ((1 - r2value) * (n - 1)) / (n - p - 1)
}

export function mae(y: readonly number[], yhat: readonly number[]): number {
  return y.length === 0 ? 0 : y.reduce((s, v, i) => s + Math.abs(v - yhat[i]), 0) / y.length
}

export function rmse(y: readonly number[], yhat: readonly number[]): number {
  return y.length === 0 ? 0 : Math.sqrt(sse(y, yhat) / y.length)
}

/** Deterministic disjoint split of indices 0..n-1. */
export function trainTestSplit(n: number, testFraction: number, seed: number): { train: number[]; test: number[] } {
  const order = mulberry32(seed).shuffle(Array.from({ length: n }, (_, i) => i))
  const nTest = Math.min(n - 1, Math.max(1, Math.round(n * testFraction)))
  return { test: order.slice(0, nTest).sort((a, b) => a - b), train: order.slice(nTest).sort((a, b) => a - b) }
}

/** Maps values to [-1, 1] using a (training) range; returns the mapper. */
export function rangeScaler(train: readonly number[]): (v: number) => number {
  const lo = Math.min(...train)
  const hi = Math.max(...train)
  const half = (hi - lo) / 2 || 1
  const mid = (hi + lo) / 2
  return (v) => (v - mid) / half
}

/** [x, x^2, ..., x^degree] per value. Rescale x first so high degrees stay stable. */
export function polynomialFeatures(x: readonly number[], degree: number): number[][] {
  return x.map((v) => Array.from({ length: degree }, (_, k) => v ** (k + 1)))
}

/** Least-squares line for one feature. */
export function simpleLine(x: readonly number[], y: readonly number[]): { slope: number; intercept: number } {
  const fit = ols(x.map((v) => [v]), y)
  return fit.ok ? { slope: fit.model.coefficients[0], intercept: fit.model.intercept } : { slope: 0, intercept: 0 }
}

// Level 03 Stage 3 pure logic: vector operations, operation counting and the Python-loop comparison.
import { argmax, broadcast, broadcastSubtract, createArray, inferDtype, meanAxis, sumAxis } from './nd'
import type { NDArray } from './nd'

export type VectorOp =
  | 'none'
  | 'multiply-2'
  | 'subtract-global-mean'
  | 'subtract-mean'
  | 'sum-axis-0'
  | 'mean-axis-1'
  | 'argmax-columns'
  | 'add-row'

export interface VectorStepResult {
  op: VectorOp
  result: NDArray | null
  code: string
  /** Text result for reductions such as np.argmax that do not return an array. */
  display: string | null
  error: string | null
}

export const subtractColumnMean = (grid: NDArray): NDArray => broadcastSubtract(grid, meanAxis(grid, 0))

export const normaliseCode = 'arr - arr.mean(axis=0)'

const scalarSubtract = (grid: NDArray, amount: number): NDArray =>
  createArray(
    grid.shape,
    grid.data.map((value) => value - amount),
    'float64',
  )

/**
 * Applies one of the operation chips to the grid. Only `subtract-mean` is the
 * normalisation required by the mission; the rest let the player inspect how a
 * vector operation changes the entire array at once.
 */
export function applyVectorOp(grid: NDArray, op: VectorOp, row: NDArray): VectorStepResult {
  if (op === 'none') {
    return { op, result: null, code: 'arr', display: null, error: null }
  }
  if (op === 'multiply-2') {
    const data = grid.data.map((value) => value * 2)
    return {
      op,
      result: createArray(grid.shape, data, inferDtype(data)),
      code: 'arr * 2',
      display: null,
      error: null,
    }
  }
  if (op === 'subtract-global-mean') {
    const mean = grid.data.reduce((total, value) => total + value, 0) / grid.data.length
    return {
      op,
      result: scalarSubtract(grid, mean),
      code: 'arr - arr.mean()',
      display: `arr.mean() = ${Math.round(mean * 100) / 100}`,
      error: null,
    }
  }
  if (op === 'subtract-mean') {
    return {
      op,
      result: subtractColumnMean(grid),
      code: normaliseCode,
      display: null,
      error: null,
    }
  }
  if (op === 'sum-axis-0') {
    return {
      op,
      result: sumAxis(grid, 0),
      code: 'arr.sum(axis=0)',
      display: null,
      error: null,
    }
  }
  if (op === 'mean-axis-1') {
    return {
      op,
      result: meanAxis(grid, 1),
      code: 'arr.mean(axis=1)',
      display: null,
      error: null,
    }
  }
  if (op === 'argmax-columns') {
    const index = argmax(meanAxis(grid, 0))
    return {
      op,
      result: null,
      code: 'np.argmax(arr.mean(axis=0))',
      display: `drifting column index = ${index}`,
      error: null,
    }
  }
  try {
    return {
      op,
      result: broadcast(grid, row, 'add'),
      code: 'arr + row',
      display: null,
      error: null,
    }
  } catch (error) {
    return {
      op,
      result: null,
      code: 'arr + row',
      display: null,
      error: error instanceof Error ? error.message : 'broadcast failed',
    }
  }
}

/** The single chained expression that finds the drifting sensor. */
export const driftExpression = 'np.argmax(arr.mean(axis=0))'

/** Column index of the largest column mean, i.e. the drifting sensor. */
export const findDriftingSensor = (grid: NDArray): number => argmax(meanAxis(grid, 0))

/**
 * Counts elementary cell operations for a naive Python double loop versus a
 * vectorised reduction. This makes the "why vectorise" argument concrete: the
 * loop touches every cell and every column total, while one vector op expresses
 * the whole reduction.
 */
export interface OpCount {
  loopOps: number
  vectorOps: number
}

export function countOperations(rows: number, cols: number): OpCount {
  const cells = rows * cols
  // One Python loop reads and adds every cell once, then scans the per-column totals.
  const loopOps = cells + cols
  // The vectorised reduction is one operation over the whole array.
  const vectorOps = 1
  return { loopOps, vectorOps }
}

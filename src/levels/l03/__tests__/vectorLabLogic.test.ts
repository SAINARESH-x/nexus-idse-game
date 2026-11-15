// Level 03 Stage 3 logic tests: vector ops, drift detection and operation counting.
import { describe, expect, it } from 'vitest'
import { meanAxis, argmax, equalsArray } from '../nd'
import {
  DRIFT_COLUMN,
  SENSOR_COLS,
  SENSOR_COLUMN_MEANS,
  SENSOR_GRID,
  SENSOR_NORMALISED,
  SENSOR_ROWS,
} from '../content'
import { array } from '../nd'
import {
  applyVectorOp,
  countOperations,
  driftExpression,
  findDriftingSensor,
  normaliseCode,
  subtractColumnMean,
} from '../vectorLabLogic'

describe('vectorLab logic', () => {
  it('subtracts column means with broadcasting', () => {
    const result = applyVectorOp(SENSOR_GRID, 'subtract-mean', array([0, 0, 0, 0, 0, 0]))
    expect(result.error).toBeNull()
    expect(result.code).toBe(normaliseCode)
    expect(result.result && equalsArray(result.result, SENSOR_NORMALISED)).toBe(true)
  })

  it('leaves the grid unchanged for the identity op', () => {
    const result = applyVectorOp(SENSOR_GRID, 'none', array([0, 0, 0, 0, 0, 0]))
    expect(result.result).toBeNull()
    expect(result.code).toBe('arr')
  })

  it('broadcasts a row vector across every row', () => {
    const result = applyVectorOp(SENSOR_GRID, 'add-row', array([1, 2, 3, 4, 5, 6]))
    expect(result.error).toBeNull()
    expect(result.result?.shape).toEqual([SENSOR_ROWS, SENSOR_COLS])
  })

  it('reports a broadcast error for a mismatched row length', () => {
    const result = applyVectorOp(SENSOR_GRID, 'add-row', array([1, 2, 3]))
    expect(result.error).toMatch(/broadcast/i)
    expect(result.result).toBeNull()
  })

  it('centres every column to a mean of zero', () => {
    const centred = subtractColumnMean(SENSOR_GRID)
    const means = meanAxis(centred, 0)
    for (const value of means.data) expect(Math.abs(value)).toBeLessThan(1e-9)
  })

  it('finds the drifting sensor column with the largest mean', () => {
    expect(findDriftingSensor(SENSOR_GRID)).toBe(4)
    expect(argmax(SENSOR_COLUMN_MEANS)).toBe(4)
  })

  it('exposes the canonical one-line drift expression', () => {
    expect(driftExpression).toBe('np.argmax(arr.mean(axis=0))')
  })

  it('counts many more operations for the Python loop than the vector op', () => {
    const counts = countOperations(SENSOR_ROWS, SENSOR_COLS)
    expect(counts.loopOps).toBe(SENSOR_ROWS * SENSOR_COLS + SENSOR_COLS)
    expect(counts.vectorOps).toBe(1)
    expect(counts.loopOps).toBeGreaterThan(counts.vectorOps * 10)
  })

  it('doubles every cell with arr * 2', () => {
    const result = applyVectorOp(SENSOR_GRID, 'multiply-2', array([0, 0, 0, 0, 0, 0]))
    expect(result.code).toBe('arr * 2')
    expect(result.result?.data[0]).toBe(SENSOR_GRID.data[0] * 2)
    expect(result.result?.shape).toEqual([SENSOR_ROWS, SENSOR_COLS])
  })

  it('subtracts the global mean with arr - arr.mean()', () => {
    const result = applyVectorOp(SENSOR_GRID, 'subtract-global-mean', array([0, 0, 0, 0, 0, 0]))
    expect(result.code).toBe('arr - arr.mean()')
    expect(result.display).toMatch(/arr\.mean\(\)/)
    const mean = result.result ? result.result.data.reduce((sum, value) => sum + value, 0) / result.result.data.length : 1
    expect(Math.abs(mean)).toBeLessThan(1e-9)
  })

  it('returns column sums and row means', () => {
    const sums = applyVectorOp(SENSOR_GRID, 'sum-axis-0', array([0, 0, 0, 0, 0, 0]))
    const rowMeans = applyVectorOp(SENSOR_GRID, 'mean-axis-1', array([0, 0, 0, 0, 0, 0]))
    expect(sums.code).toBe('arr.sum(axis=0)')
    expect(sums.result?.shape).toEqual([SENSOR_COLS])
    expect(rowMeans.code).toBe('arr.mean(axis=1)')
    expect(rowMeans.result?.shape).toEqual([SENSOR_ROWS])
  })

  it('returns the argmax column without pretending it is an array', () => {
    const result = applyVectorOp(SENSOR_GRID, 'argmax-columns', array([0, 0, 0, 0, 0, 0]))
    expect(result.result).toBeNull()
    expect(result.display).toBe(`drifting column index = ${DRIFT_COLUMN}`)
  })
})
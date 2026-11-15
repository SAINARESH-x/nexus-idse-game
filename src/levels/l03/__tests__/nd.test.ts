// Level 03 mini-NumPy tests: shape, slicing, masks, axis reductions, argmax and broadcasting.
import { describe, expect, it } from 'vitest'
import {
  arange,
  argmax,
  array,
  array2d,
  broadcastAdd,
  broadcastSubtract,
  countTrue,
  dtypeOf,
  equalsArray,
  formatSelection,
  get2d,
  maskGreaterThan,
  meanAxis,
  ndimOf,
  parseSliceExpression,
  pythonSlice,
  reshape,
  shapeOf,
  sumAxis,
  take,
  zeros,
} from '../nd'
import {
  DRIFT_COLUMN,
  DRIFT_INDEX,
  L03_SLICE_GOALS,
  SENSOR_COLUMN_MEANS,
  SENSOR_GRID,
  SENSOR_NORMALISED,
  maskGoalMatches,
  selectionMatches,
} from '../content'

describe('shape and construction', () => {
  it('reports shape, ndim and dtype', () => {
    const grid = array2d([
      [1, 2, 3],
      [4, 5, 6],
    ])
    expect(shapeOf(grid)).toEqual([2, 3])
    expect(ndimOf(grid)).toBe(2)
    expect(dtypeOf(grid)).toBe('int64')
    expect(dtypeOf(zeros([3]))).toBe('float64')
  })

  it('builds arange with an exclusive stop', () => {
    expect(arange(6).data).toEqual([0, 1, 2, 3, 4, 5])
    expect(arange(2, 8, 2).data).toEqual([2, 4, 6])
  })

  it('creates a zero array of the requested shape', () => {
    const block = zeros([2, 3])
    expect(block.shape).toEqual([2, 3])
    expect(block.data).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('reshapes without changing values', () => {
    const block = reshape(arange(6), [2, 3])
    expect(block.shape).toEqual([2, 3])
    expect(get2d(block, 1, 2)).toBe(5)
  })

  it('explains a reshape that cannot preserve the value count', () => {
    expect(() => reshape(arange(12), [5, 3])).toThrow(/cannot reshape array of size 12/)
  })

  it('reshapes twelve values into the 2 x 2 x 3 side-op target', () => {
    const block = reshape(arange(1, 13), [2, 2, 3])
    expect(block.shape).toEqual([2, 2, 3])
    expect(block.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

describe('Python slice semantics', () => {
  it('treats stop as exclusive', () => {
    expect(pythonSlice(6, { start: 1, stop: 4 })).toEqual([1, 2, 3])
  })

  it('resolves negative indices from the end', () => {
    expect(pythonSlice(6, { start: -3 })).toEqual([3, 4, 5])
    expect(pythonSlice(6, { start: -2, stop: 6 })).toEqual([4, 5])
  })

  it('supports a positive step', () => {
    expect(pythonSlice(6, { step: 2 })).toEqual([0, 2, 4])
  })

  it('supports a reverse step', () => {
    expect(pythonSlice(6, { step: -1 })).toEqual([5, 4, 3, 2, 1, 0])
  })
})

describe('selection parser', () => {
  it('selects one row', () => {
    const parsed = parseSliceExpression('arr[2]', SENSOR_GRID)
    expect(parsed.ok).toBe(true)
    expect(parsed.rowIndices).toEqual([2])
    expect(parsed.colIndices).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('selects a rectangular block with exclusive stops', () => {
    const parsed = parseSliceExpression('arr[1:4, 2:5]', SENSOR_GRID)
    expect(parsed.rowIndices).toEqual([1, 2, 3])
    expect(parsed.colIndices).toEqual([2, 3, 4])
  })

  it('selects a stepped column range', () => {
    const parsed = parseSliceExpression('arr[:, ::2]', SENSOR_GRID)
    expect(parsed.ok).toBe(true)
    expect(parsed.colIndices).toEqual([0, 2, 4])
  })

  it('normalises negative indices', () => {
    const parsed = parseSliceExpression('arr[-1, -2]', SENSOR_GRID)
    expect(parsed.ok).toBe(true)
    expect(parsed.cells).toEqual([[5, 4]])
  })

  it('parses a boolean mask', () => {
    const parsed = parseSliceExpression('arr[arr > 30]', SENSOR_GRID)
    expect(parsed.ok).toBe(true)
    expect(parsed.maskThreshold).toBe(30)
    expect(parsed.cells).toEqual([
      [3, 4],
      [4, 4],
      [5, 4],
    ])
  })

  it('rejects an out-of-bounds index', () => {
    const parsed = parseSliceExpression('arr[9]', SENSOR_GRID)
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/out of bounds/)
  })

  it('formats rows, blocks and steps back to slice text', () => {
    expect(formatSelection(SENSOR_GRID, [2], [0, 1, 2, 3, 4, 5])).toBe('arr[2]')
    expect(formatSelection(SENSOR_GRID, [1, 2, 3], [2, 3, 4])).toBe('arr[1:4, 2:5]')
    expect(formatSelection(SENSOR_GRID, [0, 1, 2, 3, 4, 5], [0, 2, 4])).toBe('arr[:, ::2]')
  })
})

describe('axis operations, masks and broadcasting', () => {
  it('sums down columns and across rows', () => {
    const grid = array2d([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
    expect(sumAxis(grid, 0).data).toEqual([9, 12])
    expect(sumAxis(grid, 1).data).toEqual([3, 7, 11])
  })

  it('takes a rectangular copy with take()', () => {
    const block = take(SENSOR_GRID, [1, 2], [2, 3])
    expect(block.shape).toEqual([2, 2])
    expect(block.data).toEqual([18, 27, 21, 26])
  })

  it('finds argmax of the column means', () => {
    expect(meanAxis(SENSOR_GRID, 0).shape).toEqual([6])
    expect(argmax(SENSOR_COLUMN_MEANS)).toBe(DRIFT_COLUMN)
    expect(DRIFT_INDEX).toBe(4)
  })

  it('counts threshold masks for the slice goal', () => {
    expect(countTrue(maskGreaterThan(SENSOR_GRID, 30))).toBe(3)
  })

  it('broadcasts a row vector across a 2D array', () => {
    const sample = array2d([
      [1, 2, 3],
      [4, 5, 6],
    ])
    const row = array([10, 20, 30])
    expect(broadcastAdd(sample, row).data).toEqual([11, 22, 33, 14, 25, 36])
    expect(broadcastSubtract(sample, row).data).toEqual([-9, -18, -27, -6, -15, -24])
  })

  it('rejects a broadcast with the wrong width', () => {
    expect(() => broadcastAdd(SENSOR_GRID, array([1, 2]))).toThrow(/could not be broadcast/)
  })

  it('normalises the sensor grid by subtracting column means', () => {
    expect(equalsArray(SENSOR_NORMALISED, broadcastSubtract(SENSOR_GRID, SENSOR_COLUMN_MEANS))).toBe(true)
    for (let col = 0; col < 6; col += 1) {
      let sum = 0
      for (let row = 0; row < 6; row += 1) sum += SENSOR_NORMALISED.data[row * 6 + col]
      expect(Math.abs(sum)).toBeLessThan(1e-9)
    }
  })

  it('matches the published slice goals', () => {
    expect(selectionMatches(L03_SLICE_GOALS[1], [0, 1, 2, 3, 4, 5], [4])).toBe(true)
    expect(selectionMatches(L03_SLICE_GOALS[2], [1, 2, 3], [2, 3, 4])).toBe(true)
    expect(maskGoalMatches(L03_SLICE_GOALS[4], 30, 3)).toBe(true)
    expect(maskGoalMatches(L03_SLICE_GOALS[4], 29, 3)).toBe(false)
  })
})

// Hand-computed checks for the shared statistics helpers.
import { describe, expect, it } from 'vitest'
import {
  corr, groupAgg, histogramBins, iqrOutliers, mean, median, mode, permutationPValue, popStd, quantile, rate,
  std, variance, zscores,
} from '../stats'

describe('stats', () => {
  it('centre and spread', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(32 / 7, 12)
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12)
    expect(popStd([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
  })
  it('empty and degenerate inputs never throw', () => {
    expect(mean([])).toBeNaN()
    expect(median([])).toBeNaN()
    expect(std([5])).toBeNaN()
    expect(popStd([5])).toBe(0)
    expect(corr([1, 1, 1], [1, 2, 3])).toBeNaN()
    expect(zscores([3, 3, 3])).toEqual([0, 0, 0])
    expect(histogramBins([], 5)).toEqual([])
    expect(rate([])).toBeNaN()
    expect(mode([])).toBeUndefined()
  })
  it('quantile uses pandas linear interpolation', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75)
    expect(quantile([1, 2, 3, 4], 0.75)).toBe(3.25)
    expect(quantile([10, 20], 0.1)).toBe(11)
    expect(quantile([7], 0.9)).toBe(7)
  })
  it('corr, rate, mode, zscores', () => {
    expect(corr([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12)
    expect(corr([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12)
    expect(corr([1, 2, 3, 4], [1, 3, 2, 4])).toBeCloseTo(0.8, 12)
    expect(rate([1, 0, 0, 1])).toBe(0.5)
    expect(mode([3, 1, 3, 1, 2])).toBe(1)
    const z = zscores([1, 2, 3])
    expect(z[0]).toBeCloseTo(-1, 12)
    expect(z[2]).toBeCloseTo(1, 12)
  })
  it('groupAgg', () => {
    const rows = [
      { g: 'b', x: 4 }, { g: 'a', x: 1 }, { g: 'a', x: 3 }, { g: 'b', x: null }, { g: 'b', x: 6 },
    ]
    expect(groupAgg(rows, 'g', 'x', 'mean')).toEqual([
      { key: 'a', value: 2, n: 2 },
      { key: 'b', value: 5, n: 2 },
    ])
    expect(groupAgg(rows, 'g', 'x', 'count').map((r) => r.value)).toEqual([2, 2])
    expect(groupAgg(rows, 'g', 'x', 'max').map((r) => r.value)).toEqual([3, 6])
    expect(groupAgg(rows, 'g', 'x', 'std')[0].value).toBeCloseTo(Math.SQRT2, 12)
    expect(groupAgg([{ y: 10, x: 1 }, { y: 2, x: 5 }], 'y', 'x', 'min').map((r) => r.key)).toEqual(['2', '10'])
  })
  it('histogramBins', () => {
    const b = histogramBins([0, 1, 2, 3, 4], 2)
    expect(b).toEqual([
      { x0: 0, x1: 2, count: 2 },
      { x0: 2, x1: 4, count: 3 },
    ])
    expect(histogramBins([5, 5], 3)).toEqual([{ x0: 4.5, x1: 5.5, count: 2 }])
    expect(histogramBins([35, 39.9, 40, 100], [35, 40, 100]).map((x) => x.count)).toEqual([2, 2])
  })
  it('iqrOutliers', () => {
    const r = iqrOutliers([1, 2, 3, 4, 100])
    expect(r.q1).toBe(2)
    expect(r.q3).toBe(4)
    expect(r.upper).toBe(7)
    expect(r.indices).toEqual([4])
    expect(iqrOutliers([1, 2, 3, 4, 100], 50).outliers).toEqual([])
  })
  it('permutationPValue', () => {
    expect(permutationPValue([1, 2, 3], [1, 2, 3], 200, 7)).toBe(1)
    expect(permutationPValue([1, 2, 3], [4, 5, 6], 200, 7)).toBe(permutationPValue([1, 2, 3], [4, 5, 6], 200, 7))
    expect(Math.abs(permutationPValue([1, 2, 3], [4, 5, 6], 20000, 3) - 0.1)).toBeLessThan(0.02)
    const a = Array.from({ length: 10 }, (_, i) => i)
    const b = a.map((x) => x + 100)
    expect(permutationPValue(a, b, 1000, 11)).toBeLessThan(0.01)
    expect(permutationPValue([], [1], 10, 1)).toBeNaN()
  })
})

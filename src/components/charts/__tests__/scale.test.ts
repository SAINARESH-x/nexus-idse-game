// Scale maths tests for the SVG chart helpers.
import { describe, expect, it } from 'vitest'
import { bandScale, extent, fmt, linearScale, niceDomain, niceStep, niceTicks } from '../scale'

describe('scale', () => {
  it('linear scale and invert', () => {
    const s = linearScale([0, 10], [0, 100])
    expect(s(5)).toBe(50)
    expect(s.invert(25)).toBe(2.5)
    const flipped = linearScale([0, 10], [100, 0])
    expect(flipped(10)).toBe(0)
    expect(linearScale([3, 3], [0, 100])(3)).toBe(50)
  })
  it('nice steps and ticks', () => {
    expect(niceStep(10, 5)).toBe(2)
    expect(niceStep(0.7, 5)).toBeCloseTo(0.2, 12)
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(35, 100, 5)).toEqual([40, 60, 80, 100])
    expect(niceTicks(4, 4)).toEqual([4])
    expect(niceTicks(NaN, 1)).toEqual([])
    expect(niceDomain(3.2, 9.7)).toEqual([2, 10])
    expect(niceDomain(0, 0)).toEqual([0, 1])
  })
  it('band scale, extent, fmt', () => {
    const b = bandScale(['a', 'b'], [0, 100], 0)
    expect(b('b')).toBe(50)
    expect(b.bandwidth).toBe(50)
    expect(b('z')).toBeNaN()
    expect(extent([3, NaN, -1])).toEqual([-1, 3])
    expect(extent([])).toEqual([0, 1])
    expect(fmt(NaN)).toBe('n/a')
    expect(fmt(1.23456)).toBe('1.23')
  })
})

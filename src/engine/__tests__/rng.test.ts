// RNG tests: determinism, ranges, shuffle permutation and seed mixing.
import { describe, expect, it } from 'vitest'
import { mixSeed, mulberry32 } from '../rng'

describe('mulberry32', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const c = mulberry32(43)
    const seqA = Array.from({ length: 5 }, () => a.next())
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA)
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(seqA)
  })

  it('keeps helpers inside their ranges', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i += 1) {
      const n = rng.next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
      const k = rng.int(3, 6)
      expect(k).toBeGreaterThanOrEqual(3)
      expect(k).toBeLessThanOrEqual(6)
    }
  })

  it('shuffles into a permutation without mutating input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = mulberry32(1).shuffle(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual(input)
  })

  it('produces roughly standard normal samples', () => {
    const rng = mulberry32(99)
    const xs = Array.from({ length: 4000 }, () => rng.normal(0, 1))
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1))
    expect(Math.abs(mean)).toBeLessThan(0.06)
    expect(Math.abs(sd - 1)).toBeLessThan(0.06)
  })
})

describe('mixSeed', () => {
  it('is deterministic, order-sensitive and unsigned 32-bit', () => {
    expect(mixSeed(1, 2, 3)).toBe(mixSeed(1, 2, 3))
    expect(mixSeed(1, 2, 3)).not.toBe(mixSeed(3, 2, 1))
    const v = mixSeed(5000, 77, 0)
    expect(Number.isInteger(v)).toBe(true)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(2 ** 32)
  })
})

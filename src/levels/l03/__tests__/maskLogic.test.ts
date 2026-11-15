// Level 03 Mask Master logic tests: threshold masks, precision, recall and perfect isolation.
import { describe, expect, it } from 'vitest'
import { L03_ANOMALIES, L03_MASK_BOUNDS } from '../content'
import { isPerfectMask, scoreMask } from '../maskLogic'

describe('mask master logic', () => {
  it('isolates exactly the anomalous cells at the tight bounds', () => {
    const score = scoreMask(L03_MASK_BOUNDS.min, L03_MASK_BOUNDS.max, L03_ANOMALIES)
    expect(score.selected).toHaveLength(L03_ANOMALIES.length)
    expect(score.truePositives).toBe(L03_ANOMALIES.length)
    expect(score.falsePositives).toBe(0)
    expect(score.falseNegatives).toBe(0)
    expect(isPerfectMask(score, L03_ANOMALIES.length)).toBe(true)
  })

  it('scores precision and recall as 1 for a perfect mask', () => {
    const score = scoreMask(L03_MASK_BOUNDS.min, L03_MASK_BOUNDS.max, L03_ANOMALIES)
    expect(score.precision).toBe(1)
    expect(score.recall).toBe(1)
  })

  it('punishes a raised lower bound with false positives', () => {
    const score = scoreMask(22, L03_MASK_BOUNDS.max, L03_ANOMALIES)
    expect(score.falsePositives).toBeGreaterThan(0)
    expect(score.precision).toBeLessThan(1)
    expect(score.recall).toBe(1)
    expect(isPerfectMask(score, L03_ANOMALIES.length)).toBe(false)
  })

  it('punishes a lowered upper bound with false positives', () => {
    const score = scoreMask(L03_MASK_BOUNDS.min, 28, L03_ANOMALIES)
    expect(score.falsePositives).toBeGreaterThan(0)
    expect(score.precision).toBeLessThan(1)
    expect(score.recall).toBe(1)
    expect(isPerfectMask(score, L03_ANOMALIES.length)).toBe(false)
  })

  it('reports misses when the band excludes an anomaly', () => {
    const score = scoreMask(17, L03_MASK_BOUNDS.max, L03_ANOMALIES)
    expect(score.falseNegatives).toBeGreaterThan(0)
    expect(score.recall).toBeLessThan(1)
    expect(isPerfectMask(score, L03_ANOMALIES.length)).toBe(false)
  })
})
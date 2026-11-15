// Level 03 Mask Master logic tests: IQR fences, strict threshold detection, confusion metrics and completion.
import { describe, expect, it } from 'vitest'
import { L03_MASK_MASTER_ANOMALIES, L03_MASK_MASTER_VALUES } from '../content'
import {
  INITIAL_EXPLORATION,
  calculateIqr,
  detectionMeetsTarget,
  evaluateDetections,
  explorationComplete,
  isPerfectDetection,
  judgeSubmission,
  parseReadingInput,
  recordExploration,
  thresholdFeedback,
} from '../maskLogic'
import type { IqrStatistics } from '../maskLogic'

const ROWS = L03_MASK_MASTER_VALUES.length
const COLS = L03_MASK_MASTER_VALUES[0].length
const flat = (grid: number[][] = L03_MASK_MASTER_VALUES) => grid.flat()

const statsOf = (values: number[]): IqrStatistics => {
  const result = calculateIqr(values)
  if (!result.ok) throw new Error(result.error)
  return result.stats
}

const detect = (lower: number, upper: number, values = flat(), fences: IqrStatistics | null = null) =>
  evaluateDetections(values, ROWS, COLS, lower, upper, L03_MASK_MASTER_ANOMALIES, fences)

const editGrid = (row: number, col: number, value: number): number[][] =>
  L03_MASK_MASTER_VALUES.map((line, r) => line.map((cell, c) => (r === row && c === col ? value : cell)))

describe('original Mask Master dataset', () => {
  it('has exactly 36 finite readings in a 6x6 grid', () => {
    expect(ROWS).toBe(6)
    expect(L03_MASK_MASTER_VALUES.every((row) => row.length === 6)).toBe(true)
    expect(flat()).toHaveLength(36)
    expect(flat().every(Number.isFinite)).toBe(true)
  })

  it('produces the documented median-of-halves quartiles and fences', () => {
    const stats = statsOf(flat())
    expect(stats.count).toBe(36)
    expect(stats.q1).toBe(23.5)
    expect(stats.q3).toBe(28.5)
    expect(stats.iqr).toBe(5)
    expect(stats.lowerFence).toBe(16)
    expect(stats.upperFence).toBe(36)
  })

  it('has one low and at least three high labelled anomalies', () => {
    const anomalyValues = L03_MASK_MASTER_ANOMALIES.map(([r, c]) => L03_MASK_MASTER_VALUES[r][c])
    const stats = statsOf(flat())
    expect(anomalyValues.filter((v) => v < stats.lowerFence)).toHaveLength(1)
    expect(anomalyValues.filter((v) => v > stats.upperFence).length).toBeGreaterThanOrEqual(3)
  })

  it('flags exactly the intended anomalies at the IQR fences and no normal reading', () => {
    const stats = statsOf(flat())
    const score = detect(stats.lowerFence, stats.upperFence)
    const flagged = score.selected.map(([r, c]) => `${r},${c}`).sort()
    const expected = L03_MASK_MASTER_ANOMALIES.map(([r, c]) => `${r},${c}`).sort()
    expect(flagged).toEqual(expected)
    expect(score.falsePositives).toBe(0)
    expect(score.falseNegatives).toBe(0)
    expect(score.trueNegatives).toBe(32)
    expect(isPerfectDetection(score)).toBe(true)
  })
})

describe('calculateIqr', () => {
  it('gives the same result for sorted and unsorted input', () => {
    const unsorted = [9, 1, 7, 3, 5, 2, 8, 4]
    const sorted = [...unsorted].sort((a, b) => a - b)
    expect(calculateIqr(unsorted)).toEqual(calculateIqr(sorted))
  })

  it('uses median-of-halves for even and odd counts', () => {
    // Even: halves [1,2,3,4] and [5,7,8,9] -> Q1 2.5, Q3 7.5.
    expect(statsOf([1, 2, 3, 4, 5, 7, 8, 9])).toMatchObject({ q1: 2.5, q3: 7.5, iqr: 5, lowerFence: -5, upperFence: 15 })
    // Odd: the median 5 is excluded -> halves [1,2,3] and [7,8,9].
    expect(statsOf([1, 2, 3, 5, 7, 8, 9])).toMatchObject({ q1: 2, q3: 8, iqr: 6 })
  })

  it('handles duplicate values, including a zero IQR', () => {
    expect(statsOf([4, 4, 4, 4, 4, 4])).toMatchObject({ q1: 4, q3: 4, iqr: 0, lowerFence: 4, upperFence: 4 })
    expect(statsOf([2, 2, 3, 3, 3, 3, 9, 9])).toMatchObject({ q1: 2.5, q3: 6 })
  })

  it('rejects empty, too-short and non-finite input without throwing', () => {
    expect(calculateIqr([]).ok).toBe(false)
    expect(calculateIqr([1, 2, 3]).ok).toBe(false)
    expect(calculateIqr([1, 2, Number.NaN, 4]).ok).toBe(false)
    expect(calculateIqr([1, 2, Number.POSITIVE_INFINITY, 4]).ok).toBe(false)
  })

  it('recalculates from an edited dataset and never mutates its input', () => {
    const edited = flat(editGrid(2, 2, 90))
    const copy = [...edited]
    const stats = statsOf(edited)
    expect(edited).toEqual(copy)
    // Moving one 26 to 90 leaves the lower half alone but shifts the upper half.
    expect(stats.q1).toBe(23.5)
    expect(stats.q3).toBe(29)
    // Editing reading [0,0] from 22 to 40 shifts both quartiles up by half a unit.
    expect(statsOf(flat(editGrid(0, 0, 40)))).toMatchObject({ q1: 24, q3: 29, iqr: 5, lowerFence: 16.5, upperFence: 36.5 })
  })
})

describe('strict threshold detection', () => {
  it('flags readings strictly below the lower threshold and strictly above the upper', () => {
    const score = detect(16, 36)
    expect(score.selected).toContainEqual([0, 5])
    expect(score.selected).toContainEqual([5, 5])
  })

  it('does not flag a reading exactly equal to either threshold', () => {
    // 5 is the low anomaly and 66 the highest anomaly.
    const atLower = detect(5, 36)
    expect(atLower.selected).not.toContainEqual([0, 5])
    const atUpper = detect(16, 66)
    expect(atUpper.selected).not.toContainEqual([5, 5])
    expect(atUpper.selected).toEqual([[0, 5]])
  })

  it('updates detections when thresholds move', () => {
    expect(detect(16, 36).selected).toHaveLength(4)
    expect(detect(16, 30).selected.length).toBeGreaterThan(4)
    expect(detect(16, 60).selected).toHaveLength(2)
  })
})

describe('confusion matrix and metrics', () => {
  it('counts TP, FP, TN and FN against the labels', () => {
    // Upper 31: 32 is a false positive. Lower 4: the low anomaly 5 is missed.
    const score = detect(4, 31)
    expect(score.truePositives).toBe(3)
    expect(score.falsePositives).toBe(1)
    expect(score.falseNegatives).toBe(1)
    expect(score.trueNegatives).toBe(31)
    expect(score.truePositives + score.falsePositives + score.falseNegatives + score.trueNegatives).toBe(36)
    expect(score.precision).toBe(0.75)
    expect(score.recall).toBe(0.75)
    expect(score.falsePositivesHigh).toBe(1)
    expect(score.falseNegativesLow).toBe(1)
  })

  it('separates low-side and high-side false positives', () => {
    const score = detect(22, 36)
    // Below 22: 5 is the true anomaly; 20 and 21 are normal readings.
    expect(score.falsePositivesLow).toBe(2)
    expect(score.falsePositivesHigh).toBe(0)
  })

  it('returns 0 instead of NaN when a denominator is empty', () => {
    const none = detect(-20, 110)
    expect(none.selected).toHaveLength(0)
    expect(none.precisionDefined).toBe(false)
    expect(none.precision).toBe(0)
    expect(none.recall).toBe(0)
    expect(Number.isNaN(none.f1)).toBe(false)

    const noLabels = evaluateDetections(flat(), ROWS, COLS, 16, 36, [])
    expect(noLabels.recallDefined).toBe(false)
    expect(noLabels.recall).toBe(0)
    expect(Number.isFinite(noLabels.precision)).toBe(true)
  })

  it('keeps the ground-truth labels fixed when readings are edited', () => {
    const labelsBefore = JSON.stringify(L03_MASK_MASTER_ANOMALIES)
    // A normal cell edited to an extreme value becomes a false positive.
    const extremeNormal = detect(16, 36, flat(editGrid(1, 1, 95)))
    expect(extremeNormal.falsePositives).toBe(1)
    expect(extremeNormal.truePositives).toBe(4)
    // An anomaly edited to a normal value becomes a false negative.
    const disguised = statsOf(flat(editGrid(5, 5, 25)))
    const hidden = detect(disguised.lowerFence, disguised.upperFence, flat(editGrid(5, 5, 25)), disguised)
    expect(hidden.falseNegatives).toBe(1)
    expect(hidden.falseNegativesDisguised).toBe(1)
    expect(JSON.stringify(L03_MASK_MASTER_ANOMALIES)).toBe(labelsBefore)
    expect(L03_MASK_MASTER_VALUES[5][5]).toBe(66)
  })
})

describe('result-based feedback', () => {
  const stats = statsOf(flat())

  it('praises a perfect detection', () => {
    expect(thresholdFeedback(detect(16, 36), stats)).toMatch(/successfully isolating/)
  })

  it('reports high-side false positives and missed high anomalies', () => {
    expect(thresholdFeedback(detect(16, 30), stats)).toMatch(/flagging normal readings/)
    expect(thresholdFeedback(detect(16, 60), stats)).toMatch(/high anomalies are now being missed/)
  })

  it('reports low-side false positives and a missed low anomaly', () => {
    expect(thresholdFeedback(detect(22, 36), stats)).toMatch(/Normal low readings are being incorrectly flagged/)
    expect(thresholdFeedback(detect(2, 36), stats)).toMatch(/low anomaly is escaping detection/)
  })

  it('explains an anomaly edited to look normal', () => {
    const values = flat(editGrid(0, 5, 24))
    const edited = statsOf(values)
    const score = detect(edited.lowerFence, edited.upperFence, values, edited)
    expect(thresholdFeedback(score, edited)).toMatch(/inside the IQR fences/)
  })

  it('never names cell coordinates', () => {
    for (const [lower, upper] of [[2, 30], [22, 60], [16, 36], [-20, 110]]) {
      expect(thresholdFeedback(detect(lower, upper), stats)).not.toMatch(/\[\d,\s*\d\]|row \d/)
    }
  })
})

describe('input validation', () => {
  it('accepts finite readings in range and rejects everything else', () => {
    expect(parseReadingInput(' 42.5 ')).toEqual({ ok: true, value: 42.5 })
    expect(parseReadingInput('').ok).toBe(false)
    expect(parseReadingInput('   ').ok).toBe(false)
    expect(parseReadingInput('NaN').ok).toBe(false)
    expect(parseReadingInput('Infinity').ok).toBe(false)
    expect(parseReadingInput('12abc').ok).toBe(false)
    expect(parseReadingInput('101').ok).toBe(false)
    expect(parseReadingInput('-21').ok).toBe(false)
  })
})

describe('completion rule', () => {
  it('requires both a false-positive and a missed-anomaly experiment', () => {
    let state = INITIAL_EXPLORATION
    state = recordExploration(state, detect(16, 36))
    expect(explorationComplete(state)).toBe(false)
    state = recordExploration(state, detect(16, 30))
    expect(state.sawFalsePositive).toBe(true)
    expect(explorationComplete(state)).toBe(false)
    state = recordExploration(state, detect(16, 60))
    expect(explorationComplete(state)).toBe(true)
  })

  it('rejects a perfect detection submitted without experimenting', () => {
    expect(judgeSubmission(detect(16, 36), INITIAL_EXPLORATION)).toEqual({ accepted: false, reason: 'explore' })
  })

  it('rejects weak detections and accepts precision and recall of at least 80%', () => {
    const explored = { sawFalsePositive: true, sawFalseNegative: true }
    expect(judgeSubmission(detect(4, 31), explored)).toEqual({ accepted: false, reason: 'target' })
    expect(judgeSubmission(detect(16, 60), explored)).toEqual({ accepted: false, reason: 'target' })
    expect(judgeSubmission(detect(16, 36), explored)).toEqual({ accepted: true })
    // One false positive with every anomaly found: precision 80%, recall 100%.
    const oneFp = detect(16, 31.5)
    expect(oneFp.precision).toBe(0.8)
    expect(detectionMeetsTarget(oneFp)).toBe(true)
    expect(judgeSubmission(oneFp, explored)).toEqual({ accepted: true })
  })
})

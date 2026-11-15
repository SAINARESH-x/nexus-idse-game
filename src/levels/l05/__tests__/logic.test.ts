// Level 05 pure logic tests: group-by, describe, brush maths, cliff, insight check, correlation and outliers.
import { describe, expect, it } from 'vitest'
import { steepestFall } from '../../../engine/cohort'
import { groupAgg, mean, median } from '../../../engine/stats'
import type { RecordRow } from '../../../engine/stats'
import { SEED_SLOTS, sessionSeed } from '../../../game/levelSession'
import { l05Cohort } from '../data'
import { describeColumn, GROUP_GOALS, judgePin, runGroupBy, skewness, topKeys } from '../describe'
import { brushStats, binnedRates, binsInRange, inRange, isCliffBoundary, normaliseRange } from '../pattern'
import { insightCheck, rangeDirection } from '../insightCheck'
import { pairCorr, withinBandCorr } from '../correlation'
import { injectOutliers, scoreOutliers, applyAction } from '../outliers'

const slots = Array.from({ length: SEED_SLOTS }, (_, i) => sessionSeed(5, i))
const rows = l05Cohort(slots[0])

describe('group-by builder', () => {
  it('equals stats.groupAgg for every spec', () => {
    for (const by of ['department', 'year', 'scholarship']) for (const fn of ['mean', 'median', 'count'] as const)
      expect(runGroupBy(rows, { by, col: 'cgpa', fn })).toEqual(groupAgg(rows as unknown as RecordRow[], by, 'cgpa', fn))
  })
  it('topKeys accepts ties and judgePin checks query then key', () => {
    expect(topKeys([{ key: 'a', value: 2, n: 1 }, { key: 'b', value: 2, n: 1 }, { key: 'c', value: 1, n: 1 }])).toEqual(['a', 'b'])
    const goal = GROUP_GOALS[0]
    const best = topKeys(runGroupBy(rows, goal.spec))[0]
    expect(judgePin(rows, goal, goal.spec, best)).toBe('correct')
    expect(judgePin(rows, goal, { ...goal.spec, fn: 'mean' }, best)).toBe('wrong-query')
    const other = runGroupBy(rows, goal.spec).find((r) => !topKeys(runGroupBy(rows, goal.spec)).includes(r.key))
    if (other) expect(judgePin(rows, goal, goal.spec, other.key)).toBe('wrong-key')
  })
})

describe('describeColumn', () => {
  it('hand example', () => {
    const s = describeColumn([1, 2, 2, 3, 10])
    expect(s.mean).toBe(3.6)
    expect(s.median).toBe(2)
    expect(s.mode).toBe(2)
    expect(s.q1).toBe(2)
    expect(s.q3).toBe(3)
    expect(s.iqr).toBe(1)
    expect(s.variance).toBeCloseTo(13.3, 6)
    expect(s.shape).toBe('right-skewed')
    expect(skewness([1, 2, 3])).toBeCloseTo(0, 9)
  })
  it('study_hours is right-skewed for every slot (mean > median)', () => {
    for (const seed of slots) {
      const v = l05Cohort(seed).map((r) => r.study_hours)
      expect(mean(v)).toBeGreaterThan(median(v))
      expect(describeColumn(v).shape).toBe('right-skewed')
    }
  })
})

describe('brush maths', () => {
  it('range membership and normalisation', () => {
    expect(inRange(59.9, [35, 60])).toBe(true)
    expect(inRange(60, [35, 60])).toBe(false)
    expect(inRange(100, [90, 100])).toBe(true)
    expect(normaliseRange([70.04, 20])).toEqual([35, 70])
  })
  it('hand-computed stats', () => {
    const toy = [
      { attendance: 40, dropped_out: 1 as const }, { attendance: 45, dropped_out: 1 as const },
      { attendance: 80, dropped_out: 0 as const }, { attendance: 90, dropped_out: 0 as const },
    ]
    const s = brushStats(toy, [35, 60])
    expect(s.nIn).toBe(2)
    expect(s.rateIn).toBe(1)
    expect(s.overall).toBe(0.5)
    expect(s.lift).toBe(2)
    expect(s.coverage).toBe(0.5)
    expect(s.meetsGoal).toBe(true)
    expect(brushStats(toy, [95, 96]).lift).toBeNaN()
  })
  it('35-60 meets the goal for every slot; bins cover 13 cells', () => {
    for (const seed of slots) expect(brushStats(l05Cohort(seed), [35, 60]).meetsGoal).toBe(true)
    const bins = binnedRates(rows)
    expect(bins).toHaveLength(13)
    expect(bins.reduce((a, b) => a + b.n, 0)).toBe(240)
    expect(binsInRange(bins, [35, 60])).toHaveLength(5)
  })
})

describe('Dropout Cliff', () => {
  it('boundary within 3 points of steepestFall', () => {
    expect(isCliffBoundary([35, 60], 60)).toBe(true)
    expect(isCliffBoundary([35, 57], 60)).toBe(true)
    expect(isCliffBoundary([35, 56.9], 60)).toBe(false)
    expect(isCliffBoundary([35, 60], NaN)).toBe(false)
    for (const seed of slots) expect(isCliffBoundary([35, 60], steepestFall(l05Cohort(seed)))).toBe(true)
  })
})

describe('insightCheck', () => {
  const s = brushStats(rows, [35, 60])
  const good = { variable: 'attendance' as const, direction: 'below' as const, lift: Math.round(s.lift * 2) / 2, n: s.nIn, caveat: 'association' as const }
  it('accepts a correct claim', () => {
    expect(rangeDirection([35, 60])).toBe('below')
    expect(rangeDirection([60, 100])).toBe('above')
    expect(rangeDirection([50, 70])).toBe('between')
    expect(insightCheck(good, [35, 60], s).ok).toBe(true)
  })
  it('refuses missing caveat, causal caveat, wrong lift, n, variable and direction', () => {
    expect(insightCheck({ ...good, caveat: null }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, caveat: 'none' }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, caveat: 'causation' }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, lift: s.lift + 1 }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, n: Math.round(s.nIn * 1.2) }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, variable: 'cgpa' }, [35, 60], s).ok).toBe(false)
    expect(insightCheck({ ...good, direction: 'above' }, [35, 60], s).ok).toBe(false)
  })
})

describe('correlation and confounder', () => {
  it('within study_hours bands the library_visits association weakens for every slot', () => {
    for (const seed of slots) {
      const c = l05Cohort(seed)
      const st = withinBandCorr(c, 'library_visits', 'cgpa', 'study_hours', 3)
      expect(st.raw).toBeCloseTo(pairCorr(c, 'library_visits', 'cgpa'), 12)
      expect(st.raw).toBeGreaterThan(0.2)
      expect(Math.abs(st.within)).toBeLessThan(0.75 * Math.abs(st.raw))
      expect(st.bands.reduce((a, b) => a + b.n, 0)).toBe(240)
    }
  })
  it('one band equals the raw correlation', () => {
    const st = withinBandCorr(rows, 'library_visits', 'cgpa', 'study_hours', 1)
    expect(st.within).toBeCloseTo(st.raw, 12)
  })
})

describe('injectOutliers', () => {
  it('is deterministic and injects 6 rows', () => {
    const a = injectOutliers(rows, 7)
    expect(a).toEqual(injectOutliers(rows, 7))
    expect(a.injected).toHaveLength(6)
    expect(new Set(a.injected).size).toBe(6)
  })
  it('k = 1.5 gives recall 1 and k = 6 gives recall 0 for all 50 slots', () => {
    for (const seed of slots) {
      const data = injectOutliers(l05Cohort(seed), seed)
      expect(scoreOutliers(data, 1.5).recall).toBe(1)
      expect(scoreOutliers(data, 6).recall).toBe(0)
    }
  })
  it('zero-safe precision and actions', () => {
    const data = injectOutliers(rows, 1)
    const none = scoreOutliers(data, 50)
    expect(none.precision).toBe(0)
    expect(none.precisionDefined).toBe(false)
    const s = scoreOutliers(data, 1.5)
    expect(applyAction(data, s, 'remove')).toHaveLength(240 - s.flagged.length)
    expect(Math.max(...applyAction(data, s, 'cap'))).toBeLessThanOrEqual(s.upper)
    expect(applyAction(data, s, 'keep')).toEqual(data.values)
  })
})

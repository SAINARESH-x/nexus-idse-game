// Level 05 tests: chart rubric table, misleading-chart honesty, bonus evaluators and persisted-state validators.
import { describe, expect, it } from 'vitest'
import type { ChallengeResult, MissionSession } from '../../../game/types'
import { BRIEFS, chartRubric, chartWarnings } from '../chartRubric'
import type { ChartSpec, Verdict } from '../chartRubric'
import { dropoutCliff, noAssistance, rightFirstTime } from '../bonuses'
import { bimodalBins, bimodalSample, honesty, MISLEAD_START, showsTwoPeaks, slope, termSeries, windowPoints } from '../misleading'
import { L05_INITIAL_STATES, L05_VALIDATORS, STAGE1_INITIAL, STAGE2_INITIAL, STAGE3_INITIAL } from '../state'
import { LEVEL_5 } from '../definition'
import { L05_RUNTIME } from '../runtime'

const brief = (id: string) => BRIEFS.find((b) => b.id === id)!
const spec = (type: ChartSpec['type'], x: string, y = '', extra: Partial<ChartSpec> = {}): ChartSpec => ({ type, x, y, bins: 12, startAtZero: true, ...extra })

describe('chartRubric table', () => {
  const table: [string, ChartSpec, Verdict][] = [
    ['shape', spec('histogram', 'attendance'), 'appropriate'],
    ['shape', spec('box', 'attendance'), 'acceptable'],
    ['shape', spec('histogram', 'attendance', '', { bins: 3 }), 'misleading'],
    ['shape', spec('bar', 'attendance'), 'misleading'],
    ['shape', spec('histogram', 'cgpa'), 'misleading'],
    ['compare', spec('box', 'department', 'cgpa'), 'appropriate'],
    ['compare', spec('bar', 'department', 'cgpa'), 'acceptable'],
    ['compare', spec('bar', 'department', 'cgpa', { startAtZero: false }), 'misleading'],
    ['compare', spec('line', 'department', 'cgpa'), 'misleading'],
    ['relate', spec('scatter', 'attendance', 'cgpa'), 'appropriate'],
    ['relate', spec('line', 'attendance', 'cgpa'), 'misleading'],
    ['relate', spec('scatter', 'department', 'cgpa'), 'misleading'],
    ['rate', spec('bar', 'year', 'dropped_out'), 'appropriate'],
    ['rate', spec('line', 'year', 'dropped_out'), 'acceptable'],
    ['rate', spec('histogram', 'dropped_out'), 'misleading'],
  ]
  it.each(table)('%s %o -> %s', (b, s, v) => {
    const r = chartRubric(brief(b), s)
    expect(r.verdict).toBe(v)
    expect(r.reason.length).toBeGreaterThan(10)
  })
  it('computes bins and baseline warnings', () => {
    expect(chartWarnings(spec('histogram', 'attendance', '', { bins: 2 }))).toHaveLength(1)
    expect(chartWarnings(spec('histogram', 'attendance', '', { bins: 60 }))).toHaveLength(1)
    expect(chartWarnings(spec('bar', 'year', 'dropped_out', { startAtZero: false }))).toHaveLength(1)
    expect(chartWarnings(spec('histogram', 'attendance'))).toHaveLength(0)
  })
})

describe('misleading charts', () => {
  it('2 bins hide the bimodal shape, 12 bins show it; windows', () => {
    const v = bimodalSample(5000)
    expect(showsTwoPeaks(bimodalBins(v, 2))).toBe(false)
    expect(showsTwoPeaks(bimodalBins(v, 12))).toBe(true)
    expect(honesty(MISLEAD_START, v)).toEqual({ axis: false, bins: false, range: false })
    const t = termSeries(5000)
    expect(slope(windowPoints(t, 'last3'))).toBeGreaterThan(2)
    expect(Math.abs(slope(t))).toBeLessThan(0.5)
  })
})

const result = (id: string, extra: ChallengeResult['extra'] = {}): ChallengeResult => ({ id, accuracy: 1, decisionQuality: 1, efficiency: 1, hintsUsed: 0, mistakes: 0, decisions: [], extra })
const session = (over: Partial<MissionSession> = {}): MissionSession => ({
  levelId: 5, kind: 'main', hintsUsed: 0, mistakes: 0, decisions: [], facts: {},
  results: { 'l5-stage-1': result('l5-stage-1'), 'l5-stage-2': result('l5-stage-2', { wrongCharts: 0 }), 'l5-stage-3': result('l5-stage-3', { dropoutCliff: true }) },
  ...over,
})

describe('bonus evaluators', () => {
  it('true cases', () => {
    expect(rightFirstTime(session())).toBe(true)
    expect(noAssistance(session())).toBe(true)
    expect(dropoutCliff(session())).toBe(true)
  })
  it('false cases', () => {
    const s = session()
    expect(rightFirstTime({ ...s, results: { ...s.results, 'l5-stage-2': result('l5-stage-2', { wrongCharts: 1 }) } })).toBe(false)
    expect(rightFirstTime({ ...s, kind: 'side' })).toBe(false)
    expect(noAssistance({ ...s, hintsUsed: 1 })).toBe(false)
    expect(noAssistance({ ...s, results: {} })).toBe(false)
    expect(dropoutCliff({ ...s, results: { ...s.results, 'l5-stage-3': result('l5-stage-3', { dropoutCliff: false }) } })).toBe(false)
  })
  it('definition wires them and has 3 hints everywhere', () => {
    expect(LEVEL_5.bonuses.map((b) => [b.id, b.hidden])).toEqual([['l5-bonus-1', false], ['l5-bonus-2', false], ['l5-bonus-hidden', true]])
    for (const x of [...LEVEL_5.stages, ...LEVEL_5.sideOps]) expect(x.hints).toHaveLength(3)
    expect(L05_RUNTIME.persistent?.validators).toBe(L05_VALIDATORS)
  })
})

describe('validators', () => {
  it('accept the initial states (round trip)', () => {
    for (const [k, v] of Object.entries(L05_INITIAL_STATES)) expect(L05_VALIDATORS[k](JSON.parse(JSON.stringify(v)))).toEqual(v)
  })
  it('reject bad state', () => {
    const v1 = L05_VALIDATORS['l5-stage-1']
    const v2 = L05_VALIDATORS['l5-stage-2']
    const v3 = L05_VALIDATORS['l5-stage-3']
    expect(v1(null)).toBeNull()
    expect(v1({ ...STAGE1_INITIAL, fn: 'sum' })).toBeNull()
    expect(v1({ ...STAGE1_INITIAL, by: 'cgpa' })).toBeNull()
    expect(v1({ ...STAGE1_INITIAL, goalA: 'yes' })).toBeNull()
    expect(v2({ ...STAGE2_INITIAL, briefs: STAGE2_INITIAL.briefs.slice(1) })).toBeNull()
    expect(v2({ ...STAGE2_INITIAL, active: 9 })).toBeNull()
    expect(v2({ ...STAGE2_INITIAL, briefs: STAGE2_INITIAL.briefs.map((b) => ({ ...b, bins: 500 })) })).toBeNull()
    expect(v3({ ...STAGE3_INITIAL, lo: 80, hi: 50 })).toBeNull()
    expect(v3({ ...STAGE3_INITIAL, lo: NaN })).toBeNull()
    expect(v3({ ...STAGE3_INITIAL, chips: { ...STAGE3_INITIAL.chips, magnitude: 2.2 } })).toBeNull()
    expect(v3({ ...STAGE3_INITIAL, bands: 0 })).toBeNull()
  })
  it('drops unknown keys and clamps counters', () => {
    expect(L05_VALIDATORS['l5-stage-1']({ ...STAGE1_INITIAL, junk: 1, mistakes: -3 })).toEqual({ ...STAGE1_INITIAL, mistakes: 0 })
  })
})

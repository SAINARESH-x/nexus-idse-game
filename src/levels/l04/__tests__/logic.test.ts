// Level 04 pure logic: flag scoring, Strategy Lab, puzzles, Ghost Hunt, Pipeline Order, bonuses and finish mapping.
import { describe, expect, it } from 'vitest'
import { createDfSession, generateStudents, liveHealth } from '../../../engine'
import type { DF, Flag, JudgedDecision, QualityReport } from '../../../engine'
import type { MissionSession } from '../../../game/types'
import { ghostHunter, parOrBetter, zeroCasualties } from '../bonuses'
import { badKeptCount, buildFacts, buildStageResults, mergeStats, wrongPuzzleKept } from '../finish'
import type { L04Summary } from '../finish'
import { countFlags, normaliseFlags, scoreReport, toggleFlag } from '../flagScoring'
import { ghostHuntScore, prepareGhostHuntDf } from '../ghostHunt'
import { GOOD_ORDER, runPipeline } from '../pipelineOrder'
import { buildPuzzles, impossibleAgePuzzle, judgePuzzleChoice, whichCsPuzzle } from '../puzzles'
import { buildCases, compareAny, compareStrategy } from '../strategyLab'

const g = generateStudents({ seed: 42, tier: 'assisted' })
const perfect: Flag[] = g.issues.map((i) => ({ rowIdx: i.rowIdx, column: i.column, kind: i.kind }))

describe('flagScoring', () => {
  it('perfect flags give F1 1 and pass', () => {
    const r = scoreReport(perfect, g.issues, g.ghosts, 'assisted', 1, g.dirty)
    expect(r.f1).toBe(1)
    expect(r.passed).toBe(true)
    expect(r.missed).toHaveLength(0)
  })
  it('empty report scores 0 and fails on the first submission, passes on the second', () => {
    expect(scoreReport([], g.issues, g.ghosts, 'assisted', 1).f1).toBe(0)
    expect(scoreReport([], g.issues, g.ghosts, 'assisted', 1).passed).toBe(false)
    expect(scoreReport([], g.issues, g.ghosts, 'assisted', 2).passed).toBe(true)
  })
  it('half the issues gives recall 0.5, precision 1, F1 2/3', () => {
    const half = perfect.slice(0, perfect.length / 2)
    const r = scoreReport(half, g.issues, g.ghosts, 'independent', 1, g.dirty)
    expect(r.recall).toBeCloseTo(0.5)
    expect(r.precision).toBe(1)
    expect(r.f1).toBeCloseTo(2 / 3)
    expect(r.feedback.some((f) => /not flagged/.test(f))).toBe(true)
  })
  it('false positives lower precision; anomaly flags are excluded from F1', () => {
    const fp: Flag[] = [...perfect, { rowIdx: 0, column: 'name', kind: 'missing' }, { rowIdx: 1, column: 'name', kind: 'invalid' }]
    const r = scoreReport(fp, g.issues, g.ghosts, 'assisted', 1, g.dirty)
    expect(r.precision).toBeCloseTo(18 / 20)
    expect(r.falsePositives).toBe(2)
    const withGhosts = scoreReport([...perfect, ...g.ghosts.map((rowIdx) => ({ rowIdx, kind: 'anomaly' as const })), { rowIdx: 0, kind: 'anomaly' }], g.issues, g.ghosts, 'expert', 1, g.dirty)
    expect(withGhosts.f1).toBe(1)
    expect(withGhosts.ghostsFound).toBe(4)
    expect(withGhosts.ghostFalsePositives).toBe(1)
    expect(withGhosts.feedback).toHaveLength(2)
  })
  it('a duplicate flag on the later copy counts, and a wrong-type cell flag counts for the column', () => {
    const dup = g.issues.find((i) => i.kind === 'duplicate')!
    const later = g.dirty.rows.find((r) => r.idx !== dup.rowIdx && r.v.student_id === dup.truth)!
    const n = normaliseFlags([{ rowIdx: later.idx, kind: 'duplicate' }, { rowIdx: 3, column: 'attendance', kind: 'type' }], g.issues, g.dirty)
    expect(n).toEqual([{ rowIdx: dup.rowIdx, kind: 'duplicate' }, { rowIdx: -1, column: 'attendance', kind: 'type' }])
  })
  it('toggleFlag and countFlags', () => {
    const f: Flag = { rowIdx: 1, column: 'age', kind: 'invalid' }
    expect(toggleFlag(toggleFlag([], f), f)).toEqual([])
    expect(countFlags([f, { rowIdx: 2, kind: 'anomaly' }]).anomaly).toBe(1)
  })
})

const tiny: DF = {
  columns: ['student_id', 'attendance', 'dropped_out'],
  rows: [
    { idx: 0, v: { student_id: 1, attendance: 80, dropped_out: 0 } },
    { idx: 1, v: { student_id: 2, attendance: null, dropped_out: 1 } },
    { idx: 2, v: { student_id: 3, attendance: 60, dropped_out: 0 } },
    { idx: 3, v: { student_id: 4, attendance: null, dropped_out: 1 } },
  ],
}

describe('Strategy Lab', () => {
  it('compareStrategy measures rows lost, percent and dropout shift on a fork', () => {
    const r = compareStrategy(tiny, [{ type: 'dropna', subset: ['attendance'] }], { column: 'attendance' })
    expect(r.rowsBefore).toBe(4)
    expect(r.rowsAfter).toBe(2)
    expect(r.pctLost).toBe(50)
    expect(r.dropoutBefore).toBe(0.5)
    expect(r.dropoutAfter).toBe(0)
    expect(r.dropoutShiftPts).toBeCloseTo(-50)
    expect(r.dropoutsRemoved).toBe(2)
    expect(r.decision?.good).toBe(false)
    expect(r.code).toBe("df = df.dropna(subset=['attendance'])")
    expect(r.why).toMatch(/2 of them had dropped out/)
    expect(tiny.rows).toHaveLength(4)
  })
  it('median fill keeps every row and fills the blanks', () => {
    const r = compareStrategy(tiny, [{ type: 'fillna', column: 'attendance', strategy: 'median' }], { column: 'attendance' })
    expect(r.rowsLost).toBe(0)
    expect(r.nullsAfter).toBe(0)
    expect(r.medianAfter).toBe(70)
    expect(r.decision?.good).toBe(true)
  })
  it('cases follow the live problems; the main session is untouched', () => {
    const s = createDfSession(g.dirty, { tier: 'assisted' })
    const cases = buildCases(s.current)
    expect(cases.map((c) => c.id)).toEqual(['missing-attendance', 'duplicates', 'invalid-values'])
    expect(cases[0].strategies.map((x) => x.id)).toEqual(['convert', 'drop', 'zero', 'mean', 'median'])
    for (const c of cases) for (const st of c.strategies) expect(compareAny(s.current, st, { column: c.column }).ok).toBe(true)
    expect(s.history).toHaveLength(0)
    expect(compareAny(s.current, cases[2].strategies[2], { column: 'age' }).decision?.good).toBe(false)
  })
})

describe('Field puzzles', () => {
  it('judges every candidate of every open puzzle', () => {
    const ps = buildPuzzles(g.dirty)
    expect(ps.every((p) => !p.resolved)).toBe(true)
    const age = impossibleAgePuzzle(g.dirty)
    expect(age.candidates.map((c) => [c.id, judgePuzzleChoice(age, c.id).good])).toEqual([['mask-median', true], ['drop-row', false], ['guess', false], ['leave', false]])
    const cs = whichCsPuzzle(g.dirty)
    expect(cs.candidates.map((c) => judgePuzzleChoice(cs, c.id).good)).toEqual([null, null, true])
    const full = compareStrategy(g.dirty, cs.candidates[2].ops)
    expect(full.labelsAfter).toBe(4)
    expect(compareStrategy(g.dirty, cs.candidates[0].ops).labelsAfter).toBeGreaterThan(4)
    const slip = ps[2]
    expect(slip.candidates.map((c) => judgePuzzleChoice(slip, c.id).good)).toEqual([true, null, false])
    expect(judgePuzzleChoice(slip, 'nope').good).toBe(false)
  })
  it('reports Already resolved once the problem is gone', () => {
    const s = createDfSession(g.dirty)
    s.apply("df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan")
    expect(impossibleAgePuzzle(s.current).resolved).toBe(true)
  })
})

describe('Ghost Hunt', () => {
  const data = prepareGhostHuntDf(1001, 'independent')
  it('keeps ghosts, converts numbers and removes exact duplicates', () => {
    expect(data.ghosts).toHaveLength(4)
    expect(liveHealth(data.df).duplicates).toBe(0)
    expect(liveHealth(data.df).dtypeMismatches.map((d) => d.column)).not.toContain('attendance')
  })
  it('scores perfect, empty, partial and false positives', () => {
    expect(ghostHuntScore(data.ghosts, data.ghosts).f1).toBe(1)
    expect(ghostHuntScore([], data.ghosts).f1).toBe(0)
    const part = ghostHuntScore(data.ghosts.slice(0, 2), data.ghosts)
    expect(part.recall).toBe(0.5)
    expect(part.passed).toBe(false)
    const fp = ghostHuntScore([...data.ghosts, 99999], data.ghosts)
    expect(fp.precision).toBe(0.8)
    expect(fp.falsePositives).toEqual([99999])
    expect(fp.passed).toBe(true)
  })
})

describe('Pipeline Order', () => {
  it('the good order passes', () => {
    const r = runPipeline(GOOD_ORDER)
    expect(r.failed).toBe(false)
    expect(r.integrity).toBeGreaterThanOrEqual(85)
    expect(r.passed).toBe(true)
  })
  it('dedupe before standardise leaves near-duplicates and explains it', () => {
    const r = runPipeline(['dedupe', 'department', 'attendance-type', 'attendance-fill', 'age', 'cgpa'])
    expect(r.passed).toBe(false)
    expect(r.explanations[0]).toMatch(/drop_duplicates ran before the department labels were standardised, so \d+ near-duplicate/)
  })
  it('a fill before the type conversion fails with the engine error', () => {
    const r = runPipeline(['department', 'dedupe', 'attendance-fill', 'attendance-type', 'age', 'cgpa'])
    expect(r.failed).toBe(true)
    expect(r.steps[2].error).toMatch(/TypeError/)
  })
})

const session = (facts: MissionSession['facts']): MissionSession => ({ levelId: 4, kind: 'main', results: {}, hintsUsed: 0, mistakes: 0, decisions: [], facts })

describe('bonuses', () => {
  it('zero casualties', () => {
    expect(zeroCasualties(session({ preservation: 1, badKept: 0 }))).toBe(true)
    expect(zeroCasualties(session({ preservation: 0.95, badKept: 0 }))).toBe(false)
    expect(zeroCasualties(session({ preservation: 1, badKept: 1 }))).toBe(false)
  })
  it('par or better', () => {
    expect(parOrBetter(session({ opsCount: 8, par: 8 }))).toBe(true)
    expect(parOrBetter(session({ opsCount: 9, par: 8 }))).toBe(false)
    expect(parOrBetter(session({ opsCount: 0, par: 8 }))).toBe(false)
  })
  it('ghost hunter', () => {
    expect(ghostHunter(session({ ghostsFound: 3 }))).toBe(true)
    expect(ghostHunter(session({ ghostsFound: 2 }))).toBe(false)
    expect(ghostHunter(session({}))).toBe(false)
  })
})

describe('finish.ts', () => {
  const q = { consistency: 0.9, identification: 0.8, decisions: 0.7, preservation: 1, economy: 1, integrity: 88, efficiency: 75, counts: { before: 47, after: 44 }, resolved: 16, totalIssues: 18, unresolved: [], ghostsFound: 3, ghostFalsePositives: 0, flagPrecision: 0.9, flagRecall: 0.7 } as QualityReport
  const bad: JudgedDecision = { entryId: 'h1', decision: { label: 'x', good: false, explanation: '' }, undone: false }
  const s: L04Summary = { tier: 'independent', quality: q, flagF1: 0.8, stage1Done: true, stage2Submissions: 2, hintsByStage: [1, 0, 2, 0], decisions: [bad, { ...bad, entryId: 'h2', undone: true }], puzzlePicks: [{ entryId: 'h3', puzzleId: 'impossible-age', decision: { label: 'y', good: false, explanation: '' } }, { entryId: 'none', puzzleId: 'which-cs', decision: { label: 'z', good: false, explanation: '' } }], appliedEntryIds: ['h1'], opsCount: 10, adaptiveAssistUsed: true, stage3Skipped: false }
  it('maps stages to their metrics', () => {
    const r = buildStageResults(s)
    expect(r.map((x) => x.id)).toEqual(['l4-stage-1', 'l4-stage-2', 'l4-stage-3', 'l4-stage-4'])
    expect(r[0].accuracy).toBe(1)
    expect(r[1].accuracy).toBe(0.8)
    expect(r[1].efficiency).toBe(0.7)
    expect(r[2].accuracy).toBe(0.9)
    expect(r[2].decisionQuality).toBe(0.7)
    expect(r[3].accuracy).toBe(0.88)
    expect(r[3].efficiency).toBe(0.75)
    expect(r.map((x) => x.hintsUsed)).toEqual([1, 0, 2, 0])
    expect(r[2].mistakes).toBe(2)
  })
  it('counts kept bad decisions and kept wrong puzzle picks', () => {
    expect(badKeptCount(s.decisions)).toBe(1)
    expect(wrongPuzzleKept(s.puzzlePicks, s.appliedEntryIds)).toBe(1)
    const f = buildFacts(s)
    expect(f).toMatchObject({ badKept: 2, opsCount: 10, par: 12, ghostsFound: 3, tier: 'independent', perfectRun: false, adaptiveAssistUsed: true })
  })
  it('mergeStats keeps maxima and a tier list', () => {
    const m = mergeStats({ bestIntegrity: 95, tiersCleared: 'expert' }, { integrity: 80, efficiency: 70, ghostsFound: 2, tier: 'assisted', perfectRun: false })
    expect(m).toEqual({ bestIntegrity: 95, bestEfficiency: 70, ghostsFound: 2, tiersCleared: 'assisted,expert', perfectRun: false })
  })
})

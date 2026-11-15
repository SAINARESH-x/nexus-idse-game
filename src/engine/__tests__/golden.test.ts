// Golden tests: the 9-command perfect script on assisted seed 42, plus baseline and penalty cases.
import { describe, expect, it } from 'vitest'
import { assessQuality, createDfSession, generateStudents, liveHealth, parse, runInspect, shape, type DfSession } from '../index'

const SCRIPT = [
  'df = df.drop_duplicates()',
  "df['department'] = df['department'].str.strip().str.title()",
  "df['department'] = df['department'].replace({'Cs': 'Computer Science', 'Comp Sci': 'Computer Science', 'Mech': 'Mechanical'})",
  "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)",
  "df['attendance'] = df['attendance'].fillna(df['attendance'].median())",
  "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan",
  "df['age'] = df['age'].fillna(df['age'].median())",
  "df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan",
  "df['cgpa'] = df['cgpa'].fillna(df['cgpa'].median())",
]

function setup(tier: 'assisted' | 'independent' | 'expert' = 'assisted') {
  const g = generateStudents({ seed: 42, tier })
  const s = createDfSession(g.dirty, { seed: 42, tier })
  const report = (sess: DfSession) =>
    assessQuality(sess.current, { ...g, tier, history: sess.history, decisions: sess.decisions })
  return { g, s, report }
}

describe('9-command perfect script (assisted, seed 42)', () => {
  it('reaches the golden numbers', () => {
    const { s, report } = setup()
    for (const cmd of SCRIPT) {
      const r = s.apply(cmd, 'command')
      expect(r.ok, `${cmd}: ${r.error}`).toBe(true)
    }
    expect(shape(s.current)).toEqual([44, 9])
    const q = report(s)
    expect(q.consistency).toBe(1)
    expect(q.preservation).toBe(1)
    expect(q.identification).toBe(0.5)
    expect(q.integrity).toBeCloseTo(92.5, 2)
    expect(q.efficiency).toBeCloseTo(88.89, 1)
    expect(liveHealth(s.current).total).toBe(0)
    expect(runInspect(s.current, { type: 'dtypes' })).toMatch(/attendance\s+float64/)
  })

  it('untouched dirty data scores below 40 (about 27.5)', () => {
    const { s, report } = setup()
    const q = report(s)
    expect(q.consistency).toBe(0)
    expect(q.preservation).toBe(1)
    expect(q.integrity).toBeCloseTo(27.5, 2)
  })

  it('dropna lowers preservation and is judged bad', () => {
    const { s, report } = setup()
    const r = s.apply('df = df.dropna()', 'command')
    expect(r.entry?.decision?.good).toBe(false)
    expect(report(s).preservation).toBeLessThan(1)
  })

  it('an undone bad decision is penalised less than a kept one', () => {
    const a = setup()
    a.s.apply('df = df.dropna()')
    const kept = a.report(a.s).decisions
    a.s.undo()
    a.s.apply('df = df.drop_duplicates()')
    const undone = a.report(a.s).decisions
    expect(undone).toBeGreaterThan(kept)
    expect(undone).toBeCloseTo(0.6, 5)
  })

  it('perfect flags give identification 1 and anomaly flags are scored separately', () => {
    const { g, s } = setup()
    for (const cmd of SCRIPT) s.apply(cmd)
    const flags = [
      ...g.issues.map((i) => ({ rowIdx: i.rowIdx, column: i.column, kind: i.kind })),
      ...g.ghosts.slice(0, 3).map((rowIdx) => ({ rowIdx, kind: 'anomaly' as const })),
      { rowIdx: 9999, kind: 'anomaly' as const },
    ]
    const q = assessQuality(s.current, { ...g, tier: 'assisted', flags, history: s.history, decisions: s.decisions })
    expect(q.identification).toBe(1)
    expect(q.ghostsFound).toBe(3)
    expect(q.ghostFalsePositives).toBe(1)
    expect(q.integrity).toBeCloseTo(100, 5)
  })

  it('expert dropna on attendance reports the dropout-rate change as bad', () => {
    const { s } = setup('expert')
    const r = s.apply("df = df.dropna(subset=['attendance'])")
    expect(r.entry?.decision?.good).toBe(false)
    expect(r.entry?.decision?.explanation).toMatch(/dropout rate moved from [\d.]+ percent to [\d.]+ percent/)
  })

  it('every script line parses to ops', () => {
    for (const cmd of SCRIPT) expect(parse(cmd).kind).toBe('ops')
  })
})

// Tests for judgeOp rules and liveHealth on generated and fixture data.
import { describe, expect, it } from 'vitest'
import { apply, applyAll, generateStudents, judgeOp, liveHealth, problemsAt, tinyDirty, type DF, type Op } from '../index'

const g = generateStudents({ seed: 42, tier: 'assisted' })
const numeric = (() => {
  const r = applyAll(g.dirty, [{ type: 'str_replace', column: 'attendance', old: '%', new: '' }, { type: 'astype', column: 'attendance', to: 'float' }])
  if (!r.ok) throw new Error(r.error)
  return r.df
})()
function judge(df: DF, op: Op, tier: 'assisted' | 'expert' = 'assisted') {
  const r = apply(df, op)
  if (!r.ok) throw new Error(r.error)
  return judgeOp(df, r.df, op, { tier })
}

describe('judgeOp', () => {
  it('dropna losing >5% is bad', () => {
    const d = judge(g.dirty, { type: 'dropna' })
    expect(d?.good).toBe(false)
    expect(d?.explanation).toMatch(/Lost 5 rows, 10.6 percent/)
  })
  it('fillna rules', () => {
    expect(judge(numeric, { type: 'fillna', column: 'attendance', value: 0 })?.good).toBe(false)
    expect(judge(numeric, { type: 'fillna', column: 'attendance', strategy: 'median' })?.good).toBe(true)
    expect(judge(numeric, { type: 'fillna', column: 'attendance', strategy: 'mode' })?.good).toBe(true)
    const skewed: DF = { columns: ['x'], rows: [1, 1, 1, 2, 1, 50, null].map((x, idx) => ({ idx, v: { x } })) }
    expect(judge(skewed, { type: 'fillna', column: 'x', strategy: 'mean' })?.good).toBeNull()
  })
  it('subset dedupe removing >10% is bad; plain dedupe has no rule', () => {
    expect(judge(g.dirty, { type: 'drop_duplicates', subset: ['department'] })?.good).toBe(false)
    expect(judge(g.dirty, { type: 'drop_duplicates' })).toBeNull()
  })
  it('filter_range losing >5% is bad, mask_invalid is good', () => {
    const big: DF = { columns: ['age'], rows: [20, 199, 21, 22, 23, 24, 25, 19, 18, 17].map((age, idx) => ({ idx, v: { age } })) }
    expect(judge(big, { type: 'filter_range', column: 'age', min: 16, max: 40 })?.good).toBe(false)
    expect(judge(big, { type: 'mask_invalid', column: 'age', min: 16, max: 40 })?.good).toBe(true)
  })
  it('department standardisation reducing labels is good', () => {
    expect(judge(g.dirty, { type: 'str_op', column: 'department', fn: 'strip' })?.good).toBe(true)
  })
  it('to_numeric coercing >10 real values is bad', () => {
    expect(judge(g.dirty, { type: 'to_numeric', column: 'attendance', errors: 'coerce' })?.good).toBe(false)
  })
  it('no-op is redundant', () => {
    expect(judge(numeric, { type: 'mask_invalid', column: 'attendance', min: 0, max: 100 })?.redundant).toBe(true)
  })
  it('expert dropna on attendance reports the dropout shift', () => {
    const e = generateStudents({ seed: 42, tier: 'expert' })
    const d = judge(e.dirty, { type: 'dropna', subset: ['attendance'] }, 'expert')
    expect(d?.good).toBe(false)
    expect(d?.explanation).toContain('dropout rate moved from')
  })
})

describe('liveHealth', () => {
  it('counts problems in the dirty assisted data', () => {
    const h = liveHealth(g.dirty)
    expect(h.nulls.attendance).toBe(5)
    expect(h.duplicates).toBe(3)
    expect(h.totalOutOfRange).toBe(3)
    expect(h.totalUnknownLabels).toBe(6)
    expect(h.dtypeMismatches.map((m) => m.column)).toEqual(['attendance'])
    const blank = g.issues.find((i) => i.kind === 'missing')
    expect(blank && problemsAt(h, blank.rowIdx, 'attendance')).toContain('missing')
  })
  it('detects placeholders, wrong types and duplicates on fixtures', () => {
    const df: DF = { columns: ['cgpa', 'department'], rows: [{ idx: 0, v: { cgpa: 'N/A', department: 'CS' } }, { idx: 1, v: { cgpa: '7.1', department: 'cs ' } }, { idx: 2, v: { cgpa: '7.1', department: 'CS ' } }] }
    const h = liveHealth(df)
    expect(h.placeholders.cgpa).toBe(1)
    expect(h.cells['1|cgpa']).toContain('wrong_type')
    expect(h.normalizedDuplicates).toBe(1)
    expect(h.duplicates).toBe(0)
    expect(liveHealth(tinyDirty).outOfRange.age).toBe(1)
  })
})

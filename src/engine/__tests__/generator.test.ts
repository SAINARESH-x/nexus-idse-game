// Tests for the seeded student generator: determinism, exact assisted counts, tier tolerances and dropout pattern.
import { describe, expect, it } from 'vitest'
import { clearanceSeed, duplicateMask, generateStudents, nullCounts, valueCounts, dtypes, tierIndex } from '../index'

const near = (actual: number, target: number) => Math.abs(actual - target) <= Math.max(1, target * 0.1)

describe('generateStudents', () => {
  it('is deterministic', () => {
    expect(generateStudents({ seed: 42, tier: 'assisted' })).toEqual(generateStudents({ seed: 42, tier: 'assisted' }))
    expect(generateStudents({ seed: 43, tier: 'assisted' }).dirty).not.toEqual(generateStudents({ seed: 42, tier: 'assisted' }).dirty)
  })
  it('assisted counts are exact', () => {
    for (const seed of [42, 1000, 7]) {
      const g = generateStudents({ seed, tier: 'assisted' })
      expect(g.dirty.rows).toHaveLength(47)
      expect(g.dirty.columns).toHaveLength(9)
      expect(nullCounts(g.dirty).attendance).toBe(5)
      expect(duplicateMask(g.dirty).filter(Boolean).length).toBe(3)
      expect(g.issues).toHaveLength(18)
      expect(g.meta.issueCounts).toEqual({ missing: 5, duplicate: 3, inconsistent: 6, type: 1, invalid: 3 })
      expect(g.ghosts).toHaveLength(4)
      const labels = valueCounts(g.dirty, 'department').map(([v]) => v)
      for (const l of ['CS', ' cs  ', 'Comp Sci', 'COMPUTER SCIENCE', 'mech', ' Electrical  ']) expect(labels).toContain(l)
      expect(dtypes(g.dirty)).toMatchObject({ attendance: 'object', age: 'int64', cgpa: 'float64' })
      for (const idx of g.ghosts) {
        const row = g.dirty.rows.find((r) => r.idx === idx)
        expect(row?.v.attendance).toBe('100%')
        expect(row?.v.cgpa).toBe(10)
      }
    }
  })
  it('independent and expert land within tolerance', () => {
    const i = generateStudents({ seed: 42, tier: 'independent' })
    expect(near(i.dirty.rows.length, 163)).toBe(true)
    expect(near(nullCounts(i.dirty).attendance, 8)).toBe(true)
    expect(i.issues.filter((x) => x.kind === 'type')).toHaveLength(2)
    const e = generateStudents({ seed: 42, tier: 'expert' })
    expect(near(e.dirty.rows.length, 324)).toBe(true)
    expect(near(nullCounts(e.dirty).attendance, 24)).toBe(true)
    expect(near(e.issues.filter((x) => x.kind === 'duplicate').length, 20)).toBe(true)
    const blankIdx = new Set(e.issues.filter((x) => x.kind === 'missing' && x.column === 'attendance').map((x) => x.rowIdx))
    const dropouts = e.dirty.rows.filter((r) => blankIdx.has(r.idx) && r.v.dropped_out === 1).length
    expect(dropouts / blankIdx.size).toBeGreaterThanOrEqual(0.6)
  })
  it('dropout is higher for low attendance', () => {
    const { clean } = generateStudents({ seed: 42, tier: 'expert' })
    const rate = (rows: typeof clean.rows) => rows.filter((r) => r.v.dropped_out === 1).length / rows.length
    const low = clean.rows.filter((r) => (r.v.attendance as number) < 70)
    const high = clean.rows.filter((r) => (r.v.attendance as number) >= 70)
    expect(rate(low)).toBeGreaterThan(rate(high))
  })
  it('clearance seed formula', () => {
    expect(tierIndex('expert')).toBe(2)
    expect(clearanceSeed(0, 'assisted')).toBe(1000)
    expect(clearanceSeed(2, 'independent')).toBe(1035)
  })
})

// Tests for dtype inference, stats helpers and pandas-like text output on the tinyDirty fixture.
import { describe, expect, it } from 'vitest'
import { describe as dfDescribe, dtypes, duplicateMask, formatDf, info, nullCounts, shape, tinyDirty, unique, valueCounts, type DF } from '../index'

const mk = (vals: Array<string | number | boolean | null>): DF => ({ columns: ['a'], rows: vals.map((a, idx) => ({ idx, v: { a } })) })

describe('dataframe helpers', () => {
  it('infers dtypes like pandas', () => {
    expect(dtypes(mk([1, 2, 3])).a).toBe('int64')
    expect(dtypes(mk([1, null, 3])).a).toBe('float64')
    expect(dtypes(mk([1.5, 2])).a).toBe('float64')
    expect(dtypes(mk([1, 'x'])).a).toBe('object')
    expect(dtypes(mk([true, false])).a).toBe('bool')
    expect(dtypes(mk([null, null])).a).toBe('object')
    expect(dtypes(tinyDirty)).toEqual({ student_id: 'int64', department: 'object', age: 'int64', cgpa: 'float64', attendance: 'object' })
  })
  it('shape, nulls, duplicates and counts on tinyDirty', () => {
    expect(shape(tinyDirty)).toEqual([12, 5])
    expect(nullCounts(tinyDirty).attendance).toBe(2)
    expect(nullCounts(tinyDirty).age).toBe(0)
    const m = duplicateMask(tinyDirty)
    expect(m.filter(Boolean).length).toBe(1)
    expect(m[8]).toBe(true)
    expect(valueCounts(tinyDirty, 'department').length).toBeGreaterThanOrEqual(5)
    expect(unique(tinyDirty, 'attendance')).toContain(null)
  })
  it('describe uses ddof=1 and linear quartiles', () => {
    const d = dfDescribe(mk([1, 2, 3, 4]))
    expect(d.a.mean).toBe(2.5)
    expect(d.a.std).toBeCloseTo(1.290994, 5)
    expect(d.a['25%']).toBe(1.75)
    expect(dfDescribe(tinyDirty).attendance).toBeUndefined()
  })
  it('renders text output', () => {
    expect(formatDf(tinyDirty).split('\n')).toHaveLength(13)
    expect(formatDf(tinyDirty)).toContain('74.0')
    expect(info(tinyDirty)).toContain('RangeIndex: 12 entries, 0 to 11')
    expect(info(tinyDirty)).toMatch(/attendance\s+10 non-null\s+object/)
  })
})

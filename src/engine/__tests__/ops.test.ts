// Tests for every engine op, including pandas-faithful error cases and immutability.
import { describe, expect, it } from 'vitest'
import { apply, applyAll, columnDtype, nullCounts, tinyDirty, type DF, type Op } from '../index'

function ok(df: DF, op: Op): DF {
  const r = apply(df, op)
  if (!r.ok) throw new Error(r.error)
  return r.df
}
function err(df: DF, op: Op): string {
  const r = apply(df, op)
  if (r.ok) throw new Error('expected failure')
  return r.error
}

describe('ops', () => {
  it('drop_duplicates keeps the first copy and idx values', () => {
    const r = apply(tinyDirty, { type: 'drop_duplicates' })
    expect(r.ok && r.rowsAfter).toBe(11)
    if (r.ok) expect(r.df.rows.map((x) => x.idx)).not.toContain(8)
    expect(tinyDirty.rows).toHaveLength(12)
    expect(ok(tinyDirty, { type: 'drop_duplicates', subset: ['department'] }).rows.length).toBe(6)
  })
  it('dropna with and without subset', () => {
    expect(ok(tinyDirty, { type: 'dropna' }).rows).toHaveLength(10)
    expect(ok(tinyDirty, { type: 'dropna', subset: ['age'] }).rows).toHaveLength(12)
    expect(err(tinyDirty, { type: 'dropna', subset: ['nope'] })).toMatch(/KeyError/)
  })
  it('fillna value, strategies and text errors', () => {
    const num = ok(tinyDirty, { type: 'str_replace', column: 'attendance', old: '%', new: '' })
    const f = ok(num, { type: 'astype', column: 'attendance', to: 'float' })
    const m = ok(f, { type: 'fillna', column: 'attendance', strategy: 'median' })
    expect(nullCounts(m).attendance).toBe(0)
    expect(columnDtype(m, 'attendance')).toBe('float64')
    expect(ok(f, { type: 'fillna', column: 'attendance', strategy: 'mean' }).rows[2].v.attendance).toBeCloseTo(79, 0)
    expect(err(tinyDirty, { type: 'fillna', column: 'attendance', strategy: 'median' })).toMatch(/could not convert string to float/)
    expect(ok(tinyDirty, { type: 'fillna', column: 'attendance', strategy: 'mode' }).rows[2].v.attendance).toBe('78%')
    expect(nullCounts(ok(tinyDirty, { type: 'fillna', value: 0 })).attendance).toBe(0)
    expect(ok(tinyDirty, { type: 'fillna', column: 'attendance', value: 'unknown' }).rows[9].v.attendance).toBe('unknown')
  })
  it('string ops: null stays null, non-strings become null, title case', () => {
    expect(ok(tinyDirty, { type: 'str_op', column: 'department', fn: 'strip' }).rows[3].v.department).toBe('cs')
    const t = applyAll(tinyDirty, [{ type: 'str_op', column: 'department', fn: 'strip' }, { type: 'str_op', column: 'department', fn: 'title' }])
    expect(t.ok && t.df.rows[3].v.department).toBe('Cs')
    expect(ok(tinyDirty, { type: 'str_op', column: 'department', fn: 'upper' }).rows[0].v.department).toBe('COMPUTER SCIENCE')
    expect(ok(tinyDirty, { type: 'str_op', column: 'department', fn: 'lower' }).rows[1].v.department).toBe('cs')
    expect(ok(tinyDirty, { type: 'str_op', column: 'attendance', fn: 'strip' }).rows[2].v.attendance).toBeNull()
    const mixed: DF = { columns: ['a'], rows: [{ idx: 0, v: { a: 'x' } }, { idx: 1, v: { a: 5 } }] }
    expect(ok(mixed, { type: 'str_op', column: 'a', fn: 'upper' }).rows[1].v.a).toBeNull()
    expect(err(tinyDirty, { type: 'str_op', column: 'age', fn: 'strip' })).toMatch(/\.str accessor/)
    expect(ok(tinyDirty, { type: 'str_replace', column: 'attendance', old: '%', new: '' }).rows[0].v.attendance).toBe('85')
  })
  it('replace_map maps exact labels only', () => {
    const r = ok(tinyDirty, { type: 'replace_map', column: 'department', mapping: { CS: 'Computer Science' } })
    expect(r.rows[1].v.department).toBe('Computer Science')
    expect(r.rows[3].v.department).toBe(' cs  ')
  })
  it('astype faithfulness', () => {
    expect(err(tinyDirty, { type: 'astype', column: 'attendance', to: 'float' })).toBe("ValueError: could not convert string to float: '85%'")
    const f = applyAll(tinyDirty, [{ type: 'str_replace', column: 'attendance', old: '%', new: '' }, { type: 'astype', column: 'attendance', to: 'float' }])
    if (!f.ok) throw new Error(f.error)
    expect(columnDtype(f.df, 'attendance')).toBe('float64')
    expect(nullCounts(f.df).attendance).toBe(2)
    expect(err(f.df, { type: 'astype', column: 'attendance', to: 'int' })).toMatch('Cannot convert non-finite values (NA or inf) to integer')
    expect(columnDtype(ok(tinyDirty, { type: 'astype', column: 'age', to: 'float' }), 'age')).toBe('float64')
    expect(columnDtype(ok(tinyDirty, { type: 'astype', column: 'cgpa', to: 'int' }), 'cgpa')).toBe('int64')
    expect(ok(tinyDirty, { type: 'astype', column: 'age', to: 'str' }).rows[0].v.age).toBe('19')
  })
  it('to_numeric coerce reports how many values were coerced; raise fails', () => {
    const r = apply(tinyDirty, { type: 'to_numeric', column: 'attendance', errors: 'coerce' })
    expect(r.ok && r.summary).toMatch(/10 values could not be parsed/)
    if (r.ok) expect(nullCounts(r.df).attendance).toBe(12)
    expect(err(tinyDirty, { type: 'to_numeric', column: 'attendance', errors: 'raise' })).toMatch(/Unable to parse string "85%"/)
  })
  it('filter_range drops out-of-range and null rows; mask_invalid keeps rows', () => {
    expect(ok(tinyDirty, { type: 'filter_range', column: 'age', min: 16, max: 40 }).rows).toHaveLength(11)
    const r = apply(tinyDirty, { type: 'filter_range', column: 'cgpa', max: 10 })
    expect(r.ok && r.rowsAfter).toBe(11)
    expect(err(tinyDirty, { type: 'filter_range', column: 'attendance', min: 0 })).toMatch(/TypeError/)
    const m = ok(tinyDirty, { type: 'mask_invalid', column: 'age', max: 40 })
    expect(m.rows).toHaveLength(12)
    expect(columnDtype(m, 'age')).toBe('float64')
    expect(nullCounts(m).age).toBe(1)
    expect(ok(tinyDirty, { type: 'filter_range', column: 'department', eq: 'CS' }).rows).toHaveLength(2)
  })
  it('set_cell and drop_rows', () => {
    expect(ok(tinyDirty, { type: 'set_cell', idx: 5, column: 'age', value: 20 }).rows[5].v.age).toBe(20)
    expect(err(tinyDirty, { type: 'set_cell', idx: 99, column: 'age', value: 20 })).toMatch(/KeyError/)
    expect(ok(tinyDirty, { type: 'drop_rows', idxs: [3, 7] }).rows.map((r) => r.idx)).not.toContain(7)
    expect(err(tinyDirty, { type: 'drop_rows', idxs: [99] })).toMatch(/not found in axis/)
    expect(err(tinyDirty, { type: 'str_op', column: 'nope', fn: 'strip' })).toBe("KeyError: 'nope'")
  })
})

// Tests for the safe console parser: every supported form, rejections, inspect output and the toCode round trip.
import { describe, expect, it } from 'vitest'
import { apply, parse, runInspect, tinyDirty, toCode, toCodeLine, describeOp, type Op } from '../index'

const ops = (line: string): Op[] => {
  const r = parse(line)
  if (r.kind !== 'ops') throw new Error(`${line}: ${r.kind === 'error' ? r.message : 'inspect'}`)
  return r.ops
}
const inspect = (line: string): string => {
  const r = parse(line)
  if (r.kind !== 'inspect') throw new Error(`${line} is not an inspect query`)
  return runInspect(tinyDirty, r.query)
}

describe('parser', () => {
  it('rejects anything outside the subset', () => {
    for (const bad of ['import os', '__import__(1)', 'os.system(1)', 'eval(1)', 'open(1)', "exec('x')", 'df.to_csv("x")', 'lambda: 1']) {
      const r = parse(bad)
      expect(r.kind, bad).toBe('error')
      if (r.kind === 'error') expect(r.message).toContain('simplified subset of pandas')
    }
  })
  it('inspect forms', () => {
    expect(inspect('df.shape')).toBe('(12, 5)')
    expect(inspect('df.isnull().sum()')).toMatch(/attendance\s+2/)
    expect(inspect('df.isna().sum()')).toMatch(/age\s+0/)
    expect(inspect('df.duplicated().sum()')).toBe('1')
    expect(inspect('df.dtypes')).toMatch(/cgpa\s+float64/)
    expect(inspect("df['department'].value_counts()")).toMatch(/Name: count, dtype: int64/)
    expect(inspect('df[df.duplicated()]').split('\n')).toHaveLength(2)
    expect(inspect('df.head(3)').split('\n')).toHaveLength(4)
    expect(inspect('df.tail()').split('\n')).toHaveLength(6)
    expect(inspect('df.info()')).toContain('Data columns (total 5 columns)')
    expect(inspect('df.describe()')).toContain('count')
    expect(inspect("df['attendance'].unique()")).toContain('nan')
    expect(inspect("df['attendance'].isnull().sum()  # comment")).toBe('2')
    expect(inspect('df')).toContain('student_id')
    expect(inspect('help')).toContain('Supported commands')
  })
  it('op forms and quoting', () => {
    expect(ops('df.drop_duplicates()')).toEqual([{ type: 'drop_duplicates' }])
    expect(ops('df = df.drop_duplicates(subset=["student_id"])')).toEqual([{ type: 'drop_duplicates', subset: ['student_id'] }])
    expect(ops("df = df.dropna(subset=['attendance'])")).toEqual([{ type: 'dropna', subset: ['attendance'] }])
    expect(ops("df['age'] = df['age'].fillna(df['age'].mode()[0])")).toEqual([{ type: 'fillna', column: 'age', strategy: 'mode' }])
    expect(ops("df['a'] = df['a'].fillna('unknown')")).toEqual([{ type: 'fillna', column: 'a', value: 'unknown' }])
    expect(ops('df = df.fillna(0)')).toEqual([{ type: 'fillna', value: 0 }])
    expect(ops("df['department'] = df['department'].str.strip().str.title()")).toHaveLength(2)
    expect(ops("df = df[df['age'] <= 40]")).toEqual([{ type: 'filter_range', column: 'age', max: 40 }])
    expect(ops("df = df[df['age'] > 16]")).toEqual([{ type: 'filter_range', column: 'age', min: 16, minExclusive: true }])
    expect(ops("df.at[12, 'age'] = 20")).toEqual([{ type: 'set_cell', idx: 12, column: 'age', value: 20 }])
    expect(ops("df.loc[df['age'] > 40, 'age'] = np.nan")).toEqual([{ type: 'mask_invalid', column: 'age', max: 40 }])
    expect(ops("df['attendance'] = pd.to_numeric(df['attendance'].str.replace('%', ''), errors='coerce')")).toHaveLength(2)
    expect(parse("df['a'] = df['b'].str.strip()").kind).toBe('error')
  })
  it('round-trips toCode for every op type', () => {
    const all: Op[] = [
      { type: 'drop_duplicates' },
      { type: 'drop_duplicates', subset: ['a', 'b'] },
      { type: 'dropna' },
      { type: 'dropna', subset: ['attendance'] },
      { type: 'fillna', column: 'attendance', strategy: 'median' },
      { type: 'fillna', column: 'attendance', strategy: 'mean' },
      { type: 'fillna', column: 'attendance', strategy: 'mode' },
      { type: 'fillna', column: 'c', value: 0 },
      { type: 'fillna', value: 'x' },
      { type: 'str_op', column: 'department', fn: 'strip' },
      { type: 'str_op', column: 'department', fn: 'title' },
      { type: 'str_replace', column: 'attendance', old: '%', new: '' },
      { type: 'replace_map', column: 'department', mapping: { Cs: 'Computer Science', "O'x": 'y' } },
      { type: 'astype', column: 'attendance', to: 'float' },
      { type: 'astype', column: 'age', to: 'int' },
      { type: 'astype', column: 'age', to: 'str' },
      { type: 'to_numeric', column: 'attendance', errors: 'coerce' },
      { type: 'filter_range', column: 'age', min: 16, max: 40 },
      { type: 'filter_range', column: 'age', max: 40, maxExclusive: true },
      { type: 'filter_range', column: 'cgpa', min: 0 },
      { type: 'filter_range', column: 'department', ne: 'CS' },
      { type: 'mask_invalid', column: 'cgpa', min: 0, max: 10 },
      { type: 'mask_invalid', column: 'age', max: 40 },
      { type: 'set_cell', idx: 12, column: 'age', value: 20 },
      { type: 'set_cell', idx: 3, column: 'cgpa', value: 7.5 },
      { type: 'set_cell', idx: 3, column: 'cgpa', value: null },
      { type: 'drop_rows', idxs: [3, 7] },
    ]
    for (const op of all) {
      const code = toCode(op)
      expect(ops(code), code).toEqual([op])
      expect(describeOp(op).length).toBeGreaterThan(10)
    }
    const chain: Op[] = [{ type: 'str_op', column: 'd', fn: 'strip' }, { type: 'str_op', column: 'd', fn: 'title' }]
    expect(toCodeLine(chain)).toBe("df['d'] = df['d'].str.strip().str.title()")
    expect(ops(toCodeLine(chain))).toEqual(chain)
  })
  it('matches the canonical code examples', () => {
    expect(toCode({ type: 'fillna', column: 'attendance', strategy: 'median' })).toBe("df['attendance'] = df['attendance'].fillna(df['attendance'].median())")
    expect(toCode({ type: 'filter_range', column: 'age', min: 16, max: 40 })).toBe("df = df[df['age'].between(16, 40)]")
    expect(toCode({ type: 'mask_invalid', column: 'cgpa', min: 0, max: 10 })).toBe("df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan")
    expect(toCode({ type: 'drop_rows', idxs: [3, 7] })).toBe('df = df.drop(index=[3, 7])')
    expect(toCode({ type: 'to_numeric', column: 'attendance', errors: 'coerce' })).toBe("df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')")
  })
  it('parsed ops apply to the fixture', () => {
    const r = apply(tinyDirty, ops("df.loc[df['age'] > 40, 'age'] = np.nan")[0])
    expect(r.ok).toBe(true)
  })
})

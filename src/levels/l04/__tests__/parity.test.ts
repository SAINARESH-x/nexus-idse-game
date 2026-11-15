// Mode parity: the same repair through the UI form, the Builder and a typed command gives identical frames.
import { describe, expect, it } from 'vitest'
import { createDfSession, dfEquals, generateStudents, parse } from '../../../engine'
import type { Op } from '../../../engine'
import { BUILDER_METHODS, buildLine, initialArgs, methodsFor, previewLine } from '../builderModel'
import { convertOps, fillOps, replaceOps, standardiseOps } from '../columnForms'
import { BLANK_TEMPLATES, assemble, checkChip, isComplete } from '../fillBlank'

const g = generateStudents({ seed: 42, tier: 'assisted' })
const method = (id: string) => BUILDER_METHODS.find((m) => m.id === id)!

function three(prep: string[], ui: Op[], builder: string, typed: string) {
  const mk = () => {
    const s = createDfSession(g.dirty)
    for (const p of prep) expect(s.apply(p).ok).toBe(true)
    return s
  }
  const a = mk()
  const b = mk()
  const c = mk()
  expect(a.apply(ui, 'ui').ok).toBe(true)
  expect(b.apply(builder, 'command').ok).toBe(true)
  expect(c.apply(typed, 'command').ok).toBe(true)
  expect(dfEquals(a.current, b.current)).toBe(true)
  expect(dfEquals(a.current, c.current)).toBe(true)
}

describe('mode parity', () => {
  it('strip department', () => {
    three([], standardiseOps('department', ['strip']), buildLine(method('str.strip'), 'department', {}), "df['department'] = df['department'].str.strip()")
  })
  it('convert attendance after removing %', () => {
    three([], convertOps('attendance', 'float', true), buildLine(method('str.replace'), 'attendance', { old: '%', new: '', then: 'astype(float)' }), "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)")
  })
  it('median fill on attendance', () => {
    const prep = ["df['attendance'] = df['attendance'].str.replace('%', '').astype(float)"]
    three(prep, fillOps('attendance', 'median', '', true), buildLine(method('fillna'), 'attendance', { with: 'median()' }), "df['attendance'] = df['attendance'].fillna(df['attendance'].median())")
  })
  it('rename a label and mask invalid ages', () => {
    three([], replaceOps('department', 'label', 'CS', 'Computer Science', false), buildLine(method('replace'), 'department', { from: 'CS', to: 'Computer Science' }), "df['department'] = df['department'].replace({'CS': 'Computer Science'})")
    three([], [{ type: 'mask_invalid', column: 'age', min: 16, max: 40 }], buildLine(method('mask'), 'age', { min: '16', max: '40' }), "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan")
  })
})

describe('builder menus', () => {
  it('every method on every applicable target generates a line the parser accepts', () => {
    for (const target of ['df', ...g.dirty.columns]) {
      for (const m of methodsFor(g.dirty, target)) {
        const line = buildLine(m, target, initialArgs(m))
        expect(parse(line).kind, `${m.id} on ${target}: ${line}`).toBe('ops')
      }
    }
    const subset = buildLine(method('drop_duplicates'), 'df', { subset: 'name, department' })
    expect(parse(subset).kind).toBe('ops')
    for (const w of ['median()', 'mean()', 'mode()[0]', 'value']) expect(parse(buildLine(method('fillna'), 'age', { with: w, value: '20' })).kind).toBe('ops')
  })
  it('methods are filtered by dtype', () => {
    expect(methodsFor(g.dirty, 'department').map((m) => m.id)).toContain('str.strip')
    expect(methodsFor(g.dirty, 'age').map((m) => m.id)).not.toContain('str.strip')
    expect(methodsFor(g.dirty, 'age').map((m) => m.id)).toContain('between')
    expect(methodsFor(g.dirty, 'df').map((m) => m.id)).toEqual(['drop_duplicates', 'dropna'])
  })
  it('preview reports rows removed or cells changed, or the engine error', () => {
    expect(previewLine(g.dirty, 'df = df.drop_duplicates()').text).toMatch(/remove 3 rows/)
    expect(previewLine(g.dirty, "df['department'] = df['department'].str.strip()").text).toMatch(/change \d+ cell/)
    expect(previewLine(g.dirty, "df['attendance'] = df['attendance'].fillna(df['attendance'].median())").ok).toBe(false)
  })
})

describe('fill the blank', () => {
  it('every template assembles into a parseable command and wrong chips explain themselves', () => {
    for (const t of BLANK_TEMPLATES) {
      expect(parse(assemble(t, t.answers)).kind).toBe('ops')
      expect(isComplete(t, t.answers)).toBe(true)
      for (const c of t.chips) {
        t.answers.forEach((ans, gap) => {
          const r = checkChip(t, gap, c.id)
          expect(r.correct).toBe(ans === c.id)
          if (!r.correct) expect(r.explanation.length).toBeGreaterThan(10)
        })
      }
    }
  })
})

describe('console safety', () => {
  it('bad input never throws and never executes', () => {
    const s = createDfSession(g.dirty)
    for (const bad of ['import os', '__import__("os")', 'df.eval("1")', ')(', "df['x'", 'exec("x")', '', 'df = df.dropna(subset=[1])', 'df.loc[']) {
      expect(() => s.apply(bad, 'command')).not.toThrow()
    }
    expect(s.history).toHaveLength(0)
    expect(s.apply('import os').ok).toBe(false)
  })
})

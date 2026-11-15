// Tests for the pure string-pipeline interpreter used by Decode the Transmission.
import { describe, expect, it } from 'vitest'
import { L01_TRANSMISSIONS } from '../content'
import {
  opToPython,
  pythonRepr,
  runPipeline,
  valueMatches,
} from '../stringOps'
import type { StringOp } from '../stringOps'

const raw = L01_TRANSMISSIONS[0].raw

const pipeline = (ops: StringOp[]) => runPipeline(raw, ops)

describe('string pipeline interpreter', () => {
  it('strips outer whitespace', () => {
    expect(runPipeline('  hello  ', [{ kind: 'strip' }]).value).toBe('hello')
  })

  it('lowercases and uppercases strings', () => {
    expect(runPipeline('ArJun', [{ kind: 'lower' }]).value).toBe('arjun')
    expect(runPipeline('ArJun', [{ kind: 'upper' }]).value).toBe('ARJUN')
  })

  it('splits on a separator', () => {
    expect(runPipeline('a|b|c', [{ kind: 'split', sep: '|' }]).value).toEqual(['a', 'b', 'c'])
  })

  it('indexes a string and an array', () => {
    expect(runPipeline('abc', [{ kind: 'index', index: 1 }]).value).toBe('b')
    expect(
      runPipeline('a|b|c', [
        { kind: 'split', sep: '|' },
        { kind: 'index', index: 2 },
      ]).value,
    ).toBe('c')
  })

  it('reports an out-of-range index instead of throwing', () => {
    const result = runPipeline('abc', [{ kind: 'index', index: 9 }])
    expect(result.error).toMatch(/out of range/)
    expect(result.value).toBe('abc')
  })

  it('slices a string and a list', () => {
    expect(runPipeline('abcdef', [{ kind: 'slice', start: 1, end: 4 }]).value).toBe('bcd')
    expect(
      runPipeline('a,b,c,d', [
        { kind: 'split', sep: ',' },
        { kind: 'slice', start: 1, end: 3 },
      ]).value,
    ).toEqual(['b', 'c'])
  })

  it('replaces every occurrence', () => {
    expect(runPipeline('a-b-c', [{ kind: 'replace', from: '-', to: '+' }]).value).toBe('a+b+c')
  })

  it('tests a prefix and returns a boolean', () => {
    expect(runPipeline('usr:arjun', [{ kind: 'startswith', prefix: 'usr' }]).value).toBe(true)
    expect(runPipeline('usr:arjun', [{ kind: 'startswith', prefix: 'sys' }]).value).toBe(false)
  })

  it('rejects string-only operations on a list', () => {
    const result = runPipeline('a,b', [
      { kind: 'split', sep: ',' },
      { kind: 'lower' },
    ])
    expect(result.error).toBe('lower() needs str, got list')
  })

  it('extracts the username from a real transmission', () => {
    const result = pipeline([
      { kind: 'strip' },
      { kind: 'split', sep: '|' },
      { kind: 'index', index: 0 },
      { kind: 'strip' },
      { kind: 'split', sep: ':' },
      { kind: 'index', index: 1 },
    ])
    expect(result.value).toBe('ARJUN_k')
    expect(result.steps).toHaveLength(6)
  })

  it('extracts the date from a real transmission', () => {
    const result = pipeline([
      { kind: 'strip' },
      { kind: 'split', sep: '|' },
      { kind: 'index', index: 1 },
      { kind: 'strip' },
    ])
    expect(result.value).toBe('2025-03-07')
  })

  it('extracts and lowercases the status', () => {
    const result = pipeline([
      { kind: 'strip' },
      { kind: 'split', sep: '|' },
      { kind: 'index', index: 2 },
      { kind: 'strip' },
      { kind: 'split', sep: '=' },
      { kind: 'index', index: 1 },
      { kind: 'lower' },
    ])
    expect(result.value).toBe('ok')
  })

  it('renders a Python-like representation and expression', () => {
    expect(pythonRepr("a'b")).toBe("'a\\'b'")
    expect(pythonRepr(['a', 'b'])).toBe("['a', 'b']")
    expect(pythonRepr(null)).toBe('None')
    expect(opToPython({ kind: 'split', sep: '|' })).toBe(".split('|')")
    const result = pipeline([{ kind: 'strip' }, { kind: 'lower' }])
    expect(result.expression).toContain('.strip().lower()')
  })

  it('matches goal targets exactly', () => {
    expect(valueMatches('ok', 'ok')).toBe(true)
    expect(valueMatches('OK', 'ok')).toBe(false)
    expect(valueMatches(3, '3')).toBe(true)
    expect(valueMatches(true, 'True')).toBe(true)
  })
})

// Dictionary access interpreter tests for the Dict Detective side op.
import { describe, expect, it } from 'vitest'
import { accessMatches, displayAccessValue, runAccess } from '../dictAccess'
import { L01_STUDENT_RECORDS } from '../dictData'

describe('dictionary access interpreter', () => {
  it('follows keys then an index', () => {
    const result = runAccess(L01_STUDENT_RECORDS, [
      { kind: 'key', key: 's3' },
      { kind: 'key', key: 'marks' },
      { kind: 'index', index: 1 },
    ])
    expect(result.value).toBe(88)
    expect(result.expression).toBe("d['s3']['marks'][1]")
  })

  it('uses .get with a fallback instead of raising KeyError', () => {
    const result = runAccess(L01_STUDENT_RECORDS, [
      { kind: 'key', key: 's1' },
      { kind: 'get', key: 'email', fallback: 'not found' },
    ])
    expect(result.value).toBe('not found')
    expect(accessMatches(result.value, 'not found')).toBe(true)
  })

  it('lists keys in insertion order', () => {
    const result = runAccess(L01_STUDENT_RECORDS, [{ kind: 'keys' }])
    expect(displayAccessValue(result.value)).toBe('s1, s2, s3, s4, s5, s6, s7, s8')
  })

  it('reports a missing key with a KeyError message', () => {
    const result = runAccess(L01_STUDENT_RECORDS, [
      { kind: 'key', key: 's1' },
      { kind: 'key', key: 'email' },
    ])
    expect(result.error).toContain('KeyError')
  })

  it('rejects indexing a dict by position', () => {
    const result = runAccess(L01_STUDENT_RECORDS, [{ kind: 'index', index: 0 }])
    expect(result.error).toContain('not a list')
  })
})

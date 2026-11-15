// Cohort generator tests: determinism, shape, and every A2 invariant over all 50 seed slots per level.
import { describe, expect, it } from 'vitest'
import { cohortInvariants, generateCohort, steepestFall, toDF } from '../cohort'
import { COHORT_SALTS } from '../cohortConfig'
import { SEED_SLOTS, sessionSeed } from '../../game/levelSession'
import { mixSeed } from '../rng'

describe('generateCohort', () => {
  it('is deterministic and seed-sensitive', () => {
    const a = generateCohort({ seed: 5000, n: 240 })
    expect(generateCohort({ seed: 5000, n: 240 })).toEqual(a)
    expect(generateCohort({ seed: 5017, n: 240 })).not.toEqual(a)
    expect(a).toHaveLength(240)
  })
  it('converts to the DF shape', () => {
    const df = toDF(generateCohort({ seed: 1, n: 10 }))
    expect(df.columns).toContain('dropped_out')
    expect(df.rows[3].idx).toBe(3)
    expect(df.rows[3].v.student_id).toBe('S0004')
  })
  it('handles n = 0', () => {
    expect(generateCohort({ seed: 1, n: 0 })).toEqual([])
  })
})

describe('steepestFall', () => {
  it('finds the edge with the largest drop, ignoring small bins', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => ({ attendance: 57, dropped_out: (i < 6 ? 1 : 0) as 0 | 1 })),
      ...Array.from({ length: 10 }, (_, i) => ({ attendance: 62, dropped_out: (i < 1 ? 1 : 0) as 0 | 1 })),
      ...Array.from({ length: 3 }, () => ({ attendance: 66, dropped_out: 0 as const })),
    ]
    expect(steepestFall(rows)).toBe(60)
    expect(steepestFall([])).toBeNaN()
  })
})

describe('dropout band targets', () => {
  it('band rates land near 0.45 / 0.15 / 0.05 (within 0.05) and overall near 0.15', () => {
    for (let k = 0; k < SEED_SLOTS; k += 1) {
      const c = generateCohort({ seed: sessionSeed(6, k), n: 2000 })
      const r = (f: (a: number) => boolean): number => {
        const g = c.filter((x) => f(x.attendance))
        return g.reduce((a, x) => a + x.dropped_out, 0) / g.length
      }
      expect(Math.abs(r((a) => a < 60) - 0.45)).toBeLessThanOrEqual(0.05)
      expect(Math.abs(r((a) => a >= 60 && a < 75) - 0.15)).toBeLessThanOrEqual(0.05)
      expect(Math.abs(r((a) => a >= 75) - 0.05)).toBeLessThanOrEqual(0.05)
      expect(Math.abs(r(() => true) - 0.15)).toBeLessThanOrEqual(0.05)
    }
  })
})

const LEVELS: [number, number][] = [
  [5, 240],
  [6, 2000],
  [7, 300],
]

describe('cohortInvariants over all seed slots', () => {
  it(
    'holds for every slot of Levels 5, 6, 7',
    () => {
      const tight = new Map<string, { min: number; max: number }>()
      const failures: string[] = []
      for (const [level, n] of LEVELS) {
        for (let k = 0; k < SEED_SLOTS; k += 1) {
          const seed = sessionSeed(level, k)
          const inv = cohortInvariants(generateCohort({ seed, n }), mixSeed(seed, COHORT_SALTS.perm, 0))
          for (const i of inv) {
            const key = `L${level} ${i.name}`
            const t = tight.get(key) ?? { min: Infinity, max: -Infinity }
            tight.set(key, { min: Math.min(t.min, i.value), max: Math.max(t.max, i.value) })
            if (!i.ok) failures.push(`${key} slot ${k}: ${i.value}`)
          }
        }
      }
      if (process.env.COHORT_REPORT) {
        for (const [k, v] of tight) process.stdout.write(`${k}: ${v.min.toFixed(4)} .. ${v.max.toFixed(4)}\n`)
      }
      expect(failures).toEqual([])
    },
    120000,
  )
})

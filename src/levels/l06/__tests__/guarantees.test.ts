// Level 06 B1 guarantees over every seed slot: SE ratio, convenience bias, CI coverage, verdict stability, fishing trip, coverage bands.
import { describe, expect, it } from 'vitest'
import { generateCohort } from '../../../engine/cohort'
import { mixSeed } from '../../../engine/rng'
import { mean, popStd } from '../../../engine/stats'
import { SEED_SLOTS, sessionSeed } from '../../../game/levelSession'
import { ALPHAS, CONVENIENCE_BIAS_MIN, L06_N, L06_SALTS, REPEAT_REPS, REPLICATOR_RERUNS, SE_TARGET, VERDICT_SHUFFLES } from '../config'
import { detectiveCases } from '../distributions'
import {
  correctVerdict, coverageRun, dropoutCiDraw, empiricalSE, fishingTrip, hypothesisGroups, permSeed, permutationTest,
  sampleMeans, theoreticalSE,
} from '../statsLab'

const slots = Array.from({ length: SEED_SLOTS }, (_, i) => sessionSeed(6, i))
const cohorts = new Map<number, ReturnType<typeof generateCohort>>()
const cohort = (seed: number) => {
  const hit = cohorts.get(seed)
  if (hit) return hit
  const rows = generateCohort({ seed, n: L06_N })
  cohorts.set(seed, rows)
  return rows
}

describe('Level 06 guarantees (all 50 slots)', () => {
  it('a random sample with theoretical SE <= 0.10 exists at n <= 500 and the empirical SE tracks it', () => {
    for (const seed of slots) {
      const rows = cohort(seed)
      const cg = rows.map((r) => r.cgpa)
      const n = Math.ceil((popStd(cg) / SE_TARGET) ** 2)
      expect(n).toBeLessThanOrEqual(500)
      expect(theoreticalSE(cg, n)).toBeLessThanOrEqual(SE_TARGET + 1e-12)
      for (const run of [0, 1]) {
        const res = sampleMeans(rows, n, REPEAT_REPS, mixSeed(seed, L06_SALTS.sampling, run), 'random')
        const ratio = empiricalSE(res.means) / theoreticalSE(cg, n)
        expect(ratio).toBeGreaterThan(0.7)
        expect(ratio).toBeLessThan(1.3)
      }
    }
  }, 60000)

  it('convenience samples stay biased by more than 0.3 at every n', () => {
    for (const seed of slots) {
      const rows = cohort(seed)
      for (const n of [50, 300, 500]) {
        const res = sampleMeans(rows, n, REPEAT_REPS, mixSeed(seed, L06_SALTS.sampling, 0), 'convenience')
        expect(mean(res.means) - res.trueMean).toBeGreaterThan(CONVENIENCE_BIAS_MIN)
      }
    }
  }, 60000)

  it('at n = 400 and 95% one of draws 0-4 covers the true dropout rate', () => {
    for (const seed of slots) {
      const rows = cohort(seed)
      expect([0, 1, 2, 3, 4].some((d) => dropoutCiDraw(rows, 400, 0.95, seed, d).covers)).toBe(true)
    }
  }, 60000)

  it('both verdicts are reject at both alphas for re-runs 0..3 at 1000 shuffles', () => {
    for (const seed of slots) {
      const rows = cohort(seed)
      for (const q of ['attendance', 'scholarship'] as const) {
        const g = hypothesisGroups(rows, q)
        for (let r = 0; r <= REPLICATOR_RERUNS; r += 1) {
          const p = permutationTest(g.a, g.b, VERDICT_SHUFFLES, permSeed(seed, r)).pValue
          for (const alpha of ALPHAS) expect(correctVerdict(p, alpha)).toBe('reject')
        }
      }
    }
  }, 120000)

  it('fishing trip: at least one raw false positive and none after Bonferroni', () => {
    for (const seed of slots) {
      const trip = fishingTrip(cohort(seed), seed)
      expect(trip.comparisons).toHaveLength(20)
      expect(trip.rawSignificant).toBeGreaterThanOrEqual(1)
      expect(trip.bonferroniSignificant).toBe(0)
    }
  }, 60000)

  it('coverage casino at n = 50: 95% in 88-100 and 80% in 68-92', () => {
    for (const seed of slots) {
      const rows = cohort(seed)
      const c95 = coverageRun(rows, 50, 0.95, seed, 0, 100).covered
      const c80 = coverageRun(rows, 50, 0.8, seed, 0, 100).covered
      expect(c95).toBeGreaterThanOrEqual(88)
      expect(c80).toBeGreaterThanOrEqual(68)
      expect(c80).toBeLessThanOrEqual(92)
    }
  }, 60000)

  it('distribution detective relations are stable: skewed above, the rest about equal', () => {
    for (const seed of slots) {
      for (const c of detectiveCases(seed)) expect(c.relation).toBe(c.shape === 'skewed' ? 'above' : 'equal')
    }
  }, 60000)
})

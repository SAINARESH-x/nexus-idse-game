// Level 06 population cache (pure): the n = 2000 cohort per seed, generated once and reused across stages.
import { generateCohort, type CohortStudent } from '../../engine/cohort'
import { L06_N } from './config'

const cache = new Map<number, CohortStudent[]>()

export function l06Population(seed: number): CohortStudent[] {
  const hit = cache.get(seed)
  if (hit) return hit
  const rows = generateCohort({ seed, n: L06_N })
  if (cache.size > 4) cache.clear()
  cache.set(seed, rows)
  return rows
}

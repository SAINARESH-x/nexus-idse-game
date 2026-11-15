// Ghost Hunt side op (pure): numeric working frame that keeps the fabricated rows, plus selection scoring.
import { applyAll, columnDtype, generateStudents, isNumericDtype } from '../../engine'
import type { DF, Op, Tier } from '../../engine'

export interface GhostHuntData {
  df: DF
  ghosts: number[]
}

/** Converts attendance and cgpa to numbers, drops exact duplicates, and KEEPS the ghost rows. */
export function prepareGhostHuntDf(seed: number, tier: Tier): GhostHuntData {
  const g = generateStudents({ seed, tier })
  let df = g.dirty
  const steps: Op[][] = [[{ type: 'drop_duplicates' }]]
  for (const col of ['attendance', 'cgpa']) {
    if (!isNumericDtype(columnDtype(df, col))) {
      steps.push([{ type: 'str_replace', column: col, old: '%', new: '' }, { type: 'to_numeric', column: col, errors: 'coerce' }])
    }
  }
  for (const ops of steps) {
    const r = applyAll(df, ops)
    if (r.ok) df = r.df
  }
  const kept = new Set(df.rows.map((r) => r.idx))
  return { df, ghosts: g.ghosts.filter((x) => kept.has(x)) }
}

export interface GhostHuntScore {
  precision: number
  recall: number
  f1: number
  hits: number[]
  misses: number[]
  falsePositives: number[]
  passed: boolean
}

/** Passing needs F1 of at least 0.75 (for four ghosts: three found with no false positive). */
export const GHOST_PASS_F1 = 0.75

export function ghostHuntScore(selected: number[], ghosts: number[]): GhostHuntScore {
  const sel = [...new Set(selected)]
  const g = new Set(ghosts)
  const hits = sel.filter((x) => g.has(x))
  const falsePositives = sel.filter((x) => !g.has(x))
  const misses = ghosts.filter((x) => !sel.includes(x))
  const precision = sel.length ? hits.length / sel.length : 0
  const recall = ghosts.length ? hits.length / ghosts.length : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  return { precision, recall, f1, hits, misses, falsePositives, passed: f1 >= GHOST_PASS_F1 }
}

/** Why one row looks fabricated, computed from its values (empty when nothing stands out). */
export function ghostSignals(df: DF, idx: number): string[] {
  const r = df.rows.find((x) => x.idx === idx)
  if (!r) return []
  const out: string[] = []
  if (r.v.attendance === 100) out.push('attendance exactly 100')
  if (r.v.cgpa === 10) out.push('cgpa exactly 10.0')
  if (r.v.dropped_out === 0) out.push('never dropped out')
  if (r.v.scholarship === 'Yes') out.push('holds a scholarship')
  return out
}

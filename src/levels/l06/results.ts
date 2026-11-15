// Level 06 result builder (pure): turns stage counters into an honest ChallengeResult.
import type { ChallengeResult, Decision } from '../../game/types'

export interface StageTally {
  /** Checks or verdicts that were wrong. */
  mistakes: number
  /** Number of graded steps in the stage. */
  steps: number
  /** Simulations actually run, and the par for an efficient run. */
  runs: number
  parRuns: number
  decisions: Decision[]
  extra?: ChallengeResult['extra']
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function buildResult(id: string, t: StageTally): ChallengeResult {
  const good = t.decisions.filter((d) => d.good === true).length
  const graded = t.decisions.filter((d) => d.good !== null).length
  return {
    id,
    accuracy: clamp(t.steps / (t.steps + t.mistakes), 0, 1),
    decisionQuality: graded ? good / graded : 1,
    efficiency: clamp(t.parRuns / Math.max(1, t.runs), 0.3, 1),
    hintsUsed: 0,
    mistakes: t.mistakes,
    decisions: t.decisions,
    ...(t.extra ? { extra: t.extra } : {}),
  }
}

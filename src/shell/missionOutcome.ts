// Pure mission summary: aggregates stage results and builds the bonus session.
import { aggregate, compositeScore, ratingForScore } from '../game/progression'
import type {
  ChallengeResult,
  LevelId,
  MissionAggregate,
  MissionSession,
  Rating,
} from '../game/types'

export interface MissionOutcome {
  aggregate: MissionAggregate
  composite: number
  rating: Rating
  session: MissionSession
  decisions: MissionSession['decisions']
  mistakes: number
  hintsUsed: number
  facts: MissionSession['facts']
}

/**
 * Turns ordered stage results into the numbers the debrief and bonuses use.
 * `hintsUsed` is the shell's canonical counter; stage results keep their own
 * per-stage split so the aggregate stays correct.
 */
export function buildMissionOutcome(
  levelId: LevelId,
  kind: MissionSession['kind'],
  results: ChallengeResult[],
  hintsUsed: number,
): MissionOutcome {
  const aggregateResult = aggregate(results)
  const composite = compositeScore(aggregateResult)
  const facts: MissionSession['facts'] = {}

  for (const result of results) {
    if (!result.extra) continue
    for (const [key, value] of Object.entries(result.extra)) facts[key] = value
  }

  const resultsById: Record<string, ChallengeResult> = {}
  for (const result of results) resultsById[result.id] = result

  const session: MissionSession = {
    levelId,
    kind,
    results: resultsById,
    hintsUsed: Math.max(0, Math.floor(hintsUsed)),
    mistakes: aggregateResult.mistakes,
    decisions: results.flatMap((result) => result.decisions),
    facts,
  }

  return {
    aggregate: aggregateResult,
    composite,
    rating: ratingForScore(composite),
    session,
    decisions: session.decisions,
    mistakes: session.mistakes,
    hintsUsed: session.hintsUsed,
    facts,
  }
}

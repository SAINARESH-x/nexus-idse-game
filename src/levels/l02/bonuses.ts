// Level 02 bonus evaluators: rule economy, first-run functions and the hidden dead-code archive.
import type { MissionSession } from '../../game/types'

/** ELEGANT RULES: Stage 1 solved with four rules or fewer. */
export function elegantRules(session: MissionSession): boolean {
  return session.results['l2-stage-1']?.extra?.elegant === true
}

/** ZERO RETRIES: every hidden function test passed on the first submission. */
export function zeroRetries(session: MissionSession): boolean {
  return session.results['l2-stage-3']?.extra?.zeroRetries === true
}

/** HIDDEN DEAD CODE: the unreachable archive rule was flagged in Stage 1. */
export function deadCode(session: MissionSession): boolean {
  return (
    session.facts.deadCodeSpotted === true ||
    session.results['l2-stage-1']?.extra?.deadCodeSpotted === true
  )
}

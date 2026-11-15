// Level 06 bonus evaluators: Replicator, No Assistance and the hidden Fishing Expedition.
import type { MissionSession } from '../../game/types'
import { REPLICATOR_RERUNS } from './config'

/** Facts keys reported by Stage 3 through ChallengeResult.extra. */
export const L06_FACTS = {
  reruns: 'l6Reruns',
  verdictStable: 'l6VerdictStable',
  falsePositiveFlagged: 'l6FalsePositiveFlagged',
} as const

const fact = (session: MissionSession, key: string) => session.facts[key] ?? session.results['l6-stage-3']?.extra?.[key]

/** REPLICATOR: three RE-RUN WITH NEW SEED presses at 1000 shuffles with an unchanged verdict. */
export function replicator(session: MissionSession): boolean {
  const reruns = fact(session, L06_FACTS.reruns)
  return typeof reruns === 'number' && reruns >= REPLICATOR_RERUNS && fact(session, L06_FACTS.verdictStable) === true
}

/** NO ASSISTANCE: the whole main mission without revealing a hint. */
export function noAssistance(session: MissionSession): boolean {
  return (
    session.kind === 'main' &&
    session.hintsUsed === 0 &&
    ['l6-stage-1', 'l6-stage-2', 'l6-stage-3'].every((id) => Boolean(session.results[id]))
  )
}

/** HIDDEN FISHING EXPEDITION: a raw-significant noise comparison was flagged as a false positive. */
export function fishingExpedition(session: MissionSession): boolean {
  return fact(session, L06_FACTS.falsePositiveFlagged) === true
}

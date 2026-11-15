// Level 03 bonus evaluators: one-line vector solution, no hints and the hidden drift pattern.
import type { MissionSession } from '../../game/types'

/** ONE-LINER: Stage 3b solved with np.argmax(arr.mean(axis=0)). */
export function oneLiner(session: MissionSession): boolean {
  return session.results['l3-stage-3']?.extra?.oneLiner === true
}

/** NO HINTS: all three main stages completed without revealing a hint. */
export function noHints(session: MissionSession): boolean {
  return (
    session.kind === 'main' &&
    session.hintsUsed === 0 &&
    Boolean(session.results['l3-stage-1']) &&
    Boolean(session.results['l3-stage-2']) &&
    Boolean(session.results['l3-stage-3'])
  )
}

/** HIDDEN PATTERN: the +0.4 drift was flagged in the Mission Log. */
export function driftPattern(session: MissionSession): boolean {
  return (
    session.facts.patternNoticed === true ||
    session.results['l3-stage-3']?.extra?.patternNoticed === true
  )
}

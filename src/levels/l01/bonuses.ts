// Level 01 bonus evaluators: pure functions over a completed mission session.
import type { MissionSession } from '../../game/types'

/** CLEAN SWEEP: Stage 1 finished with zero wrong drops. */
export function cleanSweep(session: MissionSession): boolean {
  const stage = session.results['l1-stage-1']
  return Boolean(stage) && stage.mistakes === 0
}

/** NO ASSISTANCE: the main mission was completed without revealing a hint. */
export function noAssistance(session: MissionSession): boolean {
  return (
    session.kind === 'main' &&
    session.hintsUsed === 0 &&
    Boolean(session.results['l1-stage-1']) &&
    Boolean(session.results['l1-stage-2']) &&
    Boolean(session.results['l1-stage-3'])
  )
}

/** HIDDEN EASTER EGG: the NEXUS_ZERO line was selected in Stage 2. */
export function easterEgg(session: MissionSession): boolean {
  const stage = session.results['l1-stage-2']
  return session.facts.easterEgg === true || stage?.extra?.easterEgg === true
}

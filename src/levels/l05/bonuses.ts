// Level 05 bonus evaluators: Right First Time, No Assistance and the hidden Dropout Cliff.
import type { MissionSession } from '../../game/types'

export const L05_STAGE_IDS = ['l5-stage-1', 'l5-stage-2', 'l5-stage-3'] as const

/** RIGHT FIRST TIME: no wrong chart choice in Stage 2 (fact `wrongCharts`). */
export function rightFirstTime(session: MissionSession): boolean {
  const extra = session.results['l5-stage-2']?.extra
  return session.kind === 'main' && extra !== undefined && extra.wrongCharts === 0
}

/** NO ASSISTANCE: every main stage done with zero hints. */
export function noAssistance(session: MissionSession): boolean {
  return session.kind === 'main' && session.hintsUsed === 0 && L05_STAGE_IDS.every((id) => Boolean(session.results[id]))
}

/** DROPOUT CLIFF (hidden): a Stage 3 selection boundary within 3 points of steepestFall (fact `dropoutCliff`). */
export function dropoutCliff(session: MissionSession): boolean {
  return session.results['l5-stage-3']?.extra?.dropoutCliff === true || session.facts.dropoutCliff === true
}

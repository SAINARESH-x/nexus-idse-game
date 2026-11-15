// Level 04 bonus evaluators (pure): read the mission facts written by finish.ts buildFacts.
import type { MissionSession } from '../../game/types'

const n = (s: MissionSession, k: string): number => (typeof s.facts[k] === 'number' ? (s.facts[k] as number) : NaN)

/** ZERO CASUALTIES: every legitimate student kept and no bad decision left in place. */
export const zeroCasualties = (s: MissionSession): boolean => n(s, 'preservation') === 1 && n(s, 'badKept') === 0

/** PAR OR BETTER: history entries at most the tier's par (and at least one repair). */
export const parOrBetter = (s: MissionSession): boolean => n(s, 'opsCount') > 0 && n(s, 'opsCount') <= n(s, 'par')

/** GHOST HUNTER (hidden): Anomaly flags in Stage 2 hit at least 3 of the 4 ghost rows. */
export const ghostHunter = (s: MissionSession): boolean => n(s, 'ghostsFound') >= 3

// Level 01 definition: data-driven stages, side ops and bonus evaluators.
import type { LevelDefinition } from '../../game/types'
import { L01_OBJECTIVES, L01_SIDE_OPS, L01_STAGES } from './content'
import { cleanSweep, easterEgg, noAssistance } from './bonuses'

export const LEVEL_1: LevelDefinition = {
  id: 1,
  title: 'THE INTERFACE',
  syllabus: 'Python basics: data types, strings, lists, sets, tuples, dicts',
  mission: 'FIRST CONTACT',
  briefing:
    'The intake feed arrives garbled. Twelve values spill out of the wreckage — strings pretending to be numbers, booleans wearing quotes, collections with no labels. NEXUS cannot name what it cannot see, and the new recruit is the only operator on the channel. Sort the primitives. Decode the transmissions. File the evidence under the collection type that will not betray it. Somewhere in the noise, a line signs itself NEXUS_ZERO. Recover it, and the first memory fragment will surface.',
  objectives: L01_OBJECTIVES.map((objective) => objective.label),
  stages: L01_STAGES,
  sideOps: L01_SIDE_OPS,
  bonuses: [
    {
      id: 'l1-bonus-1',
      title: 'CLEAN SWEEP',
      description: 'Finish INTAKE SORTING with zero wrong drops.',
      hidden: false,
      evaluate: cleanSweep,
    },
    {
      id: 'l1-bonus-2',
      title: 'NO ASSISTANCE',
      description: 'Complete the main mission without revealing a hint.',
      hidden: false,
      evaluate: noAssistance,
    },
    {
      id: 'l1-bonus-hidden',
      title: 'EASTER EGG',
      description: 'Find the transmission that decodes to NEXUS_ZERO.',
      hidden: true,
      evaluate: easterEgg,
    },
  ],
  fragmentId: 'F1',
}

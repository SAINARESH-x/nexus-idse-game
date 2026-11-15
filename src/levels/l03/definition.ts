// Level 03 definition: the sensor grid workbench, slicing lab and vector operations.
import type { LevelDefinition } from '../../game/types'
import { driftPattern, noHints, oneLiner } from './bonuses'
import { L03_OBJECTIVES, L03_SIDE_OPS, L03_STAGES } from './content'

export const LEVEL_3: LevelDefinition = {
  id: 3,
  title: 'MATRIX CORE',
  syllabus: 'NumPy arrays, slicing, masks, vectorisation',
  mission: 'SIGNAL GRID',
  briefing:
    'NEXUS remembers a grid of sensors, not a list of them. Six cycles, six sensors, thirty-six readings — and one column that climbs by four tenths every cycle. Learn to think in whole arrays: read the shape, slice the signal, mask the faults, then replace the slow double loop with one vector operation. A hundred sensors could hide a liar; an array operation will not.',
  objectives: L03_OBJECTIVES.map((objective) => objective.label),
  stages: L03_STAGES,
  sideOps: L03_SIDE_OPS,
  bonuses: [
    {
      id: 'l3-bonus-1',
      title: 'ONE-LINER',
      description: 'Find the drifting sensor with the single chained expression np.argmax(arr.mean(axis=0)).',
      hidden: false,
      evaluate: oneLiner,
    },
    {
      id: 'l3-bonus-2',
      title: 'NO HINTS',
      description: 'Complete the main mission without revealing a hint.',
      hidden: false,
      evaluate: noHints,
    },
    {
      id: 'l3-bonus-hidden',
      title: 'PATTERN',
      description: 'Notice the +0.4 drift and flag it in the Mission Log.',
      hidden: true,
      evaluate: driftPattern,
    },
  ],
  fragmentId: 'F3',
}

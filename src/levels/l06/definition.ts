// Level 06 definition: CHANCE ENGINE / SIGNAL OR NOISE, probability and inferential statistics on a lab bench.
import type { LevelDefinition } from '../../game/types'
import { fishingExpedition, noAssistance, replicator } from './bonuses'
import { L06_OBJECTIVES, L06_SIDE_OPS, L06_STAGES } from './content'

export const LEVEL_6: LevelDefinition = {
  id: 6,
  title: 'CHANCE ENGINE',
  syllabus: 'Probability and inferential statistics',
  mission: 'SIGNAL OR NOISE',
  briefing:
    'The university changed its attendance policy and wants to know if it works. It cannot survey all 2000 students, outcomes are noisy, and a dean has already seen "a pattern". NEXUS was fooled by coincidence once. Measure chance first: events and conditional probability, then honest samples and intervals, then a permutation test that asks whether the pattern could be noise. A pattern is not a reason until chance has been ruled out.',
  objectives: L06_OBJECTIVES.map((o) => o.label),
  stages: L06_STAGES,
  sideOps: L06_SIDE_OPS,
  bonuses: [
    {
      id: 'l6-bonus-1',
      title: 'REPLICATOR',
      description: 'In THE VERDICT, press RE-RUN WITH NEW SEED three times at 1000 shuffles and keep the same verdict.',
      hidden: false,
      evaluate: replicator,
    },
    {
      id: 'l6-bonus-2',
      title: 'NO ASSISTANCE',
      description: 'Complete the main mission without revealing a hint.',
      hidden: false,
      evaluate: noAssistance,
    },
    {
      id: 'l6-bonus-hidden',
      title: 'FISHING EXPEDITION',
      description: 'Spot and flag a false positive in the fishing trip.',
      hidden: true,
      evaluate: fishingExpedition,
    },
  ],
  fragmentId: 'F6',
}

// Level 05 definition: SIGNAL SCOPE, the analysis desk where the Dean's dropout question is answered.
import type { LevelDefinition } from '../../game/types'
import { dropoutCliff, noAssistance, rightFirstTime } from './bonuses'
import { L05_OBJECTIVES, L05_SIDE_OPS, L05_STAGES } from './content'

export const LEVEL_5: LevelDefinition = {
  id: 5,
  title: 'SIGNAL SCOPE',
  syllabus: 'Descriptive statistics, visualisation and EDA',
  mission: 'FIND THE PATTERN',
  briefing:
    "The Dean's office has a question and a deadline: why are students leaving? The 240-student cohort is already clean. Your desk has group-by tables, distributions, charts and a brush. Profile the data, pick charts that do not lie, then find the attendance range where dropout spikes and report it honestly: an association with its numbers, never a cause you cannot prove.",
  objectives: L05_OBJECTIVES.map((o) => o.label),
  stages: L05_STAGES,
  sideOps: L05_SIDE_OPS,
  bonuses: [
    { id: 'l5-bonus-1', title: 'RIGHT FIRST TIME', description: 'Solve every chart brief in Stage 2 without a wrong chart choice.', hidden: false, evaluate: rightFirstTime },
    { id: 'l5-bonus-2', title: 'NO ASSISTANCE', description: 'Complete the main mission without revealing a hint.', hidden: false, evaluate: noAssistance },
    { id: 'l5-bonus-hidden', title: 'DROPOUT CLIFF', description: 'Place a boundary of your selection right at the steepest fall in dropout.', hidden: true, evaluate: dropoutCliff },
  ],
  fragmentId: 'F5',
}

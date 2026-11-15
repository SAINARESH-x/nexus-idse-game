// Level 02 definition: the gatekeeper rule engine, loop lab and function forge.
import type { LevelDefinition } from '../../game/types'
import { deadCode, elegantRules, zeroRetries } from './bonuses'
import { L02_OBJECTIVES, L02_SIDE_OPS, L02_STAGES } from './content'

export const LEVEL_2: LevelDefinition = {
  id: 2,
  title: 'LOGIC PROTOCOL',
  syllabus: 'Control flow, loops, functions',
  mission: 'GATEKEEPER',
  briefing:
    "A rulebook survived the crash. Packets still arrive at the campus gate, and every one carries a size, a source, a checksum and a priority. The gatekeeper is gone; only its broken rule stack remains. Rebuild the branches in the right order, drive the patrol loops with break and continue, then seal the checks inside functions that can be called again and again. One edge case is enough to poison the whole gate.",
  objectives: L02_OBJECTIVES.map((objective) => objective.label),
  stages: L02_STAGES,
  sideOps: L02_SIDE_OPS,
  bonuses: [
    {
      id: 'l2-bonus-1',
      title: 'ELEGANT RULES',
      description: 'Clear BRANCH LOGIC with four rules or fewer.',
      hidden: false,
      evaluate: elegantRules,
    },
    {
      id: 'l2-bonus-2',
      title: 'ZERO RETRIES',
      description: 'Pass every FUNCTION FORGE hidden test on the first run.',
      hidden: false,
      evaluate: zeroRetries,
    },
    {
      id: 'l2-bonus-hidden',
      title: 'DEAD CODE',
      description: 'Spot the unreachable rule in the pre-crash archive.',
      hidden: true,
      evaluate: deadCode,
    },
  ],
  fragmentId: 'F2',
}

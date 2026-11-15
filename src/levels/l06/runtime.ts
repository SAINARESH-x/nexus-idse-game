// Level 06 runtime: lab-bench challenges, objectives and persisted stage inputs.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL06Challenge } from './challenges'
import { L06_OBJECTIVES, L06_SIDE_OBJECTIVES } from './content'
import { L06_INITIAL_STATES, L06_VALIDATORS } from './stageStates'

export const L06_RUNTIME: LevelRuntime = {
  renderChallenge: renderL06Challenge,
  mainObjectives: L06_OBJECTIVES,
  sideObjectives: L06_SIDE_OBJECTIVES,
  persistent: { validators: L06_VALIDATORS, initialStates: L06_INITIAL_STATES },
}

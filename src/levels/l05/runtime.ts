// Level 05 runtime: analysis-desk challenges, objectives and persisted stage inputs.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL05Challenge } from './challenges'
import { L05_OBJECTIVES, L05_SIDE_OBJECTIVES } from './content'
import { L05_INITIAL_STATES, L05_VALIDATORS } from './state'

export const L05_RUNTIME: LevelRuntime = {
  renderChallenge: renderL05Challenge,
  mainObjectives: L05_OBJECTIVES,
  sideObjectives: L05_SIDE_OBJECTIVES,
  persistent: { validators: L05_VALIDATORS, initialStates: L05_INITIAL_STATES },
}

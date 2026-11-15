// Level 07 runtime: shell challenges, objectives and persisted stage state for the main mission.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL07Challenge } from './challenges'
import { L07_OBJECTIVES, L07_SIDE_OBJECTIVES } from './content'
import { L07_INITIAL_STATES, L07_VALIDATORS } from './state'

export const L07_RUNTIME: LevelRuntime = {
  renderChallenge: renderL07Challenge,
  mainObjectives: L07_OBJECTIVES,
  sideObjectives: L07_SIDE_OBJECTIVES,
  persistent: { validators: L07_VALIDATORS, initialStates: L07_INITIAL_STATES },
}

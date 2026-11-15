// Level 01 runtime: shell-based challenges and objectives.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL01Challenge } from './challenges'
import { L01_OBJECTIVES, L01_SIDE_OBJECTIVES } from './content'

export const L01_RUNTIME: LevelRuntime = {
  renderChallenge: renderL01Challenge,
  mainObjectives: L01_OBJECTIVES,
  sideObjectives: L01_SIDE_OBJECTIVES,
}

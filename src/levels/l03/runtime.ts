// Level 03 runtime: shell-based challenges and objectives.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL03Challenge } from './challenges'
import { L03_OBJECTIVES, L03_SIDE_OBJECTIVES } from './content'

export const L03_RUNTIME: LevelRuntime = {
  renderChallenge: renderL03Challenge,
  mainObjectives: L03_OBJECTIVES,
  sideObjectives: L03_SIDE_OBJECTIVES,
}

// Level 02 runtime: shell-based challenges and objectives.
import type { LevelRuntime } from '../../game/levels/runtime'
import { renderL02Challenge } from './challenges'
import { L02_OBJECTIVES, L02_SIDE_OBJECTIVES } from './content'

export const L02_RUNTIME: LevelRuntime = {
  renderChallenge: renderL02Challenge,
  mainObjectives: L02_OBJECTIVES,
  sideObjectives: L02_SIDE_OBJECTIVES,
}

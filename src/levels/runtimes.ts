// Runtime lookup for all seven levels (the single place Play, Briefing and Debrief resolve a level's screens).
import type { LevelRuntime } from '../game/levels/runtime'
import type { LevelId } from '../game/types'
import { L01_RUNTIME } from './l01/runtime'
import { L02_RUNTIME } from './l02/runtime'
import { L03_RUNTIME } from './l03/runtime'
import { L04_RUNTIME } from './l04/runtime'
import { L05_RUNTIME } from './l05/runtime'
import { L06_RUNTIME } from './l06/runtime'
import { L07_RUNTIME } from './l07/runtime'

export const LEVEL_RUNTIMES: Record<LevelId, LevelRuntime> = {
  1: L01_RUNTIME,
  2: L02_RUNTIME,
  3: L03_RUNTIME,
  4: L04_RUNTIME,
  5: L05_RUNTIME,
  6: L06_RUNTIME,
  7: L07_RUNTIME,
}

export const runtimeFor = (levelId: LevelId): LevelRuntime => LEVEL_RUNTIMES[levelId]

/** A level is playable when its runtime provides a main mission. */
export const hasMainMission = (runtime: LevelRuntime): boolean =>
  Boolean(runtime.MainMission || runtime.renderChallenge)

// Level runtime contract: how a level plugs its screens into the shared Play, Briefing and Debrief routes.
import type { ComponentType, ReactNode } from 'react'
import type { StageStateValidator } from '../levelSession'
import type { ChallengeProps } from '../types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'

export interface LevelRuntime {
  /** Shell-based levels: maps a stage or side-op id to its challenge component. */
  renderChallenge?: (challengeId: string, props: ChallengeProps) => ReactNode
  mainObjectives?: MissionObjectiveDef[]
  sideObjectives?: Record<string, MissionObjectiveDef[]>
  /**
   * Levels 05-07: the main mission persists its stage progress and per-stage
   * inputs in `nexus-lNN-session` through PersistentMission.
   */
  persistent?: {
    validators?: Record<string, StageStateValidator>
    initialStates?: Record<string, unknown>
  }
  /** A fully custom main-mission screen (Level 04 workspace). */
  MainMission?: ComponentType
  /** A fully custom side-op screen; otherwise side ops run in MissionShell via renderChallenge. */
  SideOp?: ComponentType<{ sideOpId: string }>
  /** Extra debrief content rendered under the shared DebriefScreen. */
  DebriefExtra?: ComponentType<{ sideOpId: string | null }>
  /** Custom debrief replacing the shared one (Level 04). */
  Debrief?: ComponentType<{ sideOpId: string | null }>
  /** Custom briefing actions (Level 04 CONTINUE / BEGIN with clearance). */
  BriefingActions?: ComponentType
}

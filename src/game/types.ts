// Core campaign types shared by the store, progression rules and level registry.

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Tier = 'assisted' | 'independent' | 'expert'
export type Rating = 'S' | 'A' | 'B' | 'C'

/** One judgement made during a challenge, explained after the fact. */
export interface Decision {
  label: string
  good: boolean | null
  explanation: string
  redundant?: boolean
}

/** The measured outcome of one stage or side operation. */
export interface ChallengeResult {
  id: string
  /** 0..1 */
  accuracy: number
  /** 0..1 */
  decisionQuality: number
  /** 0..1 */
  efficiency: number
  hintsUsed: number
  mistakes: number
  decisions: Decision[]
  extra?: Record<string, number | string | boolean>
}

/** Aggregated challenge metrics used for scoring and XP. */
export interface MissionAggregate {
  accuracy: number
  decisionQuality: number
  efficiency: number
  hintsUsed: number
  mistakes: number
}

export interface StageDef {
  id: string
  title: string
  subtitle?: string
  hints: string[]
}

export interface SideOpDef {
  id: string
  title: string
  blurb: string
  hints: string[]
}

/**
 * Opaque handle to a live mission session. Each level owns its concrete
 * session shape; bonus evaluators narrow this value as needed.
 */
export type MissionSession = object

export interface BonusDef {
  id: string
  title: string
  description: string
  hidden: boolean
  evaluate: (session: MissionSession) => boolean
}

export interface LevelDefinition {
  id: LevelId
  title: string
  syllabus: string
  mission: string
  briefing: string
  objectives: string[]
  stages: StageDef[]
  sideOps: SideOpDef[]
  bonuses: BonusDef[]
  /** 'F1'..'F7' */
  fragmentId: string
}

export interface LevelProgress {
  unlocked: boolean
  completed: boolean
  bestComposite: number
  bestXp: number
  rating?: Rating
  sideOpsDone: string[]
  bonusesEarned: string[]
  attempts: number
  /** Per-level facts for achievements, e.g. `stage:scan` or `bestIntegrity`. */
  stats: Record<string, number | boolean | string>
}

export interface PlayerProfile {
  callsign: string
  xp: number
  credits: number
  theme: string
  soundOn: boolean
}

export interface AdaptiveEntry {
  levelId: LevelId
  tier: Tier
  composite: number
  hintsUsed: number
  mistakes: number
  at: number
}

export interface SaveData {
  profile: PlayerProfile
  levels: Record<LevelId, LevelProgress>
  achievements: string[]
  fragments: string[]
  adaptive: { history: AdaptiveEntry[] }
  campaignComplete?: boolean
  owned?: string[]
}

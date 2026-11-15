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
 * A completed (or in-progress) mission run. It carries the facts bonus
 * evaluators need, plus every stage result and decision. Levels may add
 * their own fields later via intersection types.
 */
export interface MissionSession {
  levelId: LevelId
  kind: 'main' | 'side'
  results: Record<string, ChallengeResult>
  hintsUsed: number
  mistakes: number
  decisions: Decision[]
  facts: Record<string, number | string | boolean>
}

export interface BonusDef {
  id: string
  title: string
  description: string
  hidden: boolean
  evaluate: (session: MissionSession) => boolean
}

/** Props every mission challenge receives from the shell. */
export interface ChallengeProps {
  id: string
  difficulty: Tier
  /** Up to three progressive hints; the shell also renders them in its footer. */
  hints: string[]
  onComplete: (result: ChallengeResult) => void
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

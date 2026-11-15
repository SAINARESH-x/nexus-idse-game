// Level 04 completion (pure): stage results, bonus facts and the achievement stats merged after a mission.
import { engineConfig } from '../../engine'
import type { JudgedDecision, QualityReport, Tier } from '../../engine'
import type { ChallengeResult, Decision } from '../../game/types'
import type { PuzzlePick } from './missionRecord'

export interface L04Summary {
  tier: Tier
  quality: QualityReport
  /** Flag F1 with the Anomaly brush excluded; null when no report was submitted. */
  flagF1: number | null
  stage1Done: boolean
  stage2Submissions: number
  /** Hints per stage (revealed hints plus paid Analyst Scans). */
  hintsByStage: number[]
  decisions: JudgedDecision[]
  puzzlePicks: PuzzlePick[]
  /** Entry ids still applied (session.history), used to tell kept puzzle picks from undone ones. */
  appliedEntryIds: string[]
  opsCount: number
  adaptiveAssistUsed: boolean
  stage3Skipped: boolean
}

export const badKeptCount = (decisions: JudgedDecision[]): number => decisions.filter((d) => d.decision.good === false && !d.undone).length

/** Wrong puzzle picks count only when the decision is bad and kept: the entry is still applied, or the pick was 'leave it' (entryId 'none'). */
export const wrongPuzzleKept = (picks: PuzzlePick[], applied: string[]): number =>
  picks.filter((p) => p.decision.good === false && (p.entryId === 'none' || applied.includes(p.entryId))).length

export function buildFacts(s: L04Summary): Record<string, number | string | boolean> {
  const q = s.quality
  const badKept = badKeptCount(s.decisions) + wrongPuzzleKept(s.puzzlePicks, s.appliedEntryIds)
  return {
    integrity: Math.round(q.integrity * 10) / 10,
    efficiency: Math.round(q.efficiency * 10) / 10,
    preservation: q.preservation,
    badKept,
    opsCount: s.opsCount,
    par: engineConfig.PAR_OPS[s.tier],
    ghostsFound: q.ghostsFound,
    ghostFalsePositives: q.ghostFalsePositives,
    tier: s.tier,
    adaptiveAssistUsed: s.adaptiveAssistUsed,
    perfectRun: q.integrity >= 95 && badKept === 0,
    stage3Skipped: s.stage3Skipped,
  }
}

function decisionList(s: L04Summary): Decision[] {
  const fromOps = s.decisions.filter((d) => !d.decision.redundant || !d.undone).map((d) => ({ ...d.decision, label: d.undone ? `${d.decision.label} (undone)` : d.decision.label }))
  const fromPuzzles = s.puzzlePicks.map((p) => p.decision)
  return [...fromOps, ...fromPuzzles]
}

/** Four ChallengeResults: Stage 1 objectives, Stage 2 flag F1, Stage 3 consistency/decisions, Stage 4 integrity/efficiency. */
export function buildStageResults(s: L04Summary): ChallengeResult[] {
  const q = s.quality
  const eff = q.efficiency / 100
  const facts = buildFacts(s)
  const mistakes = facts.badKept as number
  const h = (i: number): number => s.hintsByStage[i] ?? 0
  return [
    { id: 'l4-stage-1', accuracy: s.stage1Done ? 1 : 0, decisionQuality: 1, efficiency: 1, hintsUsed: h(0), mistakes: 0, decisions: [] },
    {
      id: 'l4-stage-2',
      accuracy: s.flagF1 ?? 0,
      decisionQuality: q.flagPrecision ?? s.flagF1 ?? 0,
      efficiency: s.stage2Submissions <= 1 ? 1 : 0.7,
      hintsUsed: h(1),
      mistakes: 0,
      decisions: [],
      extra: { flagF1: s.flagF1 ?? 0 },
    },
    { id: 'l4-stage-3', accuracy: q.consistency, decisionQuality: q.decisions, efficiency: eff, hintsUsed: h(2), mistakes, decisions: decisionList(s) },
    { id: 'l4-stage-4', accuracy: q.integrity / 100, decisionQuality: q.decisions, efficiency: eff, hintsUsed: h(3), mistakes: 0, decisions: [], extra: facts },
  ]
}

/** Merges this run into levels[4].stats: maxima for scores and ghosts, a tier list, and a sticky perfectRun. */
export function mergeStats(prev: Record<string, number | boolean | string>, facts: Record<string, number | string | boolean>): Record<string, number | boolean | string> {
  const num = (k: string): number => (typeof prev[k] === 'number' ? (prev[k] as number) : 0)
  const tiers = new Set(typeof prev.tiersCleared === 'string' && prev.tiersCleared ? prev.tiersCleared.split(',') : [])
  tiers.add(String(facts.tier))
  const order = engineConfig.TIER_ORDER as readonly string[]
  return {
    bestIntegrity: Math.max(num('bestIntegrity'), Number(facts.integrity) || 0),
    bestEfficiency: Math.max(num('bestEfficiency'), Number(facts.efficiency) || 0),
    ghostsFound: Math.max(num('ghostsFound'), Number(facts.ghostsFound) || 0),
    tiersCleared: [...tiers].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(','),
    perfectRun: prev.perfectRun === true || facts.perfectRun === true,
  }
}

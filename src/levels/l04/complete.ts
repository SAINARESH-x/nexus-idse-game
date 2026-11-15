// Level 04 mission completion: audit, stage results, bonuses, store awards and stats (no React; testable headless).
import { assessQuality } from '../../engine'
import type { DfSession, GeneratedDataset } from '../../engine'
import { levelDefinition } from '../../game/levels/registry'
import { useGameStore } from '../../game/store'
import { buildMissionOutcome } from '../../shell/missionOutcome'
import { useMissionSessionStore } from '../../shell/missionSession'
import type { MissionBonusAward } from '../../shell/missionSession'
import { buildFacts, buildStageResults, mergeStats } from './finish'
import type { L04Summary } from './finish'
import { normaliseFlags, scoreReport } from './flagScoring'
import type { FinishedReport, L04Record } from './missionRecord'
import { totalHints } from './missionRecord'

export function summarise(record: L04Record, session: DfSession, gen: GeneratedDataset): L04Summary {
  const submitted = record.stage2.submissions > 0
  const flags = submitted ? normaliseFlags(record.flags, gen.issues, gen.dirty) : undefined
  const quality = assessQuality(session.current, { ...gen, tier: record.tier, flags, history: session.history, decisions: session.decisions })
  const fr = submitted ? scoreReport(record.flags, gen.issues, gen.ghosts, record.tier, record.stage2.submissions, gen.dirty) : null
  return {
    tier: record.tier,
    quality,
    flagF1: fr ? fr.f1 : null,
    stage1Done: record.stage1.shape && record.stage1.dtypes && record.stage1.marks.length >= 3,
    stage2Submissions: record.stage2.submissions,
    hintsByStage: record.hints.map((h, i) => h + (record.scanHints[i] ?? 0)),
    decisions: session.decisions,
    puzzlePicks: record.puzzlePicks,
    appliedEntryIds: session.history.map((e) => e.id),
    opsCount: session.history.length,
    adaptiveAssistUsed: record.adaptiveAssistUsed,
    stage3Skipped: record.stage3.skipped,
  }
}

/**
 * SUBMIT FOR AUDIT. Bonuses are evaluated and paid BEFORE completeMission, so lastAward stays the mission award
 * (the same ordering as the shared mission flow). Returns the finished report to store in the session record.
 */
export function completeL04(record: L04Record, session: DfSession, gen: GeneratedDataset): FinishedReport {
  const summary = summarise(record, session, gen)
  const results = buildStageResults(summary)
  const outcome = buildMissionOutcome(4, 'main', results, totalHints(record))
  const store = useGameStore.getState()
  const earned = store.levels[4].bonusesEarned
  const bonuses: MissionBonusAward[] = []
  for (const bonus of levelDefinition(4).bonuses) {
    if (earned.includes(bonus.id)) continue
    let passed = false
    try {
      passed = bonus.evaluate(outcome.session)
    } catch {
      passed = false
    }
    if (!passed) continue
    const a = useGameStore.getState().completeBonus(4, bonus.id)
    bonuses.push({ id: bonus.id, title: bonus.title, xpGained: a.xpGained, hidden: bonus.hidden })
  }
  const award = useGameStore.getState().completeMission(4, outcome.aggregate, record.tier)
  const facts = buildFacts(summary)
  useGameStore.getState().recordStats(4, mergeStats(useGameStore.getState().levels[4].stats, facts))
  const q = summary.quality
  const report: FinishedReport = {
    quality: q,
    flagScore: q.flagPrecision === null ? null : { f1: q.identification, precision: q.flagPrecision, recall: q.flagRecall ?? 0, ghostsFound: q.ghostsFound, ghostFalsePositives: q.ghostFalsePositives },
    results,
    aggregate: outcome.aggregate,
    composite: outcome.composite,
    rating: outcome.rating,
    award,
    bonuses,
    facts,
    finishedAt: Date.now(),
  }
  useMissionSessionStore.getState().finishRun({
    levelId: 4,
    kind: 'main',
    tier: record.tier,
    results,
    aggregate: outcome.aggregate,
    composite: outcome.composite,
    rating: outcome.rating,
    session: outcome.session,
    hintsUsed: outcome.hintsUsed,
    mistakes: outcome.mistakes,
    decisions: outcome.decisions,
    bonuses,
    finishedAt: report.finishedAt,
  })
  return report
}

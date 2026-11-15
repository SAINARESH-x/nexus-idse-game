// Level 07 bonus evaluators: Honest Model, Minimalist and the hidden Leak Detector.
import type { MissionSession } from '../../game/types'
import { HONEST_GAP } from './config'

const fact = (s: MissionSession, key: string) => s.facts[key] ?? s.results['l7-stage-3']?.extra?.[key] ?? s.results['l7-stage-2']?.extra?.[key]

/** HONEST MODEL: scored hold-out r2 within 0.05 of validation r2, not peeked, no leak in the final model. */
export function honestModel(s: MissionSession): boolean {
  const h = fact(s, 'holdoutR2')
  const v = fact(s, 'valR2')
  if (typeof h !== 'number' || typeof v !== 'number' || !Number.isFinite(h) || !Number.isFinite(v)) return false
  return Math.abs(h - v) <= HONEST_GAP && fact(s, 'peeked') !== true && fact(s, 'leakInFinal') !== true
}

/** MINIMALIST: a Stage 2 fit with at most 2 features within 10 percent of the best legitimate r2. */
export function minimalist(s: MissionSession): boolean {
  return fact(s, 'minimalist') === true
}

/** LEAK DETECTOR (hidden): REPORT LEAK pressed on the true leak column. */
export function leakDetector(s: MissionSession): boolean {
  return fact(s, 'leakReported') === true
}

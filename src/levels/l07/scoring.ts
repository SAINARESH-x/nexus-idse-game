// Level 07 scoring (pure): the final forecast score, plus Stage 1 and Stage 2 result helpers.
import { ACHIEVABLE_FLOOR, FIT_PAR } from './config'

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export interface ForecastInput {
  holdoutR2: number
  achievableR2: number
  leak: boolean
  peeked: boolean
  fits: number
}
export interface ForecastScore {
  accuracy: number
  decisionQuality: number
  efficiency: number
}

/**
 * accuracy = clamp(holdoutR2 / max(achievableR2, FLOOR), 0, 1) (0 if holdoutR2 not finite; non-finite achievable = floor);
 * decisionQuality = (leak ? 0.2 : 1) - (peeked ? 0.2 : 0), floor 0;
 * efficiency = fits <= 8 ? 1 : max(0.3, 8 / fits).
 */
export function scoreForecast(input: ForecastInput): ForecastScore {
  const ach = Number.isFinite(input.achievableR2) ? Math.max(input.achievableR2, ACHIEVABLE_FLOOR) : ACHIEVABLE_FLOOR
  const accuracy = Number.isFinite(input.holdoutR2) ? clamp(input.holdoutR2 / ach, 0, 1) : 0
  const decisionQuality = Math.max(0, (input.leak ? 0.2 : 1) - (input.peeked ? 0.2 : 0))
  const fits = Math.max(0, Math.floor(Number.isFinite(input.fits) ? input.fits : 0))
  const efficiency = fits <= FIT_PAR ? 1 : Math.max(0.3, FIT_PAR / fits)
  return { accuracy, decisionQuality, efficiency }
}

/** Efficiency for a stage that should take about `par` actions. */
export function actionEfficiency(actions: number, par: number): number {
  return actions <= par ? 1 : Math.max(0.3, par / actions)
}

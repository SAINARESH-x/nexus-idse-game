// Stage 3 part 2 pure state transitions: final-model fits and SUBMIT FORECAST (first submission scored, later ones peek).
import type { FeatureName } from './config'
import type { HoldoutReport, Metrics } from './data'

export interface Submission {
  features: FeatureName[]
  degree: 1 | 2
  valR2: number
  holdoutR2: number
  holdoutRmse: number
  achievableR2: number
}

export interface ForecastState {
  submissions: Submission[]
  scored: Submission | null
  peeked: boolean
}

export const INITIAL_FORECAST: ForecastState = { submissions: [], scored: null, peeked: false }

export function submitForecast(
  state: ForecastState,
  model: { features: FeatureName[]; degree: 1 | 2; val: Metrics },
  report: HoldoutReport,
): ForecastState {
  const sub: Submission = {
    features: [...model.features],
    degree: model.degree,
    valR2: model.val.r2,
    holdoutR2: report.holdout.r2,
    holdoutRmse: report.holdout.rmse,
    achievableR2: report.achievableR2,
  }
  return {
    submissions: [...state.submissions, sub],
    scored: state.scored ?? sub,
    peeked: state.peeked || state.submissions.length > 0,
  }
}

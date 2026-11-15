// Level 07 persisted stage state: plain-JSON inputs per stage, initial values and validators (hold-out rows never stored).
import { ALL_FEATURES } from './config'
import type { FeatureName } from './config'
import type { ForecastState, Submission } from './forecast'
import type { StageStateValidator } from '../../game/levelSession'

export interface Stage1State {
  slope: number
  intercept: number
  goalHit: boolean
  revealed: boolean
  choiceDone: boolean
  moves: number
}
export interface Stage2State {
  features: FeatureName[]
  testFraction: number
  splitSeed: number
  fits: number
  goalHit: boolean
  leakEverFitted: boolean
  leakReported: boolean
  wrongReports: number
  minimalist: boolean
  lastInput: FitInput | null
  prevInput: FitInput | null
}
export interface FitInput {
  features: FeatureName[]
  testFraction: number
  splitSeed: number
}
export interface Stage3State extends ForecastState {
  degree: number
  degreeAccepted: boolean
  choiceDone: boolean
  features: FeatureName[]
  finalDegree: 1 | 2
  fits: number
  fitted: boolean
}

export const INITIAL_S1: Stage1State = { slope: 0, intercept: 6, goalHit: false, revealed: false, choiceDone: false, moves: 0 }
export const INITIAL_S2: Stage2State = {
  features: [],
  testFraction: 0.25,
  splitSeed: 42,
  fits: 0,
  goalHit: false,
  leakEverFitted: false,
  leakReported: false,
  wrongReports: 0,
  minimalist: false,
  lastInput: null,
  prevInput: null,
}
export const INITIAL_S3: Stage3State = {
  degree: 1,
  degreeAccepted: false,
  choiceDone: false,
  features: [],
  finalDegree: 1,
  fits: 0,
  fitted: false,
  submissions: [],
  scored: null,
  peeked: false,
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const feats = (v: unknown): v is FeatureName[] =>
  Array.isArray(v) && v.every((f) => (ALL_FEATURES as readonly unknown[]).includes(f))
const finiteOrNaN = (v: unknown): v is number => typeof v === 'number'

const isSubmission = (v: unknown): v is Submission =>
  isObj(v) && feats(v.features) && (v.degree === 1 || v.degree === 2) &&
  finiteOrNaN(v.valR2) && finiteOrNaN(v.holdoutR2) && finiteOrNaN(v.holdoutRmse) && finiteOrNaN(v.achievableR2)

export function validateS1(raw: unknown): Stage1State | null {
  if (!isObj(raw) || !num(raw.slope) || !num(raw.intercept) || !num(raw.moves)) return null
  if (!bool(raw.goalHit) || !bool(raw.revealed) || !bool(raw.choiceDone)) return null
  return raw as unknown as Stage1State
}

export function validateS2(raw: unknown): Stage2State | null {
  if (!isObj(raw) || !feats(raw.features) || !num(raw.testFraction) || !num(raw.splitSeed) || !num(raw.fits)) return null
  if (raw.testFraction < 0.1 || raw.testFraction > 0.4 || !num(raw.wrongReports)) return null
  if (![raw.goalHit, raw.leakEverFitted, raw.leakReported, raw.minimalist].every(bool)) return null
  const fi = (v: unknown) => v === null || (isObj(v) && feats(v.features) && num(v.testFraction) && num(v.splitSeed))
  if (!fi(raw.lastInput) || !fi(raw.prevInput)) return null
  return raw as unknown as Stage2State
}

export function validateS3(raw: unknown): Stage3State | null {
  if (!isObj(raw) || !num(raw.degree) || !num(raw.fits) || !feats(raw.features)) return null
  if (raw.finalDegree !== 1 && raw.finalDegree !== 2) return null
  if (![raw.degreeAccepted, raw.choiceDone, raw.fitted, raw.peeked].every(bool)) return null
  if (!Array.isArray(raw.submissions) || !raw.submissions.every(isSubmission)) return null
  if (raw.scored !== null && !isSubmission(raw.scored)) return null
  // A record with two or more submissions must be peeked, and a scored result must exist once anything was submitted.
  if (raw.submissions.length > 0 && raw.scored === null) return null
  if (raw.submissions.length > 1 && raw.peeked !== true) return null
  return raw as unknown as Stage3State
}

export const L07_VALIDATORS: Record<string, StageStateValidator> = {
  'l7-stage-1': validateS1,
  'l7-stage-2': validateS2,
  'l7-stage-3': validateS3,
}
export const L07_INITIAL_STATES: Record<string, unknown> = {
  'l7-stage-1': INITIAL_S1,
  'l7-stage-2': INITIAL_S2,
  'l7-stage-3': INITIAL_S3,
}

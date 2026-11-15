// Level 06 persisted stage inputs (plain JSON): shapes, initial values and validators that repair or reject saved state.
import type { StageStateValidator } from '../../game/levelSession'
import {
  ALPHAS, BINOM_N_MAX, BINOM_N_MIN, CI_LEVELS, CI_SIZES, LLN_SIZES, SAMPLE_N_MAX, SAMPLE_N_MIN, SHUFFLE_OPTIONS,
} from './config'
import type { CellId, Connector, EventChipId, MarginId } from './probability'
import type { Question, SamplingMethod, Verdict } from './statsLab'

export interface Miss {
  a: number
  b: number
  c: number
}

export interface ProbabilityState {
  first: EventChipId
  connector: Connector
  second: EventChipId
  k: number
  /** Number of RUN/STEP presses: the simulation seed index. */
  runs: number
  /** Draws simulated so far for the current event (0 = nothing run). */
  drawn: number
  aDone: boolean
  num: CellId | null
  den: MarginId | null
  bComputed: boolean
  bDone: boolean
  binN: number
  binP: number
  binRuns: number
  bin: number | null
  cDone: boolean
  /** Mistakes per part (a, b, c). */
  miss: Miss
}

export interface SamplingState {
  n: number
  method: SamplingMethod
  runIndex: number
  lastRun: { n: number; method: SamplingMethod; runIndex: number } | null
  aDone: boolean
  biasShown: boolean
  bDone: boolean
  ciN: number
  ciLevel: number
  drawIndex: number
  lastDraw: { n: number; level: number; drawIndex: number } | null
  cDone: boolean
  /** Mistakes per part (a, b, c). */
  miss: Miss
}

export interface VerdictState {
  question: Question
  nullChip: string | null
  statistic: 'means' | 'rates' | null
  shuffles: number
  rerun: number
  alpha: number
  verdict: Verdict | null
  verdictDone: boolean
  reruns: number
  stable: boolean
  fishDone: boolean
  bonferroni: boolean
  flagged: number[]
  /** Mistakes per part (a, b, c). */
  miss: Miss
}

export const PROBABILITY_INITIAL: ProbabilityState = {
  first: 'dropout', connector: 'none', second: 'lowAttendance', k: 1000, runs: 0, drawn: 0, aDone: false,
  num: null, den: null, bComputed: false, bDone: false, binN: 10, binP: 0.2, binRuns: 0, bin: null, cDone: false, miss: { a: 0, b: 0, c: 0 },
}

export const SAMPLING_INITIAL: SamplingState = {
  n: 25, method: 'random', runIndex: 0, lastRun: null, aDone: false, biasShown: false, bDone: false,
  ciN: 50, ciLevel: 0.95, drawIndex: 0, lastDraw: null, cDone: false, miss: { a: 0, b: 0, c: 0 },
}

export const VERDICT_INITIAL: VerdictState = {
  question: 'attendance', nullChip: null, statistic: null, shuffles: 0, rerun: 0, alpha: 0.05, verdict: null,
  verdictDone: false, reruns: 0, stable: true, fishDone: false, bonferroni: false, flagged: [], miss: { a: 0, b: 0, c: 0 },
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const int = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const oneOf = <T>(v: unknown, items: readonly T[]): v is T => items.includes(v as T)
const BIG = 1_000_000

const missOk = (v: unknown) => isObj(v) && int(v.a, 0, BIG) && int(v.b, 0, BIG) && int(v.c, 0, BIG)

const CHIPS: readonly EventChipId[] = ['dropout', 'lowAttendance', 'scholarship', 'highStudy']
const CELLS: readonly CellId[] = ['rc', 'rNotC', 'notRc', 'notRNotC']
const MARGINS: readonly MarginId[] = ['R', 'notR', 'C', 'notC', 'all']

export const validateProbability: StageStateValidator = (raw) => {
  if (!isObj(raw)) return null
  const s = raw
  const ok =
    oneOf(s.first, CHIPS) && oneOf(s.connector, ['none', 'and', 'or'] as const) && oneOf(s.second, CHIPS) &&
    oneOf(s.k, LLN_SIZES) && int(s.runs, 0, BIG) && int(s.drawn, 0, BIG) && bool(s.aDone) &&
    (s.num === null || oneOf(s.num, CELLS)) && (s.den === null || oneOf(s.den, MARGINS)) && bool(s.bComputed) && bool(s.bDone) &&
    int(s.binN, BINOM_N_MIN, BINOM_N_MAX) && num(s.binP, 0, 1) && int(s.binRuns, 0, BIG) &&
    (s.bin === null || int(s.bin, 0, BINOM_N_MAX)) && bool(s.cDone) && missOk(s.miss)
  return ok ? ({ ...PROBABILITY_INITIAL, ...s } as ProbabilityState) : null
}

const lastRunOk = (v: unknown) =>
  v === null || (isObj(v) && int(v.n, SAMPLE_N_MIN, SAMPLE_N_MAX) && oneOf(v.method, ['random', 'convenience'] as const) && int(v.runIndex, 0, BIG))
const lastDrawOk = (v: unknown) =>
  v === null || (isObj(v) && oneOf(v.n, CI_SIZES) && oneOf(v.level, CI_LEVELS) && int(v.drawIndex, 0, BIG))

export const validateSampling: StageStateValidator = (raw) => {
  if (!isObj(raw)) return null
  const s = raw
  const ok =
    int(s.n, SAMPLE_N_MIN, SAMPLE_N_MAX) && oneOf(s.method, ['random', 'convenience'] as const) && int(s.runIndex, 0, BIG) &&
    lastRunOk(s.lastRun) && bool(s.aDone) && bool(s.biasShown) && bool(s.bDone) && oneOf(s.ciN, CI_SIZES) &&
    oneOf(s.ciLevel, CI_LEVELS) && int(s.drawIndex, 0, BIG) && lastDrawOk(s.lastDraw) && bool(s.cDone) && missOk(s.miss)
  return ok ? ({ ...SAMPLING_INITIAL, ...s } as SamplingState) : null
}

export const validateVerdict: StageStateValidator = (raw) => {
  if (!isObj(raw)) return null
  const s = raw
  const ok =
    oneOf(s.question, ['attendance', 'scholarship'] as const) && (s.nullChip === null || typeof s.nullChip === 'string') &&
    (s.statistic === null || oneOf(s.statistic, ['means', 'rates'] as const)) && (s.shuffles === 0 || oneOf(s.shuffles, SHUFFLE_OPTIONS)) &&
    int(s.rerun, 0, BIG) && oneOf(s.alpha, ALPHAS) && (s.verdict === null || oneOf(s.verdict, ['reject', 'retain'] as const)) &&
    bool(s.verdictDone) && int(s.reruns, 0, BIG) && bool(s.stable) && bool(s.fishDone) && bool(s.bonferroni) &&
    Array.isArray(s.flagged) && s.flagged.every((x) => int(x, 0, 19)) && missOk(s.miss)
  return ok ? ({ ...VERDICT_INITIAL, ...s } as VerdictState) : null
}

export const L06_VALIDATORS: Record<string, StageStateValidator> = {
  'l6-stage-1': validateProbability,
  'l6-stage-2': validateSampling,
  'l6-stage-3': validateVerdict,
}

export const L06_INITIAL_STATES: Record<string, unknown> = {
  'l6-stage-1': PROBABILITY_INITIAL,
  'l6-stage-2': SAMPLING_INITIAL,
  'l6-stage-3': VERDICT_INITIAL,
}

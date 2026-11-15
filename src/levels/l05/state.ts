// Level 05 persisted stage inputs: plain-JSON state shapes, initial values and restore validators.
import type { StageStateValidator } from '../../game/levelSession'
import type { AggFn } from '../../engine/stats'
import { AGG_FNS } from './describe'
import { BIN_MAX, BIN_MIN, BRIEFS, CHART_TYPES } from './chartRubric'
import type { ChartType } from './chartRubric'
import { CATEGORY_COLUMNS, NUMERIC_COLUMNS } from './data'
import type { NumericColumn } from './data'
import { CAVEAT_CHIPS, DIRECTION_CHIPS, MAGNITUDE_CHIPS, VARIABLE_CHIPS } from './insightCheck'
import type { InsightChips } from './insightCheck'
import { ATT_MAX, ATT_MIN } from './pattern'

export interface Stage1State {
  by: string
  col: string
  fn: AggFn
  distCol: NumericColumn
  goalA: boolean
  goalB: boolean
  goalC: boolean
  choice: 'mean' | 'median' | null
  mistakes: number
}

export interface BriefState {
  type: ChartType
  x: string
  y: string
  bins: number
  zero: boolean
  solved: boolean
  wrong: number
}

export interface Stage2State {
  active: number
  briefs: BriefState[]
}

export interface Stage3State {
  lo: number
  hi: number
  chips: InsightChips
  insightOk: boolean
  corrX: NumericColumn
  corrY: NumericColumn
  bands: number
  seenLibrary: boolean
  interpretOk: boolean
  mistakes: number
}

export const STAGE1_INITIAL: Stage1State = {
  by: 'department', col: 'cgpa', fn: 'mean', distCol: 'study_hours',
  goalA: false, goalB: false, goalC: false, choice: null, mistakes: 0,
}

export const initialBrief = (): BriefState => ({ type: 'bar', x: 'department', y: '', bins: 10, zero: true, solved: false, wrong: 0 })
export const STAGE2_INITIAL: Stage2State = { active: 0, briefs: BRIEFS.map(initialBrief) }

export const STAGE3_INITIAL: Stage3State = {
  lo: 70, hi: 90,
  chips: { variable: null, direction: null, magnitude: null, caveat: null },
  insightOk: false, corrX: 'attendance', corrY: 'cgpa', bands: 1, seenLibrary: false, interpretOk: false, mistakes: 0,
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const count = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null)
const oneOf = <T,>(set: readonly T[], v: unknown): v is T => set.includes(v as T)
const COLUMNS: readonly string[] = [...NUMERIC_COLUMNS, ...CATEGORY_COLUMNS]
const COLUMNS_OR_EMPTY: readonly string[] = [...COLUMNS, '']

export const validateStage1: StageStateValidator = (raw) => {
  if (!isObj(raw)) return null
  const mistakes = count(raw.mistakes)
  if (!oneOf(CATEGORY_COLUMNS, raw.by) || !oneOf(NUMERIC_COLUMNS, raw.col) || !oneOf(AGG_FNS, raw.fn)) return null
  if (!oneOf(NUMERIC_COLUMNS, raw.distCol) || !bool(raw.goalA) || !bool(raw.goalB) || !bool(raw.goalC) || mistakes === null) return null
  if (raw.choice !== null && raw.choice !== 'mean' && raw.choice !== 'median') return null
  const out: Stage1State = { by: raw.by, col: raw.col, fn: raw.fn, distCol: raw.distCol, goalA: raw.goalA, goalB: raw.goalB, goalC: raw.goalC, choice: raw.choice, mistakes }
  return out
}

function validateBrief(raw: unknown): BriefState | null {
  if (!isObj(raw)) return null
  const wrong = count(raw.wrong)
  if (!oneOf(CHART_TYPES, raw.type) || !oneOf(COLUMNS, raw.x) || !oneOf(COLUMNS_OR_EMPTY, raw.y)) return null
  if (typeof raw.bins !== 'number' || !Number.isInteger(raw.bins) || raw.bins < BIN_MIN || raw.bins > BIN_MAX) return null
  if (!bool(raw.zero) || !bool(raw.solved) || wrong === null) return null
  return { type: raw.type, x: raw.x, y: raw.y, bins: raw.bins, zero: raw.zero, solved: raw.solved, wrong }
}

export const validateStage2: StageStateValidator = (raw) => {
  if (!isObj(raw) || !Array.isArray(raw.briefs) || raw.briefs.length !== BRIEFS.length) return null
  if (typeof raw.active !== 'number' || !Number.isInteger(raw.active) || raw.active < 0 || raw.active >= BRIEFS.length) return null
  const briefs = raw.briefs.map(validateBrief)
  if (briefs.some((b) => b === null)) return null
  const out: Stage2State = { active: raw.active, briefs: briefs as BriefState[] }
  return out
}

const inAtt = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= ATT_MIN && v <= ATT_MAX

function validateChips(raw: unknown): InsightChips | null {
  if (!isObj(raw)) return null
  const okNull = <T,>(set: readonly T[], v: unknown) => v === null || oneOf(set, v)
  if (!okNull(VARIABLE_CHIPS, raw.variable) || !okNull(DIRECTION_CHIPS, raw.direction)) return null
  if (!okNull(MAGNITUDE_CHIPS as readonly number[], raw.magnitude)) return null
  if (!okNull(CAVEAT_CHIPS.map((c) => c.id), raw.caveat)) return null
  return raw as unknown as InsightChips
}

export const validateStage3: StageStateValidator = (raw) => {
  if (!isObj(raw) || !inAtt(raw.lo) || !inAtt(raw.hi) || raw.lo > raw.hi) return null
  const chips = validateChips(raw.chips)
  const mistakes = count(raw.mistakes)
  if (!chips || mistakes === null || !bool(raw.insightOk) || !bool(raw.seenLibrary) || !bool(raw.interpretOk)) return null
  if (!oneOf(NUMERIC_COLUMNS, raw.corrX) || !oneOf(NUMERIC_COLUMNS, raw.corrY)) return null
  if (typeof raw.bands !== 'number' || !Number.isInteger(raw.bands) || raw.bands < 1 || raw.bands > 6) return null
  const out: Stage3State = {
    lo: raw.lo, hi: raw.hi, chips: { variable: chips.variable, direction: chips.direction, magnitude: chips.magnitude, caveat: chips.caveat },
    insightOk: raw.insightOk, corrX: raw.corrX, corrY: raw.corrY, bands: raw.bands, seenLibrary: raw.seenLibrary, interpretOk: raw.interpretOk, mistakes,
  }
  return out
}

export const L05_VALIDATORS: Record<string, StageStateValidator> = {
  'l5-stage-1': validateStage1,
  'l5-stage-2': validateStage2,
  'l5-stage-3': validateStage3,
}

export const L05_INITIAL_STATES: Record<string, unknown> = {
  'l5-stage-1': STAGE1_INITIAL,
  'l5-stage-2': STAGE2_INITIAL,
  'l5-stage-3': STAGE3_INITIAL,
}

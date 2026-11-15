// Mask Master pure logic: median-of-halves IQR fences, threshold detection and confusion metrics.

export const MASK_MIN_READING = -20
export const MASK_MAX_READING = 100
export const MASK_THRESHOLD_MIN = -20
export const MASK_THRESHOLD_MAX = 110
export const MASK_THRESHOLD_STEP = 0.25

/** Both metrics use the same zero-value convention when their denominator is empty. */
export const MASK_COMPLETION_TARGET = {
  precision: 0.8,
  recall: 0.8,
} as const

export interface IqrStatistics {
  count: number
  q1: number
  q3: number
  iqr: number
  lowerFence: number
  upperFence: number
}

export type IqrResult =
  | { ok: true; stats: IqrStatistics }
  | { ok: false; error: string }

export interface DetectionScore {
  /** Cells flagged by value < lowerThreshold OR value > upperThreshold. */
  selected: Array<[number, number]>
  truePositives: number
  falsePositives: number
  trueNegatives: number
  falseNegatives: number
  precision: number
  recall: number
  f1: number
  /** False when there is nothing to divide by; the stored value is then 0. */
  precisionDefined: boolean
  recallDefined: boolean
  /** False positives flagged by the lower threshold (reading < lower). */
  falsePositivesLow: number
  /** False positives flagged by the upper threshold (reading > upper). */
  falsePositivesHigh: number
  /** Missed anomalies whose current reading is below the dataset median. */
  falseNegativesLow: number
  /** Missed anomalies whose current reading is at or above the dataset median. */
  falseNegativesHigh: number
  /** Missed anomalies whose current reading lies inside the supplied IQR fences. */
  falseNegativesDisguised: number
  falseNegativesDisguisedLow: number
  falseNegativesDisguisedHigh: number
}

export interface ParseReadingResult {
  ok: boolean
  value?: number
  error?: string
}

const medianOfSorted = (sorted: readonly number[]): number => {
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Median-of-halves convention: exclude the overall median for odd counts,
 * then take the median of the lower half as Q1 and the upper half as Q3.
 * Requires at least four finite readings so both halves have a median.
 */
export function calculateIqr(values: readonly number[]): IqrResult {
  if (values.length < 4) {
    return { ok: false, error: 'At least four finite readings are needed to calculate quartiles.' }
  }
  if (values.some((value) => !Number.isFinite(value))) {
    return { ok: false, error: 'Every reading must be a finite number.' }
  }

  const sorted = [...values].sort((left, right) => left - right)
  const lowerEnd = Math.floor(sorted.length / 2)
  const upperStart = lowerEnd + (sorted.length % 2)
  const q1 = medianOfSorted(sorted.slice(0, lowerEnd))
  const q3 = medianOfSorted(sorted.slice(upperStart))
  const iqr = q3 - q1

  return {
    ok: true,
    stats: {
      count: sorted.length,
      q1,
      q3,
      iqr,
      lowerFence: q1 - 1.5 * iqr,
      upperFence: q3 + 1.5 * iqr,
    },
  }
}

/**
 * Applies the strict threshold rule to the current readings and compares the
 * predictions with the immutable ground-truth anomaly coordinates.
 */
export function evaluateDetections(
  values: readonly number[],
  rows: number,
  cols: number,
  lowerThreshold: number,
  upperThreshold: number,
  anomalies: ReadonlyArray<readonly [number, number]>,
  fences: Pick<IqrStatistics, 'lowerFence' | 'upperFence'> | null = null,
): DetectionScore {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error('Detection needs positive integer row and column counts.')
  }
  if (values.length !== rows * cols) {
    throw new Error('Detection needs exactly one reading per grid cell.')
  }
  if (!Number.isFinite(lowerThreshold) || !Number.isFinite(upperThreshold)) {
    throw new Error('Thresholds must be finite numbers.')
  }

  const anomalyKeys = new Set(anomalies.map(([row, col]) => `${row},${col}`))
  const selected: Array<[number, number]> = []
  let truePositives = 0
  let falsePositives = 0
  let trueNegatives = 0
  let falseNegatives = 0
  let falsePositivesLow = 0
  let falsePositivesHigh = 0
  let falseNegativesLow = 0
  let falseNegativesHigh = 0
  let falseNegativesDisguisedLow = 0
  let falseNegativesDisguisedHigh = 0
  const median = medianOfSorted([...values].sort((left, right) => left - right))

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = values[row * cols + col]
      const isActualAnomaly = anomalyKeys.has(`${row},${col}`)
      const isFlagged = value < lowerThreshold || value > upperThreshold
      if (isFlagged) selected.push([row, col])
      if (isFlagged && isActualAnomaly) truePositives += 1
      else if (isFlagged && !isActualAnomaly) {
        falsePositives += 1
        if (value < lowerThreshold) falsePositivesLow += 1
        else falsePositivesHigh += 1
      } else if (!isFlagged && isActualAnomaly) {
        falseNegatives += 1
        const low = value < median
        if (low) falseNegativesLow += 1
        else falseNegativesHigh += 1
        const disguised = fences !== null && value >= fences.lowerFence && value <= fences.upperFence
        if (disguised && low) falseNegativesDisguisedLow += 1
        else if (disguised) falseNegativesDisguisedHigh += 1
      } else trueNegatives += 1
    }
  }

  const precisionDefined = truePositives + falsePositives > 0
  const recallDefined = truePositives + falseNegatives > 0
  const precision = precisionDefined ? truePositives / (truePositives + falsePositives) : 0
  const recall = recallDefined ? truePositives / (truePositives + falseNegatives) : 0
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

  return {
    selected,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    precision,
    recall,
    f1,
    precisionDefined,
    recallDefined,
    falsePositivesLow,
    falsePositivesHigh,
    falseNegativesLow,
    falseNegativesHigh,
    falseNegativesDisguised: falseNegativesDisguisedLow + falseNegativesDisguisedHigh,
    falseNegativesDisguisedLow,
    falseNegativesDisguisedHigh,
  }
}

export const detectionMeetsTarget = (
  score: Pick<DetectionScore, 'precision' | 'recall'>,
): boolean =>
  score.precision >= MASK_COMPLETION_TARGET.precision &&
  score.recall >= MASK_COMPLETION_TARGET.recall

export const isPerfectDetection = (score: DetectionScore): boolean =>
  score.precision === 1 && score.recall === 1

/** @deprecated Use isPerfectDetection. Kept for compatibility with older imports. */
export const isPerfectMask = isPerfectDetection

/** @deprecated Use evaluateDetections. Kept for compatibility with older imports. */
export const scoreMask = evaluateDetections

export function parseReadingInput(
  raw: string,
  min = MASK_MIN_READING,
  max = MASK_MAX_READING,
): ParseReadingResult {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Enter a reading before saving.' }
  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'Use a finite number; NaN and Infinity are not sensor readings.' }
  }
  if (value < min || value > max) {
    return { ok: false, error: `Keep the reading between ${min} and ${max}.` }
  }
  return { ok: true, value }
}

/**
 * Builds feedback from the actual detection results: which false positives came
 * from each threshold and whether missed anomalies sit low or high in the data.
 * Never names cell coordinates, so the hidden answer key is not revealed.
 */
export function thresholdFeedback(score: DetectionScore, stats: IqrStatistics | null = null): string {
  if (score.truePositives + score.falsePositives === 0) {
    return 'No readings are flagged. Precision is undefined without a flag, and every real anomaly is currently missed.'
  }
  if (score.falsePositives === 0 && score.falseNegatives === 0) {
    return 'Your selected thresholds are successfully isolating the anomalous readings. Precision and recall are both 100%.'
  }

  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
  const feedback: string[] = []
  if (score.falsePositivesLow > 0) {
    feedback.push(
      `Normal low readings are being incorrectly flagged (${plural(score.falsePositivesLow, 'false positive')} below your lower threshold). Try lowering it.`,
    )
  }
  if (score.falsePositivesHigh > 0) {
    feedback.push(
      `You are flagging normal readings as anomalies (${plural(score.falsePositivesHigh, 'false positive')} above your upper threshold). Your false positives are increasing; try raising it.`,
    )
  }
  if (score.falseNegativesDisguised > 0 && stats) {
    feedback.push(
      `${plural(score.falseNegativesDisguised, 'original anomaly')} now ${score.falseNegativesDisguised === 1 ? 'reads' : 'read'} inside the IQR fences. No threshold can catch ${score.falseNegativesDisguised === 1 ? 'it' : 'them'} without also flagging normal readings: the label still says anomaly, but the observed value no longer looks unusual.`,
    )
  }
  const lowMissed = score.falseNegativesLow - (stats ? score.falseNegativesDisguisedLow : 0)
  const highMissed = score.falseNegativesHigh - (stats ? score.falseNegativesDisguisedHigh : 0)
  if (lowMissed > 0) {
    feedback.push('A genuine low anomaly is escaping detection. Your lower threshold is too low to catch it.')
  }
  if (highMissed > 0) {
    feedback.push(
      `${highMissed === 1 ? 'A genuine high anomaly is' : `${highMissed} genuine high anomalies are`} now being missed. Your upper threshold is too high to catch ${highMissed === 1 ? 'it' : 'them'}.`,
    )
  }
  return feedback.join(' ')
}

/** What the student has observed while experimenting with thresholds. */
export interface ExplorationState {
  sawFalsePositive: boolean
  sawFalseNegative: boolean
}

export const INITIAL_EXPLORATION: ExplorationState = { sawFalsePositive: false, sawFalseNegative: false }

/** Records whether a live detection produced a false positive or a missed anomaly. */
export function recordExploration(previous: ExplorationState, score: DetectionScore): ExplorationState {
  const sawFalsePositive = previous.sawFalsePositive || score.falsePositives > 0
  const sawFalseNegative = previous.sawFalseNegative || score.falseNegatives > 0
  if (sawFalsePositive === previous.sawFalsePositive && sawFalseNegative === previous.sawFalseNegative) {
    return previous
  }
  return { sawFalsePositive, sawFalseNegative }
}

export const explorationComplete = (state: ExplorationState): boolean =>
  state.sawFalsePositive && state.sawFalseNegative

export type SubmissionVerdict =
  | { accepted: true }
  | { accepted: false; reason: 'explore' | 'target' }

/**
 * Completion rule: the student must first see the trade-off (at least one
 * threshold setting that causes a false positive and one that misses an
 * anomaly), then submit thresholds with precision AND recall of at least 80%
 * against the immutable original labels. With four labelled anomalies this
 * means every anomaly found and at most one false positive.
 */
export function judgeSubmission(score: DetectionScore, exploration: ExplorationState): SubmissionVerdict {
  if (!explorationComplete(exploration)) return { accepted: false, reason: 'explore' }
  if (!detectionMeetsTarget(score)) return { accepted: false, reason: 'target' }
  return { accepted: true }
}

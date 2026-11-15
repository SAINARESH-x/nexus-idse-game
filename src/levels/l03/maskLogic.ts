// Side op 2 pure logic: threshold masks, anomaly precision and recall feedback.
import { SENSOR_COLS, SENSOR_GRID } from './content'

export interface MaskScore {
  /** Cells selected by value < min OR value > max. */
  selected: Array<[number, number]>
  truePositives: number
  falsePositives: number
  falseNegatives: number
  precision: number
  recall: number
}

/**
 * Selects cells outside the [min, max] band and compares them with the known
 * anomalous cells. Precision punishes false alarms, recall punishes misses.
 */
export function scoreMask(min: number, max: number, anomalies: Array<[number, number]>): MaskScore {
  const anomalyKeys = new Set(anomalies.map(([row, col]) => `${row},${col}`))
  const selected: Array<[number, number]> = []
  for (let row = 0; row < SENSOR_GRID.shape[0]; row += 1) {
    for (let col = 0; col < SENSOR_COLS; col += 1) {
      const value = SENSOR_GRID.data[row * SENSOR_COLS + col]
      if (value < min || value > max) selected.push([row, col])
    }
  }
  let truePositives = 0
  for (const [row, col] of selected) {
    if (anomalyKeys.has(`${row},${col}`)) truePositives += 1
  }
  const falsePositives = selected.length - truePositives
  const falseNegatives = anomalies.length - truePositives
  const precision = selected.length === 0 ? 0 : truePositives / selected.length
  const recall = anomalies.length === 0 ? 0 : truePositives / anomalies.length
  return { selected, truePositives, falsePositives, falseNegatives, precision, recall }
}

/** A mask is a perfect solve when it isolates exactly the anomalous cells. */
export const isPerfectMask = (score: MaskScore, anomalies: number): boolean =>
  score.truePositives === anomalies && score.falsePositives === 0 && score.falseNegatives === 0
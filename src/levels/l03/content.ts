// Level 03 content: sensor grid, anatomy arrays, build targets, slice goals, masks and reshape drills.
import type { SideOpDef, StageDef } from '../../game/types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'
import {
  arange,
  argmax,
  array,
  array2d,
  broadcastAdd,
  broadcastSubtract,
  meanAxis,
  reshape,
  zeros,
} from './nd'
import type { NDArray } from './nd'

export const L03_STAGES: StageDef[] = [
  {
    id: 'l3-stage-1',
    title: 'GRID ANATOMY',
    subtitle: 'Shape, dimensions and dtype',
    hints: [
      'shape lists the length of each axis. (2, 3) means two rows and three columns.',
      'ndim is the number of axes: one pair of brackets is 1D, two pairs are 2D.',
      'np.zeros defaults to float64. Integer literals and np.arange produce int64.',
    ],
  },
  {
    id: 'l3-stage-2',
    title: 'SLICE THE SIGNAL',
    subtitle: 'Rows, columns, steps and masks',
    hints: [
      'A comma separates axes: arr[rows, columns]. A single number selects one row.',
      'The stop index is exclusive, so rows 1 to 3 need arr[1:4, ...].',
      'A non-rectangular set of cells is not one slice. Use a boolean mask such as arr[arr > 30].',
    ],
  },
  {
    id: 'l3-stage-3',
    title: 'VECTOR POWER',
    subtitle: 'One operation, every cell',
    hints: [
      'Subtracting column means broadcasts the 1D vector across all six rows.',
      'Column means summarise each sensor. np.argmax returns the index of the largest mean.',
      'A Python double loop touches every cell one at a time; the vector operation touches the whole array once.',
    ],
  },
]

export const L03_SIDE_OPS: SideOpDef[] = [
  {
    id: 'l3-side-1',
    title: 'RESHAPE RUSH',
    blurb: 'Twelve values, three valid shapes. Reshape 1 to 12 into 3x4, 2x6 and 2x2x3 without losing a value.',
    hints: [
      'The total number of values must not change: 12 stays 12.',
      'A 3D shape reads as (layers, rows, columns).',
      'reshape only changes the shape metadata; it does not copy or invent values.',
    ],
  },
  {
    id: 'l3-side-2',
    title: 'MASK MASTER',
    blurb:
      'Inspect a 6x6 sensor grid, calculate its quartiles and IQR fences, then choose your own thresholds and judge the detections with precision and recall.',
    hints: [
      'Sort the 36 readings. Q1 is the median of the lower half and Q3 is the median of the upper half.',
      'IQR = Q3 - Q1. Lower fence = Q1 - 1.5 x IQR; upper fence = Q3 + 1.5 x IQR.',
      'A reading is flagged only when it is strictly below the lower threshold or strictly above the upper threshold. Equal values are not flagged.',
    ],
  },
]

export const L03_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l3-obj-anatomy', label: 'Read shape, ndim and dtype, then build the target arrays' },
  { id: 'l3-obj-slices', label: 'Extract rows, columns, blocks and stepped slices, then mask the grid' },
  { id: 'l3-obj-vector', label: 'Normalise the grid and locate the drifting sensor with vector operations' },
]

export const L03_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l3-side-1': [{ id: 'l3-side-1-obj', label: 'Reshape twelve values into all three target shapes' }],
  'l3-side-2': [
    { id: 'l3-side-2-obj', label: 'Calculate the IQR fences, then submit thresholds with precision and recall at least 80%' },
  ],
}

/** Six cycles (rows) across six sensors (columns). Sensor index 4 drifts +0.4 per cycle. */
export const SENSOR_GRID: NDArray = array2d([
  [18, 22, 19, 25, 29.2, 17],
  [20, 24, 18, 27, 29.6, 19],
  [19, 23, 21, 26, 30.0, 18],
  [22, 25, 20, 28, 30.4, 20],
  [21, 24, 22, 27, 30.8, 21],
  [23, 26, 20, 29, 31.2, 22],
])

export const SENSOR_ROWS = SENSOR_GRID.shape[0]
export const SENSOR_COLS = SENSOR_GRID.shape[1]
export const DRIFT_COLUMN = 4
export const DRIFT_PER_CYCLE = 0.4

export const SENSOR_COLUMN_MEANS = meanAxis(SENSOR_GRID, 0)
export const SENSOR_NORMALISED = broadcastSubtract(SENSOR_GRID, SENSOR_COLUMN_MEANS)
export const DRIFT_INDEX = argmax(SENSOR_COLUMN_MEANS)

export const SHAPE_OPTIONS = ['(2, 3)', '(3,)', '(1, 2)', '(3, 2)']
export const NDIM_OPTIONS = ['1', '2', '3']
export const DTYPE_OPTIONS = ['int64', 'float64', 'bool']

export interface AnatomyItem {
  id: string
  label: string
  code: string
  array: NDArray
  shape: string
  ndim: string
  dtype: string
}

export const L03_ANATOMY: AnatomyItem[] = [
  {
    id: 'anatomy-a',
    label: 'CALIBRATION A',
    code: 'np.arange(6).reshape(2, 3)',
    array: reshape(arange(6), [2, 3]),
    shape: '(2, 3)',
    ndim: '2',
    dtype: 'int64',
  },
  {
    id: 'anatomy-b',
    label: 'CALIBRATION B',
    code: 'np.zeros(3)',
    array: zeros([3]),
    shape: '(3,)',
    ndim: '1',
    dtype: 'float64',
  },
  {
    id: 'anatomy-c',
    label: 'CALIBRATION C',
    code: 'np.array([[1.5, 2.5]])',
    array: array2d([[1.5, 2.5]]),
    shape: '(1, 2)',
    ndim: '2',
    dtype: 'float64',
  },
  {
    id: 'anatomy-d',
    label: 'CALIBRATION D',
    code: 'np.array([[3, 4], [5, 6], [7, 8]])',
    array: array2d([
      [3, 4],
      [5, 6],
      [7, 8],
    ]),
    shape: '(3, 2)',
    ndim: '2',
    dtype: 'int64',
  },
]

export interface BuildTarget {
  id: string
  label: string
  target: NDArray
  hint: string
}

export const L03_BUILD_TARGETS: BuildTarget[] = [
  {
    id: 'build-a',
    label: 'TARGET A · RAMP',
    target: array2d([
      [0, 1, 2],
      [3, 4, 5],
    ]),
    hint: 'np.arange(6) then reshape to (2, 3).',
  },
  {
    id: 'build-b',
    label: 'TARGET B · ZERO GRID',
    target: zeros([2, 3]),
    hint: 'np.zeros((2, 3)) is already 2D; no reshape needed.',
  },
  {
    id: 'build-c',
    label: 'TARGET C · EVEN BLOCK',
    target: array2d([
      [2, 4],
      [6, 8],
    ]),
    hint: 'np.array([2, 4, 6, 8]) then reshape to (2, 2).',
  },
]

export interface SliceGoal {
  id: string
  label: string
  kind: 'selection' | 'mask'
  rows?: number[]
  cols?: number[]
  threshold?: number
  count?: number
  hint: string
}

export const L03_SLICE_GOALS: SliceGoal[] = [
  {
    id: 'row-2',
    label: 'Select row index 2',
    kind: 'selection',
    rows: [2],
    cols: [0, 1, 2, 3, 4, 5],
    hint: 'arr[2] selects the whole row; arr[2, :] is the explicit version.',
  },
  {
    id: 'col-4',
    label: 'Select column index 4',
    kind: 'selection',
    rows: [0, 1, 2, 3, 4, 5],
    cols: [4],
    hint: 'Use a colon for every row, then the column index: arr[:, 4].',
  },
  {
    id: 'block-1-3-2-4',
    label: 'Select the 3x3 block: rows 1 to 3, columns 2 to 4',
    kind: 'selection',
    rows: [1, 2, 3],
    cols: [2, 3, 4],
    hint: 'Stops are exclusive: arr[1:4, 2:5].',
  },
  {
    id: 'even-cols',
    label: 'Select every other column',
    kind: 'selection',
    rows: [0, 1, 2, 3, 4, 5],
    cols: [0, 2, 4],
    hint: 'A third slice argument is a step: arr[:, ::2].',
  },
  {
    id: 'mask-30',
    label: 'Mask every reading above 30',
    kind: 'mask',
    threshold: 30,
    count: 3,
    hint: 'Use a boolean mask: arr[arr > 30]. The threshold slider previews the mask and its count.',
  },
]

export const selectionMatches = (goal: SliceGoal, rows: number[], cols: number[]): boolean => {
  if (goal.kind !== 'selection' || !goal.rows || !goal.cols) return false
  const same = (left: number[], right: number[]) =>
    left.length === right.length && left.every((value, index) => value === right[index])
  return same(rows, goal.rows) && same(cols, goal.cols)
}

export const maskGoalMatches = (goal: SliceGoal, threshold: number, count: number): boolean =>
  goal.kind === 'mask' && threshold === goal.threshold && count === goal.count

export const L03_RESHAPE_VALUES = arange(1, 13)
export const L03_RESHAPE_TARGETS: Array<{ id: string; label: string; shape: number[] }> = [
  { id: 'shape-3x4', label: '3 x 4', shape: [3, 4] },
  { id: 'shape-2x6', label: '2 x 6', shape: [2, 6] },
  { id: 'shape-2x2x3', label: '2 x 2 x 3', shape: [2, 2, 3] },
]

/**
 * Mask Master's 6x6 observed sensor dataset.
 *
 * Sorted readings: 5, 20, 21, 22, 22, 23, 23, 23, 23, 24, 24, 24, 24,
 * 25, 25, 25, 25, 26, 26, 26, 26, 27, 27, 27, 28, 28, 28, 29, 29, 30,
 * 30, 31, 32, 50, 58, 66.
 *
 * Median-of-halves quartiles: Q1 = 23.5, Q3 = 28.5, IQR = 5.
 * IQR fences: lower = 16, upper = 36. They isolate the four intended
 * anomalies: the low reading 5 and the high readings 50, 58 and 66.
 */
export const L03_MASK_MASTER_VALUES: number[][] = [
  [22, 24, 23, 25, 26, 5],
  [20, 27, 24, 26, 23, 22],
  [25, 28, 26, 24, 29, 23],
  [21, 30, 27, 25, 28, 50],
  [26, 31, 29, 27, 30, 25],
  [23, 32, 28, 58, 24, 66],
]

export const L03_MASK_MASTER_GRID = array2d(L03_MASK_MASTER_VALUES)

/** Immutable ground truth used only for scoring; never shown before completion. */
export const L03_MASK_MASTER_ANOMALIES: Array<[number, number]> = [
  [0, 5],
  [3, 5],
  [5, 3],
  [5, 5],
]

export const L03_BROADCAST_SAMPLE = array2d([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
])
export const L03_BROADCAST_ROW = array([10, 20, 30])
export const L03_BROADCAST_RESULT = broadcastAdd(L03_BROADCAST_SAMPLE, L03_BROADCAST_ROW)

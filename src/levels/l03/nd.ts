// Level 03 mini-NumPy: immutable 1D/2D arrays with slicing, masks, axis reductions and broadcasting.
export type DType = 'int64' | 'float64'

export interface NDArray {
  shape: number[]
  data: number[]
  dtype: DType
}

export const sizeOf = (shape: number[]): number => shape.reduce((total, value) => total * value, 1)

export const shapeOf = (array: NDArray): number[] => [...array.shape]
export const ndimOf = (array: NDArray): number => array.shape.length
export const dtypeOf = (array: NDArray): DType => array.dtype

export function inferDtype(data: number[]): DType {
  return data.every((value) => Number.isInteger(value)) ? 'int64' : 'float64'
}

export function createArray(shape: number[], data: number[], dtype: DType = inferDtype(data)): NDArray {
  if (shape.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(`invalid shape (${shape.join(', ')})`)
  }
  if (sizeOf(shape) !== data.length) {
    throw new Error(`shape (${shape.join(', ')}) needs ${sizeOf(shape)} values, got ${data.length}`)
  }
  return { shape: [...shape], data: [...data], dtype }
}

export function array(values: number[]): NDArray {
  return createArray([values.length], values)
}

export function array2d(rows: number[][]): NDArray {
  const width = rows[0]?.length ?? 0
  if (rows.some((row) => row.length !== width)) throw new Error('all rows must have the same length')
  return createArray([rows.length, width], rows.flat())
}

export function zeros(shape: number[], dtype: DType = 'float64'): NDArray {
  return createArray(shape, Array.from({ length: sizeOf(shape) }, () => 0), dtype)
}

export function arange(start: number, stop?: number, step = 1): NDArray {
  if (step === 0) throw new Error('arange step must not be zero')
  const from = stop === undefined ? 0 : start
  const to = stop === undefined ? start : stop
  const data: number[] = []
  if (step > 0) {
    for (let value = from; value < to; value += step) data.push(value)
  } else {
    for (let value = from; value > to; value += step) data.push(value)
  }
  return createArray([data.length], data, 'int64')
}

export function reshape(source: NDArray, shape: number[]): NDArray {
  if (sizeOf(shape) !== source.data.length) {
    throw new Error(
      `cannot reshape array of size ${source.data.length} into shape (${shape.join(', ')})`,
    )
  }
  return createArray(shape, source.data, source.dtype)
}

export function get2d(source: NDArray, row: number, col: number): number {
  if (source.shape.length !== 2) throw new Error('get2d needs a 2D array')
  const cols = source.shape[1]
  return source.data[row * cols + col]
}

export interface SliceSpec {
  start?: number
  stop?: number
  step?: number
}

const normalisePositive = (value: number, length: number) =>
  value < 0 ? Math.max(length + value, 0) : Math.min(value, length)

const normaliseNegative = (value: number, length: number) =>
  value < 0 ? length + value : Math.min(value, length - 1)

/** Python slice semantics, including negative bounds and an exclusive stop. */
export function pythonSlice(length: number, spec: SliceSpec): number[] {
  const step = spec.step ?? 1
  if (step === 0) throw new Error('slice step cannot be zero')
  const indices: number[] = []
  if (step > 0) {
    const start = spec.start === undefined ? 0 : normalisePositive(spec.start, length)
    const stop = spec.stop === undefined ? length : normalisePositive(spec.stop, length)
    for (let index = start; index < stop; index += step) indices.push(index)
  } else {
    const start = spec.start === undefined ? length - 1 : normaliseNegative(spec.start, length)
    const stop = spec.stop === undefined ? -1 : normaliseNegative(spec.stop, length)
    for (let index = start; index > stop; index += step) indices.push(index)
  }
  return indices
}

export function take(source: NDArray, rowIndices: number[], colIndices: number[]): NDArray {
  if (source.shape.length !== 2) throw new Error('take needs a 2D array')
  const cols = source.shape[1]
  const data: number[] = []
  for (const row of rowIndices) {
    for (const col of colIndices) data.push(source.data[row * cols + col])
  }
  return createArray([rowIndices.length, colIndices.length], data, source.dtype)
}

export function sumAxis(source: NDArray, axis: 0 | 1): NDArray {
  if (source.shape.length !== 2) throw new Error('sumAxis needs a 2D array')
  const [rows, cols] = source.shape
  if (axis === 0) {
    const data = Array.from({ length: cols }, (_, col) => {
      let total = 0
      for (let row = 0; row < rows; row += 1) total += source.data[row * cols + col]
      return total
    })
    return createArray([cols], data, source.dtype)
  }
  const data = Array.from({ length: rows }, (_, row) => {
    let total = 0
    for (let col = 0; col < cols; col += 1) total += source.data[row * cols + col]
    return total
  })
  return createArray([rows], data, source.dtype)
}

export function meanAxis(source: NDArray, axis: 0 | 1): NDArray {
  const totals = sumAxis(source, axis)
  const divisor = axis === 0 ? source.shape[0] : source.shape[1]
  return createArray(totals.shape, totals.data.map((value) => value / divisor), 'float64')
}

/** Flat argmax; ties keep the first occurrence, as NumPy does. */
export function argmax(source: NDArray): number {
  if (source.data.length === 0) throw new Error('argmax of an empty array')
  let bestIndex = 0
  let bestValue = source.data[0]
  for (let index = 1; index < source.data.length; index += 1) {
    if (source.data[index] > bestValue) {
      bestValue = source.data[index]
      bestIndex = index
    }
  }
  return bestIndex
}

export function maskGreaterThan(source: NDArray, threshold: number): boolean[] {
  return source.data.map((value) => value > threshold)
}

export const countTrue = (mask: boolean[]): number => mask.filter(Boolean).length

export function broadcastAdd(left: NDArray, right: NDArray): NDArray {
  return broadcast(left, right, 'add')
}

export function broadcastSubtract(left: NDArray, right: NDArray): NDArray {
  return broadcast(left, right, 'sub')
}

/** 2D + 1D broadcasting along the column axis, e.g. arr - arr.mean(axis=0). */
export function broadcast(left: NDArray, right: NDArray, op: 'add' | 'sub'): NDArray {
  if (left.shape.length !== 2) throw new Error('broadcasting needs a 2D left operand')
  if (right.shape.length !== 1) throw new Error('broadcasting needs a 1D right operand')
  const [rows, cols] = left.shape
  if (right.shape[0] !== cols) {
    throw new Error(
      `operands could not be broadcast together with shapes (${left.shape.join(',')}) (${right.shape.join(',')})`,
    )
  }
  const data = left.data.map((value, index) => {
    const col = index % cols
    return op === 'add' ? value + right.data[col] : value - right.data[col]
  })
  return createArray([rows, cols], data, 'float64')
}

export function equalsArray(left: NDArray, right: NDArray, epsilon = 1e-9): boolean {
  if (left.shape.length !== right.shape.length) return false
  if (left.shape.some((value, index) => value !== right.shape[index])) return false
  return left.data.every((value, index) => Math.abs(value - right.data[index]) <= epsilon)
}

export function toRows(source: NDArray): number[][] {
  if (source.shape.length === 1) return [source.data]
  if (source.shape.length === 2) {
    const [rows, cols] = source.shape
    return Array.from({ length: rows }, (_, row) => source.data.slice(row * cols, row * cols + cols))
  }
  const last = source.shape[source.shape.length - 1]
  const groups = Math.ceil(source.data.length / last)
  return Array.from({ length: groups }, (_, group) => source.data.slice(group * last, group * last + last))
}

export interface ParsedSelection {
  ok: boolean
  error: string | null
  rowIndices: number[]
  colIndices: number[]
  cells: Array<[number, number]>
  mask: boolean[] | null
  /** Threshold from arr[arr > n], or null for a slice. */
  maskThreshold: number | null
  expression: string
}

const allIndices = (length: number): number[] => Array.from({ length }, (_, index) => index)

const parseInteger = (text: string): number | null => {
  if (text.length === 0) return null
  if (!/^-?\d+$/.test(text)) return null
  return Number(text)
}

function parsePart(part: string, length: number, axis: string): number[] | string {
  if (part === '' || part === ':') return allIndices(length)
  if (part.includes(':')) {
    const pieces = part.split(':')
    if (pieces.length > 3) return `too many colons in ${axis} slice`
    const start = pieces[0] === '' ? undefined : parseInteger(pieces[0])
    const stop = pieces[1] === '' || pieces[1] === undefined ? undefined : parseInteger(pieces[1])
    const step = pieces[2] === '' || pieces[2] === undefined ? undefined : parseInteger(pieces[2])
    if (start === null || stop === null || step === null) return `invalid ${axis} slice`
    if (step === 0) return 'slice step cannot be zero'
    return pythonSlice(length, { start, stop, step })
  }
  const index = parseInteger(part)
  if (index === null) return `invalid ${axis} index`
  const normalised = index < 0 ? length + index : index
  if (normalised < 0 || normalised >= length) {
    return `index ${index} is out of bounds for axis with size ${length}`
  }
  return [normalised]
}

const compare = (left: number, operator: string, right: number): boolean => {
  if (operator === '>') return left > right
  if (operator === '<') return left < right
  if (operator === '>=') return left >= right
  if (operator === '<=') return left <= right
  if (operator === '==') return left === right
  return left !== right
}

/** Parses arr[r], arr[r, c], arr[a:b, c:d], stepped slices and arr[arr > n] masks. */
export function parseSliceExpression(expression: string, source: NDArray): ParsedSelection {
  const compact = expression.replace(/\s+/g, '')
  const fail = (error: string): ParsedSelection => ({
    ok: false,
    error,
    rowIndices: [],
    colIndices: [],
    cells: [],
    mask: null,
    maskThreshold: null,
    expression,
  })
  if (source.shape.length !== 2) return fail('This workbench slices 2D arrays only')
  const [rows, cols] = source.shape

  if (compact === 'arr') {
    return {
      ok: true,
      error: null,
      rowIndices: allIndices(rows),
      colIndices: allIndices(cols),
      cells: allIndices(rows).flatMap((row) => allIndices(cols).map((col) => [row, col] as [number, number])),
      mask: null,
      maskThreshold: null,
      expression,
    }
  }

  const maskMatch = compact.match(/^arr\[arr(>=|<=|==|!=|>|<)(-?\d+(?:\.\d+)?)]$/)
  if (maskMatch) {
    const operator = maskMatch[1]
    const threshold = Number(maskMatch[2])
    const mask = source.data.map((value) => compare(value, operator, threshold))
    const cells: Array<[number, number]> = []
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (mask[row * cols + col]) cells.push([row, col])
      }
    }
    return {
      ok: true,
      error: null,
      rowIndices: [],
      colIndices: [],
      cells,
      mask,
      maskThreshold: threshold,
      expression,
    }
  }

  const match = compact.match(/^arr\[(.+)]$/)
  if (!match) return fail("Expected an expression such as arr[1:4, 2:5]")
  const inside = match[1]
  const pieces = inside.split(',')
  if (pieces.length > 2) return fail('A slice takes at most one comma: arr[rows, columns]')

  const rowPart = pieces[0]
  const colPart = pieces[1]
  const rowIndices = parsePart(rowPart, rows, 'row')
  if (typeof rowIndices === 'string') return fail(rowIndices)
  const colIndices = colPart === undefined ? allIndices(cols) : parsePart(colPart, cols, 'column')
  if (typeof colIndices === 'string') return fail(colIndices)
  const cells = rowIndices.flatMap((row) =>
    colIndices.map((col) => [row, col] as [number, number]),
  )
  return {
    ok: true,
    error: null,
    rowIndices,
    colIndices,
    cells,
    mask: null,
    maskThreshold: null,
    expression,
  }
}

const formatIndices = (indices: number[], length: number): string | null => {
  if (indices.length === 0) return null
  if (indices.length === length && indices.every((value, index) => value === index)) return ':'
  if (indices.length === 1) return String(indices[0])
  const step = indices[1] - indices[0]
  if (step <= 0) return null
  for (let index = 2; index < indices.length; index += 1) {
    if (indices[index] - indices[index - 1] !== step) return null
  }
  const first = indices[0]
  const stop = indices[indices.length - 1] + step
  if (step === 1) return `${first}:${stop}`
  if (first === 0 && stop >= length) return `::${step}`
  return `${first}:${stop}:${step}`
}

/** Formats a rectangular selection back to the shortest Python-ish slice string. */
export function formatSelection(source: NDArray, rowIndices: number[], colIndices: number[]): string | null {
  if (source.shape.length !== 2) return null
  const [rows, cols] = source.shape
  const rowPart = formatIndices(rowIndices, rows)
  const colPart = formatIndices(colIndices, cols)
  if (!rowPart || !colPart) return null
  if (rowPart === ':' && colPart === ':') return 'arr'
  if (colPart === ':') return `arr[${rowPart}]`
  if (rowPart === ':') return `arr[:, ${colPart}]`
  return `arr[${rowPart}, ${colPart}]`
}

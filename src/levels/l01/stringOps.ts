// Pure string-pipeline interpreter. It models a small, honest subset of Python
// string methods without eval, Function or dynamic imports.

export type PipelineValue = string | number | boolean | string[] | null

export type StringOp =
  | { kind: 'strip' }
  | { kind: 'lower' }
  | { kind: 'upper' }
  | { kind: 'split'; sep: string }
  | { kind: 'slice'; start: number | null; end: number | null }
  | { kind: 'index'; index: number }
  | { kind: 'replace'; from: string; to: string }
  | { kind: 'startswith'; prefix: string }

export type OpOutcome =
  | { ok: true; value: PipelineValue }
  | { ok: false; error: string }

export interface PipelineStep {
  op: StringOp
  value: PipelineValue
  expression: string
  error?: string
}

export interface PipelineResult {
  value: PipelineValue
  steps: PipelineStep[]
  expression: string
  error?: string
}

function typeName(value: PipelineValue): string {
  if (value === null) return 'NoneType'
  if (Array.isArray(value)) return 'list'
  return typeof value
}

/** Python-like representation used by the live preview and the goal cards. */
export function pythonRepr(value: PipelineValue): string {
  if (value === null) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `[${value.map((item) => pythonRepr(item)).join(', ')}]`
  const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
  return `'${escaped}'`
}

export function opToPython(op: StringOp): string {
  switch (op.kind) {
    case 'strip':
      return '.strip()'
    case 'lower':
      return '.lower()'
    case 'upper':
      return '.upper()'
    case 'split':
      return `.split(${pythonRepr(op.sep)})`
    case 'slice':
      return `[${op.start ?? ''}:${op.end ?? ''}]`
    case 'index':
      return `[${op.index}]`
    case 'replace':
      return `.replace(${pythonRepr(op.from)}, ${pythonRepr(op.to)})`
    case 'startswith':
      return `.startswith(${pythonRepr(op.prefix)})`
  }
}

export function applyOp(value: PipelineValue, op: StringOp): OpOutcome {
  switch (op.kind) {
    case 'strip': {
      if (typeof value !== 'string') return { ok: false, error: `strip() needs str, got ${typeName(value)}` }
      return { ok: true, value: value.trim() }
    }
    case 'lower': {
      if (typeof value !== 'string') return { ok: false, error: `lower() needs str, got ${typeName(value)}` }
      return { ok: true, value: value.toLowerCase() }
    }
    case 'upper': {
      if (typeof value !== 'string') return { ok: false, error: `upper() needs str, got ${typeName(value)}` }
      return { ok: true, value: value.toUpperCase() }
    }
    case 'split': {
      if (typeof value !== 'string') return { ok: false, error: `split() needs str, got ${typeName(value)}` }
      if (op.sep.length === 0) return { ok: false, error: 'split() needs a non-empty separator' }
      return { ok: true, value: value.split(op.sep) }
    }
    case 'slice': {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return { ok: false, error: `[a:b] needs str or list, got ${typeName(value)}` }
      }
      const start = op.start ?? 0
      const end = op.end ?? value.length
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { ok: false, error: 'Slice bounds must be integers' }
      }
      return { ok: true, value: value.slice(start, end) }
    }
    case 'index': {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return { ok: false, error: `[i] needs str or list, got ${typeName(value)}` }
      }
      if (!Number.isInteger(op.index)) return { ok: false, error: 'Index must be an integer' }
      const resolved = op.index < 0 ? value.length + op.index : op.index
      if (resolved < 0 || resolved >= value.length) {
        return {
          ok: false,
          error: `Index ${op.index} is out of range for length ${value.length}`,
        }
      }
      return { ok: true, value: value[resolved] as string }
    }
    case 'replace': {
      if (typeof value !== 'string') return { ok: false, error: `replace() needs str, got ${typeName(value)}` }
      if (op.from.length === 0) {
        const joined = value.split('').join(op.to)
        return { ok: true, value: `${op.to}${joined}${op.to}` }
      }
      return { ok: true, value: value.split(op.from).join(op.to) }
    }
    case 'startswith': {
      if (typeof value !== 'string') {
        return { ok: false, error: `startswith() needs str, got ${typeName(value)}` }
      }
      return { ok: true, value: value.startsWith(op.prefix) }
    }
  }
}

export function runPipeline(input: string, ops: StringOp[]): PipelineResult {
  let current: PipelineValue = input
  let expression = pythonRepr(input)
  const steps: PipelineStep[] = []

  for (const op of ops) {
    expression += opToPython(op)
    const outcome = applyOp(current, op)
    if (!outcome.ok) {
      steps.push({ op, value: current, expression, error: outcome.error })
      return { value: current, steps, expression, error: outcome.error }
    }
    current = outcome.value
    steps.push({ op, value: current, expression })
  }

  return { value: current, steps, expression }
}

export function valueMatches(value: PipelineValue, target: string): boolean {
  if (typeof value === 'string') return value === target
  if (typeof value === 'number') return String(value) === target.trim()
  if (typeof value === 'boolean') return (value ? 'True' : 'False') === target.trim()
  if (value === null) return target.trim() === 'None'
  return value.join(', ') === target.trim() || pythonRepr(value) === target.trim()
}

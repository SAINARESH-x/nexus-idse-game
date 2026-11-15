// Pure dictionary access interpreter for the Dict Detective side op.

export type AccessOp =
  | { kind: 'key'; key: string }
  | { kind: 'index'; index: number }
  | { kind: 'get'; key: string; fallback: string }
  | { kind: 'keys' }

export interface AccessStep {
  op: AccessOp
  expression: string
  value: unknown
  display: string
  error?: string
}

export interface AccessResult {
  value: unknown
  steps: AccessStep[]
  expression: string
  error?: string
}

export type AccessOutcome = { ok: true; value: unknown } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function pythonString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function accessOpToPython(op: AccessOp): string {
  switch (op.kind) {
    case 'key':
      return `[${pythonString(op.key)}]`
    case 'index':
      return `[${op.index}]`
    case 'get':
      return `.get(${pythonString(op.key)}, ${pythonString(op.fallback)})`
    case 'keys':
      return '.keys()'
  }
}

export function displayAccessValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((item) => displayAccessValue(item)).join(', ')
  if (isRecord(value)) return JSON.stringify(value)
  return String(value)
}

export function applyAccess(value: unknown, op: AccessOp): AccessOutcome {
  if (op.kind === 'key') {
    if (!isRecord(value)) return { ok: false, error: `TypeError: cannot index ${typeof value} with a key` }
    if (!(op.key in value)) return { ok: false, error: `KeyError: ${pythonString(op.key)}` }
    return { ok: true, value: value[op.key] }
  }

  if (op.kind === 'index') {
    if (!Array.isArray(value)) return { ok: false, error: `TypeError: ${typeof value} is not a list` }
    if (!Number.isInteger(op.index)) return { ok: false, error: 'Index must be an integer' }
    const resolved = op.index < 0 ? value.length + op.index : op.index
    if (resolved < 0 || resolved >= value.length) {
      return { ok: false, error: `IndexError: index ${op.index} is out of range` }
    }
    return { ok: true, value: value[resolved] }
  }

  if (op.kind === 'get') {
    if (!isRecord(value)) return { ok: false, error: `AttributeError: ${typeof value} has no .get()` }
    return { ok: true, value: op.key in value ? value[op.key] : op.fallback }
  }

  if (!isRecord(value)) return { ok: false, error: `AttributeError: ${typeof value} has no .keys()` }
  return { ok: true, value: Object.keys(value) }
}

export function runAccess(root: Record<string, unknown>, ops: AccessOp[]): AccessResult {
  let current: unknown = root
  let expression = 'd'
  const steps: AccessStep[] = []

  for (const op of ops) {
    expression += accessOpToPython(op)
    const outcome = applyAccess(current, op)
    if (!outcome.ok) {
      steps.push({
        op,
        expression,
        value: current,
        display: displayAccessValue(current),
        error: outcome.error,
      })
      return { value: current, steps, expression, error: outcome.error }
    }
    current = outcome.value
    steps.push({ op, expression, value: current, display: displayAccessValue(current) })
  }

  return { value: current, steps, expression }
}

export function accessMatches(value: unknown, target: string): boolean {
  return displayAccessValue(value) === target.trim()
}

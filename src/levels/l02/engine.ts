// Level 02 engine: pure evaluators for packets, rule stacks, loops, functions, ranges and boolean gates.
export type PacketPriority = 'low' | 'normal' | 'high'

export interface Packet {
  id: string
  size_kb: number
  source: string
  checksum_ok: boolean
  priority: PacketPriority
}

export type RuleAction = 'ACCEPT' | 'QUARANTINE' | 'REJECT'
export type PacketField = 'size_kb' | 'source' | 'checksum_ok' | 'priority'
export type Comparison = '==' | '!=' | '>' | '<' | '>=' | '<='
export type RuleJoin = 'AND' | 'OR'

export interface Condition {
  field: PacketField
  op: Comparison
  value: string | number | boolean
}

export interface Rule {
  id: string
  conditions: Condition[]
  join: RuleJoin
  action: RuleAction
}

export interface PacketOutcome {
  packetId: string
  action: RuleAction
  ruleIndex: number | null
}

const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Compares one packet field with one condition, using Python-like equality. */
export function evaluateCondition(packet: Packet, condition: Condition): boolean {
  const left = packet[condition.field]
  const right = condition.value
  switch (condition.op) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
    case '<':
    case '>=':
    case '<=':
      if (!numeric(left) || !numeric(right)) return false
      if (condition.op === '>') return left > right
      if (condition.op === '<') return left < right
      if (condition.op === '>=') return left >= right
      return left <= right
    default:
      return false
  }
}

/** A rule matches when its joined conditions match; an empty condition list never matches. */
export function matchRule(packet: Packet, rule: Rule): boolean {
  const conditions = rule.conditions.slice(0, 2)
  if (conditions.length === 0) return false
  if (rule.join === 'OR') return conditions.some((condition) => evaluateCondition(packet, condition))
  return conditions.every((condition) => evaluateCondition(packet, condition))
}

/** Runs packets through first-match-wins rules, then the else branch. */
export function runRuleStack(
  packets: Packet[],
  rules: Rule[],
  defaultAction: RuleAction = 'QUARANTINE',
): PacketOutcome[] {
  return packets.map((packet) => {
    const index = rules.findIndex((rule) => matchRule(packet, rule))
    return {
      packetId: packet.id,
      action: index >= 0 ? rules[index].action : defaultAction,
      ruleIndex: index >= 0 ? index : null,
    }
  })
}

/** Explains a mismatch in terms of the rule that caught the packet first. */
export function mismatchExplanation(
  packet: Packet,
  outcome: PacketOutcome,
  expected: RuleAction,
  rules: Rule[],
): string {
  if (outcome.ruleIndex !== null) {
    const rule = rules[outcome.ruleIndex]
    return `Rule ${outcome.ruleIndex + 1} (${summariseRule(rule)}) already caught ${packet.id} and chose ${outcome.action} before a rule that produces ${expected} could run.`
  }
  return `No rule caught ${packet.id}, so the else branch chose ${outcome.action}; the target outcome is ${expected}.`
}

export function pythonLiteral(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

export function conditionToPython(condition: Condition): string {
  return `packet['${condition.field}'] ${condition.op} ${pythonLiteral(condition.value)}`
}

export function summariseRule(rule: Rule): string {
  const conditions = rule.conditions.slice(0, 2).map(conditionToPython).join(` ${rule.join.toLowerCase()} `)
  return conditions ? `${conditions} -> ${rule.action}` : `(empty rule) -> ${rule.action}`
}

/** Generated Python for the visual if / elif / else stack. */
export function toRuleStackCode(rules: Rule[], defaultAction: RuleAction = 'QUARANTINE'): string {
  if (rules.length === 0) return `action = '${defaultAction}'`
  const lines = rules.map((rule, index) => {
    const conditions = rule.conditions
      .slice(0, 2)
      .map(conditionToPython)
      .join(` ${rule.join.toLowerCase()} `)
    const keyword = index === 0 ? 'if' : 'elif'
    return `${keyword} ${conditions || 'False'}:\n    action = '${rule.action}'`
  })
  lines.push(`else:\n    action = '${defaultAction}'`)
  return lines.join('\n')
}

export type LoopFilter = 'none' | 'valid' | 'nonempty' | 'valid_nonempty'
export type AccumulatorOp = 'sum' | 'count' | 'max' | 'append'

export interface LoopConfig {
  filter: LoopFilter
  accumulator: AccumulatorOp
  breakOnCorrupt: boolean
  continueOnEmpty: boolean
}

export type LoopAction = 'add' | 'skip' | 'continue' | 'break'

export interface LoopStep {
  iteration: number
  packetId: string
  size: number
  condition: string
  action: LoopAction
  accumulator: number | number[]
}

export interface LoopTrace {
  steps: LoopStep[]
  result: number | number[]
  stoppedEarly: boolean
}

const filterPasses = (packet: Packet, filter: LoopFilter): boolean => {
  if (filter === 'valid') return packet.checksum_ok
  if (filter === 'nonempty') return packet.size_kb > 0
  if (filter === 'valid_nonempty') return packet.checksum_ok && packet.size_kb > 0
  return true
}

const conditionLabel = (packet: Packet, config: LoopConfig): string => {
  if (config.breakOnCorrupt && !packet.checksum_ok) return 'corrupted -> break'
  if (config.continueOnEmpty && packet.size_kb === 0) return 'empty -> continue'
  if (config.filter === 'valid') return `checksum_ok = ${packet.checksum_ok}`
  if (config.filter === 'nonempty') return `size > 0 = ${packet.size_kb > 0}`
  if (config.filter === 'valid_nonempty') return `valid and non-empty = ${packet.checksum_ok && packet.size_kb > 0}`
  return 'no filter'
}

const initialAccumulator = (op: AccumulatorOp): number | number[] => {
  if (op === 'append') return []
  if (op === 'max') return Number.NEGATIVE_INFINITY
  return 0
}

const accumulate = (current: number | number[], op: AccumulatorOp, size: number): number | number[] => {
  if (op === 'append' && Array.isArray(current)) return [...current, size]
  const value = typeof current === 'number' ? current : 0
  if (op === 'sum') return value + size
  if (op === 'count') return value + 1
  if (op === 'max') return Math.max(value, size)
  return current
}

/** Steps the configured for-loop and keeps the accumulator after every iteration. */
export function traceLoop(packets: Packet[], config: LoopConfig): LoopTrace {
  const steps: LoopStep[] = []
  let accumulator = initialAccumulator(config.accumulator)
  let stoppedEarly = false

  for (let index = 0; index < packets.length; index += 1) {
    const packet = packets[index]
    const condition = conditionLabel(packet, config)
    if (config.breakOnCorrupt && !packet.checksum_ok) {
      steps.push({
        iteration: index + 1,
        packetId: packet.id,
        size: packet.size_kb,
        condition,
        action: 'break',
        accumulator,
      })
      stoppedEarly = true
      break
    }
    if (config.continueOnEmpty && packet.size_kb === 0) {
      steps.push({
        iteration: index + 1,
        packetId: packet.id,
        size: packet.size_kb,
        condition,
        action: 'continue',
        accumulator,
      })
      continue
    }
    if (!filterPasses(packet, config.filter)) {
      steps.push({
        iteration: index + 1,
        packetId: packet.id,
        size: packet.size_kb,
        condition,
        action: 'skip',
        accumulator,
      })
      continue
    }
    accumulator = accumulate(accumulator, config.accumulator, packet.size_kb)
    steps.push({
      iteration: index + 1,
      packetId: packet.id,
      size: packet.size_kb,
      condition,
      action: 'add',
      accumulator: Array.isArray(accumulator) ? [...accumulator] : accumulator,
    })
  }

  return { steps, result: accumulator, stoppedEarly }
}

const filterCode = (filter: LoopFilter): string | null => {
  if (filter === 'valid') return 'packet.checksum_ok'
  if (filter === 'nonempty') return 'packet.size_kb > 0'
  if (filter === 'valid_nonempty') return 'packet.checksum_ok and packet.size_kb > 0'
  return null
}

export function toLoopCode(config: LoopConfig): string {
  const filter = filterCode(config.filter)
  const accumulator = config.accumulator
  const parts = [`total = 0`]
  if (accumulator === 'append') parts[0] = 'sizes = []'
  if (accumulator === 'max') parts[0] = 'largest = float("-inf")'
  parts.push('for packet in packets:')
  const body: string[] = []
  if (config.breakOnCorrupt) body.push('    if not packet.checksum_ok:\n        break')
  if (config.continueOnEmpty) body.push('    if packet.size_kb == 0:\n        continue')
  if (filter) body.push(`    if not (${filter}):\n        continue`)
  if (accumulator === 'sum') body.push('    total += packet.size_kb')
  if (accumulator === 'count') body.push('    total += 1')
  if (accumulator === 'max') body.push('    largest = max(largest, packet.size_kb)')
  if (accumulator === 'append') body.push('    sizes.append(packet.size_kb)')
  if (body.length === 0) body.push('    pass')
  return [...parts, ...body].join('\n')
}

export interface FunctionTestCase {
  id: string
  packet: Packet
  expected: boolean | number
}

export interface FunctionTestResult {
  id: string
  packet: Packet
  expected: boolean | number
  actual: boolean | number | null
  pass: boolean
  error: string | null
}

export interface FunctionRun {
  value: boolean | number | null
  error: string | null
  trace: string[]
}

interface FunctionState {
  ok?: boolean
  score?: number
}

const defined = <T>(value: T | undefined, name: string): T => {
  if (value === undefined) throw new Error(`${name} is not defined yet`)
  return value
}

/** Tiny interpreter for the ordered body blocks. It never evaluates user text. */
export function runFunctionBlocks(blocks: string[], packet: Packet): FunctionRun {
  const state: FunctionState = {}
  const trace: string[] = []
  for (const block of blocks) {
    try {
      switch (block) {
        case 'iv-compute-ok':
          state.ok = packet.checksum_ok && packet.size_kb > 0
          trace.push(`ok = ${state.ok}`)
          break
        case 'iv-compute-size':
          state.ok = packet.size_kb > 0
          trace.push(`ok = ${state.ok}`)
          break
        case 'iv-compute-checksum':
          state.ok = packet.checksum_ok
          trace.push(`ok = ${state.ok}`)
          break
        case 'iv-guard': {
          const ok = defined(state.ok, 'ok')
          if (!ok) {
            trace.push('guard returned False')
            return { value: false, error: null, trace }
          }
          trace.push('guard passed')
          break
        }
        case 'iv-return-ok': {
          const value = defined(state.ok, 'ok')
          trace.push(`return ${value}`)
          return { value, error: null, trace }
        }
        case 'iv-return-true':
          trace.push('return True')
          return { value: true, error: null, trace }
        case 'iv-return-size':
          trace.push(`return ${packet.size_kb}`)
          return { value: packet.size_kb, error: null, trace }
        case 'rs-compute-score':
          state.score = packet.size_kb / 100
          trace.push(`score = ${state.score}`)
          break
        case 'rs-compute-raw':
          state.score = packet.size_kb
          trace.push(`score = ${state.score}`)
          break
        case 'rs-guard-high': {
          const score = defined(state.score, 'score')
          if (packet.priority === 'high') {
            const value = score + 2
            trace.push(`high priority -> return ${value}`)
            return { value, error: null, trace }
          }
          trace.push('priority guard passed')
          break
        }
        case 'rs-return-score': {
          const value = defined(state.score, 'score')
          trace.push(`return ${value}`)
          return { value, error: null, trace }
        }
        case 'rs-return-size':
          trace.push(`return ${packet.size_kb}`)
          return { value: packet.size_kb, error: null, trace }
        case 'rs-return-zero':
          trace.push('return 0')
          return { value: 0, error: null, trace }
        default:
          return { value: null, error: `Unknown block: ${block}`, trace }
      }
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Block failed',
        trace,
      }
    }
  }
  return { value: null, error: 'The function never reached a return statement', trace }
}

/** Runs hidden tests and reports PASS/FAIL plus the actual value. */
export function runFunctionTests(blocks: string[], tests: FunctionTestCase[]): FunctionTestResult[] {
  return tests.map((test) => {
    const run = runFunctionBlocks(blocks, test.packet)
    return {
      id: test.id,
      packet: test.packet,
      expected: test.expected,
      actual: run.value,
      pass: run.error === null && run.value === test.expected,
      error: run.error,
    }
  })
}

export interface RangeTrace {
  values: number[]
  error: string | null
}

/** Python range() semantics for an editable off-by-one loop. */
export function rangeValues(start: number, stop: number, step: number): RangeTrace {
  if (step === 0) return { values: [], error: 'range() step must not be zero' }
  if (![start, stop, step].every(Number.isFinite)) return { values: [], error: 'range() arguments must be numbers' }
  const values: number[] = []
  if (step > 0) {
    for (let value = start; value < stop; value += step) values.push(value)
  } else {
    for (let value = start; value > stop; value += step) values.push(value)
  }
  return { values, error: null }
}

export function toRangeCode(start: number, stop: number, step: number): string {
  return `for i in range(${start}, ${stop}, ${step}):\n    print(i)`
}

export type BooleanOption = 'and' | 'or' | 'and_not_b' | 'nand'

export const BOOLEAN_OPTIONS: Array<{ id: BooleanOption; label: string }> = [
  { id: 'and', label: 'A and B' },
  { id: 'or', label: 'A or B' },
  { id: 'and_not_b', label: 'A and not B' },
  { id: 'nand', label: 'not (A and B)' },
]

export function evalBooleanOption(option: BooleanOption, a: boolean, b: boolean): boolean {
  if (option === 'and') return a && b
  if (option === 'or') return a || b
  if (option === 'and_not_b') return a && !b
  return !(a && b)
}

export const BOOLEAN_ROWS: Array<{ a: boolean; b: boolean }> = [
  { a: false, b: false },
  { a: false, b: true },
  { a: true, b: false },
  { a: true, b: true },
]

// Level 02 content: packets, rule targets, loop goals, function blocks, hints and side operations.
import type { SideOpDef, StageDef } from '../../game/types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'
import type {
  BooleanOption,
  FunctionTestCase,
  LoopConfig,
  Packet,
  Rule,
  RuleAction,
} from './engine'

export const L02_STAGES: StageDef[] = [
  {
    id: 'l2-stage-1',
    title: 'BRANCH LOGIC',
    subtitle: 'Order the rules before the packets arrive',
    hints: [
      'The most specific, most dangerous case must be checked first. A corrupted high-priority packet is still corrupted.',
      'A large unknown packet should be quarantined before the general high-priority accept rule runs.',
      'The large-packet rule needs both conditions joined with AND: size above 900 and source equal to unknown.',
    ],
  },
  {
    id: 'l2-stage-2',
    title: 'LOOP ENGINE',
    subtitle: 'Iterate, filter, accumulate and stop with intent',
    hints: [
      'break leaves the loop immediately. Use it when the first corrupted packet ends the scan.',
      'continue skips the rest of this iteration. Use it for empty packets so they never reach the accumulator.',
      'Check the goal wording: total, count and append need different accumulator choices.',
    ],
  },
  {
    id: 'l2-stage-3',
    title: 'FUNCTION FORGE',
    subtitle: 'Seal the checks in reusable functions',
    hints: [
      'is_valid must reject a bad checksum and a zero or negative size.',
      'risk_score divides size_kb by 100, then adds 2 for high priority before returning.',
      'A guard returns early; the final return hands back the computed value. Test with the failing input shown.',
    ],
  },
]

export const L02_SIDE_OPS: SideOpDef[] = [
  {
    id: 'l2-side-1',
    title: 'OFF-BY-ONE',
    blurb: 'A range() patrol prints the wrong sites. Edit start, stop and step until the trace matches the target.',
    hints: [
      'range(start, stop) never includes stop.',
      'The target starts at 2, so start must be 2.',
      'The target ends at 14 with a step of 3, so stop must be 15.',
    ],
  },
  {
    id: 'l2-side-2',
    title: 'BOOLEAN GAUNTLET',
    blurb: 'Three gate circuits, four possible expressions each. Match every row of the target truth table.',
    hints: [
      'AND is True only on the bottom row: both inputs True.',
      'OR is False only when both inputs are False.',
      'A and not B is True only when A is True and B is False.',
    ],
  },
]

export const L02_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l2-obj-rules', label: 'Build an ordered if / elif / else rule stack for twelve packets' },
  { id: 'l2-obj-loops', label: 'Configure loops with filters, break and continue' },
  { id: 'l2-obj-functions', label: 'Define and reuse functions that pass hidden tests' },
]

export const L02_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l2-side-1': [{ id: 'l2-side-1-obj', label: 'Match the target range output exactly' }],
  'l2-side-2': [{ id: 'l2-side-2-obj', label: 'Match all three target truth tables' }],
}

export const L02_RULE_PACKETS: Packet[] = [
  { id: 'p01', size_kb: 120, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p02', size_kb: 42, source: 'campus', checksum_ok: false, priority: 'high' },
  { id: 'p03', size_kb: 950, source: 'unknown', checksum_ok: true, priority: 'high' },
  { id: 'p04', size_kb: 50, source: 'vpn', checksum_ok: true, priority: 'high' },
  { id: 'p05', size_kb: 0, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p06', size_kb: 812, source: 'unknown', checksum_ok: true, priority: 'normal' },
  { id: 'p07', size_kb: 1200, source: 'campus', checksum_ok: true, priority: 'high' },
  { id: 'p08', size_kb: 300, source: 'vpn', checksum_ok: true, priority: 'normal' },
  { id: 'p09', size_kb: 901, source: 'unknown', checksum_ok: true, priority: 'low' },
  { id: 'p10', size_kb: 75, source: 'unknown', checksum_ok: false, priority: 'normal' },
  { id: 'p11', size_kb: 0, source: 'vpn', checksum_ok: true, priority: 'high' },
  { id: 'p12', size_kb: 640, source: 'campus', checksum_ok: true, priority: 'high' },
]

export const L02_RULE_TARGETS: Record<string, RuleAction> = {
  p01: 'QUARANTINE',
  p02: 'REJECT',
  p03: 'QUARANTINE',
  p04: 'ACCEPT',
  p05: 'QUARANTINE',
  p06: 'QUARANTINE',
  p07: 'ACCEPT',
  p08: 'QUARANTINE',
  p09: 'QUARANTINE',
  p10: 'REJECT',
  p11: 'QUARANTINE',
  p12: 'ACCEPT',
}

export const L02_DEFAULT_ACTION: RuleAction = 'QUARANTINE'

/** The compact four-rule solution the targets were derived from. */
export const L02_REFERENCE_RULES: Rule[] = [
  {
    id: 'ref-checksum',
    conditions: [{ field: 'checksum_ok', op: '==', value: false }],
    join: 'AND',
    action: 'REJECT',
  },
  {
    id: 'ref-empty',
    conditions: [{ field: 'size_kb', op: '<=', value: 0 }],
    join: 'AND',
    action: 'QUARANTINE',
  },
  {
    id: 'ref-large-unknown',
    conditions: [
      { field: 'size_kb', op: '>', value: 900 },
      { field: 'source', op: '==', value: 'unknown' },
    ],
    join: 'AND',
    action: 'QUARANTINE',
  },
  {
    id: 'ref-priority',
    conditions: [{ field: 'priority', op: '==', value: 'high' }],
    join: 'AND',
    action: 'ACCEPT',
  },
]

/** Starter stack: closest rule first, but priority is too early and the large rule is incomplete. */
export const L02_STARTER_RULES: Rule[] = [
  {
    id: 'start-checksum',
    conditions: [{ field: 'checksum_ok', op: '==', value: false }],
    join: 'AND',
    action: 'REJECT',
  },
  {
    id: 'start-priority',
    conditions: [{ field: 'priority', op: '==', value: 'high' }],
    join: 'AND',
    action: 'ACCEPT',
  },
  {
    id: 'start-large',
    conditions: [{ field: 'size_kb', op: '>', value: 900 }],
    join: 'AND',
    action: 'QUARANTINE',
  },
  {
    id: 'start-empty',
    conditions: [{ field: 'size_kb', op: '<=', value: 0 }],
    join: 'AND',
    action: 'QUARANTINE',
  },
]

/** A pre-crash archive whose second rule can never fire. */
export const L02_DEAD_CODE_STACK: Rule[] = [
  {
    id: 'archive-1',
    conditions: [{ field: 'size_kb', op: '>', value: 0 }],
    join: 'AND',
    action: 'QUARANTINE',
  },
  {
    id: 'archive-2',
    conditions: [{ field: 'size_kb', op: '>', value: 900 }],
    join: 'AND',
    action: 'REJECT',
  },
  {
    id: 'archive-3',
    conditions: [{ field: 'checksum_ok', op: '==', value: false }],
    join: 'AND',
    action: 'REJECT',
  },
]

export const L02_DEAD_CODE_INDEX = 1

export const L02_LOOP_PACKETS: Packet[] = [
  { id: 'p01', size_kb: 12, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p02', size_kb: 0, source: 'campus', checksum_ok: true, priority: 'low' },
  { id: 'p03', size_kb: 8, source: 'vpn', checksum_ok: true, priority: 'normal' },
  { id: 'p04', size_kb: 15, source: 'vpn', checksum_ok: false, priority: 'high' },
  { id: 'p05', size_kb: 22, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p06', size_kb: 0, source: 'unknown', checksum_ok: false, priority: 'low' },
  { id: 'p07', size_kb: 7, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p08', size_kb: 19, source: 'vpn', checksum_ok: true, priority: 'high' },
  { id: 'p09', size_kb: 3, source: 'unknown', checksum_ok: false, priority: 'normal' },
  { id: 'p10', size_kb: 0, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p11', size_kb: 11, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p12', size_kb: 6, source: 'vpn', checksum_ok: true, priority: 'low' },
  { id: 'p13', size_kb: 14, source: 'unknown', checksum_ok: false, priority: 'high' },
  { id: 'p14', size_kb: 9, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p15', size_kb: 0, source: 'vpn', checksum_ok: true, priority: 'low' },
  { id: 'p16', size_kb: 17, source: 'campus', checksum_ok: true, priority: 'normal' },
  { id: 'p17', size_kb: 5, source: 'vpn', checksum_ok: true, priority: 'low' },
  { id: 'p18', size_kb: 21, source: 'unknown', checksum_ok: false, priority: 'high' },
  { id: 'p19', size_kb: 2, source: 'campus', checksum_ok: true, priority: 'low' },
  { id: 'p20', size_kb: 13, source: 'vpn', checksum_ok: true, priority: 'normal' },
]

export interface LoopGoal {
  id: string
  label: string
  target: number | number[]
  hint: string
}

export const L02_LOOP_GOALS: LoopGoal[] = [
  {
    id: 'total-valid',
    label: 'Total size of valid packets',
    target: 131,
    hint: 'Filter on checksum_ok, accumulate with sum, and do not skip or break.',
  },
  {
    id: 'until-corrupt',
    label: 'Count packets before the first corrupted one',
    target: 3,
    hint: 'Count every packet, but break as soon as checksum_ok is False.',
  },
  {
    id: 'skip-empty',
    label: 'List every non-empty packet size',
    target: [12, 8, 15, 22, 7, 19, 3, 11, 6, 14, 9, 17, 5, 21, 2, 13],
    hint: 'Append each size, and continue on the four packets whose size is zero.',
  },
]

export const L02_DEFAULT_LOOP: LoopConfig = {
  filter: 'none',
  accumulator: 'sum',
  breakOnCorrupt: false,
  continueOnEmpty: false,
}

export type FunctionKind = 'is_valid' | 'risk_score'

export interface FunctionBlockDef {
  id: FunctionBlockId
  label: string
  kind: 'compute' | 'if-return' | 'return'
  code: string
}

// Small string alias keeps the engine free of UI-only block metadata.
export type FunctionBlockId =
  | 'iv-compute-ok'
  | 'iv-compute-size'
  | 'iv-compute-checksum'
  | 'iv-guard'
  | 'iv-return-ok'
  | 'iv-return-true'
  | 'iv-return-size'
  | 'rs-compute-score'
  | 'rs-compute-raw'
  | 'rs-guard-high'
  | 'rs-return-score'
  | 'rs-return-size'
  | 'rs-return-zero'

export const L02_FUNCTION_BLOCKS: Record<FunctionKind, FunctionBlockDef[]> = {
  is_valid: [
    {
      id: 'iv-compute-ok',
      label: 'compute validity',
      kind: 'compute',
      code: "ok = packet['checksum_ok'] and packet['size_kb'] > 0",
    },
    {
      id: 'iv-compute-size',
      label: 'compute size only',
      kind: 'compute',
      code: "ok = packet['size_kb'] > 0",
    },
    {
      id: 'iv-compute-checksum',
      label: 'compute checksum only',
      kind: 'compute',
      code: "ok = packet['checksum_ok']",
    },
    {
      id: 'iv-guard',
      label: 'guard on invalid',
      kind: 'if-return',
      code: 'if not ok:\n    return False',
    },
    { id: 'iv-return-ok', label: 'return validity', kind: 'return', code: 'return ok' },
    { id: 'iv-return-true', label: 'return True', kind: 'return', code: 'return True' },
    { id: 'iv-return-size', label: 'return size', kind: 'return', code: 'return packet' },
  ],
  risk_score: [
    {
      id: 'rs-compute-score',
      label: 'compute size score',
      kind: 'compute',
      code: "score = packet['size_kb'] / 100",
    },
    {
      id: 'rs-compute-raw',
      label: 'compute raw size',
      kind: 'compute',
      code: "score = packet['size_kb']",
    },
    {
      id: 'rs-guard-high',
      label: 'add high-priority bonus',
      kind: 'if-return',
      code: "if packet['priority'] == 'high':\n    return score + 2",
    },
    { id: 'rs-return-score', label: 'return score', kind: 'return', code: 'return score' },
    { id: 'rs-return-size', label: 'return raw size', kind: 'return', code: 'return packet' },
    { id: 'rs-return-zero', label: 'return 0', kind: 'return', code: 'return 0' },
  ],
}

export const L02_FUNCTION_NAMES: Record<FunctionKind, string[]> = {
  is_valid: ['is_valid', 'validate', 'check_packet'],
  risk_score: ['risk_score', 'score', 'risk'],
}

export const L02_FUNCTION_PARAMETERS: Record<FunctionKind, string[]> = {
  is_valid: ['packet', 'data', 'packets'],
  risk_score: ['packet', 'data', 'p'],
}

export const L02_FUNCTION_TESTS: Record<FunctionKind, FunctionTestCase[]> = {
  is_valid: [
    {
      id: 'valid',
      packet: { id: 'valid', size_kb: 10, source: 'campus', checksum_ok: true, priority: 'normal' },
      expected: true,
    },
    {
      id: 'zero-size',
      packet: { id: 'zero-size', size_kb: 0, source: 'campus', checksum_ok: true, priority: 'normal' },
      expected: false,
    },
    {
      id: 'bad-checksum',
      packet: { id: 'bad-checksum', size_kb: 10, source: 'campus', checksum_ok: false, priority: 'normal' },
      expected: false,
    },
    {
      id: 'negative-size',
      packet: { id: 'negative-size', size_kb: -5, source: 'vpn', checksum_ok: true, priority: 'low' },
      expected: false,
    },
    {
      id: 'high-priority-valid',
      packet: { id: 'high-priority-valid', size_kb: 300, source: 'vpn', checksum_ok: true, priority: 'high' },
      expected: true,
    },
  ],
  risk_score: [
    {
      id: 'small-high',
      packet: { id: 'small-high', size_kb: 50, source: 'vpn', checksum_ok: true, priority: 'high' },
      expected: 2.5,
    },
    {
      id: 'large-low',
      packet: { id: 'large-low', size_kb: 300, source: 'campus', checksum_ok: true, priority: 'low' },
      expected: 3,
    },
    {
      id: 'empty-high',
      packet: { id: 'empty-high', size_kb: 0, source: 'campus', checksum_ok: true, priority: 'high' },
      expected: 2,
    },
    {
      id: 'normal',
      packet: { id: 'normal', size_kb: 120, source: 'vpn', checksum_ok: true, priority: 'normal' },
      expected: 1.2,
    },
    {
      id: 'max-high',
      packet: { id: 'max-high', size_kb: 900, source: 'campus', checksum_ok: true, priority: 'high' },
      expected: 11,
    },
  ],
}

export const L02_OFF_BY_ONE = {
  initial: { start: 1, stop: 15, step: 3 },
  target: { start: 2, stop: 15, step: 3 },
  targetValues: [2, 5, 8, 11, 14],
  starts: [0, 1, 2, 3, 4, 5],
  stops: [10, 11, 12, 13, 14, 15, 16, 17, 18],
  steps: [1, 2, 3, 4, 5],
}

export interface BooleanPuzzle {
  id: string
  title: string
  target: boolean[]
  correct: BooleanOption
  explanation: string
}

export const L02_BOOLEAN_PUZZLES: BooleanPuzzle[] = [
  {
    id: 'gate-1',
    title: 'GATE 01 · BOTH KEYS',
    target: [false, false, false, true],
    correct: 'and',
    explanation: 'The target is true only on the bottom row, where A and B are both true. That is AND.',
  },
  {
    id: 'gate-2',
    title: 'GATE 02 · EITHER KEY',
    target: [false, true, true, true],
    correct: 'or',
    explanation: 'The target is false only when both inputs are false. That is OR.',
  },
  {
    id: 'gate-3',
    title: 'GATE 03 · ONE KEY ONLY',
    target: [false, false, true, false],
    correct: 'and_not_b',
    explanation: 'The target is true only when A is true and B is false. That is A and not B.',
  },
]

export const L02_BOOLEAN_OPTIONS: Array<{ id: BooleanOption; label: string }> = [
  { id: 'and', label: 'A and B' },
  { id: 'or', label: 'A or B' },
  { id: 'and_not_b', label: 'A and not B' },
  { id: 'nand', label: 'not (A and B)' },
]

export const L02_REUSE_PACKETS: Packet[] = L02_LOOP_PACKETS

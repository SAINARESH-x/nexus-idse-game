// Level 02 engine tests: rule order, boolean joins, loops, functions, ranges and gates.
import { describe, expect, it } from 'vitest'
import {
  BOOLEAN_ROWS,
  evalBooleanOption,
  mismatchExplanation,
  rangeValues,
  runFunctionTests,
  runRuleStack,
  traceLoop,
} from '../engine'
import type { LoopConfig, Rule } from '../engine'
import {
  L02_BOOLEAN_PUZZLES,
  L02_FUNCTION_BLOCKS,
  L02_FUNCTION_TESTS,
  L02_LOOP_GOALS,
  L02_LOOP_PACKETS,
  L02_OFF_BY_ONE,
  L02_REFERENCE_RULES,
  L02_RULE_PACKETS,
  L02_RULE_TARGETS,
  L02_STARTER_RULES,
} from '../content'

const config = (patch: Partial<LoopConfig>): LoopConfig => ({
  filter: 'none',
  accumulator: 'sum',
  breakOnCorrupt: false,
  continueOnEmpty: false,
  ...patch,
})

describe('rule stack', () => {
  it('matches the published behaviour table with four rules', () => {
    const outcomes = runRuleStack(L02_RULE_PACKETS, L02_REFERENCE_RULES)
    expect(outcomes.map((outcome) => outcome.action)).toEqual(
      L02_RULE_PACKETS.map((packet) => L02_RULE_TARGETS[packet.id]),
    )
  })

  it('shows order-sensitive failures in the starter stack', () => {
    const outcomes = runRuleStack(L02_RULE_PACKETS, L02_STARTER_RULES)
    const wrong = outcomes.filter((outcome) => outcome.action !== L02_RULE_TARGETS[outcome.packetId])
    expect(wrong.map((outcome) => outcome.packetId)).toEqual(expect.arrayContaining(['p03', 'p11']))
  })

  it('requires both conditions of the AND rule', () => {
    const rule: Rule = {
      id: 'and-rule',
      conditions: [
        { field: 'size_kb', op: '>', value: 900 },
        { field: 'source', op: '==', value: 'unknown' },
      ],
      join: 'AND',
      action: 'QUARANTINE',
    }
    const outcomes = runRuleStack(L02_RULE_PACKETS, [rule], 'ACCEPT')
    expect(outcomes.find((outcome) => outcome.packetId === 'p03')?.action).toBe('QUARANTINE')
    expect(outcomes.find((outcome) => outcome.packetId === 'p07')?.action).toBe('ACCEPT')
  })

  it('matches either side when the join is OR', () => {
    const rule: Rule = {
      id: 'or-rule',
      conditions: [
        { field: 'priority', op: '==', value: 'high' },
        { field: 'checksum_ok', op: '==', value: false },
      ],
      join: 'OR',
      action: 'QUARANTINE',
    }
    const outcomes = runRuleStack(L02_RULE_PACKETS, [rule], 'ACCEPT')
    expect(outcomes.find((outcome) => outcome.packetId === 'p04')?.action).toBe('QUARANTINE')
    expect(outcomes.find((outcome) => outcome.packetId === 'p02')?.action).toBe('QUARANTINE')
    expect(outcomes.find((outcome) => outcome.packetId === 'p01')?.action).toBe('ACCEPT')
  })

  it('explains which earlier rule caught a packet', () => {
    const reversed: Rule[] = [L02_REFERENCE_RULES[3], L02_REFERENCE_RULES[0]]
    const outcomes = runRuleStack(L02_RULE_PACKETS, reversed)
    const packet = L02_RULE_PACKETS.find((item) => item.id === 'p02')
    const outcome = outcomes.find((item) => item.packetId === 'p02')
    expect(packet && outcome).toBeTruthy()
    if (!packet || !outcome) return
    const message = mismatchExplanation(packet, outcome, 'REJECT', reversed)
    expect(message).toContain('Rule 1')
    expect(message).toContain('already caught')
  })
})

describe('loop engine', () => {
  it('sums valid packets', () => {
    expect(traceLoop(L02_LOOP_PACKETS, config({ filter: 'valid', accumulator: 'sum' })).result).toBe(
      L02_LOOP_GOALS[0].target,
    )
  })

  it('breaks before counting the first corrupted packet', () => {
    const trace = traceLoop(
      L02_LOOP_PACKETS,
      config({ accumulator: 'count', breakOnCorrupt: true }),
    )
    expect(trace.result).toBe(L02_LOOP_GOALS[1].target)
    expect(trace.stoppedEarly).toBe(true)
    expect(trace.steps[trace.steps.length - 1]?.action).toBe('break')
  })

  it('continues past empty packets when appending', () => {
    const trace = traceLoop(
      L02_LOOP_PACKETS,
      config({ accumulator: 'append', continueOnEmpty: true }),
    )
    expect(trace.result).toEqual(L02_LOOP_GOALS[2].target)
    expect(trace.result).not.toContain(0)
  })

  it('skips packets that fail the filter without stopping', () => {
    const trace = traceLoop(L02_LOOP_PACKETS, config({ filter: 'valid', accumulator: 'sum' }))
    expect(trace.steps.some((step) => step.action === 'skip')).toBe(true)
    expect(trace.stoppedEarly).toBe(false)
  })
})

describe('function forge', () => {
  it('passes every is_valid test with the compute, guard and return order', () => {
    const blocks = L02_FUNCTION_BLOCKS.is_valid
      .filter((block) => ['iv-compute-ok', 'iv-guard', 'iv-return-ok'].includes(block.id))
      .map((block) => block.id)
    const results = runFunctionTests(blocks, L02_FUNCTION_TESTS.is_valid)
    expect(results.every((result) => result.pass)).toBe(true)
  })

  it('fails is_valid when the checksum is ignored', () => {
    const results = runFunctionTests(
      ['iv-compute-size', 'iv-guard', 'iv-return-ok'],
      L02_FUNCTION_TESTS.is_valid,
    )
    expect(results.some((result) => !result.pass)).toBe(true)
    expect(results.find((result) => result.id === 'bad-checksum')?.pass).toBe(false)
  })

  it('passes every risk_score test with the bonus guard', () => {
    const results = runFunctionTests(
      ['rs-compute-score', 'rs-guard-high', 'rs-return-score'],
      L02_FUNCTION_TESTS.risk_score,
    )
    expect(results.every((result) => result.pass)).toBe(true)
  })

  it('fails risk_score when the raw size is returned as the score', () => {
    const results = runFunctionTests(
      ['rs-compute-raw', 'rs-guard-high', 'rs-return-score'],
      L02_FUNCTION_TESTS.risk_score,
    )
    expect(results.every((result) => result.pass)).toBe(false)
  })
})

describe('side operation engines', () => {
  it('repairs range() with an exclusive stop', () => {
    const fixed = rangeValues(
      L02_OFF_BY_ONE.target.start,
      L02_OFF_BY_ONE.target.stop,
      L02_OFF_BY_ONE.target.step,
    )
    expect(fixed.values).toEqual(L02_OFF_BY_ONE.targetValues)
  })

  it('reports a zero step instead of looping forever', () => {
    expect(rangeValues(1, 10, 0).error).toMatch(/step must not be zero/i)
  })

  it('supports a descending range', () => {
    expect(rangeValues(5, 0, -2).values).toEqual([5, 3, 1])
  })

  it('solves the boolean target truth tables', () => {
    for (const puzzle of L02_BOOLEAN_PUZZLES) {
      const actual = BOOLEAN_ROWS.map((row) => evalBooleanOption(puzzle.correct, row.a, row.b))
      expect(actual).toEqual(puzzle.target)
    }
  })

  it('keeps AND and NAND distinct', () => {
    expect(evalBooleanOption('and', true, true)).toBe(true)
    expect(evalBooleanOption('nand', true, true)).toBe(false)
  })
})

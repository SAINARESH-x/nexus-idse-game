// Stage 1 challenge: build, order and run a visual if / elif / else packet rule stack.
import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Play, Trash2, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import {
  mismatchExplanation,
  runRuleStack,
  summariseRule,
  toRuleStackCode,
} from './engine'
import type {
  Comparison,
  Condition,
  PacketField,
  PacketOutcome,
  Rule,
  RuleAction,
} from './engine'
import {
  L02_DEAD_CODE_INDEX,
  L02_DEAD_CODE_STACK,
  L02_DEFAULT_ACTION,
  L02_RULE_PACKETS,
  L02_RULE_TARGETS,
  L02_STARTER_RULES,
} from './content'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const FIELD_OPTIONS: Array<{ id: PacketField; label: string }> = [
  { id: 'size_kb', label: 'size_kb' },
  { id: 'source', label: 'source' },
  { id: 'checksum_ok', label: 'checksum_ok' },
  { id: 'priority', label: 'priority' },
]

const OP_OPTIONS: Comparison[] = ['==', '!=', '>', '<', '>=', '<=']
const ACTION_OPTIONS: RuleAction[] = ['ACCEPT', 'QUARANTINE', 'REJECT']

const defaultCondition = (field: PacketField): Condition => {
  if (field === 'size_kb') return { field, op: '>', value: 0 }
  if (field === 'checksum_ok') return { field, op: '==', value: false }
  if (field === 'priority') return { field, op: '==', value: 'high' }
  return { field, op: '==', value: 'unknown' }
}

const cloneRules = (rules: Rule[]): Rule[] =>
  rules.map((rule) => ({ ...rule, conditions: rule.conditions.map((condition) => ({ ...condition })) }))

export function RuleBuilderChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const nextRuleId = useRef(10)
  const [rules, setRules] = useState<Rule[]>(() => cloneRules(L02_STARTER_RULES))
  const [outcomes, setOutcomes] = useState<PacketOutcome[] | null>(null)
  const [failedRuns, setFailedRuns] = useState(0)
  const [deadCodeSpotted, setDeadCodeSpotted] = useState(false)
  const [deadCodeFeedback, setDeadCodeFeedback] = useState<string | null>(null)

  const patchRule = (ruleId: string, patch: Partial<Rule>) => {
    setRules((current) => current.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)))
    setOutcomes(null)
  }

  const patchCondition = (ruleId: string, index: number, patch: Partial<Condition>) => {
    setRules((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule
        return {
          ...rule,
          conditions: rule.conditions.map((condition, position) =>
            position === index ? { ...condition, ...patch } : condition,
          ),
        }
      }),
    )
    setOutcomes(null)
  }

  const changeField = (ruleId: string, index: number, field: PacketField) => {
    const next = defaultCondition(field)
    setRules((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule
        return {
          ...rule,
          conditions: rule.conditions.map((condition, position) => (position === index ? next : condition)),
        }
      }),
    )
    setOutcomes(null)
  }

  const addCondition = (ruleId: string) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId ? { ...rule, conditions: [...rule.conditions, defaultCondition('source')] } : rule,
      ),
    )
    setOutcomes(null)
  }

  const removeCondition = (ruleId: string, index: number) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId ? { ...rule, conditions: rule.conditions.filter((_, position) => position !== index) } : rule,
      ),
    )
    setOutcomes(null)
  }

  const moveRule = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= rules.length) return
    setRules((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    setOutcomes(null)
  }

  const addRule = () => {
    if (rules.length >= 6) return
    const rule: Rule = {
      id: `rule-${nextRuleId.current++}`,
      conditions: [defaultCondition('checksum_ok')],
      join: 'AND',
      action: 'REJECT',
    }
    setRules((current) => [...current, rule])
    setOutcomes(null)
  }

  const removeRule = (ruleId: string) => {
    setRules((current) => current.filter((rule) => rule.id !== ruleId))
    setOutcomes(null)
  }

  const flagArchive = (index: number) => {
    if (index === L02_DEAD_CODE_INDEX) {
      setDeadCodeSpotted(true)
      setDeadCodeFeedback(
        `Rule ${index + 1} is unreachable. Every packet with size above 900 also has size above 0, so rule 1 catches it first.`,
      )
      ui.log({
        title: 'Dead code spotted',
        detail: 'The archive rule for size > 900 can never run behind the size > 0 quarantine.',
        tone: 'good',
      })
      return
    }
    setDeadCodeFeedback(`Rule ${index + 1} can still receive packets. Look for a rule that already catches everything another rule needs.`)
    ui.log({ title: 'Archive flag rejected', detail: 'That rule is still reachable.', tone: 'tip' })
  }

  const run = () => {
    const next = runRuleStack(L02_RULE_PACKETS, rules, L02_DEFAULT_ACTION)
    setOutcomes(next)
    const mismatches = next.filter((outcome) => outcome.action !== L02_RULE_TARGETS[outcome.packetId])

    if (mismatches.length === 0) {
      decisions.current.push({
        label: 'Every packet matched the behaviour table',
        good: true,
        explanation:
          'First-match-wins order is correct: corrupted packets are rejected, empty and oversized unknown packets are quarantined, and high-priority valid packets are accepted.',
      })
      ui.completeObjective('l2-obj-rules')
      ui.log({
        title: 'Gate rulebook verified',
        detail: `${L02_RULE_PACKETS.length} packets matched with ${rules.length} rule(s).`,
        tone: 'good',
      })
      onComplete({
        id,
        accuracy: 1,
        decisionQuality: clamp01(1 / (1 + failedRuns)),
        efficiency: clamp01(Math.max(0.3, 12 / (12 + failedRuns))),
        hintsUsed: 0,
        mistakes: failedRuns,
        decisions: decisions.current,
        extra: {
          ruleCount: rules.length,
          elegant: rules.length <= 4,
          deadCodeSpotted,
          failedRuns,
        },
      })
      return
    }

    setFailedRuns((current) => current + 1)
    for (const outcome of mismatches.slice(0, 4)) {
      const packet = L02_RULE_PACKETS.find((item) => item.id === outcome.packetId)
      if (!packet) continue
      const message = mismatchExplanation(packet, outcome, L02_RULE_TARGETS[outcome.packetId], rules)
      decisions.current.push({
        label: `${packet.id} landed on ${outcome.action}, target ${L02_RULE_TARGETS[outcome.packetId]}`,
        good: false,
        explanation: message,
      })
    }
    ui.log({
      title: `${mismatches.length} packet(s) broke the table`,
      detail: mismatchExplanation(
        L02_RULE_PACKETS.find((packet) => packet.id === mismatches[0].packetId) ?? L02_RULE_PACKETS[0],
        mismatches[0],
        L02_RULE_TARGETS[mismatches[0].packetId],
        rules,
      ),
      tone: 'bad',
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-magenta/40 bg-magenta/[0.05] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-magenta">Pre-crash archive · 3 rules</p>
          <Badge tone={deadCodeSpotted ? 'green' : 'magenta'}>{deadCodeSpotted ? 'Unreachable rule found' : 'Audit open'}</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          One rule in this recovered stack can never fire. Flag it before you rebuild the live stack.
        </p>
        <ul className="mt-2 space-y-1">
          {L02_DEAD_CODE_STACK.map((rule, index) => (
            <li
              key={rule.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5',
                deadCodeSpotted && index === L02_DEAD_CODE_INDEX
                  ? 'border-green/40 bg-green/[0.06]'
                  : 'border-border bg-panel2/50',
              )}
            >
              <span className="font-mono text-[11px] text-text">
                {index + 1}. {summariseRule(rule)}
              </span>
              <button
                type="button"
                onClick={() => flagArchive(index)}
                className="rounded border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted hover:border-cyan/60 hover:text-cyan"
              >
                Flag unreachable
              </button>
            </li>
          ))}
        </ul>
        {deadCodeFeedback && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber" aria-live="polite">
            {deadCodeFeedback}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
          Rule stack · {rules.length} rules · first match wins
        </p>
        <NeonButton size="sm" variant="ghost" onClick={addRule} disabled={rules.length >= 6} tooltip="Maximum six rules">
          <Plus size={12} aria-hidden="true" />
          Add rule
        </NeonButton>
      </div>

      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div key={rule.id} className="rounded border border-border bg-panel2/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
                {index === 0 ? 'if' : 'elif'} rule {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveRule(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move rule ${index + 1} up`}
                  className="rounded border border-border p-1 text-muted hover:border-cyan/60 hover:text-cyan disabled:opacity-30"
                >
                  <ArrowUp size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveRule(index, 1)}
                  disabled={index === rules.length - 1}
                  aria-label={`Move rule ${index + 1} down`}
                  className="rounded border border-border p-1 text-muted hover:border-cyan/60 hover:text-cyan disabled:opacity-30"
                >
                  <ArrowDown size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  aria-label={`Remove rule ${index + 1}`}
                  className="rounded border border-border p-1 text-muted hover:border-red/60 hover:text-red"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {rule.conditions.map((condition, conditionIndex) => (
                <div key={`${rule.id}-${conditionIndex}`} className="flex flex-wrap items-center gap-1.5">
                  {conditionIndex > 0 && (
                    <select
                      aria-label={`Join for rule ${index + 1}`}
                      value={rule.join}
                      onChange={(event) => patchRule(rule.id, { join: event.target.value as Rule['join'] })}
                      className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-cyan"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <select
                    aria-label={`Field for rule ${index + 1} condition ${conditionIndex + 1}`}
                    value={condition.field}
                    onChange={(event) => changeField(rule.id, conditionIndex, event.target.value as PacketField)}
                    className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                  >
                    {FIELD_OPTIONS.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Operator for rule ${index + 1} condition ${conditionIndex + 1}`}
                    value={condition.op}
                    onChange={(event) => patchCondition(rule.id, conditionIndex, { op: event.target.value as Comparison })}
                    className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                  >
                    {OP_OPTIONS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  {condition.field === 'checksum_ok' ? (
                    <select
                      aria-label={`Value for rule ${index + 1} condition ${conditionIndex + 1}`}
                      value={String(condition.value)}
                      onChange={(event) =>
                        patchCondition(rule.id, conditionIndex, { value: event.target.value === 'true' })
                      }
                      className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : condition.field === 'priority' ? (
                    <select
                      aria-label={`Value for rule ${index + 1} condition ${conditionIndex + 1}`}
                      value={String(condition.value)}
                      onChange={(event) => patchCondition(rule.id, conditionIndex, { value: event.target.value })}
                      className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                    >
                      <option value="low">low</option>
                      <option value="normal">normal</option>
                      <option value="high">high</option>
                    </select>
                  ) : condition.field === 'size_kb' ? (
                    <input
                      aria-label={`Value for rule ${index + 1} condition ${conditionIndex + 1}`}
                      type="number"
                      value={Number(condition.value)}
                      onChange={(event) =>
                        patchCondition(rule.id, conditionIndex, { value: Number(event.target.value) })
                      }
                      className="h-8 w-24 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                    />
                  ) : (
                    <input
                      aria-label={`Value for rule ${index + 1} condition ${conditionIndex + 1}`}
                      value={String(condition.value)}
                      onChange={(event) => patchCondition(rule.id, conditionIndex, { value: event.target.value })}
                      className="h-8 w-28 rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
                    />
                  )}
                  {conditionIndex === 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(rule.id, 1)}
                      aria-label={`Remove second condition from rule ${index + 1}`}
                      className="rounded border border-border p-1 text-muted hover:border-red/60 hover:text-red"
                    >
                      <Trash2 size={11} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {rule.conditions.length < 2 && (
                <button
                  type="button"
                  onClick={() => addCondition(rule.id)}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted hover:text-cyan"
                >
                  + add second condition
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">then</span>
              <select
                aria-label={`Action for rule ${index + 1}`}
                value={rule.action}
                onChange={(event) => patchRule(rule.id, { action: event.target.value as RuleAction })}
                className="h-8 rounded border border-border bg-panel px-2 font-mono text-[11px] text-cyan"
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Generated Python</p>
        <pre className="overflow-auto rounded border border-border bg-bg/80 p-3 font-mono text-[11px] leading-relaxed text-cyan/90">
          {toRuleStackCode(rules, L02_DEFAULT_ACTION)}
        </pre>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <NeonButton onClick={run} data-testid="btn-run-rules">
          <Play size={13} aria-hidden="true" />
          Run 12 packets
        </NeonButton>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {failedRuns} failed run(s) · {rules.length <= 4 ? '4-rule economy intact' : 'over 4 rules'}
        </span>
      </div>

      {outcomes && (
        <div className="overflow-auto rounded border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-panel2/70 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                <th className="px-2 py-1.5">Packet</th>
                <th className="px-2 py-1.5">Size</th>
                <th className="px-2 py-1.5">Source</th>
                <th className="px-2 py-1.5">Checksum</th>
                <th className="px-2 py-1.5">Priority</th>
                <th className="px-2 py-1.5">Target</th>
                <th className="px-2 py-1.5">Actual</th>
                <th className="px-2 py-1.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome, index) => {
                const packet = L02_RULE_PACKETS.find((item) => item.id === outcome.packetId)
                if (!packet) return null
                const target = L02_RULE_TARGETS[outcome.packetId]
                const match = target === outcome.action
                return (
                  <tr
                    key={outcome.packetId}
                    className="motion-safe:animate-fade-in border-b border-border/50 font-mono text-[11px]"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <td className="px-2 py-1 text-text">{packet.id}</td>
                    <td className="px-2 py-1 text-muted">{packet.size_kb}</td>
                    <td className="px-2 py-1 text-muted">{packet.source}</td>
                    <td className="px-2 py-1 text-muted">{packet.checksum_ok ? 'ok' : 'bad'}</td>
                    <td className="px-2 py-1 text-muted">{packet.priority}</td>
                    <td className="px-2 py-1 text-cyan">{target}</td>
                    <td className={cn('px-2 py-1', match ? 'text-green' : 'text-red')}>{outcome.action}</td>
                    <td className="px-2 py-1">
                      {match ? (
                        <CheckCircle2 size={13} className="text-green" aria-label="match" />
                      ) : (
                        <XCircle size={13} className="text-red" aria-label="mismatch" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

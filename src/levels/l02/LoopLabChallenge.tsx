// Stage 2 challenge: configure a for-loop, step its trace and hit three accumulator goals.
import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Play, SkipForward, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { toLoopCode, traceLoop } from './engine'
import type { AccumulatorOp, LoopConfig, LoopFilter } from './engine'
import { L02_DEFAULT_LOOP, L02_LOOP_GOALS, L02_LOOP_PACKETS } from './content'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const sameValue = (a: number | number[], b: number | number[]) => JSON.stringify(a) === JSON.stringify(b)

const formatValue = (value: number | number[]) =>
  Array.isArray(value) ? `[${value.join(', ')}]` : String(value)

const FILTERS: Array<{ id: LoopFilter; label: string }> = [
  { id: 'none', label: 'No filter (every packet)' },
  { id: 'valid', label: 'if packet.checksum_ok' },
  { id: 'nonempty', label: 'if packet.size_kb > 0' },
  { id: 'valid_nonempty', label: 'if checksum_ok and size > 0' },
]

const ACCUMULATORS: Array<{ id: AccumulatorOp; label: string }> = [
  { id: 'sum', label: 'total += size' },
  { id: 'count', label: 'total += 1' },
  { id: 'max', label: 'largest = max(largest, size)' },
  { id: 'append', label: 'sizes.append(size)' },
]

export function LoopLabChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [goalIndex, setGoalIndex] = useState(0)
  const [config, setConfig] = useState<LoopConfig>(L02_DEFAULT_LOOP)
  const [doneGoals, setDoneGoals] = useState<string[]>([])
  const [wrongChecks, setWrongChecks] = useState(0)
  const [visibleSteps, setVisibleSteps] = useState(5)
  const [feedback, setFeedback] = useState<{ pass: boolean; actual: number | number[] } | null>(null)

  const goal = L02_LOOP_GOALS[goalIndex]
  const trace = useMemo(() => traceLoop(L02_LOOP_PACKETS, config), [config])

  const updateConfig = (patch: Partial<LoopConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setVisibleSteps(5)
    setFeedback(null)
  }

  const selectGoal = (index: number) => {
    setGoalIndex(index)
    setFeedback(null)
    setVisibleSteps(5)
  }

  const checkGoal = () => {
    if (!goal) return
    const pass = sameValue(trace.result, goal.target)
    setFeedback({ pass, actual: trace.result })
    if (pass) {
      if (doneGoals.includes(goal.id)) return
      const nextDone = [...doneGoals, goal.id]
      setDoneGoals(nextDone)
      decisions.current.push({
        label: `Loop goal met: ${goal.label}`,
        good: true,
        explanation: `The trace produced ${formatValue(trace.result)}, exactly the target. ${goal.hint}`,
      })
      ui.log({ title: `Loop goal met: ${goal.label}`, detail: `Result ${formatValue(trace.result)}.`, tone: 'good' })
      if (nextDone.length === L02_LOOP_GOALS.length) {
        ui.completeObjective('l2-obj-loops')
        const mistakes = wrongChecks
        onComplete({
          id,
          accuracy: 1,
          decisionQuality: clamp01(1 / (1 + mistakes)),
          efficiency: clamp01(Math.max(0.3, L02_LOOP_GOALS.length / (L02_LOOP_GOALS.length + mistakes))),
          hintsUsed: 0,
          mistakes,
          decisions: decisions.current,
          extra: { goalsMet: nextDone.length, wrongChecks: mistakes },
        })
      }
      return
    }
    const mistakes = wrongChecks + 1
    setWrongChecks(mistakes)
    decisions.current.push({
      label: `Loop goal missed: ${goal.label}`,
      good: false,
      explanation: `The trace produced ${formatValue(trace.result)} but the target is ${formatValue(goal.target)}. ${goal.hint}`,
    })
    ui.log({
      title: `Loop result ${formatValue(trace.result)} is not the target`,
      detail: `Target is ${formatValue(goal.target)}. ${goal.hint}`,
      tone: 'bad',
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {L02_LOOP_GOALS.map((item, index) => {
          const done = doneGoals.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectGoal(index)}
              className={cn(
                'rounded border p-3 text-left transition-colors',
                index === goalIndex
                  ? 'border-cyan/60 bg-cyan/[0.06]'
                  : 'border-border bg-panel2/50 hover:border-cyan/40',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Goal {index + 1}</span>
                {done ? (
                  <CheckCircle2 size={13} className="text-green" aria-label="complete" />
                ) : (
                  <Badge tone="muted">Open</Badge>
                )}
              </span>
              <span className="mt-1 block text-xs text-text">{item.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-cyan">target {formatValue(item.target)}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Loop configuration</p>
          <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            iterable
            <select
              className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
              value="packets"
              disabled
              aria-label="Iterable (fixed)"
            >
              <option value="packets">packets (20)</option>
            </select>
          </label>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            if filter
            <select
              value={config.filter}
              onChange={(event) => updateConfig({ filter: event.target.value as LoopFilter })}
              className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
            >
              {FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            accumulator
            <select
              value={config.accumulator}
              onChange={(event) => updateConfig({ accumulator: event.target.value as AccumulatorOp })}
              className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
            >
              {ACCUMULATORS.map((accumulator) => (
                <option key={accumulator.id} value={accumulator.id}>
                  {accumulator.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={config.breakOnCorrupt}
                onChange={(event) => updateConfig({ breakOnCorrupt: event.target.checked })}
                className="h-4 w-4 accent-cyan"
              />
              break on the first corrupted packet
            </label>
            <label className="flex items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={config.continueOnEmpty}
                onChange={(event) => updateConfig({ continueOnEmpty: event.target.checked })}
                className="h-4 w-4 accent-cyan"
              />
              continue past empty packets
            </label>
          </div>
        </div>

        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Generated Python</p>
          <pre className="overflow-auto rounded border border-border bg-bg/80 p-3 font-mono text-[11px] leading-relaxed text-cyan/90">
            {toLoopCode(config)}
          </pre>
        </div>
      </div>

      <div className="rounded border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel2/60 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            Trace · {Math.min(visibleSteps, trace.steps.length)}/{trace.steps.length} iterations
          </p>
          <div className="flex items-center gap-1.5">
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => setVisibleSteps((current) => Math.min(trace.steps.length, current + 1))}
              disabled={visibleSteps >= trace.steps.length}
            >
              <SkipForward size={12} aria-hidden="true" />
              Step
            </NeonButton>
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={() => setVisibleSteps(trace.steps.length)}
              disabled={visibleSteps >= trace.steps.length}
            >
              <ChevronDown size={12} aria-hidden="true" />
              Show all
            </NeonButton>
          </div>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/70 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">value</th>
                <th className="px-2 py-1.5">condition</th>
                <th className="px-2 py-1.5">action</th>
                <th className="px-2 py-1.5">accumulator</th>
              </tr>
            </thead>
            <tbody>
              {trace.steps.slice(0, visibleSteps).map((step) => (
                <tr key={`${step.packetId}-${step.iteration}`} className="border-b border-border/40 font-mono text-[11px]">
                  <td className="px-2 py-1 text-muted">{step.iteration}</td>
                  <td className="px-2 py-1 text-text">{step.size}</td>
                  <td className="px-2 py-1 text-muted">{step.condition}</td>
                  <td
                    className={cn(
                      'px-2 py-1',
                      step.action === 'add'
                        ? 'text-green'
                        : step.action === 'break'
                          ? 'text-red'
                          : 'text-amber',
                    )}
                  >
                    {step.action}
                  </td>
                  <td className="px-2 py-1 text-cyan">{formatValue(step.accumulator)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="font-mono text-[11px] text-text">
            current result: <span className="text-cyan">{formatValue(trace.result)}</span>
            {trace.stoppedEarly && <span className="ml-2 text-red">stopped early by break</span>}
          </p>
          <NeonButton size="sm" onClick={checkGoal} data-testid="btn-check-loop">
            <Play size={12} aria-hidden="true" />
            Check goal {goalIndex + 1}
          </NeonButton>
        </div>
      </div>

      {feedback && (
        <div
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded border p-3 text-xs',
            feedback.pass ? 'border-green/40 bg-green/[0.05] text-green' : 'border-red/40 bg-red/[0.05] text-red',
          )}
        >
          {feedback.pass ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            {feedback.pass
              ? `Goal met. The accumulator finished at ${formatValue(feedback.actual)}.`
              : `The accumulator finished at ${formatValue(feedback.actual)}; the target is ${formatValue(goal?.target ?? 0)}.`}{' '}
            {goal?.hint}
          </span>
        </div>
      )}
    </div>
  )
}

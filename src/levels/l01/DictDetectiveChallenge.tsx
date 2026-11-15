// Side op 2 challenge: build dictionary access chains against a JSON tree.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, RotateCcw, X } from 'lucide-react'
import { cn } from '../../ui/cn'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import {
  accessOpToPython,
  accessMatches,
  displayAccessValue,
  runAccess,
} from './dictAccess'
import { L01_ACCESS_CHIPS, L01_DICT_TASKS, L01_STUDENT_RECORDS } from './dictData'
import type { AccessChip } from './dictData'

const PAR_OPS = 10
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

function JsonNode({ label, value }: { label?: string; value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="font-mono text-[11px]">
        <span className="text-muted">{label !== undefined ? `${label}: ` : ''}</span>
        <span className="text-text">[</span>
        <div className="ml-4 border-l border-border/70 pl-2">
          {value.map((item, index) => (
            <JsonNode key={index} label={String(index)} value={item} />
          ))}
        </div>
        <span className="text-text">]</span>
      </div>
    )
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="font-mono text-[11px]">
        <span className="text-muted">{label !== undefined ? `${label}: ` : ''}</span>
        <span className="text-text">{'{'}</span>
        <div className="ml-4 border-l border-border/70 pl-2">
          {Object.entries(value).map(([key, item]) => (
            <JsonNode key={key} label={key} value={item} />
          ))}
        </div>
        <span className="text-text">{'}'}</span>
      </div>
    )
  }
  return (
    <div className="font-mono text-[11px]">
      <span className="text-cyan">{label !== undefined ? `${label}: ` : ''}</span>
      <span className={typeof value === 'string' ? 'text-green' : 'text-amber'}>
        {typeof value === 'string' ? `'${value}'` : String(value)}
      </span>
    </div>
  )
}

export function DictDetectiveChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const [activeTaskId, setActiveTaskId] = useState(L01_DICT_TASKS[0].id)
  const [ops, setOps] = useState<AccessChip[]>([])
  const [solved, setSolved] = useState<Record<string, boolean>>({})
  const [mistakes, setMistakes] = useState(0)
  const [addedOps, setAddedOps] = useState(0)
  const decisions = useRef<Decision[]>([])
  const completed = useRef(false)

  const task = L01_DICT_TASKS.find((item) => item.id === activeTaskId) ?? L01_DICT_TASKS[0]
  const result = runAccess(L01_STUDENT_RECORDS, ops.map((chip) => chip.op))
  const solvedCount = Object.values(solved).filter(Boolean).length

  useEffect(() => {
    if (result.error) return
    if (solved[task.id]) return
    if (!accessMatches(result.value, task.target)) return

    setSolved((current) => ({ ...current, [task.id]: true }))
    decisions.current.push({
      label: `Retrieved ${task.target}`,
      good: true,
      explanation: task.explanation,
    })
    ui.log({ title: `Task solved: ${task.target}`, detail: task.explanation, tone: 'good' })
    setOps([])
    const nextTask = L01_DICT_TASKS.find((item) => item.id !== task.id && !solved[item.id])
    if (nextTask) setActiveTaskId(nextTask.id)
  }, [result.error, result.expression, solved, task, ui])

  useEffect(() => {
    if (completed.current || solvedCount < L01_DICT_TASKS.length) return
    completed.current = true
    ui.completeObjective('l1-side-2-obj')
    ui.log({ title: 'Dict Detective closed', detail: 'Four access chains resolved.', tone: 'good' })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 - mistakes / 6),
      efficiency: Math.min(1, Math.max(0.3, PAR_OPS / Math.max(PAR_OPS, addedOps))),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: { tasksSolved: L01_DICT_TASKS.length },
    })
  }, [addedOps, id, mistakes, onComplete, solvedCount, ui])

  const selectTask = (taskId: string) => {
    setActiveTaskId(taskId)
    setOps([])
  }

  const addChip = (chip: AccessChip) => {
    const nextOps = [...ops, chip]
    const nextResult = runAccess(L01_STUDENT_RECORDS, nextOps.map((item) => item.op))
    if (nextResult.error && !result.error) {
      setMistakes((current) => current + 1)
      decisions.current.push({
        label: `Applied ${chip.label}`,
        good: false,
        explanation: nextResult.error,
      })
      ui.log({ title: 'Access rejected', detail: nextResult.error, tone: 'bad' })
    }
    setOps(nextOps)
    setAddedOps((current) => current + 1)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded border border-border bg-panel/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Student records · JSON tree</p>
          <div className="mt-2 max-h-64 overflow-auto rounded border border-border bg-bg/60 p-2">
            <JsonNode value={L01_STUDENT_RECORDS} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Retrieval tasks</p>
          {L01_DICT_TASKS.map((item) => {
            const done = Boolean(solved[item.id])
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTask(item.id)}
                className={cn(
                  'w-full rounded border p-2 text-left transition-colors',
                  item.id === activeTaskId
                    ? 'border-cyan bg-cyan/[0.06]'
                    : 'border-border bg-panel2/50 hover:border-cyan/40',
                  done && 'border-green/50',
                )}
              >
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
                  {done ? (
                    <CheckCircle2 size={12} className="text-green" aria-hidden="true" />
                  ) : (
                    <Circle size={12} className="text-muted" aria-hidden="true" />
                  )}
                  <span className={done ? 'text-green' : 'text-text'}>{item.prompt}</span>
                </span>
                <span className="mt-1 block font-mono text-[10px] text-muted">target: {item.target}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded border border-border bg-panel2/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Access chain</p>
          <button
            type="button"
            onClick={() => setOps([])}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-cyan/50 hover:text-cyan"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset chain
          </button>
        </div>
        <div className="mt-2 flex min-h-[44px] flex-wrap items-center gap-1.5 rounded border border-border bg-bg/60 p-2">
          <span className="rounded border border-cyan/40 bg-cyan/10 px-2 py-1 font-mono text-[11px] text-cyan">
            d
          </span>
          {ops.map((chip, index) => (
            <span key={`${chip.id}-${index}`} className="flex items-center gap-1">
              <ArrowRight size={11} className="text-muted" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 rounded border border-border bg-panel2 px-2 py-1 font-mono text-[11px] text-text">
                {accessOpToPython(chip.op)}
                <button
                  type="button"
                  aria-label={`Remove ${chip.label}`}
                  onClick={() => setOps(ops.slice(0, index))}
                  className="rounded p-0.5 text-muted hover:text-red"
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            </span>
          ))}
          {ops.length === 0 && <span className="text-[11px] text-muted">Add access chips below.</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {L01_ACCESS_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => addChip(chip)}
              className="rounded border border-border bg-panel2 px-2 py-1 font-mono text-[11px] text-text transition-colors hover:border-cyan/60 hover:text-cyan"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Expression</p>
          <code className="mt-1 block break-all font-mono text-xs text-text">{result.expression}</code>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Result</p>
          <pre
            className={cn(
              'mt-1 min-h-[40px] whitespace-pre-wrap break-words rounded border bg-bg/70 p-2 font-mono text-xs',
              result.error ? 'border-red/50 text-red' : 'border-border text-cyan',
            )}
          >
            {result.error ?? displayAccessValue(result.value)}
          </pre>
        </div>
        <div className="rounded border border-border bg-panel/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Access preview</p>
          <ol className="mt-1 space-y-1">
            {result.steps.length === 0 && <li className="text-[11px] text-muted">No access yet.</li>}
            {result.steps.map((step, index) => (
              <li key={index} className="flex gap-2 font-mono text-[10px]">
                <span className="text-muted">{index + 1}.</span>
                <span className="text-text">{accessOpToPython(step.op)}</span>
                <span className={step.error ? 'text-red' : 'text-muted'}>{step.error ?? step.display}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p aria-live="polite" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {solvedCount}/{L01_DICT_TASKS.length} tasks solved
      </p>
    </div>
  )
}

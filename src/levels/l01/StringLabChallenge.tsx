// Stage 2 challenge: build a Python-like string pipeline from chips.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, RotateCcw, X, XCircle } from 'lucide-react'
import { cn } from '../../ui/cn'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { goalsForLine, L01_TRANSMISSIONS } from './content'
import { opToPython, pythonRepr, runPipeline, valueMatches } from './stringOps'
import type { StringOp } from './stringOps'

const PAR_OPS = 17

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const SIMPLE_CHIPS: Array<{ id: string; label: string; op: StringOp }> = [
  { id: 'strip', label: 'strip()', op: { kind: 'strip' } },
  { id: 'lower', label: 'lower()', op: { kind: 'lower' } },
  { id: 'upper', label: 'upper()', op: { kind: 'upper' } },
  { id: 'split-pipe', label: "split('|')", op: { kind: 'split', sep: '|' } },
  { id: 'split-colon', label: "split(':')", op: { kind: 'split', sep: ':' } },
  { id: 'split-equals', label: "split('=')", op: { kind: 'split', sep: '=' } },
  { id: 'split-space', label: "split(' ')", op: { kind: 'split', sep: ' ' } },
  { id: 'index-0', label: '[0]', op: { kind: 'index', index: 0 } },
  { id: 'index-1', label: '[1]', op: { kind: 'index', index: 1 } },
  { id: 'index-2', label: '[2]', op: { kind: 'index', index: 2 } },
]

function opLabel(op: StringOp): string {
  return opToPython(op)
}

export function StringLabChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const [lineId, setLineId] = useState(L01_TRANSMISSIONS[0].id)
  const [ops, setOps] = useState<StringOp[]>([])
  const [solved, setSolved] = useState<Record<string, string[]>>({})
  const [mistakes, setMistakes] = useState(0)
  const [addedOps, setAddedOps] = useState(0)
  const [easterEgg, setEasterEgg] = useState(false)
  const [sep, setSep] = useState('|')
  const [sliceStart, setSliceStart] = useState('0')
  const [sliceEnd, setSliceEnd] = useState('3')
  const [replaceFrom, setReplaceFrom] = useState(' ')
  const [replaceTo, setReplaceTo] = useState('')
  const [prefix, setPrefix] = useState('usr')
  const decisions = useRef<Decision[]>([])
  const completed = useRef(false)

  const line = L01_TRANSMISSIONS.find((item) => item.id === lineId) ?? L01_TRANSMISSIONS[0]
  const goals = goalsForLine(line)
  const solvedForLine = solved[line.id] ?? []
  const result = runPipeline(line.raw, ops)

  useEffect(() => {
    if (result.error) return
    const newly = goalsForLine(line).filter(
      (goal) => !(solved[line.id] ?? []).includes(goal.id) && valueMatches(result.value, goal.target),
    )
    if (newly.length === 0) return

    setSolved((current) => {
      const existing = current[line.id] ?? []
      const merged = Array.from(new Set([...existing, ...newly.map((goal) => goal.id)]))
      return { ...current, [line.id]: merged }
    })
    for (const goal of newly) {
      ui.log({
        title: `Goal decoded: ${goal.label}`,
        detail: `Output matched ${goal.target}.`,
        tone: 'good',
      })
    }
  }, [line, result.error, result.expression, solved, ui])

  useEffect(() => {
    if (completed.current) return
    if ((solved[line.id] ?? []).length < 3) return
    completed.current = true
    ui.completeObjective('l1-obj-decode')
    const decisionQuality = clamp01(1 - mistakes / 6)
    const efficiency = Math.min(1, Math.max(0.3, PAR_OPS / Math.max(PAR_OPS, addedOps)))
    decisions.current.push({
      label: `Decoded ${line.username} with ${ops.length} pipeline operations`,
      good: true,
      explanation:
        'Each goal matched the live pipeline output exactly. strip() protected the fields, and lower() normalised the status.',
    })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality,
      efficiency,
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: {
        easterEgg,
        solvedLine: line.id,
        goalsSolved: 3,
      },
    })
  }, [addedOps, easterEgg, id, line, mistakes, onComplete, ops.length, solved, ui])

  const selectLine = (nextId: string) => {
    const next = L01_TRANSMISSIONS.find((item) => item.id === nextId)
    if (!next) return
    setLineId(nextId)
    setOps([])
    if (next.easterEgg && !easterEgg) {
      setEasterEgg(true)
      ui.log({
        title: 'NEXUS_ZERO signature detected',
        detail: 'A transmission line signs itself with a name NEXUS never admitted. Hidden objective flagged.',
        tone: 'good',
      })
    }
  }

  const addOp = (op: StringOp) => {
    const nextOps = [...ops, op]
    const nextResult = runPipeline(line.raw, nextOps)
    if (nextResult.error && !result.error) {
      setMistakes((current) => current + 1)
      decisions.current.push({
        label: `Applied ${opLabel(op)} to ${pythonRepr(result.value)}`,
        good: false,
        explanation: nextResult.error,
      })
      ui.log({ title: 'Operation rejected', detail: nextResult.error, tone: 'bad' })
    }
    setOps(nextOps)
    setAddedOps((current) => current + 1)
  }

  const parseSlice = (): number | null => {
    if (sliceStart.trim() === '') return null
    const value = Number(sliceStart)
    return Number.isInteger(value) ? value : null
  }
  const parseEnd = (): number | null => {
    if (sliceEnd.trim() === '') return null
    const value = Number(sliceEnd)
    return Number.isInteger(value) ? value : null
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Select a transmission line</p>
        <div className="mt-2 grid gap-1.5">
          {L01_TRANSMISSIONS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === line.id}
              onClick={() => selectLine(item.id)}
              className={cn(
                'flex items-center gap-3 rounded border px-3 py-2 text-left transition-colors',
                item.id === line.id
                  ? 'border-cyan bg-cyan/[0.06]'
                  : 'border-border bg-panel2/50 hover:border-cyan/40',
              )}
            >
              <span className="font-mono text-[10px] text-muted">LINE {String(index + 1).padStart(2, '0')}</span>
              <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-text">
                {item.raw.replace(/ /g, '·')}
              </code>
              {(solved[item.id]?.length ?? 0) > 0 && (
                <span className="font-mono text-[10px] text-green">{solved[item.id]?.length}/3</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border border-border bg-panel2/60 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Equivalent Python expression</p>
        <code className="mt-1 block break-all font-mono text-xs text-text">{result.expression}</code>
        <p className="mt-2 text-[11px] text-muted">
          This is a small interpreter for the operations below, not eval(). The live preview shows each step.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {goals.map((goal) => {
          const done = solvedForLine.includes(goal.id)
          return (
            <div
              key={goal.id}
              className={cn(
                'rounded border p-3 transition-colors',
                done ? 'border-green/50 bg-green/[0.07]' : 'border-border bg-panel/70',
              )}
            >
              <p className="flex items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.12em]">
                {done ? (
                  <CheckCircle2 size={13} className="text-green" aria-hidden="true" />
                ) : (
                  <Circle size={13} className="text-muted" aria-hidden="true" />
                )}
                <span className={done ? 'text-green' : 'text-text'}>{goal.label}</span>
              </p>
              <p className="mt-1.5 font-mono text-[10px] text-muted">target: {goal.target}</p>
              <p className={cn('mt-1 font-mono text-[10px]', done ? 'text-green' : 'text-amber')}>
                {done ? 'DECODED' : 'PENDING'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="rounded border border-border bg-panel/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Pipeline</p>
          <button
            type="button"
            onClick={() => setOps([])}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-cyan/50 hover:text-cyan"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset pipeline
          </button>
        </div>
        <div className="mt-2 flex min-h-[48px] flex-wrap items-center gap-1.5 rounded border border-border bg-bg/60 p-2">
          <span className="rounded border border-cyan/40 bg-cyan/10 px-2 py-1 font-mono text-[11px] text-cyan">
            raw_line
          </span>
          {ops.map((op, index) => (
            <span key={`${op.kind}-${index}`} className="flex items-center gap-1">
              <ArrowRight size={11} className="text-muted" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 rounded border border-border bg-panel2 px-2 py-1 font-mono text-[11px] text-text">
                {opLabel(op)}
                <button
                  type="button"
                  aria-label={`Remove ${opLabel(op)}`}
                  onClick={() => setOps(ops.slice(0, index))}
                  className="rounded p-0.5 text-muted hover:text-red"
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            </span>
          ))}
          {ops.length === 0 && <span className="text-[11px] text-muted">Add chips below.</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SIMPLE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => addOp(chip.op)}
              className="rounded border border-border bg-panel2 px-2 py-1 font-mono text-[11px] text-text transition-colors hover:border-cyan/60 hover:text-cyan"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 border-t border-border/70 pt-3 sm:grid-cols-2">
          <div className="flex items-end gap-1">
            <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              split(sep)
              <input
                value={sep}
                onChange={(event) => setSep(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <button
              type="button"
              onClick={() => addOp({ kind: 'split', sep })}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] text-cyan hover:border-cyan"
            >
              add
            </button>
          </div>
          <div className="flex items-end gap-1">
            <label className="text-[10px] uppercase tracking-[0.12em] text-muted">
              start
              <input
                value={sliceStart}
                onChange={(event) => setSliceStart(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-16 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <label className="text-[10px] uppercase tracking-[0.12em] text-muted">
              end
              <input
                value={sliceEnd}
                onChange={(event) => setSliceEnd(event.target.value)}
                inputMode="numeric"
                className="mt-1 w-16 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <button
              type="button"
              onClick={() => addOp({ kind: 'slice', start: parseSlice(), end: parseEnd() })}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] text-cyan hover:border-cyan"
            >
              [a:b]
            </button>
          </div>
          <div className="flex items-end gap-1">
            <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              replace from
              <input
                value={replaceFrom}
                onChange={(event) => setReplaceFrom(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              to
              <input
                value={replaceTo}
                onChange={(event) => setReplaceTo(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <button
              type="button"
              onClick={() => addOp({ kind: 'replace', from: replaceFrom, to: replaceTo })}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] text-cyan hover:border-cyan"
            >
              add
            </button>
          </div>
          <div className="flex items-end gap-1">
            <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-muted">
              startswith(prefix)
              <input
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
              />
            </label>
            <button
              type="button"
              onClick={() => addOp({ kind: 'startswith', prefix })}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] text-cyan hover:border-cyan"
            >
              add
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Live result</p>
          <pre
            className={cn(
              'mt-1 min-h-[44px] whitespace-pre-wrap break-words rounded border bg-bg/70 p-2 font-mono text-xs',
              result.error ? 'border-red/50 text-red' : 'border-border text-cyan',
            )}
          >
            {result.error ? result.error : pythonRepr(result.value)}
          </pre>
        </div>
        <div className="rounded border border-border bg-panel/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Step preview</p>
          <ol className="mt-1 space-y-1">
            {result.steps.length === 0 && <li className="text-[11px] text-muted">No operations yet.</li>}
            {result.steps.map((step, index) => (
              <li key={index} className="flex gap-2 font-mono text-[10px]">
                <span className="text-muted">{index + 1}.</span>
                <span className="text-text">{opLabel(step.op)}</span>
                <span className={step.error ? 'text-red' : 'text-muted'}>
                  {step.error ?? pythonRepr(step.value)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div aria-live="polite" className="min-h-[20px]">
        {result.error && (
          <p className="flex items-center gap-1.5 text-xs text-red">
            <XCircle size={13} aria-hidden="true" />
            Fix the failing operation, then continue.
          </p>
        )}
      </div>
    </div>
  )
}

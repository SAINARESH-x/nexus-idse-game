// Side op: repair a buggy range() loop by editing start, stop and step until the trace matches.
import { useRef, useState } from 'react'
import { CheckCircle2, Play, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { rangeValues, toRangeCode } from './engine'
import { L02_OFF_BY_ONE } from './content'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const same = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index])

export function OffByOneChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [start, setStart] = useState(L02_OFF_BY_ONE.initial.start)
  const [stop, setStop] = useState(L02_OFF_BY_ONE.initial.stop)
  const [step, setStep] = useState(L02_OFF_BY_ONE.initial.step)
  const [wrongRuns, setWrongRuns] = useState(0)
  const [solved, setSolved] = useState(false)
  const trace = rangeValues(start, stop, step)
  const matches = !trace.error && same(trace.values, L02_OFF_BY_ONE.targetValues)

  const run = () => {
    if (trace.error) {
      setWrongRuns((current) => current + 1)
      decisions.current.push({ label: 'range() rejected', good: false, explanation: trace.error })
      ui.log({ title: 'range() rejected', detail: trace.error, tone: 'bad' })
      return
    }
    if (matches) {
      if (solved) return
      setSolved(true)
      decisions.current.push({
        label: `range(${start}, ${stop}, ${step}) matched the patrol target`,
        good: true,
        explanation:
          'stop is exclusive, so 15 lets 14 into the output; start 2 and step 3 produce 2, 5, 8, 11, 14.',
      })
      ui.log({ title: 'Patrol range repaired', detail: 'The trace matches the target sites.', tone: 'good' })
      return
    }
    setWrongRuns((current) => current + 1)
    decisions.current.push({
      label: `range(${start}, ${stop}, ${step}) printed the wrong sites`,
      good: false,
      explanation: `It produced [${trace.values.join(', ')}], but the target is [${L02_OFF_BY_ONE.targetValues.join(', ')}].`,
    })
    ui.log({
      title: 'Patrol route still wrong',
      detail: `Produced [${trace.values.join(', ')}]. Target [${L02_OFF_BY_ONE.targetValues.join(', ')}].`,
      tone: 'bad',
    })
  }

  const finish = () => {
    if (!solved) return
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + wrongRuns)),
      efficiency: clamp01(Math.max(0.3, 1 / (1 + wrongRuns))),
      hintsUsed: 0,
      mistakes: wrongRuns,
      decisions: decisions.current,
      extra: { wrongRuns, range: `${start},${stop},${step}` },
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-border bg-panel2/50 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Target trace</p>
        <p className="mt-1 font-mono text-sm text-green">[{L02_OFF_BY_ONE.targetValues.join(', ')}]</p>
        <p className="mt-1 text-[11px] text-muted">
          A patrol must visit these five sites. The broken loop starts at 1 and still misses the route.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          start
          <select
            value={start}
            onChange={(event) => {
              setStart(Number(event.target.value))
              setSolved(false)
            }}
            className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
          >
            {L02_OFF_BY_ONE.starts.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          stop (exclusive)
          <select
            value={stop}
            onChange={(event) => {
              setStop(Number(event.target.value))
              setSolved(false)
            }}
            className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
          >
            {L02_OFF_BY_ONE.stops.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          step
          <select
            value={step}
            onChange={(event) => {
              setStep(Number(event.target.value))
              setSolved(false)
            }}
            className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
          >
            {L02_OFF_BY_ONE.steps.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <pre className="rounded border border-border bg-bg/80 p-3 font-mono text-[11px] text-cyan/90">
        {toRangeCode(start, stop, step)}
      </pre>

      <div className="rounded border border-border">
        <div className="border-b border-border bg-panel2/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          trace · {trace.values.length} iteration(s)
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/60 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              <th className="px-2 py-1.5">iteration</th>
              <th className="px-2 py-1.5">i</th>
            </tr>
          </thead>
          <tbody>
            {trace.values.map((value, index) => (
              <tr key={`${value}-${index}`} className="border-b border-border/40 font-mono text-[11px]">
                <td className="px-2 py-1 text-muted">{index + 1}</td>
                <td className="px-2 py-1 text-text">{value}</td>
              </tr>
            ))}
            {trace.values.length === 0 && (
              <tr>
                <td className="px-2 py-2 text-[11px] text-muted" colSpan={2}>
                  range() produces no values with these arguments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NeonButton onClick={run} data-testid="btn-run-range">
          <Play size={13} aria-hidden="true" />
          Run trace
        </NeonButton>
        <NeonButton variant="ghost" onClick={finish} disabled={!solved} data-testid="btn-log-range">
          Log repair
        </NeonButton>
        <span
          className={cn(
            'flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]',
            matches ? 'text-green' : 'text-muted',
          )}
        >
          {matches ? <CheckCircle2 size={12} aria-hidden="true" /> : <XCircle size={12} aria-hidden="true" />}
          {matches ? 'output matches target' : `${wrongRuns} failed run(s)`}
        </span>
      </div>
    </div>
  )
}

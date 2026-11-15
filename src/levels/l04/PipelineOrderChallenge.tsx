// PIPELINE ORDER side op: order six cleaning cards (drag or arrow buttons), RUN them on a fresh session, read the step table.
import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Play } from 'lucide-react'
import type { ChallengeProps } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { PIPELINE_CARDS, PIPELINE_PASS, runPipeline } from './pipelineOrder'
import type { CardId, PipelineRun } from './pipelineOrder'

const START: CardId[] = ['dedupe', 'attendance-fill', 'department', 'age', 'attendance-type', 'cgpa']

export function PipelineOrderChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const [order, setOrder] = useState<CardId[]>(START)
  const [drag, setDrag] = useState<number | null>(null)
  const [result, setResult] = useState<PipelineRun | null>(null)
  const [runs, setRuns] = useState(0)
  const [mistakes, setMistakes] = useState(0)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return
    setOrder((o) => {
      const n = [...o]
      const [x] = n.splice(from, 1)
      n.splice(to, 0, x)
      return n
    })
  }
  const run = () => {
    const r = runPipeline(order)
    setResult(r)
    setRuns((n) => n + 1)
    if (r.failed) setMistakes((m) => m + 1)
    ui.log({ title: `Pipeline run: integrity ${r.integrity.toFixed(1)}`, detail: r.explanations[0], tone: r.passed ? 'good' : 'bad' })
  }

  return (
    <div className="space-y-3" data-testid="pipeline-order">
      <p className="text-sm text-muted">Six cleaning steps for the independent-tier vault. Put them in an order where every step runs on data that is ready for it, then RUN. Pass at integrity {PIPELINE_PASS} with every check clean.</p>
      <ol className="space-y-1.5">
        {order.map((cid, i) => {
          const c = PIPELINE_CARDS.find((x) => x.id === cid)
          return (
            <li key={cid} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null) }} className={cn('flex items-center gap-2 rounded border border-border bg-panel2/50 p-2', drag === i && 'opacity-50')} data-testid={`card-${cid}`}>
              <GripVertical size={14} className="text-muted" aria-hidden="true" />
              <span className="font-mono text-[10px] text-cyan">{i + 1}</span>
              <span className="flex-1 text-xs text-text">{c?.title}<code className="block font-mono text-[10px] text-muted">{c?.code}</code></span>
              <button type="button" aria-label={`Move ${c?.title} up`} onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-1 text-muted hover:text-cyan disabled:opacity-30"><ArrowUp size={12} aria-hidden="true" /></button>
              <button type="button" aria-label={`Move ${c?.title} down`} onClick={() => move(i, i + 1)} disabled={i === order.length - 1} className="rounded p-1 text-muted hover:text-cyan disabled:opacity-30"><ArrowDown size={12} aria-hidden="true" /></button>
            </li>
          )
        })}
      </ol>
      <div className="flex gap-3">
        <NeonButton onClick={run} data-testid="btn-pipeline-run"><Play size={13} aria-hidden="true" /> Run pipeline</NeonButton>
        {result?.passed && (
          <NeonButton data-testid="btn-pipeline-complete" onClick={() => onComplete({ id, accuracy: result.integrity / 100, decisionQuality: 1, efficiency: runs <= 1 ? 1 : Math.max(0.4, 1 - 0.15 * (runs - 1)), hintsUsed: 0, mistakes, decisions: [{ label: 'Cleaning pipeline ordered', good: true, explanation: result.explanations[0] }] })}>
            Complete operation
          </NeonButton>
        )}
      </div>
      {result && (
        <div className="space-y-2" aria-live="polite" data-testid="pipeline-result">
          <table className="w-full text-left text-[11px]">
            <thead className="font-mono text-[10px] uppercase text-muted"><tr><th>Step</th><th>Status</th><th>Shape</th><th>Nulls</th><th>Duplicates</th><th>Labels</th></tr></thead>
            <tbody>
              {result.steps.map((s, i) => (
                <tr key={i} className="border-t border-border/60 font-mono">
                  <td className="py-1 text-text">{i + 1}. {s.card}</td>
                  <td className={s.ok ? 'text-green' : 'text-red'}>{s.ok ? 'ok' : `FAILED: ${s.error}`}</td>
                  <td>({s.shape[0]}, {s.shape[1]})</td><td>{s.nulls}</td><td>{s.duplicates}</td><td>{s.labels}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={cn('text-xs', result.passed ? 'text-green' : 'text-amber')}>Integrity {result.integrity.toFixed(1)} · {result.passed ? 'PASSED' : 'not yet'}</p>
          <ul className="space-y-1 text-xs text-text">{result.explanations.map((e) => <li key={e}>• {e}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

// Field Puzzles drawer (Stage 3, optional): case story, computed evidence, previewed candidates, APPLY CHOICE as 'puzzle'.
import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { buildPuzzles, judgePuzzleChoice } from './puzzles'
import { useDfSession, useL04 } from './session'
import { DecisionBadge } from './StrategyLab'
import { compareAny } from './strategyLab'

export function FieldPuzzles() {
  const { run, update, addLog, record } = useL04()
  const df = useDfSession((s) => s.current)
  const puzzles = useMemo(() => buildPuzzles(df), [df])
  const [pid, setPid] = useState(puzzles[0].id)
  const p = puzzles.find((x) => x.id === pid) ?? puzzles[0]
  const [choice, setChoice] = useState<string | null>(null)
  const cand = p.candidates.find((c) => c.id === choice) ?? null
  const preview = useMemo(() => (cand ? compareAny(df, { id: cand.id, label: cand.label, ops: cand.ops }, { tier: record.tier, column: p.id === 'which-cs' ? 'department' : p.id === 'scale-slip' ? 'cgpa' : 'age' }) : null), [cand, df, p.id, record.tier])
  const labelsAfter = useMemo(() => {
    if (p.id !== 'which-cs') return {}
    const out: Record<string, number> = {}
    for (const c of p.candidates) {
      const r = compareAny(df, { id: c.id, label: c.label, ops: c.ops }, {})
      out[c.id] = r.ok ? r.labelsAfter : 0
    }
    return out
  }, [df, p])

  const apply = () => {
    if (!cand) return
    const decision = judgePuzzleChoice(p, cand.id)
    if (cand.ops.length === 0) {
      update((x) => ({ ...x, puzzlePicks: [...x.puzzlePicks, { entryId: 'none', puzzleId: p.id, decision }] }))
      addLog({ title: `Puzzle: ${decision.label}`, detail: decision.explanation, tone: decision.good === false ? 'bad' : 'info' })
      setChoice(null)
      return
    }
    const r = run(cand.ops, 'puzzle')
    if (r.ok && r.entry) {
      const id = r.entry.id
      update((x) => ({ ...x, puzzlePicks: [...x.puzzlePicks, { entryId: id, puzzleId: p.id, decision }] }))
      addLog({ title: `Puzzle: ${decision.label}`, detail: decision.explanation, tone: decision.good === true ? 'good' : decision.good === false ? 'bad' : 'info' })
    }
    setChoice(null)
  }

  return (
    <div className="space-y-3" data-testid="field-puzzles">
      <div className="flex flex-wrap gap-2">
        {puzzles.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === p.id} onClick={() => { setPid(x.id); setChoice(null) }} className={cn('rounded border px-3 py-1 text-xs', x.id === p.id ? 'border-cyan bg-cyan/10 text-cyan' : 'border-border text-muted')}>
            {x.title}{x.resolved ? ' ✓' : ''}
          </button>
        ))}
      </div>
      {p.resolved ? (
        <p className="flex items-center gap-2 text-sm text-green"><CheckCircle2 size={14} aria-hidden="true" /> Already resolved in the field.</p>
      ) : (
        <>
          <p className="text-sm text-text">{p.story}</p>
          <ul className="space-y-1 rounded border border-border bg-bg p-2 text-[11px] text-muted">
            {p.evidence.map((e) => <li key={e}>• {e}</li>)}
          </ul>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Candidate repairs (selecting only previews)</legend>
            {p.candidates.map((c) => (
              <label key={c.id} className={cn('flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-xs', choice === c.id ? 'border-cyan bg-cyan/5' : 'border-border')}>
                <input type="radio" name="puzzle-choice" className="accent-cyan" checked={choice === c.id} onChange={() => setChoice(c.id)} data-testid={`puzzle-choice-${c.id}`} />
                <span className="text-text">{c.label}</span>
                {p.id === 'which-cs' && <span className="ml-auto font-mono text-[10px] text-violet">{labelsAfter[c.id]} distinct labels after</span>}
              </label>
            ))}
          </fieldset>
          {cand && preview && (
            <div className="space-y-1 rounded border border-border bg-panel2/50 p-2 text-xs" data-testid="puzzle-preview">
              <p className="flex items-center gap-2"><DecisionBadge d={judgePuzzleChoice(p, cand.id)} /> <span className="text-text">{judgePuzzleChoice(p, cand.id).label}</span></p>
              <p className="text-muted">{judgePuzzleChoice(p, cand.id).explanation}</p>
              <p className="font-mono text-[10px] text-muted">Consequence: {preview.rowsBefore} → {preview.rowsAfter} rows{preview.code ? ` · ${preview.code}` : ''}</p>
            </div>
          )}
          <NeonButton size="sm" onClick={apply} disabled={!cand} tooltip={cand ? undefined : 'Select a candidate first'} data-testid="btn-puzzle-apply">Apply choice</NeonButton>
        </>
      )}
    </div>
  )
}

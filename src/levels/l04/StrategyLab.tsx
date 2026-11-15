// Strategy Lab (ANALYSIS): compare cleaning strategies on forks of the live frame; APPLY TO MY DATASET runs the chosen one.
import { useMemo, useState } from 'react'
import { CheckCircle2, FlaskConical, MinusCircle, XCircle } from 'lucide-react'
import type { Decision } from '../../engine'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { useDfSession, useL04 } from './session'
import { buildCases, compareAny } from './strategyLab'

const f1 = (x: number | null): string => (x === null ? 'n/a' : (Math.round(x * 10) / 10).toFixed(1))

export function DecisionBadge({ d }: { d: Decision | null }) {
  if (!d) return <Badge tone="muted">no rule</Badge>
  if (d.good === true) return <Badge tone="green"><CheckCircle2 size={10} className="mr-1 inline" aria-hidden="true" />good</Badge>
  if (d.good === false) return <Badge tone="red"><XCircle size={10} className="mr-1 inline" aria-hidden="true" />bad</Badge>
  return <Badge tone="amber"><MinusCircle size={10} className="mr-1 inline" aria-hidden="true" />{d.redundant ? 'no effect' : 'neutral'}</Badge>
}

export function StrategyLab() {
  const { run, record, addLog } = useL04()
  const df = useDfSession((s) => s.current)
  const cases = useMemo(() => buildCases(df), [df])
  const [caseId, setCaseId] = useState<string | null>(null)
  const c = cases.find((x) => x.id === caseId) ?? cases[0]
  const results = useMemo(() => (c ? c.strategies.map((s) => ({ s, r: compareAny(df, s, { tier: record.tier, column: c.column }) })) : []), [c, df, record.tier])
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = results.find((x) => x.s.id === picked) ?? null

  if (!c) {
    return (
      <p className="flex items-center gap-2 rounded border border-green/40 bg-green/5 p-4 text-sm text-green" data-testid="strategy-lab">
        <CheckCircle2 size={14} aria-hidden="true" /> No open cases: missing attendance, duplicates and invalid values are all handled.
      </p>
    )
  }
  return (
    <div className="space-y-3" data-testid="strategy-lab">
      <p className="flex items-center gap-2 text-xs text-muted">
        <FlaskConical size={13} className="text-violet" aria-hidden="true" /> Every strategy runs on a forked copy. Nothing changes and no hint is charged until you apply one.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cases">
        {cases.map((x) => (
          <button key={x.id} role="tab" type="button" aria-selected={x.id === c.id} onClick={() => { setCaseId(x.id); setPicked(null) }} className={cn('rounded border px-3 py-1 font-mono text-[10px] tracking-[0.16em]', x.id === c.id ? 'border-violet bg-violet/10 text-violet' : 'border-border text-muted')}>
            {x.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-text">{c.story}</p>
      {c.note && <p className="text-xs text-amber">{c.note}</p>}
      <div className="overflow-auto rounded border border-border">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-panel2 font-mono text-[10px] uppercase text-muted">
            <tr>
              <th className="px-2 py-1">Strategy</th><th className="px-2 py-1">Rows</th><th className="px-2 py-1">Lost</th><th className="px-2 py-1">Nulls</th>
              <th className="px-2 py-1">Mean</th><th className="px-2 py-1">Median</th><th className="px-2 py-1">Dropout Δ pts</th><th className="px-2 py-1">Decision</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ s, r }) => (
              <tr key={s.id} onClick={() => setPicked(s.id)} className={cn('cursor-pointer border-t border-border/60 hover:bg-cyan/5', picked === s.id && 'bg-cyan/10')} data-testid={`strategy-${s.id}`}>
                <td className="px-2 py-1">
                  <button type="button" className="text-left text-text" onClick={() => setPicked(s.id)}>{s.label}</button>
                  <code className="block font-mono text-[10px] text-cyan">{r.ok ? r.code : r.error}</code>
                </td>
                <td className="px-2 py-1 font-mono">{r.rowsBefore} → {r.rowsAfter}</td>
                <td className="px-2 py-1 font-mono">{r.rowsLost} ({f1(r.pctLost)}%)</td>
                <td className="px-2 py-1 font-mono">{r.nullsBefore} → {r.nullsAfter}</td>
                <td className="px-2 py-1 font-mono">{f1(r.meanBefore)} → {f1(r.meanAfter)}</td>
                <td className="px-2 py-1 font-mono">{f1(r.medianBefore)} → {f1(r.medianAfter)}</td>
                <td className="px-2 py-1 font-mono">{r.dropoutShiftPts === null ? 'n/a' : `${r.dropoutShiftPts >= 0 ? '+' : ''}${f1(r.dropoutShiftPts)}`}</td>
                <td className="px-2 py-1"><DecisionBadge d={r.decision} />{r.decision && <span className="block text-[10px] text-muted">{r.decision.label}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chosen && (
        <div className="space-y-2 rounded border border-violet/40 bg-violet/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet">Why</p>
          <p className="text-xs leading-relaxed text-text" data-testid="strategy-why">{chosen.r.why}</p>
          <NeonButton
            size="sm"
            data-testid="btn-strategy-apply"
            disabled={!chosen.r.ok || chosen.s.ops.length === 0}
            tooltip={chosen.s.ops.length === 0 ? 'Leaving the data as is needs no operation' : !chosen.r.ok ? 'This strategy fails on the current data' : undefined}
            onClick={() => {
              const res = run(chosen.s.ops, 'ui')
              if (res.ok) addLog({ title: `Strategy Lab applied: ${chosen.s.label}`, detail: chosen.r.why, tone: 'info' })
              setPicked(null)
            }}
          >
            Apply to my dataset
          </NeonButton>
        </div>
      )}
    </div>
  )
}

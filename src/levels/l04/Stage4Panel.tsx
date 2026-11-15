// Stage 4 INTEGRITY CHECK: validation dashboard, BEFORE/AFTER table and five animated integrity checks.
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Wrench, XCircle } from 'lucide-react'
import { columnDtype, engineConfig, formatDf, isNumericDtype, liveHealth, runInspect } from '../../engine'
import type { DF } from '../../engine'
import { motionReduced } from '../../game/settings'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { beforeAfterRows } from './debriefModel'
import { useDfSession, useL04 } from './session'

interface Check {
  code: string
  pass: boolean
  output: string
}

export function integrityChecks(df: DF): Check[] {
  const h = liveHealth(df)
  const r = engineConfig.VALID_RANGES.age
  const bad: DF = { ...df, rows: df.rows.filter((x) => typeof x.v.age === 'number' && (x.v.age < r.min || x.v.age > r.max)) }
  return [
    { code: 'df.isnull().sum()', pass: h.totalNulls + h.totalPlaceholders === 0, output: runInspect(df, { type: 'isnull_sum' }) },
    { code: 'df.duplicated().sum()', pass: h.normalizedDuplicates === 0, output: `${runInspect(df, { type: 'duplicated_sum' })}${h.normalizedDuplicates > h.duplicates ? `\n# plus ${h.normalizedDuplicates - h.duplicates} near-duplicate(s) after normalising text` : ''}` },
    { code: 'df.dtypes', pass: h.dtypeMismatches.length === 0, output: runInspect(df, { type: 'dtypes' }) },
    { code: "df['department'].value_counts()", pass: h.totalUnknownLabels === 0, output: df.columns.includes('department') ? runInspect(df, { type: 'value_counts', column: 'department' }) : 'KeyError' },
    { code: "df[(df['age'] < 16) | (df['age'] > 40)]", pass: bad.rows.length === 0, output: bad.rows.length ? formatDf(bad) : `Empty DataFrame\nColumns: [${df.columns.join(', ')}]\nIndex: []` },
  ]
}

export function Stage4Panel({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const { record, update } = useL04()
  const df = useDfSession((s) => s.current)
  const original = useDfSession((s) => s.original)
  const checks = useMemo(() => integrityChecks(df), [df])
  const [shown, setShown] = useState(record.stage4.checksRun ? checks.length : 0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const h = useMemo(() => liveHealth(df), [df])
  const compare = useMemo(() => beforeAfterRows(original, df), [original, df])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const runChecks = () => {
    update((x) => ({ ...x, stage4: { checksRun: true } }))
    if (motionReduced() || import.meta.env.MODE === 'test') {
      setShown(checks.length)
      return
    }
    setRunning(true)
    setShown(0)
    const step = (i: number) => {
      setShown(i)
      if (i >= checks.length) {
        setRunning(false)
        return
      }
      timer.current = setTimeout(() => step(i + 1), 450)
    }
    step(0)
  }

  return (
    <div className="space-y-4" data-testid="stage4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-auto rounded border border-border">
          <table className="min-w-full text-left text-[11px]">
            <caption className="bg-panel2 px-2 py-1 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Validation by column</caption>
            <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="px-2 py-1">Column</th><th className="px-2 py-1">Expected</th><th className="px-2 py-1">Actual</th><th className="px-2 py-1">Nulls</th><th className="px-2 py-1">Out of range</th><th className="px-2 py-1">Unknown labels</th></tr></thead>
            <tbody>
              {df.columns.map((c) => {
                const expected = (engineConfig.NUMERIC_COLUMNS as readonly string[]).includes(c) ? 'numeric' : 'object'
                const actual = columnDtype(df, c)
                const ok = expected === 'object' || isNumericDtype(actual)
                return (
                  <tr key={c} className="border-t border-border/60 font-mono">
                    <td className="px-2 py-1 text-text">{c}</td>
                    <td className="px-2 py-1 text-muted">{expected}</td>
                    <td className={cn('px-2 py-1', ok ? 'text-green' : 'text-red')}>{actual}{ok ? '' : ' ✗'}</td>
                    <td className={cn('px-2 py-1', (h.nulls[c] ?? 0) + (h.placeholders[c] ?? 0) ? 'text-red' : 'text-muted')}>{(h.nulls[c] ?? 0) + (h.placeholders[c] ?? 0)}</td>
                    <td className={cn('px-2 py-1', h.outOfRange[c] ? 'text-magenta' : 'text-muted')}>{h.outOfRange[c] ?? '-'}</td>
                    <td className={cn('px-2 py-1', h.unknownLabels[c] ? 'text-violet' : 'text-muted')}>{h.unknownLabels[c] ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="overflow-auto rounded border border-border">
          <table className="min-w-full text-left text-[11px]" data-testid="before-after">
            <caption className="bg-panel2 px-2 py-1 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Before vs after</caption>
            <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="px-2 py-1">Measure</th><th className="px-2 py-1">Before</th><th className="px-2 py-1">After</th></tr></thead>
            <tbody>
              {compare.map((r) => (
                <tr key={r.label} className="border-t border-border/60"><td className="px-2 py-1 text-text">{r.label}</td><td className="px-2 py-1 font-mono text-muted">{r.before}</td><td className={cn('px-2 py-1 font-mono', r.changed ? 'text-cyan' : 'text-muted')}>{r.after}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <NeonButton size="sm" onClick={runChecks} disabled={running} data-testid="btn-run-checks">Run integrity checks</NeonButton>
          <NeonButton size="sm" variant="ghost" onClick={onBack} data-testid="btn-back-tools"><Wrench size={12} aria-hidden="true" /> Back to tools</NeonButton>
          <NeonButton size="sm" onClick={onSubmit} data-testid="btn-submit-audit" disabled={!record.stage4.checksRun || running} tooltip={!record.stage4.checksRun ? 'Run the integrity checks first' : undefined}>Submit for audit</NeonButton>
        </div>
        <ol className="space-y-2" aria-live="polite">
          {checks.map((c, i) => (
            <li key={c.code} className={cn('rounded border p-2', i < shown ? (c.pass ? 'border-green/40' : 'border-red/40') : 'border-border opacity-50')} data-testid={`check-${i}`}>
              <p className="flex items-center gap-2 font-mono text-[11px]">
                {i < shown ? (c.pass ? <CheckCircle2 size={13} className="text-green" aria-label="pass" /> : <XCircle size={13} className="text-red" aria-label="fail" />) : running && i === shown ? <Loader2 size={13} className="animate-spin text-cyan" aria-label="running" /> : <span className="h-3 w-3 rounded-full border border-muted" />}
                <code className="text-cyan">{c.code}</code>
                {i < shown && <span className={c.pass ? 'text-green' : 'text-red'}>{c.pass ? 'PASS' : 'FAIL'}</span>}
              </p>
              {i < shown && <pre className="mt-1 max-h-32 overflow-auto font-mono text-[10px] text-muted">{c.output}</pre>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

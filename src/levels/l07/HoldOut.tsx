// Stage 3 part 2 FINAL FORECAST: choose a model on 180 train / 60 validation rows, then SUBMIT FORECAST to the sealed hold-out.
import { useMemo } from 'react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ALL_FEATURES } from './config'
import type { FeatureName } from './config'
import { finalSplit, fitSpec, metricsFor } from './data'
import type { L07Data, Metrics } from './data'
import type { Submission } from './forecast'
import { CodeLines, MetricTable } from './Workshop'

export interface HoldOutProps {
  data: L07Data
  features: FeatureName[]
  degree: 1 | 2
  fitted: boolean
  submissions: Submission[]
  scored: Submission | null
  peeked: boolean
  onFeatures: (f: FeatureName[]) => void
  onDegree: (d: 1 | 2) => void
  onFit: () => void
  onSubmit: (val: Metrics) => void
}

export function HoldOut(p: HoldOutProps) {
  const split = useMemo(() => finalSplit(p.data), [p.data])
  const result = useMemo(() => {
    if (!p.fitted) return null
    const f = fitSpec({ features: p.features, degree: p.degree }, split.train)
    if ('error' in f) return { error: f.error }
    return { train: metricsFor(f, split.train), val: metricsFor(f, split.val) }
  }, [p.fitted, p.features, p.degree, split])
  const toggle = (f: FeatureName) => p.onFeatures(p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f])
  const ok = result && !('error' in result)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Working data: 180 train / 60 validation rows. The 60-row hold-out is sealed until you submit.</p>
      <div className="flex flex-wrap gap-2">
        {ALL_FEATURES.map((f) => (
          <button key={f} type="button" aria-pressed={p.features.includes(f)} data-testid={`final-chip-${f}`} onClick={() => toggle(f)}
            className={cn('rounded border px-2 py-1 font-mono text-xs', p.features.includes(f) ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border text-muted')}>
            {p.features.includes(f) ? '[x] ' : '[ ] '}{f}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 font-mono text-xs text-muted">
        <input type="checkbox" checked={p.degree === 2} onChange={(e) => p.onDegree(e.target.checked ? 2 : 1)} data-testid="l7-final-square" />
        add squared terms (PolynomialFeatures(2), rescaled on train range)
      </label>
      <NeonButton onClick={p.onFit} disabled={p.features.length === 0} tooltip={p.features.length === 0 ? 'Select a feature' : undefined} data-testid="l7-final-fit">FIT FINAL MODEL</NeonButton>
      {result && 'error' in result && <p role="alert" className="text-sm text-red">{result.error}</p>}
      {ok && (
        <>
          <MetricTable rows={[{ label: 'train', ...result.train }, { label: 'validation', ...result.val }]} />
          <NeonButton onClick={() => p.onSubmit(result.val)} data-testid="l7-submit">SUBMIT FORECAST</NeonButton>
        </>
      )}
      {p.submissions.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {p.peeked && <p data-testid="l7-peeked" className="text-sm text-amber">PEEKED: hold-out numbers were seen more than once. Only your first submission is scored.</p>}
          <table className="w-full font-mono text-xs">
            <thead><tr className="text-muted"><th className="text-left">#</th><th className="text-left">model</th><th className="text-right">val r2</th><th className="text-right">hold-out r2</th><th className="text-right">hold-out RMSE</th></tr></thead>
            <tbody>
              {p.submissions.map((s, i) => (
                <tr key={i} className={i === 0 ? 'text-green' : 'text-muted'}>
                  <td>{i + 1}{i === 0 ? ' (scored)' : ''}</td>
                  <td>{s.features.join('+')}{s.degree === 2 ? ' ^2' : ''}</td>
                  <td className="text-right">{s.valR2.toFixed(3)}</td>
                  <td className="text-right" data-testid={`holdout-r2-${i}`}>{s.holdoutR2.toFixed(3)}</td>
                  <td className="text-right">{s.holdoutRmse.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.scored && <p className="text-xs text-muted">Best legitimate linear model on the same 180 rows scores hold-out r2 {p.scored.achievableR2.toFixed(3)}.</p>}
        </div>
      )}
      <CodeLines lines={['model.fit(X_train, y_train)  # 180 rows', 'r2_score(y_val, model.predict(X_val))', 'r2_score(y_holdout, model.predict(X_holdout))  # once, at the end']} />
    </div>
  )
}

// GHOST HUNT side op: read-only table with sort, filters and column stats; select the fabricated enrolments.
import { useMemo, useState } from 'react'
import { columnDtype, displayCell, isNumericDtype, mean, numbers } from '../../engine'
import type { ChallengeProps } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ghostHuntScore, ghostSignals, prepareGhostHuntDf } from './ghostHunt'
import type { GhostHuntScore } from './ghostHunt'
import { viewRows } from './sheetModel'
import type { SortState } from './sheetModel'
import { liveHealth } from '../../engine'

export const GHOST_HUNT_SEED = 1001

export function GhostHuntChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const data = useMemo(() => prepareGhostHuntDf(GHOST_HUNT_SEED, 'independent'), [])
  const df = data.df
  const health = useMemo(() => liveHealth(df), [df])
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<number[]>([])
  const [score, setScore] = useState<GhostHuntScore | null>(null)
  const [tries, setTries] = useState(0)
  const rows = useMemo(() => viewRows(df, null, sort, filters, 'none', health), [df, sort, filters, health])
  const stats = useMemo(
    () => Object.fromEntries(df.columns.filter((c) => isNumericDtype(columnDtype(df, c))).map((c) => { const xs = numbers(df, c); return [c, xs.length ? `μ ${mean(xs).toFixed(1)} · max ${Math.max(...xs)}` : ''] })),
    [df],
  )

  const submit = () => {
    const s = ghostHuntScore(sel, data.ghosts)
    setScore(s)
    setTries((t) => t + 1)
    ui.log({ title: `Ghost scan: ${s.hits.length} hit(s), ${s.falsePositives.length} false positive(s)`, detail: `Precision ${Math.round(s.precision * 100)}%, recall ${Math.round(s.recall * 100)}%.`, tone: s.passed ? 'good' : 'bad' })
  }

  return (
    <div className="space-y-3" data-testid="ghost-hunt">
      <p className="text-sm text-muted">Four enrolments in this cleaned table were fabricated. Sort, filter and compare, then tick the rows you believe are fake. The table is read-only.</p>
      <div className="max-h-[26rem] overflow-auto rounded border border-border">
        <table className="min-w-full text-left">
          <thead className="sticky top-0 z-10 bg-panel2">
            <tr>
              <th className="px-2 py-1 font-mono text-[10px] text-muted">pick</th>
              {df.columns.map((c) => (
                <th key={c} className="px-2 py-1 align-top">
                  <button type="button" className="font-mono text-[11px] text-text hover:text-cyan" onClick={() => setSort(!sort || sort.column !== c ? { column: c, ascending: false } : sort.ascending ? null : { column: c, ascending: true })}>
                    {c}{sort?.column === c ? (sort.ascending ? ' ↑' : ' ↓') : ''}
                  </button>
                  <span className="block font-mono text-[9px] text-muted">{stats[c] ?? ''}</span>
                  <input aria-label={`Filter ${c}`} placeholder="filter" className="mt-1 w-full min-w-[3.5rem] rounded border border-border bg-bg px-1 font-mono text-[10px] text-text" value={filters[c] ?? ''} onChange={(e) => setFilters((f) => ({ ...f, [c]: e.target.value }))} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.idx} className={cn('border-t border-border/50', sel.includes(r.idx) && 'bg-cyan/10')}>
                <td className="px-2 py-0.5"><input type="checkbox" className="accent-cyan" aria-label={`Mark row ${r.idx} as fake`} data-testid={`ghost-pick-${r.idx}`} checked={sel.includes(r.idx)} onChange={() => setSel((s) => (s.includes(r.idx) ? s.filter((x) => x !== r.idx) : [...s, r.idx]))} /></td>
                {df.columns.map((c) => <td key={c} className="whitespace-nowrap px-2 py-0.5 font-mono text-[11px] text-text">{displayCell(df, c, r.v[c] ?? null)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <NeonButton onClick={submit} disabled={sel.length === 0} tooltip={sel.length ? undefined : 'Select at least one row'} data-testid="btn-ghost-submit">Submit selection ({sel.length})</NeonButton>
        {score?.passed && (
          <NeonButton data-testid="btn-ghost-complete" onClick={() => onComplete({ id, accuracy: score.f1, decisionQuality: score.precision, efficiency: tries <= 1 ? 1 : Math.max(0.4, 1 - 0.2 * (tries - 1)), hintsUsed: 0, mistakes: tries - 1, decisions: [{ label: 'Fabricated enrolments identified', good: true, explanation: 'Ghosts are perfect on every field at once: attendance 100, cgpa 10.0, never dropped out.' }] })}>
            Complete operation
          </NeonButton>
        )}
      </div>
      {score && (
        <div className="rounded border border-border bg-panel2/50 p-3 text-xs" aria-live="polite" data-testid="ghost-score">
          <p className="text-text">Precision {Math.round(score.precision * 100)}% · Recall {Math.round(score.recall * 100)}% · F1 {Math.round(score.f1 * 100)}% {score.passed ? '· PASSED' : '· keep hunting (F1 75% to pass)'}</p>
          {score.hits.map((h) => <p key={h} className="text-green">Row {h}: fabricated. {ghostSignals(df, h).join(', ')}.</p>)}
          {score.falsePositives.map((h) => <p key={h} className="text-amber">Row {h}: a real student{ghostSignals(df, h).length ? ` (${ghostSignals(df, h).join(', ')}, but not all at once)` : ''}. Unusual is not the same as fake.</p>)}
          <p className="mt-2 text-muted">An outlier is one extreme value in a real record and should be checked, not deleted. A fabricated record is too perfect on every field at once: attendance exactly 100, cgpa exactly 10.0 and never dropped out.</p>
        </div>
      )}
    </div>
  )
}

// Level 04 debrief sections b-g: metric bars, BEFORE/AFTER, decisions, WHAT YOU MISSED, WHY IT MATTERS, ghosts.
import { CheckCircle2, Ghost, MinusCircle, XCircle } from 'lucide-react'
import type { DF, Flag, JudgedDecision, QualityReport, Tier } from '../../engine'
import type { Decision } from '../../game/types'
import { Badge } from '../../ui/Badge'
import { Panel } from '../../ui/Panel'
import { ProgressBar } from '../../ui/ProgressBar'
import { cn } from '../../ui/cn'
import { KIND_LABEL } from './flagScoring'
import { beforeAfterRows, ghostLines, metricLines, missedGroups, whyItMatters } from './debriefModel'
import type { PuzzlePick } from './missionRecord'

export function MetricBars({ q, opsCount, badKept, redundant }: { q: QualityReport; opsCount: number; badKept: number; redundant: number }) {
  return (
    <Panel eyebrow="Metric breakdown" title="What built your integrity score">
      <ul className="space-y-3" data-testid="metric-bars">
        {metricLines(q, opsCount, badKept, redundant).map((m) => (
          <li key={m.key}>
            <ProgressBar value={Math.round(m.value * 100)} label={`${m.label} (weight ${m.weight})`} showValue tone={m.value >= 0.9 ? 'green' : m.value >= 0.6 ? 'amber' : 'red'} />
            <p className="mt-1 text-[11px] text-muted">{m.sentence}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function BeforeAfter({ before, after }: { before: DF; after: DF }) {
  return (
    <Panel eyebrow="Before vs after" title="The vault, then and now">
      <table className="w-full text-left text-xs" data-testid="debrief-before-after">
        <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="py-1">Measure</th><th>Before</th><th>After</th></tr></thead>
        <tbody>
          {beforeAfterRows(before, after).map((r) => (
            <tr key={r.label} className="border-t border-border/60">
              <td className="py-1 text-text">{r.label}</td>
              <td className="font-mono text-muted">{r.before}</td>
              <td className={cn('font-mono', r.changed ? 'text-cyan' : 'text-muted')}>{r.after}{r.changed ? ' •' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-muted">• marks a changed value. Attendance before cleaning is read by stripping the '%' text.</p>
    </Panel>
  )
}

function Verdict({ d }: { d: Decision }) {
  if (d.good === true) return <span className="flex items-center gap-1 text-green"><CheckCircle2 size={12} aria-hidden="true" />good</span>
  if (d.good === false) return <span className="flex items-center gap-1 text-red"><XCircle size={12} aria-hidden="true" />bad</span>
  return <span className="flex items-center gap-1 text-amber"><MinusCircle size={12} aria-hidden="true" />{d.redundant ? 'no effect' : 'neutral'}</span>
}

export function DecisionsList({ decisions, picks }: { decisions: JudgedDecision[]; picks: PuzzlePick[] }) {
  const items = [...decisions.map((d) => ({ key: d.entryId, d: d.decision, undone: d.undone, src: 'operation' })), ...picks.map((p, i) => ({ key: `p${i}`, d: p.decision, undone: false, src: `puzzle ${p.puzzleId}` }))]
  return (
    <Panel eyebrow="Decisions and consequences" title={`${items.length} judged decision(s)`}>
      {items.length === 0 ? <p className="text-sm text-muted">No operation triggered a judgement rule.</p> : (
        <ul className="space-y-2" data-testid="debrief-decisions">
          {items.map((x) => (
            <li key={x.key} className="rounded border border-border/60 bg-panel2/40 p-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Verdict d={x.d} />
                <span className="text-text">{x.d.label}</span>
                <Badge tone="muted">{x.src}</Badge>
                {x.undone && <Badge tone="cyan">undone</Badge>}
              </div>
              <p className="mt-1 text-muted">{x.d.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function WhatYouMissed({ q }: { q: QualityReport }) {
  const groups = missedGroups(q.unresolved)
  return (
    <Panel eyebrow="What you missed" title={groups.length ? `${q.unresolved.length} unresolved issue(s)` : 'Nothing left behind'}>
      {groups.length === 0 ? <p className="text-sm text-green">Every injected issue was resolved.</p> : (
        <ul className="space-y-3" data-testid="debrief-missed">
          {groups.map((g) => (
            <li key={g.kind} className="text-xs">
              <p className="font-semibold text-text">{KIND_LABEL[g.kind]}: {g.count}</p>
              <p className="text-muted">{g.locations.join('; ')}{g.count > 5 ? '; ...' : ''}</p>
              <code className="mt-1 block font-mono text-[11px] text-cyan">{g.fix}</code>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function WhyItMattersPanel({ dirty, tier }: { dirty: DF; tier: Tier }) {
  const w = whyItMatters(dirty, tier)
  const pct = (x: number | null): string => (x === null ? 'n/a' : `${(Math.round(x * 1000) / 10).toFixed(1)}%`)
  return (
    <Panel eyebrow="Why it matters" title="What naive cleaning would have done">
      <ul className="space-y-2 text-xs" data-testid="debrief-why">
        {w.strategies.map((s) => (
          <li key={s.code} className="rounded border border-border/60 bg-panel2/40 p-2">
            <code className="font-mono text-[11px] text-cyan">{s.code}</code>
            <p className="mt-1 text-text">Removes {s.rowsLost} of {dirty.rows.length} students ({(Math.round(s.pctLost * 10) / 10).toFixed(1)}%), {s.dropoutsLost} of them dropouts. Dropout rate {pct(s.dropoutBefore)} → {pct(s.dropoutAfter)}{s.shiftPts !== null ? ` (${s.shiftPts >= 0 ? '+' : ''}${(Math.round(s.shiftPts * 10) / 10).toFixed(1)} points)` : ''}.</p>
          </li>
        ))}
      </ul>
      {w.expertNote && <p className="mt-2 rounded border border-amber/40 bg-amber/5 p-2 text-xs text-amber">{w.expertNote}</p>}
    </Panel>
  )
}

export function GhostsPanel({ dirty, ghosts, flags, hiddenEarned }: { dirty: DF; ghosts: number[]; flags: Flag[]; hiddenEarned: boolean }) {
  const g = ghostLines(dirty, ghosts, flags)
  return (
    <Panel eyebrow="Ghost records" title={`${g.lines.filter((l) => l.hit).length} of ${ghosts.length} ghosts flagged`}>
      <ul className="space-y-1.5 text-xs" data-testid="debrief-ghosts">
        {g.lines.map((l) => (
          <li key={l.idx} className="flex flex-wrap items-center gap-2">
            <Ghost size={12} className={l.hit ? 'text-green' : 'text-muted'} aria-hidden="true" />
            <span className="text-text">Row {l.idx} · {l.name}</span>
            <Badge tone={l.hit ? 'green' : 'muted'}>{l.hit ? 'flagged' : 'missed'}</Badge>
            <span className="text-muted">{l.signals.join(', ')}</span>
          </li>
        ))}
      </ul>
      {g.falsePositives.length > 0 && <p className="mt-2 text-[11px] text-amber">Anomaly flags on real students: rows {g.falsePositives.join(', ')}.</p>}
      <p className="mt-2 text-[11px] text-muted">An outlier is one unusual value in a real record; a fabricated record is perfect on every field at once. Ghosts are not cleaning issues, so they never lowered your report score.</p>
      <div className={cn('mt-3 rounded border p-2 text-xs', hiddenEarned ? 'border-green/50 text-green' : 'border-border text-muted')} data-testid="hidden-bonus-tile">
        Hidden bonus: {hiddenEarned ? 'GHOST HUNTER earned' : '???'}
      </div>
    </Panel>
  )
}

// Stage 3 FIND THE PATTERN: brush attendance, read lift and coverage, build a checked INSIGHT and run the correlation desk.
import { useMemo, useRef, useState } from 'react'
import type { ChallengeProps, Decision } from '../../game/types'
import { steepestFall } from '../../engine/cohort'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState } from '../../shell/stageState'
import { BarChart, Scatter } from '../../components/charts'
import { NeonButton, Panel, Stat } from '../../ui'
import { fmt, l05Cohort } from './data'
import { ATT_MAX, ATT_MIN, COVERAGE_GOAL, LIFT_GOAL, binnedRates, binsInRange, brushCode, brushStats, isCliffBoundary, normaliseRange } from './pattern'
import type { Range } from './pattern'
import { CAVEAT_CHIPS, DIRECTION_CHIPS, MAGNITUDE_CHIPS, VARIABLE_CHIPS, composeInsight, insightCheck } from './insightCheck'
import type { InsightChips } from './insightCheck'
import { STAGE3_INITIAL } from './state'
import type { Stage3State } from './state'
import { CorrelationPanel } from './CorrelationPanel'
import { ChipGroup, CodeLine, GoalCard, clamp01, pct } from './deskUi'

export function PatternHunt({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(5)
  const rows = useMemo(() => l05Cohort(seed), [seed])
  const fall = useMemo(() => steepestFall(rows), [rows])
  const bins = useMemo(() => binnedRates(rows), [rows])
  const ui = useMissionUi()
  const [s, setS] = useStageState<Stage3State>(id, STAGE3_INITIAL)
  const [problems, setProblems] = useState<string[]>([])
  const done = useRef(false)
  const range: Range = [s.lo, s.hi]
  const st = useMemo(() => brushStats(rows, [s.lo, s.hi]), [rows, s.lo, s.hi])
  const update = (patch: Partial<Stage3State>) => setS((p) => ({ ...p, ...patch }))
  const setRange = (r: Range) => {
    const [lo, hi] = normaliseRange(r)
    setProblems([])
    update({ lo, hi, insightOk: false })
  }
  const setChip = (patch: Partial<InsightChips>) => update({ chips: { ...s.chips, ...patch }, insightOk: false })

  const check = () => {
    const res = insightCheck({ variable: s.chips.variable, direction: s.chips.direction, lift: s.chips.magnitude, n: st.nIn, caveat: s.chips.caveat }, range, st)
    setProblems(res.problems)
    if (res.ok) {
      update({ insightOk: true })
      ui.log({ title: 'Insight verified', detail: composeInsight(s.chips, range, st.nIn), tone: 'good' })
    } else {
      update({ mistakes: s.mistakes + 1 })
      ui.log({ title: 'Insight refused', detail: res.problems[0], tone: 'bad' })
    }
  }

  const canFinish = st.meetsGoal && s.insightOk && s.interpretOk
  const finish = () => {
    if (done.current || !canFinish) return
    done.current = true
    ui.completeObjective('l5-obj-pattern')
    ui.completeObjective('l5-obj-corr')
    const cliff = isCliffBoundary(range, fall)
    const decisions: Decision[] = [
      { label: `Selected attendance ${s.lo}–${s.hi}`, good: true, explanation: `Dropout inside is ${pct(st.rateIn)} vs ${pct(st.overall)} overall (lift ${fmt(st.lift)}), covering ${pct(st.coverage)} of students: large enough to matter, extreme enough to act on.` },
      { label: 'Insight with the association caveat', good: true, explanation: 'Observational data shows who drops out, not why; the caveat keeps the report honest.' },
      { label: 'library_visits is confounded by study_hours', good: true, explanation: 'Within study_hours bands the library correlation shrinks, so visits are a marker of study time, not a lever.' },
    ]
    onComplete({
      id, accuracy: 1, decisionQuality: clamp01(1 / (1 + 0.5 * s.mistakes)), efficiency: clamp01(Math.max(0.3, 3 / (3 + s.mistakes))),
      hintsUsed: 0, mistakes: s.mistakes, decisions,
      extra: { selLo: s.lo, selHi: s.hi, lift: Math.round(st.lift * 100) / 100, coverage: Math.round(st.coverage * 1000) / 1000, steepestFall: fall, dropoutCliff: cliff },
    })
  }

  const numberInput = (label: string, value: number, on: (v: number) => void) => (
    <label className="font-mono text-[11px] text-muted">{label}
      <input type="number" min={ATT_MIN} max={ATT_MAX} step={1} value={value} aria-label={label} data-testid={`brush-${label}`}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) on(v) }}
        className="ml-1 w-16 rounded border border-border bg-panel2 px-1 text-text" />
    </label>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel eyebrow="Desk A" title="ATTENDANCE VS CGPA">
        <Scatter points={rows.map((r) => ({ x: r.attendance, y: r.cgpa, category: r.dropped_out ? 'dropped out' : 'stayed' }))}
          categories={['stayed', 'dropped out']} xLabel="attendance" yLabel="cgpa" xDomain={[ATT_MIN, ATT_MAX]}
          brush={range} brushStep={1} onBrush={(r) => { if (r) setRange(r) }} />
        <div className="mt-2 flex gap-3">{numberInput('from', s.lo, (v) => setRange([v, s.hi]))}{numberInput('to', s.hi, (v) => setRange([s.lo, v]))}</div>
        <p className="mt-1 text-[11px] text-muted">Drag on the scatter or focus the brush and use the arrow keys (Shift widens). Range is from ≤ attendance &lt; to.</p>
        <BarChart categories={bins.map((b) => b.label)} values={bins.map((b) => b.rate)} highlighted={binsInRange(bins, range)}
          threshold={{ value: st.overall, label: 'overall' }} xLabel="attendance bin" yLabel="dropout rate" valueFormat={(v) => pct(v)} />
      </Panel>

      <Panel eyebrow="Desk B" title="SELECTION READOUT">
        <div className="grid grid-cols-3 gap-2" data-testid="brush-stats">
          <Stat label="rate inside" value={pct(st.rateIn)} tone="magenta" hint={`n = ${st.nIn}`} />
          <Stat label="rate outside" value={pct(st.rateOut)} hint={`n = ${st.nOut}`} />
          <Stat label="overall" value={pct(st.overall)} />
          <Stat label="lift" value={<span data-testid="lift">{fmt(st.lift)}</span>} tone={st.lift >= LIFT_GOAL ? 'green' : 'amber'} hint={`goal ≥ ${LIFT_GOAL}`} />
          <Stat label="coverage" value={pct(st.coverage)} tone={st.coverage >= COVERAGE_GOAL ? 'green' : 'amber'} hint={`goal ≥ ${pct(COVERAGE_GOAL)}`} />
        </div>
        <div className="mt-2"><CodeLine code={brushCode(range)} /></div>
        <div className="mt-3"><GoalCard testId="goal-range" done={st.meetsGoal} label="Select a range with lift ≥ 2 that covers ≥ 15% of students" /></div>
        <div className="mt-4 space-y-2">
          <p className="font-display text-xs uppercase tracking-[0.16em] text-text">INSIGHT BUILDER</p>
          <ChipGroup label="variable" options={VARIABLE_CHIPS} value={s.chips.variable} onChange={(variable) => setChip({ variable })} />
          <ChipGroup label="direction" options={DIRECTION_CHIPS} value={s.chips.direction} onChange={(direction) => setChip({ direction })} />
          <ChipGroup label="magnitude" options={MAGNITUDE_CHIPS} value={s.chips.magnitude as (typeof MAGNITUDE_CHIPS)[number] | null} onChange={(magnitude) => setChip({ magnitude })} render={(m) => `${m}x`} />
          <ChipGroup label="caveat" options={CAVEAT_CHIPS.map((c) => c.id)} value={s.chips.caveat} onChange={(caveat) => setChip({ caveat })} render={(c) => CAVEAT_CHIPS.find((x) => x.id === c)?.text ?? c} />
          <blockquote className="rounded border border-border bg-bg/60 p-2 text-sm text-text" data-testid="insight-text">{composeInsight(s.chips, range, st.nIn)}</blockquote>
          <NeonButton size="sm" data-testid="insight-check" disabled={!st.meetsGoal || s.insightOk} tooltip={!st.meetsGoal ? 'Reach the range goal first' : undefined} onClick={check}>CHECK INSIGHT</NeonButton>
          <GoalCard testId="goal-insight" done={s.insightOk} label="Report a claim that matches the numbers and carries the caveat" />
          {problems.length > 0 && <ul aria-live="polite" className="list-disc pl-5 text-xs text-red">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      </Panel>

      <div className="lg:col-span-2">
        <CorrelationPanel rows={rows} s={s} update={update} onMistake={() => setS((p) => ({ ...p, mistakes: p.mistakes + 1 }))} />
      </div>
      <div className="flex items-center gap-3 lg:col-span-2">
        <NeonButton data-testid="s3-finish" disabled={!canFinish} tooltip={canFinish ? undefined : 'Range goal, verified insight and correlation interpretation required'} onClick={finish}>SEND TO THE DEAN</NeonButton>
        <span className="font-mono text-[11px] text-muted">mistakes: {s.mistakes}</span>
      </div>
    </div>
  )
}

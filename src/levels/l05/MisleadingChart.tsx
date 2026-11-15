// Side op MISLEADING CHART: fix a truncated axis, bimodal-hiding bins and a cherry-picked window until each chart is honest.
import { useMemo, useRef, useState } from 'react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed } from '../../shell/stageState'
import { BarChart, Histogram, LineChart } from '../../components/charts'
import { NeonButton, Panel } from '../../ui'
import { fmt, l05Cohort } from './data'
import { MISLEAD_START, bimodalBins, bimodalSample, departmentRates, honesty, slope, termSeries, windowPoints } from './misleading'
import type { MisleadState, WindowChoice } from './misleading'
import { ChipGroup, CodeLine, GoalCard, clamp01, pct } from './deskUi'

type ChartKey = 'axis' | 'bins' | 'range'
const EXPLAIN: Record<ChartKey, string> = {
  axis: 'Bar length must be proportional to the value; starting at zero stops a few points of difference looking like a landslide.',
  bins: 'With too few bins the two commuter groups merge into one block; enough bins reveal two peaks and a gap between them.',
  range: 'A three-term window shows a steep rise that the full twelve-term series does not support: always show the whole record.',
}

export function MisleadingChart({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(5)
  const rows = useMemo(() => l05Cohort(seed), [seed])
  const ui = useMissionUi()
  const dept = useMemo(() => departmentRates(rows), [rows])
  const bimodal = useMemo(() => bimodalSample(seed), [seed])
  const series = useMemo(() => termSeries(seed), [seed])
  const [st, setSt] = useState<MisleadState>(MISLEAD_START)
  const [marked, setMarked] = useState<Record<ChartKey, boolean>>({ axis: false, bins: false, range: false })
  const [msg, setMsg] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const decisions = useRef<Decision[]>([])
  const done = useRef(false)
  const honest = honesty(st, bimodal)
  const shown = windowPoints(series, st.window)

  const mark = (k: ChartKey) => {
    if (!honest[k]) {
      setMistakes((m) => m + 1)
      setMsg(`Not yet honest: ${EXPLAIN[k]}`)
      decisions.current.push({ label: `Marked ${k} chart honest too early`, good: false, explanation: EXPLAIN[k] })
      return
    }
    setMarked((m) => ({ ...m, [k]: true }))
    setMsg(`Fixed. ${EXPLAIN[k]}`)
    decisions.current.push({ label: `Fixed the ${k} chart`, good: true, explanation: EXPLAIN[k] })
    ui.log({ title: `Chart fixed: ${k}`, detail: EXPLAIN[k], tone: 'good' })
  }
  const all = marked.axis && marked.bins && marked.range
  const finish = () => {
    if (done.current || !all) return
    done.current = true
    ui.completeObjective('l5-side-1-obj')
    onComplete({ id, accuracy: 1, decisionQuality: clamp01(1 / (1 + 0.5 * mistakes)), efficiency: clamp01(Math.max(0.3, 3 / (3 + mistakes))), hintsUsed: 0, mistakes, decisions: decisions.current, extra: { fixes: 3 } })
  }
  const markBtn = (k: ChartKey) => (
    <NeonButton size="sm" data-testid={`mark-${k}`} disabled={marked[k]} tooltip={marked[k] ? 'Already fixed' : undefined} onClick={() => mark(k)}>MARK HONEST</NeonButton>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel eyebrow="Chart 1" title="DROPOUT BY DEPARTMENT">
        <BarChart categories={dept.categories} values={dept.values} startAtZero={st.zero} yLabel="dropout rate" valueFormat={pct} />
        <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <input type="checkbox" checked={st.zero} data-testid="fix-zero" onChange={(e) => setSt({ ...st, zero: e.target.checked })} /> y-axis starts at zero
        </label>
        <p className="text-[11px] text-muted">Largest / smallest rate ratio: {fmt(Math.max(...dept.values) / Math.max(1e-9, Math.min(...dept.values)))}</p>
        <CodeLine code="df.groupby('department')['dropped_out'].mean().plot.bar(ylim=(0, None))" />
        <GoalCard done={marked.axis} label="Honest axis">{markBtn('axis')}</GoalCard>
      </Panel>
      <Panel eyebrow="Chart 2" title="COMMUTE MINUTES">
        <Histogram bins={bimodalBins(bimodal, st.bins)} xLabel="minutes" />
        <label className="block font-mono text-[11px] text-muted">bins: {st.bins}
          <input type="range" min={2} max={20} value={st.bins} aria-label="bins" data-testid="fix-bins" className="ml-2 align-middle accent-cyan"
            onChange={(e) => setSt({ ...st, bins: Number(e.target.value) })} />
        </label>
        <p className="text-[11px] text-muted">{honest.bins ? 'Two peaks visible.' : 'One block: the shape is hidden.'}</p>
        <CodeLine code={`commute.plot.hist(bins=${st.bins})`} />
        <GoalCard done={marked.bins} label="Honest bins">{markBtn('bins')}</GoalCard>
      </Panel>
      <Panel eyebrow="Chart 3" title="ATTENDANCE BY TERM">
        <LineChart series={[{ name: 'mean attendance', points: shown }]} xLabel="term" yLabel="attendance" integerX />
        <ChipGroup<WindowChoice> label="window" options={['last3', 'last6', 'all']} value={st.window} onChange={(window) => setSt({ ...st, window })} />
        <p className="text-[11px] text-muted">Slope shown: {fmt(slope(shown))} per term · full series: {fmt(slope(series))}</p>
        <CodeLine code={st.window === 'all' ? 'terms.plot.line()' : `terms.tail(${st.window === 'last3' ? 3 : 6}).plot.line()`} />
        <GoalCard done={marked.range} label="Honest range">{markBtn('range')}</GoalCard>
      </Panel>
      <div className="flex items-center gap-3 lg:col-span-3">
        {msg && <p aria-live="polite" className="text-xs text-amber">{msg}</p>}
        <NeonButton data-testid="mis-finish" disabled={!all} tooltip={all ? undefined : 'Fix all three charts first'} onClick={finish}>FILE CORRECTION</NeonButton>
      </div>
    </div>
  )
}

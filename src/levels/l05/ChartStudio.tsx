// Stage 2 CHOOSE THE RIGHT CHART: four briefs, chart type and columns, live preview and the pure chart rubric.
import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState } from '../../shell/stageState'
import { Badge, NeonButton, Panel } from '../../ui'
import { cn } from '../../ui/cn'
import { BIN_MAX, BIN_MIN, BRIEFS, CHART_TYPES, chartCode, chartRubric, chartWarnings, passes } from './chartRubric'
import type { ChartSpec, RubricResult } from './chartRubric'
import { CATEGORY_COLUMNS, NUMERIC_COLUMNS, l05Cohort } from './data'
import { STAGE2_INITIAL } from './state'
import type { BriefState, Stage2State } from './state'
import { ChartPreview } from './ChartPreview'
import { ChipGroup, CodeLine, GoalCard, Select, clamp01 } from './deskUi'

const COLS = [...CATEGORY_COLUMNS, ...NUMERIC_COLUMNS]
const toSpec = (b: BriefState): ChartSpec => ({ type: b.type, x: b.x, y: b.y, bins: b.bins, startAtZero: b.zero })

export function ChartStudio({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(5)
  const rows = useMemo(() => l05Cohort(seed), [seed])
  const ui = useMissionUi()
  const [s, setS] = useStageState<Stage2State>(id, STAGE2_INITIAL)
  const [verdict, setVerdict] = useState<RubricResult | null>(null)
  const decisions = useRef<Decision[]>([])
  const done = useRef(false)
  const brief = BRIEFS[s.active]
  const b = s.briefs[s.active]
  const spec = toSpec(b)
  const warnings = chartWarnings(spec)

  const edit = (patch: Partial<BriefState>) => {
    setVerdict(null)
    setS((p) => ({ ...p, briefs: p.briefs.map((x, i) => (i === p.active ? { ...x, ...patch } : x)) }))
  }

  const submit = () => {
    const r = chartRubric(brief, spec)
    setVerdict(r)
    const ok = passes(r)
    decisions.current.push({ label: `${brief.title}: ${spec.type}(${spec.x}${spec.y ? `, ${spec.y}` : ''})`, good: ok, explanation: r.reason })
    ui.log({ title: `${brief.title}: ${r.verdict}`, detail: r.reason, tone: ok ? 'good' : 'bad' })
    edit(ok ? { solved: true } : { wrong: b.wrong + 1 })
    setVerdict(r)
  }

  const wrongTotal = s.briefs.reduce((a, x) => a + x.wrong, 0)
  const allSolved = s.briefs.every((x) => x.solved)
  const finish = () => {
    if (done.current || !allSolved) return
    done.current = true
    ui.completeObjective('l5-obj-charts')
    const finalSpecs = BRIEFS.map((br, i) => ({ br, r: chartRubric(br, toSpec(s.briefs[i])) }))
    const appropriate = finalSpecs.filter((f) => f.r.verdict === 'appropriate').length
    const summary: Decision[] = finalSpecs.map((f) => ({ label: `${f.br.title} final chart: ${f.r.verdict}`, good: f.r.verdict === 'appropriate' ? true : null, explanation: f.r.reason }))
    onComplete({
      id,
      accuracy: clamp01((appropriate + 0.75 * (BRIEFS.length - appropriate)) / BRIEFS.length),
      decisionQuality: clamp01(1 / (1 + 0.5 * wrongTotal)),
      efficiency: clamp01(Math.max(0.3, BRIEFS.length / (BRIEFS.length + wrongTotal))),
      hintsUsed: 0,
      mistakes: wrongTotal,
      decisions: [...summary, ...decisions.current],
      extra: { wrongCharts: wrongTotal, appropriateCharts: appropriate },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel eyebrow="Briefs" title="CHART STUDIO">
        <div className="space-y-2" role="tablist" aria-label="briefs">
          {BRIEFS.map((br, i) => (
            <button key={br.id} type="button" role="tab" aria-selected={i === s.active} data-testid={`brief-${br.id}`}
              onClick={() => { setVerdict(null); setS((p) => ({ ...p, active: i })) }}
              className={cn('block w-full rounded border p-2 text-left', i === s.active ? 'border-cyan' : 'border-border')}>
              <GoalCard done={s.briefs[i].solved} label={`${br.title}: ${br.question}`} />
            </button>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted">wrong choices: {wrongTotal}</p>
        <NeonButton className="mt-2" data-testid="s2-finish" disabled={!allSolved} tooltip={allSolved ? undefined : 'Solve all four briefs first'} onClick={finish}>PUBLISH BOARD</NeonButton>
      </Panel>

      <Panel eyebrow={`Brief ${s.active + 1}/4`} title={brief.title}>
        <p className="text-sm text-muted">{brief.question}</p>
        <div className="mt-3 space-y-3">
          <ChipGroup label="chart" options={CHART_TYPES} value={b.type} onChange={(type) => edit({ type })} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="x / group" value={b.x} options={COLS} onChange={(x) => edit({ x })} testId="s2-x" />
            <Select label="y / value" value={b.y} options={['', ...COLS]} onChange={(y) => edit({ y })} testId="s2-y" />
          </div>
          {b.type === 'histogram' && (
            <label className="block font-mono text-[11px] text-muted">bins: {b.bins}
              <input type="range" min={BIN_MIN} max={BIN_MAX} value={b.bins} aria-label="bins" data-testid="s2-bins" className="ml-2 align-middle accent-cyan"
                onChange={(e) => edit({ bins: Number(e.target.value) })} />
            </label>
          )}
          {b.type === 'bar' && (
            <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <input type="checkbox" checked={b.zero} data-testid="s2-zero" onChange={(e) => edit({ zero: e.target.checked })} /> y-axis starts at zero
            </label>
          )}
          {warnings.map((w) => <p key={w} className="flex items-center gap-1 text-xs text-amber"><AlertTriangle size={12} aria-hidden="true" />{w}</p>)}
          <ChartPreview spec={spec} rows={rows} />
          <CodeLine code={chartCode(spec)} />
          <NeonButton data-testid="s2-submit" disabled={b.solved} tooltip={b.solved ? 'Brief already solved' : undefined} onClick={submit}>SUBMIT CHART</NeonButton>
          {verdict && (
            <div aria-live="polite" data-testid="s2-verdict" className={cn('rounded border p-2 text-xs', passes(verdict) ? 'border-green/50' : 'border-red/50')}>
              <p className="flex items-center gap-2">
                {passes(verdict) ? <CheckCircle2 size={14} className="text-green" aria-hidden="true" /> : <XCircle size={14} className="text-red" aria-hidden="true" />}
                <Badge tone={verdict.verdict === 'appropriate' ? 'green' : verdict.verdict === 'acceptable' ? 'amber' : 'red'}>{verdict.verdict}</Badge>
              </p>
              <p className="mt-1 text-muted">{verdict.reason}</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}

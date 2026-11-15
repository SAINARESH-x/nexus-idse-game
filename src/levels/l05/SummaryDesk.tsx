// Stage 1 KNOW YOUR DATA: GroupBy builder with pinned answers, live distribution strip and the mean-vs-median call.
import { useMemo, useRef, useState } from 'react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed, useStageState } from '../../shell/stageState'
import { BoxPlot, Histogram } from '../../components/charts'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { Badge, NeonButton, Panel, Stat } from '../../ui'
import type { AggFn } from '../../engine/stats'
import { CATEGORY_COLUMNS, NUMERIC_COLUMNS, fmt, l05Cohort, numericValues } from './data'
import type { NumericColumn } from './data'
import { AGG_FNS, GROUP_GOALS, describeColumn, groupByCode, judgePin, runGroupBy } from './describe'
import type { GroupGoal } from './describe'
import { STAGE1_INITIAL } from './state'
import type { Stage1State } from './state'
import { CodeLine, GoalCard, Select, clamp01 } from './deskUi'

export function SummaryDesk({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(5)
  const rows = useMemo(() => l05Cohort(seed), [seed])
  const ui = useMissionUi()
  const [s, setS] = useStageState<Stage1State>(id, STAGE1_INITIAL)
  const [feedback, setFeedback] = useState<string | null>(null)
  const done = useRef(false)
  const spec = { by: s.by, col: s.col, fn: s.fn }
  const result = useMemo(() => runGroupBy(rows, { by: s.by, col: s.col, fn: s.fn }), [rows, s.by, s.col, s.fn])
  const dist = useMemo(() => describeColumn(numericValues(rows, s.distCol)), [rows, s.distCol])
  const study = useMemo(() => describeColumn(numericValues(rows, 'study_hours')), [rows])

  const pin = (goal: GroupGoal, key: string) => {
    const verdict = judgePin(rows, goal, spec, key)
    if (verdict === 'correct') {
      setS((p) => ({ ...p, [goal.id === 'a' ? 'goalA' : 'goalB']: true }))
      setFeedback(`Goal ${goal.id.toUpperCase()} confirmed: ${key} (${groupByCode(goal.spec)}).`)
      ui.log({ title: `Goal ${goal.id.toUpperCase()} confirmed`, detail: `${key} tops ${groupByCode(goal.spec)}`, tone: 'good' })
      return
    }
    setS((p) => ({ ...p, mistakes: p.mistakes + 1 }))
    setFeedback(
      verdict === 'wrong-query'
        ? `Your table is ${groupByCode(spec)}, but goal ${goal.id.toUpperCase()} asks: ${goal.label} Build that query first.`
        : `${key} is not the highest value in this table. Read the value column again.`,
    )
    ui.log({ title: 'Pinned answer rejected', detail: verdict, tone: 'bad' })
  }

  const scenario: ChoiceScenario = {
    id: 'typical',
    title: 'A TYPICAL STUDENT',
    prompt: `The Dean wants one number for "how many hours a typical student studies per week". study_hours has skew ${study.skew.toFixed(2)}. Which statistic do you report?`,
    options: [
      {
        id: 'mean', label: 'Report the mean', code: "df['study_hours'].mean()", correct: false,
        simulate: () => ({ ok: true, output: `mean = ${fmt(study.mean)} h. ${countBelow(numericValues(rows, 'study_hours'), study.mean)} of 240 students study less than this "typical" value.` }),
        explanation: 'The long right tail drags the mean upward, so most students sit below it. It describes the total, not a typical student.',
      },
      {
        id: 'median', label: 'Report the median', code: "df['study_hours'].median()", correct: true,
        simulate: () => ({ ok: true, output: `median = ${fmt(study.median)} h. Exactly half the cohort studies less, half more; the tail does not move it.` }),
        explanation: 'For right-skewed data the median is robust to the heavy tail and matches a typical student.',
      },
    ],
  }

  const allDone = s.goalA && s.goalB && s.goalC
  const finish = () => {
    if (done.current || !allDone) return
    done.current = true
    ui.completeObjective('l5-obj-profile')
    const decisions: Decision[] = [
      { label: 'Median cgpa by department', good: true, explanation: 'groupby + median compares departments without letting a few extreme students dominate.' },
      { label: 'Dropout rate by year', good: true, explanation: 'The mean of a 0/1 column is a rate, so groupby(year).mean() gives the dropout rate per year.' },
      { label: `Typical study time: ${s.choice ?? 'median'}`, good: true, explanation: 'study_hours is right-skewed (mean above median), so the median represents a typical student.' },
    ]
    onComplete({
      id, accuracy: 1, decisionQuality: clamp01(1 / (1 + 0.5 * s.mistakes)), efficiency: clamp01(Math.max(0.3, 3 / (3 + s.mistakes))),
      hintsUsed: 0, mistakes: s.mistakes, decisions, extra: { profileMistakes: s.mistakes },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel eyebrow="Desk A" title="GROUPBY BUILDER">
        <div className="grid grid-cols-3 gap-2">
          <Select label="group by" value={s.by} options={CATEGORY_COLUMNS} onChange={(by) => setS((p) => ({ ...p, by }))} testId="gb-by" />
          <Select label="value" value={s.col} options={NUMERIC_COLUMNS} onChange={(col) => setS((p) => ({ ...p, col }))} testId="gb-col" />
          <Select<AggFn> label="aggregate" value={s.fn} options={AGG_FNS} onChange={(fn) => setS((p) => ({ ...p, fn }))} testId="gb-fn" />
        </div>
        <div className="mt-3"><CodeLine code={groupByCode(spec)} testId="gb-code" /></div>
        <table className="mt-3 w-full font-mono text-xs" aria-label="group-by result">
          <thead><tr className="text-left text-muted"><th>{s.by}</th><th>{s.fn}({s.col})</th><th>n</th><th><span className="sr-only">pin</span></th></tr></thead>
          <tbody>
            {result.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-1 text-text">{r.key}</td>
                <td className="text-cyan">{fmt(r.value, 3)}</td>
                <td className="text-muted">{r.n}</td>
                <td className="space-x-1 text-right">
                  {GROUP_GOALS.map((g) => (
                    <button key={g.id} type="button" data-testid={`pin-${g.id}-${r.key}`} onClick={() => pin(g, r.key)}
                      disabled={g.id === 'a' ? s.goalA : s.goalB}
                      className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:border-cyan disabled:opacity-40">
                      pin {g.id.toUpperCase()}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {feedback && <p aria-live="polite" className="mt-2 text-xs text-amber">{feedback}</p>}
        <div className="mt-3 space-y-2">
          {GROUP_GOALS.map((g) => <GoalCard key={g.id} testId={`goal-${g.id}`} done={g.id === 'a' ? s.goalA : s.goalB} label={`(${g.id}) ${g.label}`} />)}
        </div>
      </Panel>

      <Panel eyebrow="Desk B" title="DISTRIBUTION STRIP">
        <Select<NumericColumn> label="column" value={s.distCol} options={NUMERIC_COLUMNS} onChange={(distCol) => setS((p) => ({ ...p, distCol }))} testId="dist-col" />
        <Histogram values={numericValues(rows, s.distCol)} binCount={14} xLabel={s.distCol}
          markers={[{ x: dist.mean, label: 'mean', colour: 'magenta' }, { x: dist.median, label: 'median', colour: 'green' }]} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="dist-stats">
          <Stat label="mean" value={fmt(dist.mean)} tone="magenta" />
          <Stat label="median" value={fmt(dist.median)} tone="green" />
          <Stat label="mode" value={dist.mode === undefined ? 'n/a' : fmt(dist.mode, 1)} />
          <Stat label="std" value={fmt(dist.std)} hint={`variance ${fmt(dist.variance)}`} />
          <Stat label="IQR" value={fmt(dist.iqr)} hint={`Q1 ${fmt(dist.q1)} · Q3 ${fmt(dist.q3)}`} tone="amber" />
        </div>
        <p className="mt-2 text-xs text-muted" data-testid="skew-note"><Badge tone={dist.shape === 'roughly symmetric' ? 'green' : 'amber'}>{dist.shape}</Badge> {dist.note}</p>
        <p className="mt-1 text-[11px] text-muted">Mode on a one-decimal continuous column is fragile: many values tie at one or two occurrences.</p>
        <BoxPlot groups={[{ label: s.distCol, values: numericValues(rows, s.distCol) }]} yLabel={s.distCol} />
        <CodeLine code={`df['${s.distCol}'].describe(); df['${s.distCol}'].var(); df['${s.distCol}'].mode()[0]; df['${s.distCol}'].skew()`} />
      </Panel>

      <Panel eyebrow="Desk C" title="MEAN OR MEDIAN?" className="lg:col-span-2">
        <GoalCard testId="goal-c" done={s.goalC} label="(c) Describe a typical student's study_hours">
          {s.goalC ? (
            <p className="text-xs text-muted">Reported the median ({fmt(study.median)} h) instead of the mean ({fmt(study.mean)} h).</p>
          ) : (
            <ChoiceSimulator
              scenarios={[scenario]}
              onChoice={(_sc, opt, correct) => { if (!correct) setS((p) => ({ ...p, mistakes: p.mistakes + 1 })); else setS((p) => ({ ...p, choice: opt.id === 'median' ? 'median' : 'mean' })) }}
              onComplete={() => setS((p) => ({ ...p, goalC: true }))}
            />
          )}
        </GoalCard>
        <div className="mt-3 flex items-center gap-3">
          <NeonButton data-testid="s1-finish" disabled={!allDone} tooltip={allDone ? undefined : 'Complete goals a, b and c first'} onClick={finish}>FILE PROFILE</NeonButton>
          <span className="font-mono text-[11px] text-muted">mistakes: {s.mistakes}</span>
        </div>
      </Panel>
    </div>
  )
}

function countBelow(values: readonly number[], threshold: number): number {
  return values.filter((v) => v < threshold).length
}

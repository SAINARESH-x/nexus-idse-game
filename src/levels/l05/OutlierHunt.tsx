// Side op OUTLIER HUNT: box plot of study_hours with 6 injected entry errors, an IQR multiplier and keep/cap/remove.
import { useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { useLevelSeed } from '../../shell/stageState'
import { BoxPlot } from '../../components/charts'
import { NeonButton, Panel, Stat } from '../../ui'
import { describeColumn } from './describe'
import { fmt, l05Cohort } from './data'
import { actionCode, applyAction, injectOutliers, scoreOutliers } from './outliers'
import type { OutlierAction } from './outliers'
import { ChipGroup, CodeLine, GoalCard, clamp01, pct } from './deskUi'

const ACTIONS: OutlierAction[] = ['keep', 'cap', 'remove']
const ACTION_NOTE: Record<OutlierAction, { good: boolean | null; text: string }> = {
  keep: { good: false, text: 'Keeping confirmed entry errors leaves impossible values that inflate the mean and the std.' },
  cap: { good: null, text: 'Capping (winsorising) keeps the row but invents a value at the fence; acceptable, but the true value is still unknown.' },
  remove: { good: true, text: 'These six are confirmed data-entry errors, so removing them is safe. A real extreme value would deserve to stay.' },
}

export function OutlierHunt({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(5)
  const rows = useMemo(() => l05Cohort(seed), [seed])
  const data = useMemo(() => injectOutliers(rows, seed), [rows, seed])
  const ui = useMissionUi()
  const [k, setK] = useState(3)
  const [action, setAction] = useState<OutlierAction | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const done = useRef(false)
  const score = useMemo(() => scoreOutliers(data, k), [data, k])
  const after = action ? applyAction(data, score, action) : data.values
  const before = describeColumn(data.values)
  const post = describeColumn(after)

  const submit = () => {
    if (done.current || !action) return
    if (score.recall < 1) {
      setMistakes((m) => m + 1)
      setMsg(`${data.injected.length - score.tp} injected error(s) are still inside the fence at k = ${k}. Lower k.`)
      return
    }
    done.current = true
    ui.completeObjective('l5-side-2-obj')
    const note = ACTION_NOTE[action]
    const decisions: Decision[] = [
      { label: `IQR fence at k = ${k}`, good: score.precision >= 0.75 ? true : null, explanation: `Caught all 6 errors; precision ${pct(score.precision)}. At k = 1.5 the natural right tail of study_hours is flagged too, which is why precision drops: unusual is not the same as wrong.` },
      { label: `Action: ${action}`, good: note.good, explanation: note.text },
    ]
    onComplete({
      id, accuracy: clamp01((score.precision + score.recall) / 2), decisionQuality: note.good === true ? 1 : note.good === null ? 0.7 : 0.3,
      efficiency: clamp01(Math.max(0.3, 1 / (1 + mistakes))), hintsUsed: 0, mistakes, decisions,
      extra: { k, precision: Math.round(score.precision * 100) / 100, action },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel eyebrow="Desk" title="STUDY_HOURS BOX PLOT">
        <BoxPlot groups={[{ label: 'study_hours', values: data.values }]} k={k} yLabel="hours / week" />
        <label className="block font-mono text-[11px] text-muted">IQR multiplier k = {k.toFixed(1)}
          <input type="range" min={0.5} max={8} step={0.5} value={k} aria-label="IQR multiplier k" data-testid="k-slider" className="ml-2 align-middle accent-cyan"
            onChange={(e) => { setMsg(null); setK(Number(e.target.value)) }} />
        </label>
        <CodeLine code={actionCode(k, action ?? 'keep')} />
      </Panel>
      <Panel eyebrow="Readout" title="DETECTION">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="flagged" value={score.flagged.length} hint={`fence > ${fmt(score.upper)}`} />
          <Stat label="precision" value={<span data-testid="precision">{score.precisionDefined ? pct(score.precision) : 'n/a'}</span>} />
          <Stat label="recall" value={<span data-testid="recall">{pct(score.recall)}</span>} tone={score.recall === 1 ? 'green' : 'amber'} />
        </div>
        <p className="mt-2 flex items-start gap-1 text-xs text-amber"><AlertTriangle size={12} className="mt-0.5" aria-hidden="true" />Real extreme values can be valid. study_hours has a natural right tail, so a tight fence also flags honest students.</p>
        <div className="mt-3"><ChipGroup label="action" options={ACTIONS} value={action} onChange={setAction} /></div>
        {action && <p className="mt-1 text-xs text-muted">{ACTION_NOTE[action].text}</p>}
        <p className="mt-2 font-mono text-[11px] text-muted">mean {fmt(before.mean)} → {fmt(post.mean)} · std {fmt(before.std)} → {fmt(post.std)} · rows {data.values.length} → {after.length}</p>
        <div className="mt-3"><GoalCard done={false} label="Catch all 6 injected errors (recall 100%) and choose an action" /></div>
        {msg && <p aria-live="polite" className="mt-2 text-xs text-red">{msg}</p>}
        <NeonButton className="mt-3" data-testid="outlier-submit" disabled={!action} tooltip={action ? undefined : 'Choose keep, cap or remove'} onClick={submit}>SUBMIT CLEAN-UP</NeonButton>
      </Panel>
    </div>
  )
}

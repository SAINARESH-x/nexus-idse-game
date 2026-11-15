// Level 06 side op DISTRIBUTION DETECTIVE: name four histogram shapes and their mean-vs-median relation; feedback from the data.
import { useMemo, useRef, useState } from 'react'
import type { ChallengeProps } from '../../game/types'
import { Histogram } from '../../components/charts/Histogram'
import { useLevelSeed } from '../../shell/stageState'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { SHAPES, detectiveCases, type Relation, type ShapeId } from './distributions'
import { CodeLine } from './LabBench'
import { buildResult } from './results'

const RELATIONS: { id: Relation; label: string }[] = [
  { id: 'above', label: 'mean above median' },
  { id: 'below', label: 'mean below median' },
  { id: 'equal', label: 'about equal' },
]

interface Answer {
  shape: ShapeId | ''
  relation: Relation | ''
}

const EMPTY: Answer = { shape: '', relation: '' }

export function DistributionDetective({ id, onComplete }: ChallengeProps) {
  const seed = useLevelSeed(6)
  const cases = useMemo(() => detectiveCases(seed), [seed])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [checked, setChecked] = useState<Record<string, boolean> | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [checks, setChecks] = useState(0)
  const done = useRef(false)
  const ui = useMissionUi()

  const set = (key: string, p: Partial<Answer>) => setAnswers((a) => ({ ...a, [key]: { ...(a[key] ?? EMPTY), ...p } }))
  const complete = cases.every((c) => answers[c.key]?.shape && answers[c.key]?.relation)

  const check = () => {
    const result: Record<string, boolean> = {}
    for (const c of cases) result[c.key] = answers[c.key]?.shape === c.shape && answers[c.key]?.relation === c.relation
    const wrong = Object.values(result).filter((ok) => !ok).length
    setChecked(result)
    setChecks((n) => n + 1)
    setMistakes((m) => m + wrong)
    if (wrong === 0 && !done.current) {
      done.current = true
      ui.completeObjective('l6-side-1-obj')
      onComplete(
        buildResult(id, {
          mistakes: mistakes,
          steps: 8,
          runs: checks + 1,
          parRuns: 1,
          decisions: cases.map((c) => ({
            label: `${c.key}: ${c.shape}`,
            good: true,
            explanation: `mean ${c.mean.toFixed(2)}, median ${c.median.toFixed(2)}: ${c.relation === 'above' ? 'the right tail pulls the mean up' : 'symmetric, so they nearly agree'}.`,
          })),
        }),
      )
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="distribution-detective">
      <p className="text-sm text-muted">Four seeded datasets of 600 values. Name each shape and where its mean sits. Feedback compares mean and median computed from the data.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {cases.map((c) => (
          <section key={c.key} className="rounded-lg border border-border bg-panel p-3" aria-label={`dataset ${c.key}`}>
            <Histogram title={`Dataset ${c.key}`} values={c.values} binCount={20} xLabel="value" />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="font-mono text-xs text-muted">
                shape{' '}
                <select value={answers[c.key]?.shape ?? ''} onChange={(e) => set(c.key, { shape: e.target.value as ShapeId })} data-testid={`shape-${c.key}`} className="rounded border border-border bg-panel2 px-1 text-text">
                  <option value="">choose</option>
                  {SHAPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="font-mono text-xs text-muted">
                mean vs median{' '}
                <select value={answers[c.key]?.relation ?? ''} onChange={(e) => set(c.key, { relation: e.target.value as Relation })} data-testid={`relation-${c.key}`} className="rounded border border-border bg-panel2 px-1 text-text">
                  <option value="">choose</option>
                  {RELATIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
            </div>
            {checked && (
              <p className={`mt-1 text-xs ${checked[c.key] ? 'text-green' : 'text-red'}`}>
                {checked[c.key] ? 'Correct' : 'Not yet'}: mean {c.mean.toFixed(2)}, median {c.median.toFixed(2)}.
              </p>
            )}
          </section>
        ))}
      </div>
      <ul className="text-xs text-muted">{SHAPES.map((s) => <li key={s.id}><b className="text-text">{s.label}</b>: {s.description}</li>)}</ul>
      <CodeLine code="s.mean(), s.median(), s.skew()" label="pandas" />
      <NeonButton onClick={check} disabled={!complete} tooltip={!complete ? 'Answer all four datasets first' : undefined} data-testid="detective-check">CHECK</NeonButton>
    </div>
  )
}

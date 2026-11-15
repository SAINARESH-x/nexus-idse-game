// Level 06 Stage 3a: hypothesis lab, null chips, statistic, 1/10/1000 shuffle permutation test, alpha, validated verdict, re-runs.
import { useMemo, useState } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { Histogram } from '../../components/charts/Histogram'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ALPHAS, SHUFFLE_OPTIONS, VERDICT_SHUFFLES } from './config'
import { QUESTIONS } from './content'
import { BenchPanel, CodeLine, Readout, Segmented, f3 } from './LabBench'
import type { VerdictState } from './stageStates'
import { correctVerdict, hypothesisGroups, permSeed, permutationTest, validateVerdict, type Question, type Verdict } from './statsLab'
import type { Patch } from './usePatchState'

export function HypothesisPanel({ rows, seed, state, patch }: { rows: readonly CohortStudent[]; seed: number; state: VerdictState; patch: Patch<VerdictState> }) {
  const q = QUESTIONS[state.question]
  const groups = useMemo(() => hypothesisGroups(rows, state.question), [rows, state.question])
  const test = useMemo(
    () => (state.shuffles > 0 ? permutationTest(groups.a, groups.b, state.shuffles, permSeed(seed, state.rerun)) : null),
    [groups, state.shuffles, seed, state.rerun],
  )
  const [note, setNote] = useState<string | null>(null)
  const locked = state.verdictDone

  const chooseQuestion = (v: Question) => {
    if (locked) return
    patch({ question: v, nullChip: null, statistic: null, shuffles: 0, verdict: null })
    setNote(null)
  }
  const pickChip = (chipId: string) => {
    const chip = q.chips.find((c) => c.id === chipId)
    if (!chip || state.nullChip) return
    setNote(chip.why)
    if (chip.correct) patch({ nullChip: chip.id })
    else patch((s) => ({ miss: { ...s.miss, a: s.miss.a + 1 } }))
  }
  const pickStatistic = (v: 'means' | 'rates') => {
    if (state.statistic) return
    if (v === groups.statistic) {
      patch({ statistic: v })
      setNote(v === 'means' ? 'cgpa is numeric: compare the difference in means.' : 'dropped_out is 0/1: the mean of a 0/1 column is a rate, so compare rates.')
    } else {
      patch((s) => ({ miss: { ...s.miss, a: s.miss.a + 1 } }))
      setNote(v === 'rates' ? 'cgpa is not a yes/no outcome; a rate does not describe it.' : 'dropped_out is 0/1: its mean is a rate. Use the difference in rates.')
    }
  }
  const decide = (v: Verdict) => {
    if (!test || state.shuffles !== VERDICT_SHUFFLES || locked) return
    if (validateVerdict(test.pValue, state.alpha, v)) {
      patch({ verdict: v, verdictDone: true })
      setNote(`Verdict validated: p = ${f3(test.pValue)} ${test.pValue <= state.alpha ? '<=' : '>'} alpha ${state.alpha}.`)
    } else {
      patch((s) => ({ miss: { ...s.miss, a: s.miss.a + 1 } }))
      setNote(`p = ${f3(test.pValue)} and alpha = ${state.alpha}. Reject H0 if and only if p <= alpha.`)
    }
  }
  const rerun = () =>
    patch((s) => {
      const next = s.rerun + 1
      const p = permutationTest(groups.a, groups.b, VERDICT_SHUFFLES, permSeed(seed, next)).pValue
      return { rerun: next, reruns: s.reruns + 1, shuffles: VERDICT_SHUFFLES, stable: s.stable && correctVerdict(p, s.alpha) === s.verdict }
    })

  const obs = test?.observed ?? NaN
  return (
    <BenchPanel title="A. HYPOTHESIS LAB" goal="state H0, pick the statistic, run 1000 shuffles and deliver a verdict that matches p" done={state.verdictDone} testId="panel-hypothesis">
      <Segmented<Question> label="question" value={state.question} options={['attendance', 'scholarship']} format={(v) => QUESTIONS[v].title} onChange={chooseQuestion} testId="question" />
      <CodeLine code={q.code} label="pandas" />
      <div className="mt-3 flex flex-col gap-2" role="group" aria-label="null hypothesis chips">
        <span className="font-mono text-xs text-muted">1. state the null hypothesis</span>
        {q.chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pickChip(c.id)}
            disabled={Boolean(state.nullChip)}
            aria-pressed={state.nullChip === c.id}
            data-testid={`chip-${c.id}`}
            className={cn('rounded border px-3 py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan', state.nullChip === c.id ? 'border-green text-green' : 'border-border text-text')}
          >
            {c.text}
          </button>
        ))}
      </div>
      {state.nullChip && (
        <div className="mt-3"><Segmented<'means' | 'rates'> label="2. statistic" value={state.statistic} options={['means', 'rates']} format={(v) => `difference in ${v}`} onChange={pickStatistic} testId="statistic" /></div>
      )}
      {state.statistic && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">3. shuffle the labels</span>
          {SHUFFLE_OPTIONS.map((s) => (
            <NeonButton key={s} size="sm" variant={state.shuffles === s ? 'primary' : 'ghost'} onClick={() => patch({ shuffles: s })} disabled={locked && s !== VERDICT_SHUFFLES} data-testid={`shuffle-${s}`}>
              RUN {s}
            </NeonButton>
          ))}
          <Segmented label="alpha" value={state.alpha} options={ALPHAS} onChange={(v) => !locked && patch({ alpha: v })} testId="alpha" />
        </div>
      )}
      {test && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Readout label={`observed (${groups.labelA} - ${groups.labelB})`} value={f3(obs)} tone="magenta" />
            <Readout label="shuffles" value={state.shuffles} />
            <Readout label="p-value" value={test.pValue.toFixed(4)} tone="cyan" />
            <Readout label="smallest possible p" value={(1 / (state.shuffles + 1)).toFixed(4)} />
          </div>
          <Histogram
            title="Null distribution: differences after shuffling labels"
            values={test.nulls}
            binCount={state.shuffles >= 100 ? 20 : 5}
            xLabel={`difference in ${groups.statistic}`}
            markers={[{ x: obs, label: 'observed', colour: 'magenta' }, { x: -obs, label: '-observed', colour: 'muted' }]}
            highlight={(b) => Math.abs(b.x0) >= Math.abs(obs) || Math.abs(b.x1) >= Math.abs(obs)}
          />
          <CodeLine code={`scipy.stats.permutation_test((a, b), lambda x, y: x.mean() - y.mean(), n_resamples=${state.shuffles})  # p = ${test.pValue.toFixed(4)}`} label="scipy" />
          {state.shuffles < VERDICT_SHUFFLES && <p className="mt-1 text-xs text-amber">With {state.shuffles} shuffle(s) p cannot go below {(1 / (state.shuffles + 1)).toFixed(3)}. Run 1000 before deciding.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {(['reject', 'retain'] as const).map((v) => (
              <NeonButton key={v} size="sm" variant={state.verdict === v ? 'primary' : 'ghost'} onClick={() => decide(v)} disabled={state.shuffles !== VERDICT_SHUFFLES || locked} tooltip={state.shuffles !== VERDICT_SHUFFLES ? 'Run 1000 shuffles first' : undefined} data-testid={`verdict-${v}`}>
                {v === 'reject' ? 'REJECT H0' : 'DO NOT REJECT H0'}
              </NeonButton>
            ))}
            {locked && (
              <NeonButton size="sm" onClick={rerun} data-testid="rerun">RE-RUN WITH NEW SEED</NeonButton>
            )}
          </div>
          {locked && (
            <p className="mt-2 font-mono text-xs text-muted" data-testid="rerun-status">
              Re-runs: {state.reruns}. Verdict at alpha {state.alpha}: {correctVerdict(test.pValue, state.alpha) === 'reject' ? 'REJECT' : 'DO NOT REJECT'} ({state.stable ? 'unchanged' : 'changed'}).
            </p>
          )}
        </>
      )}
      {note && <p className="mt-2 text-sm text-muted" role="status">{note}</p>}
      {locked && <p className="mt-2 text-sm text-green">A small p-value says this difference would be rare if H0 were true. It does not measure the size of the effect or prove a cause.</p>}
    </BenchPanel>
  )
}

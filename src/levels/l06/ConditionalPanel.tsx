// Level 06 Stage 1b: a two-way table, computing P(dropout | attendance < 60), direction of conditioning and independence.
import { useMemo, useState } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { ChoiceSimulator, type ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { NeonButton } from '../../ui/NeonButton'
import { BenchPanel, CodeLine, Segmented, f3, pct } from './LabBench'
import { conditionals, marginCount, tableRatio, twoWayTable, type CellId, type MarginId, type TwoWay } from './probability'
import type { ProbabilityState } from './stageStates'
import type { Patch } from './usePatchState'

const CELL_LABEL: Record<CellId, string> = {
  rc: 'att<60 & dropout',
  rNotC: 'att<60 & stayed',
  notRc: 'att>=60 & dropout',
  notRNotC: 'att>=60 & stayed',
}
const MARGIN_LABEL: Record<MarginId, string> = {
  R: 'all att<60',
  notR: 'all att>=60',
  C: 'all dropouts',
  notC: 'all stayed',
  all: 'all 2000',
}
const CELLS: readonly CellId[] = ['rc', 'rNotC', 'notRc', 'notRNotC']
const MARGINS: readonly MarginId[] = ['R', 'notR', 'C', 'notC', 'all']

/** What the player actually computed, in words. */
export function describeRatio(num: CellId, den: MarginId): string {
  if (num === 'rc' && den === 'R') return 'P(dropout | att<60)'
  if (num === 'rc' && den === 'C') return 'P(att<60 | dropout)'
  if (num === 'rc' && den === 'all') return 'P(att<60 and dropout), a joint probability'
  return `${CELL_LABEL[num]} / ${MARGIN_LABEL[den]}`
}

export function conditionalScenarios(t: TwoWay): ChoiceScenario[] {
  const c = conditionals(t)
  const nLow = marginCount(t, 'R')
  const nDrop = marginCount(t, 'C')
  const bigger = c.pCgivenR > c.pRgivenC ? 'dropGivenLow' : 'lowGivenDrop'
  const out = (txt: string) => () => ({ ok: true, output: txt })
  return [
    {
      id: 'direction',
      title: 'Which conditional is larger?',
      prompt: `Both share the same numerator (${t.rc} students). Which is larger: P(dropout | att<60) or P(att<60 | dropout)?`,
      options: [
        { id: 'dropGivenLow', label: 'P(dropout | att<60)', code: `${t.rc} / ${nLow}`, correct: bigger === 'dropGivenLow', simulate: out(`P(dropout | att<60) = ${t.rc}/${nLow} = ${f3(c.pCgivenR)}`), explanation: `The smaller denominator wins: there are ${nLow} low attenders and ${nDrop} dropouts.` },
        { id: 'lowGivenDrop', label: 'P(att<60 | dropout)', code: `${t.rc} / ${nDrop}`, correct: bigger === 'lowGivenDrop', simulate: out(`P(att<60 | dropout) = ${t.rc}/${nDrop} = ${f3(c.pRgivenC)}`), explanation: `The smaller denominator wins: there are ${nLow} low attenders and ${nDrop} dropouts.` },
        { id: 'same', label: 'They are equal: same students', correct: false, simulate: out(`${f3(c.pCgivenR)} vs ${f3(c.pRgivenC)}: not equal`), explanation: 'P(A|B) = P(A and B) / P(B) and P(B|A) = P(A and B) / P(A). They match only when P(A) = P(B).' },
      ],
    },
    {
      id: 'independence',
      title: 'Independence check',
      prompt: `P(dropout) = ${f3(c.pC)} overall, P(dropout | att<60) = ${f3(c.pCgivenR)}. Are dropout and low attendance independent?`,
      options: [
        { id: 'dependent', label: 'No: conditioning changes the probability', code: 'p_d_given_low != p_d', correct: true, simulate: out(`P(D|L) / P(D) = ${(c.pCgivenR / c.pC).toFixed(2)}x`), explanation: 'Independence means P(A|B) = P(A). Here knowing attendance multiplies the dropout risk.' },
        { id: 'independent', label: 'Yes: both are just properties of students', correct: false, simulate: out(`Under independence P(D|L) would be ${f3(c.pC)}, observed ${f3(c.pCgivenR)}`), explanation: 'Independence is a numerical condition, P(A|B) = P(A), and it fails here.' },
      ],
    },
    {
      id: 'misread',
      title: 'The dean reads the report',
      prompt: `A report says "${pct(c.pRgivenC, 0)} of dropouts had attendance below 60". The dean concludes "${pct(c.pRgivenC, 0)} of low attenders drop out". Run it.`,
      options: [
        { id: 'swap', label: 'Wrong: that swaps P(A|B) for P(B|A)', correct: true, simulate: out(`Low attenders who drop out: ${pct(c.pCgivenR)} (not ${pct(c.pRgivenC)})`), explanation: 'The report conditions on dropouts; the dean needs the rate among low attenders. Different denominators.' },
        { id: 'fine', label: 'Fine: same table, same number', correct: false, simulate: out(`Actual P(dropout | att<60) = ${pct(c.pCgivenR)}`), explanation: 'This is the confusion of the inverse (the prosecutor\'s fallacy).' },
      ],
    },
  ]
}

export function ConditionalPanel({ rows, state, patch }: { rows: readonly CohortStudent[]; state: ProbabilityState; patch: Patch<ProbabilityState> }) {
  const t = useMemo(() => twoWayTable(rows, (r) => r.attendance < 60, (r) => r.dropped_out === 1), [rows])
  const scenarios = useMemo(() => conditionalScenarios(t), [t])
  const [feedback, setFeedback] = useState<string | null>(null)

  const check = () => {
    if (!state.num || !state.den) return
    const value = tableRatio(t, state.num, state.den)
    if (state.num === 'rc' && state.den === 'R') {
      setFeedback(`Correct: P(dropout | att<60) = ${t.rc} / ${marginCount(t, 'R')} = ${f3(value)}`)
      patch({ bComputed: true })
    } else {
      setFeedback(`You computed ${describeRatio(state.num, state.den)} = ${f3(value)}. Condition on att<60: only those students form the denominator.`)
      patch((s) => ({ miss: { ...s.miss, b: s.miss.b + 1 } }))
    }
  }

  const cell = (id: CellId) => (
    <td className={`border border-border px-2 py-1 text-right ${state.num === id ? 'bg-cyan/15 text-cyan' : ''}`}>{t[id]}</td>
  )
  const margin = (id: MarginId) => (
    <td className={`border border-border px-2 py-1 text-right text-muted ${state.den === id ? 'bg-magenta/15 text-magenta' : ''}`}>{marginCount(t, id)}</td>
  )

  return (
    <BenchPanel title="B. CONDITIONAL PROBABILITY" goal="compute P(dropout | att<60), then run the three consequences" done={state.bDone} testId="panel-conditional">
      <table className="font-mono text-xs" aria-label="two-way table of attendance and dropout">
        <thead>
          <tr><th className="px-2 text-left text-muted"> </th><th className="px-2">dropout</th><th className="px-2">stayed</th><th className="px-2 text-muted">total</th></tr>
        </thead>
        <tbody>
          <tr><th className="px-2 text-left">att &lt; 60</th>{cell('rc')}{cell('rNotC')}{margin('R')}</tr>
          <tr><th className="px-2 text-left">att &gt;= 60</th>{cell('notRc')}{cell('notRNotC')}{margin('notR')}</tr>
          <tr><th className="px-2 text-left text-muted">total</th>{margin('C')}{margin('notC')}{margin('all')}</tr>
        </tbody>
      </table>
      <CodeLine code="pd.crosstab(df.attendance < 60, df.dropped_out, margins=True)" label="pandas" />
      {!state.bComputed ? (
        <div className="mt-3 flex flex-col gap-2">
          <Segmented label="numerator" value={state.num} options={CELLS} format={(v) => CELL_LABEL[v]} onChange={(v) => patch({ num: v })} testId="numerator" />
          <Segmented label="denominator" value={state.den} options={MARGINS} format={(v) => MARGIN_LABEL[v]} onChange={(v) => patch({ den: v })} testId="denominator" />
          <div>
            <NeonButton size="sm" onClick={check} disabled={!state.num || !state.den} tooltip={!state.num || !state.den ? 'Pick a numerator and a denominator first' : undefined} data-testid="check-conditional">
              CHECK RATIO
            </NeonButton>
          </div>
        </div>
      ) : null}
      {feedback && <p className={`mt-2 text-sm ${state.bComputed ? 'text-green' : 'text-amber'}`} role="status">{feedback}</p>}
      {state.bComputed && !state.bDone && (
        <div className="mt-3">
          <CodeLine code="df[df.attendance < 60].dropped_out.mean()  # P(dropout | att<60)" label="pandas" />
          <ChoiceSimulator
            scenarios={scenarios}
            onComplete={(sum) => patch((s) => ({ bDone: true, miss: { ...s.miss, b: s.miss.b + sum.mistakes } }))}
          />
        </div>
      )}
      {state.bDone && <p className="mt-2 text-sm text-green">P(A | B) divides by the size of B. Swap the condition and you divide by something else.</p>}
    </BenchPanel>
  )
}

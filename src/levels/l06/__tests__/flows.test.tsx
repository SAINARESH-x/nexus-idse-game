// Level 06 RTL flows: each lab bench stage and side op progresses to completion with honest results.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChallengeResult } from '../../../game/types'
import { sessionSeed } from '../../../game/levelSession'
import { BINOM_N_MAX, BINOM_TARGET_K, BINOM_TARGET_P, FISHING_ALPHA } from '../config'
import { targetP } from '../BinomialPanel'
import { CoverageCasino } from '../CoverageCasino'
import { DistributionDetective } from '../DistributionDetective'
import { detectiveCases } from '../distributions'
import { l06Population } from '../population'
import { conditionals, smallestNForTail, twoWayTable } from '../probability'
import { ProbabilityLab } from '../ProbabilityLab'
import { SamplingLab } from '../SamplingLab'
import { fishingTrip } from '../statsLab'
import { VerdictLab } from '../VerdictLab'

const SEED = sessionSeed(6, 0) // useLevelSeed outside a persistent mission with 0 attempts
const rows = l06Population(SEED)
type C = typeof ProbabilityLab
const mount = (Comp: C, id: string) => {
  const results: ChallengeResult[] = []
  render(<Comp id={id} difficulty="assisted" hints={[]} onComplete={(r) => results.push(r)} />)
  return results
}
const radio = (group: string, name: string | RegExp) => fireEvent.click(within(screen.getByTestId(group)).getByRole('radio', { name }))
const choose = (scenario: string, option: string) => {
  fireEvent.click(screen.getByTestId(`choice-${scenario}-${option}`))
  fireEvent.click(screen.getByTestId('choice-continue'))
}

describe('Level 06 stage flows', () => {
  it('PROBABILITY LAB completes a, b and c', () => {
    const results = mount(ProbabilityLab, 'l6-stage-1')
    radio('connector', 'AND')
    fireEvent.click(screen.getByTestId('lln-run'))
    expect(screen.getByText(/GOAL MET: build a compound event/)).toBeInTheDocument()

    radio('numerator', 'att<60 & dropout')
    radio('denominator', 'all dropouts')
    fireEvent.click(screen.getByTestId('check-conditional'))
    expect(screen.getByRole('status')).toHaveTextContent('P(att<60 | dropout)')
    radio('denominator', 'all att<60')
    fireEvent.click(screen.getByTestId('check-conditional'))
    const c = conditionals(twoWayTable(rows, (r) => r.attendance < 60, (r) => r.dropped_out === 1))
    choose('direction', c.pCgivenR > c.pRgivenC ? 'dropGivenLow' : 'lowGivenDrop')
    choose('independence', 'dependent')
    choose('misread', 'swap')

    const p = targetP(rows)
    const n = smallestNForTail(p, BINOM_TARGET_K, BINOM_TARGET_P, BINOM_N_MAX) ?? 0
    fireEvent.change(screen.getByTestId('binom-p'), { target: { value: String(p) } })
    fireEvent.change(screen.getByTestId('binom-n'), { target: { value: String(n + 1) } })
    fireEvent.click(screen.getByTestId('binom-run'))
    fireEvent.click(screen.getByTestId('binom-submit'))
    expect(results).toHaveLength(0)
    fireEvent.change(screen.getByTestId('binom-n'), { target: { value: String(n) } })
    fireEvent.click(screen.getByTestId('binom-submit'))
    expect(results).toHaveLength(1)
    expect(results[0].mistakes).toBe(2)
    expect(results[0].decisions).toHaveLength(3)
  })

  it('SAMPLING LAB completes SE, bias and CI goals', () => {
    const results = mount(SamplingLab, 'l6-stage-2')
    fireEvent.change(screen.getByTestId('sample-n'), { target: { value: '500' } })
    fireEvent.click(screen.getByTestId('sampling-run'))
    expect(screen.getByText(/SE goal met/)).toBeInTheDocument()
    radio('method', 'convenience')
    fireEvent.click(screen.getByTestId('sampling-run'))
    choose('bigger', 'random')
    radio('ci-n', '400')
    for (let i = 0; i < 5 && results.length === 0; i += 1) fireEvent.click(screen.getByTestId('ci-run'))
    expect(results).toHaveLength(1)
    expect(results[0].mistakes).toBe(0)
  })

  it('THE VERDICT validates the verdict, replicates and reports facts', () => {
    const results = mount(VerdictLab, 'l6-stage-3')
    fireEvent.click(screen.getByTestId('chip-att-alt'))
    fireEvent.click(screen.getByTestId('chip-att-null'))
    radio('statistic', 'difference in means')
    fireEvent.click(screen.getByTestId('shuffle-10'))
    expect(screen.getByTestId('verdict-reject')).toBeDisabled()
    fireEvent.click(screen.getByTestId('shuffle-1000'))
    fireEvent.click(screen.getByTestId('verdict-retain'))
    fireEvent.click(screen.getByTestId('verdict-reject'))
    for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByTestId('rerun'))
    expect(screen.getByTestId('rerun-status')).toHaveTextContent('Re-runs: 3')
    expect(screen.getByTestId('rerun-status')).toHaveTextContent('unchanged')
    expect(screen.getByTestId('file-report')).toBeDisabled()
    choose('fishing', 'multiple')
    const hit = fishingTrip(rows, SEED).comparisons.find((x) => x.p < FISHING_ALPHA)
    fireEvent.click(screen.getByTestId(`flag-${hit?.id ?? 0}`))
    fireEvent.click(screen.getByTestId('apply-bonferroni'))
    expect(screen.getByTestId('bonferroni-result')).toHaveTextContent('0 comparison(s) survive')
    fireEvent.click(screen.getByTestId('file-report'))
    expect(results).toHaveLength(1)
    expect(results[0].mistakes).toBe(2)
    expect(results[0].extra).toMatchObject({ l6Reruns: 3, l6VerdictStable: true, l6FalsePositiveFlagged: true })
  })

  it('DISTRIBUTION DETECTIVE completes when all four are right', () => {
    const results = mount(DistributionDetective, 'l6-side-1')
    for (const c of detectiveCases(SEED)) {
      fireEvent.change(screen.getByTestId(`shape-${c.key}`), { target: { value: c.shape } })
      fireEvent.change(screen.getByTestId(`relation-${c.key}`), { target: { value: c.shape === 'skewed' ? 'below' : c.relation } })
    }
    fireEvent.click(screen.getByTestId('detective-check'))
    expect(results).toHaveLength(0)
    const skew = detectiveCases(SEED).find((c) => c.shape === 'skewed')
    fireEvent.change(screen.getByTestId(`relation-${skew?.key ?? 'A'}`), { target: { value: 'above' } })
    fireEvent.click(screen.getByTestId('detective-check'))
    expect(results).toHaveLength(1)
    expect(results[0].mistakes).toBe(1)
  })

  it('COVERAGE CASINO completes after two levels and the explanation', () => {
    const results = mount(CoverageCasino, 'l6-side-2')
    fireEvent.click(screen.getByTestId('cov-run'))
    radio('cov-level', '80%')
    fireEvent.click(screen.getByTestId('cov-run'))
    expect(screen.getByTestId('levels-run')).toHaveTextContent('95%, 80%')
    choose('meaning', 'method')
    expect(results).toHaveLength(1)
  })
})

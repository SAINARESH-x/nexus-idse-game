// Level 06 content: stages, side ops (three progressive hints each), objectives and hypothesis chips.
import type { SideOpDef, StageDef } from '../../game/types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'
import type { Question } from './statsLab'

export const L06_STAGES: StageDef[] = [
  {
    id: 'l6-stage-1',
    title: 'PROBABILITY LAB',
    subtitle: 'Events, conditional probability and the binomial law',
    hints: [
      'P(A) is a count divided by the population size: (df[...] condition).mean() does exactly that.',
      'For P(A | B) the denominator is the number of students in B, not all 2000. Swap the condition and the denominator changes.',
      'P(X >= k) = 1 - P(X <= k - 1). Set p to the cohort dropout rate, then grow n until the tail reaches 0.5.',
    ],
  },
  {
    id: 'l6-stage-2',
    title: 'SAMPLING LAB',
    subtitle: 'Random vs convenience samples, standard error, confidence intervals',
    hints: [
      'The standard error is sigma / sqrt(n): to halve it you need four times the sample size.',
      'A convenience sample is drawn from the wrong frame. More students from the wrong frame are still the wrong students.',
      'An interval is mean +- z * s / sqrt(n). If it misses, DRAW AGAIN: about 5 in 100 honest 95% intervals miss.',
    ],
  },
  {
    id: 'l6-stage-3',
    title: 'THE VERDICT',
    subtitle: 'Permutation tests, p-values and multiple comparisons',
    hints: [
      'The null hypothesis says the groups do not differ; shuffling the group labels simulates exactly that world.',
      'With 10 shuffles the smallest possible p-value is 1/11. Run 1000 before you decide. Reject only if p <= alpha.',
      'Twenty tests at alpha 0.05 expect about one false positive on pure noise. Bonferroni tests each at 0.05 / 20.',
    ],
  },
]

export const L06_SIDE_OPS: SideOpDef[] = [
  {
    id: 'l6-side-1',
    title: 'DISTRIBUTION DETECTIVE',
    blurb: 'Four histograms, four shapes. Name each one and say where its mean sits relative to the median.',
    hints: [
      'Count the humps first: one, two, or none (flat).',
      'A long right tail pulls the mean above the median; the median ignores how far the tail goes.',
      'Symmetric shapes (normal, uniform, symmetric bimodal) have mean and median about equal.',
    ],
  },
  {
    id: 'l6-side-2',
    title: 'COVERAGE CASINO',
    blurb: 'Deal 100 confidence intervals and count how many catch the true mean. Then trade width for confidence.',
    hints: [
      'A 95% interval method catches the true mean in about 95 of 100 samples, not every time.',
      'Higher confidence means a larger z, so a wider interval.',
      'A larger n shrinks the width by sqrt(n) without changing the coverage rate.',
    ],
  },
]

export const L06_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l6-obj-events', label: 'Build an event and watch its frequency converge' },
  { id: 'l6-obj-conditional', label: 'Compute a conditional probability and test independence' },
  { id: 'l6-obj-binomial', label: 'Find the group size that makes two dropouts likely' },
  { id: 'l6-obj-se', label: 'Reach a standard error of 0.10 with random sampling' },
  { id: 'l6-obj-bias', label: 'Show that a convenience sample stays biased' },
  { id: 'l6-obj-ci', label: 'Catch the true dropout rate in a confidence interval' },
  { id: 'l6-obj-verdict', label: 'Deliver a verdict that matches the p-value' },
  { id: 'l6-obj-fishing', label: 'Survive the fishing trip with Bonferroni' },
]

export const L06_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l6-side-1': [{ id: 'l6-side-1-obj', label: 'Classify all four distributions' }],
  'l6-side-2': [
    { id: 'l6-side-2-run', label: 'Deal 100 intervals at 95%' },
    { id: 'l6-side-2-compare', label: 'Compare a second confidence level' },
    { id: 'l6-side-2-explain', label: 'Explain what 95% confidence means' },
  ],
}

export interface NullChip {
  id: string
  text: string
  correct: boolean
  why: string
}

export const QUESTIONS: Record<Question, { title: string; code: string; chips: NullChip[] }> = {
  attendance: {
    title: 'Do students with attendance >= 75 have a higher cgpa?',
    code: "df[df.attendance >= 75].cgpa.mean() - df[df.attendance < 75].cgpa.mean()",
    chips: [
      { id: 'att-null', text: 'H0: mean cgpa is the same in both attendance groups', correct: true, why: 'The null states no difference; the test asks how surprising the data are under it.' },
      { id: 'att-alt', text: 'H0: high attenders have a higher mean cgpa', correct: false, why: 'That is the alternative hypothesis, the claim you want evidence for.' },
      { id: 'att-sample', text: 'H0: the two sample means are exactly equal', correct: false, why: 'Hypotheses are about the population, not the numbers you already observed.' },
    ],
  },
  scholarship: {
    title: 'Do scholarship students drop out less?',
    code: "df[df.scholarship == 'Yes'].dropped_out.mean() - df[df.scholarship == 'No'].dropped_out.mean()",
    chips: [
      { id: 'sch-null', text: 'H0: the dropout rate is the same with or without a scholarship', correct: true, why: 'The null states no difference between the rates.' },
      { id: 'sch-cause', text: 'H0: scholarships cause students to stay', correct: false, why: 'A causal claim is not a null hypothesis, and this observational data cannot prove causation.' },
      { id: 'sch-sample', text: 'H0: the observed rates are exactly equal', correct: false, why: 'Hypotheses are about the population, not the numbers you already observed.' },
    ],
  },
}

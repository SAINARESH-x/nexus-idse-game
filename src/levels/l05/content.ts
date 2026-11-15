// Level 05 content: stages, side ops (3 hints each) and mission objectives for FIND THE PATTERN.
import type { SideOpDef, StageDef } from '../../game/types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'

export const L05_STAGES: StageDef[] = [
  {
    id: 'l5-stage-1',
    title: 'KNOW YOUR DATA',
    subtitle: 'Group, summarise and read the shape',
    hints: [
      'Set the builder to the column you group BY, the column you measure, and the aggregation the question names.',
      'A dropout rate is the mean of a 0/1 column: df.groupby(\'year\')[\'dropped_out\'].mean().',
      'study_hours has a long right tail (skew above 0.5): a few heavy studiers drag the mean up, the median stays put.',
    ],
  },
  {
    id: 'l5-stage-2',
    title: 'CHOOSE THE RIGHT CHART',
    subtitle: 'Four briefs, one honest chart each',
    hints: [
      'One numeric column: histogram. Numeric across categories: box plot. Two numeric columns: scatter.',
      'A rate per group is one number per group: bars of mean(dropped_out), starting at zero.',
      'Lines imply order between points; bars must start at zero; about 10 to 20 bins suit 240 values.',
    ],
  },
  {
    id: 'l5-stage-3',
    title: 'FIND THE PATTERN',
    subtitle: 'Brush, quantify, correlate, report',
    hints: [
      'Look at the binned dropout bars: where does the rate jump? Brush the attendance range left of that jump.',
      'Lift = rate inside the selection / overall rate. You need lift 2 or more and at least 15% of students.',
      'library_visits tracks study_hours. Split by study_hours bands: if r shrinks inside each band, study time is the confounder.',
    ],
  },
]

export const L05_SIDE_OPS: SideOpDef[] = [
  {
    id: 'l5-side-1',
    title: 'MISLEADING CHART',
    blurb: 'Three charts from a rival report are dishonest. Fix the axis, the bins and the range until each tells the truth.',
    hints: [
      'Bar length encodes the value, so the axis must start at zero.',
      'Too few bins merge separate peaks into one block; add bins until the shape stops changing.',
      'A short window can show a trend the full series does not have. Show all the data you have.',
    ],
  },
  {
    id: 'l5-side-2',
    title: 'OUTLIER HUNT',
    blurb: 'Six study_hours entries were typed wrong. Tune the IQR fence and decide what to do with what it catches.',
    hints: [
      'Tukey fences sit at Q1 - k*IQR and Q3 + k*IQR. Smaller k flags more points.',
      'Precision = injected among flagged; recall = flagged among injected. At k = 1.5 the natural right tail costs precision.',
      'Values above 40 hours a week are impossible here: those are entry errors, and removing a confirmed error is safe.',
    ],
  },
]

export const L05_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l5-obj-profile', label: 'Profile the cohort: group-by goals and the mean-versus-median call' },
  { id: 'l5-obj-charts', label: 'Solve all four chart briefs with an honest chart' },
  { id: 'l5-obj-pattern', label: 'Brush a high-dropout range (lift 2+, coverage 15%+) and report a valid insight' },
  { id: 'l5-obj-corr', label: 'Check library_visits against cgpa for a confounder' },
]

export const L05_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l5-side-1': [{ id: 'l5-side-1-obj', label: 'Make all three charts honest' }],
  'l5-side-2': [{ id: 'l5-side-2-obj', label: 'Catch every injected error (recall 1) and choose an action' }],
}

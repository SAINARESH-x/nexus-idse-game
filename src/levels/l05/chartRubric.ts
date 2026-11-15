// Level 05 chart rubric (pure): judges a chart type plus column assignment against a brief.
import { isCategoryColumn, isNumericColumn } from './data'

export type ChartType = 'histogram' | 'bar' | 'box' | 'scatter' | 'line'
export const CHART_TYPES: ChartType[] = ['histogram', 'bar', 'box', 'scatter', 'line']
export type Verdict = 'appropriate' | 'acceptable' | 'misleading'

export interface ChartSpec {
  type: ChartType
  x: string
  y: string
  bins: number
  startAtZero: boolean
}

export interface Brief {
  id: string
  title: string
  question: string
  /** Columns the brief is about; the chart must use exactly these. */
  x: string
  y: string
}

export const BRIEFS: Brief[] = [
  { id: 'shape', title: 'SHAPE OF ATTENDANCE', question: 'Show the shape (distribution) of attendance.', x: 'attendance', y: '' },
  { id: 'compare', title: 'CGPA BY DEPARTMENT', question: 'Compare cgpa across the four departments.', x: 'department', y: 'cgpa' },
  { id: 'relate', title: 'ATTENDANCE AND CGPA', question: 'Show the relationship between attendance and cgpa.', x: 'attendance', y: 'cgpa' },
  { id: 'rate', title: 'DROPOUT BY YEAR', question: 'Show the dropout rate by year of study.', x: 'year', y: 'dropped_out' },
]

export const BIN_MIN = 2
export const BIN_MAX = 60

export interface RubricResult {
  verdict: Verdict
  reason: string
  /** Non-fatal computed warnings (bins, baseline). */
  warnings: string[]
}

/** Warnings that apply whatever the brief: too few or too many bins, a truncated bar axis. */
export function chartWarnings(spec: ChartSpec, n = 240): string[] {
  const out: string[] = []
  if (spec.type === 'histogram') {
    if (spec.bins < 5) out.push(`Only ${spec.bins} bins: the shape is smoothed away and peaks can disappear.`)
    const perBin = n / Math.max(1, spec.bins)
    if (perBin < 6) out.push(`${spec.bins} bins for ${n} values is about ${perBin.toFixed(1)} per bin: the bars become noise.`)
  }
  if (spec.type === 'bar' && !spec.startAtZero) {
    out.push('The y-axis does not start at zero: bar LENGTH no longer matches the value, so small gaps look huge.')
  }
  return out
}

const ordered = (c: string): boolean => c === 'year' || isNumericColumn(c)

/** Judge a chart. Structural misuse is misleading; a chart that answers another question is misleading for this brief. */
export function chartRubric(brief: Brief, spec: ChartSpec): RubricResult {
  const warnings = chartWarnings(spec)
  const bad = (reason: string): RubricResult => ({ verdict: 'misleading', reason, warnings })
  const { type, x, y } = spec
  // Structural rules first: these are wrong for any brief.
  if (type === 'bar' && isNumericColumn(x) && x !== 'dropped_out')
    return bad(`A bar per raw ${x} value draws hundreds of bars with no grouping; use a histogram to show a continuous column.`)
  if (type === 'line' && isCategoryColumn(x) && !ordered(x))
    return bad(`A line joins points in order, but ${x} categories have no order: the slope between them means nothing.`)
  if (type === 'scatter' && !(isNumericColumn(x) && isNumericColumn(y)))
    return bad('A scatter plot needs two numeric columns, one per axis.')
  if (type === 'histogram' && !isNumericColumn(x)) return bad('A histogram bins a numeric column; categories need a bar chart of counts.')
  if (type === 'box' && y !== '' && !isNumericColumn(y)) return bad('A box plot summarises a numeric column.')
  if ((type === 'bar' || type === 'line') && y !== '' && !isNumericColumn(y)) return bad('The value axis needs a numeric column to aggregate.')
  // Does it answer the brief?
  const usesColumns = x === brief.x && y === brief.y
  const sameColumnsAsBox = type === 'box' && brief.id === 'shape' && x === 'attendance'
  if (!usesColumns && !sameColumnsAsBox) {
    const wanted = brief.y ? `${brief.x} (x) and ${brief.y} (y)` : `${brief.x} alone`
    return bad(`This chart is about other columns. The brief needs ${wanted}.`)
  }
  if (type === 'bar' && !spec.startAtZero) return bad('Bars must start at zero; a truncated axis exaggerates differences between groups.')
  switch (brief.id) {
    case 'shape':
      if (type === 'histogram')
        return spec.bins < 5
          ? bad(`With ${spec.bins} bins the histogram hides the shape. Use more bins (about 10 to 20 for 240 students).`)
          : { verdict: 'appropriate', reason: 'A histogram shows where values pile up and how the tail behaves.', warnings }
      if (type === 'box')
        return { verdict: 'acceptable', reason: 'A box plot shows median, quartiles and outliers, but hides peaks inside the box.', warnings }
      return bad('One column\'s shape is a distribution: a histogram (or a box plot) shows it.')
    case 'compare':
      if (type === 'box') return { verdict: 'appropriate', reason: 'Side-by-side boxes compare medians AND spread per department.', warnings }
      if (type === 'bar') return { verdict: 'acceptable', reason: 'Bars of the mean compare centres but hide the spread inside each department.', warnings }
      return bad('Comparing a numeric column across categories needs boxes (or bars of a summary).')
    case 'relate':
      if (type === 'scatter') return { verdict: 'appropriate', reason: 'A scatter plot shows every student as a point: direction, strength and outliers at once.', warnings }
      if (type === 'line') return bad('A line joins students in attendance order and draws a zig-zag that suggests a trend line that is not there.')
      return bad('Two numeric columns are related in a scatter plot.')
    case 'rate':
      if (type === 'bar') return { verdict: 'appropriate', reason: 'Bars of mean(dropped_out) per year show the rate per group, from zero.', warnings }
      if (type === 'line') return { verdict: 'acceptable', reason: 'Years are ordered, so a line is readable, though bars are clearer for four groups.', warnings }
      return bad('A rate per group is a single number per group: use bars of mean(dropped_out).')
    default:
      return bad('Unknown brief.')
  }
}

export const passes = (r: RubricResult): boolean => r.verdict !== 'misleading'

export function chartCode(spec: ChartSpec): string {
  switch (spec.type) {
    case 'histogram':
      return `df['${spec.x}'].plot.hist(bins=${spec.bins})`
    case 'box':
      return spec.y ? `df.boxplot(column='${spec.y}', by='${spec.x}')` : `df.boxplot(column='${spec.x}')`
    case 'scatter':
      return `df.plot.scatter(x='${spec.x}', y='${spec.y}')`
    case 'bar':
      return spec.y ? `df.groupby('${spec.x}')['${spec.y}'].mean().plot.bar()` : `df['${spec.x}'].plot.bar()`
    case 'line':
      return spec.y ? `df.groupby('${spec.x}')['${spec.y}'].mean().plot.line()` : `df['${spec.x}'].plot.line()`
  }
}

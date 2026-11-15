// Level 05 live chart preview: draws what the chosen chart type and columns would really produce.
import type { CohortStudent } from '../../engine/cohort'
import { groupAgg } from '../../engine/stats'
import type { RecordRow } from '../../engine/stats'
import { BarChart, BoxPlot, Histogram, LineChart, Scatter } from '../../components/charts'
import type { ChartSpec } from './chartRubric'
import { isCategoryColumn, isNumericColumn } from './data'

const val = (r: CohortStudent, c: string): string | number => (r as unknown as Record<string, string | number>)[c]
const asRecords = (rows: readonly CohortStudent[]) => rows as unknown as readonly RecordRow[]

export function ChartPreview({ spec, rows }: { spec: ChartSpec; rows: readonly CohortStudent[] }) {
  const { type, x, y } = spec
  const blank = (why: string) => <p className="rounded border border-dashed border-border p-6 text-center text-xs text-muted" data-testid="preview-blank">Cannot draw: {why}</p>
  if (type === 'histogram') {
    if (!isNumericColumn(x)) return blank(`${x} is not numeric.`)
    return <Histogram values={rows.map((r) => Number(val(r, x)))} binCount={spec.bins} xLabel={x} />
  }
  if (type === 'scatter') {
    if (!isNumericColumn(x) || !isNumericColumn(y)) return blank('a scatter plot needs two numeric columns.')
    return <Scatter points={rows.map((r) => ({ x: Number(val(r, x)), y: Number(val(r, y)) }))} xLabel={x} yLabel={y} />
  }
  if (type === 'box') {
    if (y === '' && isNumericColumn(x)) return <BoxPlot groups={[{ label: x, values: rows.map((r) => Number(val(r, x))) }]} yLabel={x} />
    if (!isCategoryColumn(x) || !isNumericColumn(y)) return blank('a box plot needs a numeric value per category.')
    const keys = groupAgg(asRecords(rows), x, y, 'count').map((g) => g.key)
    return <BoxPlot groups={keys.map((k) => ({ label: k, values: rows.filter((r) => String(val(r, x)) === k).map((r) => Number(val(r, y))) }))} yLabel={y} />
  }
  if (type === 'bar') {
    if (isNumericColumn(x) && x !== 'dropped_out') {
      const head = rows.slice(0, 40)
      return <BarChart categories={head.map((r) => r.student_id)} values={head.map((r) => Number(val(r, x)))} startAtZero={spec.startAtZero} yLabel={x} title="first 40 rows" />
    }
    const g = groupAgg(asRecords(rows), x, y === '' ? x : y, y === '' ? 'count' : 'mean')
    return <BarChart categories={g.map((r) => r.key)} values={g.map((r) => r.value)} startAtZero={spec.startAtZero} xLabel={x} yLabel={y === '' ? 'count' : `mean ${y}`} />
  }
  // line
  if (y === '' || !isNumericColumn(y)) return blank('a line needs a numeric value column.')
  if (isNumericColumn(x)) {
    const pts = rows.map((r) => ({ x: Number(val(r, x)), y: Number(val(r, y)) })).sort((a, b) => a.x - b.x)
    return <LineChart series={[{ name: y, points: pts }]} xLabel={x} yLabel={y} />
  }
  const g = groupAgg(asRecords(rows), x, y, 'mean')
  return <LineChart series={[{ name: `mean ${y}`, points: g.map((r, i) => ({ x: x === 'year' ? Number(r.key) : i + 1, y: r.value })) }]} xLabel={x === 'year' ? x : `${x} (index ${g.map((r) => r.key).join(', ')})`} yLabel={y} integerX />
}

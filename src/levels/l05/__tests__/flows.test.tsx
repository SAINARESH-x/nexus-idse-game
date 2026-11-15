// Level 05 RTL flows: each stage and side-op component rendered directly and completed (or progressed).
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChallengeResult } from '../../../game/types'
import { sessionSeed } from '../../../game/levelSession'
import { l05Cohort } from '../data'
import { GROUP_GOALS, runGroupBy, topKeys } from '../describe'
import { brushStats } from '../pattern'
import { MAGNITUDE_CHIPS } from '../insightCheck'
import { SummaryDesk } from '../SummaryDesk'
import { ChartStudio } from '../ChartStudio'
import { PatternHunt } from '../PatternHunt'
import { MisleadingChart } from '../MisleadingChart'
import { OutlierHunt } from '../OutlierHunt'

// Outside a mission useLevelSeed uses attempts 0 -> slot 0.
const rows = l05Cohort(sessionSeed(5, 0))
const props = (id: string, out: ChallengeResult[]) => ({ id, difficulty: 'assisted' as const, hints: [], onComplete: (r: ChallengeResult) => out.push(r) })
const choose = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } })
const chip = (group: string, name: string) => fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('button', { name }))

describe('Stage 1 SummaryDesk', () => {
  it('rejects a wrong pin, then completes all goals', () => {
    const out: ChallengeResult[] = []
    render(<SummaryDesk {...props('l5-stage-1', out)} />)
    expect(screen.getByTestId('skew-note')).toHaveTextContent('right-skewed')
    const [ga, gb] = GROUP_GOALS
    const topA = topKeys(runGroupBy(rows, ga.spec))[0]
    fireEvent.click(screen.getByTestId(`pin-a-${topA}`)) // builder still shows mean -> wrong query
    expect(screen.getByTestId('goal-a')).toHaveAttribute('data-done', 'false')
    choose('gb-fn', 'median')
    expect(screen.getByTestId('gb-code')).toHaveTextContent("df.groupby('department')['cgpa'].median()")
    fireEvent.click(screen.getByTestId(`pin-a-${topA}`))
    expect(screen.getByTestId('goal-a')).toHaveAttribute('data-done', 'true')
    choose('gb-by', 'year'); choose('gb-col', 'dropped_out'); choose('gb-fn', 'mean')
    fireEvent.click(screen.getByTestId(`pin-b-${topKeys(runGroupBy(rows, gb.spec))[0]}`))
    expect(screen.getByTestId('goal-b')).toHaveAttribute('data-done', 'true')
    fireEvent.click(screen.getByTestId('choice-typical-mean'))
    fireEvent.click(screen.getByTestId('choice-typical-median'))
    fireEvent.click(screen.getByTestId('choice-continue'))
    fireEvent.click(screen.getByTestId('s1-finish'))
    expect(out).toHaveLength(1)
    expect(out[0].mistakes).toBe(2)
    expect(out[0].accuracy).toBe(1)
  })
})

describe('Stage 2 ChartStudio', () => {
  it('counts a wrong chart, then solves all four briefs', () => {
    const out: ChallengeResult[] = []
    render(<ChartStudio {...props('l5-stage-2', out)} />)
    const plan: [string, string, string, string][] = [
      ['shape', 'histogram', 'attendance', ''],
      ['compare', 'box', 'department', 'cgpa'],
      ['relate', 'scatter', 'attendance', 'cgpa'],
      ['rate', 'bar', 'year', 'dropped_out'],
    ]
    fireEvent.click(screen.getByTestId('s2-submit')) // default bar of department for shape brief: wrong
    expect(screen.getByTestId('s2-verdict')).toHaveTextContent('misleading')
    for (const [b, type, x, y] of plan) {
      fireEvent.click(screen.getByTestId(`brief-${b}`))
      chip('chart', type); choose('s2-x', x); choose('s2-y', y)
      fireEvent.click(screen.getByTestId('s2-submit'))
      expect(screen.getByTestId('s2-verdict')).toHaveTextContent('appropriate')
    }
    fireEvent.click(screen.getByTestId('s2-finish'))
    expect(out).toHaveLength(1)
    expect(out[0].extra?.wrongCharts).toBe(1)
    expect(out[0].mistakes).toBe(1)
  })
})

describe('Stage 3 PatternHunt', () => {
  it('brushes 35-60, verifies the insight, runs the confounder check and completes', () => {
    const out: ChallengeResult[] = []
    render(<PatternHunt {...props('l5-stage-3', out)} />)
    expect(screen.getByTestId('goal-range')).toHaveAttribute('data-done', 'false')
    fireEvent.change(screen.getByTestId('brush-from'), { target: { value: '35' } })
    fireEvent.change(screen.getByTestId('brush-to'), { target: { value: '60' } })
    expect(screen.getByTestId('goal-range')).toHaveAttribute('data-done', 'true')
    const st = brushStats(rows, [35, 60])
    const mag = [...MAGNITUDE_CHIPS].sort((a, b) => Math.abs(a - st.lift) - Math.abs(b - st.lift))[0]
    chip('variable', 'attendance'); chip('direction', 'below'); chip('magnitude', `${mag}x`)
    chip('caveat', '(no caveat)')
    fireEvent.click(screen.getByTestId('insight-check'))
    expect(screen.getByTestId('goal-insight')).toHaveAttribute('data-done', 'false')
    chip('caveat', 'This is an association, not proof of cause.')
    fireEvent.click(screen.getByTestId('insight-check'))
    expect(screen.getByTestId('goal-insight')).toHaveAttribute('data-done', 'true')
    choose('corr-x', 'library_visits')
    fireEvent.change(screen.getByTestId('corr-bands'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('choice-library-confound'))
    fireEvent.click(screen.getByTestId('choice-continue'))
    fireEvent.click(screen.getByTestId('s3-finish'))
    expect(out).toHaveLength(1)
    expect(out[0].mistakes).toBe(1)
    expect(out[0].extra).toMatchObject({ selLo: 35, selHi: 60 })
    expect(typeof out[0].extra?.dropoutCliff).toBe('boolean')
  })
})

describe('Side ops', () => {
  it('Misleading Chart: early mark is a mistake, three fixes complete it', () => {
    const out: ChallengeResult[] = []
    render(<MisleadingChart {...props('l5-side-1', out)} />)
    fireEvent.click(screen.getByTestId('mark-axis'))
    fireEvent.click(screen.getByTestId('fix-zero'))
    fireEvent.click(screen.getByTestId('mark-axis'))
    fireEvent.change(screen.getByTestId('fix-bins'), { target: { value: '12' } })
    fireEvent.click(screen.getByTestId('mark-bins'))
    chip('window', 'all')
    fireEvent.click(screen.getByTestId('mark-range'))
    fireEvent.click(screen.getByTestId('mis-finish'))
    expect(out).toHaveLength(1)
    expect(out[0].mistakes).toBe(1)
  })
  it('Outlier Hunt: wide fence refused, k = 1.5 with remove completes', () => {
    const out: ChallengeResult[] = []
    render(<OutlierHunt {...props('l5-side-2', out)} />)
    fireEvent.change(screen.getByTestId('k-slider'), { target: { value: '8' } })
    expect(screen.getByTestId('precision')).toHaveTextContent('n/a')
    chip('action', 'remove')
    fireEvent.click(screen.getByTestId('outlier-submit'))
    expect(out).toHaveLength(0)
    fireEvent.change(screen.getByTestId('k-slider'), { target: { value: '1.5' } })
    expect(screen.getByTestId('recall')).toHaveTextContent('100.0%')
    fireEvent.click(screen.getByTestId('outlier-submit'))
    expect(out).toHaveLength(1)
    expect(out[0].mistakes).toBe(1)
    expect(out[0].extra?.action).toBe('remove')
  })
})

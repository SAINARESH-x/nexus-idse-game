// Render tests for the SVG charts: no crashes on empty/one-point/NaN data, computed aria summaries, brush keyboard.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BarChart, BoxPlot, Histogram, LineChart, Scatter, boxStats } from '..'

const label = (c: HTMLElement): string => c.querySelector('svg')?.getAttribute('aria-label') ?? ''

describe('charts', () => {
  it('Scatter summarises r and handles degenerate data', () => {
    const { container } = render(
      <Scatter points={[{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6, category: 'b' }]} xLabel="att" yLabel="cgpa"
        line={{ slope: 2, intercept: 0 }} showResiduals />,
    )
    expect(label(container)).toContain('3 points')
    expect(label(container)).toContain('r = 1')
    for (const pts of [[], [{ x: 1, y: 1 }], [{ x: NaN, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 5 }]]) {
      const r = render(<Scatter points={pts} />)
      expect(label(r.container)).toContain('r = n/a')
    }
  })
  it('Scatter brush responds to arrow keys', () => {
    const onBrush = vi.fn()
    render(<Scatter points={[{ x: 0, y: 0 }, { x: 100, y: 1 }]} onBrush={onBrush} brushStep={5} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onBrush).toHaveBeenLastCalledWith([5, 30])
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true })
    expect(onBrush).toHaveBeenLastCalledWith([5, 35])
    fireEvent.keyDown(slider, { key: 'Escape' })
    expect(onBrush).toHaveBeenLastCalledWith(null)
  })
  it('Histogram', () => {
    const { container } = render(<Histogram values={[1, 2, 2, 3]} binCount={2} markers={[{ x: 2, label: 'mean' }]} />)
    expect(label(container)).toContain('4 values in 2 bins')
    expect(label(container)).toContain('mean at 2')
    expect(label(render(<Histogram values={[]} />).container)).toContain('0 values')
    expect(label(render(<Histogram values={[7, 7, 7]} />).container)).toContain('3 values in 1 bins')
  })
  it('BarChart', () => {
    const { container } = render(
      <BarChart categories={['A', 'B']} values={[0.1, 0.4]} highlighted={['B']} threshold={{ value: 0.2, label: '2x' }} startAtZero={false} />,
    )
    expect(label(container)).toContain('highest B at 0.4')
    expect(label(container)).toContain('does not start at zero')
    expect(label(render(<BarChart categories={[]} values={[]} />).container)).toContain('0 categories')
    render(<BarChart categories={['x']} values={[NaN]} />)
  })
  it('BoxPlot and boxStats', () => {
    const s = boxStats('g', [1, 2, 3, 4, 100])
    expect(s.outliers).toEqual([100])
    expect(s.whiskerHi).toBe(4)
    const { container } = render(<BoxPlot groups={[{ label: 'g', values: [1, 2, 3, 4, 100] }, { label: 'e', values: [] }]} />)
    expect(label(container)).toContain('g: n 5, median 3')
    expect(label(container)).toContain('1 outlier')
    render(<BoxPlot groups={[{ label: 'c', values: [5, 5, 5] }]} />)
  })
  it('LineChart', () => {
    const { container } = render(
      <LineChart integerX markedX={{ x: 3, label: 'best' }} series={[
        { name: 'train', points: [{ x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }] },
        { name: 'validation', points: [{ x: 1, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 2.5 }] },
      ]} />,
    )
    expect(label(container)).toContain('train: 3 points, minimum 1 at x = 3')
    expect(label(render(<LineChart series={[]} />).container)).toContain('0 series')
    render(<LineChart series={[{ name: 'one', points: [{ x: 1, y: 1 }] }]} />)
  })
})

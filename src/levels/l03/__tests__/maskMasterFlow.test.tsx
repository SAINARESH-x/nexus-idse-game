// Integration tests: Mask Master editing, IQR reveal, live thresholds, confusion matrix and completion rule.
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ChallengeResult } from '../../../game/types'
import { L03_MASK_MASTER_ANOMALIES, L03_MASK_MASTER_VALUES } from '../content'
import { MaskMasterChallenge } from '../MaskMasterChallenge'

const setup = () => {
  const results: ChallengeResult[] = []
  const user = userEvent.setup()
  render(
    <MaskMasterChallenge id="l3-side-2" difficulty="assisted" hints={[]} onComplete={(result) => results.push(result)} />,
  )
  return { results, user }
}

const cell = (row: number, col: number) => screen.getByRole('button', { name: new RegExp(`^row ${row}, column ${col},`) })
const setLower = (value: number) => fireEvent.change(screen.getByTestId('input-lower-threshold'), { target: { value: String(value) } })
const setUpper = (value: number) => fireEvent.change(screen.getByTestId('input-upper-threshold'), { target: { value: String(value) } })

describe('Mask Master interactive IQR flow', () => {
  it('hides the statistics until CALCULATE IQR is pressed, then shows the original fences', async () => {
    const { results, user } = setup()
    expect(screen.queryByText('23.50')).not.toBeInTheDocument()
    expect(screen.queryByTestId('input-lower-threshold')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('btn-calculate-iqr'))

    expect(screen.getByText('23.50')).toBeInTheDocument() // Q1
    expect(screen.getByText('28.50')).toBeInTheDocument() // Q3
    expect(screen.getByText('5.00')).toBeInTheDocument() // IQR
    expect(screen.getAllByText('16.00').length).toBeGreaterThan(0) // lower fence
    expect(screen.getAllByText('36.00').length).toBeGreaterThan(0) // upper fence
    expect(screen.getByTestId('cm-tp')).toHaveTextContent('TP 4')
    expect(screen.getByTestId('cm-fp')).toHaveTextContent('FP 0')
    // Calculating alone never completes the operation, and submit waits for experiments.
    expect(results).toHaveLength(0)
    expect(screen.getByTestId('btn-submit-detection')).toBeDisabled()
  })

  it('validates edits, keeps detection live and resets the dataset', async () => {
    const { user } = setup()
    await user.click(screen.getByTestId('btn-calculate-iqr'))

    await user.click(cell(1, 1))
    const input = screen.getByLabelText(/edit reading row 1 column 1/i)
    for (const bad of ['', 'NaN', 'Infinity', 'abc', '500']) {
      fireEvent.change(input, { target: { value: bad } })
      await user.click(screen.getByTestId('btn-save-reading'))
      expect(screen.getByRole('alert')).toBeInTheDocument()
    }
    expect(cell(1, 1)).toHaveAccessibleName(/reading 27/)

    // A normal cell edited to an extreme value is a false positive: the label never changes.
    fireEvent.change(input, { target: { value: '95' } })
    await user.click(screen.getByTestId('btn-save-reading'))
    expect(cell(1, 1)).toHaveAccessibleName(/reading 95, flagged by your thresholds, edited from 27/)
    expect(screen.getByTestId('cm-fp')).toHaveTextContent('FP 1')
    expect(screen.getByTestId('cm-tp')).toHaveTextContent('TP 4')
    expect(screen.getByText(/fences shown below were\s+calculated from the earlier data/i)).toBeInTheDocument()

    // Recalculating uses the edited data: one 27 moves to 95, shifting the upper half.
    await user.click(screen.getByTestId('btn-calculate-iqr'))
    expect(screen.getByText('29.00')).toBeInTheDocument()

    await user.click(screen.getByTestId('btn-reset-dataset'))
    expect(cell(1, 1)).toHaveAccessibleName(/reading 27$/)
    expect(L03_MASK_MASTER_VALUES[1][1]).toBe(27)
    expect(L03_MASK_MASTER_ANOMALIES).toHaveLength(4)
  })

  it('updates the matrix, metrics and feedback as the thresholds move', async () => {
    const { user } = setup()
    await user.click(screen.getByTestId('btn-calculate-iqr'))

    setUpper(30)
    expect(screen.getByTestId('cm-fp')).toHaveTextContent('FP 2') // 31 and 32
    expect(screen.getByTestId('threshold-guidance')).toHaveTextContent(/flagging normal readings/)

    setUpper(60)
    expect(screen.getByTestId('cm-fn')).toHaveTextContent('FN 2') // 50 and 58
    expect(screen.getByTestId('threshold-guidance')).toHaveTextContent(/2 genuine high anomalies are now being missed/)

    setUpper(36)
    setLower(22)
    expect(screen.getByTestId('threshold-guidance')).toHaveTextContent(/Normal low readings/)

    // The lower slider can never cross the upper one.
    setLower(80)
    expect(screen.getByTestId('input-lower-threshold')).toHaveValue('35.75')

    await user.click(screen.getByTestId('btn-reset-fences'))
    expect(screen.getByTestId('cm-tp')).toHaveTextContent('TP 4')
    expect(screen.getByTestId('cm-fn')).toHaveTextContent('FN 0')
  })

  it('rejects a weak submission and completes only after experimenting with a strong detection', async () => {
    const { results, user } = setup()
    await user.click(screen.getByTestId('btn-calculate-iqr'))

    setUpper(30) // false positives
    setLower(2) // misses the low anomaly
    expect(screen.getByTestId('btn-submit-detection')).toBeEnabled()

    await user.click(screen.getByTestId('btn-submit-detection'))
    expect(results).toHaveLength(0)
    expect(screen.getByText(/Not accepted yet/)).toBeInTheDocument()

    await user.click(screen.getByTestId('btn-reset-fences'))
    await user.click(screen.getByTestId('btn-submit-detection'))

    expect(results).toHaveLength(1)
    const [result] = results
    expect(result.id).toBe('l3-side-2')
    expect(result.mistakes).toBe(1)
    expect(result.extra?.maskPrecision).toBe(100)
    expect(result.extra?.maskRecall).toBe(100)
    expect(result.decisions.some((d) => /Answer key/.test(d.explanation))).toBe(true)

    // A second press cannot complete twice.
    await user.click(screen.getByTestId('btn-submit-detection'))
    expect(results).toHaveLength(1)
  })
})

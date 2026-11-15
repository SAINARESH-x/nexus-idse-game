// Integration test: all five Level 03 slice goals, including applying the boolean mask.
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ChallengeResult } from '../../../game/types'
import { SliceLabChallenge } from '../SliceLabChallenge'

describe('Level 03 slice lab completion', () => {
  it('completes rows, columns, blocks, steps and an applied mask', async () => {
    let completed: ChallengeResult | null = null
    const user = userEvent.setup()
    render(
      <SliceLabChallenge
        id="l3-stage-2"
        difficulty="independent"
        hints={[]}
        onComplete={(result) => {
          completed = result
        }}
      />,
    )

    const input = screen.getByLabelText(/slice expression/i)
    const lock = screen.getByTestId('btn-lock-slice')

    fireEvent.change(input, { target: { value: 'arr[2]' } })
    await user.click(lock)

    fireEvent.change(input, { target: { value: 'arr[:, 4]' } })
    await user.click(lock)

    fireEvent.change(input, { target: { value: 'arr[1:4, 2:5]' } })
    await user.click(lock)

    fireEvent.change(input, { target: { value: 'arr[:, ::2]' } })
    await user.click(lock)

    // The threshold is already 30, but the mask must also be applied to the grid.
    await user.click(lock)
    expect(await screen.findByText(/mask is not applied to the grid/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /apply mask/i }))
    await user.click(lock)

    expect(completed).not.toBeNull()
    if (!completed) throw new Error('Slice lab did not report completion')
    const result: ChallengeResult = completed
    expect(result.extra?.sliceGoals).toBe(5)
    expect(result.extra?.maskThreshold).toBe(30)
  })
})

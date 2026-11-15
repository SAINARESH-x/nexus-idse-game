// Integration test: the Level 03 vector lab records the one-liner and hidden pattern before completion.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ChallengeResult } from '../../../game/types'
import { VectorLabChallenge } from '../VectorLabChallenge'

describe('Level 03 vector lab completion', () => {
  it('completes with the one-liner method and the flagged drift pattern', async () => {
    let completed: ChallengeResult | null = null
    const user = userEvent.setup()
    render(
      <VectorLabChallenge
        id="l3-stage-3"
        difficulty="independent"
        hints={[]}
        onComplete={(result) => {
          completed = result
        }}
      />,
    )

    // The hidden pattern can be flagged while the player studies the grid.
    await user.click(screen.getByTestId('btn-flag-pattern'))
    await user.click(screen.getByTestId('btn-normalise'))
    await user.click(screen.getByTestId('btn-drift-one-liner'))

    expect(completed).not.toBeNull()
    if (!completed) throw new Error('Vector lab did not report completion')
    const result: ChallengeResult = completed
    expect(result.extra?.normalised).toBe(true)
    expect(result.extra?.driftColumn).toBe(4)
    expect(result.extra?.oneLiner).toBe(true)
    expect(result.extra?.patternNoticed).toBe(true)
  })
})

// Integration test: editing a rule clears the stale packet table until the next run.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RuleBuilderChallenge } from '../RuleBuilderChallenge'

describe('Level 02 rule builder', () => {
  it('runs the packets and clears stale outcomes when a rule changes', async () => {
    const user = userEvent.setup()
    render(
      <RuleBuilderChallenge
        id="l2-stage-1"
        difficulty="independent"
        hints={[]}
        onComplete={() => undefined}
      />,
    )

    await user.click(screen.getByTestId('btn-run-rules'))
    expect(await screen.findByText('p01')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Action for rule 1'), 'QUARANTINE')
    expect(screen.queryByText('p01')).not.toBeInTheDocument()
  })
})

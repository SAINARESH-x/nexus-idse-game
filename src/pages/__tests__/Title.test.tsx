// Smoke test: title screen shows the wordmark and entry points.
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useGameStore } from '../../game/store'
import { Title } from '../Title'

beforeEach(() => {
  useGameStore.getState().resetAll()
})

describe('Title screen', () => {
  it('renders the NEXUS wordmark, tagline and action buttons', () => {
    render(
      <MemoryRouter>
        <Title />
      </MemoryRouter>,
    )

    expect(screen.getByText('NEXUS')).toBeInTheDocument()
    expect(screen.getByText('Introduction to Data Science for Engineers')).toBeInTheDocument()
    expect(screen.getByTestId('btn-new-game')).toBeEnabled()
    expect(screen.getByTestId('btn-continue')).toBeDisabled()
  })

  it('confirms before replacing an existing save', async () => {
    const user = userEvent.setup()
    useGameStore.getState().newGame('Test')
    render(
      <MemoryRouter>
        <Title />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('btn-continue')).toBeEnabled()
    await user.click(screen.getByTestId('btn-new-game'))
    expect(screen.getByRole('dialog')).toHaveTextContent(/Start a new campaign/i)
    await user.click(screen.getByTestId('btn-cancel-new-game'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

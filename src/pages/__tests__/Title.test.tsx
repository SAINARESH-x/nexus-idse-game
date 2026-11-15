// Smoke test: title screen shows the wordmark and entry points.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Title } from '../Title'

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
})

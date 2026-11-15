// Ending page: locked panel, cards advance with Enter/click, SKIP reaches the campaign summary.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useGameStore } from '../../../game/store'
import { Ending } from '../../../pages/Ending'

const show = () => render(<MemoryRouter><Ending /></MemoryRouter>)

describe('Ending', () => {
  it('is locked until the campaign is complete', () => {
    useGameStore.setState({ campaignComplete: false })
    show()
    expect(screen.getByText('FINALE LOCKED')).toBeInTheDocument()
  })
  it('advances cards and SKIP shows the summary', () => {
    useGameStore.setState({ campaignComplete: true })
    show()
    expect(screen.getByTestId('ending-card')).toHaveTextContent('1/8')
    fireEvent.click(screen.getByTestId('ending-card'))
    expect(screen.getByTestId('ending-card')).toHaveTextContent('2/8')
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByTestId('ending-card')).toHaveTextContent('3/8')
    fireEvent.click(screen.getByTestId('ending-skip'))
    expect(screen.getByTestId('campaign-summary')).toHaveTextContent('Final rank')
    expect(screen.getByText('RETURN TO HUB')).toBeInTheDocument()
    expect(screen.getByText('ACHIEVEMENTS')).toBeInTheDocument()
  })
})

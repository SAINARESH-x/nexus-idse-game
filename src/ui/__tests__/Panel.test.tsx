// Panel test: design-system component renders its labels, action and children.
import { render, screen } from '@testing-library/react'
import { Panel } from '../Panel'
import { Badge } from '../Badge'

describe('Panel', () => {
  it('renders eyebrow, title, action and body', () => {
    render(
      <Panel eyebrow="Sector" title="Data vault" action={<Badge tone="green">Online</Badge>}>
        <p>Records loaded.</p>
      </Panel>,
    )

    expect(screen.getByText('Sector')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Data vault' })).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Records loaded.')).toBeInTheDocument()
  })
})

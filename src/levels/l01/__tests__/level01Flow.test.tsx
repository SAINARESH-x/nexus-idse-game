// Integration test: the Level 01 shell, hints, DragSort and stage advance.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../../app/App'
import { useGameStore } from '../../../game/store'

const PLACEMENTS: Array<[string, string]> = [
  ['value-str-42', 'str'],
  ['value-int-42', 'int'],
  ['value-float-sci', 'float'],
  ['value-true', 'bool'],
  ['value-str-true', 'str'],
  ['value-none', 'none'],
  ['value-empty-str', 'str'],
  ['value-list', 'list'],
  ['value-dict', 'dict'],
  ['value-float-3', 'float'],
  ['value-str-0', 'str'],
  ['value-int-0', 'int'],
]

beforeEach(() => {
  useGameStore.getState().resetAll()
  useGameStore.getState().newGame('Test')
  window.location.hash = '#/level/1/play'
})

describe('Level 01 mission shell', () => {
  it('reveals hints, sorts the intake and unlocks the next stage', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findAllByText(/intake sorting/i)).length).toBeGreaterThan(0)

    await user.click(screen.getByTestId('btn-hint'))
    expect(screen.getByTestId('hints-used')).toHaveTextContent('Hints used: 1')
    expect(screen.getByText(/Quotes decide strings/)).toBeInTheDocument()

    for (const [itemId, binId] of PLACEMENTS) {
      await user.click(await screen.findByTestId(`drag-item-${itemId}`))
      await user.click(screen.getByTestId(`drag-bin-${binId}`))
    }

    expect(await screen.findByTestId('stage-clear')).toBeInTheDocument()
    await user.click(screen.getByTestId('btn-stage-next'))

    expect((await screen.findAllByText(/decode the transmission/i)).length).toBeGreaterThan(0)
  })
})

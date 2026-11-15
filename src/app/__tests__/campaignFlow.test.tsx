// End-to-end campaign flow through the real router, store and level screens.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { DEV_DEMO_AGGREGATE } from '../../game/config'
import { useGameStore } from '../../game/store'

beforeEach(() => {
  useGameStore.getState().resetAll()
  window.location.hash = '#/'
})

describe('campaign flow', () => {
  it('creates a save, completes Level 1 and unlocks Level 2', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('btn-continue')).toBeDisabled()
    await user.click(screen.getByTestId('btn-new-game'))

    const input = await screen.findByTestId('input-callsign')
    await user.type(input, 'Test')
    await user.click(screen.getByTestId('btn-create-callsign'))

    expect(await screen.findByTestId('hub-rank')).toHaveTextContent('Trainee')
    expect(screen.getByTestId('hub-xp')).toHaveTextContent('XP 0 / 250')
    expect(screen.getByTestId('level-card-1')).toHaveTextContent('Available')
    expect(screen.getByTestId('level-card-2')).toHaveTextContent('Locked')

    await user.click(screen.getByTestId('level-card-2'))
    expect(await screen.findByText(/Level 2 is locked/)).toBeInTheDocument()

    await user.click(screen.getByTestId('level-card-1'))
    await user.click(await screen.findByTestId('btn-begin-mission'))
    await user.click(await screen.findByTestId('btn-dev-complete'))

    expect(await screen.findByTestId('btn-debrief-hub')).toBeInTheDocument()
    expect(screen.getByText('+120')).toBeInTheDocument()
    expect(screen.getByText('+60')).toBeInTheDocument()

    await user.click(screen.getByTestId('btn-debrief-hub'))
    expect(await screen.findByTestId('level-card-1')).toHaveTextContent('Completed')
    expect(screen.getByTestId('level-card-2')).toHaveTextContent('Available')
    expect(screen.getByTestId('level-card-3')).toHaveTextContent('Locked')
    expect(screen.getByTestId('hub-xp')).toHaveTextContent('XP 120 / 250')

    const stored = JSON.parse(localStorage.getItem('nexus-save-v1') ?? '{}')
    expect(stored.state.profile.callsign).toBe('Test')
    expect(stored.state.levels['1'].completed).toBe(true)
  })

  it('pays no XP when the same mission is replayed', async () => {
    const user = userEvent.setup()
    useGameStore.getState().newGame('Test')
    render(<App />)

    await user.click(await screen.findByTestId('btn-continue'))
    await user.click(await screen.findByTestId('level-card-1'))
    await user.click(await screen.findByTestId('btn-begin-mission'))
    await user.click(await screen.findByTestId('btn-dev-complete'))
    await user.click(await screen.findByTestId('btn-debrief-hub'))

    await user.click(await screen.findByTestId('level-card-1'))
    await user.click(await screen.findByTestId('btn-begin-mission'))
    await user.click(await screen.findByTestId('btn-dev-complete'))

    expect(await screen.findAllByText('+0')).toHaveLength(2)
    expect(screen.getByText(/only improvements over your best XP are paid/i)).toBeInTheDocument()
  })

  it('supports the developer panel shortcuts', async () => {
    const user = userEvent.setup()
    useGameStore.getState().newGame('Test')
    render(<App />)

    await user.click(await screen.findByTestId('btn-continue'))
    await user.click(await screen.findByTestId('dev-add-xp'))
    expect(screen.getByTestId('hub-rank')).toHaveTextContent('Junior Analyst')

    await user.click(screen.getByTestId('dev-unlock-all'))
    expect(screen.getByTestId('level-card-3')).toHaveTextContent('Available')
    expect(screen.getByTestId('level-card-7')).toHaveTextContent('Available')

    await user.click(screen.getByTestId('dev-reset'))
    expect(await screen.findByTestId('btn-continue')).toBeDisabled()
  })
})

describe('route guard', () => {
  it('redirects a locked level to the hub with a toast', async () => {
    useGameStore.getState().newGame('Test')
    window.location.hash = '#/level/3/play'

    render(<App />)

    expect(await screen.findByText(/Level 3 is locked/)).toBeInTheDocument()
    expect(await screen.findByTestId('hub-rank')).toBeInTheDocument()
  })

  it('redirects a locked later level to the hub', async () => {
    useGameStore.getState().newGame('Test')
    window.location.hash = '#/level/5/play'

    render(<App />)

    expect(await screen.findByText(/Level 5 is locked/)).toBeInTheDocument()
    expect(await screen.findByTestId('hub-rank')).toBeInTheDocument()
  })

  it('enables CONTINUE when a save exists', async () => {
    const user = userEvent.setup()
    useGameStore.getState().newGame('Test')
    window.location.hash = '#/'

    render(<App />)

    expect(screen.getByTestId('btn-continue')).toBeEnabled()
    await user.click(screen.getByTestId('btn-continue'))
    expect(await screen.findByTestId('hub-callsign')).toHaveTextContent('Test')
  })
})

describe('final build: all seven levels', () => {
  it('keeps locked levels locked until the previous mission completes', async () => {
    useGameStore.getState().newGame('Test')
    for (const id of [1, 2, 3] as const) useGameStore.getState().completeMission(id, DEV_DEMO_AGGREGATE)
    window.location.hash = '#/hub'
    render(<App />)
    expect(await screen.findByTestId('level-card-4')).toHaveTextContent('Available')
    expect(screen.getByTestId('level-card-5')).toHaveTextContent('Locked')
    expect(screen.queryByText(/in development/i)).not.toBeInTheDocument()
  })

  it.each([4, 5, 6, 7])('opens the Level %i briefing once unlocked', async (id) => {
    useGameStore.getState().newGame('Test')
    useGameStore.getState().unlockAll()
    window.location.hash = `#/level/${id}`
    render(<App />)
    expect(await screen.findByText(/Mission objectives/i)).toBeInTheDocument()
  })

  it('shows the campaign-complete banner and finale link after Level 7', async () => {
    useGameStore.getState().newGame('Test')
    useGameStore.getState().completeAllLevels()
    window.location.hash = '#/hub'
    render(<App />)
    expect(await screen.findByTestId('hub-campaign-complete')).toBeInTheDocument()
    expect(screen.getByTestId('btn-replay-finale')).toBeInTheDocument()
  })
})

// Integration smoke tests: Levels 02 and 03 dispatch real challenges and side ops through Play.
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../../app/App'
import { DEV_DEMO_AGGREGATE } from '../../../game/config'
import { useGameStore } from '../../../game/store'

const unlockThrough = (level: 1 | 2) => {
  const store = useGameStore.getState()
  store.newGame('Test')
  for (let id = 1; id <= level; id += 1) {
    useGameStore.getState().completeMission(id as 1 | 2, DEV_DEMO_AGGREGATE)
  }
}

beforeEach(() => {
  useGameStore.getState().resetAll()
})

describe('Level 02 play integration', () => {
  it('renders the real rule builder and runs the starter stack', async () => {
    unlockThrough(1)
    window.location.hash = '#/level/2/play'
    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findAllByText('BRANCH LOGIC')).length).toBeGreaterThan(0)
    expect(screen.getByText(/pre-crash archive/i)).toBeInTheDocument()

    await user.click(screen.getByTestId('btn-run-rules'))
    expect(await screen.findByText(/packet\(s\) broke the table/i)).toBeInTheDocument()
    expect(screen.getByText(/Rule 2 .* already caught p03/i)).toBeInTheDocument()
  })

  it('opens the Off-by-One side operation from the Play route', async () => {
    unlockThrough(1)
    window.location.hash = '#/level/2/play?side=l2-side-1'
    render(<App />)

    expect((await screen.findAllByText('OFF-BY-ONE')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('btn-run-range')).toBeInTheDocument()
  })
})

describe('Level 03 play integration', () => {
  it('renders the real array workbench', async () => {
    unlockThrough(2)
    window.location.hash = '#/level/3/play'
    render(<App />)

    expect((await screen.findAllByText('GRID ANATOMY')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('btn-check-anatomy')).toBeInTheDocument()
    expect(screen.getAllByText(/np.arange\(6\)/).length).toBeGreaterThan(0)
  })

  it('opens Reshape Rush with a 3D shape input', async () => {
    unlockThrough(2)
    window.location.hash = '#/level/3/play?side=l3-side-1'
    render(<App />)

    expect((await screen.findAllByText('RESHAPE RUSH')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/layers \(3D\)/i)).toBeInTheDocument()
    expect(screen.getByTestId('btn-reshape-check')).toBeInTheDocument()
  })

  it('completes Mask Master through the shell and pays the side-op reward only once', async () => {
    unlockThrough(2)
    useGameStore.getState().completeMission(3, DEV_DEMO_AGGREGATE)
    const playMaskMaster = async () => {
      window.location.hash = '#/level/3/play?side=l3-side-2'
      const user = userEvent.setup()
      const view = render(<App />)
      await user.click(await screen.findByTestId('btn-calculate-iqr'))
      fireEvent.change(screen.getByTestId('input-upper-threshold'), { target: { value: '30' } })
      fireEvent.change(screen.getByTestId('input-upper-threshold'), { target: { value: '60' } })
      await user.click(screen.getByTestId('btn-reset-fences'))
      await user.click(screen.getByTestId('btn-submit-detection'))
      await user.click(await screen.findByTestId('btn-stage-next'))
      expect(await screen.findByText(/Answer key \(original anomalies\)/)).toBeInTheDocument()
      view.unmount()
    }

    const xpBefore = useGameStore.getState().profile.xp
    await playMaskMaster()
    const afterFirst = useGameStore.getState()
    expect(afterFirst.levels[3].sideOpsDone).toContain('l3-side-2')
    expect(afterFirst.profile.xp).toBe(xpBefore + 60)

    await playMaskMaster()
    expect(useGameStore.getState().profile.xp).toBe(afterFirst.profile.xp)
  })
})

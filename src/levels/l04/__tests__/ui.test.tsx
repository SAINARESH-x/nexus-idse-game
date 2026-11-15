// Level 04 RTL tests: spreadsheet edit + undo, clearance -> stage flow, attempts on double click, corrupt-session recovery.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDfSession, generateStudents } from '../../../engine'
import { useGameStore } from '../../../game/store'
import { ToastProvider } from '../../../ui/Toast'
import { BriefingActions } from '../BriefingActions'
import { L04Mission } from '../L04Mission'
import { L04_KEY, loadRecord, newRecord } from '../missionRecord'
import { DfSessionProvider } from '../session'
import { Spreadsheet } from '../Spreadsheet'
import { CodeRibbon } from '../CodeRibbon'
import { SCRIPT, unlockTo4 } from './helpers'

const wrap = (ui: React.ReactNode) => render(<MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter>)

beforeEach(() => {
  useGameStore.getState().resetAll()
  localStorage.clear()
  unlockTo4()
})

describe('Spreadsheet', () => {
  it('renders the frame, a cell edit becomes df.at[...] in history, undo restores', () => {
    const g = generateStudents({ seed: 42, tier: 'assisted' })
    const session = createDfSession(g.dirty, { seed: 42, tier: 'assisted' })
    const record = newRecord(42, 'assisted', 0, session.toJSON())
    wrap(
      <DfSessionProvider session={session} initialRecord={record}>
        <Spreadsheet />
        <CodeRibbon />
      </DfSessionProvider>,
    )
    expect(screen.getByText('47 of 47 rows shown')).toBeInTheDocument()
    const bad = g.issues.find((i) => i.kind === 'invalid' && i.column === 'age')!
    const cell = document.querySelector(`[data-cell="${bad.rowIdx}|age"]`) as HTMLElement
    const before = cell.textContent
    fireEvent.doubleClick(cell)
    const input = screen.getByLabelText('Edit cell value')
    fireEvent.change(input, { target: { value: '20' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(session.history).toHaveLength(1)
    expect(session.history[0].code).toBe(`df.at[${bad.rowIdx}, 'age'] = 20`)
    expect(screen.getByTestId('code-ribbon').textContent).toBe(`df.at[${bad.rowIdx}, 'age'] = 20`)
    act(() => {
      session.undo()
    })
    expect((document.querySelector(`[data-cell="${bad.rowIdx}|age"]`) as HTMLElement).textContent).toBe(before)
  })
  it('sorting is view-only: no history entry, a VIEW ribbon line', () => {
    const g = generateStudents({ seed: 42, tier: 'assisted' })
    const session = createDfSession(g.dirty, { seed: 42, tier: 'assisted' })
    wrap(
      <DfSessionProvider session={session} initialRecord={newRecord(42, 'assisted', 0, session.toJSON())}>
        <Spreadsheet />
        <CodeRibbon />
      </DfSessionProvider>,
    )
    fireEvent.click(screen.getByLabelText('Sort by age'))
    expect(session.history).toHaveLength(0)
    expect(screen.getByTestId('code-ribbon').textContent).toBe("VIEW  df.sort_values('age')")
  })
})

describe('clearance and stage flow', () => {
  it('one attempt per confirmed tier (double click safe), then Stage 1 -> 4 and SUBMIT FOR AUDIT', () => {
    const { unmount } = wrap(<L04Mission />)
    expect(screen.getByTestId('tier-assisted')).toHaveTextContent('Recommended')
    expect(screen.getByTestId('recommend-reason')).toHaveTextContent(/First clearance/)
    const confirm = screen.getByTestId('btn-confirm-tier')
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
    expect(screen.getByTestId('l04-workspace')).toBeInTheDocument()
    expect(screen.getByTestId('tab-console')).toBeDisabled()

    // Stage 1
    expect(screen.queryByTestId('btn-proceed')).toBeNull()
    fireEvent.click(screen.getByTestId('info-shape'))
    expect(screen.getByTestId('info-output')).toHaveTextContent('(47, 9)')
    expect(screen.getByTestId('code-ribbon')).toHaveTextContent('df.shape')
    fireEvent.click(screen.getByTestId('info-dtypes'))
    fireEvent.click(screen.getByTestId('btn-flag-tool'))
    for (const k of ['3|attendance', '6|attendance', '30|age']) fireEvent.click(document.querySelector(`[data-cell="${k}"]`) as HTMLElement)
    fireEvent.click(screen.getByTestId('btn-proceed'))

    // Stage 2: two submissions always pass
    expect(screen.getByRole('heading', { name: 'IDENTIFY THE CORRUPTION' })).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('brush-invalid'))
    fireEvent.click(document.querySelector('[data-cell="30|age"]') as HTMLElement)
    fireEvent.click(screen.getByTestId('btn-submit-report'))
    expect(screen.getByTestId('report-feedback')).toHaveTextContent(/Anomaly flags are scored separately/)
    expect(screen.queryByTestId('btn-proceed')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-submit-report'))
    fireEvent.click(screen.getByTestId('btn-proceed'))

    // Stage 3: intro, builder repair, fill the blank, console script
    fireEvent.click(screen.getByTestId('btn-intro-ok'))
    fireEvent.click(screen.getByTestId('tab-builder'))
    fireEvent.change(screen.getByTestId('builder-target'), { target: { value: 'department' } })
    fireEvent.change(screen.getByTestId('builder-method'), { target: { value: 'str.strip' } })
    fireEvent.click(screen.getByTestId('btn-builder-run'))
    fireEvent.click(screen.getByRole('button', { name: 'Fill the blank' }))
    const drill = within(screen.getByTestId('fill-blank')).getByRole('combobox')
    fireEvent.change(drill, { target: { value: 'dedupe' } })
    fireEvent.click(screen.getByTestId('chip-dropna'))
    fireEvent.click(screen.getByTestId('gap-0'))
    expect(screen.getByTestId('fill-blank')).toHaveTextContent(/removes rows with blanks/)
    fireEvent.click(screen.getByTestId('chip-drop_duplicates'))
    fireEvent.click(screen.getByTestId('gap-0'))
    fireEvent.click(screen.getByTestId('btn-blank-run'))
    fireEvent.click(screen.getByTestId('tab-console'))
    const input = screen.getByTestId('console-input')
    for (const line of ['import os', ...SCRIPT.slice(1)]) {
      fireEvent.change(input, { target: { value: line } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    expect(screen.getByTestId('console')).toHaveTextContent(/import os/)
    for (const m of ['missing', 'duplicates', 'inconsistent', 'types', 'invalid']) expect(screen.getByTestId(`meter-${m}`)).toHaveTextContent(/clear/)

    // F5 mid-mission: restore by replay, attempts unchanged
    unmount()
    wrap(<L04Mission />)
    expect(screen.getByRole('heading', { name: 'DATA RECONSTRUCTION' })).toBeInTheDocument()
    expect(screen.getByTestId('history-rows')).toHaveTextContent('Current: 44 rows')
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
    fireEvent.click(screen.getByTestId('btn-proceed'))

    // Stage 4
    expect(screen.getByTestId('btn-submit-audit')).toBeDisabled()
    fireEvent.click(screen.getByTestId('btn-run-checks'))
    expect(screen.getByTestId('check-4')).toHaveTextContent('PASS')
    fireEvent.click(screen.getByTestId('btn-submit-audit'))
    const r = loadRecord()
    expect(r.kind === 'ok' && r.record.status).toBe('finished')
    expect(r.kind === 'ok' && r.record.report && r.record.report.quality.integrity).toBeGreaterThanOrEqual(80)
    expect(useGameStore.getState().levels[4].completed).toBe(true)
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
  })

  it('corrupt saved session: toast, clearance, attempts untouched', () => {
    localStorage.setItem(L04_KEY, '{"v":1,"broken":')
    wrap(<L04Mission />)
    expect(screen.getByTestId('l04-clearance')).toBeInTheDocument()
    expect(screen.getByText('Saved session was damaged, the mission starts over')).toBeInTheDocument()
    expect(localStorage.getItem(L04_KEY)).toBeNull()
    expect(useGameStore.getState().levels[4].attempts).toBe(0)
  })

  it('briefing shows CONTINUE for an unfinished session and BEGIN otherwise', () => {
    const first = wrap(<BriefingActions />)
    expect(screen.queryByTestId('btn-continue-mission')).toBeNull()
    first.unmount()
    const m = wrap(<L04Mission />)
    fireEvent.click(screen.getByTestId('tier-expert'))
    fireEvent.click(screen.getByTestId('btn-confirm-tier'))
    m.unmount()
    wrap(<BriefingActions />)
    fireEvent.click(screen.getByTestId('btn-continue-mission'))
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
  })
})

// Release audit: route smoke tests, headless campaign, Level 04 golden script with undo/redo, and save reliability.
import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { assessQuality, createDfSession, dfEquals, generateStudents, shape } from '../engine'
import { DEV_DEMO_AGGREGATE, LEVEL_IDS, RANKS } from '../game/config'
import { getRegistryCounts } from '../game/levels/counts'
import { LEVELS } from '../game/levels/registry'
import { rankForXp } from '../game/progression'
import { useGameStore } from '../game/store'
import type { LevelId } from '../game/types'

const state = () => useGameStore.getState()

const ROUTES = [
  '#/',
  '#/new',
  '#/hub',
  ...LEVEL_IDS.flatMap((id) => [`#/level/${id}`, `#/level/${id}/play`, `#/level/${id}/debrief`]),
  '#/achievements',
  '#/settings',
  '#/toolbay',
  '#/ending',
  '#/level/99',
  '#/no-such-route',
]

beforeEach(() => {
  state().resetAll()
  window.location.hash = '#/'
})
afterEach(() => cleanup())

describe('route smoke', () => {
  it.each(ROUTES)('renders %s on a fresh save without throwing', async (hash) => {
    window.location.hash = hash
    expect(() => render(createElement(App))).not.toThrow()
    expect(await screen.findAllByRole('main')).not.toHaveLength(0)
    expect(screen.queryByText(/system fault/i)).not.toBeInTheDocument()
  })

  it.each(ROUTES)('renders %s on an all-complete save without throwing', async (hash) => {
    state().newGame('Auditor')
    state().completeAllLevels()
    window.location.hash = hash
    expect(() => render(createElement(App))).not.toThrow()
    expect(await screen.findAllByRole('main')).not.toHaveLength(0)
    expect(screen.queryByText(/system fault/i)).not.toBeInTheDocument()
  })

  it('redirects a locked level route to the hub', async () => {
    state().newGame('Auditor')
    window.location.hash = '#/level/6/play'
    render(createElement(App))
    expect(await screen.findByText(/Level 6 is locked/)).toBeInTheDocument()
  })
})

describe('headless campaign', () => {
  it('completes levels 1 to 7 in order with consistent rewards', () => {
    state().newGame('Auditor')
    let xp = 0
    for (const id of LEVEL_IDS) {
      expect(state().levels[id].unlocked).toBe(true)
      if (id < 7) expect(state().levels[(id + 1) as LevelId].unlocked).toBe(false)
      const index = state().startMission(id)
      expect(state().levels[id].attempts).toBe(index + 1)
      state().completeMission(id, DEV_DEMO_AGGREGATE)
      expect(state().profile.xp).toBeGreaterThan(xp)
      xp = state().profile.xp
    }
    expect(state().fragments).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'])
    expect(state().campaignComplete).toBe(true)
    const completedAt = state().campaignCompletedAt
    // Replays pay only improvements; side ops and bonuses pay once.
    expect(state().completeMission(1, DEV_DEMO_AGGREGATE).xpGained).toBe(0)
    expect(state().completeSideOp(1, LEVELS[0].sideOps[0].id).xpGained).toBeGreaterThan(0)
    expect(state().completeSideOp(1, LEVELS[0].sideOps[0].id).xpGained).toBe(0)
    const hidden = LEVELS[0].bonuses.find((bonus) => bonus.hidden)
    expect(hidden).toBeDefined()
    expect(state().completeBonus(1, hidden?.id ?? '').xpGained).toBe(60)
    expect(state().completeBonus(1, hidden?.id ?? '').xpGained).toBe(0)
    state().completeMission(7, DEV_DEMO_AGGREGATE)
    expect(state().campaignCompletedAt).toBe(completedAt)
    expect(rankForXp(state().profile.xp).name).toBe(RANKS.filter((rank) => rank.minXp <= state().profile.xp).at(-1)?.name)
    expect(state().achievements).toEqual(expect.arrayContaining(['first-contact', 'halfway', 'campaign-complete', 's-rank', 'self-reliant']))
  })

  it('counts registry totals without hard-coded numbers', () => {
    const counts = getRegistryCounts(LEVELS)
    expect(counts.levels).toBe(LEVELS.length)
    expect(counts.bonuses).toBe(counts.bonusesVisible + counts.bonusesHidden)
  })
})

describe('Level 04 golden script', () => {
  const SCRIPT = [
    'df = df.drop_duplicates()',
    "df['department'] = df['department'].str.strip().str.title()",
    "df['department'] = df['department'].replace({'Cs': 'Computer Science', 'Comp Sci': 'Computer Science', 'Mech': 'Mechanical'})",
    "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)",
    "df['attendance'] = df['attendance'].fillna(df['attendance'].median())",
    "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan",
    "df['age'] = df['age'].fillna(df['age'].median())",
    "df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan",
    "df['cgpa'] = df['cgpa'].fillna(df['cgpa'].median())",
  ]

  it('cleans the assisted seed-42 dataset to the documented scores, and undo/redo is exact', () => {
    const generated = generateStudents({ seed: 42, tier: 'assisted' })
    const session = createDfSession(generated.dirty, { seed: 42, tier: 'assisted' })
    for (const line of SCRIPT) expect(session.apply(line, 'command').ok).toBe(true)
    expect(shape(session.current)).toEqual([44, 9])
    const report = assessQuality(session.current, { ...generated, tier: 'assisted', history: session.history, decisions: session.decisions })
    expect(report.consistency).toBe(1)
    expect(report.preservation).toBe(1)
    expect(report.integrity).toBeCloseTo(92.5, 5)
    expect(report.efficiency).toBeCloseTo(88.89, 1)

    const cleaned = session.current
    for (let i = 0; i < SCRIPT.length; i += 1) session.undo()
    expect(dfEquals(session.current, generated.dirty)).toBe(true)
    for (let i = 0; i < SCRIPT.length; i += 1) session.redo()
    expect(dfEquals(session.current, cleaned)).toBe(true)

    const before = session.history.length
    expect(session.apply("df['department'] = df['department'].astype(float)", 'command').ok).toBe(false)
    expect(session.history.length).toBe(before)
  })
})

describe('save reliability', () => {
  it('round-trips export and import and clears every nexus- key on reset', () => {
    state().newGame('Auditor')
    state().completeMission(1, DEV_DEMO_AGGREGATE)
    const exported = state().exportSave()
    localStorage.setItem('nexus-l06-session', '{}')
    state().resetAll()
    expect(Object.keys(localStorage).filter((key) => key.startsWith('nexus-'))).toEqual([])
    expect(state().importSave(exported).ok).toBe(true)
    expect(state().profile.callsign).toBe('Auditor')
    expect(state().levels[2].unlocked).toBe(true)
  })
})

// Level 04 persistence, attempts counting and the headless 9-command integration run.
import { beforeEach, describe, expect, it } from 'vitest'
import { clearanceSeed, dfEquals, generateStudents } from '../../../engine'
import { useGameStore } from '../../../game/store'
import { completeL04 } from '../complete'
import { beginMission } from '../L04Mission'
import { L04_KEY, hasActiveRecord, loadRecord, saveRecord } from '../missionRecord'
import { SCRIPT, unlockTo4 } from './helpers'

beforeEach(() => {
  useGameStore.getState().resetAll()
  localStorage.clear()
  unlockTo4()
})

describe('session persistence', () => {
  it('round trip: apply 3 ops, serialise, rebuild by replay, identical frame', () => {
    const { record, session } = beginMission('assisted')
    for (const c of SCRIPT.slice(0, 3)) expect(session.apply(c, 'command').ok).toBe(true)
    session.undo()
    saveRecord({ ...record, session: session.toJSON(), stage: 2 })
    const r = loadRecord()
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(dfEquals(r.session.current, session.current)).toBe(true)
    expect(r.session.cursor).toBe(2)
    expect(r.session.canRedo).toBe(true)
    expect(r.record.stage).toBe(2)
    expect(r.record.seed).toBe(record.seed)
  })
  it('corrupt JSON and bad shapes are reported, never thrown', () => {
    localStorage.setItem(L04_KEY, '{not json')
    expect(loadRecord().kind).toBe('corrupt')
    localStorage.setItem(L04_KEY, JSON.stringify({ v: 1, status: 'active' }))
    expect(loadRecord().kind).toBe('corrupt')
    localStorage.removeItem(L04_KEY)
    expect(loadRecord().kind).toBe('none')
    expect(hasActiveRecord()).toBe(false)
  })
  it('a broken op history is corrupt', () => {
    const { record } = beginMission('assisted')
    saveRecord({ ...record, session: { ...record.session, entries: [{ id: 'h1', ops: [{ type: 'astype', column: 'nope', to: 'int' }], source: 'ui' }], cursor: 1 } })
    expect(loadRecord().kind).toBe('corrupt')
  })
})

describe('attempts counting', () => {
  it('exactly one increment per confirmed tier; seed uses the pre-increment value', () => {
    expect(useGameStore.getState().levels[4].attempts).toBe(0)
    const a = beginMission('independent')
    expect(a.record.attemptIndex).toBe(0)
    expect(a.record.seed).toBe(clearanceSeed(0, 'independent'))
    expect(a.record.seed).toBe(1001)
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
    const b = beginMission('assisted')
    expect(b.record.seed).toBe(1000 + 17)
    expect(useGameStore.getState().levels[4].attempts).toBe(2)
  })
  it('restoring (F5 / CONTINUE) never changes attempts or the stored seed', () => {
    const { record } = beginMission('expert')
    for (let i = 0; i < 3; i += 1) {
      const r = loadRecord()
      expect(r.kind === 'ok' && r.record.seed).toBe(record.seed)
    }
    expect(useGameStore.getState().levels[4].attempts).toBe(1)
  })
})

describe('headless integration: assisted seed 42', () => {
  it('9-command script + perfect flags -> rating S, XP paid, replay at the same score pays 0', () => {
    const run = () => {
      const { record, session } = beginMission('assisted')
      // The golden script is defined for seed 42: rebuild that exact vault in the record.
      const gen = generateStudents({ seed: 42, tier: 'assisted' })
      const s42 = { ...record, seed: 42 }
      const sess = (() => {
        saveRecord({ ...s42, session: { ...session.toJSON(), meta: { seed: 42, tier: 'assisted' } } })
        const r = loadRecord()
        if (r.kind !== 'ok') throw new Error('restore failed')
        return r.session
      })()
      for (const c of SCRIPT) expect(sess.apply(c, 'command').ok).toBe(true)
      const flags = gen.issues.map((i) => ({ rowIdx: i.rowIdx, column: i.column, kind: i.kind }))
      const rec = { ...s42, stage: 3, flags, stage1: { shape: true, dtypes: true, marks: [{ rowIdx: 1 }, { rowIdx: 2 }, { rowIdx: 3 }] }, stage2: { submissions: 1, passed: true, f1: 1, feedback: [] }, stage4: { checksRun: true } }
      return completeL04(rec, sess, gen)
    }
    const first = run()
    expect(first.quality.integrity).toBeCloseTo(100, 5)
    expect(first.quality.efficiency).toBeCloseTo(88.89, 1)
    expect(first.rating).toBe('S')
    expect(first.award?.xpGained).toBeGreaterThan(0)
    expect(first.bonuses.map((b) => b.id)).toEqual(['l4-bonus-1'])
    const st = useGameStore.getState().levels[4]
    expect(st.completed).toBe(true)
    expect(st.stats.bestIntegrity).toBe(100)
    expect(st.stats.tiersCleared).toBe('assisted')
    expect(st.stats.perfectRun).toBe(true)
    expect(useGameStore.getState().levels[5].unlocked).toBe(true)
    const second = run()
    expect(second.rating).toBe('S')
    expect(second.award?.xpGained).toBe(0)
    expect(useGameStore.getState().levels[4].attempts).toBe(2)
  })
})

describe('finished report persistence', () => {
  it('the finished report survives a reload', () => {
    const { record, session } = beginMission('assisted')
    const gen = generateStudents({ seed: record.seed, tier: 'assisted' })
    const report = completeL04(record, session, gen)
    saveRecord({ ...record, status: 'finished', session: session.toJSON(), report })
    const r = loadRecord()
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.record.status).toBe('finished')
    expect(r.record.report?.rating).toBe(report.rating)
    expect(r.record.report?.quality.integrity).toBeCloseTo(report.quality.integrity)
    expect(hasActiveRecord()).toBe(false)
  })
})

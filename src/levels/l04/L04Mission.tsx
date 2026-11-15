// Level 04 main mission route: restores a saved session (replay) or shows the clearance screen; one attempt per confirmed tier.
import { useEffect, useRef, useState } from 'react'
import { clearanceSeed, createDfSession, generateStudents } from '../../engine'
import type { DfSession } from '../../engine'
import { useGameStore } from '../../game/store'
import type { Tier } from '../../game/types'
import { useToast } from '../../ui/Toast'
import { Clearance } from './Clearance'
import { clearRecord, loadRecord, newRecord, saveRecord } from './missionRecord'
import type { L04Record } from './missionRecord'
import { DfSessionProvider } from './session'
import { Workspace } from './Workspace'

type Phase = { kind: 'clearance'; notice?: string } | { kind: 'play'; record: L04Record; session: DfSession }

function initialPhase(): Phase & { corrupt?: boolean } {
  const r = loadRecord()
  if (r.kind === 'ok' && r.record.status === 'active') return { kind: 'play', record: r.record, session: r.session }
  if (r.kind === 'corrupt') return { kind: 'clearance', corrupt: true }
  return { kind: 'clearance', notice: r.kind === 'ok' ? 'Your last audit is filed. Confirming a tier starts a new mission.' : undefined }
}

/**
 * Starts a new Level 04 mission: the ONLY place attempts change. startMission(4) returns the attempt index
 * before the increment; the seed is derived from it once and stored in the record (never recomputed on restore).
 */
export function beginMission(tier: Tier): { record: L04Record; session: DfSession } {
  const attemptIndex = useGameStore.getState().startMission(4)
  const seed = clearanceSeed(attemptIndex, tier)
  const gen = generateStudents({ seed, tier })
  const session = createDfSession(gen.dirty, { seed, tier })
  const record = newRecord(seed, tier, attemptIndex, session.toJSON())
  saveRecord(record)
  return { record, session }
}

export function L04Mission() {
  const { push } = useToast()
  const [phase, setPhase] = useState<Phase & { corrupt?: boolean }>(initialPhase)
  const starting = useRef(false)
  const warned = useRef(false)

  useEffect(() => {
    if (phase.kind === 'clearance' && phase.corrupt && !warned.current) {
      warned.current = true
      clearRecord()
      push({ message: 'Saved session was damaged, the mission starts over', tone: 'warning' })
      setPhase({ kind: 'clearance' })
    }
  }, [phase, push])

  if (phase.kind === 'play') {
    return (
      <DfSessionProvider key={phase.record.seed * 10 + phase.record.attemptIndex} session={phase.session} initialRecord={phase.record}>
        <Workspace />
      </DfSessionProvider>
    )
  }
  return (
    <Clearance
      notice={phase.notice}
      onConfirm={(tier) => {
        if (starting.current) return
        starting.current = true
        const { record, session } = beginMission(tier)
        setPhase({ kind: 'play', record, session })
      }}
    />
  )
}

// Level 04 mission context: ONE DfSession + mission record shared by every tool, with persistence and the op dispatcher.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { describeOp, generateStudents, liveHealth, parse } from '../../engine'
import type { ApplyOutcome, DfSession, GeneratedDataset, Op, OpSource, SessionState } from '../../engine'
import { struggleSignals } from '../../game/adaptive'
import type { MissionLogEntry, MissionLogInput } from '../../shell/MissionUi'
import { useToast } from '../../ui/Toast'
import { saveRecord } from './missionRecord'
import type { L04Record } from './missionRecord'

export type ToolTab = 'sheet' | 'console' | 'builder' | 'lab'

export interface Ribbon {
  kind: 'op' | 'inspect' | 'view'
  code: string
  sentence: string
}

export interface ConsoleLine {
  id: number
  kind: 'in' | 'out' | 'error' | 'info'
  text: string
}

interface L04ContextValue {
  session: DfSession
  record: L04Record
  gen: GeneratedDataset
  update: (fn: (r: L04Record) => L04Record) => void
  ribbon: Ribbon | null
  setRibbon: (r: Ribbon | null) => void
  log: MissionLogEntry[]
  addLog: (e: MissionLogInput) => void
  highlights: boolean
  tab: ToolTab
  setTab: (t: ToolTab) => void
  focusColumn: { column: string; at: number } | null
  jumpToColumn: (column: string) => void
  /** Central dispatcher: applies ops or a typed line, then judges, toasts and logs. */
  run: (input: Op | Op[] | string, source: OpSource) => ApplyOutcome
  consoleLines: ConsoleLine[]
  setConsoleLines: (fn: (l: ConsoleLine[]) => ConsoleLine[]) => void
  assistBanner: boolean
  acceptAssist: () => void
  dismissAssist: () => void
}

const Ctx = createContext<L04ContextValue | null>(null)

export function useL04(): L04ContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useL04 must be used inside DfSessionProvider')
  return v
}

/** Subscribes to the shared session; the selector receives the stable snapshot. */
export function useDfSession<T>(selector: (s: SessionState) => T): T {
  const { session } = useL04()
  return useSyncExternalStore(session.subscribe, () => selector(session.getState()))
}

export function DfSessionProvider({ session, initialRecord, children }: { session: DfSession; initialRecord: L04Record; children: ReactNode }) {
  const { push } = useToast()
  const [record, setRecord] = useState(initialRecord)
  const recordRef = useRef(record)
  recordRef.current = record
  const gen = useMemo(() => generateStudents({ seed: initialRecord.seed, tier: initialRecord.tier }), [initialRecord.seed, initialRecord.tier])
  const [ribbon, setRibbon] = useState<Ribbon | null>(null)
  const [log, setLog] = useState<MissionLogEntry[]>([{ id: 0, title: 'Vault uplink established', detail: `Clearance ${initialRecord.tier.toUpperCase()}, seed ${initialRecord.seed}.`, tone: 'info', at: Date.now() }])
  const logId = useRef(1)
  const [tab, setTab] = useState<ToolTab>('sheet')
  const [focusColumn, setFocus] = useState<{ column: string; at: number } | null>(null)
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([])
  const [assistBanner, setAssistBanner] = useState(false)
  const version = useSyncExternalStore(session.subscribe, () => session.getState().version)

  const update = useCallback((fn: (r: L04Record) => L04Record) => {
    setRecord((r) => {
      const next = fn(r)
      recordRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    if (record.status === 'active') saveRecord({ ...record, session: session.toJSON() })
  }, [record, session, version])

  const addLog = useCallback((e: MissionLogInput) => {
    setLog((l) => [{ id: logId.current++, title: e.title, detail: e.detail, tone: e.tone ?? 'info', at: Date.now() }, ...l].slice(0, 80))
  }, [])

  const run = useCallback(
    (input: Op | Op[] | string, source: OpSource): ApplyOutcome => {
      const before = session.current
      const ops: Op[] | null = typeof input === 'string' ? (() => { const p = parse(input); return p.kind === 'ops' ? p.ops : null })() : Array.isArray(input) ? input : [input]
      const r = session.apply(input, source)
      if (!r.ok || !r.entry) {
        if (!r.ok) push({ message: r.error ?? 'Operation failed.', tone: 'error' })
        return r
      }
      const e = r.entry
      setRibbon({ kind: 'op', code: e.code, sentence: e.ops.map(describeOp).join(' ') })
      const d = e.decision
      if (d && d.good === false) {
        push({ message: `${d.label}: ${d.explanation}`, tone: 'error', duration: 9000, action: { label: 'UNDO', onClick: () => session.undo() } })
        addLog({ title: d.label, detail: d.explanation, tone: 'bad' })
      } else if (d) {
        push({ message: `${d.label}. ${d.explanation}`, tone: d.good ? 'success' : d.redundant ? 'warning' : 'info' })
        addLog({ title: d.label, detail: d.explanation, tone: d.good ? 'good' : 'info' })
      } else {
        push({ message: e.summary, tone: 'info', duration: 3500 })
        addLog({ title: e.code, detail: e.summary, tone: 'info' })
      }
      const rec = recordRef.current
      // Pipeline tip: free and shown once, when de-duplicating while text variants still hide copies.
      if (!rec.stage3.tipShown && ops?.some((o) => o.type === 'drop_duplicates')) {
        const h = liveHealth(before)
        if (h.totalUnknownLabels > 0 || h.normalizedDuplicates > h.duplicates) {
          addLog({ title: 'Pipeline tip: order matters', detail: 'Standardise text (strip, title, replace) BEFORE drop_duplicates: rows that differ only in spacing or case are not exact copies yet.', tone: 'tip' })
          push({ message: 'Pipeline tip: standardise text before de-duplicating (see the Mission Log).', tone: 'info' })
          update((x) => ({ ...x, stage3: { ...x.stage3, tipShown: true } }))
        }
      }
      // Struggle assist: independent and expert only, offered once per mission.
      if (rec.tier !== 'assisted' && !rec.assistOffered) {
        const ds = session.decisions
        const badKept = ds.filter((x) => x.decision.good === false && !x.undone).length
        const stageMistakes = ds.slice(rec.stageDecisionStart).filter((x) => x.decision.good === false).length
        if (struggleSignals({ badKeptDecisions: badKept, stageMistakes })) {
          update((x) => ({ ...x, assistOffered: true }))
          setAssistBanner(true)
        }
      }
      return r
    },
    [addLog, push, session, update],
  )

  const acceptAssist = useCallback(() => {
    setAssistBanner(false)
    update((x) => ({ ...x, adaptiveAssistUsed: true, freeScanStage: x.stage, scanOn: true }))
    addLog({ title: 'Analyst Scan granted', detail: 'Free highlights for the rest of this stage. No hint was charged.', tone: 'tip' })
  }, [addLog, update])

  const jumpToColumn = useCallback((column: string) => {
    setTab('sheet')
    setFocus({ column, at: Date.now() })
  }, [])

  const highlights = record.tier === 'assisted' || record.scanOn
  const value = useMemo<L04ContextValue>(
    () => ({ session, record, gen, update, ribbon, setRibbon, log, addLog, highlights, tab, setTab, focusColumn, jumpToColumn, run, consoleLines, setConsoleLines, assistBanner, acceptAssist, dismissAssist: () => setAssistBanner(false) }),
    [session, record, gen, update, ribbon, log, addLog, highlights, tab, focusColumn, jumpToColumn, run, consoleLines, assistBanner, acceptAssist],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

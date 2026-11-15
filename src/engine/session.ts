// Data-frame session factory: one undoable history of ops shared by every Level 04 view (never a singleton).
import { toCodeLine } from './codegen'
import { judgeOp } from './judge'
import { applyAll } from './ops'
import { parse, runInspect } from './parser'
import type { DF, Decision, Op, Tier } from './types'

export type OpSource = 'ui' | 'puzzle' | 'command'

export interface HistoryEntry {
  id: string
  ops: Op[]
  code: string
  source: OpSource
  rowsBefore: number
  rowsAfter: number
  summary: string
  /** judgeOp verdict at the time the entry was applied (null = no rule). */
  decision: Decision | null
}

/** Every judged decision ever made in this session, including ones later undone or discarded. */
export interface JudgedDecision {
  entryId: string
  decision: Decision
  undone: boolean
}

export interface SessionMeta {
  seed?: number
  tier?: Tier
  [key: string]: unknown
}

export interface SessionState {
  original: DF
  current: DF
  history: HistoryEntry[]
  cursor: number
  canUndo: boolean
  canRedo: boolean
  decisions: JudgedDecision[]
  version: number
}

export interface ApplyOutcome {
  ok: boolean
  entry?: HistoryEntry
  /** Text output for inspect commands (they never enter history). */
  output?: string
  error?: string
  suggestion?: string
}

export interface SessionJSON {
  v: 1
  meta: SessionMeta
  entries: Array<{ id: string; ops: Op[]; source: OpSource }>
  cursor: number
  decisions: JudgedDecision[]
  nextId: number
}

export interface DfSession {
  readonly meta: SessionMeta
  readonly original: DF
  readonly current: DF
  /** Entries up to the cursor (what has been applied). */
  readonly history: HistoryEntry[]
  /** All entries including the redo tail. */
  readonly allEntries: HistoryEntry[]
  readonly cursor: number
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly decisions: JudgedDecision[]
  apply: (opsOrCommand: Op | Op[] | string, source?: OpSource) => ApplyOutcome
  undo: () => boolean
  redo: () => boolean
  reset: () => void
  toJSON: () => SessionJSON
  subscribe: (listener: () => void) => () => void
  /** Stable snapshot object; identity changes after every mutation (useSyncExternalStore friendly). */
  getState: () => SessionState
}

interface Internal {
  session: DfSession
  replay: (ops: Op[], source: OpSource, id: string) => ApplyOutcome
  restore: (cursor: number, decisions: JudgedDecision[], nextId: number) => void
}

export function createDfSession(initialDf: DF, meta: SessionMeta = {}): DfSession {
  return build(initialDf, meta).session
}

function build(initialDf: DF, meta: SessionMeta): Internal {
  let entries: HistoryEntry[] = []
  let snapshots: DF[] = []
  let cursor = 0
  let decisions: JudgedDecision[] = []
  let nextId = 1
  let version = 0
  const listeners = new Set<() => void>()

  const current = (): DF => (cursor === 0 ? initialDf : snapshots[cursor - 1])

  let state: SessionState
  const rebuild = (): void => {
    version += 1
    state = {
      original: initialDf,
      current: current(),
      history: entries.slice(0, cursor),
      cursor,
      canUndo: cursor > 0,
      canRedo: cursor < entries.length,
      decisions,
      version,
    }
  }
  const emit = (): void => {
    rebuild()
    for (const l of [...listeners]) l()
  }
  rebuild()

  const markUndone = (ids: Set<string>, undone: boolean): void => {
    decisions = decisions.map((d) => (ids.has(d.entryId) ? { ...d, undone } : d))
  }

  const applyOps = (ops: Op[], source: OpSource, notify: boolean, forcedId?: string): ApplyOutcome => {
    if (ops.length === 0) return { ok: false, error: 'No operation to apply.' }
    const before = current()
    const r = applyAll(before, ops)
    if (!r.ok) return { ok: false, error: r.error }
    if (cursor < entries.length) {
      // New op after undo: drop the redo tail; its decisions stay recorded as undone.
      markUndone(new Set(entries.slice(cursor).map((e) => e.id)), true)
      entries = entries.slice(0, cursor)
      snapshots = snapshots.slice(0, cursor)
    }
    const decision = judgeOp(before, r.df, ops.length === 1 ? ops[0] : ops, { tier: meta.tier })
    const entry: HistoryEntry = {
      id: forcedId ?? `h${nextId++}`,
      ops,
      code: toCodeLine(ops),
      source,
      rowsBefore: r.rowsBefore,
      rowsAfter: r.rowsAfter,
      summary: r.summary,
      decision,
    }
    entries = [...entries, entry]
    snapshots = [...snapshots, r.df]
    cursor = entries.length
    if (decision) decisions = [...decisions, { entryId: entry.id, decision, undone: false }]
    if (notify) emit()
    return { ok: true, entry }
  }

  const session: DfSession = {
    meta,
    get original() {
      return initialDf
    },
    get current() {
      return current()
    },
    get history() {
      return entries.slice(0, cursor)
    },
    get allEntries() {
      return [...entries]
    },
    get cursor() {
      return cursor
    },
    get canUndo() {
      return cursor > 0
    },
    get canRedo() {
      return cursor < entries.length
    },
    get decisions() {
      return decisions
    },
    apply(opsOrCommand, source = 'ui') {
      if (typeof opsOrCommand === 'string') {
        const p = parse(opsOrCommand)
        if (p.kind === 'error') return { ok: false, error: p.message, suggestion: p.suggestion }
        if (p.kind === 'inspect') return { ok: true, output: runInspect(current(), p.query) }
        return applyOps(p.ops, source === 'ui' ? 'command' : source, true)
      }
      return applyOps(Array.isArray(opsOrCommand) ? opsOrCommand : [opsOrCommand], source, true)
    },
    undo() {
      if (cursor === 0) return false
      cursor -= 1
      markUndone(new Set([entries[cursor].id]), true)
      emit()
      return true
    },
    redo() {
      if (cursor >= entries.length) return false
      markUndone(new Set([entries[cursor].id]), false)
      cursor += 1
      emit()
      return true
    },
    reset() {
      markUndone(new Set(entries.map((e) => e.id)), true)
      entries = []
      snapshots = []
      cursor = 0
      emit()
    },
    toJSON() {
      return {
        v: 1,
        meta,
        entries: entries.map((e) => ({ id: e.id, ops: e.ops, source: e.source })),
        cursor,
        decisions,
        nextId,
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState() {
      return state
    },
  }
  return {
    session,
    replay: (ops, source, id) => applyOps(ops, source, false, id),
    restore: (c, d, n) => {
      cursor = c
      decisions = d
      nextId = Math.max(nextId, n)
      rebuild()
    },
  }
}

/**
 * Rebuild a session from toJSON() output by replaying the stored ops on rebuildInitial(meta).
 * Throws an Error when the JSON is malformed or an op no longer replays.
 */
export function fromJSON(json: unknown, rebuildInitial: (meta: SessionMeta) => DF): DfSession {
  const j = json as Partial<SessionJSON> | null
  if (!j || j.v !== 1 || !Array.isArray(j.entries) || typeof j.cursor !== 'number' || typeof j.meta !== 'object' || j.meta === null) {
    throw new Error('Invalid session data')
  }
  const meta = j.meta
  const inner = build(rebuildInitial(meta), meta)
  for (const e of j.entries) {
    if (!e || !Array.isArray(e.ops)) throw new Error('Invalid session entry')
    const r = inner.replay(e.ops, e.source ?? 'ui', typeof e.id === 'string' ? e.id : `h${j.entries.indexOf(e) + 1}`)
    if (!r.ok) throw new Error(`Replay failed: ${r.error ?? 'unknown error'}`)
  }
  const cursor = Math.max(0, Math.min(j.cursor, j.entries.length))
  const decisions = Array.isArray(j.decisions) ? j.decisions : []
  inner.restore(cursor, decisions, typeof j.nextId === 'number' ? j.nextId : j.entries.length + 1)
  return inner.session
}

/** Convenience alias so callers can write createDfSession.fromJSON(...). */
createDfSession.fromJSON = fromJSON

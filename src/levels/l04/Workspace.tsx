// Level 04 workspace: stage flow, flag tools, hints, Analyst Scan, struggle assist, abort and SUBMIT FOR AUDIT.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Lightbulb, ScanSearch, X } from 'lucide-react'
import type { FlagKind } from '../../engine'
import { levelDefinition } from '../../game/levels/registry'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { useToast } from '../../ui/Toast'
import { CodeRibbon } from './CodeRibbon'
import { completeL04 } from './complete'
import { DatasetInfo } from './DatasetInfo'
import { KIND_LABEL, toggleFlag } from './flagScoring'
import { HistoryPanel } from './HistoryPanel'
import { clearRecord, saveRecord, totalHints } from './missionRecord'
import { useDfSession, useL04 } from './session'
import type { FlagController } from './Spreadsheet'
import { Stage1Panel, Stage2Panel } from './StagePanels'
import { Stage3Panel } from './Stage3Panel'
import { Stage4Panel } from './Stage4Panel'
import { canProceed, meters as buildMeters, objectivesFor } from './stageLogic'
import { MissionHeader, MissionLogPanel, ObjectivesPanel, ToolArea } from './WorkspaceParts'

export function Workspace() {
  const navigate = useNavigate()
  const { push } = useToast()
  const ctx = useL04()
  const { record, update, session, gen, addLog } = ctx
  const state = useDfSession((s) => s)
  const [flagMode, setFlagMode] = useState(false)
  const [brush, setBrush] = useState<FlagKind | null>(null)
  const [tools, setTools] = useState(false)
  const [abort, setAbort] = useState(false)
  const stageDef = levelDefinition(4).stages[record.stage]
  const meters = useMemo(() => buildMeters(state.original, state.current), [state.original, state.current])
  const objectives = objectivesFor(record, meters)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) session.redo()
        else session.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session])

  const flag: FlagController | null = useMemo(() => {
    if (record.stage === 0 && flagMode) {
      return {
        marks: record.stage1.marks.map((m) => ({ ...m, label: 'flag' })),
        onMark: (rowIdx, column) =>
          update((x) => {
            const has = x.stage1.marks.some((m) => m.rowIdx === rowIdx && m.column === column)
            const marks = has ? x.stage1.marks.filter((m) => !(m.rowIdx === rowIdx && m.column === column)) : [...x.stage1.marks, { rowIdx, column }]
            return { ...x, stage1: { ...x.stage1, marks } }
          }),
      }
    }
    if (record.stage === 1 && brush) {
      return {
        marks: record.flags.map((f) => ({ rowIdx: f.rowIdx, column: f.column, label: KIND_LABEL[f.kind] })),
        onMark: (rowIdx, column) => {
          const rowLevel = brush === 'duplicate' || brush === 'anomaly'
          const f = rowLevel ? { rowIdx, kind: brush } : { rowIdx, column, kind: brush }
          if (rowIdx < 0 && brush !== 'type') return
          update((x) => ({ ...x, flags: toggleFlag(x.flags, f) }))
        },
      }
    }
    return null
  }, [record.stage, record.stage1.marks, record.flags, flagMode, brush, update])

  const onScanToggle = useCallback(() => {
    if (record.scanOn) {
      update((x) => ({ ...x, scanOn: false }))
      return
    }
    const free = record.freeScanStage === record.stage
    update((x) => ({ ...x, scanOn: true, scanHints: free ? x.scanHints : x.scanHints.map((h, i) => (i === x.stage ? h + 1 : h)) }))
    push({ message: free ? 'Analyst Scan on (free for this stage).' : 'Analyst Scan on: one hint charged.', tone: free ? 'info' : 'warning' })
  }, [push, record.freeScanStage, record.scanOn, record.stage, update])

  const revealHint = () => {
    update((x) => ({ ...x, hints: x.hints.map((h, i) => (i === x.stage ? Math.min(3, h + 1) : h)) }))
  }

  const proceed = () => {
    addLog({ title: `Stage cleared: ${stageDef.title}`, tone: 'good' })
    setFlagMode(false)
    setBrush(null)
    setTools(false)
    update((x) => {
      const freeEnds = x.freeScanStage === x.stage
      return { ...x, stage: x.stage + 1, stageDecisionStart: session.decisions.length, scanOn: freeEnds ? false : x.scanOn, freeScanStage: freeEnds ? -1 : x.freeScanStage }
    })
  }

  const finish = () => {
    const report = completeL04(record, session, gen)
    const finished = { ...record, status: 'finished' as const, session: session.toJSON(), report }
    saveRecord(finished)
    update(() => finished)
    navigate('/level/4/debrief')
  }

  const doAbort = () => {
    setAbort(false)
    clearRecord()
    push({ message: 'Mission aborted. No XP, credits or bonuses were awarded.', tone: 'warning' })
    navigate('/level/4')
  }

  const showTools = record.stage < 3 || tools
  const hintsShown = stageDef.hints.slice(0, record.hints[record.stage] ?? 0)
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6" data-testid="l04-workspace">
      <MissionHeader onDevComplete={finish} />
      {ctx.assistBanner && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded border border-amber/50 bg-amber/10 p-3 text-sm text-amber" data-testid="assist-banner">
          <ScanSearch size={16} aria-hidden="true" />
          <span className="flex-1">Rough patch detected. NEXUS offers ONE free Analyst Scan for the rest of this stage. No hint is charged.</span>
          <NeonButton size="sm" onClick={ctx.acceptAssist} data-testid="btn-accept-assist">Use free scan</NeonButton>
          <button type="button" onClick={ctx.dismissAssist} aria-label="Dismiss" className="text-amber hover:text-text"><X size={14} aria-hidden="true" /></button>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_280px]">
        <aside className="space-y-4" aria-label="Objectives and dataset info">
          <ObjectivesPanel
            objectives={objectives}
            hints={totalHints(record)}
            proceed={
              canProceed(record, meters) ? (
                <NeonButton className="mt-3" fullWidth onClick={proceed} data-testid="btn-proceed">Proceed <ChevronRight size={14} aria-hidden="true" /></NeonButton>
              ) : null
            }
          />
          <DatasetInfo onQuery={(id) => { if (id === 'shape' || id === 'dtypes') update((x) => ({ ...x, stage1: { ...x.stage1, [id]: true } })) }} />
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Mission workspace">
          <div className="rounded border border-border bg-panel/90 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">Stage {record.stage + 1} · {stageDef.subtitle}</p>
            <h2 className="mb-3 font-display text-lg uppercase tracking-[0.14em] text-text">{stageDef.title}</h2>
            {record.stage === 0 && <Stage1Panel flagMode={flagMode} setFlagMode={setFlagMode} />}
            {record.stage === 1 && <Stage2Panel brush={brush} setBrush={setBrush} />}
            {record.stage === 2 && <Stage3Panel meters={meters} onSkip={() => { update((x) => ({ ...x, stage3: { ...x.stage3, skipped: true } })); proceed() }} />}
            {record.stage === 3 && !tools && <Stage4Panel onBack={() => setTools(true)} onSubmit={finish} />}
            {record.stage === 3 && tools && <NeonButton size="sm" onClick={() => setTools(false)} data-testid="btn-back-audit">Back to the integrity check</NeonButton>}
          </div>
          {showTools && (
            <div className="rounded border border-border bg-panel/90 p-4">
              <ToolArea flag={flag} onScanToggle={onScanToggle} />
            </div>
          )}
          <CodeRibbon />
          <HistoryPanel />
        </section>
        <aside className="min-w-0 lg:col-span-2 2xl:col-span-1" aria-label="Mission log">
          <MissionLogPanel />
        </aside>
      </div>
      <footer className="mt-4 rounded border border-border bg-panel/90 p-3">
        {hintsShown.length > 0 && (
          <div aria-live="polite" className="mb-3 space-y-1.5">
            {hintsShown.map((h, i) => (
              <p key={i} className="flex items-start gap-2 rounded border border-amber/40 bg-amber/[0.06] p-2 text-xs text-amber">
                <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span><span className="font-mono text-[10px] uppercase tracking-[0.14em]">Hint {i + 1}: </span>{h}</span>
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NeonButton size="sm" variant="ghost" onClick={revealHint} disabled={(record.hints[record.stage] ?? 0) >= 3} tooltip={(record.hints[record.stage] ?? 0) >= 3 ? 'No more hints for this stage' : 'Reveal the next hint'} data-testid="btn-hint">
              <Lightbulb size={13} aria-hidden="true" /> Hint
            </NeonButton>
            <span data-testid="hints-used" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Hints used: <span className="text-amber">{totalHints(record)}</span></span>
          </div>
          <NeonButton size="sm" variant="danger" onClick={() => setAbort(true)} data-testid="btn-abort-mission"><AlertTriangle size={13} aria-hidden="true" /> Abort mission</NeonButton>
        </div>
      </footer>
      <Modal
        open={abort}
        onClose={() => setAbort(false)}
        title="Abort mission?"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setAbort(false)} data-testid="btn-abort-cancel">Keep playing</NeonButton>
            <NeonButton variant="danger" onClick={doAbort} data-testid="btn-abort-confirm">Abort and award nothing</NeonButton>
          </>
        }
      >
        <p>The saved session is discarded. No XP, credits or bonuses are recorded for this attempt.</p>
      </Modal>
    </main>
  )
}

// DEV_ONLY: Level 04 engine verification page (/dev/engine): console, table, history, quality report, live health.
import { useMemo, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import {
  assessQuality,
  createDfSession,
  displayCell,
  generateStudents,
  liveHealth,
  problemsAt,
  tinyDirty,
  type DfSession,
  type GeneratedDataset,
  type Tier,
} from '../engine'
import { Badge, NeonButton, Panel, ProgressBar } from '../ui'

interface Line {
  cmd: string
  text: string
  error?: boolean
}

const TIERS: Tier[] = ['assisted', 'independent', 'expert']

export function DevEngine() {
  const [tier, setTier] = useState<Tier>('assisted')
  const [seed, setSeed] = useState(42)
  const [dataset, setDataset] = useState<GeneratedDataset | null>(null)
  const [session, setSession] = useState<DfSession>(() => createDfSession(tinyDirty, { label: 'tinyDirty' }))
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [typed, setTyped] = useState<string[]>([])
  const [browse, setBrowse] = useState(-1)

  const state = useSyncExternalStore(session.subscribe, session.getState)
  const df = state.current
  const health = useMemo(() => liveHealth(df), [df])
  const report = useMemo(
    () =>
      dataset
        ? assessQuality(df, { ...dataset, tier: dataset.meta.tier, history: state.history, decisions: state.decisions })
        : null,
    [dataset, df, state],
  )

  const generate = () => {
    const g = generateStudents({ seed, tier })
    setDataset(g)
    setSession(createDfSession(g.dirty, { seed, tier }))
    setLines([])
  }
  const loadTiny = () => {
    setDataset(null)
    setSession(createDfSession(tinyDirty, { label: 'tinyDirty' }))
    setLines([])
  }

  const run = () => {
    const cmd = input.trim()
    if (!cmd) return
    const r = session.apply(cmd, 'command')
    const text = r.ok ? (r.output ?? r.entry?.summary ?? '') : `${r.error ?? 'Error'}${r.suggestion ? `\n${r.suggestion}` : ''}`
    setLines((ls) => [...ls.slice(-30), { cmd, text, error: !r.ok }])
    setTyped((t) => [...t, cmd])
    setBrowse(-1)
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') run()
    else if (e.key === 'ArrowUp' && typed.length) {
      e.preventDefault()
      const i = browse < 0 ? typed.length - 1 : Math.max(0, browse - 1)
      setBrowse(i)
      setInput(typed[i])
    } else if (e.key === 'ArrowDown' && browse >= 0) {
      e.preventDefault()
      const i = browse + 1
      if (i >= typed.length) {
        setBrowse(-1)
        setInput('')
      } else {
        setBrowse(i)
        setInput(typed[i])
      }
    }
  }

  const metrics: Array<[string, number]> = report
    ? [
        ['Consistency', report.consistency * 100],
        ['Identification', report.identification * 100],
        ['Decisions', report.decisions * 100],
        ['Preservation', report.preservation * 100],
        ['Economy', report.economy * 100],
        ['Integrity', report.integrity],
        ['Efficiency', report.efficiency],
      ]
    : []

  return (
    <div className="min-h-screen bg-bg p-6 text-text">
      <h1 className="mb-4 font-display text-xl tracking-widest text-cyan">DEV / ENGINE</h1>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted">
          Tier
          <select
            className="mt-1 rounded border border-border bg-panel2 px-2 py-1 text-text"
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-muted">
          Seed
          <input
            type="number"
            className="mt-1 w-28 rounded border border-border bg-panel2 px-2 py-1 font-mono text-text"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
        </label>
        <NeonButton onClick={generate}>GENERATE</NeonButton>
        <NeonButton variant="ghost" onClick={loadTiny}>
          LOAD tinyDirty
        </NeonButton>
        <NeonButton variant="ghost" onClick={() => session.undo()} disabled={!state.canUndo} tooltip="Nothing to undo">
          UNDO
        </NeonButton>
        <NeonButton variant="ghost" onClick={() => session.redo()} disabled={!state.canRedo} tooltip="Nothing to redo">
          REDO
        </NeonButton>
        <NeonButton variant="danger" onClick={() => session.reset()}>
          RESET
        </NeonButton>
        <Badge tone="cyan">rows: {df.rows.length}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Console">
            <label htmlFor="dev-cmd" className="sr-only">
              Command
            </label>
            <input
              id="dev-cmd"
              className="w-full rounded border border-border bg-panel2 px-3 py-2 font-mono text-sm text-text"
              placeholder="df.isnull().sum()   (Enter runs, Up/Down history, help lists commands)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
            />
            <div className="mt-3 max-h-80 overflow-auto rounded bg-bg p-3 font-mono text-xs" aria-live="polite">
              {lines.map((l, i) => (
                <div key={i} className="mb-2">
                  <div className="text-cyan">&gt;&gt;&gt; {l.cmd}</div>
                  <pre className={l.error ? 'whitespace-pre-wrap text-red' : 'whitespace-pre text-text'}>{l.text}</pre>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={`Data (first 30 of ${df.rows.length} rows)`}>
            <div className="overflow-auto">
              <table className="font-mono text-xs">
                <thead>
                  <tr>
                    <th className="px-2 text-left text-muted">idx</th>
                    {df.columns.map((c) => (
                      <th key={c} className="px-2 text-right text-muted">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {df.rows.slice(0, 30).map((r) => (
                    <tr key={r.idx} className="border-t border-border">
                      <td className="px-2 text-muted">{r.idx}</td>
                      {df.columns.map((c) => {
                        const p = problemsAt(health, r.idx, c)
                        const cls = p.includes('missing') || p.includes('placeholder')
                          ? 'text-red'
                          : p.includes('out_of_range')
                            ? 'text-magenta'
                            : p.includes('unknown_label')
                              ? 'text-violet'
                              : p.includes('wrong_type')
                                ? 'text-cyan'
                                : p.includes('duplicate')
                                  ? 'text-amber'
                                  : ''
                        return (
                          <td key={c} className={`whitespace-pre px-2 text-right ${cls}`} title={p.join(', ') || undefined}>
                            {displayCell(df, c, r.v[c] ?? null)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Quality Report">
            {report ? (
              <div className="space-y-2">
                {metrics.map(([label, v]) => (
                  <div key={label}>
                    <ProgressBar value={v} label={label} showValue={false} tone={label === 'Integrity' ? 'green' : 'cyan'} />
                    <span className="font-mono text-xs">{v.toFixed(1)}</span>
                  </div>
                ))}
                <p className="font-mono text-xs text-muted">
                  rows {report.counts.before} to {report.counts.after}, resolved {report.resolved}/{report.totalIssues}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Generate a dataset to see the report.</p>
            )}
          </Panel>

          <Panel title="Live health">
            <ul className="font-mono text-xs">
              <li>nulls: {health.totalNulls}</li>
              <li>placeholders: {health.totalPlaceholders}</li>
              <li>duplicates (exact / normalised): {health.duplicates} / {health.normalizedDuplicates}</li>
              <li>out of range: {health.totalOutOfRange}</li>
              <li>unknown labels: {health.totalUnknownLabels}</li>
              <li>dtype mismatches: {health.dtypeMismatches.map((m) => `${m.column} (${m.dtype})`).join(', ') || 0}</li>
              <li className="text-cyan">total: {health.total}</li>
            </ul>
          </Panel>

          {dataset && (
            <Panel title="Issues injected">
              <ul className="font-mono text-xs">
                {Object.entries(dataset.meta.issueCounts).map(([k, n]) => (
                  <li key={k}>
                    {k}: {n}
                  </li>
                ))}
                <li className="text-muted">ghosts: {dataset.ghosts.join(', ')}</li>
              </ul>
            </Panel>
          )}

          <Panel title="History">
            <ol className="space-y-2 font-mono text-xs">
              {session.allEntries.map((e, i) => {
                const d = e.decision
                return (
                  <li key={e.id} className={i >= state.cursor ? 'opacity-40' : ''}>
                    <div className="text-cyan">{e.code}</div>
                    <div className="text-muted">
                      {e.rowsBefore} to {e.rowsAfter} rows · {e.source}
                      {i >= state.cursor ? ' · undone' : ''}
                    </div>
                    {d && (
                      <div className={d.redundant ? 'text-amber' : d.good === false ? 'text-red' : d.good ? 'text-green' : 'text-muted'}>
                        {d.redundant ? 'REDUNDANT' : d.good === false ? 'BAD' : d.good ? 'GOOD' : 'NEUTRAL'}: {d.explanation}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default DevEngine

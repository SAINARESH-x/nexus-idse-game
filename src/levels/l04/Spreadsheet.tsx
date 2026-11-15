// Spreadsheet (Mode A): the current frame with sticky header/idx, view-only sort and filters, edits, column menus and flags.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, ScanSearch, Trash2 } from 'lucide-react'
import { columnDtype, duplicateMask, isNumericDtype, liveHealth, nullCounts, problemsAt } from '../../engine'
import type { CellProblem, Op } from '../../engine'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { ColumnMenu } from './ColumnMenu'
import { parseCellInput } from './columnForms'
import { useDfSession, useL04 } from './session'
import { SheetRow } from './SheetRow'
import { sortCode, viewRows } from './sheetModel'
import type { ChipFilter, SortState } from './sheetModel'

export interface FlagMark {
  rowIdx: number
  column?: string
  label: string
}

export interface FlagController {
  marks: FlagMark[]
  onMark: (rowIdx: number, column?: string) => void
}

export function Spreadsheet({ flag = null, onScanToggle }: { flag?: FlagController | null; onScanToggle?: () => void }) {
  const { run, highlights, record, setRibbon, focusColumn } = useL04()
  const df = useDfSession((s) => s.current)
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [chip, setChip] = useState<ChipFilter>('none')
  const [sel, setSel] = useState<{ idx: number; col: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const wrapRef = useRef<HTMLDivElement>(null)

  const health = useMemo(() => liveHealth(df), [df])
  const nulls = useMemo(() => nullCounts(df), [df])
  const dup = useMemo(() => {
    const m = duplicateMask(df)
    return new Set(df.rows.filter((_, i) => m[i]).map((r) => r.idx).concat(Object.keys(health.rowProblems).map(Number)))
  }, [df, health])
  const rows = useMemo(() => viewRows(df, highlights ? health : null, sort, filters, chip, health), [df, health, highlights, sort, filters, chip])
  const problemMap = useMemo(() => {
    if (!highlights) return null
    const m = new Map<number, Record<string, CellProblem[]>>()
    for (const r of df.rows) {
      const o: Record<string, CellProblem[]> = {}
      let any = false
      for (const c of df.columns) {
        const ps = problemsAt(health, r.idx, c).filter((p) => p !== 'duplicate')
        if (ps.length) {
          o[c] = ps
          any = true
        }
      }
      if (any) m.set(r.idx, o)
    }
    return m
  }, [df, health, highlights])
  const markMap = useMemo(() => {
    if (!flag) return null
    const m = new Map<number, Record<string, string>>()
    for (const f of flag.marks) {
      if (f.rowIdx < 0) continue
      const o = { ...(m.get(f.rowIdx) ?? {}) }
      o[f.column ?? '*'] = f.label
      m.set(f.rowIdx, o)
    }
    return m
  }, [flag])
  const headerMarks = useMemo(() => new Map((flag?.marks ?? []).filter((f) => f.rowIdx < 0 && f.column).map((f) => [f.column as string, f.label])), [flag])
  const wrongType = useMemo(() => new Set(health.dtypeMismatches.map((d) => d.column)), [health])

  useEffect(() => {
    if (!focusColumn) return
    const el = wrapRef.current?.querySelector(`[data-col="${focusColumn.column}"]`)
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [focusColumn])

  const flagRef = useRef(flag)
  flagRef.current = flag
  const onSelect = useCallback((idx: number, col: string) => {
    if (flagRef.current) {
      flagRef.current.onMark(idx, col)
      return
    }
    setSel({ idx, col })
    setEditing(false)
  }, [])
  const onStartEdit = useCallback((idx: number, col: string) => {
    if (flagRef.current) return
    setSel({ idx, col })
    setEditing(true)
  }, [])
  const dfRef = useRef(df)
  dfRef.current = df
  const onCommit = useCallback(
    (idx: number, col: string, text: string) => {
      setEditing(false)
      const d = dfRef.current
      const value = parseCellInput(text, isNumericDtype(columnDtype(d, col)))
      const cur = d.rows.find((r) => r.idx === idx)?.v[col] ?? null
      if (Object.is(cur, value)) return
      run({ type: 'set_cell', idx, column: col, value }, 'ui')
    },
    [run],
  )
  const onCancel = useCallback(() => setEditing(false), [])
  const onToggle = useCallback((idx: number) => setChecked((s) => { const n = new Set(s); if (n.has(idx)) n.delete(idx); else n.add(idx); return n }), [])
  const onMarkRow = useCallback((idx: number) => flagRef.current?.onMark(idx), [])

  const applyOps = (ops: Op[]) => run(ops, 'ui')
  const toggleSort = (col: string) => {
    const next: SortState | null = !sort || sort.column !== col ? { column: col, ascending: true } : sort.ascending ? { column: col, ascending: false } : null
    setSort(next)
    setRibbon(next ? { kind: 'view', code: sortCode(next), sentence: 'View only: the order on screen changes, the data and history do not.' } : null)
  }
  const deleteRows = () => {
    const idxs = [...checked].filter((i) => df.rows.some((r) => r.idx === i)).sort((a, b) => a - b)
    if (!idxs.length) return
    const r = run({ type: 'drop_rows', idxs }, 'ui')
    if (r.ok) setChecked(new Set())
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!sel || editing || flag) return
    if (e.key === 'Enter') {
      e.preventDefault()
      setEditing(true)
      return
    }
    const ri = rows.findIndex((r) => r.idx === sel.idx)
    const ci = df.columns.indexOf(sel.col)
    const move: Record<string, [number, number]> = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const m = move[e.key]
    if (!m) return
    e.preventDefault()
    const nr = rows[Math.min(rows.length - 1, Math.max(0, ri + m[0]))]
    const nc = df.columns[Math.min(df.columns.length - 1, Math.max(0, ci + m[1]))]
    if (nr && nc) setSel({ idx: nr.idx, col: nc })
  }

  const chips: Array<[ChipFilter, string]> = [['missing', 'MISSING'], ['duplicates', 'DUPLICATES'], ...(highlights ? ([['suspicious', 'SUSPICIOUS']] as Array<[ChipFilter, string]>) : [])]
  return (
    <div className="space-y-2" data-testid="spreadsheet">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={chip === id} onClick={() => setChip(chip === id ? 'none' : id)} className={cn('rounded border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em]', chip === id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border text-muted hover:text-text')}>
            {label}
          </button>
        ))}
        <span className="font-mono text-[10px] text-muted">{rows.length} of {df.rows.length} rows shown</span>
        {sort && <Badge tone="cyan"><Eye size={10} className="mr-1 inline" aria-hidden="true" />VIEW sorted by {sort.column}</Badge>}
        <span className="ml-auto flex flex-wrap gap-2">
          {record.tier !== 'assisted' && onScanToggle && (
            <NeonButton size="sm" variant={record.scanOn ? 'primary' : 'ghost'} onClick={onScanToggle} data-testid="btn-analyst-scan" tooltip={record.scanOn ? 'Switch the highlights off' : record.freeScanStage === record.stage ? 'Free scan for this stage' : 'Switching the scan on costs one hint'}>
              <ScanSearch size={12} aria-hidden="true" /> Analyst Scan {record.scanOn ? 'ON' : 'OFF'}
            </NeonButton>
          )}
          <NeonButton size="sm" variant="ghost" onClick={() => run({ type: 'drop_duplicates' }, 'ui')} data-testid="btn-drop-duplicates" disabled={!!flag} tooltip={flag ? 'Editing is off while flagging' : 'df = df.drop_duplicates()'}>
            <Copy size={12} aria-hidden="true" /> Drop duplicates
          </NeonButton>
          <NeonButton size="sm" variant="danger" onClick={deleteRows} disabled={checked.size === 0 || !!flag} tooltip={checked.size === 0 ? 'Tick rows first' : undefined} data-testid="btn-delete-rows">
            <Trash2 size={12} aria-hidden="true" /> Delete rows ({checked.size})
          </NeonButton>
        </span>
      </div>
      <div ref={wrapRef} className="max-h-[28rem] overflow-auto rounded border border-border" onKeyDown={onKeyDown} tabIndex={0} aria-label="Dataset table">
        <table className="min-w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-panel2">
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-border bg-panel2 px-1.5 py-1 font-mono text-[10px] text-muted">idx</th>
              {df.columns.map((col) => {
                const dt = columnDtype(df, col)
                const wt = highlights && wrongType.has(col)
                const hm = headerMarks.get(col)
                return (
                  <th key={col} data-col={col} className={cn('border-b border-border px-2 py-1 align-top', wt && 'outline outline-2 -outline-offset-2 outline-cyan', focusColumn?.column === col && 'bg-cyan/10')}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => (flag ? flag.onMark(-1, col) : toggleSort(col))} className="font-mono text-[11px] font-semibold text-text hover:text-cyan" aria-label={flag ? `Flag column ${col}` : `Sort by ${col}`}>
                        {col}
                        {sort?.column === col && (sort.ascending ? <ArrowUp size={10} className="ml-0.5 inline" aria-hidden="true" /> : <ArrowDown size={10} className="ml-0.5 inline" aria-hidden="true" />)}
                      </button>
                      <ColumnMenu df={df} column={col} onApply={applyOps} disabled={!!flag} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 font-mono text-[9px]">
                      <span className="rounded border border-border px-1 text-muted">{dt}</span>
                      <span className={nulls[col] ? 'text-red' : 'text-muted'}>{nulls[col]} null</span>
                      {wt && <span className="rounded bg-cyan/20 px-1 text-cyan">text</span>}
                      {hm && <span className="rounded bg-amber/25 px-1 uppercase text-amber">{hm.slice(0, 4)}</span>}
                    </div>
                    <input aria-label={`Filter ${col}`} placeholder="filter" value={filters[col] ?? ''} onChange={(e) => setFilters((f) => ({ ...f, [col]: e.target.value }))} className="mt-1 w-full min-w-[4rem] rounded border border-border bg-bg px-1 py-0.5 font-mono text-[10px] text-text focus:border-cyan focus:outline-none" />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <SheetRow
                key={r.idx}
                row={r}
                df={df}
                columns={df.columns}
                problems={problemMap?.get(r.idx) ?? null}
                duplicate={highlights && dup.has(r.idx)}
                selectedCol={sel?.idx === r.idx ? sel.col : null}
                editing={editing && sel?.idx === r.idx}
                checked={checked.has(r.idx)}
                marks={markMap?.get(r.idx) ?? null}
                onSelect={onSelect}
                onStartEdit={onStartEdit}
                onCommit={onCommit}
                onCancel={onCancel}
                onToggle={onToggle}
                onMarkRow={flag ? onMarkRow : null}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

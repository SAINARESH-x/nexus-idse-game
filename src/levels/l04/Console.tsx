// Console (Mode C): typed pandas lines through the hand-written parser only; help, clear, history, Tab suggestion, cheat sheet.
import { useEffect, useRef, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { parse, SUPPORTED_COMMANDS } from '../../engine'
import { cn } from '../../ui/cn'
import { useL04 } from './session'
import type { ConsoleLine } from './session'

const TONE: Record<ConsoleLine['kind'], string> = { in: 'text-cyan', out: 'text-text', error: 'text-red', info: 'text-muted' }

export function Console() {
  const { run, consoleLines, setConsoleLines, setRibbon } = useL04()
  const [text, setText] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [pos, setPos] = useState(-1)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const idRef = useRef(consoleLines.length + 1)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [consoleLines])

  const print = (...lines: Array<Omit<ConsoleLine, 'id'>>) => setConsoleLines((l) => [...l, ...lines.map((x) => ({ ...x, id: idRef.current++ }))].slice(-300))

  const exec = (raw: string) => {
    const line = raw.trim()
    if (!line) return
    setHist((h) => [...h, line])
    setPos(-1)
    setText('')
    if (line === 'clear') {
      setConsoleLines(() => [])
      return
    }
    print({ kind: 'in', text: `df > ${line}` })
    if (line === 'help') {
      print({ kind: 'info', text: 'Supported commands (a simplified subset of pandas):' }, ...SUPPORTED_COMMANDS.map((c) => ({ kind: 'out' as const, text: `  ${c.code.padEnd(52)} ${c.explain}` })))
      return
    }
    let p
    try {
      p = parse(line)
    } catch {
      p = { kind: 'error' as const, message: 'This console could not read that line.' }
    }
    if (p.kind === 'error') {
      print({ kind: 'error', text: p.message }, ...(p.suggestion ? [{ kind: 'info' as const, text: `Did you mean: ${p.suggestion}  (Tab inserts it)` }] : []))
      setSuggestion(p.suggestion ?? null)
      return
    }
    setSuggestion(null)
    const r = run(line, 'command')
    if (p.kind === 'inspect') {
      setRibbon({ kind: 'inspect', code: p.code, sentence: 'Inspect only: nothing in the data changes.' })
      print({ kind: 'out', text: r.output ?? '' })
      return
    }
    if (!r.ok) print({ kind: 'error', text: r.error ?? 'Operation failed.' })
    else if (r.entry) print({ kind: 'out', text: `${r.entry.summary}  Shape: ${r.entry.rowsBefore} to ${r.entry.rowsAfter} rows.` })
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') exec(text)
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!hist.length) return
      const n = pos < 0 ? hist.length - 1 : Math.max(0, pos - 1)
      setPos(n)
      setText(hist[n])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (pos < 0) return
      const n = pos + 1
      if (n >= hist.length) {
        setPos(-1)
        setText('')
      } else {
        setPos(n)
        setText(hist[n])
      }
    } else if (e.key === 'Tab') {
      const s = suggestion ?? SUPPORTED_COMMANDS.find((c) => text && c.code.startsWith(text))?.code.split(' / ')[0]
      if (s) {
        e.preventDefault()
        setText(s)
      }
    }
  }

  return (
    <div className="space-y-2" data-testid="console">
      <div className="h-72 overflow-auto rounded border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed" aria-live="polite">
        {consoleLines.length === 0 && <p className="text-muted">NEXUS pandas console. Type help for the supported commands. Typing code is optional.</p>}
        {consoleLines.map((l) => (
          <pre key={l.id} className={cn('whitespace-pre-wrap', TONE[l.kind])}>{l.text}</pre>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 rounded border border-cyan/40 bg-bg px-3 py-2">
        <span className="font-mono text-xs text-cyan">df &gt;</span>
        <input aria-label="Console input" data-testid="console-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} spellCheck={false} autoComplete="off" className="flex-1 bg-transparent font-mono text-xs text-text outline-none" placeholder="df.shape" />
      </div>
      <button type="button" onClick={() => setSheet((s) => !s)} aria-expanded={sheet} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-cyan">
        <BookOpen size={12} aria-hidden="true" /> Cheat sheet
      </button>
      {sheet && (
        <ul className="grid gap-1 md:grid-cols-2">
          {SUPPORTED_COMMANDS.map((c) => (
            <li key={c.code}>
              <button type="button" onClick={() => setText(c.code.split(' / ')[0])} className="w-full rounded border border-border bg-panel2/50 p-1.5 text-left hover:border-cyan/60">
                <code className="block font-mono text-[10px] text-cyan">{c.code}</code>
                <span className="text-[10px] text-muted">{c.explain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

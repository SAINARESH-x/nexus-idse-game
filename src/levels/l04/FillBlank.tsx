// Fill the blank: drag (or click) chips into the gaps of a real command; wrong chips explain themselves.
import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { BLANK_TEMPLATES, assemble, checkChip, dryRun, isComplete } from './fillBlank'
import { useDfSession, useL04 } from './session'

export function FillBlank() {
  const { run, update, record } = useL04()
  const df = useDfSession((s) => s.current)
  const [tid, setTid] = useState(() => BLANK_TEMPLATES.find((t) => dryRun(df, t).ok)?.id ?? BLANK_TEMPLATES[0].id)
  const t = BLANK_TEMPLATES.find((x) => x.id === tid) ?? BLANK_TEMPLATES[0]
  const [filled, setFilled] = useState<Array<string | null>>(() => t.answers.map(() => null))
  const [picked, setPicked] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const dry = useMemo(() => dryRun(df, t), [df, t])
  const complete = isComplete(t, filled)

  const choose = (id: string) => {
    setTid(id)
    const nt = BLANK_TEMPLATES.find((x) => x.id === id) ?? BLANK_TEMPLATES[0]
    setFilled(nt.answers.map(() => null))
    setMessage(null)
    setPicked(null)
  }

  const drop = (gap: number, chipId: string) => {
    const c = checkChip(t, gap, chipId)
    setMessage({ ok: c.correct, text: c.correct ? `Gap ${gap + 1}: correct.` : c.explanation })
    if (c.correct) setFilled((f) => f.map((x, i) => (i === gap ? chipId : x)))
    setPicked(null)
  }

  const onRun = () => {
    const r = run(assemble(t, filled), 'command')
    if (r.ok) {
      update((x) => ({ ...x, stage3: { ...x.stage3, fillBlank: true } }))
      setMessage({ ok: true, text: 'The command ran. A command is just these parts in order.' })
    }
  }

  return (
    <div className="space-y-3" data-testid="fill-blank">
      <label className="block text-[11px] text-muted">Drill
        <select className="w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text" value={tid} onChange={(e) => choose(e.target.value)}>
          {BLANK_TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
      </label>
      <p className="flex flex-wrap items-center gap-0.5 rounded border border-border bg-bg p-3 font-mono text-xs text-text">
        {t.parts.map((p, i) => (
          <span key={i} className="contents">
            <span>{p}</span>
            {i < t.answers.length && (
              <button
                type="button"
                data-testid={`gap-${i}`}
                aria-label={`Gap ${i + 1}${filled[i] ? `: ${filled[i]}` : ''}`}
                onClick={() => picked && drop(i, picked)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); drop(i, e.dataTransfer.getData('text/plain')) }}
                className={cn('mx-0.5 min-w-[4rem] rounded border border-dashed px-2 py-0.5', filled[i] ? 'border-green bg-green/10 text-green' : picked ? 'border-cyan text-cyan' : 'border-muted text-muted')}
              >
                {filled[i] ?? '____'}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Chip tray">
        {t.chips.map((c) => (
          <button key={c.id} type="button" draggable data-testid={`chip-${c.id}`} onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)} onClick={() => setPicked(picked === c.id ? null : c.id)} aria-pressed={picked === c.id} className={cn('rounded border px-2 py-1 font-mono text-[11px]', picked === c.id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border bg-panel2 text-text hover:border-cyan/60')}>
            {c.text}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">Drag a chip onto a gap, or click a chip and then a gap.</p>
      {message && <p aria-live="polite" className={cn('text-xs', message.ok ? 'text-green' : 'text-amber')}>{message.text}</p>}
      {!dry.ok && <p className="text-xs text-red">On the current data this command would fail: {dry.error} Try another drill or fix the data first.</p>}
      <NeonButton onClick={onRun} disabled={!complete || !dry.ok} tooltip={!complete ? 'Fill every gap first' : !dry.ok ? 'This command would fail on the current data' : undefined} data-testid="btn-blank-run">
        <Play size={13} aria-hidden="true" /> Run command
      </NeonButton>
      {record.stage3.fillBlank && <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-green">Fill-the-blank objective complete</p>}
    </div>
  )
}

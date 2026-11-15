// Command Builder (coding phase 2): target -> method (filtered by dtype) -> arguments, live preview, RUN through the parser.
import { useEffect, useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { buildLine, initialArgs, methodsFor, previewLine } from './builderModel'
import { FillBlank } from './FillBlank'
import { useDfSession, useL04 } from './session'

const field = 'w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text focus:border-cyan focus:outline-none'

export function Builder() {
  const { run, update } = useL04()
  const df = useDfSession((s) => s.current)
  const [mode, setMode] = useState<'build' | 'blank'>('build')
  const [target, setTarget] = useState('df')
  const methods = useMemo(() => methodsFor(df, target), [df, target])
  const [methodId, setMethodId] = useState(methods[0]?.id ?? '')
  const method = methods.find((m) => m.id === methodId) ?? methods[0]
  const [args, setArgs] = useState<Record<string, string>>(method ? initialArgs(method) : {})

  useEffect(() => {
    if (!methods.some((m) => m.id === methodId) && methods[0]) {
      setMethodId(methods[0].id)
      setArgs(initialArgs(methods[0]))
    }
  }, [methods, methodId])

  const line = method ? buildLine(method, target, args) : ''
  const preview = useMemo(() => (line ? previewLine(df, line) : { ok: false, text: '' }), [df, line])

  const onRun = () => {
    const r = run(line, 'command')
    if (r.ok && r.entry && !r.entry.decision?.redundant) update((x) => ({ ...x, stage3: { ...x.stage3, builderRepair: true } }))
  }

  return (
    <div className="space-y-3" data-testid="builder">
      <div className="flex gap-2" role="group" aria-label="Builder mode">
        {(['build', 'blank'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn('rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]', mode === m ? 'border-cyan bg-cyan/10 text-cyan' : 'border-border text-muted')}>
            {m === 'build' ? 'Build a command' : 'Fill the blank'}
          </button>
        ))}
      </div>
      {mode === 'blank' ? (
        <FillBlank />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-[11px] text-muted">STEP 1 · target
              <select data-testid="builder-target" className={field} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="df">df (whole table)</option>
                {df.columns.map((c) => <option key={c} value={c}>df['{c}']</option>)}
              </select>
            </label>
            <label className="block text-[11px] text-muted">STEP 2 · method
              <select data-testid="builder-method" className={field} value={method?.id ?? ''} onChange={(e) => { const m = methods.find((x) => x.id === e.target.value); setMethodId(e.target.value); if (m) setArgs(initialArgs(m)) }}>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <div className="space-y-2">
              <p className="text-[11px] text-muted">STEP 3 · arguments</p>
              {method?.args.length === 0 && <p className="text-[11px] text-muted">No arguments needed.</p>}
              {method?.args.map((a) => (
                <label key={a.key} className="block text-[10px] text-muted">{a.label}
                  {a.kind === 'select' ? (
                    <select className={field} value={args[a.key] ?? a.initial} onChange={(e) => setArgs((x) => ({ ...x, [a.key]: e.target.value }))}>
                      {a.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className={field} type={a.kind === 'number' ? 'number' : 'text'} value={args[a.key] ?? a.initial} onChange={(e) => setArgs((x) => ({ ...x, [a.key]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </div>
          {method && <p className="text-[11px] text-muted">{method.explain}</p>}
          <div className="rounded border border-cyan/30 bg-bg p-2">
            <code data-testid="builder-line" className="block font-mono text-xs text-cyan">{line}</code>
            <p className={cn('mt-1 text-[11px]', preview.ok ? 'text-green' : 'text-red')}>{preview.text}</p>
          </div>
          <NeonButton onClick={onRun} disabled={!line} data-testid="btn-builder-run">
            <Play size={13} aria-hidden="true" /> Run
          </NeonButton>
        </>
      )}
    </div>
  )
}

// Column menu: Fill missing / Standardise text / Convert type / Replace values forms, each with a PREVIEW line.
import { useMemo, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { columnDtype, isNumericDtype, toCodeLine } from '../../engine'
import type { DF, Op, StrFn } from '../../engine'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { previewOps } from './builderModel'
import { convertOps, fillOps, replaceOps, standardiseOps } from './columnForms'
import type { ConvertTo, FillHow } from './columnForms'

type Action = 'fill' | 'standardise' | 'convert' | 'replace'
const TITLES: Record<Action, string> = { fill: 'Fill missing...', standardise: 'Standardise text...', convert: 'Convert type...', replace: 'Replace values...' }

const field = 'w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text focus:border-cyan focus:outline-none'

function ColumnForm({ df, column, action, onApply, onClose }: { df: DF; column: string; action: Action; onApply: (ops: Op[]) => void; onClose: () => void }) {
  const numeric = isNumericDtype(columnDtype(df, column))
  const [how, setHow] = useState<FillHow>(numeric ? 'median' : 'mode')
  const [value, setValue] = useState('')
  const [fns, setFns] = useState<StrFn[]>(['strip'])
  const [to, setTo] = useState<ConvertTo>('float')
  const [stripPct, setStripPct] = useState(!numeric)
  const [mode, setMode] = useState<'label' | 'substring'>('label')
  const [from, setFrom] = useState('')
  const [repl, setRepl] = useState('')

  const ops: Op[] = useMemo(() => {
    if (action === 'fill') return fillOps(column, how, value, numeric)
    if (action === 'standardise') return standardiseOps(column, fns)
    if (action === 'convert') return convertOps(column, to, stripPct)
    return replaceOps(column, mode, from, repl, numeric)
  }, [action, column, how, value, numeric, fns, to, stripPct, mode, from, repl])
  const preview = useMemo(() => (ops.length ? previewOps(df, ops) : { ok: false, text: 'Choose at least one step.', ops }), [df, ops])

  return (
    <Modal
      open
      onClose={onClose}
      title={`${TITLES[action].replace('...', '')}: ${column}`}
      footer={
        <>
          <NeonButton variant="ghost" onClick={onClose}>Cancel</NeonButton>
          <NeonButton data-testid="btn-column-apply" disabled={!preview.ok} tooltip={preview.ok ? undefined : preview.text} onClick={() => onApply(ops)}>Apply</NeonButton>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {action === 'fill' && (
          <>
            <label className="block text-xs text-muted">Fill blanks with
              <select className={field} value={how} onChange={(e) => setHow(e.target.value as FillHow)}>
                {numeric && <option value="median">median()</option>}
                {numeric && <option value="mean">mean()</option>}
                <option value="mode">mode()[0]</option>
                <option value="value">a value</option>
              </select>
            </label>
            {how === 'value' && <label className="block text-xs text-muted">Value<input className={field} value={value} onChange={(e) => setValue(e.target.value)} /></label>}
          </>
        )}
        {action === 'standardise' && (
          <fieldset className="flex flex-wrap gap-3 text-xs text-text">
            <legend className="mb-1 text-muted">Steps, in order</legend>
            {(['strip', 'lower', 'upper', 'title'] as StrFn[]).map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input type="checkbox" className="accent-cyan" checked={fns.includes(f)} onChange={() => setFns((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))} />
                str.{f}()
              </label>
            ))}
          </fieldset>
        )}
        {action === 'convert' && (
          <>
            <label className="block text-xs text-muted">Convert to
              <select className={field} value={to} onChange={(e) => setTo(e.target.value as ConvertTo)}>
                <option value="float">astype(float)</option>
                <option value="int">astype(int)</option>
                <option value="str">astype(str)</option>
                <option value="numeric">pd.to_numeric(errors='coerce')</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-text">
              <input type="checkbox" className="accent-cyan" checked={stripPct} onChange={(e) => setStripPct(e.target.checked)} />
              First remove '%' with str.replace('%', '')
            </label>
          </>
        )}
        {action === 'replace' && (
          <>
            <label className="block text-xs text-muted">Mode
              <select className={field} value={mode} onChange={(e) => setMode(e.target.value as 'label' | 'substring')}>
                <option value="label">exact label: replace({'{'}old: new{'}'})</option>
                <option value="substring">text inside values: str.replace(old, new)</option>
              </select>
            </label>
            <label className="block text-xs text-muted">Old<input className={field} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="block text-xs text-muted">New<input className={field} value={repl} onChange={(e) => setRepl(e.target.value)} /></label>
          </>
        )}
        <p className="rounded border border-border bg-bg p-2 font-mono text-[11px] text-cyan">{ops.length ? toCodeLine(ops) : '...'}</p>
        <p data-testid="column-preview" className={preview.ok ? 'text-xs text-green' : 'text-xs text-red'} aria-live="polite">{preview.text}</p>
      </div>
    </Modal>
  )
}

export function ColumnMenu({ df, column, onApply, disabled }: { df: DF; column: string; onApply: (ops: Op[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  return (
    <span className="relative">
      <button
        type="button"
        aria-label={`Column menu for ${column}`}
        aria-expanded={open}
        disabled={disabled}
        title={disabled ? 'Column tools are off while flagging' : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="rounded p-0.5 text-muted hover:text-cyan disabled:opacity-40"
      >
        <MoreVertical size={12} aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="absolute left-0 top-5 z-30 w-44 rounded border border-border bg-panel2 py-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          {(Object.keys(TITLES) as Action[]).map((a) => (
            <li key={a}>
              <button type="button" role="menuitem" className="w-full px-3 py-1.5 text-left text-xs normal-case text-text hover:bg-cyan/10 hover:text-cyan" onClick={(e) => { e.stopPropagation(); setOpen(false); setAction(a) }}>
                {TITLES[a]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {action && <ColumnForm df={df} column={column} action={action} onClose={() => setAction(null)} onApply={(ops) => { setAction(null); onApply(ops) }} />}
    </span>
  )
}

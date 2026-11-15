// CodeRibbon: pandas code of the last operation, inspect or view (typewriter), a COPY button and a plain sentence.
import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { motionReduced } from '../../game/settings'
import { useL04 } from './session'

export function CodeRibbon() {
  const { ribbon } = useL04()
  const code = ribbon ? (ribbon.kind === 'view' ? `VIEW  ${ribbon.code}` : ribbon.code) : ''
  const [shown, setShown] = useState(code)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
    if (motionReduced() || import.meta.env.MODE === 'test' || code.length === 0) {
      setShown(code)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 150)
      setShown(code.slice(0, Math.ceil(code.length * p)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [code])

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(ribbon?.code ?? '')
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-cyan/30 bg-bg/80 px-3 py-2" aria-label="Code ribbon">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">pandas</span>
      <code data-testid="code-ribbon" className="min-w-0 flex-1 truncate font-mono text-xs text-text" title={code}>
        {ribbon ? shown : '# every action you take appears here as pandas code'}
      </code>
      {ribbon && <span className="w-full text-[11px] text-muted md:w-auto md:max-w-md">{ribbon.sentence}</span>}
      <button type="button" onClick={copy} disabled={!ribbon} className="flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted hover:text-cyan disabled:opacity-40" aria-label="Copy code">
        {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
        {copied ? 'COPIED' : 'COPY'}
      </button>
    </div>
  )
}

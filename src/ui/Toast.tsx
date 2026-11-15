// Toast system: provider plus useToast hook, announced through an aria-live region.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, OctagonAlert, TriangleAlert, X } from 'lucide-react'
import { playSound } from '../game/sound'
import { cn } from './cn'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastInput {
  message: string
  tone?: ToastTone
  /** Milliseconds before auto-dismiss; 0 keeps the toast until dismissed. */
  duration?: number
  /** Optional inline action, e.g. UNDO after a bad decision. */
  action?: { label: string; onClick: () => void }
}

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
  duration: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  push: (toast: ToastInput) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyle: Record<ToastTone, string> = {
  info: 'border-cyan/50 text-cyan',
  success: 'border-green/50 text-green',
  warning: 'border-amber/50 text-amber',
  error: 'border-red/50 text-red',
}

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: OctagonAlert,
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    ({ message, tone = 'info', duration = 4000, action }: ToastInput) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, message, tone, duration, action }])
      if (tone === 'success') playSound('success')
      else if (tone === 'error') playSound('error')
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((timer) => clearTimeout(timer))
      map.clear()
    }
  }, [])

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const Icon = toneIcon[toast.tone]
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex animate-fade-in items-start gap-3 rounded border bg-panel2/95 p-3 shadow-lg',
                toneStyle[toast.tone],
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm text-text">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick()
                    dismiss(toast.id)
                  }}
                  className="rounded border border-current px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-white/5"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-muted hover:text-text"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

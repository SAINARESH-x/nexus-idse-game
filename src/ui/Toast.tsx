// Toast system: provider plus useToast hook, announced through an aria-live region.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from './cn'

export type ToastTone = 'info' | 'success' | 'warning'

export interface ToastInput {
  message: string
  tone?: ToastTone
  /** Milliseconds before auto-dismiss; 0 keeps the toast until dismissed. */
  duration?: number
}

interface ToastItem extends Required<Omit<ToastInput, never>> {
  id: number
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
}

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
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
    ({ message, tone = 'info', duration = 4000 }: ToastInput) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, message, tone, duration }])
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

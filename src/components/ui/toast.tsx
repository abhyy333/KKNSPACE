import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (opts: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 10)
    setToasts((prev) => [...prev, { ...opts, id }])
    setTimeout(() => {
      dismiss(id)
    }, 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg transition-all",
              item.variant === 'success' && "border-emerald-200 bg-emerald-50/95 text-emerald-900",
              item.variant === 'error' && "border-red-200 bg-red-50/95 text-red-900",
              item.variant === 'warning' && "border-amber-200 bg-amber-50/95 text-amber-900",
              item.variant === 'info' && "border-warm-300 bg-white text-charcoal"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {item.variant === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {item.variant === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
              {item.variant === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              {item.variant === 'info' && <Info className="h-4 w-4 text-sage-600" />}
            </div>
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="font-semibold">{item.title}</div>
              {item.description && (
                <div className="text-[11px] opacity-90 leading-relaxed">{item.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

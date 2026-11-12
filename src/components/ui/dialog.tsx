import React, { useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

let modalCount = 0

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (modalCount === 0) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.dataset.originalOverflow = document.body.style.overflow || ''
    document.body.dataset.originalPaddingRight = document.body.style.paddingRight || ''
    document.body.style.overflow = 'hidden'
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
  }
  modalCount++
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  modalCount = Math.max(0, modalCount - 1)
  if (modalCount === 0) {
    document.body.style.overflow = document.body.dataset.originalOverflow || ''
    document.body.style.paddingRight = document.body.dataset.originalPaddingRight || ''
    delete document.body.dataset.originalOverflow
    delete document.body.dataset.originalPaddingRight
  }
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidthClass?: string
  containerClassName?: string
  contentClassName?: string
  /**
   * If true (default), wraps children in an independently scrollable body with padding.
   * If false, renders children directly inside the flex-col modal container,
   * allowing custom scrollable body and fixed footer separation.
   */
  scrollableContent?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  containerClassName,
  contentClassName,
  scrollableContent = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full flex flex-col rounded-xl border border-warm-300 bg-white shadow-xl overflow-hidden modal-surface-adaptive min-h-0",
          maxWidthClass,
          containerClassName
        )}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between border-b border-warm-200 px-5 py-3.5 sm:px-6 sm:py-4 bg-warm-50/90">
            <div className="space-y-1 pr-4">
              <h3 className="text-sm sm:text-base font-serif font-semibold text-charcoal">{title}</h3>
              {description && (
                <p className="text-xs text-charcoal-muted leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-charcoal-muted hover:bg-warm-200/70 hover:text-charcoal transition-colors"
              aria-label="Tutup dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {scrollableContent ? (
          <div className={cn("flex-1 min-h-0 overflow-y-auto modal-body-scroll p-5 sm:p-6", contentClassName)}>
            {children}
          </div>
        ) : (
          children
        )}

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-warm-200 bg-warm-50/90 px-5 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  isLoading = false,
}) => {
  return (
    <Modal open={open} onClose={isLoading ? () => {} : onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-5">
        <p className="text-xs text-charcoal leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

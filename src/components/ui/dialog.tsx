import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

let modalCount = 0
let originalHtmlOverflow = ''
let originalBodyOverflow = ''
let originalBodyTouchAction = ''

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (modalCount === 0) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    originalHtmlOverflow = document.documentElement.style.overflow || ''
    originalBodyOverflow = document.body.style.overflow || ''
    originalBodyTouchAction = document.body.style.touchAction || ''
    document.body.dataset.originalPaddingRight = document.body.style.paddingRight || ''

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
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
    const originalPaddingRight = document.body.dataset.originalPaddingRight || ''

    document.documentElement.style.overflow = originalHtmlOverflow
    document.body.style.overflow = originalBodyOverflow
    document.body.style.touchAction = originalBodyTouchAction
    document.body.style.paddingRight = originalPaddingRight

    delete document.body.dataset.originalPaddingRight
  }
}

/**
 * Transforms standard max-w-* classes (e.g., 'max-w-2xl') to responsive 'sm:max-w-2xl'
 * so modal dialogs on mobile stay constrained within mobile viewport width.
 */
function getResponsiveMaxWidth(maxWidthClass: string): string {
  return maxWidthClass
    .split(' ')
    .map((cls) => {
      if (cls.startsWith('max-w-') && !cls.includes(':')) {
        return `sm:${cls}`
      }
      return cls
    })
    .join(' ')
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
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain select-text">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-[calc(100vw-1rem)] flex flex-col rounded-2xl sm:rounded-xl border border-warm-300 bg-white shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] min-h-0 box-border my-auto",
          getResponsiveMaxWidth(maxWidthClass),
          containerClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between border-b border-warm-200 px-4 py-3 sm:px-6 sm:py-3.5 bg-warm-50/95">
            <div className="space-y-0.5 pr-3 min-w-0">
              <h3 className="text-sm sm:text-base font-serif font-semibold text-charcoal truncate sm:whitespace-normal">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-charcoal-muted hover:bg-warm-200 hover:text-charcoal transition-colors shrink-0"
              aria-label="Tutup dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {scrollableContent ? (
          <div
            className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 touch-pan-y", contentClassName)}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        ) : (
          children
        )}

        {footer && (
          <div className="flex shrink-0 flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
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
      <div className="space-y-4">
        <p className="text-xs text-charcoal leading-relaxed">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs gap-1.5 w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import React, { useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

let modalCount = 0
let scrollYPosition = 0
let originalHtmlOverflow = ''

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (modalCount === 0) {
    scrollYPosition = window.scrollY || window.pageYOffset || 0
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.dataset.originalOverflow = document.body.style.overflow || ''
    document.body.dataset.originalPosition = document.body.style.position || ''
    document.body.dataset.originalTop = document.body.style.top || ''
    document.body.dataset.originalWidth = document.body.style.width || ''
    document.body.dataset.originalPaddingRight = document.body.style.paddingRight || ''
    originalHtmlOverflow = document.documentElement.style.overflow || ''

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYPosition}px`
    document.body.style.width = '100%'
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
    const originalOverflow = document.body.dataset.originalOverflow || ''
    const originalPosition = document.body.dataset.originalPosition || ''
    const originalTop = document.body.dataset.originalTop || ''
    const originalWidth = document.body.dataset.originalWidth || ''
    const originalPaddingRight = document.body.dataset.originalPaddingRight || ''

    document.documentElement.style.overflow = originalHtmlOverflow
    document.body.style.overflow = originalOverflow
    document.body.style.position = originalPosition
    document.body.style.top = originalTop
    document.body.style.width = originalWidth
    document.body.style.paddingRight = originalPaddingRight

    delete document.body.dataset.originalOverflow
    delete document.body.dataset.originalPosition
    delete document.body.dataset.originalTop
    delete document.body.dataset.originalWidth
    delete document.body.dataset.originalPaddingRight

    window.scrollTo(0, scrollYPosition)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-none select-text">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Dialog surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full flex flex-col rounded-2xl sm:rounded-xl border border-warm-300 bg-white shadow-2xl overflow-hidden max-h-[calc(100dvh-16px)] sm:max-h-[88vh] min-h-0 box-border",
          maxWidthClass,
          containerClassName
        )}
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
          <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6", contentClassName)}>
            {children}
          </div>
        ) : (
          children
        )}

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
      <div className="space-y-4">
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

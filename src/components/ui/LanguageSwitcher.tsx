import React, { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/i18n'
import type { Locale } from '@/i18n/types'

interface LanguageSwitcherProps {
  variant?: 'compact' | 'minimal' | 'full'
  className?: string
  align?: 'left' | 'right'
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  className = '',
  align = 'right',
}) => {
  const { locale, setLocale, currentLocaleOption, supportedLocales } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (code: Locale) => {
    setLocale(code)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      {variant === 'minimal' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-charcoal-muted hover:text-charcoal hover:bg-warm-100 rounded-md transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Select Language / Pilih Bahasa"
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-[11px] font-medium uppercase">{currentLocaleOption.shortName}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-charcoal bg-white/90 hover:bg-warm-100/80 border border-warm-200/90 rounded-lg shadow-2xs transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Select Language / Pilih Bahasa"
        >
          <Globe className="h-3.5 w-3.5 text-charcoal-muted shrink-0" />
          <span className="font-sans text-xs">{currentLocaleOption.name}</span>
          <ChevronDown className={`h-3 w-3 text-charcoal-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Pilih Bahasa / Select Language"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-48 rounded-xl border border-warm-300 bg-white p-1.5 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-charcoal-muted border-b border-warm-200 mb-1">
            Language / Bahasa
          </div>
          {supportedLocales.map((loc) => {
            const isSelected = loc.code === locale
            return (
              <button
                key={loc.code}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(loc.code)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-sage-50 text-sage-900 font-semibold'
                    : 'text-charcoal hover:bg-warm-100 hover:text-charcoal-dark font-normal'
                }`}
              >
                <div className="flex flex-col">
                  <span>{loc.name}</span>
                  <span className="text-[10px] text-charcoal-muted font-light">{loc.englishName}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-sage-700 shrink-0 ml-2" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

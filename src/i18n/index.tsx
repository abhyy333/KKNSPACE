import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { Locale, LocaleOption, TranslationParams } from './types'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './types'
import { KKN_GLOSSARY, type TermDefinition } from './glossary'
import {
  formatDate as fmtDate,
  formatShortDate as fmtShortDate,
  formatTime as fmtTime,
  formatDateTime as fmtDateTime,
  formatCurrency as fmtCurrency,
  formatNumber as fmtNumber,
  formatRelativeTime as fmtRelativeTime,
  formatPlural as fmtPlural,
  type PluralForms,
} from './formatters'

import idID from './locales/id-ID'

const DICTIONARIES: Record<Locale, any> = {
  'id-ID': idID,
}

const STORAGE_KEY = 'kkn_locale'

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  return DEFAULT_LOCALE
}

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  currentLocaleOption: LocaleOption
  supportedLocales: LocaleOption[]
  t: (key: string, params?: TranslationParams) => string
  formatDate: (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string
  formatShortDate: (date: string | number | Date | null | undefined) => string
  formatTime: (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (date: string | number | Date | null | undefined) => string
  formatCurrency: (amount: number | null | undefined) => string
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string
  formatRelativeTime: (date: string | number | Date | null | undefined) => string
  formatPlural: (count: number, forms: PluralForms) => string
  getTerm: (termKey: string) => TermDefinition | undefined
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.some((l) => l.code === newLocale)) return
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const currentLocaleOption = useMemo(() => {
    return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0]
  }, [locale])

  const t = useCallback(
    (path: string, params?: TranslationParams): string => {
      const keys = path.split('.')
      const dict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE]

      let result: any = dict
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k]
        } else {
          // Fallback to id-ID
          result = undefined
          break
        }
      }

      // If missing in current locale, try default id-ID
      if (result === undefined || result === null) {
        let fallbackDict: any = DICTIONARIES[DEFAULT_LOCALE]
        for (const k of keys) {
          if (fallbackDict && typeof fallbackDict === 'object' && k in fallbackDict) {
            fallbackDict = fallbackDict[k]
          } else {
            fallbackDict = undefined
            break
          }
        }
        result = fallbackDict
      }

      if (typeof result !== 'string') {
        // Return last key part as readable fallback instead of raw technical path
        return keys[keys.length - 1] || path
      }

      if (params) {
        result = Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue ?? ''))
        }, result)
      }

      // Defensive cleanup: never leak raw {placeholder} tags or dangling punctuation
      return result.replace(/,\s*\{[a-zA-Z0-9_]+\}/g, '').replace(/\{[a-zA-Z0-9_]+\}/g, '').trim()
    },
    [locale]
  )

  const formatDate = useCallback(
    (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
      return fmtDate(date, locale, options)
    },
    [locale]
  )

  const formatShortDate = useCallback(
    (date: string | number | Date | null | undefined) => {
      return fmtShortDate(date, locale)
    },
    [locale]
  )

  const formatTime = useCallback(
    (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
      return fmtTime(date, locale, options)
    },
    [locale]
  )

  const formatDateTime = useCallback(
    (date: string | number | Date | null | undefined) => {
      return fmtDateTime(date, locale)
    },
    [locale]
  )

  const formatCurrency = useCallback(
    (amount: number | null | undefined) => {
      return fmtCurrency(amount, locale)
    },
    [locale]
  )

  const formatNumber = useCallback(
    (value: number | null | undefined, options?: Intl.NumberFormatOptions) => {
      return fmtNumber(value, locale, options)
    },
    [locale]
  )

  const formatRelativeTime = useCallback(
    (date: string | number | Date | null | undefined) => {
      return fmtRelativeTime(date, locale)
    },
    [locale]
  )

  const formatPlural = useCallback(
    (count: number, forms: PluralForms) => {
      return fmtPlural(count, forms, locale)
    },
    [locale]
  )

  const getTerm = useCallback(
    (termKey: string): TermDefinition | undefined => {
      const glossary = KKN_GLOSSARY[locale] || KKN_GLOSSARY[DEFAULT_LOCALE]
      return glossary[termKey] || KKN_GLOSSARY[DEFAULT_LOCALE][termKey]
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      currentLocaleOption,
      supportedLocales: SUPPORTED_LOCALES,
      t,
      formatDate,
      formatShortDate,
      formatTime,
      formatDateTime,
      formatCurrency,
      formatNumber,
      formatRelativeTime,
      formatPlural,
      getTerm,
    }),
    [
      locale,
      setLocale,
      currentLocaleOption,
      t,
      formatDate,
      formatShortDate,
      formatTime,
      formatDateTime,
      formatCurrency,
      formatNumber,
      formatRelativeTime,
      formatPlural,
      getTerm,
    ]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Convenient alias matching conventional React i18n hooks
export function useTranslation() {
  const { t, locale, currentLocaleOption, supportedLocales, setLocale } = useI18n()
  return { t, locale, currentLocaleOption, supportedLocales, setLocale }
}

export function useLocale() {
  const {
    locale,
    setLocale,
    currentLocaleOption,
    supportedLocales,
    formatDate,
    formatShortDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatRelativeTime,
    formatPlural,
    getTerm,
  } = useI18n()

  return {
    locale,
    setLocale,
    currentLocaleOption,
    supportedLocales,
    formatDate,
    formatShortDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatRelativeTime,
    formatPlural,
    getTerm,
  }
}

export * from './types'
export * from './glossary'
export * from './formatters'

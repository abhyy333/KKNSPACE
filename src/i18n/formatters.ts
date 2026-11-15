import { DEFAULT_LOCALE, type Locale } from './types'

export const KKN_TIMEZONE = 'Asia/Makassar'

export function parseDateInput(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  if (typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }
  // Try ISO parse
  const trimmed = input.trim()
  if (!trimmed) return null
  // If YYYY-MM-DD only, append T00:00:00 to prevent UTC midnight date shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00`)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(
  date: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDateInput(date)
  if (!d) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: KKN_TIMEZONE,
    ...options,
  }

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d)
  } catch {
    return d.toISOString().split('T')[0]
  }
}

export function formatShortDate(
  date: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(
  date: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDateInput(date)
  if (!d) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KKN_TIMEZONE,
    ...options,
  }

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d)
  } catch {
    return '-'
  }
}

export function formatDateTime(
  date: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  const d = parseDateInput(date)
  if (!d) return '-'

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: KKN_TIMEZONE,
    }).format(d)
  } catch {
    return '-'
  }
}

export function formatCurrency(
  amount: number | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (amount == null || isNaN(amount)) return 'Rp 0'

  try {
    // Indonesian Rupiah must be preserved as the official unit
    if (locale === 'id-ID') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(amount)
    }

    // For other locales, format clearly with IDR currency code or symbol
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
  }
}

export function formatNumber(
  value: number | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || isNaN(value)) return '0'
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return String(value)
  }
}

export function formatRelativeTime(
  date: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): string {
  const d = parseDateInput(date)
  if (!d) return '-'

  const now = Date.now()
  const diffInSeconds = Math.round((d.getTime() - now) / 1000)
  const absDiff = Math.abs(diffInSeconds)

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    if (absDiff < 60) return rtf.format(diffInSeconds, 'second')
    const diffInMinutes = Math.round(diffInSeconds / 60)
    if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute')
    const diffInHours = Math.round(diffInMinutes / 60)
    if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour')
    const diffInDays = Math.round(diffInHours / 24)
    if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day')
    const diffInMonths = Math.round(diffInDays / 30)
    if (Math.abs(diffInMonths) < 12) return rtf.format(diffInMonths, 'month')
    const diffInYears = Math.round(diffInDays / 365)
    return rtf.format(diffInYears, 'year')
  } catch {
    return formatDate(d, locale)
  }
}

export interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
  zero?: string
}

export function formatPlural(
  count: number,
  forms: PluralForms,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (count === 0 && forms.zero) {
    return forms.zero.replace('{count}', String(count))
  }

  try {
    const pr = new Intl.PluralRules(locale)
    const rule = pr.select(count) // 'one', 'few', 'many', 'other'

    let template = forms.other
    if (rule === 'one' && forms.one) template = forms.one
    else if (rule === 'few' && forms.few) template = forms.few
    else if (rule === 'many' && forms.many) template = forms.many

    return template.replace('{count}', formatNumber(count, locale))
  } catch {
    return (count === 1 ? forms.one : forms.other).replace('{count}', String(count))
  }
}

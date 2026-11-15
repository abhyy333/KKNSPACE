import React, { useEffect } from 'react'
import { useLocation, Outlet, Navigate } from 'react-router-dom'
import { useLocale } from '@/i18n'
import type { Locale } from '@/i18n/types'

const LOCALE_PARAM_MAP: Record<string, Locale> = {
  'en-us': 'en-US',
  'en-gb': 'en-GB',
  'zh-cn': 'zh-CN',
  'ru-ru': 'ru-RU',
  'id-id': 'id-ID',
}

export const LocalizedRouteSync: React.FC = () => {
  const location = useLocation()
  const { locale, setLocale } = useLocale()

  const prefix = location.pathname.split('/')[1]?.toLowerCase()
  const matchedLocale = prefix ? LOCALE_PARAM_MAP[prefix] : null

  useEffect(() => {
    if (matchedLocale && matchedLocale !== locale) {
      setLocale(matchedLocale)
    }
  }, [matchedLocale, locale, setLocale])

  if (!matchedLocale) {
    // Unknown locale prefix -> redirect to root
    return <Navigate to="/" replace />
  }

  // Indonesian is canonical root without prefix
  if (matchedLocale === 'id-ID') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

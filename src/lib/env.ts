function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const CANONICAL_APP_URL = 'https://kknspace.vercel.app'

function getOriginSafe(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

const getEnv = () => {
  const origin = getOriginSafe()
  const isLocalOrigin = origin.includes('127.0.0.1') || origin.includes('localhost')

  const env = {
    VITE_SUPABASE_URL:
      import.meta.env.VITE_SUPABASE_URL || 'https://aofwlbvxsczcpqgwtanb.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy_anon_key_for_build',
    APP_BASE_URL:
      import.meta.env.VITE_APP_URL ||
      (import.meta.env.DEV
        ? (origin || 'http://127.0.0.1:5173')
        : (origin && !isLocalOrigin ? origin : CANONICAL_APP_URL)),
  }

  if (!isValidUrl(env.VITE_SUPABASE_URL) || env.VITE_SUPABASE_PUBLISHABLE_KEY.trim().length === 0) {
    console.warn('Environment configuration warning: Supabase URL or publishable key is invalid.')
  }

  return env
}

export const env = getEnv()

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const getEnv = () => {
  const env = {
    VITE_SUPABASE_URL:
      import.meta.env.VITE_SUPABASE_URL || 'https://aofwlbvxsczcpqgwtanb.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy_anon_key_for_build',
  }

  if (!isValidUrl(env.VITE_SUPABASE_URL) || env.VITE_SUPABASE_PUBLISHABLE_KEY.trim().length === 0) {
    console.warn('Environment configuration warning: Supabase URL or publishable key is invalid.')
  }

  return env
}

export const env = getEnv()

import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export const CHUNK_RELOAD_STORAGE_KEY = 'kkn_chunk_reload_attempted'

/**
 * Checks whether an error is caused by dynamic import failure or missing asset chunk
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const err = error as { name?: string; message?: string }
  const message = err.message || ''
  const name = err.name || ''

  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [0-9]+ failed/i.test(message)
  )
}

/**
 * Clears the chunk reload attempt flag from sessionStorage.
 * Call this when a page or application mounts successfully.
 */
export function clearChunkRetryFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
  } catch {
    // Ignore sessionStorage errors (e.g. strict privacy mode)
  }
}

/**
 * Enhanced lazy loader that detects chunk/module loading failures (e.g. after a new deployment)
 * and attempts a single hard refresh to retrieve the updated assets before giving up.
 * Prevents infinite reload loops using a sessionStorage timestamp marker.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory()
      // If module loaded successfully, clear any leftover flag
      clearChunkRetryFlag()
      return module
    } catch (error) {
      if (isChunkLoadError(error)) {
        const hasAttempted = Boolean(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY))

        if (!hasAttempted) {
          // Record that we attempted recovery to prevent infinite reload loop
          sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, Date.now().toString())
          console.warn(
            `[KKN SPACE] Detected dynamic chunk load failure for ${chunkName || 'module'}. Performing one-time recovery reload...`
          )
          // Hard reload to fetch new HTML & asset hashes from server
          window.location.reload()
          // Return a hanging promise while window reloads
          return new Promise<{ default: T }>(() => {})
        }

        console.error(
          `[KKN SPACE] Chunk reload already attempted for this session, but module failed again:`,
          error
        )
      }

      // If already attempted or not a chunk error, rethrow so ErrorBoundary / route errorElement catches it
      throw error
    }
  })
}

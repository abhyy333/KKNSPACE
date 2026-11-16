/**
 * URL Security & Sanitization Utilities
 * Prevents Stored and DOM XSS via dangerous URL schemes (e.g., javascript:, data:, vbscript:).
 */

const SAFE_HTTP_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Checks whether a given URL string uses a safe HTTP or HTTPS protocol.
 * Returns false for javascript:, data:, file:, vbscript:, and malformed URLs.
 */
export function isSafeExternalUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false
  const trimmed = rawUrl.trim()
  if (!trimmed) return false

  // Reject URLs starting with control characters or whitespace
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false

  // Reject explicit javascript: or data: prefixes even if obfuscated
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) return false

  try {
    const parsed = new URL(trimmed, 'https://placeholder.local')
    // If the input was relative, new URL resolves with base 'https://placeholder.local'.
    // For external links, we require absolute http: or https:
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return false
    }
    return SAFE_HTTP_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Sanitizes an external URL. If safe, returns the trimmed URL; otherwise returns undefined.
 * Can be safely passed to <a href={sanitizeExternalUrl(link)} />.
 */
export function sanitizeExternalUrl(rawUrl: string | null | undefined): string | undefined {
  if (!isSafeExternalUrl(rawUrl)) return undefined
  return rawUrl!.trim()
}

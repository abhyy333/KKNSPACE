/**
 * Utilities for normalizing and constructing partnership contact destinations (WhatsApp & Email).
 * Ensures safe URL schemes, prevents invalid inputs, and provides centralized formatting.
 */

import type { PublicPartnershipContact } from '@/types/sponsor'

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/**
 * Normalizes phone numbers for WhatsApp wa.me links.
 * Handles '+', '0', spaces, dashes, parentheses, and default country codes.
 */
export function normalizeWhatsAppNumber(rawPhone: string, defaultCountryCode: string = '62'): string {
  if (!rawPhone) return ''
  
  // Clean all non-digit characters
  let digits = rawPhone.replace(/\D/g, '')
  const cc = defaultCountryCode.replace(/\D/g, '') || '62'

  if (!digits) return ''

  // If starts with 0, replace with country code (e.g., 0812... -> 62812...)
  if (digits.startsWith('0')) {
    digits = cc + digits.slice(1)
  } else if (!digits.startsWith(cc) && digits.length <= 11) {
    // If it doesn't start with country code and seems like local subscriber number (e.g., 812...)
    digits = cc + digits
  }

  return digits
}

/**
 * Validates email address syntax.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Builds a secure WhatsApp wa.me destination URL.
 */
export function buildWhatsAppUrl(
  phone: string,
  message?: string,
  countryCode: string = '62'
): string | null {
  const clean = normalizeWhatsAppNumber(phone, countryCode)
  if (!clean || clean.length < 8) return null

  const msgParam = message ? `?text=${encodeURIComponent(message.trim())}` : ''
  const url = `https://wa.me/${clean}${msgParam}`

  // Enforce secure scheme
  if (!url.startsWith('https://wa.me/')) return null
  return url
}

/**
 * Builds a secure mailto destination URL.
 */
export function buildMailtoUrl(email: string, subject?: string, body?: string): string | null {
  const trimmed = email?.trim()
  if (!isValidEmail(trimmed)) return null

  const params: string[] = []
  if (subject?.trim()) {
    params.push(`subject=${encodeURIComponent(subject.trim())}`)
  }
  if (body?.trim()) {
    params.push(`body=${encodeURIComponent(body.trim())}`)
  }

  const query = params.length > 0 ? `?${params.join('&')}` : ''
  const url = `mailto:${trimmed}${query}`

  // Enforce mailto scheme
  if (!url.startsWith('mailto:')) return null
  return url
}

export interface ConstructedPartnershipDestination {
  url: string | null
  isAvailable: boolean
  type: 'whatsapp' | 'email' | 'none'
  label: string
}

/**
 * Generates the centralized active contact destination for public buttons.
 * Optionally appends tier package name into the predefined text/subject.
 */
export function buildPartnershipContactDestination(
  contact: PublicPartnershipContact | null | undefined,
  tierName?: string
): ConstructedPartnershipDestination {
  if (!contact || !contact.is_available || contact.active_destination === 'none') {
    return {
      url: null,
      isAvailable: false,
      type: 'none',
      label: 'Informasi kontak partnership belum tersedia',
    }
  }

  if (contact.active_destination === 'whatsapp') {
    const rawNumber = contact.whatsapp_number || ''
    const countryCode = contact.whatsapp_country_code || '62'
    let message = contact.whatsapp_default_message || ''

    if (tierName?.trim()) {
      message = `${message.trim()} (Pilihan Paket: ${tierName.trim()})`
    }

    const url = buildWhatsAppUrl(rawNumber, message, countryCode)
    const cleanNumber = normalizeWhatsAppNumber(rawNumber, countryCode)

    if (!url) {
      return {
        url: null,
        isAvailable: false,
        type: 'whatsapp',
        label: 'Nomor WhatsApp belum dikonfigurasi',
      }
    }

    return {
      url,
      isAvailable: true,
      type: 'whatsapp',
      label: `+${cleanNumber}`,
    }
  }

  if (contact.active_destination === 'email') {
    const email = contact.email_address || ''
    let subject = contact.email_subject || 'Partnership Inquiry — KKN SPACE'
    let body = contact.email_body || ''

    if (tierName?.trim()) {
      subject = `${subject.trim()} — Paket ${tierName.trim()}`
      body = `${body.trim()}\n\nMinat Kemitraan: Paket ${tierName.trim()}`
    }

    const url = buildMailtoUrl(email, subject, body)

    if (!url) {
      return {
        url: null,
        isAvailable: false,
        type: 'email',
        label: 'Alamat email belum dikonfigurasi',
      }
    }

    return {
      url,
      isAvailable: true,
      type: 'email',
      label: email,
    }
  }

  return {
    url: null,
    isAvailable: false,
    type: 'none',
    label: 'Informasi kontak partnership belum tersedia',
  }
}

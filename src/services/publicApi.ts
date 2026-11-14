import { ROLE_SORT_ORDER } from '@/lib/directory'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import type { AcademicStatus, KknRole, WorkProgramStatus } from '@/types/database'

export interface PublicWorkProgram {
  id: string
  title: string
  description: string | null
  status: WorkProgramStatus
  start_date: string | null
  end_date: string | null
  publication_status: 'published'
  created_at: string
  updated_at: string
}

export interface PublicAnnouncement {
  id: string
  title: string
  content: string
  status: 'published'
  published_at: string | null
  created_at: string
}

export interface PublicMediaAsset {
  id: string
  title: string | null
  caption: string | null
  slug?: string | null
  cover_url?: string | null
  publication_status: 'published'
  published_at: string | null
  created_at: string
}

// Rich public documentation for gallery
export interface PublicDocumentation {
  id: string
  title: string | null
  caption: string | null
  category: string | null
  event_date: string | null
  location: string | null
  photographer: string | null
  description_long: string | null
  slug: string | null
  cover_file_id: string | null
  primary_file_id: string | null
  photo_count: number
  published_at: string | null
  created_at: string
}

export interface PublicDocumentationDetail extends PublicDocumentation {
  photo_file_ids: string[]
}

export interface PublicDocumentationCategory {
  category: string
  item_count: number
}

export interface PublicTeamMember {
  id: string
  full_name: string
  university: string | null
  study_program: string
  academic_status: AcademicStatus
  position_label: string
  role: KknRole
  division: string | null
  has_photo: boolean
}

export interface HomePublicOverview {
  programs: PublicWorkProgram[]
  programsCount: number
  announcements: PublicAnnouncement[]
  announcementsCount: number
  media: PublicMediaAsset[]
  mediaCount: number
}

export async function fetchPublishedPrograms(limit = 50): Promise<PublicWorkProgram[]> {
  const { data, error } = await supabase
    .from('work_programs')
    .select(
      'id, title, description, status, start_date, end_date, publication_status, created_at, updated_at'
    )
    .eq('publication_status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Gagal memuat program kerja publik: ${error.message}`)
  }

  return (data ?? []) as PublicWorkProgram[]
}

export async function fetchPublishedAnnouncements(limit = 10): Promise<PublicAnnouncement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, status, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Gagal memuat pengumuman publik: ${error.message}`)
  }

  return (data ?? []) as PublicAnnouncement[]
}

export async function fetchPublishedMediaAssets(limit = 40): Promise<PublicMediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, title, caption, publication_status, published_at, created_at')
    .eq('publication_status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Gagal memuat dokumentasi publik: ${error.message}`)
  }

  return (data ?? []) as PublicMediaAsset[]
}

// ─────────────────────────────────────────────
// Rich documentation gallery — via RPC
// ─────────────────────────────────────────────

export async function fetchPublicDocumentationList(options: {
  category?: string | null
  search?: string | null
  limit?: number
  offset?: number
} = {}): Promise<PublicDocumentation[]> {
  const { category = null, search = null, limit = 24, offset = 0 } = options

  const { data, error } = await supabase.rpc('get_public_documentation_list', {
    p_category: category || null,
    p_search: search || null,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    // Fallback to basic query if RPC not yet deployed
    if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
      return fetchPublicDocumentationListFallback(options)
    }
    throw new Error(`Gagal memuat galeri dokumentasi: ${error.message}`)
  }

  return ((data ?? []) as PublicDocumentation[]).map((d) => ({
    ...d,
    photo_count: Number(d.photo_count) || 1,
  }))
}

// Fallback: basic query when RPC not available yet
async function fetchPublicDocumentationListFallback(options: {
  category?: string | null
  search?: string | null
  limit?: number
  offset?: number
} = {}): Promise<PublicDocumentation[]> {
  const { limit = 24, offset = 0 } = options

  let query = supabase
    .from('media_assets')
    .select('id, title, caption, category, event_date, location, photographer, description_long, slug, cover_file_id, file_id, published_at, created_at')
    .eq('publication_status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options.category) query = query.eq('category', options.category)
  if (options.search) query = query.ilike('title', `%${options.search}%`)

  const { data, error } = await query
  if (error) throw new Error(`Gagal memuat dokumentasi: ${error.message}`)

  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: d.id as string,
    title: d.title as string | null,
    caption: d.caption as string | null,
    category: d.category as string | null,
    event_date: d.event_date as string | null,
    location: d.location as string | null,
    photographer: d.photographer as string | null,
    description_long: d.description_long as string | null,
    slug: d.slug as string | null,
    cover_file_id: (d.cover_file_id ?? d.file_id) as string | null,
    primary_file_id: d.file_id as string | null,
    photo_count: 1,
    published_at: d.published_at as string | null,
    created_at: d.created_at as string,
  }))
}

export async function fetchPublicDocumentationDetail(
  idOrSlug: string
): Promise<PublicDocumentationDetail | null> {
  // Determine if idOrSlug is a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug)

  const { data, error } = await supabase.rpc('get_public_documentation_detail', {
    p_asset_id: isUuid ? idOrSlug : null,
    p_slug: !isUuid ? idOrSlug : null,
  })

  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
      return fetchPublicDocumentationDetailFallback(idOrSlug, isUuid)
    }
    throw new Error(`Gagal memuat detail dokumentasi: ${error.message}`)
  }

  const rows = (data ?? []) as PublicDocumentationDetail[]
  if (rows.length === 0) return null

  const row = rows[0]
  return {
    ...row,
    photo_count: Number(row.photo_count) || 1,
    photo_file_ids: Array.isArray(row.photo_file_ids) ? row.photo_file_ids : [row.primary_file_id].filter(Boolean) as string[],
  }
}

async function fetchPublicDocumentationDetailFallback(
  idOrSlug: string,
  isUuid: boolean
): Promise<PublicDocumentationDetail | null> {
  let query = supabase
    .from('media_assets')
    .select('id, title, caption, category, event_date, location, photographer, description_long, slug, cover_file_id, file_id, published_at, created_at')
    .eq('publication_status', 'published')

  if (isUuid) query = query.eq('id', idOrSlug)
  else query = query.eq('slug', idOrSlug)

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  const d = data as Record<string, unknown>
  const primaryFileId = d.file_id as string | null
  return {
    id: d.id as string,
    title: d.title as string | null,
    caption: d.caption as string | null,
    category: d.category as string | null,
    event_date: d.event_date as string | null,
    location: d.location as string | null,
    photographer: d.photographer as string | null,
    description_long: d.description_long as string | null,
    slug: d.slug as string | null,
    cover_file_id: (d.cover_file_id ?? d.file_id) as string | null,
    primary_file_id: primaryFileId,
    photo_file_ids: primaryFileId ? [primaryFileId] : [],
    photo_count: 1,
    published_at: d.published_at as string | null,
    created_at: d.created_at as string,
  }
}

export async function fetchPublicDocumentationCategories(): Promise<PublicDocumentationCategory[]> {
  const { data, error } = await supabase.rpc('get_public_documentation_categories')

  if (error) {
    // Fallback: derive from direct query
    const { data: fallbackData } = await supabase
      .from('media_assets')
      .select('category')
      .eq('publication_status', 'published')
      .not('category', 'is', null)
    if (fallbackData) {
      const counts: Record<string, number> = {}
      for (const row of fallbackData as { category: string | null }[]) {
        if (row.category) counts[row.category] = (counts[row.category] || 0) + 1
      }
      return Object.entries(counts)
        .map(([category, item_count]) => ({ category, item_count }))
        .sort((a, b) => b.item_count - a.item_count)
    }
    return []
  }

  return ((data ?? []) as PublicDocumentationCategory[]).map((d) => ({
    ...d,
    item_count: Number(d.item_count),
  }))
}

/**
 * Get a public signed URL for a documentation photo via Edge Function.
 * Only works for files belonging to published media_assets.
 */
export async function fetchPublicDocumentationPhotoUrl(
  fileId: string,
  assetId?: string
): Promise<string | null> {
  if (!fileId) return null

  const params = new URLSearchParams({ fileId })
  if (assetId) params.set('assetId', assetId)

  const url = `${env.VITE_SUPABASE_URL}/functions/v1/public-documentation-photo?${params.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    })

    if (!response.ok) return null

    const payload = (await response.json().catch(() => null)) as { signedUrl?: string } | null
    return typeof payload?.signedUrl === 'string' ? payload.signedUrl : null
  } catch {
    return null
  }
}

export async function fetchHomePublicOverview(): Promise<HomePublicOverview> {
  const [
    programsRes,
    programsCountRes,
    announcementsRes,
    announcementsCountRes,
    mediaRes,
    mediaCountRes,
  ] = await Promise.all([
    supabase
      .from('work_programs')
      .select(
        'id, title, description, status, start_date, end_date, publication_status, created_at, updated_at'
      )
      .eq('publication_status', 'published')
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('work_programs')
      .select('id', { count: 'exact', head: true })
      .eq('publication_status', 'published'),
    supabase
      .from('announcements')
      .select('id, title, content, status, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('media_assets')
      .select('id, title, caption, publication_status, published_at, created_at')
      .eq('publication_status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('publication_status', 'published'),
  ])

  const firstError =
    programsRes.error ||
    programsCountRes.error ||
    announcementsRes.error ||
    announcementsCountRes.error ||
    mediaRes.error ||
    mediaCountRes.error

  if (firstError) {
    throw new Error(`Gagal memuat ringkasan portal publik: ${firstError.message}`)
  }

  return {
    programs: (programsRes.data ?? []) as PublicWorkProgram[],
    programsCount: programsCountRes.count ?? 0,
    announcements: (announcementsRes.data ?? []) as PublicAnnouncement[],
    announcementsCount: announcementsCountRes.count ?? 0,
    media: (mediaRes.data ?? []) as PublicMediaAsset[],
    mediaCount: mediaCountRes.count ?? 0,
  }
}

/**
 * Fetches non-sensitive active team directory entries for the public /tim page.
 * Reads from the Single Source of Truth `public.kkn_team_directory` via RPC
 * so PII (NIM, phone numbers, linked auth IDs, storage paths) is never exposed.
 */
export async function fetchPublicTeamDirectory(): Promise<PublicTeamMember[]> {
  const { data, error } = await supabase.rpc('get_public_team_profiles')

  if (error) {
    throw new Error(`Gagal memuat direktori tim KKN: ${error.message}`)
  }

  const rows = (data ?? []) as PublicTeamMember[]
  return [...rows].sort((a, b) => {
    const rankDiff = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99)
    if (rankDiff !== 0) return rankDiff
    return a.full_name.localeCompare(b.full_name, 'id')
  })
}

export async function fetchPublicTeamPhotoUrl(memberId: string): Promise<string | null> {
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/public-team-photo?memberId=${encodeURIComponent(memberId)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json().catch(() => null)) as { signedUrl?: string } | null
  return typeof payload?.signedUrl === 'string' ? payload.signedUrl : null
}

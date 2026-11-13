import { ROLE_SORT_ORDER } from '@/lib/directory'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import type {
  AcademicStatus,
  ActivityDocCategory,
  ActivityDocumentation,
  KknRole,
  WorkProgramStatus,
} from '@/types/database'

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

export async function fetchHomePublicOverview(): Promise<HomePublicOverview> {
  const [
    programsRes,
    programsCountRes,
    announcementsRes,
    announcementsCountRes,
    activityDocsRes,
    activityDocsCountRes,
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
      .from('activity_documentations')
      .select('id, title, slug, short_description, cover_photo_id, cover_photo_path, publication_status, published_at, created_at')
      .eq('publication_status', 'published')
      .order('sort_order', { ascending: true })
      .order('activity_date', { ascending: false })
      .limit(3),
    supabase
      .from('activity_documentations')
      .select('id', { count: 'exact', head: true })
      .eq('publication_status', 'published'),
  ])

  const firstError =
    programsRes.error ||
    programsCountRes.error ||
    announcementsRes.error ||
    announcementsCountRes.error ||
    activityDocsRes.error ||
    activityDocsCountRes.error

  if (firstError) {
    throw new Error(`Gagal memuat ringkasan portal publik: ${firstError.message}`)
  }

  const mappedMedia: PublicMediaAsset[] = (activityDocsRes.data ?? []).map((doc) => ({
    id: doc.id,
    title: doc.title,
    caption: doc.short_description,
    slug: doc.slug,
    cover_url: getPublicDocumentationPhotoUrl(null, doc.cover_photo_id),
    publication_status: 'published',
    published_at: doc.published_at,
    created_at: doc.created_at,
  }))

  return {
    programs: (programsRes.data ?? []) as PublicWorkProgram[],
    programsCount: programsCountRes.count ?? 0,
    announcements: (announcementsRes.data ?? []) as PublicAnnouncement[],
    announcementsCount: announcementsCountRes.count ?? 0,
    media: mappedMedia,
    mediaCount: activityDocsCountRes.count ?? 0,
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

/**
 * Returns a stable, direct URL for a public documentation photo using the public-documentation-photo edge function.
 * Supports transparent 307 redirects to valid signed URLs in the kkn-private storage bucket.
 */
export function getPublicDocumentationPhotoUrl(photoId?: string | null, fileId?: string | null): string {
  if (photoId) {
    return `${env.VITE_SUPABASE_URL}/functions/v1/public-documentation-photo?photoId=${encodeURIComponent(photoId)}&redirect=true`
  }
  if (fileId) {
    return `${env.VITE_SUPABASE_URL}/functions/v1/public-documentation-photo?fileId=${encodeURIComponent(fileId)}&redirect=true`
  }
  return '/brand/kkn-pringgasela-selatan-2026-2027.png'
}

export interface ActivityFilterOptions {
  category?: 'all' | ActivityDocCategory
  search?: string
}

/**
 * Fetches all published activity documentation albums, including their photo attachments.
 */
export async function fetchPublicActivityAlbums(
  filters?: ActivityFilterOptions
): Promise<ActivityDocumentation[]> {
  let query = supabase
    .from('activity_documentations')
    .select(`
      id,
      title,
      slug,
      category,
      short_description,
      description,
      activity_date,
      start_time,
      end_time,
      location_name,
      dusun_name,
      objectives,
      execution_steps,
      results,
      photographer_name,
      cover_photo_id,
      cover_photo_path,
      publication_status,
      published_at,
      sort_order,
      created_by,
      created_at,
      updated_at,
      photos:activity_documentation_photos (
        id,
        activity_id,
        file_id,
        storage_path,
        caption,
        photographer,
        sort_order,
        is_cover,
        created_at
      )
    `)
    .eq('publication_status', 'published')
    .order('sort_order', { ascending: true })
    .order('activity_date', { ascending: false })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat album dokumentasi publik: ${error.message}`)
  }

  let albums = (data ?? []) as ActivityDocumentation[]

  // Client-side text search for responsive multi-field filtering
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    albums = albums.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(q)
      const matchDesc = item.short_description?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
      const matchLoc = item.location_name?.toLowerCase().includes(q)
      const matchDusun = item.dusun_name?.toLowerCase().includes(q)
      const matchPhoto = item.photographer_name?.toLowerCase().includes(q)
      return matchTitle || matchDesc || matchLoc || matchDusun || matchPhoto
    })
  }

  // Ensure photo sort order and photo count
  return albums.map((album) => {
    const sortedPhotos = [...(album.photos || [])].sort((a, b) => a.sort_order - b.sort_order)
    return {
      ...album,
      photos: sortedPhotos,
      photo_count: sortedPhotos.length,
    }
  })
}

export interface ActivityDetailResult {
  activity: ActivityDocumentation
  prevActivity: { slug: string; title: string } | null
  nextActivity: { slug: string; title: string } | null
}

/**
 * Fetches single activity documentation album by slug or id, with prev/next navigation metadata.
 */
export async function fetchPublicActivityDetail(slugOrId: string): Promise<ActivityDetailResult | null> {
  if (!slugOrId) return null

  // Fetch all published activities to establish chronological prev/next sequence
  const { data: allActivities, error: allErr } = await supabase
    .from('activity_documentations')
    .select('id, slug, title, activity_date, sort_order')
    .eq('publication_status', 'published')
    .order('activity_date', { ascending: false })
    .order('sort_order', { ascending: true })

  if (allErr) {
    throw new Error(`Gagal memuat indeks kegiatan: ${allErr.message}`)
  }

  const list = allActivities ?? []
  const currentIndex = list.findIndex(
    (item) => item.slug === slugOrId || item.id === slugOrId
  )

  if (currentIndex === -1) {
    return null
  }

  const targetItem = list[currentIndex]

  // Fetch complete details with photos
  const { data: detail, error: detailErr } = await supabase
    .from('activity_documentations')
    .select(`
      id,
      title,
      slug,
      category,
      short_description,
      description,
      activity_date,
      start_time,
      end_time,
      location_name,
      dusun_name,
      objectives,
      execution_steps,
      results,
      photographer_name,
      cover_photo_id,
      cover_photo_path,
      publication_status,
      published_at,
      sort_order,
      created_by,
      created_at,
      updated_at,
      photos:activity_documentation_photos (
        id,
        activity_id,
        file_id,
        storage_path,
        caption,
        photographer,
        sort_order,
        is_cover,
        created_at
      )
    `)
    .eq('id', targetItem.id)
    .maybeSingle()

  if (detailErr) {
    throw new Error(`Gagal memuat detail dokumentasi: ${detailErr.message}`)
  }

  if (!detail) return null

  const sortedPhotos = [...(detail.photos || [])].sort((a, b) => a.sort_order - b.sort_order)
  const activity: ActivityDocumentation = {
    ...detail,
    photos: sortedPhotos,
    photo_count: sortedPhotos.length,
  }

  // Previous (earlier date = higher index in descending list)
  const prevActivity =
    currentIndex < list.length - 1
      ? { slug: list[currentIndex + 1].slug, title: list[currentIndex + 1].title }
      : null

  // Next (newer date = lower index in descending list)
  const nextActivity =
    currentIndex > 0
      ? { slug: list[currentIndex - 1].slug, title: list[currentIndex - 1].title }
      : null

  return {
    activity,
    prevActivity,
    nextActivity,
  }
}


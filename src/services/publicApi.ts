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

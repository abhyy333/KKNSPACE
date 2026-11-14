import { supabase } from '@/lib/supabase'
import type {
  KknTimelineSettings,
  KknTimelineStage,
  TimelineStageComputedStatus,
  TimelineStageIconType,
  WorkProgram,
  CalendarEvent,
  ActivityDocumentation,
} from '@/types/database'

export interface CreateTimelineStageInput {
  timeline_id?: string
  stage_number: number
  title: string
  slug: string
  start_date: string
  end_date: string
  short_description: string
  detailed_description?: string
  objectives?: string[]
  icon_type?: TimelineStageIconType
  illustration_url?: string
  sort_order?: number
  confirmed_completed?: boolean
  is_published?: boolean
  related_program_ids?: string[]
  related_event_ids?: string[]
  related_doc_ids?: string[]
}

export interface UpdateTimelineStageInput {
  stage_number?: number
  title?: string
  slug?: string
  start_date?: string
  end_date?: string
  short_description?: string
  detailed_description?: string
  objectives?: string[]
  icon_type?: TimelineStageIconType
  illustration_url?: string
  sort_order?: number
  confirmed_completed?: boolean
  is_published?: boolean
  related_program_ids?: string[]
  related_event_ids?: string[]
  related_doc_ids?: string[]
}

export interface UpdateTimelineSettingsInput {
  title?: string
  eyebrow?: string
  description?: string
  location?: string
  university_name?: string
  academic_year?: string
  student_count?: number
  dpl_count?: number
  start_date?: string
  end_date?: string
  timezone?: string
  hero_image_url?: string
  is_published?: boolean
}

export interface PublicTimelineBundle {
  settings: KknTimelineSettings | null
  stages: (KknTimelineStage & { computedStatus: TimelineStageComputedStatus })[]
  currentStage: (KknTimelineStage & { computedStatus: TimelineStageComputedStatus }) | null
  progress: {
    percentage: number
    currentDay: number
    totalDays: number
    isStarted: boolean
    isEnded: boolean
    remainingDays: number
  }
  todayDateKey: string
  todayFormatted: string
  relatedPrograms: WorkProgram[]
  relatedEvents: CalendarEvent[]
  relatedDocs: ActivityDocumentation[]
}

// -------------------------------------------------------------
// Timezone and Date Utilities (Asia/Makassar)
// -------------------------------------------------------------
export function getMakassarDate(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }))
}

export function getMakassarDateString(): string {
  const d = getMakassarDate()
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dt = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${dt}`
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatStageDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '-'
  if (startDateStr === endDateStr) {
    const d = new Date(`${startDateStr.slice(0, 10)}T00:00:00`)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const s = new Date(`${startDateStr.slice(0, 10)}T00:00:00`)
  const e = new Date(`${endDateStr.slice(0, 10)}T00:00:00`)

  const sDay = s.getDate()
  const eDay = e.getDate()
  const sMonth = s.toLocaleDateString('id-ID', { month: 'short' })
  const eMonth = e.toLocaleDateString('id-ID', { month: 'short' })
  const sYear = s.getFullYear()
  const eYear = e.getFullYear()

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay} - ${eDay} ${eMonth} ${eYear}`
  }
  if (sYear === eYear) {
    return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`
  }
  return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`
}

export function computeTimelineProgress(
  startDateStr: string | null,
  endDateStr: string | null,
  todayStr: string
) {
  if (!startDateStr || !endDateStr) {
    return { percentage: 0, currentDay: 0, totalDays: 0, isStarted: false, isEnded: false, remainingDays: 0 }
  }

  const start = new Date(`${startDateStr.slice(0, 10)}T00:00:00`).getTime()
  const end = new Date(`${endDateStr.slice(0, 10)}T00:00:00`).getTime()
  const today = new Date(`${todayStr.slice(0, 10)}T00:00:00`).getTime()

  const oneDay = 86_400_000
  const totalDays = Math.max(1, Math.round((end - start) / oneDay) + 1)
  const elapsedDays = Math.round((today - start) / oneDay) + 1

  if (today < start) {
    const remainingDays = Math.ceil((start - today) / oneDay)
    return { percentage: 0, currentDay: 0, totalDays, isStarted: false, isEnded: false, remainingDays }
  } else if (today > end) {
    return { percentage: 100, currentDay: totalDays, totalDays, isStarted: true, isEnded: true, remainingDays: 0 }
  } else {
    const currentDay = Math.min(Math.max(1, elapsedDays), totalDays)
    const percentage = Math.min(100, Math.max(0, Math.round((currentDay / totalDays) * 100)))
    const remainingDays = Math.max(0, Math.ceil((end - today) / oneDay))
    return { percentage, currentDay, totalDays, isStarted: true, isEnded: false, remainingDays }
  }
}

export function computeStageStatus(
  startDateStr: string,
  endDateStr: string,
  confirmedCompleted: boolean,
  todayStr: string
): TimelineStageComputedStatus {
  const start = startDateStr.slice(0, 10)
  const end = endDateStr.slice(0, 10)

  if (todayStr < start) {
    return 'upcoming'
  }
  if (todayStr >= start && todayStr <= end) {
    return 'in_progress'
  }
  // Passed end date
  if (confirmedCompleted) {
    return 'completed'
  }
  return 'awaiting_confirmation'
}

// -------------------------------------------------------------
// Public Fetching
// -------------------------------------------------------------
export async function fetchPublicTimelineBundle(): Promise<PublicTimelineBundle> {
  const todayDateKey = getMakassarDateString()
  const todayFormatted = formatIndonesianDate(todayDateKey)

  // 1. Fetch settings
  const { data: settingsData } = await supabase
    .from('kkn_timeline_settings')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const settings = (settingsData as KknTimelineSettings | null) || null

  // 2. Fetch stages
  const { data: stagesData, error: stagesError } = await supabase
    .from('kkn_timeline_stages')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('stage_number', { ascending: true })

  if (stagesError) {
    console.error('Error fetching timeline stages:', stagesError)
  }

  const rawStages = (stagesData as KknTimelineStage[]) || []

  // Compute status for each stage
  const stages = rawStages.map((st) => ({
    ...st,
    computedStatus: computeStageStatus(st.start_date, st.end_date, st.confirmed_completed, todayDateKey),
  }))

  // Determine current active stage (or first awaiting_confirmation / upcoming)
  let currentStage = stages.find((st) => st.computedStatus === 'in_progress') || null
  if (!currentStage && stages.length > 0) {
    currentStage =
      stages.find((st) => st.computedStatus === 'awaiting_confirmation') ||
      stages.find((st) => st.computedStatus === 'upcoming') ||
      stages[stages.length - 1]
  }

  // Calculate overall timeline progress
  const progress = computeTimelineProgress(settings?.start_date ?? null, settings?.end_date ?? null, todayDateKey)

  // Collect related IDs
  const allProgramIds = Array.from(new Set(rawStages.flatMap((s) => s.related_program_ids || []))).filter(Boolean)
  const allEventIds = Array.from(new Set(rawStages.flatMap((s) => s.related_event_ids || []))).filter(Boolean)
  const allDocIds = Array.from(new Set(rawStages.flatMap((s) => s.related_doc_ids || []))).filter(Boolean)

  let relatedPrograms: WorkProgram[] = []
  let relatedEvents: CalendarEvent[] = []
  let relatedDocs: ActivityDocumentation[] = []

  if (allProgramIds.length > 0) {
    const { data: pData } = await supabase
      .from('work_programs')
      .select('*')
      .in('id', allProgramIds)
      .eq('publication_status', 'published')
    if (pData) relatedPrograms = pData as WorkProgram[]
  }

  if (allEventIds.length > 0) {
    const { data: eData } = await supabase.from('calendar_events').select('*').in('id', allEventIds)
    if (eData) relatedEvents = eData as CalendarEvent[]
  }

  if (allDocIds.length > 0) {
    const { data: dData } = await supabase
      .from('activity_documentations')
      .select('*')
      .in('id', allDocIds)
      .eq('publication_status', 'published')
    if (dData) relatedDocs = dData as ActivityDocumentation[]
  }

  return {
    settings,
    stages,
    currentStage,
    progress,
    todayDateKey,
    todayFormatted,
    relatedPrograms,
    relatedEvents,
    relatedDocs,
  }
}

// -------------------------------------------------------------
// Admin Fetching & Mutations
// -------------------------------------------------------------
export async function fetchAdminTimelineBundle(): Promise<{
  settings: KknTimelineSettings | null
  stages: KknTimelineStage[]
}> {
  const { data: settingsData } = await supabase
    .from('kkn_timeline_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: stagesData, error } = await supabase
    .from('kkn_timeline_stages')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('stage_number', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat tahapan timeline: ${error.message}`)
  }

  return {
    settings: (settingsData as KknTimelineSettings | null) || null,
    stages: (stagesData as KknTimelineStage[]) || [],
  }
}

export async function updateTimelineSettings(
  id: string,
  input: UpdateTimelineSettingsInput
): Promise<KknTimelineSettings> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('kkn_timeline_settings')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui pengaturan timeline: ${error?.message}`)
  }

  return data as KknTimelineSettings
}

export async function createTimelineStage(
  input: CreateTimelineStageInput
): Promise<KknTimelineStage> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('kkn_timeline_stages')
    .insert({
      timeline_id: input.timeline_id || null,
      stage_number: input.stage_number,
      title: input.title.trim(),
      slug: input.slug.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      short_description: input.short_description.trim(),
      detailed_description: input.detailed_description?.trim() || null,
      objectives: input.objectives || [],
      icon_type: input.icon_type || 'preparation',
      illustration_url: input.illustration_url || null,
      sort_order: input.sort_order ?? input.stage_number,
      confirmed_completed: input.confirmed_completed ?? false,
      is_published: input.is_published ?? true,
      related_program_ids: input.related_program_ids || [],
      related_event_ids: input.related_event_ids || [],
      related_doc_ids: input.related_doc_ids || [],
      updated_by: user?.id || null,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal membuat tahapan timeline: ${error?.message}`)
  }

  return data as KknTimelineStage
}

export async function updateTimelineStage(
  id: string,
  input: UpdateTimelineStageInput
): Promise<KknTimelineStage> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('kkn_timeline_stages')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui tahapan timeline: ${error?.message}`)
  }

  return data as KknTimelineStage
}

export async function deleteTimelineStage(id: string): Promise<void> {
  const { error } = await supabase.from('kkn_timeline_stages').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus tahapan timeline: ${error.message}`)
  }
}

export async function reorderTimelineStages(stageIds: string[]): Promise<void> {
  const updates = stageIds.map((id, index) =>
    supabase
      .from('kkn_timeline_stages')
      .update({ sort_order: index + 1, stage_number: index + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
  )
  await Promise.all(updates)
}

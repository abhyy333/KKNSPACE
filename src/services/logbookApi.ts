import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { getLocalDateKey } from '@/services/dashboardApi'
import { uploadPrivateFile } from '@/services/storageApi'
import { isValidIsoDate } from '@/lib/finance'
import { validateLogbookFile } from '@/lib/logbook'
import type {
  DailyLog,
  DailyLogAttachment,
  DailyLogCategory,
  DailyLogParticipant,
  DailyLogReview,
  DailyLogReviewDecision,
  FileObject,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'

const DAILY_LOG_SELECT =
  'id, author_id, log_date, title, content, activity_category, work_program_id, location, duration_minutes, verification_status, submitted_at, verified_by, verified_at, verification_note, correction_of_log_id, correction_reason, created_at, updated_at'

export const dailyLogFormSchema = z.object({
  logDate: z
    .string()
    .trim()
    .refine((v) => isValidIsoDate(v), 'Tanggal kegiatan tidak valid'),
  title: z
    .string()
    .trim()
    .min(3, 'Judul kegiatan minimal 3 karakter')
    .max(150, 'Judul kegiatan maksimal 150 karakter'),
  activityCategory: z.enum([
    'program_kerja',
    'sosialisasi',
    'administrasi',
    'koordinasi',
    'observasi',
    'piket_posko',
    'lainnya',
  ]),
  workProgramId: z.string().optional(),
  content: z
    .string()
    .trim()
    .min(10, 'Deskripsi kegiatan minimal 10 karakter')
    .max(4000, 'Deskripsi kegiatan maksimal 4000 karakter'),
  location: z
    .string()
    .trim()
    .max(150, 'Lokasi kegiatan maksimal 150 karakter')
    .optional(),
  durationMinutesRaw: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val) return true
      const n = Number(val)
      return Number.isInteger(n) && n > 0 && n <= 1440
    }, 'Durasi harus bilangan bulat 1 hingga 1440 menit'),
  saveAsDraft: z.boolean(),
  participantIds: z.array(z.string().uuid()),
  correctionReason: z
    .string()
    .trim()
    .max(500, 'Alasan koreksi maksimal 500 karakter')
    .optional(),
})

export type DailyLogFormInput = z.infer<typeof dailyLogFormSchema>

export interface LogbookBundleData {
  logs: DailyLog[]
  attachmentsByLog: Record<string, DailyLogAttachment[]>
  participantsByLog: Record<string, DailyLogParticipant[]>
  reviewsByLog: Record<string, DailyLogReview[]>
  programs: WorkProgram[]
  membersById: Record<string, WorkspaceMemberSummary>
  members: WorkspaceMemberSummary[]
}

export interface LogbookTeamSummary {
  today_count: number
  week_count: number
  total_count: number
  verified_count: number
  submitted_count: number
  range_count: number
  active_authors_count: number
  range_authors_count: number
  total_duration_minutes: number
  category_breakdown: Array<{ category: DailyLogCategory; count: number }>
  program_breakdown: Array<{
    program_id: string | null
    program_title: string
    count: number
    latest_date: string
  }>
  daily_breakdown: Array<{ log_date: string; count: number }>
}

export interface WorkProgramLogSummary {
  total: number
  latestDate: string | null
  latestTitle: string | null
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak valid. Silakan masuk ulang.')
  }
  return data.user.id
}

export async function fetchLogbookBundle(): Promise<LogbookBundleData> {
  const [logsRes, attachmentsRes, participantsRes, reviewsRes, programsRes, membersRes] =
    await Promise.all([
      supabase
        .from('daily_logs')
        .select(DAILY_LOG_SELECT)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('daily_log_attachments')
        .select(
          'id, log_id, file_id, uploaded_by, created_at, file:file_objects(id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at)'
        ),
      supabase
        .from('daily_log_participants')
        .select('id, log_id, user_id, created_at'),
      supabase
        .from('daily_log_reviews')
        .select('id, log_id, reviewer_id, decision, note, reviewed_at')
        .order('reviewed_at', { ascending: false }),
      supabase
        .from('work_programs')
        .select(
          'id, title, description, status, start_date, end_date, publication_status, created_by, created_at, updated_at'
        )
        .order('title', { ascending: true }),
      supabase.rpc('get_workspace_members'),
    ])

  const firstErr =
    logsRes.error ||
    attachmentsRes.error ||
    participantsRes.error ||
    reviewsRes.error ||
    programsRes.error ||
    membersRes.error
  if (firstErr) {
    throw new Error(`Gagal memuat data logbook kegiatan: ${firstErr.message}`)
  }

  const attachmentsByLog: Record<string, DailyLogAttachment[]> = {}
  const rawAttachments = (attachmentsRes.data ?? []) as Array<{
    id: string
    log_id: string
    file_id: string
    uploaded_by: string
    created_at: string
    file: FileObject | FileObject[] | null
  }>

  for (const row of rawAttachments) {
    const fileObj = Array.isArray(row.file) ? row.file[0] ?? null : row.file ?? null
    if (!attachmentsByLog[row.log_id]) {
      attachmentsByLog[row.log_id] = []
    }
    attachmentsByLog[row.log_id].push({
      id: row.id,
      log_id: row.log_id,
      file_id: row.file_id,
      uploaded_by: row.uploaded_by,
      created_at: row.created_at,
      file: fileObj,
    })
  }

  const participantsByLog: Record<string, DailyLogParticipant[]> = {}
  for (const row of (participantsRes.data as DailyLogParticipant[]) ?? []) {
    if (!participantsByLog[row.log_id]) {
      participantsByLog[row.log_id] = []
    }
    participantsByLog[row.log_id].push(row)
  }

  const reviewsByLog: Record<string, DailyLogReview[]> = {}
  for (const row of (reviewsRes.data as DailyLogReview[]) ?? []) {
    if (!reviewsByLog[row.log_id]) {
      reviewsByLog[row.log_id] = []
    }
    reviewsByLog[row.log_id].push(row)
  }

  const members = (membersRes.data as WorkspaceMemberSummary[]) ?? []
  const membersById: Record<string, WorkspaceMemberSummary> = {}
  for (const m of members) {
    membersById[m.user_id] = m
  }

  return {
    logs: (logsRes.data as DailyLog[]) ?? [],
    attachmentsByLog,
    participantsByLog,
    reviewsByLog,
    programs: (programsRes.data as WorkProgram[]) ?? [],
    membersById,
    members,
  }
}

export async function fetchLogbookTeamSummary(
  todayDate: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<LogbookTeamSummary> {
  const { data, error } = await supabase.rpc('get_logbook_team_summary', {
    p_today_date: todayDate,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  })

  if (error || !data) {
    throw new Error(`Gagal memuat ringkasan aktivitas tim: ${error?.message || 'Unknown error'}`)
  }

  const raw = data as Partial<LogbookTeamSummary>
  return {
    today_count: Number(raw.today_count ?? 0),
    week_count: Number(raw.week_count ?? 0),
    total_count: Number(raw.total_count ?? 0),
    verified_count: Number(raw.verified_count ?? 0),
    submitted_count: Number(raw.submitted_count ?? 0),
    range_count: Number(raw.range_count ?? 0),
    active_authors_count: Number(raw.active_authors_count ?? 0),
    range_authors_count: Number(raw.range_authors_count ?? 0),
    total_duration_minutes: Number(raw.total_duration_minutes ?? 0),
    category_breakdown: Array.isArray(raw.category_breakdown) ? raw.category_breakdown : [],
    program_breakdown: Array.isArray(raw.program_breakdown) ? raw.program_breakdown : [],
    daily_breakdown: Array.isArray(raw.daily_breakdown) ? raw.daily_breakdown : [],
  }
}

export async function fetchWorkProgramLogSummaries(): Promise<
  Record<string, WorkProgramLogSummary>
> {
  const teamSummary = await fetchLogbookTeamSummary(getLocalDateKey(), null, null)
  const summaryMap: Record<string, WorkProgramLogSummary> = {}

  for (const item of teamSummary.program_breakdown) {
    if (!item.program_id) continue
    summaryMap[item.program_id] = {
      total: Number(item.count ?? 0),
      latestDate: item.latest_date ?? null,
      latestTitle: null,
    }
  }

  return summaryMap
}

async function uploadAndAttachFiles(
  logId: string,
  userId: string,
  files: File[]
): Promise<void> {
  for (const file of files) {
    const fileErr = validateLogbookFile(file)
    if (fileErr) {
      throw new Error(fileErr)
    }
  }

  for (const file of files) {
    const uploadedFile = await uploadPrivateFile(file, 'logbook')
    const { error: linkErr } = await supabase.from('daily_log_attachments').insert({
      log_id: logId,
      file_id: uploadedFile.id,
      uploaded_by: userId,
    })
    if (linkErr) {
      await supabase.storage
        .from('kkn-private')
        .remove([uploadedFile.object_path])
        .catch(() => undefined)
      await supabase
        .from('file_objects')
        .delete()
        .eq('id', uploadedFile.id)
        .then(() => undefined, () => undefined)
      throw new Error(`Gagal menautkan lampiran "${file.name}": ${linkErr.message}`)
    }
  }
}

async function syncParticipants(
  logId: string,
  participantIds: string[]
): Promise<void> {
  const uniqueIds = Array.from(new Set(participantIds))

  const { error: delErr } = await supabase
    .from('daily_log_participants')
    .delete()
    .eq('log_id', logId)

  if (delErr) {
    throw new Error(`Gagal memperbarui daftar anggota terlibat: ${delErr.message}`)
  }

  if (uniqueIds.length === 0) return

  const rows = uniqueIds.map((userId) => ({
    log_id: logId,
    user_id: userId,
  }))

  const { error: insErr } = await supabase
    .from('daily_log_participants')
    .insert(rows)

  if (insErr) {
    throw new Error(`Gagal menyimpan anggota terlibat: ${insErr.message}`)
  }
}

function parseDuration(raw?: string): number | null {
  if (!raw || !raw.trim()) return null
  const num = Number(raw.trim())
  return Number.isInteger(num) && num > 0 ? num : null
}

/** Inserts a new daily log or linked post-verification correction record with attachments. */
async function insertDailyLogRecord(
  input: DailyLogFormInput,
  files: File[],
  correction?: { originalLogId: string; reason: string }
): Promise<DailyLog> {
  const parsed = dailyLogFormSchema.parse(input)
  for (const file of files) {
    const fileErr = validateLogbookFile(file)
    if (fileErr) throw new Error(fileErr)
  }

  const userId = await getCurrentUserId()

  const { data: created, error } = await supabase
    .from('daily_logs')
    .insert({
      author_id: userId,
      log_date: parsed.logDate,
      title: parsed.title,
      content: parsed.content,
      activity_category: parsed.activityCategory,
      work_program_id: parsed.workProgramId?.trim() ? parsed.workProgramId.trim() : null,
      location: parsed.location?.trim() ? parsed.location.trim() : null,
      duration_minutes: parseDuration(parsed.durationMinutesRaw),
      verification_status: parsed.saveAsDraft ? 'draft' : 'submitted',
      ...(correction
        ? {
            correction_of_log_id: correction.originalLogId,
            correction_reason: correction.reason,
          }
        : {}),
    })
    .select(DAILY_LOG_SELECT)
    .single()

  if (error || !created) {
    const actionLabel = correction ? 'membuat catatan koreksi' : 'menyimpan catatan logbook'
    throw new Error(`Gagal ${actionLabel}: ${error?.message || 'Unknown error'}`)
  }

  const log = created as DailyLog

  if (parsed.participantIds.length > 0) {
    await syncParticipants(log.id, parsed.participantIds)
  }

  if (files.length > 0) {
    await uploadAndAttachFiles(log.id, userId, files)
  }

  return log
}

export async function createDailyLogEntry(
  input: DailyLogFormInput,
  files: File[]
): Promise<DailyLog> {
  return insertDailyLogRecord(input, files)
}

export async function createDailyLogCorrection(
  originalLog: DailyLog,
  input: DailyLogFormInput,
  files: File[]
): Promise<DailyLog> {
  if (originalLog.verification_status !== 'verified') {
    throw new Error('Koreksi hanya dapat dibuat dari catatan yang sudah diverifikasi.')
  }

  const parsed = dailyLogFormSchema.parse(input)
  const reason = parsed.correctionReason?.trim() ?? ''
  if (reason.length < 5) {
    throw new Error('Alasan koreksi wajib diisi minimal 5 karakter.')
  }

  return insertDailyLogRecord(input, files, {
    originalLogId: originalLog.id,
    reason,
  })
}

export async function updateDailyLogEntry(
  log: DailyLog,
  input: DailyLogFormInput,
  newFiles: File[],
  removedAttachmentIds: string[]
): Promise<DailyLog> {
  if (log.verification_status === 'verified') {
    throw new Error('Catatan yang sudah diverifikasi tidak dapat diubah.')
  }

  const parsed = dailyLogFormSchema.parse(input)
  const reason = parsed.correctionReason?.trim() ?? ''
  if (log.correction_of_log_id && reason.length < 5) {
    throw new Error('Alasan koreksi wajib diisi minimal 5 karakter.')
  }

  for (const file of newFiles) {
    const fileErr = validateLogbookFile(file)
    if (fileErr) throw new Error(fileErr)
  }

  const userId = await getCurrentUserId()
  const nextStatus = parsed.saveAsDraft ? 'draft' : 'submitted'

  const { data: updated, error } = await supabase
    .from('daily_logs')
    .update({
      log_date: parsed.logDate,
      title: parsed.title,
      content: parsed.content,
      activity_category: parsed.activityCategory,
      work_program_id: parsed.workProgramId?.trim() ? parsed.workProgramId.trim() : null,
      location: parsed.location?.trim() ? parsed.location.trim() : null,
      duration_minutes: parseDuration(parsed.durationMinutesRaw),
      verification_status: nextStatus,
      ...(log.correction_of_log_id ? { correction_reason: reason } : {}),
    })
    .eq('id', log.id)
    .select(DAILY_LOG_SELECT)
    .single()

  if (error || !updated) {
    throw new Error(`Gagal memperbarui catatan logbook: ${error?.message || 'Unknown error'}`)
  }

  await syncParticipants(log.id, parsed.participantIds)

  if (removedAttachmentIds.length > 0) {
    const { error: remErr } = await supabase
      .from('daily_log_attachments')
      .delete()
      .in('id', removedAttachmentIds)
      .eq('log_id', log.id)
    if (remErr) {
      throw new Error(`Gagal menghapus lampiran lama: ${remErr.message}`)
    }
  }

  if (newFiles.length > 0) {
    await uploadAndAttachFiles(log.id, userId, newFiles)
  }

  return updated as DailyLog
}

export async function deleteDailyLogEntry(log: DailyLog): Promise<void> {
  if (log.verification_status === 'verified') {
    throw new Error('Catatan logbook yang sudah diverifikasi tidak dapat dihapus.')
  }

  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('id', log.id)

  if (error) {
    throw new Error(`Gagal menghapus catatan logbook: ${error.message}`)
  }
}

export async function reviewDailyLogEntry(params: {
  logId: string
  decision: DailyLogReviewDecision
  note?: string
}): Promise<DailyLogReview> {
  const trimmedNote = params.note?.trim() ?? ''
  if (params.decision === 'revision_requested' && trimmedNote.length < 3) {
    throw new Error('Catatan revisi wajib diisi oleh DPL (minimal 3 karakter).')
  }

  const { data, error } = await supabase.rpc('review_daily_log', {
    p_log_id: params.logId,
    p_decision: params.decision,
    p_note: trimmedNote || null,
  })

  if (error || !data) {
    throw new Error(`Gagal menyimpan pemeriksaan DPL: ${error?.message || 'Unknown error'}`)
  }

  return data as DailyLogReview
}

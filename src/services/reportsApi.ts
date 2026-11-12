import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import type {
  DocumentItem,
  FileObject,
  PublicationStatus,
  Report,
  ReportReview,
  ReportReviewDecision,
  ReportVersion,
} from '@/types/database'

export const documentFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul dokumen minimal 3 karakter')
    .max(150, 'Judul dokumen maksimal 150 karakter'),
  description: z
    .string()
    .trim()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional(),
  publicationStatus: z.enum(['draft', 'published', 'archived']),
})

export type DocumentFormInput = z.infer<typeof documentFormSchema>

export const reportTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Judul laporan minimal 5 karakter')
    .max(180, 'Judul laporan maksimal 180 karakter'),
})

export type ReportTitleInput = z.infer<typeof reportTitleSchema>

export const reportReviewSchema = z.object({
  decision: z.enum(['approved', 'revision_requested']),
  comments: z
    .string()
    .trim()
    .max(2000, 'Catatan review maksimal 2000 karakter')
    .optional(),
})

export type ReportReviewInput = z.infer<typeof reportReviewSchema>

export interface DocumentWithFile extends DocumentItem {
  file: FileObject | null
}

export interface ReportVersionWithFile extends ReportVersion {
  file: FileObject | null
  reviews: ReportReview[]
}

export interface ReportBundleItem extends Report {
  versions: ReportVersionWithFile[]
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }
  return data.user.id
}

async function fetchFilesMap(fileIds: string[]): Promise<Map<string, FileObject>> {
  const map = new Map<string, FileObject>()
  if (fileIds.length === 0) return map

  const { data, error } = await supabase
    .from('file_objects')
    .select(
      'id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at'
    )
    .in('id', fileIds)

  if (error) {
    throw new Error(`Gagal memuat metadata file: ${error.message}`)
  }

  for (const f of (data as FileObject[]) ?? []) {
    map.set(f.id, f)
  }
  return map
}

export async function fetchDocuments(): Promise<DocumentWithFile[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(
      'id, file_id, title, description, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat arsip dokumen: ${error.message}`)
  }

  const rows = (data as DocumentItem[]) ?? []
  const fileIds = Array.from(new Set(rows.map((r) => r.file_id)))
  const fileMap = await fetchFilesMap(fileIds)

  return rows.map((doc) => ({
    ...doc,
    file: fileMap.get(doc.file_id) ?? null,
  }))
}

export async function createDocumentWithUpload(
  file: File,
  input: DocumentFormInput,
  allowDirectPublish: boolean
): Promise<DocumentItem> {
  const parsed = documentFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const targetStatus: PublicationStatus = allowDirectPublish
    ? parsed.publicationStatus
    : 'draft'

  const fileObj = await uploadPrivateFile(file, 'documents')
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('documents')
    .insert({
      file_id: fileObj.id,
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      publication_status: targetStatus,
      uploaded_by: userId,
      published_by: targetStatus === 'published' ? userId : null,
      published_at: targetStatus === 'published' ? nowIso : null,
    })
    .select(
      'id, file_id, title, description, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .single()

  if (error) {
    throw new Error(`Gagal menyimpan dokumen: ${error.message}`)
  }

  return data as DocumentItem
}

export async function updateDocumentItem(
  id: string,
  input: DocumentFormInput,
  allowPublicationChange: boolean
): Promise<DocumentItem> {
  const parsed = documentFormSchema.parse(input)
  const userId = await getCurrentUserId()
  const nowIso = new Date().toISOString()

  const payload: Record<string, unknown> = {
    title: parsed.title,
    description: parsed.description?.trim() ? parsed.description.trim() : null,
  }

  if (allowPublicationChange) {
    payload.publication_status = parsed.publicationStatus
    payload.published_by =
      parsed.publicationStatus === 'published' ? userId : null
    payload.published_at =
      parsed.publicationStatus === 'published' ? nowIso : null
  }

  const { data, error } = await supabase
    .from('documents')
    .update(payload)
    .eq('id', id)
    .select(
      'id, file_id, title, description, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui dokumen: ${error.message}`)
  }

  return data as DocumentItem
}

export async function deleteDocumentItem(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus dokumen: ${error.message}`)
  }
}

export async function fetchReportsBundle(): Promise<ReportBundleItem[]> {
  const [reportsRes, versionsRes, reviewsRes] = await Promise.all([
    supabase
      .from('reports')
      .select(
        'id, title, status, created_by, submitted_by, current_version_id, created_at, updated_at'
      )
      .order('updated_at', { ascending: false }),
    supabase
      .from('report_versions')
      .select(
        'id, report_id, version_number, file_id, submitted_by, submitted_at, created_at'
      )
      .order('version_number', { ascending: false }),
    supabase
      .from('report_reviews')
      .select(
        'id, report_version_id, reviewer_id, decision, comments, reviewed_at'
      )
      .order('reviewed_at', { ascending: false }),
  ])

  const firstErr = reportsRes.error || versionsRes.error || reviewsRes.error
  if (firstErr) {
    throw new Error(`Gagal memuat data laporan akhir: ${firstErr.message}`)
  }

  const reports = (reportsRes.data as Report[]) ?? []
  const versions = (versionsRes.data as ReportVersion[]) ?? []
  const reviews = (reviewsRes.data as ReportReview[]) ?? []

  const fileIds = Array.from(
    new Set(versions.map((v) => v.file_id).filter((id): id is string => Boolean(id)))
  )
  const fileMap = await fetchFilesMap(fileIds)

  const reviewsByVersion = new Map<string, ReportReview[]>()
  for (const r of reviews) {
    const bucket = reviewsByVersion.get(r.report_version_id) ?? []
    bucket.push(r)
    reviewsByVersion.set(r.report_version_id, bucket)
  }

  const versionsByReport = new Map<string, ReportVersionWithFile[]>()
  for (const v of versions) {
    const bucket = versionsByReport.get(v.report_id) ?? []
    bucket.push({
      ...v,
      file: v.file_id ? fileMap.get(v.file_id) ?? null : null,
      reviews: reviewsByVersion.get(v.id) ?? [],
    })
    versionsByReport.set(v.report_id, bucket)
  }

  return reports.map((rep) => ({
    ...rep,
    versions: versionsByReport.get(rep.id) ?? [],
  }))
}

export async function createReportRecord(input: ReportTitleInput): Promise<Report> {
  const parsed = reportTitleSchema.parse(input)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      title: parsed.title,
      status: 'draft',
      created_by: userId,
    })
    .select(
      'id, title, status, created_by, submitted_by, current_version_id, created_at, updated_at'
    )
    .single()

  if (error) {
    throw new Error(`Gagal membuat entri laporan: ${error.message}`)
  }

  return data as Report
}

export async function submitNewReportVersion(
  reportId: string,
  file: File,
  nextVersionNumber: number
): Promise<ReportVersion> {
  const userId = await getCurrentUserId()
  const fileObj = await uploadPrivateFile(file, 'reports')
  const nowIso = new Date().toISOString()

  const { data: versionData, error: verErr } = await supabase
    .from('report_versions')
    .insert({
      report_id: reportId,
      version_number: nextVersionNumber,
      file_id: fileObj.id,
      submitted_by: userId,
      submitted_at: nowIso,
    })
    .select(
      'id, report_id, version_number, file_id, submitted_by, submitted_at, created_at'
    )
    .single()

  if (verErr || !versionData) {
    throw new Error(
      `Gagal menyimpan versi laporan: ${verErr?.message || 'Unknown error'}`
    )
  }

  const { error: repErr } = await supabase
    .from('reports')
    .update({
      current_version_id: versionData.id,
      status: 'submitted',
      submitted_by: userId,
      updated_at: nowIso,
    })
    .eq('id', reportId)

  if (repErr) {
    throw new Error(
      `Versi tersimpan, tetapi pembaruan status laporan gagal: ${repErr.message}`
    )
  }

  return versionData as ReportVersion
}

export async function submitDplReportReview(
  reportVersionId: string,
  input: ReportReviewInput
): Promise<ReportReview> {
  const parsed = reportReviewSchema.parse(input)
  const reviewerId = await getCurrentUserId()

  if (parsed.decision === 'revision_requested' && !parsed.comments?.trim()) {
    throw new Error(
      'Berikan catatan revisi agar tim KKN mengetahui bagian yang perlu diperbaiki.'
    )
  }

  const { data, error } = await supabase
    .from('report_reviews')
    .insert({
      report_version_id: reportVersionId,
      reviewer_id: reviewerId,
      decision: parsed.decision as ReportReviewDecision,
      comments: parsed.comments?.trim() ? parsed.comments.trim() : null,
    })
    .select(
      'id, report_version_id, reviewer_id, decision, comments, reviewed_at'
    )
    .single()

  if (error) {
    throw new Error(`Gagal mengirim review DPL: ${error.message}`)
  }

  return data as ReportReview
}

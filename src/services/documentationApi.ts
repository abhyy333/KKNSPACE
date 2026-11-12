import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import type { FileObject, MediaAsset, PublicationStatus } from '@/types/database'

export const mediaUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul dokumentasi minimal 3 karakter')
    .max(150, 'Judul dokumentasi maksimal 150 karakter'),
  caption: z
    .string()
    .trim()
    .max(1000, 'Keterangan maksimal 1000 karakter')
    .optional(),
  publicationStatus: z.enum(['draft', 'published', 'archived']),
})

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>

export interface MediaAssetWithFile extends MediaAsset {
  file: FileObject | null
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }
  return data.user.id
}

export async function fetchMediaAssets(): Promise<MediaAssetWithFile[]> {
  const { data: assets, error } = await supabase
    .from('media_assets')
    .select(
      'id, file_id, title, caption, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat galeri dokumentasi: ${error.message}`)
  }

  const rows = (assets as MediaAsset[]) ?? []
  if (rows.length === 0) return []

  const fileIds = Array.from(new Set(rows.map((r) => r.file_id)))
  const { data: filesData, error: filesErr } = await supabase
    .from('file_objects')
    .select(
      'id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at'
    )
    .in('id', fileIds)

  if (filesErr) {
    throw new Error(`Gagal memuat metadata berkas media: ${filesErr.message}`)
  }

  const fileMap = new Map<string, FileObject>()
  for (const f of (filesData as FileObject[]) ?? []) {
    fileMap.set(f.id, f)
  }

  return rows.map((asset) => ({
    ...asset,
    file: fileMap.get(asset.file_id) ?? null,
  }))
}

export async function createMediaAssetWithUpload(
  file: File,
  input: MediaUploadInput,
  allowDirectPublish: boolean
): Promise<MediaAsset> {
  const parsed = mediaUploadSchema.parse(input)
  const userId = await getCurrentUserId()

  const targetStatus: PublicationStatus = allowDirectPublish
    ? parsed.publicationStatus
    : 'draft'

  const fileObj = await uploadPrivateFile(file, 'documentation')
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      file_id: fileObj.id,
      title: parsed.title,
      caption: parsed.caption?.trim() ? parsed.caption.trim() : null,
      publication_status: targetStatus,
      uploaded_by: userId,
      published_by: targetStatus === 'published' ? userId : null,
      published_at: targetStatus === 'published' ? nowIso : null,
    })
    .select(
      'id, file_id, title, caption, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .single()

  if (error) {
    throw new Error(`Gagal mencatat dokumentasi kegiatan: ${error.message}`)
  }

  return data as MediaAsset
}

export async function updateMediaAsset(
  id: string,
  input: MediaUploadInput,
  allowPublicationChange: boolean
): Promise<MediaAsset> {
  const parsed = mediaUploadSchema.parse(input)
  const userId = await getCurrentUserId()
  const nowIso = new Date().toISOString()

  const payload: Record<string, unknown> = {
    title: parsed.title,
    caption: parsed.caption?.trim() ? parsed.caption.trim() : null,
  }

  if (allowPublicationChange) {
    payload.publication_status = parsed.publicationStatus
    payload.published_by =
      parsed.publicationStatus === 'published' ? userId : null
    payload.published_at =
      parsed.publicationStatus === 'published' ? nowIso : null
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update(payload)
    .eq('id', id)
    .select(
      'id, file_id, title, caption, publication_status, uploaded_by, published_by, published_at, created_at, assigned_to'
    )
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui dokumentasi: ${error.message}`)
  }

  return data as MediaAsset
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const { error } = await supabase.from('media_assets').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus dokumentasi: ${error.message}`)
  }
}

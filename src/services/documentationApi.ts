import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import type { FileObject, MediaAsset, PublicationStatus } from '@/types/database'

// ─── Extended schema for rich documentation fields ──────────────────────────
export const mediaUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul dokumentasi minimal 3 karakter')
    .max(150, 'Judul dokumentasi maksimal 150 karakter'),
  caption: z
    .string()
    .trim()
    .max(1000, 'Keterangan singkat maksimal 1000 karakter')
    .optional(),
  publicationStatus: z.enum(['draft', 'published', 'archived']),
  // Extended metadata for public gallery (all optional for backward compat)
  category: z.string().trim().max(80).optional(),
  event_date: z.string().optional(),   // ISO date string YYYY-MM-DD
  location: z.string().trim().max(120).optional(),
  photographer: z.string().trim().max(80).optional(),
  description_long: z.string().trim().max(5000).optional(),
})

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>

export interface MediaAssetWithFile extends MediaAsset {
  file: FileObject | null
  // Extended fields (populated when migration is applied)
  category?: string | null
  event_date?: string | null
  location?: string | null
  photographer?: string | null
  description_long?: string | null
  cover_file_id?: string | null
  slug?: string | null
}

export interface DocumentationPhoto {
  id: string
  asset_id: string
  file_id: string
  sort_order: number
  caption: string | null
  created_at: string
}

export interface DocumentationPhotoWithFile extends DocumentationPhoto {
  file: FileObject | null
}

const ASSET_SELECT = [
  'id', 'file_id', 'title', 'caption', 'publication_status',
  'uploaded_by', 'published_by', 'published_at', 'created_at', 'assigned_to',
  // Extended fields (may not exist on older DB, Supabase returns null for missing cols)
  'category', 'event_date', 'location', 'photographer', 'description_long',
  'cover_file_id', 'slug',
].join(', ')

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
    .select(ASSET_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat galeri dokumentasi: ${error.message}`)
  }

  const rows = (assets as unknown as MediaAssetWithFile[]) ?? []
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
  })) as MediaAssetWithFile[]
}

/** Fetch all photos associated with a media_asset (from documentation_photos table) */
export async function fetchDocumentationPhotos(assetId: string): Promise<DocumentationPhotoWithFile[]> {
  const { data, error } = await supabase
    .from('documentation_photos')
    .select('id, asset_id, file_id, sort_order, caption, created_at')
    .eq('asset_id', assetId)
    .order('sort_order', { ascending: true })

  if (error) {
    // If table doesn't exist yet (migration not applied), return empty
    if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
      return []
    }
    throw new Error(`Gagal memuat foto dokumentasi: ${error.message}`)
  }

  const photos = (data ?? []) as DocumentationPhoto[]
  if (photos.length === 0) return []

  const fileIds = photos.map((p) => p.file_id)
  const { data: filesData } = await supabase
    .from('file_objects')
    .select('id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at')
    .in('id', fileIds)

  const fileMap = new Map<string, FileObject>()
  for (const f of (filesData as FileObject[]) ?? []) fileMap.set(f.id, f)

  return photos.map((p) => ({ ...p, file: fileMap.get(p.file_id) ?? null }))
}

/** Add a photo to documentation_photos */
export async function addDocumentationPhoto(
  assetId: string,
  file: File,
  sortOrder = 0,
  caption?: string
): Promise<DocumentationPhoto> {
  const fileObj = await uploadPrivateFile(file, 'documentation')

  const { data, error } = await supabase
    .from('documentation_photos')
    .insert({
      asset_id: assetId,
      file_id: fileObj.id,
      sort_order: sortOrder,
      caption: caption?.trim() || null,
    })
    .select('id, asset_id, file_id, sort_order, caption, created_at')
    .single()

  if (error) {
    throw new Error(`Gagal menambah foto dokumentasi: ${error.message}`)
  }

  return data as DocumentationPhoto
}

/** Remove a photo from documentation_photos */
export async function removeDocumentationPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from('documentation_photos').delete().eq('id', photoId)
  if (error) throw new Error(`Gagal menghapus foto: ${error.message}`)
}

/** Update photo sort order */
export async function updateDocumentationPhotoOrder(
  photoId: string,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase
    .from('documentation_photos')
    .update({ sort_order: sortOrder })
    .eq('id', photoId)
  if (error) throw new Error(`Gagal mengubah urutan foto: ${error.message}`)
}

export async function createMediaAssetWithUpload(
  file: File,
  input: MediaUploadInput,
  allowDirectPublish: boolean,
  additionalFiles: File[] = [],
  coverIndex: number = 0
): Promise<MediaAsset> {
  const parsed = mediaUploadSchema.parse(input)
  const userId = await getCurrentUserId()

  const targetStatus: PublicationStatus = allowDirectPublish
    ? parsed.publicationStatus
    : 'draft'

  // Determine all files
  const allFiles = [file, ...additionalFiles]
  const validCoverIdx = coverIndex >= 0 && coverIndex < allFiles.length ? coverIndex : 0

  // 1. Upload primary file (the cover)
  const primaryFileToUpload = allFiles[validCoverIdx]
  const primaryFileObj = await uploadPrivateFile(primaryFileToUpload, 'documentation')
  const nowIso = new Date().toISOString()

  const payload: Record<string, unknown> = {
    file_id: primaryFileObj.id,
    title: parsed.title,
    caption: parsed.caption?.trim() ? parsed.caption.trim() : null,
    publication_status: targetStatus,
    uploaded_by: userId,
    published_by: targetStatus === 'published' ? userId : null,
    published_at: targetStatus === 'published' ? nowIso : null,
  }

  // Extended fields
  if (parsed.category) payload.category = parsed.category
  if (parsed.event_date) payload.event_date = parsed.event_date
  if (parsed.location) payload.location = parsed.location
  if (parsed.photographer) payload.photographer = parsed.photographer
  if (parsed.description_long) payload.description_long = parsed.description_long
  payload.cover_file_id = primaryFileObj.id

  const { data, error } = await supabase
    .from('media_assets')
    .insert(payload)
    .select(ASSET_SELECT)
    .single()

  if (error) {
    throw new Error(`Gagal mencatat dokumentasi kegiatan: ${error.message}`)
  }

  const createdAsset = (data as unknown) as MediaAsset

  // 2. Upload and link any additional files into documentation_photos
  const remainingFiles = allFiles.filter((_, idx) => idx !== validCoverIdx)
  for (let i = 0; i < remainingFiles.length; i++) {
    try {
      await addDocumentationPhoto(createdAsset.id, remainingFiles[i], i + 1)
    } catch (e) {
      console.warn('Gagal mengunggah foto tambahan:', e)
    }
  }

  return createdAsset
}

export async function setAssetCoverPhoto(assetId: string, fileId: string): Promise<void> {
  const { error } = await supabase
    .from('media_assets')
    .update({ cover_file_id: fileId })
    .eq('id', assetId)
  if (error) throw new Error(`Gagal mengubah foto sampul: ${error.message}`)
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
    // Extended fields (null means clear, undefined means skip — we always set them)
    category: parsed.category?.trim() || null,
    event_date: parsed.event_date || null,
    location: parsed.location?.trim() || null,
    photographer: parsed.photographer?.trim() || null,
    description_long: parsed.description_long?.trim() || null,
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
    .select(ASSET_SELECT)
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui dokumentasi: ${error.message}`)
  }

  return (data as unknown) as MediaAsset
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const { error } = await supabase.from('media_assets').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus dokumentasi: ${error.message}`)
  }
}

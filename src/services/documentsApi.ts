import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import type {
  DocumentItem,
  FileObject,
  PublicationStatus,
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

export interface DocumentWithFile extends DocumentItem {
  file: FileObject | null
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

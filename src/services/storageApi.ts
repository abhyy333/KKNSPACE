import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import type { FileObject } from '@/types/database'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB client guard (bucket limit 100 MB)

function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || 'berkas'
}

export async function uploadPrivateFile(
  file: File,
  folder: 'documentation' | 'documents' | 'reports' | 'finance' | 'logbook' | 'directory'
): Promise<FileObject> {
  if (file.size <= 0) {
    throw new Error('Berkas kosong tidak dapat diunggah.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran berkas maksimal 25 MB per unggahan.')
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    throw new Error('Sesi login tidak valid. Silakan masuk ulang.')
  }

  const userId = userData.user.id
  const uniqueId = crypto.randomUUID()
  const safeName = sanitizeFilename(file.name)
  const objectPath = `${userId}/${folder}/${uniqueId}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from('kkn-private')
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadErr) {
    throw new Error(`Gagal mengunggah berkas ke penyimpanan: ${uploadErr.message}`)
  }

  const { data: fileObj, error: dbErr } = await supabase
    .from('file_objects')
    .insert({
      bucket_id: 'kkn-private',
      object_path: objectPath,
      original_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      uploaded_by: userId,
    })
    .select('id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at')
    .single()

  if (dbErr || !fileObj) {
    // Clean up orphaned object in storage if metadata insert fails
    await supabase.storage.from('kkn-private').remove([objectPath]).catch(() => undefined)
    throw new Error(
      `Gagal mencatat metadata berkas: ${dbErr?.message || 'Unknown error'}`
    )
  }

  return fileObj as FileObject
}

export interface SignedUrlResponse {
  signedUrl: string
  expiresIn: number
  fileName: string
  mimeType: string
}

export async function getPrivateFileSignedUrl(
  fileId: string,
  download = false
): Promise<SignedUrlResponse> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (sessionErr || !token) {
    throw new Error('Sesi login tidak ditemukan untuk membuka berkas privat.')
  }

  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/workspace-get-signed-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileId, download }),
    }
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : `Gagal meminta signed URL (${response.status})`
    )
  }

  return payload as SignedUrlResponse
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

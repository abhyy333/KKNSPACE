import { corsHeaders, errorResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
const SIGNED_URL_SECONDS = 3600 // 1 hour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(req.url)
    let photoId = (url.searchParams.get('photoId') || '').trim()
    let fileId = (url.searchParams.get('fileId') || '').trim()
    const redirectParam = url.searchParams.get('redirect') === 'true' || url.searchParams.get('raw') === 'true'

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (!photoId && typeof body?.photoId === 'string') photoId = body.photoId.trim()
      if (!fileId && typeof body?.fileId === 'string') fileId = body.fileId.trim()
    }

    if (!photoId && !fileId) {
      return errorResponse('Parameter photoId atau fileId wajib disertakan.', 400)
    }

    if (photoId && !UUID_REGEX.test(photoId)) {
      return errorResponse('Format photoId tidak valid.', 400)
    }
    if (fileId && !UUID_REGEX.test(fileId)) {
      return errorResponse('Format fileId tidak valid.', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Query photo and ensure parent activity is published
    let storagePath = ''
    let caption: string | null = null
    let photographer: string | null = null

    if (photoId) {
      const { data: photoRec, error: photoErr } = await supabaseAdmin
        .from('activity_documentation_photos')
        .select(`
          id,
          storage_path,
          caption,
          photographer,
          activity_id,
          activity:activity_documentations!inner (
            id,
            publication_status
          )
        `)
        .eq('id', photoId)
        .maybeSingle()

      if (photoErr) {
        return errorResponse(`Gagal memeriksa dokumentasi: ${photoErr.message}`, 500)
      }

      if (!photoRec || !photoRec.activity || (photoRec.activity as any).publication_status !== 'published') {
        return errorResponse('Foto dokumentasi tidak ditemukan atau belum dipublikasikan.', 404)
      }

      storagePath = photoRec.storage_path
      caption = photoRec.caption
      photographer = photoRec.photographer
    } else if (fileId) {
      // Look up photo record by file_id
      const { data: photoRec, error: photoErr } = await supabaseAdmin
        .from('activity_documentation_photos')
        .select(`
          id,
          storage_path,
          caption,
          photographer,
          activity:activity_documentations!inner (
            id,
            publication_status
          )
        `)
        .eq('file_id', fileId)
        .maybeSingle()

      if (photoErr) {
        return errorResponse(`Gagal memeriksa file dokumentasi: ${photoErr.message}`, 500)
      }

      if (photoRec && photoRec.activity && (photoRec.activity as any).publication_status === 'published') {
        storagePath = photoRec.storage_path
        caption = photoRec.caption
        photographer = photoRec.photographer
      } else {
        // Check if file is cover photo of a published activity
        const { data: actRec, error: actErr } = await supabaseAdmin
          .from('activity_documentations')
          .select('id, cover_photo_id, cover_photo_path, publication_status')
          .eq('cover_photo_id', fileId)
          .eq('publication_status', 'published')
          .maybeSingle()

        if (actErr || !actRec) {
          return errorResponse('Foto kegiatan tidak ditemukan atau belum dipublikasikan.', 404)
        }

        // Get object path from file_objects
        const { data: fileObj, error: fileErr } = await supabaseAdmin
          .from('file_objects')
          .select('object_path, mime_type, bucket_id')
          .eq('id', fileId)
          .maybeSingle()

        if (fileErr || !fileObj || fileObj.bucket_id !== 'kkn-private') {
          return errorResponse('Berkas tidak ditemukan pada bucket terproteksi.', 404)
        }

        if (fileObj.mime_type && !ALLOWED_PHOTO_MIME_TYPES.has(fileObj.mime_type)) {
          return errorResponse('Tipe berkas foto tidak didukung untuk tampilan publik.', 403)
        }

        storagePath = fileObj.object_path
      }
    }

    if (!storagePath || storagePath.startsWith('/') || storagePath.includes('..')) {
      return errorResponse('Path penyimpanan berkas tidak valid.', 400)
    }

    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from('kkn-private')
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS)

    if (signedErr || !signedData?.signedUrl) {
      return errorResponse(
        `Gagal membuat URL akses foto: ${signedErr?.message || 'Unknown error'}`,
        500
      )
    }

    // Direct image redirect mode for <img src="..."> tags
    if (redirectParam) {
      return new Response(null, {
        status: 307,
        headers: {
          ...corsHeaders,
          Location: signedData.signedUrl,
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
        },
      })
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        expiresIn: SIGNED_URL_SECONDS,
        caption,
        photographer,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return errorResponse(message, 500)
  }
})

import { corsHeaders, errorResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIGNED_URL_SECONDS = 300

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    let sponsorId = ''
    let requestedFileId = ''
    if (req.method === 'GET') {
      const url = new URL(req.url)
      sponsorId = (url.searchParams.get('sponsorId') || '').trim()
      requestedFileId = (url.searchParams.get('fileId') || '').trim()
    } else {
      const body = await req.json().catch(() => ({}))
      sponsorId = typeof body?.sponsorId === 'string' ? body.sponsorId.trim() : ''
      requestedFileId = typeof body?.fileId === 'string' ? body.fileId.trim() : ''
    }

    const supabaseAdmin = getSupabaseAdmin()

    let fileIdToFetch: string | null = null

    if (sponsorId) {
      if (!UUID_REGEX.test(sponsorId)) {
        return errorResponse('Parameter sponsorId tidak valid.', 400)
      }

      // Strictly look up published, non-archived sponsor
      const { data: sponsor, error: sponsorErr } = await supabaseAdmin
        .from('sponsors')
        .select('id, logo_file_id, publication_status, is_archived, start_date, end_date')
        .eq('id', sponsorId)
        .eq('publication_status', 'published')
        .eq('is_archived', false)
        .maybeSingle()

      if (sponsorErr) {
        return errorResponse(`Gagal memeriksa sponsor: ${sponsorErr.message}`, 500)
      }

      if (!sponsor || !sponsor.logo_file_id) {
        return errorResponse('Logo sponsor publik tidak tersedia.', 404)
      }

      // Date window check (Asia/Makassar)
      const now = new Date()
      // Current date string YYYY-MM-DD in UTC+8
      const makassarDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
      }).format(now)

      if (sponsor.start_date && sponsor.start_date > makassarDate) {
        return errorResponse('Kerja sama sponsor belum dimulai.', 403)
      }
      if (sponsor.end_date && sponsor.end_date < makassarDate) {
        return errorResponse('Kerja sama sponsor telah berakhir.', 403)
      }

      fileIdToFetch = sponsor.logo_file_id
    } else if (requestedFileId) {
      if (!UUID_REGEX.test(requestedFileId)) {
        return errorResponse('Parameter fileId tidak valid.', 400)
      }

      // Look up sponsor that has this file_id and is published
      const { data: sponsor, error: sponsorErr } = await supabaseAdmin
        .from('sponsors')
        .select('id, logo_file_id, publication_status, is_archived, start_date, end_date')
        .eq('logo_file_id', requestedFileId)
        .eq('publication_status', 'published')
        .eq('is_archived', false)
        .maybeSingle()

      if (sponsorErr || !sponsor) {
        return errorResponse('Logo sponsor tidak ditemukan atau belum dipublikasikan.', 404)
      }

      const now = new Date()
      const makassarDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
      }).format(now)

      if (sponsor.start_date && sponsor.start_date > makassarDate) {
        return errorResponse('Kerja sama sponsor belum dimulai.', 403)
      }
      if (sponsor.end_date && sponsor.end_date < makassarDate) {
        return errorResponse('Kerja sama sponsor telah berakhir.', 403)
      }

      fileIdToFetch = sponsor.logo_file_id
    } else {
      return errorResponse('Parameter sponsorId atau fileId wajib disertakan.', 400)
    }

    if (!fileIdToFetch) {
      return errorResponse('Berkas tidak ditemukan.', 404)
    }

    const { data: fileObj, error: fileErr } = await supabaseAdmin
      .from('file_objects')
      .select('id, bucket_id, object_path, mime_type')
      .eq('id', fileIdToFetch)
      .maybeSingle()

    if (fileErr) {
      return errorResponse(`Gagal memeriksa metadata logo: ${fileErr.message}`, 500)
    }

    if (!fileObj || fileObj.bucket_id !== 'kkn-private') {
      return errorResponse('Referensi logo tidak berada di bucket yang diizinkan.', 403)
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.has(fileObj.mime_type)) {
      return errorResponse('Tipe berkas logo tidak diizinkan untuk tampilan publik.', 403)
    }

    const objectPath = typeof fileObj.object_path === 'string' ? fileObj.object_path : ''
    if (
      !objectPath ||
      objectPath !== objectPath.trim() ||
      objectPath.startsWith('/') ||
      objectPath.includes('..') ||
      objectPath.includes('//')
    ) {
      return errorResponse('Path logo tidak valid.', 403)
    }

    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from('kkn-private')
      .createSignedUrl(objectPath, MAX_SIGNED_URL_SECONDS)

    if (signedErr || !signedData?.signedUrl) {
      return errorResponse(
        `Gagal membuat URL logo sementara: ${signedErr?.message || 'Unknown error'}`,
        500
      )
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        expiresIn: MAX_SIGNED_URL_SECONDS,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(`Internal error: ${msg}`, 500)
  }
})

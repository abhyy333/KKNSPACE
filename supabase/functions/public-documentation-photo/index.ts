import { corsHeaders, errorResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIGNED_URL_SECONDS = 300

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(req.url)
    const fileId = (url.searchParams.get('fileId') || '').trim()
    const assetId = (url.searchParams.get('assetId') || '').trim()

    if (!fileId || !UUID_REGEX.test(fileId)) {
      return errorResponse('Parameter fileId tidak valid.', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Security gate: verify the file belongs to a published media_asset
    // Either as the primary file_id, cover_file_id, or in documentation_photos
    let isAuthorized = false

    if (assetId && UUID_REGEX.test(assetId)) {
      // Fast path: check against specific asset
      const { data: asset } = await supabaseAdmin
        .from('media_assets')
        .select('id, file_id, cover_file_id, publication_status')
        .eq('id', assetId)
        .eq('publication_status', 'published')
        .maybeSingle()

      if (asset) {
        if (asset.file_id === fileId || asset.cover_file_id === fileId) {
          isAuthorized = true
        } else {
          // Check documentation_photos
          const { data: photoRow } = await supabaseAdmin
            .from('documentation_photos')
            .select('id')
            .eq('asset_id', assetId)
            .eq('file_id', fileId)
            .maybeSingle()
          if (photoRow) isAuthorized = true
        }
      }
    } else {
      // Broad path: check if fileId appears in any published asset
      const { data: assetByFile } = await supabaseAdmin
        .from('media_assets')
        .select('id')
        .eq('publication_status', 'published')
        .or(`file_id.eq.${fileId},cover_file_id.eq.${fileId}`)
        .maybeSingle()

      if (assetByFile) {
        isAuthorized = true
      } else {
        // Check in documentation_photos of a published asset
        const { data: photoMatch } = await supabaseAdmin
          .from('documentation_photos')
          .select('asset_id, media_assets!inner(id, publication_status)')
          .eq('file_id', fileId)
          .eq('media_assets.publication_status', 'published')
          .maybeSingle()
        if (photoMatch) isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return errorResponse('Foto tidak ditemukan atau bukan bagian dari dokumentasi yang dipublikasikan.', 404)
    }

    // Fetch file metadata
    const { data: fileObj, error: fileErr } = await supabaseAdmin
      .from('file_objects')
      .select('id, bucket_id, object_path, mime_type')
      .eq('id', fileId)
      .maybeSingle()

    if (fileErr || !fileObj) {
      return errorResponse('Metadata foto tidak ditemukan.', 404)
    }

    if (fileObj.bucket_id !== 'kkn-private') {
      return errorResponse('Foto tidak berada di bucket yang diizinkan.', 403)
    }

    if (!ALLOWED_MIME_TYPES.has(fileObj.mime_type)) {
      return errorResponse('Tipe berkas tidak diizinkan untuk tampilan publik.', 403)
    }

    const objectPath = typeof fileObj.object_path === 'string' ? fileObj.object_path : ''
    if (
      !objectPath ||
      objectPath !== objectPath.trim() ||
      objectPath.startsWith('/') ||
      objectPath.includes('..') ||
      objectPath.includes('//')
    ) {
      return errorResponse('Path berkas tidak valid.', 403)
    }

    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from('kkn-private')
      .createSignedUrl(objectPath, MAX_SIGNED_URL_SECONDS)

    if (signedErr || !signedData?.signedUrl) {
      return errorResponse(
        `Gagal membuat URL foto sementara: ${signedErr?.message || 'Unknown error'}`,
        500
      )
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        expiresIn: MAX_SIGNED_URL_SECONDS,
        mimeType: fileObj.mime_type,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return errorResponse(message, 500)
  }
})

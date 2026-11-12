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
    let memberId = ''
    if (req.method === 'GET') {
      const url = new URL(req.url)
      memberId = (url.searchParams.get('memberId') || '').trim()
    } else {
      const body = await req.json().catch(() => ({}))
      memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : ''
    }

    if (!memberId || !UUID_REGEX.test(memberId)) {
      return errorResponse('Parameter memberId tidak valid.', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Strictly look up active directory record and use only its linked photo_file_id
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('kkn_team_directory')
      .select('id, photo_file_id, is_active')
      .eq('id', memberId)
      .eq('is_active', true)
      .maybeSingle()

    if (memberErr) {
      return errorResponse(`Gagal membaca direktori tim: ${memberErr.message}`, 500)
    }

    if (!member || !member.photo_file_id) {
      return errorResponse('Foto profil publik anggota tidak tersedia.', 404)
    }

    const { data: fileObj, error: fileErr } = await supabaseAdmin
      .from('file_objects')
      .select('id, bucket_id, object_path, mime_type')
      .eq('id', member.photo_file_id)
      .maybeSingle()

    if (fileErr) {
      return errorResponse(`Gagal memeriksa metadata foto: ${fileErr.message}`, 500)
    }

    if (!fileObj || fileObj.bucket_id !== 'kkn-private') {
      return errorResponse('Referensi foto tidak berada di bucket yang diizinkan.', 403)
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.has(fileObj.mime_type)) {
      return errorResponse('Tipe berkas foto tidak diizinkan untuk tampilan publik.', 403)
    }

    const objectPath = typeof fileObj.object_path === 'string' ? fileObj.object_path : ''
    if (
      !objectPath ||
      objectPath !== objectPath.trim() ||
      objectPath.startsWith('/') ||
      objectPath.includes('..') ||
      objectPath.includes('//')
    ) {
      return errorResponse('Path foto tidak valid.', 403)
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

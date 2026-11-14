import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin, requireAuthenticatedUser } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const caller = await requireAuthenticatedUser(req, supabaseAdmin)

    // Verify caller profile is active and has either active membership or super admin role
    const [profileRes, adminRes, membershipRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('is_active')
        .eq('id', caller.id)
        .maybeSingle(),
      supabaseAdmin
        .from('system_admins')
        .select('user_id')
        .eq('user_id', caller.id)
        .maybeSingle(),
      supabaseAdmin
        .from('memberships')
        .select('role, status')
        .eq('user_id', caller.id)
        .eq('status', 'active')
        .maybeSingle(),
    ])

    if (profileRes.data && profileRes.data.is_active === false) {
      return errorResponse('Forbidden: Akun Anda sedang dinonaktifkan.', 403)
    }

    const isSuperAdmin = Boolean(adminRes.data)
    const isActiveMember = Boolean(membershipRes.data)

    if (!isSuperAdmin && !isActiveMember) {
      return errorResponse(
        'Forbidden: Akses file privat hanya tersedia untuk anggota aktif KKN atau Super Admin.',
        403
      )
    }

    const body = await req.json().catch(() => ({}))
    const fileId = typeof body.fileId === 'string' ? body.fileId.trim() : ''
    const download = Boolean(body.download)

    if (!fileId || !UUID_REGEX.test(fileId)) {
      return errorResponse('Parameter fileId tidak valid.', 400)
    }

    const { data: fileObj, error: fileErr } = await supabaseAdmin
      .from('file_objects')
      .select('id, bucket_id, object_path, original_name, mime_type, uploaded_by')
      .eq('id', fileId)
      .maybeSingle()

    if (fileErr) {
      return errorResponse(`Gagal membaca metadata file: ${fileErr.message}`, 500)
    }

    if (!fileObj) {
      return errorResponse('Berkas tidak ditemukan.', 404)
    }

    if (fileObj.bucket_id !== 'kkn-private') {
      return errorResponse('Forbidden: Bucket tidak diizinkan.', 403)
    }

    const objectPath = typeof fileObj.object_path === 'string' ? fileObj.object_path : ''
    const trimmedPath = objectPath.trim()
    if (
      !trimmedPath ||
      trimmedPath !== objectPath ||
      objectPath.startsWith('/') ||
      objectPath.includes('..') ||
      objectPath.includes('//')
    ) {
      return errorResponse('Forbidden: Path berkas tidak valid.', 403)
    }

    // Only allow uploader fallback when both uploader ID and storage UUID folder prefix match the caller
    const ownsUploaderFolder =
      fileObj.uploaded_by === caller.id && objectPath.startsWith(`${caller.id}/`)

    // Validate domain entity linkage (Super Admin gets full KKN domain access without blind unlinked bypass)
    let matchedDomainTable: string | null = ownsUploaderFolder ? 'file_objects:own_folder' : null
    let isAuthorizedFile = ownsUploaderFolder

    if (!isAuthorizedFile) {
      const [
        mediaRes,
        docRes,
        reportVerRes,
        groupRes,
        avatarRes,
        directoryPhotoRes,
        financeRes,
        dailyLogAttRes,
        surveyAttRes,
        inventoryItemRes,
        inventoryPhotoRes,
        dutyDocRes,
      ] = await Promise.all([
        supabaseAdmin
          .from('media_assets')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('documents')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('report_versions')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('group_settings')
          .select('id')
          .eq('logo_file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('avatar_file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('kkn_team_directory')
          .select('id')
          .eq('photo_file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('finance_attachments')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('daily_log_attachments')
          .select('id, daily_logs!inner(author_id)')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('survey_attachments')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('inventory_items')
          .select('id')
          .eq('photo_file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('inventory_photos')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('duty_shift_documentations')
          .select('id')
          .eq('file_id', fileObj.id)
          .limit(1)
          .maybeSingle(),
      ])

      if (mediaRes.data) matchedDomainTable = 'media_assets'
      else if (docRes.data) matchedDomainTable = 'documents'
      else if (reportVerRes.data) matchedDomainTable = 'report_versions'
      else if (groupRes.data) matchedDomainTable = 'group_settings'
      else if (avatarRes.data) matchedDomainTable = 'profiles'
      else if (directoryPhotoRes.data) matchedDomainTable = 'kkn_team_directory'
      else if (financeRes.data) matchedDomainTable = 'finance_attachments'
      else if (surveyAttRes.data) matchedDomainTable = 'survey_attachments'
      else if (dailyLogAttRes.data) matchedDomainTable = 'daily_log_attachments'
      else if (inventoryItemRes.data) matchedDomainTable = 'inventory_items'
      else if (inventoryPhotoRes.data) matchedDomainTable = 'inventory_photos'
      else if (dutyDocRes.data) matchedDomainTable = 'duty_shift_documentations'

      let isAuthorizedDailyLogAttachment = false
      if (dailyLogAttRes.data) {
        if (isSuperAdmin) {
          isAuthorizedDailyLogAttachment = true
        } else if (isActiveMember) {
          const rawLog = (
            dailyLogAttRes.data as {
              daily_logs?: { author_id?: string } | Array<{ author_id?: string }>
            }
          ).daily_logs
          const authorId = Array.isArray(rawLog) ? rawLog[0]?.author_id : rawLog?.author_id
          const memberRole = membershipRes.data?.role
          const canReadAllDailyLogs =
            memberRole === 'ketua' || memberRole === 'sekretaris' || memberRole === 'dpl'
          isAuthorizedDailyLogAttachment =
            canReadAllDailyLogs || Boolean(authorId && authorId === caller.id)
        }
      }

      isAuthorizedFile = Boolean(
        mediaRes.data ||
          docRes.data ||
          reportVerRes.data ||
          groupRes.data ||
          avatarRes.data ||
          directoryPhotoRes.data ||
          financeRes.data ||
          surveyAttRes.data ||
          inventoryItemRes.data ||
          inventoryPhotoRes.data ||
          dutyDocRes.data ||
          isAuthorizedDailyLogAttachment
      )
    }

    if (!isAuthorizedFile) {
      return errorResponse(
        'Forbidden: Berkas tidak terhubung dengan modul KKN yang diizinkan.',
        403
      )
    }

    if (isSuperAdmin && !ownsUploaderFolder) {
      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        actorEmail: caller.email ?? null,
        actorAuthority: 'super_admin',
        action: 'signed_url_accessed',
        tableName: 'file_objects',
        recordId: fileObj.id,
        metadata: {
          domain_table: matchedDomainTable,
          uploaded_by: fileObj.uploaded_by,
          download: Boolean(download),
        },
      })
    }

    const expiresIn = 300
    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from('kkn-private')
      .createSignedUrl(
        fileObj.object_path,
        expiresIn,
        download ? { download: fileObj.original_name } : undefined
      )

    if (signErr || !signedData?.signedUrl) {
      return errorResponse(
        `Gagal membuat signed URL: ${signErr?.message || 'Unknown error'}`,
        500
      )
    }

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      expiresIn,
      fileName: fileObj.original_name,
      mimeType: fileObj.mime_type,
    })
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      'message' in err &&
      typeof (err as { status: unknown }).status === 'number'
    ) {
      const typed = err as { status: number; message: string }
      return errorResponse(typed.message, typed.status)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Internal server error',
      500
    )
  }
})

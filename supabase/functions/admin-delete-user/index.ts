import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { requireSuperAdmin } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

interface DeleteUserPayload {
  target_user_id: string
  confirmed_email: string
  reason?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  let deprovOpId: string | null = null
  let snapshotCreated = false
  let targetUserId = ''

  try {
    // 1. Authorization: Verify caller is an active Super Admin
    const { caller, supabaseAdmin } = await requireSuperAdmin(req)

    // 2. Parse and validate payload
    const body: DeleteUserPayload = await req.json().catch(() => ({} as DeleteUserPayload))
    targetUserId = String(body.target_user_id || '').trim()
    const confirmedEmail = String(body.confirmed_email || '').trim().toLowerCase()
    const reason = String(body.reason || '').trim()

    if (!targetUserId) {
      return errorResponse('target_user_id is required.', 400, 'MISSING_TARGET_USER_ID')
    }

    if (!confirmedEmail) {
      return errorResponse('confirmed_email is required for permanent deletion.', 400, 'MISSING_CONFIRMED_EMAIL')
    }

    // 3. Dynamic Safety Guard: Caller cannot delete their own account
    if (targetUserId === caller.id) {
      return errorResponse(
        'Tindakan dilarang: Super Admin tidak dapat menghapus akun login dirinya sendiri.',
        400,
        'CANNOT_DELETE_SELF'
      )
    }

    // 4. Fetch target user via Supabase Auth Admin API
    const { data: targetAuth, error: targetAuthErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (targetAuthErr || !targetAuth?.user) {
      return errorResponse(
        `Target user tidak ditemukan di Supabase Auth: ${targetAuthErr?.message || 'User not found'}`,
        404,
        'TARGET_USER_NOT_FOUND'
      )
    }

    const targetUser = targetAuth.user
    const targetEmail = (targetUser.email || '').toLowerCase().trim()

    // 5. Dynamic Safety Guard: Strict Email Confirmation Match Guard
    if (confirmedEmail !== targetEmail) {
      return errorResponse(
        `Konfirmasi email tidak cocok. Email yang diketik: '${confirmedEmail}', email target: '${targetEmail}'.`,
        400,
        'EMAIL_CONFIRMATION_MISMATCH'
      )
    }

    // 6. Dynamic Safety Guard: Last Super Admin Protection
    // Check if target is a Super Admin, and ensure last Super Admin cannot be deleted
    const { data: targetAdmin } = await supabaseAdmin
      .from('system_admins')
      .select('user_id')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetAdmin) {
      const { count: adminCount } = await supabaseAdmin
        .from('system_admins')
        .select('*', { count: 'exact', head: true })

      if ((adminCount ?? 0) <= 1) {
        return errorResponse(
          'Tidak dapat menghapus Super Admin terakhir. Sistem memerlukan minimal satu Super Admin aktif.',
          400,
          'LAST_SUPER_ADMIN_PROTECTED'
        )
      }
    }

    // 7. Strictly map directory record ONLY by linked_user_id = targetUserId
    // Do NOT guess identity by email, role, or position
    const [dirRes, memRes, profileRes] = await Promise.all([
      supabaseAdmin.from('kkn_team_directory').select('*').eq('linked_user_id', targetUserId).maybeSingle(),
      supabaseAdmin.from('memberships').select('*').eq('user_id', targetUserId).maybeSingle(),
      supabaseAdmin.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
    ])

    const directoryRecord = dirRes.data || null

    const targetFullName =
      directoryRecord?.full_name ||
      profileRes.data?.full_name ||
      (targetUser.user_metadata?.full_name as string) ||
      targetEmail.split('@')[0] ||
      'Pengguna'

    // 8. Track operation in account_deprovisioning_operations
    const { data: deprovOp, error: deprovOpErr } = await supabaseAdmin
      .from('account_deprovisioning_operations')
      .insert({
        target_user_id: targetUserId,
        target_email: targetEmail,
        target_directory_id: directoryRecord?.id ?? null,
        target_full_name: targetFullName,
        requested_by: caller.id,
        reason: reason || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (deprovOp) {
      deprovOpId = deprovOp.id
    }
    if (deprovOpErr) {
      console.warn('Could not insert deprovisioning operation record:', deprovOpErr.message)
    }

    // 9. Create Historical Account Snapshot (preserving identity for historical attribution)
    const snapshotData = {
      user_id: targetUserId,
      directory_member_id: directoryRecord?.id ?? null,
      full_name: targetFullName,
      email: targetEmail,
      role: directoryRecord?.role || memRes.data?.role || 'anggota',
      division: directoryRecord?.division || memRes.data?.division || null,
      identity_number: directoryRecord?.identity_number || null,
      academic_status: directoryRecord?.academic_status || null,
      university: directoryRecord?.university || null,
      phone: directoryRecord?.phone || profileRes.data?.phone || null,
      avatar_file_id: directoryRecord?.photo_file_id || profileRes.data?.avatar_file_id || null,
      deleted_by: caller.id,
      deletion_reason: reason || null,
      deleted_at: new Date().toISOString(),
    }

    const { error: snapErr } = await supabaseAdmin
      .from('historical_account_snapshots')
      .upsert(snapshotData, { onConflict: 'user_id' })

    if (snapErr) {
      if (deprovOpId) {
        await supabaseAdmin
          .from('account_deprovisioning_operations')
          .update({
            status: 'failed',
            error_message: `Snapshot creation failed: ${snapErr.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deprovOpId)
      }
      return errorResponse(`Gagal menyimpan snapshot akun historis: ${snapErr.message}`, 500)
    }
    snapshotCreated = true

    // 10. Audit Event: account_deletion_requested
    await recordAuditEvent(supabaseAdmin, {
      actorId: caller.id,
      action: 'account_deletion_requested',
      tableName: 'auth.users',
      recordId: targetUserId,
      metadata: {
        target_email: targetEmail,
        target_directory_id: directoryRecord?.id ?? null,
        target_full_name: targetFullName,
        reason: reason || null,
        deprovisioning_operation_id: deprovOpId,
      },
    })

    // 11. Execute permanent Supabase Auth deletion via Admin API
    // Note: Foreign keys ON DELETE CASCADE will automatically clean up
    // public.profiles, public.memberships, and public.system_admins.
    // If deleteUser fails, relational rows remain intact!
    const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (delAuthErr) {
      // Rollback snapshot on failure to avoid phantom deleted accounts
      if (snapshotCreated) {
        await supabaseAdmin
          .from('historical_account_snapshots')
          .delete()
          .eq('user_id', targetUserId)
      }

      if (deprovOpId) {
        await supabaseAdmin
          .from('account_deprovisioning_operations')
          .update({
            status: 'failed',
            error_message: `Supabase Auth deletion failed: ${delAuthErr.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deprovOpId)
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'account_deletion_failed',
        tableName: 'auth.users',
        recordId: targetUserId,
        metadata: {
          target_email: targetEmail,
          error_message: delAuthErr.message,
          deprovisioning_operation_id: deprovOpId,
        },
      })

      return errorResponse(
        `Penghapusan akun pada Supabase Auth gagal: ${delAuthErr.message}`,
        500,
        'AUTH_ADMIN_DELETE_FAILED'
      )
    }

    // 12. Unlink directory member slot if linked
    if (directoryRecord) {
      const { error: unlinkErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .update({ linked_user_id: null })
        .eq('id', directoryRecord.id)

      if (unlinkErr) {
        console.error('Failed to unlink directory member:', unlinkErr.message)
      }
    }

    // 13. Revoke any pending invitations linked to this user or email
    await supabaseAdmin
      .from('invitations')
      .update({ status: 'revoked' })
      .or(`auth_user_id.eq.${targetUserId},email.eq.${targetEmail}`)
      .eq('status', 'pending')

    // 14. Update deprovisioning operation to completed
    if (deprovOpId) {
      await supabaseAdmin
        .from('account_deprovisioning_operations')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deprovOpId)
    }

    // 15. Audit Event: account_deleted_permanently
    await recordAuditEvent(supabaseAdmin, {
      actorId: caller.id,
      action: 'account_deleted_permanently',
      tableName: 'auth.users',
      recordId: targetUserId,
      metadata: {
        target_email: targetEmail,
        target_directory_id: directoryRecord?.id ?? null,
        target_full_name: targetFullName,
        reason: reason || null,
        result: 'success',
        deprovisioning_operation_id: deprovOpId,
      },
    })

    return jsonResponse({
      success: true,
      message: `Akun login ${targetEmail} berhasil dihapus permanen dari Supabase Auth. Data anggota dan riwayat aktivitas KKN tetap aman dipertahankan.`,
      target_user_id: targetUserId,
      target_email: targetEmail,
      directory_preserved: Boolean(directoryRecord),
      directory_member_id: directoryRecord?.id ?? null,
      snapshot_preserved: true,
    })
  } catch (err: any) {
    // If snapshot was created before catastrophic throw, cleanup snapshot
    if (snapshotCreated && targetUserId) {
      try {
        const { supabaseAdmin } = await requireSuperAdmin(req)
        await supabaseAdmin
          .from('historical_account_snapshots')
          .delete()
          .eq('user_id', targetUserId)
      } catch {
        // ignore rollback errors in outer catch
      }
    }

    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

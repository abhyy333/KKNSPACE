import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { requireSuperAdmin, VALID_ROLES, type KknRole } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

type UpdateAction = 'change_role' | 'update_division' | 'suspend' | 'reactivate' | 'revoke_membership'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const { caller, supabaseAdmin } = await requireSuperAdmin(req)
    const body = await req.json().catch(() => null)

    if (!body) {
      return errorResponse('Invalid JSON payload', 400)
    }

    const targetUserId = String(body.target_user_id || '').trim()
    const action = String(body.action || '').trim() as UpdateAction

    if (!targetUserId) {
      return errorResponse('target_user_id wajib diisi.', 400)
    }

    const validActions: UpdateAction[] = [
      'change_role',
      'update_division',
      'suspend',
      'reactivate',
      'revoke_membership',
    ]
    if (!validActions.includes(action)) {
      return errorResponse('Aksi tidak valid.', 400)
    }

    // Check if target is a Super Admin
    const { data: targetAdmin } = await supabaseAdmin
      .from('system_admins')
      .select('user_id')
      .eq('user_id', targetUserId)
      .maybeSingle()

    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    const now = new Date().toISOString()

    if (action === 'change_role') {
      const newRole = String(body.role || '').trim().toLowerCase() as KknRole
      if (!VALID_ROLES.includes(newRole)) {
        return errorResponse(`Role tidak valid. Pilihan: ${VALID_ROLES.join(', ')}.`, 400)
      }

      if (!existingMembership) {
        return errorResponse('Pengguna ini belum memiliki keanggotaan KKN. Undang atau aktifkan keanggotaan terlebih dahulu.', 400)
      }

      const previousRole = existingMembership.role
      const previousDivision = existingMembership.division ?? null
      const hasDivisionInput = Object.prototype.hasOwnProperty.call(body, 'division')
      const nextDivision = hasDivisionInput
        ? body.division
          ? String(body.division).trim() || null
          : null
        : previousDivision

      const { error: updateErr } = await supabaseAdmin
        .from('memberships')
        .update({ role: newRole, division: nextDivision, updated_at: now })
        .eq('user_id', targetUserId)

      if (updateErr) {
        return errorResponse(`Gagal mengubah role anggota: ${updateErr.message}`, 500)
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        actorEmail: caller.email ?? null,
        actorAuthority: 'super_admin',
        action: 'membership_role_changed',
        tableName: 'memberships',
        recordId: targetUserId,
        oldValues: { role: previousRole, division: previousDivision },
        metadata: {
          previous_role: previousRole,
          new_role: newRole,
          previous_division: previousDivision,
          new_division: nextDivision,
        },
      })

      return jsonResponse({
        success: true,
        message: `Role berhasil diubah dari '${previousRole}' menjadi '${newRole}'.`,
      })
    }

    if (action === 'update_division') {
      if (!existingMembership) {
        return errorResponse('Pengguna ini belum memiliki keanggotaan KKN.', 400)
      }

      const previousDivision = existingMembership.division ?? null
      const nextDivision = body.division ? String(body.division).trim() || null : null

      const { error: updateErr } = await supabaseAdmin
        .from('memberships')
        .update({ division: nextDivision, updated_at: now })
        .eq('user_id', targetUserId)

      if (updateErr) {
        return errorResponse(`Gagal memperbarui divisi anggota: ${updateErr.message}`, 500)
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        actorEmail: caller.email ?? null,
        actorAuthority: 'super_admin',
        action: 'membership_division_updated',
        tableName: 'memberships',
        recordId: targetUserId,
        oldValues: { division: previousDivision },
        metadata: {
          previous_division: previousDivision,
          new_division: nextDivision,
        },
      })

      return jsonResponse({
        success: true,
        message: nextDivision
          ? `Divisi anggota berhasil diperbarui menjadi '${nextDivision}'.`
          : 'Divisi anggota berhasil dikosongkan.',
      })
    }

    if (action === 'suspend') {
      if (targetUserId === caller.id) {
        return errorResponse('Tidak dapat menonaktifkan akun Anda sendiri yang sedang digunakan.', 403)
      }

      if (targetAdmin) {
        // Ensure we don't disable the last active Super Admin
        const { count: adminCount } = await supabaseAdmin
          .from('system_admins')
          .select('*', { count: 'exact', head: true })

        if ((adminCount ?? 0) <= 1) {
          return errorResponse('Tidak dapat menonaktifkan satu-satunya Super Admin sistem.', 403)
        }
      }

      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false, updated_at: now })
        .eq('id', targetUserId)

      if (profErr) {
        return errorResponse(`Gagal menonaktifkan profil akun: ${profErr.message}`, 500)
      }

      if (existingMembership && existingMembership.status !== 'revoked') {
        const { error: memErr } = await supabaseAdmin
          .from('memberships')
          .update({ status: 'suspended', updated_at: now })
          .eq('user_id', targetUserId)

        if (memErr) {
          // Compensate profiles update if memberships update fails to keep both tables consistent
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: true, updated_at: now })
            .eq('id', targetUserId)
          return errorResponse(`Gagal menonaktifkan keanggotaan: ${memErr.message}`, 500)
        }
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'account_suspended',
        tableName: 'profiles',
        recordId: targetUserId,
        metadata: { previous_membership_status: existingMembership?.status || null },
      })

      return jsonResponse({
        success: true,
        message: 'Akun berhasil dinonaktifkan (suspended). Histori data tetap dipertahankan.',
      })
    }

    if (action === 'reactivate') {
      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true, updated_at: now })
        .eq('id', targetUserId)

      if (profErr) {
        return errorResponse(`Gagal mengaktifkan kembali profil: ${profErr.message}`, 500)
      }

      // Only reactivate suspended/revoked memberships; never activate unaccepted 'invited' rows
      if (existingMembership && (existingMembership.status === 'suspended' || existingMembership.status === 'revoked')) {
        const { error: memErr } = await supabaseAdmin
          .from('memberships')
          .update({ status: 'active', updated_at: now })
          .eq('user_id', targetUserId)

        if (memErr) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: false, updated_at: now })
            .eq('id', targetUserId)
          return errorResponse(`Gagal mengaktifkan kembali keanggotaan: ${memErr.message}`, 500)
        }
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'account_reactivated',
        tableName: 'profiles',
        recordId: targetUserId,
        metadata: { membership_status: existingMembership?.status || null },
      })

      return jsonResponse({
        success: true,
        message: 'Akun berhasil diaktifkan kembali.',
      })
    }

    if (action === 'revoke_membership') {
      if (!existingMembership) {
        return errorResponse('Pengguna tidak memiliki keanggotaan KKN.', 400)
      }

      const { error: memErr } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'revoked', updated_at: now })
        .eq('user_id', targetUserId)

      if (memErr) {
        return errorResponse(`Gagal mencabut keanggotaan: ${memErr.message}`, 500)
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'membership_revoked',
        tableName: 'memberships',
        recordId: targetUserId,
        metadata: { previous_role: existingMembership.role },
      })

      return jsonResponse({
        success: true,
        message: 'Keanggotaan KKN berhasil dicabut.',
      })
    }

    return errorResponse('Invalid action', 400)
  } catch (err: any) {
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

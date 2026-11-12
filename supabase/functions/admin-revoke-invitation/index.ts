import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { requireSuperAdmin } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

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

    const invitationId = String(body?.invitation_id || '').trim()
    if (!invitationId) {
      return errorResponse('invitation_id wajib diisi.', 400)
    }

    const { data: inv, error: fetchErr } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle()

    if (fetchErr || !inv) {
      return errorResponse('Undangan tidak ditemukan.', 404)
    }

    if (inv.status !== 'pending') {
      return errorResponse(`Hanya undangan berstatus 'pending' yang dapat dicabut (status saat ini: '${inv.status}').`, 400)
    }

    const { error: updateErr } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', inv.id)

    if (updateErr) {
      return errorResponse(`Gagal mencabut undangan: ${updateErr.message}`, 500)
    }

    // Revoke associated pending membership if still 'invited'
    if (inv.auth_user_id) {
      const { error: memErr } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('user_id', inv.auth_user_id)
        .eq('status', 'invited')

      if (memErr) {
        // Restore invitation status if membership revocation fails
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'pending' })
          .eq('id', inv.id)
        return errorResponse(`Gagal mencabut keanggotaan tertunda: ${memErr.message}`, 500)
      }
    }

    await recordAuditEvent(supabaseAdmin, {
      actorId: caller.id,
      action: 'invite_revoked',
      tableName: 'invitations',
      recordId: inv.id,
      metadata: { email: inv.email, role: inv.role },
    })

    return jsonResponse({
      success: true,
      message: `Undangan untuk ${inv.email} berhasil dicabut.`,
    })
  } catch (err: any) {
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

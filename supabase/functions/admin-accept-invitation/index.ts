import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin, requireAuthenticatedUser } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const user = await requireAuthenticatedUser(req, supabaseAdmin)

    if (!user.email) {
      return errorResponse('Akun pengguna tidak memiliki alamat email yang valid.', 400)
    }

    if (!user.email_confirmed_at) {
      return errorResponse('Email belum terverifikasi. Silakan buka tautan resmi dari kotak masuk email Anda.', 403)
    }

    const userEmail = user.email.trim().toLowerCase()

    // Find latest invitation for this user's email
    const { data: invitations, error: invErr } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('email', userEmail)
      .order('created_at', { ascending: false })

    if (invErr) {
      return errorResponse(`Gagal memeriksa data undangan: ${invErr.message}`, 500)
    }

    if (!invitations || invitations.length === 0) {
      return errorResponse('Tidak ditemukan undangan KKN yang terdaftar untuk email Anda.', 404)
    }

    const latestInv = invitations[0]

    // Check if already accepted & idempotency
    if (latestInv.status === 'accepted') {
      const { data: activeMem } = await supabaseAdmin
        .from('memberships')
        .select('role, status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (activeMem && activeMem.status === 'active') {
        if (req.method === 'GET') {
          return jsonResponse({
            valid: true,
            already_accepted: true,
            email: userEmail,
            role: activeMem.role,
          })
        }
        return jsonResponse({
          success: true,
          already_accepted: true,
          message: 'Undangan telah diterima sebelumnya. Keanggotaan Anda sudah aktif.',
          role: activeMem.role,
        })
      }
    }

    if (latestInv.status === 'revoked') {
      return errorResponse('Undangan ini telah dicabut oleh Super Admin dan tidak lagi berlaku.', 403, 'INVITATION_REVOKED')
    }

    if (latestInv.status === 'expired' || new Date(latestInv.expires_at).getTime() <= Date.now()) {
      if (latestInv.status === 'pending') {
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', latestInv.id)
      }
      return errorResponse('Tautan undangan telah kedaluwarsa. Hubungi Super Admin untuk mengirim ulang undangan.', 410, 'INVITATION_EXPIRED')
    }

    if (latestInv.status !== 'pending') {
      return errorResponse(`Undangan tidak valid (status: ${latestInv.status}).`, 400)
    }

    // Read profile info if any
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile && existingProfile.is_active === false) {
      return errorResponse('Akun profil Anda sedang dinonaktifkan oleh administrator.', 403, 'ACCOUNT_INACTIVE')
    }

    // Read directory linkage if invitation is tied to a team directory slot
    let dirMember: {
      id: string
      linked_user_id: string | null
      full_name: string
      position_label: string
      role: string
      division: string | null
      is_active: boolean
    } | null = null

    if (latestInv.directory_member_id) {
      const { data: dirRow, error: dirErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id, linked_user_id, full_name, position_label, role, division, is_active')
        .eq('id', latestInv.directory_member_id)
        .maybeSingle()

      if (dirErr) {
        return errorResponse(`Gagal memeriksa data direktori tim: ${dirErr.message}`, 500)
      }
      if (!dirRow || !dirRow.is_active) {
        return errorResponse('Record anggota direktori untuk undangan ini tidak ditemukan atau nonaktif.', 403)
      }
      if (dirRow.linked_user_id && dirRow.linked_user_id !== user.id) {
        return errorResponse('Slot anggota tim ini sudah terhubung ke akun pengguna lain.', 409)
      }

      const { data: otherLinkedDir } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id')
        .eq('linked_user_id', user.id)
        .neq('id', dirRow.id)
        .maybeSingle()

      if (otherLinkedDir) {
        return errorResponse('Akun Anda sudah terhubung ke record anggota tim lain.', 409)
      }

      dirMember = dirRow
    }

    const effectiveRole = dirMember ? dirMember.role : latestInv.role
    const effectiveDivision = dirMember ? (dirMember.division ?? null) : (latestInv.division ?? null)

    // If GET, only verify and return invitation summary without activating yet
    if (req.method === 'GET') {
      return jsonResponse({
        valid: true,
        already_accepted: false,
        invitation_id: latestInv.id,
        directory_member_id: dirMember?.id ?? null,
        position_label: dirMember?.position_label ?? null,
        email: userEmail,
        role: effectiveRole,
        division: effectiveDivision,
        full_name:
          dirMember?.full_name ||
          existingProfile?.full_name ||
          (user.user_metadata?.full_name as string) ||
          '',
        expires_at: latestInv.expires_at,
      })
    }

    // POST: Finalize invitation acceptance (Role & division strictly come from server record)
    const now = new Date().toISOString()
    const body = await req.json().catch(() => ({}))
    const submittedFullName = body.full_name ? String(body.full_name).trim() : null

    const resolvedName =
      submittedFullName ||
      dirMember?.full_name ||
      existingProfile?.full_name ||
      (user.user_metadata?.full_name as string) ||
      userEmail.split('@')[0]

    // 1. Ensure profile exists & is active
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: resolvedName,
          is_active: true,
          updated_at: now,
        },
        { onConflict: 'id' }
      )

    if (profErr) {
      return errorResponse(`Gagal memperbarui profil pengguna: ${profErr.message}`, 500)
    }

    // 2. Activate membership strictly with role & division from database directory/invitation
    const { error: memErr } = await supabaseAdmin
      .from('memberships')
      .upsert(
        {
          user_id: user.id,
          role: effectiveRole,
          division: effectiveDivision,
          status: 'active',
          joined_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )

    if (memErr) {
      return errorResponse(`Gagal mengaktifkan keanggotaan KKN: ${memErr.message}`, 500)
    }

    // 3. Link kkn_team_directory record only after verified email + acceptance
    if (dirMember) {
      const { error: linkErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .update({
          linked_user_id: user.id,
          account_email: userEmail,
          full_name: resolvedName,
        })
        .eq('id', dirMember.id)
        .or(`linked_user_id.is.null,linked_user_id.eq.${user.id}`)

      if (linkErr) {
        return errorResponse(`Keanggotaan aktif, namun gagal menautkan akun ke direktori tim: ${linkErr.message}`, 500)
      }
    }

    // 4. Mark invitation as accepted
    const { error: updateInvErr } = await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: now,
        auth_user_id: user.id,
      })
      .eq('id', latestInv.id)

    if (updateInvErr) {
      return errorResponse(`Keanggotaan aktif, namun gagal menandai undangan selesai: ${updateInvErr.message}`, 500)
    }

    // 5. Record audit event
    await recordAuditEvent(supabaseAdmin, {
      actorId: user.id,
      action: 'invitation_accepted',
      tableName: 'invitations',
      recordId: latestInv.id,
      metadata: {
        email: userEmail,
        role: effectiveRole,
        division: effectiveDivision,
        directory_member_id: dirMember?.id ?? null,
      },
    })

    return jsonResponse({
      success: true,
      message: 'Undangan berhasil diterima. Selamat datang di workspace KKN SPACE.',
      role: effectiveRole,
      directory_member_id: dirMember?.id ?? null,
    })
  } catch (err: any) {
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

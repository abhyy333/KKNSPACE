import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { requireSuperAdmin, VALID_ROLES, type KknRole } from '../_shared/supabaseAdmin.ts'
import { recordAuditEvent } from '../_shared/audit.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CANONICAL_PROD_URL = 'https://kknspace.vercel.app'

function resolveCanonicalAppUrl(req: Request): string {
  const configured = (
    Deno.env.get('APP_BASE_URL') ||
    Deno.env.get('PUBLIC_SITE_URL') ||
    Deno.env.get('SITE_URL') ||
    ''
  ).trim().replace(/\/+$/, '')

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').toLowerCase()
  const isLocalRuntime =
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.includes('kong:')

  // In hosted / production Supabase runtime:
  // MUST NEVER resolve to localhost or 127.0.0.1
  if (!isLocalRuntime) {
    const prodUrl = configured || CANONICAL_PROD_URL
    if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
      return CANONICAL_PROD_URL
    }
    return prodUrl
  }

  // In local development runtime (local Supabase CLI instance):
  const origin = req.headers.get('origin') || configured || CANONICAL_PROD_URL
  return origin.replace(/\/+$/, '')
}

function buildSafeActivationUrl(
  baseUrl: string,
  hashedToken: string,
  verificationType = 'invite',
  metadata?: {
    fullName?: string
    positionLabel?: string | null
    studyProgram?: string | null
  }
): string {
  const safeUrl = new URL(`${baseUrl}/auth/accept-invite`)
  safeUrl.searchParams.set('token_hash', hashedToken)
  safeUrl.searchParams.set('type', verificationType)
  if (metadata?.fullName) {
    safeUrl.searchParams.set('name', metadata.fullName)
  }
  if (metadata?.positionLabel) {
    safeUrl.searchParams.set('pos', metadata.positionLabel)
  }
  if (metadata?.studyProgram) {
    safeUrl.searchParams.set('prog', metadata.studyProgram)
  }
  return safeUrl.toString()
}

async function generateOfficialInviteToken(
  supabaseAdmin: Awaited<ReturnType<typeof requireSuperAdmin>>['supabaseAdmin'],
  email: string,
  redirectTo: string,
  fullName?: string
) {
  // 1. Generate invitation link & token hash via Supabase Auth Admin API
  const { data: inviteLinkData, error: inviteLinkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        ...(fullName ? { data: { full_name: fullName } } : {}),
      },
    })

  if (!inviteLinkErr && inviteLinkData?.user && inviteLinkData?.properties?.hashed_token) {
    return {
      user: inviteLinkData.user,
      hashedToken: inviteLinkData.properties.hashed_token,
      verificationType: inviteLinkData.properties.verification_type || 'invite',
      error: null,
    }
  }

  // 2. If user is already registered / confirmed in Auth, fall back to magiclink
  const { data: magicLinkData, error: magicLinkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

  if (!magicLinkErr && magicLinkData?.user && magicLinkData?.properties?.hashed_token) {
    return {
      user: magicLinkData.user,
      hashedToken: magicLinkData.properties.hashed_token,
      verificationType: magicLinkData.properties.verification_type || 'magiclink',
      error: null,
    }
  }

  return {
    user: null,
    hashedToken: null,
    verificationType: 'invite',
    error: inviteLinkErr || magicLinkErr,
  }
}

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

    const baseUrl = resolveCanonicalAppUrl(req)
    const redirectTo = `${baseUrl}/auth/accept-invite`

    // CASE 0: Set / Update Account Email for a Directory Slot (before acceptance)
    if (body.action === 'set_directory_email') {
      const directoryMemberId = String(body.directory_member_id || '').trim()
      if (!directoryMemberId || !UUID_REGEX.test(directoryMemberId)) {
        return errorResponse('directory_member_id tidak valid.', 400)
      }

      const rawInputEmail =
        typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

      if (rawInputEmail && !EMAIL_REGEX.test(rawInputEmail)) {
        return errorResponse('Format alamat email tidak valid.', 400)
      }

      const { data: dirMember, error: dirErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id, full_name, role, division, linked_user_id, account_email, is_active')
        .eq('id', directoryMemberId)
        .maybeSingle()

      if (dirErr || !dirMember) {
        return errorResponse('Anggota direktori tidak ditemukan.', 404)
      }

      if (dirMember.linked_user_id) {
        return errorResponse(
          'Akun anggota ini sudah aktif dan terhubung ke Auth UID sehingga email tidak dapat diganti di roster.',
          409
        )
      }

      if (rawInputEmail) {
        const { data: duplicateSlot } = await supabaseAdmin
          .from('kkn_team_directory')
          .select('id, full_name')
          .eq('account_email', rawInputEmail)
          .neq('id', dirMember.id)
          .maybeSingle()

        if (duplicateSlot) {
          return errorResponse(
            `Email ${rawInputEmail} sudah digunakan pada slot anggota '${duplicateSlot.full_name}'.`,
            409
          )
        }
      }

      // If there are pending invitations for this directory slot with a different email, revoke unused ones cleanly before updating email
      const { data: slotPending } = await supabaseAdmin
        .from('invitations')
        .select('id, email, auth_user_id, expires_at')
        .eq('directory_member_id', dirMember.id)
        .eq('status', 'pending')

      for (const inv of slotPending ?? []) {
        const isExpired = new Date(inv.expires_at).getTime() <= Date.now()
        const emailChanged = inv.email !== rawInputEmail
        if (isExpired || emailChanged) {
          await supabaseAdmin
            .from('invitations')
            .update({ status: isExpired ? 'expired' : 'revoked' })
            .eq('id', inv.id)

          if (!isExpired && inv.auth_user_id) {
            await supabaseAdmin
              .from('memberships')
              .update({ status: 'revoked', updated_at: new Date().toISOString() })
              .eq('user_id', inv.auth_user_id)
              .eq('status', 'invited')
          }
        }
      }

      const nextEmail = rawInputEmail || null
      const { error: updateDirErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .update({ account_email: nextEmail })
        .eq('id', dirMember.id)

      if (updateDirErr) {
        return errorResponse(`Gagal menyimpan email anggota: ${updateDirErr.message}`, 500)
      }

      // Inspect if email belongs to an existing Auth user (do NOT auto-link)
      let existingAuthWarning: {
        email: string
        is_super_admin: boolean
        membership_role: string | null
        membership_status: string | null
        linked_to_other_directory: string | null
      } | null = null

      if (nextEmail) {
        const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const matchedUser = (usersPage?.users ?? []).find(
          (u) => (u.email || '').toLowerCase() === nextEmail
        )
        if (matchedUser) {
          const [adminRes, memRes, otherDirRes] = await Promise.all([
            supabaseAdmin.from('system_admins').select('user_id').eq('user_id', matchedUser.id).maybeSingle(),
            supabaseAdmin.from('memberships').select('role, status').eq('user_id', matchedUser.id).maybeSingle(),
            supabaseAdmin
              .from('kkn_team_directory')
              .select('full_name')
              .eq('linked_user_id', matchedUser.id)
              .neq('id', dirMember.id)
              .maybeSingle(),
          ])
          existingAuthWarning = {
            email: nextEmail,
            is_super_admin: Boolean(adminRes.data),
            membership_role: memRes.data?.role ?? null,
            membership_status: memRes.data?.status ?? null,
            linked_to_other_directory: otherDirRes.data?.full_name ?? null,
          }
        }
      }

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'directory_email_updated',
        tableName: 'kkn_team_directory',
        recordId: dirMember.id,
        oldValues: { account_email: dirMember.account_email ?? null },
        metadata: {
          account_email: nextEmail,
          member_name: dirMember.full_name,
        },
      })

      return jsonResponse({
        success: true,
        account_email: nextEmail,
        existing_auth_warning: existingAuthWarning,
        message: nextEmail
          ? `Email ${nextEmail} berhasil disimpan untuk ${dirMember.full_name}.`
          : `Email akun untuk ${dirMember.full_name} dikosongkan.`,
      })
    }

    // CASE 1: Resend Existing Pending Invitation
    if (body.isResend && body.invitation_id) {
      const { data: inv, error: fetchErr } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', body.invitation_id)
        .maybeSingle()

      if (fetchErr || !inv) {
        return errorResponse('Undangan tidak ditemukan.', 404)
      }

      if (inv.status !== 'pending') {
        return errorResponse(`Undangan berstatus '${inv.status}' dan tidak dapat dikirim ulang.`, 400)
      }

      if (new Date(inv.expires_at).getTime() <= Date.now()) {
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', inv.id)
        return errorResponse(
          'Undangan sebelumnya telah kedaluwarsa dan statusnya diperbarui menjadi Kedaluwarsa. Kirim undangan baru untuk anggota ini.',
          410
        )
      }

      // Invalidate the old pending invitation so old link cannot be used
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', inv.id)

      let dirRow: { id: string; full_name: string; position_label: string; study_program: string } | null = null
      if (inv.directory_member_id) {
        const { data: fetchedDir } = await supabaseAdmin
          .from('kkn_team_directory')
          .select('id, full_name, position_label, study_program')
          .eq('id', inv.directory_member_id)
          .maybeSingle()
        dirRow = fetchedDir
      }

      // Generate single official token via generateLink (never double-generate)
      const tokenResult = await generateOfficialInviteToken(
        supabaseAdmin,
        inv.email,
        redirectTo,
        dirRow?.full_name
      )

      if (tokenResult.error || !tokenResult.user || !tokenResult.hashedToken) {
        return errorResponse(
          `Gagal membuat token undangan baru: ${tokenResult.error?.message || 'Unknown error'}.`,
          502
        )
      }

      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newInv, error: insertNewErr } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: inv.email,
          role: inv.role,
          division: inv.division,
          status: 'pending',
          invited_by: caller.id,
          auth_user_id: tokenResult.user.id,
          directory_member_id: inv.directory_member_id ?? null,
          expires_at: newExpiry,
        })
        .select()
        .single()

      if (insertNewErr || !newInv) {
        return errorResponse(
          `Gagal mencatat undangan baru ke database: ${insertNewErr?.message || 'Unknown DB error'}`,
          500
        )
      }

      const safeInviteLink = buildSafeActivationUrl(
        baseUrl,
        tokenResult.hashedToken,
        tokenResult.verificationType,
        {
          fullName: dirRow?.full_name,
          positionLabel: dirRow?.position_label,
          studyProgram: dirRow?.study_program,
        }
      )

      await recordAuditEvent(supabaseAdmin, {
        actorId: caller.id,
        action: 'invite_resent',
        tableName: 'invitations',
        recordId: newInv.id,
        metadata: {
          email: inv.email,
          role: inv.role,
          directory_member_id: inv.directory_member_id ?? null,
          delivery_method: 'manual_link',
          previous_invitation_id: inv.id,
        },
      })

      return jsonResponse({
        success: true,
        delivery_method: 'manual_link',
        invite_link: safeInviteLink,
        message: `Tautan aktivasi baru untuk ${inv.email} berhasil dibuat dan siap disalin untuk dikirimkan melalui WhatsApp.`,
        invitation_id: newInv.id,
      })
    }

    // CASE 2: Create New Invitation
    const directoryMemberId = body.directory_member_id
      ? String(body.directory_member_id).trim()
      : null
    const confirmExistingAccount = Boolean(body.confirm_existing_account)

    if (directoryMemberId && !UUID_REGEX.test(directoryMemberId)) {
      return errorResponse('directory_member_id tidak valid.', 400)
    }

    let dirMember: {
      id: string
      linked_user_id: string | null
      full_name: string
      position_label: string
      study_program: string
      role: KknRole
      division: string | null
      account_email: string | null
      is_active: boolean
    } | null = null

    if (directoryMemberId) {
      const { data: fetchedDir, error: dirFetchErr } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id, linked_user_id, full_name, position_label, study_program, role, division, account_email, is_active')
        .eq('id', directoryMemberId)
        .maybeSingle()

      if (dirFetchErr || !fetchedDir) {
        return errorResponse('Slot anggota direktori tidak ditemukan.', 404)
      }
      if (!fetchedDir.is_active) {
        return errorResponse('Anggota direktori sedang nonaktif dan tidak dapat diundang.', 400)
      }
      if (fetchedDir.linked_user_id) {
        return errorResponse(
          `Anggota '${fetchedDir.full_name}' sudah memiliki akun aktif yang terhubung.`,
          409
        )
      }
      dirMember = fetchedDir as typeof dirMember
    }

    const rawEmail = String(body.email || dirMember?.account_email || '').trim().toLowerCase()
    const fullName = dirMember ? dirMember.full_name : String(body.full_name || '').trim()
    const role = dirMember
      ? dirMember.role
      : (String(body.role || '').trim().toLowerCase() as KknRole)
    const division = dirMember
      ? dirMember.division ?? null
      : body.division
        ? String(body.division).trim() || null
        : null
    const note = body.note ? String(body.note).trim() : null

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return errorResponse('Alamat email tidak valid.', 400)
    }
    if (!fullName || fullName.length < 2) {
      return errorResponse('Nama lengkap wajib diisi (minimal 2 karakter).', 400)
    }
    if (!VALID_ROLES.includes(role)) {
      return errorResponse(`Role tidak valid. Pilihan yang diizinkan: ${VALID_ROLES.join(', ')}.`, 400)
    }

    // Ensure no duplicate email claim across directory records
    if (dirMember) {
      const { data: emailOwnerDir } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id, full_name')
        .eq('account_email', rawEmail)
        .neq('id', dirMember.id)
        .maybeSingle()

      if (emailOwnerDir) {
        return errorResponse(
          `Email ${rawEmail} sudah ditetapkan untuk anggota lain (${emailOwnerDir.full_name}).`,
          409
        )
      }

      // Expire or revoke any stale pending invitations on this directory slot first
      const { data: slotPending } = await supabaseAdmin
        .from('invitations')
        .select('id, email, expires_at')
        .eq('directory_member_id', dirMember.id)
        .eq('status', 'pending')

      for (const inv of slotPending ?? []) {
        if (new Date(inv.expires_at).getTime() <= Date.now()) {
          await supabaseAdmin
            .from('invitations')
            .update({ status: 'expired' })
            .eq('id', inv.id)
        } else {
          return errorResponse(
            `Sudah terdapat undangan aktif (pending) untuk anggota '${dirMember.full_name}' (${inv.email}). Gunakan Kirim Ulang atau Batalkan terlebih dahulu.`,
            409
          )
        }
      }
    }

    // 1. Check duplicate pending invitations by email
    const { data: existingInvites } = await supabaseAdmin
      .from('invitations')
      .select('id, status, expires_at')
      .eq('email', rawEmail)
      .eq('status', 'pending')

    for (const inv of existingInvites ?? []) {
      if (new Date(inv.expires_at).getTime() <= Date.now()) {
        await supabaseAdmin.from('invitations').update({ status: 'expired' }).eq('id', inv.id)
      } else {
        return errorResponse('Sudah terdapat undangan berstatus menunggu (pending) untuk email ini.', 409)
      }
    }

    // 2. Check existing Auth user
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingAuthUser = (usersPage?.users ?? []).find(
      (u) => (u.email || '').toLowerCase() === rawEmail
    )
    let preserveExistingMembership = false

    if (existingAuthUser) {
      // Block if already linked to any directory record
      const { data: existingLinkedDir } = await supabaseAdmin
        .from('kkn_team_directory')
        .select('id, full_name')
        .eq('linked_user_id', existingAuthUser.id)
        .maybeSingle()

      if (existingLinkedDir) {
        return errorResponse(
          `Email ini sudah terhubung dengan anggota '${existingLinkedDir.full_name}' di direktori tim.`,
          409
        )
      }

      // Check if existing user is Super Admin
      const { data: isAdmin } = await supabaseAdmin
        .from('system_admins')
        .select('user_id')
        .eq('user_id', existingAuthUser.id)
        .maybeSingle()

      if (isAdmin) {
        return errorResponse('Email ini terdaftar sebagai Super Admin platform.', 409)
      }

      // Check existing membership
      const { data: existingMember } = await supabaseAdmin
        .from('memberships')
        .select('role, status')
        .eq('user_id', existingAuthUser.id)
        .maybeSingle()

      if (existingMember && (existingMember.status === 'active' || existingMember.status === 'suspended')) {
        if (!dirMember) {
          return errorResponse('Email ini sudah terdaftar sebagai akun aktif/terdaftar di KKN SPACE.', 409)
        }
        if (!confirmExistingAccount) {
          return jsonResponse(
            {
              error: `Email ${rawEmail} sudah memiliki akun Auth existing (role: ${existingMember.role}, status: ${existingMember.status}). Akun tersebut tidak akan diubah otomatis; konfirmasi diperlukan untuk mengirim tautan verifikasi pengaitan.`,
              code: 'EXISTING_AUTH_ACCOUNT_CONFIRMATION_REQUIRED',
              existing_account: {
                email: rawEmail,
                membership_role: existingMember.role,
                membership_status: existingMember.status,
              },
            },
            409
          )
        }
        preserveExistingMembership = true
      }
    }

    // 3. Generate single official token via generateLink (never double-generate)
    const tokenResult = await generateOfficialInviteToken(
      supabaseAdmin,
      rawEmail,
      redirectTo,
      fullName
    )

    if (tokenResult.error || !tokenResult.user || !tokenResult.hashedToken) {
      return errorResponse(
        `Gagal membuat token aktivasi undangan: ${tokenResult.error?.message || 'Unknown error'}.`,
        502
      )
    }

    const authUserId = tokenResult.user.id
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // 4. Write profiles, invitations, and memberships cleanly
    if (!preserveExistingMembership) {
      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: authUserId,
            full_name: fullName,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (profErr) {
        console.error('Failed to upsert profile during invite:', profErr)
        return errorResponse(`Gagal menyiapkan profil akun: ${profErr.message}`, 500)
      }
    }

    if (dirMember) {
      await supabaseAdmin
        .from('kkn_team_directory')
        .update({ account_email: rawEmail })
        .eq('id', dirMember.id)
        .is('linked_user_id', null)
    }

    const { data: createdInv, error: invInsertErr } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: rawEmail,
        role,
        division,
        status: 'pending',
        invited_by: caller.id,
        auth_user_id: authUserId,
        directory_member_id: dirMember?.id ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (invInsertErr || !createdInv) {
      console.error('Failed to insert invitation row:', invInsertErr)
      if (!existingAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((e) => console.error('Cleanup error:', e))
      }
      return errorResponse(
        `Gagal mencatat undangan ke database: ${invInsertErr?.message || 'Unknown DB error'}`,
        500
      )
    }

    if (!preserveExistingMembership) {
      const { error: memErr } = await supabaseAdmin
        .from('memberships')
        .upsert(
          {
            user_id: authUserId,
            role,
            division,
            status: 'invited',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (memErr) {
        console.error('Failed to upsert invited membership:', memErr)
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'revoked' })
          .eq('id', createdInv.id)
        return errorResponse(`Gagal menetapkan status awal keanggotaan: ${memErr.message}`, 500)
      }
    }

    // Build safe manual activation link pointing directly to KKN SPACE frontend
    const safeInviteLink = buildSafeActivationUrl(
      baseUrl,
      tokenResult.hashedToken,
      tokenResult.verificationType,
      {
        fullName,
        positionLabel: dirMember?.position_label,
        studyProgram: dirMember?.study_program,
      }
    )

    // 5. Audit event (never log raw tokens or links)
    await recordAuditEvent(supabaseAdmin, {
      actorId: caller.id,
      action: 'invite_created',
      tableName: 'invitations',
      recordId: createdInv.id,
      metadata: {
        email: rawEmail,
        role,
        division: division || undefined,
        directory_member_id: dirMember?.id || undefined,
        delivery_method: 'manual_link',
        note: note || undefined,
      },
    })

    return jsonResponse({
      success: true,
      delivery_method: 'manual_link',
      invite_link: safeInviteLink,
      message: `Tautan aktivasi manual untuk ${rawEmail} (${role}) berhasil dibuat dan siap disalin untuk dikirimkan melalui WhatsApp.`,
      invitation: createdInv,
    }, 201)
  } catch (err: any) {
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { requireSuperAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supabaseAdmin } = await requireSuperAdmin(req)

    let page = 1
    let perPage = 20
    let search = ''
    let roleFilter = 'all'
    let accountStatusFilter = 'all'
    let membershipStatusFilter = 'all'

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      page = Math.max(1, Number(body.page) || 1)
      perPage = Math.min(100, Math.max(1, Number(body.perPage) || 20))
      search = String(body.search || '').trim().toLowerCase()
      roleFilter = String(body.role || 'all')
      accountStatusFilter = String(body.accountStatus || 'all')
      membershipStatusFilter = String(body.membershipStatus || 'all')
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      page = Math.max(1, Number(url.searchParams.get('page')) || 1)
      perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('perPage')) || 20))
      search = (url.searchParams.get('search') || '').trim().toLowerCase()
      roleFilter = url.searchParams.get('role') || 'all'
      accountStatusFilter = url.searchParams.get('accountStatus') || 'all'
      membershipStatusFilter = url.searchParams.get('membershipStatus') || 'all'
    } else {
      return errorResponse('Method not allowed', 405)
    }

    // Fetch Auth users via Admin API
    const { data: authUsersData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (authErr) {
      return errorResponse(`Failed to list auth users: ${authErr.message}`, 500)
    }

    const authUsers = authUsersData?.users ?? []

    // Fetch relational data in parallel
    const [profilesRes, adminsRes, membershipsRes, invitationsRes, directoryRes, snapshotsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name, is_active, created_at'),
      supabaseAdmin.from('system_admins').select('user_id'),
      supabaseAdmin.from('memberships').select('user_id, role, division, status, joined_at, created_at'),
      supabaseAdmin
        .from('invitations')
        .select('id, email, role, division, status, invited_by, auth_user_id, directory_member_id, expires_at, accepted_at, created_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('kkn_team_directory')
        .select('id, linked_user_id, full_name, identity_number, university, study_program, academic_status, phone, position_label, role, division, account_email, photo_file_id, is_active, created_at, updated_at'),
      supabaseAdmin
        .from('historical_account_snapshots')
        .select('id, user_id, directory_member_id, full_name, email, role, division, deleted_at, deletion_reason')
        .order('deleted_at', { ascending: false }),
    ])

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p])
    )
    const adminSet = new Set(
      (adminsRes.data ?? []).map((a) => a.user_id)
    )
    const membershipMap = new Map(
      (membershipsRes.data ?? []).map((m) => [m.user_id, m])
    )
    const invitationsList = invitationsRes.data ?? []
    const snapshotsList = snapshotsRes.data ?? []

    const snapshotByDirId = new Map<string, typeof snapshotsList[0]>()
    const snapshotByEmail = new Map<string, typeof snapshotsList[0]>()
    for (const snap of snapshotsList) {
      if (snap.directory_member_id && !snapshotByDirId.has(snap.directory_member_id)) {
        snapshotByDirId.set(snap.directory_member_id, snap)
      }
      const normEmail = (snap.email || '').toLowerCase().trim()
      if (normEmail && !snapshotByEmail.has(normEmail)) {
        snapshotByEmail.set(normEmail, snap)
      }
    }

    // Map latest invitation by auth_user_id or lowercase email
    const invitationByUserId = new Map<string, typeof invitationsList[0]>()
    const invitationByEmail = new Map<string, typeof invitationsList[0]>()
    for (const inv of invitationsList) {
      if (inv.auth_user_id && !invitationByUserId.has(inv.auth_user_id)) {
        invitationByUserId.set(inv.auth_user_id, inv)
      }
      const normEmail = inv.email.toLowerCase()
      if (!invitationByEmail.has(normEmail)) {
        invitationByEmail.set(normEmail, inv)
      }
    }

    // Build safe DTOs
    const directoryRows = directoryRes.data ?? []
    const directoryByLinkedUserId = new Map<string, typeof directoryRows[0]>()
    for (const dir of directoryRows) {
      if (dir.linked_user_id) {
        directoryByLinkedUserId.set(dir.linked_user_id, dir)
      }
    }

    const allDtos = authUsers.map((u) => {
      const profile = profileMap.get(u.id)
      const isSuperAdmin = adminSet.has(u.id)
      const membership = membershipMap.get(u.id)
      const normEmail = (u.email || '').toLowerCase()
      const inv = invitationByUserId.get(u.id) || invitationByEmail.get(normEmail)
      const linkedDir = directoryByLinkedUserId.get(u.id)

      return {
        id: u.id,
        email: u.email || '',
        full_name: profile?.full_name || (u.user_metadata?.full_name as string) || normEmail.split('@')[0] || 'Pengguna',
        is_super_admin: isSuperAdmin,
        is_active: profile ? profile.is_active !== false : true,
        membership_role: membership?.role || null,
        membership_division: membership?.division || null,
        membership_status: membership?.status || null,
        invitation_status: inv?.status || null,
        created_at: profile?.created_at || u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        directory_member_id: linkedDir ? linkedDir.id : null,
        directory_member_name: linkedDir ? linkedDir.full_name : null,
        is_linked_to_directory: Boolean(linkedDir),
      }
    })

    // Calculate live summary stats across all accounts
    const summary = {
      totalAuthUsers: allDtos.length,
      activeAccounts: allDtos.filter((u) => u.is_active).length,
      inactiveAccounts: allDtos.filter((u) => !u.is_active).length,
      pendingInvitations: invitationsList.filter((i) => i.status === 'pending').length,
      activeMembers: allDtos.filter((u) => u.membership_status === 'active').length,
    }

    // Apply server-side search & filters
    const filtered = allDtos.filter((dto) => {
      if (search) {
        const matchesName = dto.full_name.toLowerCase().includes(search)
        const matchesEmail = dto.email.toLowerCase().includes(search)
        const matchesDirName = dto.directory_member_name ? dto.directory_member_name.toLowerCase().includes(search) : false
        if (!matchesName && !matchesEmail && !matchesDirName) return false
      }

      if (roleFilter !== 'all') {
        if (roleFilter === 'super_admin') {
          if (!dto.is_super_admin) return false
        } else if (roleFilter === 'none') {
          if (dto.membership_role !== null) return false
        } else {
          if (dto.membership_role !== roleFilter) return false
        }
      }

      if (accountStatusFilter === 'active' && !dto.is_active) return false
      if (accountStatusFilter === 'inactive' && dto.is_active) return false

      if (membershipStatusFilter !== 'all') {
        if (membershipStatusFilter === 'none') {
          if (dto.membership_status !== null) return false
        } else {
          if (dto.membership_status !== membershipStatusFilter) return false
        }
      }

      return true
    })

    // Sort: Super Admins first, then newest created_at
    filtered.sort((a, b) => {
      if (a.is_super_admin !== b.is_super_admin) return a.is_super_admin ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const totalFiltered = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage))
    const offset = (page - 1) * perPage
    const paginatedUsers = filtered.slice(offset, offset + perPage)

    // Enrich invitations with inviter email/name, invitee name, and directory member name
    const authUserMap = new Map(allDtos.map((d) => [d.id, d]))
    const authUserByEmailMap = new Map(
      authUsers.map((u) => [(u.email || '').toLowerCase(), u])
    )
    const directoryNameMap = new Map(directoryRows.map((d) => [d.id, d.full_name]))

    const enrichedInvitations = invitationsList.map((inv) => {
      const inviter = authUserMap.get(inv.invited_by)
      const invitee = inv.auth_user_id ? authUserMap.get(inv.auth_user_id) : authUserMap.get(inv.email.toLowerCase())
      return {
        ...inv,
        invitee_name: invitee?.full_name || null,
        inviter_name: inviter?.full_name || inviter?.email || 'Super Admin',
        inviter_email: inviter?.email || null,
        directory_member_name: inv.directory_member_id ? (directoryNameMap.get(inv.directory_member_id) || null) : null,
      }
    })

    const roleRank: Record<string, number> = {
      dpl: 1,
      ketua: 2,
      sekretaris: 3,
      bendahara: 4,
      anggota: 5,
    }

    const invitationsByMemberId = new Map<string, typeof enrichedInvitations>()
    for (const inv of enrichedInvitations) {
      if (!inv.directory_member_id) continue
      const existingList = invitationsByMemberId.get(inv.directory_member_id) ?? []
      existingList.push(inv)
      invitationsByMemberId.set(inv.directory_member_id, existingList)
    }

    const nowMs = Date.now()
    const directoryRoster = directoryRows
      .map((dir) => {
        const linkedAuthDto = dir.linked_user_id ? authUserMap.get(dir.linked_user_id) ?? null : null
        const linkedAuthRaw = dir.linked_user_id
          ? authUsers.find((u) => u.id === dir.linked_user_id) ?? null
          : null

        const memberInvitations = invitationsByMemberId.get(dir.id) ?? []
        const latestInv = memberInvitations[0] ?? null
        const latestInvEffectiveStatus = latestInv
          ? latestInv.status === 'pending' && new Date(latestInv.expires_at).getTime() <= nowMs
            ? 'expired'
            : latestInv.status
          : null

        const resolvedEmail = (
          linkedAuthDto?.email ||
          dir.account_email ||
          latestInv?.email ||
          ''
        ).trim().toLowerCase() || null

        const existingAuthByEmail = !dir.linked_user_id && resolvedEmail
          ? authUserByEmailMap.get(resolvedEmail) ?? null
          : null
        const existingAuthByEmailDto = existingAuthByEmail ? authUserMap.get(existingAuthByEmail.id) ?? null : null
        const existingAccountMatchesOtherDir = Boolean(
          existingAuthByEmail &&
          directoryRows.some((other) => other.id !== dir.id && other.linked_user_id === existingAuthByEmail.id)
        )

        const memberSnapshot =
          snapshotByDirId.get(dir.id) ||
          (resolvedEmail ? snapshotByEmail.get(resolvedEmail) : null)

        let lifecycleStatus:
          | 'belum_diisi'
          | 'siap_diundang'
          | 'undangan_terkirim'
          | 'menunggu_aktivasi'
          | 'aktif'
          | 'undangan_kedaluwarsa'
          | 'undangan_dibatalkan'
          | 'perlu_tindakan'
          | 'akun_dihapus' = 'belum_diisi'
        let actionReason: string | null = null

        if (dir.linked_user_id) {
          if (!linkedAuthDto || !linkedAuthRaw?.email_confirmed_at) {
            lifecycleStatus = 'perlu_tindakan'
            actionReason = 'Auth UID terhubung namun akun belum terkonfirmasi.'
          } else if (linkedAuthDto.is_active === false || linkedAuthDto.membership_status !== 'active') {
            lifecycleStatus = 'perlu_tindakan'
            actionReason = `Keanggotaan berstatus '${linkedAuthDto.membership_status ?? 'none'}' atau akun dinonaktifkan.`
          } else {
            lifecycleStatus = 'aktif'
          }
        } else if (latestInvEffectiveStatus === 'pending') {
          const invAuth = latestInv?.auth_user_id
            ? authUsers.find((u) => u.id === latestInv.auth_user_id) ?? null
            : existingAuthByEmail
          if (invAuth?.email_confirmed_at) {
            lifecycleStatus = 'menunggu_aktivasi'
          } else {
            lifecycleStatus = 'undangan_terkirim'
          }
        } else if (memberSnapshot) {
          lifecycleStatus = 'akun_dihapus'
          actionReason = `Akun Auth dihapus permanen pada ${new Date(memberSnapshot.deleted_at).toLocaleString('id-ID')}. Riwayat aktivitas dan profil anggota tetap utuh.`
        } else if (latestInvEffectiveStatus === 'expired') {
          lifecycleStatus = 'undangan_kedaluwarsa'
        } else if (latestInvEffectiveStatus === 'revoked') {
          lifecycleStatus = 'undangan_dibatalkan'
        } else if (latestInvEffectiveStatus === 'accepted') {
          lifecycleStatus = 'perlu_tindakan'
          actionReason = 'Undangan berstatus accepted namun Auth UID belum tertaut di direktori.'
        } else if (!resolvedEmail) {
          lifecycleStatus = 'belum_diisi'
        } else if (existingAuthByEmail) {
          lifecycleStatus = 'perlu_tindakan'
          actionReason = existingAccountMatchesOtherDir
            ? 'Email sudah terhubung dengan akun anggota lain.'
            : 'Email sudah terdaftar sebagai akun existing di Supabase Auth; konfirmasi diperlukan sebelum mengirim tautan pengaitan.'
        } else {
          lifecycleStatus = 'siap_diundang'
        }

        const effectiveAccountStatus = linkedAuthDto
          ? linkedAuthDto.is_active
            ? 'active'
            : 'inactive'
          : existingAuthByEmailDto
            ? existingAuthByEmailDto.is_active
              ? 'existing_active'
              : 'existing_inactive'
            : 'none'

        return {
          ...dir,
          resolved_email: resolvedEmail,
          auth_linked: Boolean(dir.linked_user_id),
          account_status: effectiveAccountStatus,
          is_super_admin: linkedAuthDto?.is_super_admin ?? existingAuthByEmailDto?.is_super_admin ?? false,
          membership_role: linkedAuthDto?.membership_role ?? existingAuthByEmailDto?.membership_role ?? null,
          membership_division: linkedAuthDto?.membership_division ?? existingAuthByEmailDto?.membership_division ?? null,
          membership_status: linkedAuthDto?.membership_status ?? existingAuthByEmailDto?.membership_status ?? null,
          last_sign_in_at: linkedAuthDto?.last_sign_in_at ?? existingAuthByEmailDto?.last_sign_in_at ?? null,
          latest_invitation: latestInv
            ? {
                ...latestInv,
                effective_status: latestInvEffectiveStatus,
              }
            : null,
          invitation_history: memberInvitations.map((inv) => ({
            ...inv,
            effective_status:
              inv.status === 'pending' && new Date(inv.expires_at).getTime() <= nowMs
                ? 'expired'
                : inv.status,
          })),
          has_existing_auth_conflict: Boolean(!dir.linked_user_id && existingAuthByEmail),
          existing_auth_conflict_role: existingAuthByEmailDto?.membership_role ?? null,
          existing_auth_conflict_status: existingAuthByEmailDto?.membership_status ?? null,
          account_lifecycle_status: lifecycleStatus,
          action_reason: actionReason,
          historical_snapshot: memberSnapshot
            ? {
                id: memberSnapshot.id,
                deleted_at: memberSnapshot.deleted_at,
                deletion_reason: memberSnapshot.deletion_reason,
              }
            : null,
        }
      })
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        const rankDiff = (roleRank[a.role] ?? 99) - (roleRank[b.role] ?? 99)
        if (rankDiff !== 0) return rankDiff
        return a.full_name.localeCompare(b.full_name, 'id')
      })

    const activeSlots = directoryRoster.filter((d) => d.is_active)
    const directorySummary = {
      totalSlots: activeSlots.length,
      activeAccounts: activeSlots.filter((d) => d.account_lifecycle_status === 'aktif').length,
      pendingInvitations: activeSlots.filter(
        (d) =>
          d.account_lifecycle_status === 'undangan_terkirim' ||
          d.account_lifecycle_status === 'menunggu_aktivasi'
      ).length,
      readyToInvite: activeSlots.filter((d) => d.account_lifecycle_status === 'siap_diundang').length,
      unfilledEmails: activeSlots.filter((d) => d.account_lifecycle_status === 'belum_diisi').length,
      deletedAccounts: activeSlots.filter((d) => d.account_lifecycle_status === 'akun_dihapus').length,
      needsAttention: activeSlots.filter(
        (d) =>
          d.account_lifecycle_status === 'perlu_tindakan' ||
          d.account_lifecycle_status === 'undangan_kedaluwarsa' ||
          d.account_lifecycle_status === 'undangan_dibatalkan'
      ).length,
    }

    return jsonResponse({
      users: paginatedUsers,
      pagination: {
        page,
        perPage,
        total: totalFiltered,
        totalPages,
      },
      summary,
      invitations: enrichedInvitations,
      directoryRoster,
      directorySummary,
    })
  } catch (err: any) {
    const status = err?.status || 500
    const message = err?.message || 'Internal Server Error'
    return errorResponse(message, status)
  }
})

import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import type { KknRole, MembershipStatus, InvitationStatus } from '@/types/database'

export interface AdminUserDto {
  id: string
  email: string
  full_name: string
  is_super_admin: boolean
  is_active: boolean
  membership_role: KknRole | null
  membership_division: string | null
  membership_status: MembershipStatus | null
  invitation_status: InvitationStatus | null
  created_at: string
  last_sign_in_at: string | null
  directory_member_id?: string | null
  directory_member_name?: string | null
  is_linked_to_directory?: boolean
}

export interface AdminInvitationDto {
  id: string
  email: string
  role: KknRole
  division?: string | null
  status: InvitationStatus
  invited_by: string
  auth_user_id: string | null
  directory_member_id?: string | null
  directory_member_name?: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
  invitee_name: string | null
  inviter_name: string
  inviter_email: string | null
}

export type DirectoryAccountLifecycleStatus =
  | 'belum_diisi'
  | 'siap_diundang'
  | 'undangan_terkirim'
  | 'menunggu_aktivasi'
  | 'aktif'
  | 'undangan_kedaluwarsa'
  | 'undangan_dibatalkan'
  | 'perlu_tindakan'
  | 'akun_dihapus'

export interface DirectoryInvitationHistoryDto extends AdminInvitationDto {
  effective_status: InvitationStatus
}

export interface DirectoryRosterItemDto {
  id: string
  linked_user_id: string | null
  full_name: string
  identity_number: string
  university: string | null
  study_program: string
  academic_status: 'mahasiswa' | 'dosen'
  phone: string | null
  position_label: string
  role: KknRole
  division: string | null
  account_email: string | null
  resolved_email: string | null
  photo_file_id: string | null
  is_active: boolean
  created_at: string
  auth_linked: boolean
  account_status: 'active' | 'inactive' | 'existing_active' | 'existing_inactive' | 'none'
  is_super_admin: boolean
  membership_role: KknRole | null
  membership_division: string | null
  membership_status: MembershipStatus | null
  last_sign_in_at: string | null
  latest_invitation: DirectoryInvitationHistoryDto | null
  invitation_history: DirectoryInvitationHistoryDto[]
  has_existing_auth_conflict: boolean
  existing_auth_conflict_role: KknRole | null
  existing_auth_conflict_status: MembershipStatus | null
  account_lifecycle_status: DirectoryAccountLifecycleStatus
  action_reason: string | null
  historical_snapshot?: {
    id: string
    deleted_at: string
    deletion_reason: string | null
  } | null
}

export interface DirectoryRosterSummaryDto {
  totalSlots: number
  activeAccounts: number
  pendingInvitations: number
  readyToInvite: number
  unfilledEmails: number
  deletedAccounts?: number
  cleanedTestingAccounts?: number
  needsAttention: number
}

export interface AdminUsersResponse {
  users: AdminUserDto[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
  summary: {
    totalAuthUsers: number
    activeAccounts: number
    inactiveAccounts: number
    pendingInvitations: number
    activeMembers: number
  }
  invitations: AdminInvitationDto[]
  directoryRoster?: DirectoryRosterItemDto[]
  directorySummary?: DirectoryRosterSummaryDto
}

export interface ListUsersParams {
  page?: number
  perPage?: number
  search?: string
  role?: string
  accountStatus?: string
  membershipStatus?: string
}

export class EdgeFunctionError extends Error {
  status: number
  code?: string
  isNotDeployed: boolean
  payload?: Record<string, unknown> | null

  constructor(message: string, status: number, code?: string, payload?: Record<string, unknown> | null) {
    super(message)
    this.name = 'EdgeFunctionError'
    this.status = status
    this.code = code
    this.isNotDeployed = status === 404 && code === 'NOT_FOUND'
    this.payload = payload ?? null
  }
}

async function callEdgeFunction<T>(
  functionName: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>
): Promise<T> {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || !session?.access_token) {
    throw new EdgeFunctionError('Sesi autentikasi tidak ditemukan atau telah berakhir.', 401, 'UNAUTHORIZED')
  }

  const url = `${env.VITE_SUPABASE_URL}/functions/v1/${functionName}`

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const code = payload?.code
    let message = payload?.error || payload?.message || `Permintaan gagal (HTTP ${response.status})`

    if (response.status === 404 && code === 'NOT_FOUND') {
      message = `Edge Function '${functionName}' belum di-deploy ke Supabase Project (${env.VITE_SUPABASE_URL}).`
    }

    throw new EdgeFunctionError(message, response.status, code, payload)
  }

  return payload as T
}

export interface InviteUserResponse {
  success: boolean
  message: string
  delivery_method?: 'email' | 'manual_link'
  invite_link?: string
  invitation_id?: string
}

export const adminApi = {
  listUsers: (params: ListUsersParams = {}) =>
    callEdgeFunction<AdminUsersResponse>('admin-list-users', 'POST', params as Record<string, unknown>),

  inviteUser: (data: {
    full_name: string
    email: string
    role: KknRole
    division?: string | null
    note?: string
    directory_member_id?: string
    confirm_existing_account?: boolean
  }) => callEdgeFunction<InviteUserResponse>('admin-invite-user', 'POST', data),

  setDirectoryAccountEmail: (directoryMemberId: string, email: string | null) =>
    callEdgeFunction<{
      success: boolean
      account_email: string | null
      existing_auth_warning?: {
        email: string
        is_super_admin: boolean
        membership_role: KknRole | null
        membership_status: MembershipStatus | null
        linked_to_other_directory: string | null
      } | null
      message: string
    }>('admin-invite-user', 'POST', {
      action: 'set_directory_email',
      directory_member_id: directoryMemberId,
      email: email ?? '',
    }),

  resendInvitation: (invitationId: string) =>
    callEdgeFunction<InviteUserResponse>('admin-invite-user', 'POST', {
      isResend: true,
      invitation_id: invitationId,
    }),

  revokeInvitation: (invitationId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>('admin-revoke-invitation', 'POST', {
      invitation_id: invitationId,
    }),

  updateMembership: (data: {
    target_user_id: string
    action: 'change_role' | 'update_division' | 'suspend' | 'reactivate' | 'revoke_membership'
    role?: KknRole
    division?: string | null
  }) => callEdgeFunction<{ success: boolean; message: string }>('admin-update-membership', 'POST', data),

  verifyInvitation: () =>
    callEdgeFunction<{
      valid: boolean
      already_accepted: boolean
      invitation_id?: string
      directory_member_id?: string | null
      position_label?: string | null
      email: string
      role: KknRole
      division?: string | null
      full_name?: string
      expires_at?: string
    }>('admin-accept-invitation', 'GET'),

  acceptInvitation: (fullName?: string) =>
    callEdgeFunction<{
      success: boolean
      already_accepted?: boolean
      message: string
      role: KknRole
      directory_member_id?: string | null
    }>(
      'admin-accept-invitation',
      'POST',
      fullName ? { full_name: fullName } : {}
    ),

  deleteUserPermanently: (data: {
    target_user_id: string
    confirmed_email: string
    reason?: string
  }) =>
    callEdgeFunction<{
      success: boolean
      message: string
      target_user_id: string
      target_email: string
      directory_preserved: boolean
      directory_member_id: string | null
      snapshot_preserved: boolean
    }>('admin-delete-user', 'POST', data),
}

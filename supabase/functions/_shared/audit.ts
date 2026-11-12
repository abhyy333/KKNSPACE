import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AuditAction =
  | 'invite_created'
  | 'invite_resent'
  | 'invite_revoked'
  | 'invitation_accepted'
  | 'membership_role_changed'
  | 'membership_division_updated'
  | 'membership_revoked'
  | 'account_suspended'
  | 'account_reactivated'
  | 'signed_url_accessed'
  | 'directory_email_updated'
  | 'directory_profile_updated'
  | 'account_deletion_requested'
  | 'account_deleted_permanently'

export interface AuditLogInput {
  actorId: string
  actorEmail?: string | null
  actorAuthority?: string | null
  action: AuditAction
  tableName: string
  recordId: string
  oldValues?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

function sanitizeAuditJson(
  data?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!data) return null
  const safe = { ...data }
  delete safe.password
  delete safe.token
  delete safe.access_token
  delete safe.refresh_token
  delete safe.secret
  return safe
}

export async function recordAuditEvent(
  supabaseAdmin: SupabaseClient,
  input: AuditLogInput
): Promise<void> {
  let actorEmail = input.actorEmail ?? null
  let actorAuthority = input.actorAuthority ?? null

  if (!actorEmail || !actorAuthority) {
    const [userRes, adminRes] = await Promise.all([
      !actorEmail ? supabaseAdmin.auth.admin.getUserById(input.actorId) : Promise.resolve(null),
      !actorAuthority
        ? supabaseAdmin.from('system_admins').select('user_id').eq('user_id', input.actorId).maybeSingle()
        : Promise.resolve(null),
    ])
    if (userRes && 'data' in userRes && userRes.data?.user?.email) {
      actorEmail = userRes.data.user.email
    }
    if (!actorAuthority) {
      if (adminRes && 'data' in adminRes && adminRes.data) {
        actorAuthority = 'super_admin'
      } else {
        const { data: mem } = await supabaseAdmin
          .from('memberships')
          .select('role')
          .eq('user_id', input.actorId)
          .eq('status', 'active')
          .maybeSingle()
        actorAuthority = mem?.role ?? 'authenticated'
      }
    }
  }

  const { error } = await supabaseAdmin.from('audit_events').insert({
    actor_id: input.actorId,
    actor_email: actorEmail,
    actor_authority: actorAuthority,
    action: input.action,
    table_name: input.tableName,
    record_id: input.recordId,
    old_values: sanitizeAuditJson(input.oldValues),
    new_values: sanitizeAuditJson(input.metadata) ?? {},
  })

  if (error) {
    console.error('Audit log insert failed:', error.message)
  }
}

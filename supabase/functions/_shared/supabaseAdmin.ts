import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'

export const VALID_ROLES = ['ketua', 'sekretaris', 'bendahara', 'anggota', 'dpl'] as const
export type KknRole = (typeof VALID_ROLES)[number]

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireAuthenticatedUser(
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<User> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' }
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    throw { status: 401, message: 'Unauthorized: Empty bearer token.' }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt)
  if (error || !user) {
    throw { status: 401, message: 'Unauthorized: Invalid or expired session token.' }
  }

  return user
}

export async function requireSuperAdmin(req: Request): Promise<{
  caller: User
  supabaseAdmin: SupabaseClient
}> {
  const supabaseAdmin = getSupabaseAdmin()
  const caller = await requireAuthenticatedUser(req, supabaseAdmin)

  const { data: adminRecord, error: adminErr } = await supabaseAdmin
    .from('system_admins')
    .select('user_id')
    .eq('user_id', caller.id)
    .maybeSingle()

  if (adminErr) {
    throw { status: 500, message: 'Failed to verify administrator status.' }
  }

  if (!adminRecord) {
    throw { status: 403, message: 'Forbidden: Super Admin privileges required.' }
  }

  // Also ensure Super Admin profile is active
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_active')
    .eq('id', caller.id)
    .maybeSingle()

  if (profile && profile.is_active === false) {
    throw { status: 403, message: 'Forbidden: Administrator profile is deactivated.' }
  }

  return { caller, supabaseAdmin }
}

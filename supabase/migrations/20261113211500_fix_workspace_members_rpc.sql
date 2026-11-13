-- Migration: fix_workspace_members_rpc
-- Fixes get_workspace_members and get_workspace_members_details to exclude historical/deleted account snapshots

CREATE OR REPLACE FUNCTION public.get_workspace_members()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_file_id uuid,
  role text,
  status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: active KKN membership required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.full_name,
    u.email::text AS email,
    p.phone,
    p.avatar_file_id,
    m.role,
    m.status,
    m.joined_at
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.status = 'active'
    AND p.is_active = true
  ORDER BY
    CASE m.role
      WHEN 'ketua' THEN 1
      WHEN 'sekretaris' THEN 2
      WHEN 'bendahara' THEN 3
      WHEN 'dpl' THEN 4
      ELSE 5
    END,
    p.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_workspace_members_details()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_file_id uuid,
  role text,
  division text,
  status text,
  joined_at timestamptz,
  is_super_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: active KKN membership or Super Admin authority required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.full_name,
    u.email::text AS email,
    p.phone,
    p.avatar_file_id,
    m.role,
    m.division,
    m.status,
    m.joined_at,
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = p.id) AS is_super_admin
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.status = 'active'
    AND p.is_active = true
  ORDER BY
    CASE m.role
      WHEN 'ketua' THEN 1
      WHEN 'sekretaris' THEN 2
      WHEN 'bendahara' THEN 3
      WHEN 'dpl' THEN 4
      ELSE 5
    END,
    p.full_name ASC;
END;
$function$;

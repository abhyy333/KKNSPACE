-- Phase 3.1: DPL announcement management + safe active-members directory RPC

DROP POLICY IF EXISTS announcements_dpl_manage ON public.announcements;
CREATE POLICY announcements_dpl_manage
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    (SELECT app_private.has_kkn_role('dpl'))
    AND created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT app_private.has_kkn_role('dpl'))
    AND created_by = (SELECT auth.uid())
  );

CREATE INDEX IF NOT EXISTS calendar_events_start_end_idx
  ON public.calendar_events USING btree (start_at, end_at);

CREATE INDEX IF NOT EXISTS duty_shifts_date_time_idx
  ON public.duty_shifts USING btree (shift_date, start_time);

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

REVOKE ALL ON FUNCTION public.get_workspace_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_workspace_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_members() TO authenticated;

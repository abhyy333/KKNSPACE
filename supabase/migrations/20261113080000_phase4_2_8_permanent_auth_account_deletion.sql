-- PHASE 4.2.8 — PERMANENT AUTH ACCOUNT DELETION & MEMBER DATA PRESERVATION
-- Migration: 20261113080000_phase4_2_8_permanent_auth_account_deletion.sql

-- 1. HISTORICAL ACCOUNT SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.historical_account_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  directory_member_id uuid REFERENCES public.kkn_team_directory(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  division text,
  identity_number text,
  academic_status text,
  university text,
  phone text,
  avatar_file_id uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid,
  deletion_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historical_snapshots_user_id ON public.historical_account_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_dir_id ON public.historical_account_snapshots (directory_member_id);

ALTER TABLE public.historical_account_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historical_account_snapshots_select_auth" ON public.historical_account_snapshots;
CREATE POLICY "historical_account_snapshots_select_auth"
  ON public.historical_account_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.historical_account_snapshots TO authenticated;
GRANT ALL ON public.historical_account_snapshots TO service_role;

-- 2. ACCOUNT DEPROVISIONING OPERATIONS TABLE (STATE MACHINE TRACKER)
CREATE TABLE IF NOT EXISTS public.account_deprovisioning_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text NOT NULL,
  target_directory_id uuid REFERENCES public.kkn_team_directory(id) ON DELETE SET NULL,
  target_full_name text,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'auth_deleted', 'completed', 'finalization_pending', 'failed'
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deprovisioning_ops_target_uid ON public.account_deprovisioning_operations (target_user_id);
CREATE INDEX IF NOT EXISTS idx_deprovisioning_ops_status ON public.account_deprovisioning_operations (status);

ALTER TABLE public.account_deprovisioning_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deprovisioning_ops_super_admin" ON public.account_deprovisioning_operations;
CREATE POLICY "deprovisioning_ops_super_admin"
  ON public.account_deprovisioning_operations
  FOR ALL
  TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

GRANT SELECT, INSERT, UPDATE ON public.account_deprovisioning_operations TO authenticated;
GRANT ALL ON public.account_deprovisioning_operations TO service_role;

-- 3. WORKSPACE MEMBERS RPC UPDATES (UNION HISTORICAL SNAPSHOTS WITH 'deleted' STATUS)
CREATE OR REPLACE FUNCTION public.get_workspace_members()
 RETURNS TABLE(user_id uuid, full_name text, email text, phone text, avatar_file_id uuid, role text, status text, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: active KKN membership required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT combined.user_id, combined.full_name, combined.email, combined.phone, combined.avatar_file_id, combined.role, combined.status, combined.joined_at
  FROM (
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
    UNION ALL
    SELECT
      h.user_id,
      h.full_name,
      h.email,
      h.phone,
      h.avatar_file_id,
      h.role,
      'deleted'::text AS status,
      h.deleted_at AS joined_at
    FROM public.historical_account_snapshots h
  ) AS combined
  ORDER BY
    CASE combined.role
      WHEN 'ketua' THEN 1
      WHEN 'sekretaris' THEN 2
      WHEN 'bendahara' THEN 3
      WHEN 'dpl' THEN 4
      ELSE 5
    END,
    combined.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_workspace_members_details()
 RETURNS TABLE(user_id uuid, full_name text, email text, phone text, avatar_file_id uuid, role text, division text, status text, joined_at timestamp with time zone, is_super_admin boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Forbidden: active KKN membership or Super Admin authority required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT combined.user_id, combined.full_name, combined.email, combined.phone, combined.avatar_file_id, combined.role, combined.division, combined.status, combined.joined_at, combined.is_super_admin
  FROM (
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
    UNION ALL
    SELECT
      h.user_id,
      h.full_name,
      h.email,
      h.phone,
      h.avatar_file_id,
      h.role,
      h.division,
      'deleted'::text AS status,
      h.deleted_at AS joined_at,
      false AS is_super_admin
    FROM public.historical_account_snapshots h
  ) AS combined
  ORDER BY
    CASE combined.role
      WHEN 'ketua' THEN 1
      WHEN 'sekretaris' THEN 2
      WHEN 'bendahara' THEN 3
      WHEN 'dpl' THEN 4
      ELSE 5
    END,
    combined.full_name ASC;
END;
$function$;

-- 4. MEMBERSHIP & SYSTEM ADMIN FOREIGN KEY CASCADING
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.system_admins DROP CONSTRAINT IF EXISTS system_admins_user_id_fkey;
ALTER TABLE public.system_admins ADD CONSTRAINT system_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.system_admins ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.system_admins DROP CONSTRAINT IF EXISTS system_admins_created_by_fkey;
ALTER TABLE public.system_admins ADD CONSTRAINT system_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. INVITATIONS FOREIGN KEY ADJUSTMENTS
ALTER TABLE public.invitations ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_auth_user_id_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. DROP RESTRICTIVE FOREIGN KEYS ON ACTIVITY TABLES
-- This preserves all historical records in place with their original UUIDs intact,
-- preventing any cascade deletion or deletion-blocking RESTRICT errors.
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_author_id_fkey;
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_verified_by_fkey;
ALTER TABLE public.daily_log_reviews DROP CONSTRAINT IF EXISTS daily_log_reviews_reviewer_id_fkey;
ALTER TABLE public.daily_log_attachments DROP CONSTRAINT IF EXISTS daily_log_attachments_uploaded_by_fkey;
ALTER TABLE public.daily_log_participants DROP CONSTRAINT IF EXISTS daily_log_participants_user_id_fkey;
ALTER TABLE public.finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_recorded_by_fkey;
ALTER TABLE public.file_objects DROP CONSTRAINT IF EXISTS file_objects_uploaded_by_fkey;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_published_by_fkey;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_assigned_to_fkey;
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_uploaded_by_fkey;
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_published_by_fkey;
ALTER TABLE public.media_assets DROP CONSTRAINT IF EXISTS media_assets_assigned_to_fkey;
ALTER TABLE public.meeting_attendees DROP CONSTRAINT IF EXISTS meeting_attendees_user_id_fkey;
ALTER TABLE public.meeting_decisions DROP CONSTRAINT IF EXISTS meeting_decisions_responsible_user_id_fkey;
ALTER TABLE public.meeting_minutes DROP CONSTRAINT IF EXISTS meeting_minutes_author_id_fkey;
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_created_by_fkey;
ALTER TABLE public.program_activities DROP CONSTRAINT IF EXISTS program_activities_created_by_fkey;
ALTER TABLE public.program_assignments DROP CONSTRAINT IF EXISTS program_assignments_assigned_by_fkey;
ALTER TABLE public.program_assignments DROP CONSTRAINT IF EXISTS program_assignments_user_id_fkey;
ALTER TABLE public.report_reviews DROP CONSTRAINT IF EXISTS report_reviews_reviewer_id_fkey;
ALTER TABLE public.report_versions DROP CONSTRAINT IF EXISTS report_versions_submitted_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_created_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_submitted_by_fkey;
ALTER TABLE public.survey_assignments DROP CONSTRAINT IF EXISTS survey_assignments_assigned_by_fkey;
ALTER TABLE public.survey_assignments DROP CONSTRAINT IF EXISTS survey_assignments_user_id_fkey;
ALTER TABLE public.survey_forms DROP CONSTRAINT IF EXISTS survey_forms_created_by_fkey;
ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_submitted_by_fkey;
ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_assigned_by_fkey;
ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.work_programs DROP CONSTRAINT IF EXISTS work_programs_created_by_fkey;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_published_by_fkey;
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
ALTER TABLE public.duty_shifts DROP CONSTRAINT IF EXISTS duty_shifts_assigned_user_id_fkey;
ALTER TABLE public.duty_shifts DROP CONSTRAINT IF EXISTS duty_shifts_created_by_fkey;
ALTER TABLE public.group_settings DROP CONSTRAINT IF EXISTS group_settings_updated_by_fkey;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_created_by_fkey;
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_user_id_fkey;
ALTER TABLE public.village_profile DROP CONSTRAINT IF EXISTS village_profile_updated_by_fkey;

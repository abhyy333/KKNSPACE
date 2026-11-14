-- =============================================================================
-- Migration: System Maintenance Configuration & Branded Recovery System
-- Description: Creates system_maintenance_config table, RLS policies, update_maintenance_config RPC, and audit logging
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_maintenance_config (
  id text PRIMARY KEY DEFAULT 'active_config' CHECK (id = 'active_config'),
  is_enabled boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'public', 'workspace')),
  title text NOT NULL DEFAULT 'Kami Sedang Mempersiapkan Pengalaman yang Lebih Baik',
  message text NOT NULL DEFAULT 'KKN SPACE sedang menjalani pemeliharaan dan pembaruan sistem. Kami akan kembali setelah proses selesai. Terima kasih atas pengertian Anda.',
  work_description text DEFAULT 'Pembaruan infrastruktur dan optimalisasi performa platform KKN SPACE.',
  start_time timestamptz DEFAULT now(),
  estimated_end_time timestamptz,
  additional_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_name text
);

-- Seed active row if not already present
INSERT INTO public.system_maintenance_config (
  id,
  is_enabled,
  scope,
  title,
  message,
  work_description,
  start_time,
  updated_at
) VALUES (
  'active_config',
  false,
  'all',
  'Kami Sedang Mempersiapkan Pengalaman yang Lebih Baik',
  'KKN SPACE sedang menjalani pemeliharaan dan pembaruan sistem. Kami akan kembali setelah proses selesai. Terima kasih atas pengertian Anda.',
  'Pembaruan infrastruktur dan optimalisasi performa platform KKN SPACE.',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_maintenance_config ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (anon & authenticated) can view active maintenance config
DROP POLICY IF EXISTS "Public can view active maintenance config" ON public.system_maintenance_config;
CREATE POLICY "Public can view active maintenance config"
  ON public.system_maintenance_config
  FOR SELECT
  TO public
  USING (true);

-- 2. Only Super Admin can directly update
DROP POLICY IF EXISTS "Super Admin can update maintenance config" ON public.system_maintenance_config;
CREATE POLICY "Super Admin can update maintenance config"
  ON public.system_maintenance_config
  FOR UPDATE
  TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

-- 3. Dedicated secure RPC for updating maintenance mode and writing audit logs
CREATE OR REPLACE FUNCTION public.update_maintenance_config(
  p_is_enabled boolean,
  p_scope text,
  p_title text,
  p_message text,
  p_work_description text DEFAULT NULL,
  p_start_time timestamptz DEFAULT NULL,
  p_estimated_end_time timestamptz DEFAULT NULL,
  p_additional_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_old_row record;
  v_new_row record;
  v_action text;
BEGIN
  -- Verify calling user is authenticated and is a verified Super Admin
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Administrator yang berhak mengubah status pemeliharaan sistem.';
  END IF;

  -- Validate scope
  IF p_scope NOT IN ('all', 'public', 'workspace') THEN
    RAISE EXCEPTION 'Cakupan pemeliharaan tidak valid. Gunakan all, public, atau workspace.';
  END IF;

  -- Get user identity
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NULL OR v_user_name = '' THEN
    v_user_name := COALESCE(v_user_email, 'Super Admin');
  END IF;

  -- Capture previous configuration
  SELECT * INTO v_old_row FROM public.system_maintenance_config WHERE id = 'active_config';

  -- Categorize audit action
  IF v_old_row.is_enabled IS DISTINCT FROM p_is_enabled THEN
    IF p_is_enabled THEN
      v_action := 'MAINTENANCE_ACTIVATED';
    ELSE
      v_action := 'MAINTENANCE_DEACTIVATED';
    END IF;
  ELSE
    v_action := 'MAINTENANCE_CONFIG_UPDATED';
  END IF;

  -- Perform update
  UPDATE public.system_maintenance_config
  SET
    is_enabled = p_is_enabled,
    scope = p_scope,
    title = COALESCE(NULLIF(trim(p_title), ''), 'Kami Sedang Mempersiapkan Pengalaman yang Lebih Baik'),
    message = COALESCE(NULLIF(trim(p_message), ''), 'KKN SPACE sedang menjalani pemeliharaan dan pembaruan sistem.'),
    work_description = p_work_description,
    start_time = COALESCE(p_start_time, now()),
    estimated_end_time = p_estimated_end_time,
    additional_notes = p_additional_notes,
    updated_at = now(),
    updated_by = v_user_id,
    updated_by_name = v_user_name
  WHERE id = 'active_config'
  RETURNING * INTO v_new_row;

  -- Log into audit_events
  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_user_id,
    v_user_email,
    'super_admin',
    v_action,
    'system_maintenance_config',
    'active_config',
    to_jsonb(v_old_row),
    to_jsonb(v_new_row),
    now()
  );

  RETURN to_jsonb(v_new_row);
END;
$$;

-- Grant execution to authenticated role
GRANT EXECUTE ON FUNCTION public.update_maintenance_config TO authenticated;

COMMIT;

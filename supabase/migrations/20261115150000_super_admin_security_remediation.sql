-- Migration: 20261115150000_super_admin_security_remediation.sql
-- Description: Strict remediation of Super Admin privileges.
-- Ensures only two designated accounts (Owner and Antigravity Tester) can possess Super Admin authority.
-- Implements database-level trigger protection preventing unauthorized insertion, mutation, or deletion of system_admins.

-- 1. Ensure function to revoke unauthorized Super Admins
CREATE OR REPLACE FUNCTION app_private.revoke_unauthorized_super_admins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  -- Remove any system_admins row other than the designated owner and tester
  DELETE FROM public.system_admins
  WHERE user_id NOT IN (
    '6e04784d-4df5-401b-b247-0e3a8044d0d0'::uuid, -- abhyy333@gmail.com (Owner)
    'e0000000-0000-0000-0000-000000000001'::uuid  -- test.lead@kknspace.local (Antigravity Tester)
  );
END;
$$;

SELECT app_private.revoke_unauthorized_super_admins();

-- 2. Trigger function to protect system_admins from unauthorized mutations
CREATE OR REPLACE FUNCTION app_private.protect_system_admins_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_caller uuid;
  v_admin_count integer;
  v_allowed_user_ids uuid[];
BEGIN
  v_caller := auth.uid();
  
  -- The strictly authorized Super Admin user IDs:
  -- 1) abhyy333@gmail.com
  -- 2) test.lead@kknspace.local
  v_allowed_user_ids := ARRAY[
    '6e04784d-4df5-401b-b247-0e3a8044d0d0'::uuid,
    'e0000000-0000-0000-0000-000000000001'::uuid
  ];

  IF TG_OP = 'INSERT' THEN
    -- Prevent inserting any user not in the strictly authorized policy list
    IF NOT (NEW.user_id = ANY(v_allowed_user_ids)) THEN
      RAISE EXCEPTION 'Akses ditolak: Pemberian hak akses Super Admin pada akun ini tidak diizinkan oleh kebijakan sistem.';
    END IF;

    -- Only an existing Super Admin or service role can insert
    IF v_caller IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = v_caller) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin sah yang dapat menambahkan administrator sistem.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Operasi UPDATE tidak diizinkan pada tabel system_admins.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check caller authority
    IF v_caller IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = v_caller) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin sah yang dapat menghapus administrator sistem.';
    END IF;

    -- Last Super Admin protection
    SELECT count(*) INTO v_admin_count FROM public.system_admins;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Akses ditolak: Tidak dapat menghapus Super Admin terakhir (Last-Super-Admin Protection).';
    END IF;

    -- Protect primary owner account from being revoked
    IF OLD.user_id = '6e04784d-4df5-401b-b247-0e3a8044d0d0'::uuid THEN
      RAISE EXCEPTION 'Akses ditolak: Akun pemilik utama sistem (Owner) tidak dapat dicabut hak Super Admin-nya.';
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Attach trigger to public.system_admins
CREATE OR REPLACE TRIGGER trg_protect_system_admins_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.system_admins
FOR EACH ROW EXECUTE FUNCTION app_private.protect_system_admins_mutation();

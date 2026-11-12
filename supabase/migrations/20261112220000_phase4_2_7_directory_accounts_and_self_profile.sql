-- Phase 4.2.7: Public Team Directory Expansion, 11-Member Account Provisioning & Self-Service Profile
-- Non-destructive & idempotent migration. Preserves all 11 kkn_team_directory records and existing Auth accounts.

-- 1. Extend kkn_team_directory with nullable university and account_email
ALTER TABLE public.kkn_team_directory
  ADD COLUMN IF NOT EXISTS university text NULL,
  ADD COLUMN IF NOT EXISTS account_email text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.kkn_team_directory'::regclass
      AND conname = 'kkn_team_directory_university_check'
  ) THEN
    ALTER TABLE public.kkn_team_directory
      ADD CONSTRAINT kkn_team_directory_university_check
      CHECK (university IS NULL OR (char_length(btrim(university)) BETWEEN 2 AND 150));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.kkn_team_directory'::regclass
      AND conname = 'kkn_team_directory_account_email_check'
  ) THEN
    ALTER TABLE public.kkn_team_directory
      ADD CONSTRAINT kkn_team_directory_account_email_check
      CHECK (
        account_email IS NULL
        OR (
          account_email = lower(btrim(account_email))
          AND account_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS kkn_team_directory_account_email_uidx
  ON public.kkn_team_directory (account_email)
  WHERE account_email IS NOT NULL;

-- 2. Extend app_private.prepare_kkn_team_directory() to normalize university and account_email
CREATE OR REPLACE FUNCTION app_private.prepare_kkn_team_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_file_path text;
BEGIN
  NEW.full_name := btrim(NEW.full_name);
  NEW.identity_number := btrim(NEW.identity_number);
  NEW.university := nullif(btrim(NEW.university), '');
  NEW.study_program := btrim(NEW.study_program);
  NEW.academic_status := lower(btrim(NEW.academic_status));
  NEW.phone := nullif(btrim(NEW.phone), '');
  NEW.position_label := btrim(NEW.position_label);
  NEW.role := lower(btrim(NEW.role));
  NEW.division := nullif(btrim(NEW.division), '');
  NEW.account_email := nullif(lower(btrim(NEW.account_email)), '');
  NEW.photo_path := nullif(btrim(NEW.photo_path), '');

  IF NEW.photo_file_id IS NOT NULL THEN
    SELECT fo.object_path
    INTO v_file_path
    FROM public.file_objects fo
    WHERE fo.id = NEW.photo_file_id
      AND fo.bucket_id = 'kkn-private';

    IF v_file_path IS NULL THEN
      RAISE EXCEPTION 'Photo file reference not found in kkn-private bucket.'
        USING ERRCODE = '23503';
    END IF;

    NEW.photo_path := v_file_path;
  ELSIF TG_OP = 'UPDATE' AND OLD.photo_file_id IS NOT NULL AND NEW.photo_file_id IS NULL THEN
    NEW.photo_path := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
  ELSE
    NEW.created_at := coalesce(NEW.created_at, now());
    NEW.updated_at := coalesce(NEW.updated_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Sync existing linked directory row's account_email from auth.users (Abdul Habir -> abhyy333@gmail.com only)
UPDATE public.kkn_team_directory d
SET account_email = lower(btrim(u.email))
FROM auth.users u
WHERE d.linked_user_id = u.id
  AND d.account_email IS NULL
  AND u.email IS NOT NULL;

-- 4. Link invitations -> kkn_team_directory and prevent duplicate active pending invitations per directory slot
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS directory_member_id uuid NULL REFERENCES public.kkn_team_directory(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS invitations_directory_member_idx
  ON public.invitations (directory_member_id, created_at DESC)
  WHERE directory_member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_active_pending_directory_uidx
  ON public.invitations (directory_member_id)
  WHERE directory_member_id IS NOT NULL AND status = 'pending';

-- 5. Public-safe directory RPC including university (never exposes NIM, phone, email, linked_user_id, or private paths)
CREATE OR REPLACE FUNCTION public.get_public_team_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  university text,
  study_program text,
  academic_status text,
  position_label text,
  role text,
  division text,
  has_photo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    d.id,
    d.full_name,
    d.university,
    d.study_program,
    d.academic_status,
    d.position_label,
    d.role,
    d.division,
    (d.photo_file_id IS NOT NULL) AS has_photo
  FROM public.kkn_team_directory AS d
  WHERE d.is_active = true
  ORDER BY
    CASE d.role
      WHEN 'dpl' THEN 1
      WHEN 'ketua' THEN 2
      WHEN 'sekretaris' THEN 3
      WHEN 'bendahara' THEN 4
      ELSE 5
    END,
    d.full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_team_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_team_profiles() TO anon, authenticated, service_role;

-- 6. Self-service profile read RPC (strictly scoped to auth.uid())
CREATE OR REPLACE FUNCTION public.get_own_directory_profile()
RETURNS TABLE (
  id uuid,
  linked_user_id uuid,
  full_name text,
  identity_number text,
  university text,
  study_program text,
  academic_status text,
  phone text,
  position_label text,
  role text,
  division text,
  account_email text,
  photo_file_id uuid,
  photo_path text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  auth_email text,
  membership_role text,
  membership_division text,
  membership_status text,
  is_super_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.linked_user_id,
    d.full_name,
    d.identity_number,
    d.university,
    d.study_program,
    d.academic_status,
    d.phone,
    d.position_label,
    d.role,
    d.division,
    d.account_email,
    d.photo_file_id,
    d.photo_path,
    d.is_active,
    d.created_at,
    d.updated_at,
    u.email::text AS auth_email,
    m.role AS membership_role,
    m.division AS membership_division,
    m.status AS membership_status,
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = v_uid) AS is_super_admin
  FROM public.kkn_team_directory d
  JOIN auth.users u ON u.id = v_uid
  LEFT JOIN public.memberships m ON m.user_id = v_uid
  WHERE d.linked_user_id = v_uid
    AND d.is_active = true
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_directory_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_directory_profile() TO authenticated, service_role;

-- 7. Self-service profile update RPC (strictly scoped to linked_user_id = auth.uid() with field whitelist)
CREATE OR REPLACE FUNCTION public.update_own_directory_profile(
  p_full_name text,
  p_identity_number text,
  p_university text DEFAULT NULL,
  p_study_program text DEFAULT NULL,
  p_photo_action text DEFAULT 'keep',
  p_photo_file_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  linked_user_id uuid,
  full_name text,
  identity_number text,
  university text,
  study_program text,
  academic_status text,
  phone text,
  position_label text,
  role text,
  division text,
  account_email text,
  photo_file_id uuid,
  photo_path text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_profile_active boolean;
  v_dir public.kkn_team_directory%ROWTYPE;
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_identity text := btrim(coalesce(p_identity_number, ''));
  v_university text := nullif(btrim(p_university), '');
  v_study_program text := btrim(coalesce(p_study_program, ''));
  v_photo_action text := lower(btrim(coalesce(p_photo_action, 'keep')));
  v_file_rec public.file_objects%ROWTYPE;
  v_next_photo_file_id uuid;
  v_next_photo_path text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk memperbarui profil.' USING ERRCODE = '42501';
  END IF;

  SELECT p.is_active
  INTO v_profile_active
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_profile_active IS FALSE THEN
    RAISE EXCEPTION 'Akun profil Anda sedang dinonaktifkan.' USING ERRCODE = '42501';
  END IF;

  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Hanya anggota aktif KKN atau Super Admin yang dapat memperbarui profil.' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_dir
  FROM public.kkn_team_directory d
  WHERE d.linked_user_id = v_uid
    AND d.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Akun Anda belum terhubung dengan record anggota pada direktori tim KKN.' USING ERRCODE = 'P0002';
  END IF;

  IF char_length(v_full_name) < 2 OR char_length(v_full_name) > 120 THEN
    RAISE EXCEPTION 'Nama lengkap harus antara 2 hingga 120 karakter.' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_identity) < 3 OR char_length(v_identity) > 40 THEN
    RAISE EXCEPTION 'NIM / NIP / ID harus antara 3 hingga 40 karakter.' USING ERRCODE = '22023';
  END IF;

  IF v_university IS NOT NULL AND (char_length(v_university) < 2 OR char_length(v_university) > 150) THEN
    RAISE EXCEPTION 'Nama universitas harus antara 2 hingga 150 karakter atau dikosongkan.' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_study_program) < 2 OR char_length(v_study_program) > 120 THEN
    RAISE EXCEPTION 'Program studi harus antara 2 hingga 120 karakter.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.kkn_team_directory other
    WHERE other.id <> v_dir.id
      AND lower(btrim(other.identity_number)) = lower(v_identity)
  ) THEN
    RAISE EXCEPTION 'NIM / NIP / ID tersebut sudah digunakan oleh anggota lain.' USING ERRCODE = '23505';
  END IF;

  IF v_photo_action NOT IN ('keep', 'replace', 'remove') THEN
    RAISE EXCEPTION 'Aksi foto tidak valid.' USING ERRCODE = '22023';
  END IF;

  IF v_photo_action = 'keep' THEN
    v_next_photo_file_id := v_dir.photo_file_id;
    v_next_photo_path := v_dir.photo_path;
  ELSIF v_photo_action = 'remove' THEN
    v_next_photo_file_id := NULL;
    v_next_photo_path := NULL;
  ELSE
    IF p_photo_file_id IS NULL THEN
      RAISE EXCEPTION 'Referensi file foto baru wajib diisi.' USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO v_file_rec
    FROM public.file_objects fo
    WHERE fo.id = p_photo_file_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Metadata foto tidak ditemukan.' USING ERRCODE = '23503';
    END IF;

    IF v_file_rec.bucket_id <> 'kkn-private' THEN
      RAISE EXCEPTION 'Bucket foto tidak valid.' USING ERRCODE = '42501';
    END IF;

    IF v_file_rec.uploaded_by <> v_uid OR left(v_file_rec.object_path, 37) <> (v_uid::text || '/') THEN
      RAISE EXCEPTION 'Anda hanya dapat menautkan foto yang Anda unggah sendiri.' USING ERRCODE = '42501';
    END IF;

    IF v_file_rec.mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'Format foto profil harus JPG, PNG, atau WEBP.' USING ERRCODE = '22023';
    END IF;

    IF v_file_rec.file_size <= 0 OR v_file_rec.file_size > 2097152 THEN
      RAISE EXCEPTION 'Ukuran foto profil maksimal 2 MB.' USING ERRCODE = '22023';
    END IF;

    v_next_photo_file_id := v_file_rec.id;
    v_next_photo_path := v_file_rec.object_path;
  END IF;

  UPDATE public.kkn_team_directory d
  SET
    full_name = v_full_name,
    identity_number = v_identity,
    university = v_university,
    study_program = v_study_program,
    photo_file_id = v_next_photo_file_id,
    photo_path = v_next_photo_path
  WHERE d.id = v_dir.id
    AND d.linked_user_id = v_uid
  RETURNING
    d.id,
    d.linked_user_id,
    d.full_name,
    d.identity_number,
    d.university,
    d.study_program,
    d.academic_status,
    d.phone,
    d.position_label,
    d.role,
    d.division,
    d.account_email,
    d.photo_file_id,
    d.photo_path,
    d.is_active,
    d.created_at,
    d.updated_at
  INTO
    id,
    linked_user_id,
    full_name,
    identity_number,
    university,
    study_program,
    academic_status,
    phone,
    position_label,
    role,
    division,
    account_email,
    photo_file_id,
    photo_path,
    is_active,
    created_at,
    updated_at;

  UPDATE public.profiles p
  SET
    full_name = v_full_name,
    avatar_file_id = v_next_photo_file_id,
    updated_at = now()
  WHERE p.id = v_uid
    AND (
      p.full_name IS DISTINCT FROM v_full_name
      OR p.avatar_file_id IS DISTINCT FROM v_next_photo_file_id
    );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_directory_profile(text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_directory_profile(text, text, text, text, text, uuid) TO authenticated, service_role;

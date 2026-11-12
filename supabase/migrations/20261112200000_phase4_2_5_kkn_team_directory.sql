-- Phase 4.2.5: KKN Team Directory Data Initialization
-- Creates public.kkn_team_directory with strict RLS, audit triggers,
-- safe photo storage linkage, and idempotent seeding for all 11 team members.

CREATE TABLE IF NOT EXISTS public.kkn_team_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) >= 2),
  identity_number text NOT NULL CHECK (char_length(btrim(identity_number)) >= 3),
  study_program text NOT NULL CHECK (char_length(btrim(study_program)) >= 2),
  academic_status text NOT NULL CHECK (academic_status IN ('mahasiswa', 'dosen')),
  phone text NULL CHECK (phone IS NULL OR char_length(btrim(phone)) >= 6),
  position_label text NOT NULL CHECK (char_length(btrim(position_label)) >= 2),
  role text NOT NULL CHECK (role IN ('ketua', 'sekretaris', 'bendahara', 'anggota', 'dpl')),
  division text NULL,
  photo_file_id uuid NULL REFERENCES public.file_objects(id) ON DELETE SET NULL,
  photo_path text NULL CHECK (
    photo_path IS NULL OR (
      char_length(btrim(photo_path)) > 0
      AND photo_path = btrim(photo_path)
      AND left(photo_path, 1) <> '/'
      AND strpos(photo_path, '..') = 0
      AND strpos(photo_path, '//') = 0
    )
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kkn_team_directory_identity_number_key UNIQUE (identity_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS kkn_team_directory_linked_user_uidx
  ON public.kkn_team_directory (linked_user_id)
  WHERE linked_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS kkn_team_directory_role_active_idx
  ON public.kkn_team_directory (is_active, role, full_name);

CREATE INDEX IF NOT EXISTS kkn_team_directory_photo_file_idx
  ON public.kkn_team_directory (photo_file_id)
  WHERE photo_file_id IS NOT NULL;

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
  NEW.study_program := btrim(NEW.study_program);
  NEW.academic_status := lower(btrim(NEW.academic_status));
  NEW.phone := nullif(btrim(NEW.phone), '');
  NEW.position_label := btrim(NEW.position_label);
  NEW.role := lower(btrim(NEW.role));
  NEW.division := nullif(btrim(NEW.division), '');
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.kkn_team_directory'::regclass
      AND tgname = 'prepare_kkn_team_directory_before_write'
  ) THEN
    CREATE TRIGGER prepare_kkn_team_directory_before_write
      BEFORE INSERT OR UPDATE ON public.kkn_team_directory
      FOR EACH ROW
      EXECUTE FUNCTION app_private.prepare_kkn_team_directory();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.kkn_team_directory'::regclass
      AND tgname = 'audit_kkn_team_directory'
  ) THEN
    CREATE TRIGGER audit_kkn_team_directory
      AFTER INSERT OR UPDATE OR DELETE ON public.kkn_team_directory
      FOR EACH ROW
      EXECUTE FUNCTION app_private.write_audit_event();
  END IF;
END $$;

ALTER TABLE public.kkn_team_directory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.kkn_team_directory FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kkn_team_directory TO authenticated;
GRANT ALL ON TABLE public.kkn_team_directory TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kkn_team_directory'
      AND policyname = 'kkn_team_directory_super_admin_all'
  ) THEN
    CREATE POLICY kkn_team_directory_super_admin_all
      ON public.kkn_team_directory
      FOR ALL
      TO authenticated
      USING ((SELECT app_private.is_super_admin()))
      WITH CHECK ((SELECT app_private.is_super_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kkn_team_directory'
      AND policyname = 'kkn_team_directory_read_active_members'
  ) THEN
    CREATE POLICY kkn_team_directory_read_active_members
      ON public.kkn_team_directory
      FOR SELECT
      TO authenticated
      USING (
        is_active = true
        AND (SELECT app_private.is_active_member())
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.is_active = true
        )
      );
  END IF;
END $$;

DO $$
DECLARE
  v_abdul_habir_uid uuid;
  v_abdul_habir_division text;
BEGIN
  SELECT u.id, COALESCE(NULLIF(btrim(m.division), ''), 'Acara')
  INTO v_abdul_habir_uid, v_abdul_habir_division
  FROM auth.users u
  LEFT JOIN public.memberships m ON m.user_id = u.id AND m.status = 'active'
  WHERE lower(u.email) = 'abhyy333@gmail.com'
  LIMIT 1;

  IF v_abdul_habir_uid IS NULL THEN
    RAISE EXCEPTION 'Required Auth user abhyy333@gmail.com not found for Abdul Habir Al Majdi linking.';
  END IF;

  INSERT INTO public.kkn_team_directory (
    linked_user_id,
    full_name,
    identity_number,
    study_program,
    academic_status,
    phone,
    position_label,
    role,
    division,
    photo_file_id,
    photo_path,
    is_active
  )
  VALUES
    (NULL, 'Dini Aminarti', 'B1D02310013', 'S1 Peternakan', 'mahasiswa', '081946915626', 'Sekretaris', 'sekretaris', NULL, NULL, NULL, true),
    (NULL, 'Lalu Muhammad Aby Dujana, M.Si.', '198910222024061001', 'S1 Ilmu Lingkungan', 'dosen', '081973202424', 'Pembimbing', 'dpl', NULL, NULL, NULL, true),
    (NULL, 'Josua Ujung', 'C1N02310035', 'S1 Ilmu Kelautan', 'mahasiswa', '082283846064', 'Ketua', 'ketua', NULL, NULL, NULL, true),
    (NULL, 'Tsaniatul Amni Alwan', 'C1K02310018', 'S1 Budidaya Perairan', 'mahasiswa', '087753911334', 'Bendahara', 'bendahara', NULL, NULL, NULL, true),
    (NULL, 'Zidane Ath Thoriq', 'D1A02310472', 'S1 Ilmu Hukum', 'mahasiswa', '082339607252', 'Anggota', 'anggota', NULL, NULL, NULL, true),
    (v_abdul_habir_uid, 'Abdul Habir Al Majdi', 'F1B02310096', 'S1 Teknik Elektro', 'mahasiswa', '085337262481', 'Anggota', 'anggota', v_abdul_habir_division, NULL, NULL, true),
    (NULL, 'Muhammad Agits Haibatulloh', 'F1E02310087', 'S1 Arsitektur', 'mahasiswa', '087819452300', 'Anggota', 'anggota', NULL, NULL, NULL, true),
    (NULL, 'Putu Sri Astiningsih', 'E1R02310086', 'S1 Pendidikan Matematika', 'mahasiswa', '085238310942', 'Anggota', 'anggota', NULL, NULL, NULL, true),
    (NULL, 'Mulia Oktaviani', 'E1S02310066', 'S1 Pendidikan Sosiologi', 'mahasiswa', '081938523792', 'Anggota', 'anggota', NULL, NULL, NULL, true),
    (NULL, 'Asma Nadiya', 'E1C02310145', 'S1 Pendidikan Bahasa Dan Sastra Indonesia', 'mahasiswa', '087881868604', 'Anggota', 'anggota', NULL, NULL, NULL, true),
    (NULL, 'Nurul Ainun', 'J1B02310118', 'S1 Teknik Pertanian', 'mahasiswa', '081239625103', 'Anggota', 'anggota', NULL, NULL, NULL, true)
  ON CONFLICT (identity_number) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    study_program = EXCLUDED.study_program,
    academic_status = EXCLUDED.academic_status,
    phone = EXCLUDED.phone,
    position_label = EXCLUDED.position_label,
    role = EXCLUDED.role,
    linked_user_id = COALESCE(public.kkn_team_directory.linked_user_id, EXCLUDED.linked_user_id),
    division = COALESCE(public.kkn_team_directory.division, EXCLUDED.division);
END $$;

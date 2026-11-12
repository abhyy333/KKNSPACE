-- Phase 4.2.4: Super Admin Full System Authority & Dual-Role Identity
-- 1) Adds optional `division` column to `memberships` and `invitations`
-- 2) Provisions Dual-Role Identity for `abhyy333@gmail.com` (`system_admins` + active membership `anggota`, division `Acara`)
-- 3) Adds `actor_email` & `actor_authority` to `audit_events` + `reviewer_authority` to `daily_log_reviews` & `report_reviews`
-- 4) Grants Super Admin full operational & override authority across logbook, reviews, reports, team summary, and storage without breaking regular-user role boundaries

BEGIN;

-- =============================================================================
-- 1. Schema Extensions (Non-Destructive & Idempotent)
-- =============================================================================

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS division text;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS division text;

ALTER TABLE public.daily_log_reviews
  ADD COLUMN IF NOT EXISTS reviewer_authority text NOT NULL DEFAULT 'dpl';

ALTER TABLE public.daily_log_reviews
  DROP CONSTRAINT IF EXISTS daily_log_reviews_reviewer_authority_check;
ALTER TABLE public.daily_log_reviews
  ADD CONSTRAINT daily_log_reviews_reviewer_authority_check
  CHECK (reviewer_authority IN ('dpl', 'super_admin'));

ALTER TABLE public.report_reviews
  ADD COLUMN IF NOT EXISTS reviewer_authority text NOT NULL DEFAULT 'dpl';

ALTER TABLE public.report_reviews
  DROP CONSTRAINT IF EXISTS report_reviews_reviewer_authority_check;
ALTER TABLE public.report_reviews
  ADD CONSTRAINT report_reviews_reviewer_authority_check
  CHECK (reviewer_authority IN ('dpl', 'super_admin'));

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS actor_email text;

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS actor_authority text;

-- =============================================================================
-- 2. Enrich Audit Trail (`app_private.write_audit_event`)
-- =============================================================================

CREATE OR REPLACE FUNCTION app_private.write_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_actor_authority text;
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_sensitive_keys text[] := ARRAY['password', 'token', 'access_token', 'refresh_token', 'secret', 'service_role_key'];
BEGIN
  v_actor_id := (SELECT auth.uid());

  IF v_actor_id IS NOT NULL THEN
    SELECT u.email::text
    INTO v_actor_email
    FROM auth.users u
    WHERE u.id = v_actor_id;

    IF EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = v_actor_id) THEN
      v_actor_authority := 'super_admin';
    ELSE
      SELECT m.role
      INTO v_actor_authority
      FROM public.memberships m
      WHERE m.user_id = v_actor_id AND m.status = 'active'
      LIMIT 1;
      v_actor_authority := coalesce(v_actor_authority, 'authenticated');
    END IF;
  ELSIF coalesce((SELECT auth.role()), '') = 'service_role' THEN
    v_actor_authority := 'service_role';
  ELSE
    v_actor_authority := 'system';
  END IF;

  IF tg_op = 'INSERT' THEN
    v_new := to_jsonb(new) - v_sensitive_keys;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'user_id', v_new ->> 'meeting_id');
  ELSIF tg_op = 'UPDATE' THEN
    v_old := to_jsonb(old) - v_sensitive_keys;
    v_new := to_jsonb(new) - v_sensitive_keys;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'user_id', v_new ->> 'meeting_id');
  ELSE
    v_old := to_jsonb(old) - v_sensitive_keys;
    v_id := coalesce(v_old ->> 'id', v_old ->> 'user_id', v_old ->> 'meeting_id');
  END IF;

  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  )
  VALUES (
    v_actor_id,
    v_actor_email,
    v_actor_authority,
    lower(tg_op),
    tg_table_name,
    v_id,
    v_old,
    v_new
  );

  IF tg_op = 'DELETE' THEN
    RETURN old;
  ELSE
    RETURN new;
  END IF;
END;
$function$;

-- =============================================================================
-- 3. Provision Dual-Role Identity ONLY for abhyy333@gmail.com
-- =============================================================================

DO $$
DECLARE
  v_sa_uid uuid;
  v_existing_mem public.memberships%ROWTYPE;
BEGIN
  SELECT u.id
  INTO v_sa_uid
  FROM auth.users u
  WHERE lower(u.email) = 'abhyy333@gmail.com'
  LIMIT 1;

  IF v_sa_uid IS NULL THEN
    RAISE EXCEPTION 'Target Super Admin account abhyy333@gmail.com not found in auth.users.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = v_sa_uid) THEN
    RAISE EXCEPTION 'Target account abhyy333@gmail.com must already exist in public.system_admins.';
  END IF;

  SELECT *
  INTO v_existing_mem
  FROM public.memberships m
  WHERE m.user_id = v_sa_uid;

  IF NOT FOUND THEN
    INSERT INTO public.memberships (user_id, role, division, status, joined_at)
    VALUES (v_sa_uid, 'anggota', 'Acara', 'active', now());
  ELSE
    UPDATE public.memberships
    SET role = 'anggota',
        division = 'Acara',
        status = 'active',
        joined_at = coalesce(joined_at, now()),
        updated_at = now()
    WHERE user_id = v_sa_uid;
  END IF;

  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  )
  VALUES (
    v_sa_uid,
    'abhyy333@gmail.com',
    'super_admin',
    'dual_role_identity_configured',
    'memberships',
    v_sa_uid::text,
    CASE WHEN v_existing_mem.user_id IS NULL THEN NULL ELSE to_jsonb(v_existing_mem) END,
    jsonb_build_object(
      'email', 'abhyy333@gmail.com',
      'system_role', 'super_admin',
      'membership_role', 'anggota',
      'division', 'Acara',
      'status', 'active',
      'phase', '4.2.4'
    )
  );
END $$;

-- =============================================================================
-- 4. Update Logbook & Report Triggers + RPCs for Full Super Admin Authority
-- =============================================================================

CREATE OR REPLACE FUNCTION app_private.protect_and_validate_daily_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid;
  is_trusted_db_admin boolean;
  is_super_admin_actor boolean;
  is_trusted_review_sync boolean;
  orig_record RECORD;
  has_cycle boolean;
BEGIN
  v_uid := (SELECT auth.uid());

  is_trusted_db_admin := (
    coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );

  is_super_admin_actor := (
    NOT is_trusted_db_admin
    AND app_private.is_super_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_uid AND p.is_active = true
    )
  );

  IF TG_OP = 'DELETE' THEN
    IF OLD.verification_status = 'verified' AND NOT is_trusted_db_admin THEN
      RAISE EXCEPTION 'Catatan logbook yang sudah diverifikasi tidak dapat dihapus.'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT is_trusted_db_admin AND NOT is_super_admin_actor THEN
    IF NOT (
      app_private.has_kkn_role('ketua')
      OR app_private.has_kkn_role('sekretaris')
      OR app_private.has_kkn_role('bendahara')
      OR app_private.has_kkn_role('anggota')
    ) THEN
      RAISE EXCEPTION 'Hanya anggota operasional aktif KKN atau Super Admin yang dapat mengelola catatan logbook.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF nullif(btrim(NEW.title), '') IS NULL THEN
    RAISE EXCEPTION 'Judul kegiatan logbook tidak boleh kosong.'
      USING ERRCODE = '23514';
  END IF;

  IF nullif(btrim(NEW.content), '') IS NULL THEN
    RAISE EXCEPTION 'Deskripsi kegiatan logbook tidak boleh kosong.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.work_program_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.work_programs wp WHERE wp.id = NEW.work_program_id
    ) THEN
      RAISE EXCEPTION 'Program kerja terkait tidak ditemukan.'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- Validate post-verification correction chain (preserves original verified history)
  IF NEW.correction_of_log_id IS NOT NULL THEN
    IF NEW.correction_of_log_id = NEW.id THEN
      RAISE EXCEPTION 'Catatan koreksi tidak dapat merujuk ke dirinya sendiri.'
        USING ERRCODE = '23514';
    END IF;

    SELECT id, author_id, verification_status
    INTO orig_record
    FROM public.daily_logs
    WHERE id = NEW.correction_of_log_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Catatan logbook asli yang akan dikoreksi tidak ditemukan.'
        USING ERRCODE = '23503';
    END IF;

    IF orig_record.author_id IS DISTINCT FROM NEW.author_id
       AND NOT is_trusted_db_admin
       AND NOT is_super_admin_actor THEN
      RAISE EXCEPTION 'Koreksi logbook hanya dapat dibuat oleh pemilik catatan asli.'
        USING ERRCODE = '42501';
    END IF;

    IF orig_record.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'Catatan koreksi hanya dibuat untuk catatan yang sudah terverifikasi.'
        USING ERRCODE = '23514';
    END IF;

    IF nullif(btrim(coalesce(NEW.correction_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Alasan koreksi wajib diisi pada catatan koreksi.'
        USING ERRCODE = '23514';
    END IF;

    WITH RECURSIVE chain AS (
      SELECT dl.id, dl.correction_of_log_id, 1 AS depth
      FROM public.daily_logs dl
      WHERE dl.id = NEW.correction_of_log_id
      UNION ALL
      SELECT parent.id, parent.correction_of_log_id, c.depth + 1
      FROM public.daily_logs parent
      JOIN chain c ON c.correction_of_log_id = parent.id
      WHERE c.depth < 100
    )
    SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id OR depth >= 100)
    INTO has_cycle;

    IF has_cycle THEN
      RAISE EXCEPTION 'Relasi rantai koreksi logbook tidak boleh membentuk siklus.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_trusted_db_admin THEN
      IF NEW.verification_status IN ('verified', 'revision_requested') THEN
        RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan melalui pemeriksaan DPL atau Super Admin via review_daily_log.'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.verified_by IS NOT NULL
         OR NEW.verified_at IS NOT NULL
         OR nullif(btrim(coalesce(NEW.verification_note, '')), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Kolom hasil verifikasi tidak dapat diisi langsung pada saat pembuatan catatan.'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.verification_status = 'submitted' THEN
      NEW.submitted_at := coalesce(NEW.submitted_at, now());
    ELSIF NEW.verification_status = 'draft' THEN
      NEW.submitted_at := NULL;
    END IF;

    NEW.updated_at := coalesce(NEW.updated_at, now());
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  is_trusted_review_sync := (
    pg_catalog.pg_trigger_depth() >= 2
    AND OLD.verification_status = 'submitted'
    AND NEW.verification_status IN ('verified', 'revision_requested')
    AND EXISTS (
      SELECT 1
      FROM public.daily_log_reviews dlr
      WHERE dlr.log_id = NEW.id
        AND dlr.decision = NEW.verification_status
        AND dlr.reviewer_id = NEW.verified_by
        AND dlr.reviewed_at = NEW.verified_at
    )
  );

  IF NOT is_trusted_db_admin AND NOT is_trusted_review_sync THEN
    IF NOT is_super_admin_actor AND NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      RAISE EXCEPTION 'Pemilik catatan logbook tidak dapat diubah.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.correction_of_log_id IS DISTINCT FROM OLD.correction_of_log_id THEN
      RAISE EXCEPTION 'Referensi catatan koreksi tidak dapat diubah setelah dibuat.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.verification_status = 'verified' THEN
      RAISE EXCEPTION 'Catatan logbook yang sudah diverifikasi bersifat immutable; buat catatan koreksi baru yang terhubung ke catatan ini.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.verification_status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan melalui alur pemeriksaan resmi.'
        USING ERRCODE = '42501';
    END IF;

    IF (NEW.verified_by IS DISTINCT FROM OLD.verified_by)
       OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at)
       OR (NEW.verification_note IS DISTINCT FROM OLD.verification_note) THEN
      RAISE EXCEPTION 'Kolom hasil verifikasi tidak dapat diubah langsung.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'submitted' THEN
      NEW.submitted_at := now();
    ELSIF NEW.verification_status = 'draft' THEN
      NEW.submitted_at := NULL;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.protect_daily_log_children()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid;
  target_log_id uuid;
  parent_record RECORD;
  is_trusted_db_admin boolean;
  is_super_admin_actor boolean;
BEGIN
  v_uid := (SELECT auth.uid());

  is_trusted_db_admin := (
    coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );

  is_super_admin_actor := (
    NOT is_trusted_db_admin
    AND app_private.is_super_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_uid AND p.is_active = true
    )
  );

  target_log_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.log_id ELSE NEW.log_id END;

  SELECT id, author_id, verification_status
  INTO parent_record
  FROM public.daily_logs
  WHERE id = target_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan logbook induk tidak ditemukan.'
      USING ERRCODE = '23503';
  END IF;

  IF parent_record.verification_status = 'verified' AND NOT is_trusted_db_admin THEN
    RAISE EXCEPTION 'Lampiran atau peserta pada catatan logbook yang sudah diverifikasi tidak dapat diubah.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'daily_log_participants' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = NEW.user_id AND m.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Peserta aktivitas harus merupakan anggota aktif KKN.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'daily_log_attachments' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NOT is_trusted_db_admin THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.file_objects fo
        WHERE fo.id = NEW.file_id
          AND fo.bucket_id = 'kkn-private'
          AND (
            fo.uploaded_by = parent_record.author_id
            OR (is_super_admin_actor AND fo.uploaded_by = v_uid)
          )
      ) THEN
        RAISE EXCEPTION 'Lampiran logbook hanya dapat menautkan file privat yang sah.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.validate_daily_log_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  log_status text;
  v_is_super_admin boolean;
  v_is_active_dpl boolean;
BEGIN
  SELECT dl.verification_status INTO log_status
  FROM public.daily_logs dl
  WHERE dl.id = NEW.log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan logbook yang akan diperiksa tidak ditemukan.'
      USING ERRCODE = '23503';
  END IF;

  IF log_status <> 'submitted' THEN
    RAISE EXCEPTION 'Hanya catatan logbook berstatus Diajukan/Tercatat yang dapat diperiksa.'
      USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.system_admins sa
    JOIN public.profiles p ON p.id = sa.user_id
    WHERE sa.user_id = NEW.reviewer_id
      AND p.is_active = true
  ) INTO v_is_super_admin;

  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.user_id = NEW.reviewer_id
      AND m.role = 'dpl'
      AND m.status = 'active'
      AND p.is_active = true
  ) INTO v_is_active_dpl;

  IF NOT v_is_super_admin AND NOT v_is_active_dpl THEN
    RAISE EXCEPTION 'Hanya DPL aktif atau Super Admin yang berwenang memverifikasi logbook.'
      USING ERRCODE = '42501';
  END IF;

  -- Preserve honest audit authority: never masquerade Super Admin as DPL
  NEW.reviewer_authority := CASE WHEN v_is_super_admin THEN 'super_admin' ELSE 'dpl' END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_daily_log(
  p_log_id uuid,
  p_decision text,
  p_note text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_reviewer_id uuid;
  v_is_super_admin boolean;
  v_is_active_dpl boolean;
  v_authority text;
  v_clean_note text;
  v_log_status text;
  v_inserted public.daily_log_reviews%ROWTYPE;
BEGIN
  v_reviewer_id := (SELECT auth.uid());
  IF v_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi JWT diperlukan untuk memverifikasi logbook.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_reviewer_id AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Profil akun sedang nonaktif.'
      USING ERRCODE = '42501';
  END IF;

  v_is_super_admin := app_private.is_super_admin();
  v_is_active_dpl := app_private.has_kkn_role('dpl');

  IF NOT v_is_super_admin AND NOT v_is_active_dpl THEN
    RAISE EXCEPTION 'Hanya DPL aktif atau Super Admin yang berwenang menetapkan keputusan verifikasi.'
      USING ERRCODE = '42501';
  END IF;

  v_authority := CASE WHEN v_is_super_admin THEN 'super_admin' ELSE 'dpl' END;

  IF p_decision IS NULL OR p_decision NOT IN ('verified', 'revision_requested') THEN
    RAISE EXCEPTION 'Keputusan verifikasi tidak valid. Gunakan verified atau revision_requested.'
      USING ERRCODE = '23514';
  END IF;

  v_clean_note := nullif(btrim(coalesce(p_note, '')), '');
  IF p_decision = 'revision_requested' AND v_clean_note IS NULL THEN
    RAISE EXCEPTION 'Catatan revisi wajib diisi oleh pemeriksa.'
      USING ERRCODE = '23514';
  END IF;

  SELECT dl.verification_status
  INTO v_log_status
  FROM public.daily_logs dl
  WHERE dl.id = p_log_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan logbook tidak ditemukan.'
      USING ERRCODE = '23503';
  END IF;

  IF v_log_status <> 'submitted' THEN
    RAISE EXCEPTION 'Hanya logbook berstatus Tercatat/Diajukan yang dapat diproses.'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.daily_log_reviews (log_id, reviewer_id, reviewer_authority, decision, note)
  VALUES (p_log_id, v_reviewer_id, v_authority, p_decision, v_clean_note)
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'id', v_inserted.id,
    'log_id', v_inserted.log_id,
    'reviewer_id', v_inserted.reviewer_id,
    'reviewer_authority', v_inserted.reviewer_authority,
    'decision', v_inserted.decision,
    'note', v_inserted.note,
    'reviewed_at', v_inserted.reviewed_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.review_daily_log(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_daily_log(uuid, text, text) TO authenticated, postgres, service_role;

-- Update Final Reports triggers so Super Admin can also exercise DPL review authority cleanly
CREATE OR REPLACE FUNCTION app_private.validate_report_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  current_version uuid;
  report_status text;
  v_is_super_admin boolean;
  v_is_active_dpl boolean;
BEGIN
  SELECT r.current_version_id, r.status
  INTO current_version, report_status
  FROM public.reports r
  JOIN public.report_versions rv ON rv.report_id = r.id
  WHERE rv.id = NEW.report_version_id;

  IF current_version IS DISTINCT FROM NEW.report_version_id OR report_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only the currently submitted report version can be reviewed.'
      USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.system_admins sa
    JOIN public.profiles p ON p.id = sa.user_id
    WHERE sa.user_id = NEW.reviewer_id
      AND p.is_active = true
  ) INTO v_is_super_admin;

  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.user_id = NEW.reviewer_id
      AND m.role = 'dpl'
      AND m.status = 'active'
      AND p.is_active = true
  ) INTO v_is_active_dpl;

  IF NOT v_is_super_admin AND NOT v_is_active_dpl THEN
    RAISE EXCEPTION 'Only an active DPL or Super Admin may review reports.'
      USING ERRCODE = '42501';
  END IF;

  NEW.reviewer_authority := CASE WHEN v_is_super_admin THEN 'super_admin' ELSE 'dpl' END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.protect_report_review_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('approved', 'revision_requested') THEN
      RAISE EXCEPTION 'Status laporan disetujui atau perlu revisi hanya dapat ditetapkan melalui peninjauan DPL atau Super Admin.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved', 'revision_requested') THEN
      IF pg_catalog.pg_trigger_depth() < 2
         OR OLD.status <> 'submitted'
         OR NEW.current_version_id IS NULL
         OR NOT EXISTS (
           SELECT 1
           FROM public.report_reviews rr
           JOIN public.report_versions rv ON rv.id = rr.report_version_id
           WHERE rv.id = NEW.current_version_id
             AND rv.report_id = NEW.id
             AND rr.decision = NEW.status
             AND (
               EXISTS (
                 SELECT 1 FROM public.memberships m
                 WHERE m.user_id = rr.reviewer_id AND m.role = 'dpl' AND m.status = 'active'
               )
               OR EXISTS (
                 SELECT 1 FROM public.system_admins sa
                 WHERE sa.user_id = rr.reviewer_id
               )
             )
         ) THEN
        RAISE EXCEPTION 'Status laporan disetujui atau perlu revisi hanya dapat ditetapkan melalui peninjauan resmi.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Allow Super Admin on team summary even if not inspecting via membership only
CREATE OR REPLACE FUNCTION public.get_logbook_team_summary(
  p_today_date date DEFAULT CURRENT_DATE,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  week_start date;
  week_end date;
  v_today_count bigint;
  v_week_count bigint;
  v_total_count bigint;
  v_verified_count bigint;
  v_submitted_count bigint;
  v_range_count bigint;
  v_active_authors bigint;
  v_range_authors bigint;
  v_range_duration bigint;
  v_categories jsonb;
  v_programs jsonb;
  v_daily jsonb;
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Akses ringkasan aktivitas tim hanya tersedia untuk anggota aktif KKN atau Super Admin.'
      USING ERRCODE = '42501';
  END IF;

  week_start := p_today_date - (((EXTRACT(ISODOW FROM p_today_date)::int) - 1));
  week_end := week_start + 6;

  SELECT
    count(*) FILTER (WHERE dl.log_date = p_today_date),
    count(*) FILTER (WHERE dl.log_date BETWEEN week_start AND week_end),
    count(*),
    count(*) FILTER (WHERE dl.verification_status = 'verified'),
    count(*) FILTER (WHERE dl.verification_status = 'submitted'),
    count(*) FILTER (
      WHERE (p_start_date IS NULL OR dl.log_date >= p_start_date)
        AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    ),
    count(DISTINCT dl.author_id),
    count(DISTINCT dl.author_id) FILTER (
      WHERE (p_start_date IS NULL OR dl.log_date >= p_start_date)
        AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    ),
    coalesce(sum(dl.duration_minutes) FILTER (
      WHERE (p_start_date IS NULL OR dl.log_date >= p_start_date)
        AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    ), 0)
  INTO
    v_today_count,
    v_week_count,
    v_total_count,
    v_verified_count,
    v_submitted_count,
    v_range_count,
    v_active_authors,
    v_range_authors,
    v_range_duration
  FROM public.daily_logs dl
  WHERE dl.verification_status <> 'draft';

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object('category', cat_rows.activity_category, 'count', cat_rows.cnt)
      ORDER BY cat_rows.cnt DESC
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM (
    SELECT dl.activity_category, count(*) AS cnt
    FROM public.daily_logs dl
    WHERE dl.verification_status <> 'draft'
      AND (p_start_date IS NULL OR dl.log_date >= p_start_date)
      AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    GROUP BY dl.activity_category
  ) cat_rows;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'program_id', prog_rows.work_program_id,
        'program_title', prog_rows.program_title,
        'count', prog_rows.cnt,
        'latest_date', prog_rows.latest_date
      )
      ORDER BY prog_rows.cnt DESC, prog_rows.latest_date DESC
    ),
    '[]'::jsonb
  )
  INTO v_programs
  FROM (
    SELECT
      dl.work_program_id,
      coalesce(wp.title, 'Kegiatan Umum / Non-Program Kerja') AS program_title,
      count(*) AS cnt,
      max(dl.log_date)::text AS latest_date
    FROM public.daily_logs dl
    LEFT JOIN public.work_programs wp ON wp.id = dl.work_program_id
    WHERE dl.verification_status <> 'draft'
      AND (p_start_date IS NULL OR dl.log_date >= p_start_date)
      AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    GROUP BY dl.work_program_id, wp.title
  ) prog_rows;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'log_date', day_rows.log_date::text,
        'count', day_rows.cnt
      )
      ORDER BY day_rows.log_date DESC
    ),
    '[]'::jsonb
  )
  INTO v_daily
  FROM (
    SELECT dl.log_date, count(*) AS cnt
    FROM public.daily_logs dl
    WHERE dl.verification_status <> 'draft'
      AND (p_start_date IS NULL OR dl.log_date >= p_start_date)
      AND (p_end_date IS NULL OR dl.log_date <= p_end_date)
    GROUP BY dl.log_date
  ) day_rows;

  RETURN jsonb_build_object(
    'today_count', v_today_count,
    'week_count', v_week_count,
    'total_count', v_total_count,
    'verified_count', v_verified_count,
    'submitted_count', v_submitted_count,
    'range_count', v_range_count,
    'active_authors_count', v_active_authors,
    'range_authors_count', v_range_authors,
    'total_duration_minutes', v_range_duration,
    'category_breakdown', v_categories,
    'program_breakdown', v_programs,
    'daily_breakdown', v_daily
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_logbook_team_summary(date, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) TO authenticated, postgres, service_role;

-- Keep get_workspace_members() signature untouched and add get_workspace_members_details() returning `division` & `is_super_admin`
CREATE OR REPLACE FUNCTION public.get_workspace_members_details()
 RETURNS TABLE(
   user_id uuid,
   full_name text,
   email text,
   phone text,
   avatar_file_id uuid,
   role text,
   division text,
   status text,
   joined_at timestamp with time zone,
   is_super_admin boolean
 )
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

REVOKE ALL ON FUNCTION public.get_workspace_members_details() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_members_details() TO authenticated, postgres, service_role;

-- =============================================================================
-- 5. Align RLS Policies (daily_log_reviews & storage.objects)
-- =============================================================================

CREATE POLICY daily_log_reviews_super_admin_insert
  ON public.daily_log_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND (SELECT app_private.is_super_admin())
  );

CREATE POLICY super_admin_all_kkn_private_objects
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'kkn-private'
    AND (SELECT app_private.is_super_admin())
  )
  WITH CHECK (
    bucket_id = 'kkn-private'
    AND (SELECT app_private.is_super_admin())
  );

COMMIT;

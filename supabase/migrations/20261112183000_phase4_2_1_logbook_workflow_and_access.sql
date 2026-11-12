-- Phase 4.2.1: Logbook Workflow Finalization & Authorization
-- Enforces:
-- 1) Strict active-DPL-only final verification via transactional RPC `public.review_daily_log`
-- 2) Author write/edit/delete separation (ketua, sekretaris, bendahara, anggota; before verified only)
-- 3) Immutability of verified logs + multi-step cycle-safe correction chain via `correction_of_log_id`
-- 4) Attachment/participant child validation against active membership & file ownership
-- 5) Strict active-member-only privacy-safe `get_logbook_team_summary` (with daily, category, and program aggregates)

BEGIN;

-- =============================================================================
-- 1. Tighten RLS Policies on public.daily_logs & public.daily_log_reviews
-- =============================================================================

-- Replace combined owner policy with explicit per-command policies so verified lock is enforced in RLS too
DROP POLICY IF EXISTS daily_logs_owner_manage ON public.daily_logs;

DROP POLICY IF EXISTS daily_logs_owner_insert ON public.daily_logs;
CREATE POLICY daily_logs_owner_insert
  ON public.daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND verification_status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS daily_logs_owner_update ON public.daily_logs;
CREATE POLICY daily_logs_owner_update
  ON public.daily_logs
  FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND verification_status <> 'verified'
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND verification_status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS daily_logs_owner_delete ON public.daily_logs;
CREATE POLICY daily_logs_owner_delete
  ON public.daily_logs
  FOR DELETE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND verification_status <> 'verified'
  );

-- Keep explicit Super Admin read safeguard on reviews without letting Super Admin forge DPL reviews
DROP POLICY IF EXISTS super_admin_all_daily_log_reviews ON public.daily_log_reviews;
DROP POLICY IF EXISTS super_admin_select_daily_log_reviews ON public.daily_log_reviews;
CREATE POLICY super_admin_select_daily_log_reviews
  ON public.daily_log_reviews
  FOR SELECT
  TO authenticated
  USING ((SELECT app_private.is_super_admin()));

-- =============================================================================
-- 2. Harden Trigger Functions (DPL-only review, cycle-safe correction chain, immutability)
-- =============================================================================

CREATE OR REPLACE FUNCTION app_private.validate_daily_log_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  log_status text;
BEGIN
  SELECT dl.verification_status INTO log_status
  FROM public.daily_logs dl
  WHERE dl.id = NEW.log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan logbook yang akan diperiksa tidak ditemukan.'
      USING ERRCODE = '23503';
  END IF;

  IF log_status <> 'submitted' THEN
    RAISE EXCEPTION 'Hanya catatan logbook berstatus Diajukan/Tercatat yang dapat diperiksa DPL.'
      USING ERRCODE = '23514';
  END IF;

  -- Strict rule: ONLY active DPL may issue final verification or revision requests
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = NEW.reviewer_id
      AND m.role = 'dpl'
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Hanya DPL dengan membership aktif yang berwenang memverifikasi logbook.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.protect_and_validate_daily_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  is_trusted_db_admin boolean;
  is_trusted_review_sync boolean;
  orig_record RECORD;
  has_cycle boolean;
BEGIN
  -- Operational API roles (including Super Admin without DPL review sync) cannot bypass verified lock
  is_trusted_db_admin := (
    coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );

  IF TG_OP = 'DELETE' THEN
    IF OLD.verification_status = 'verified' AND NOT is_trusted_db_admin THEN
      RAISE EXCEPTION 'Catatan logbook yang sudah diverifikasi tidak dapat dihapus.'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
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

  -- Validate post-verification correction chain (allows chaining off previously verified corrections while preventing self-ref & cycles)
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

    IF orig_record.author_id IS DISTINCT FROM NEW.author_id AND NOT is_trusted_db_admin THEN
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

    -- Prevent cycles along correction_of_log_id ancestor chain
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
        RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan melalui pemeriksaan DPL.'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.verified_by IS NOT NULL
         OR NEW.verified_at IS NOT NULL
         OR nullif(btrim(coalesce(NEW.verification_note, '')), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Kolom hasil verifikasi tidak dapat diisi langsung oleh penulis catatan.'
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
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
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
      RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan oleh DPL melalui alur pemeriksaan resmi.'
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
$$;

CREATE OR REPLACE FUNCTION app_private.protect_daily_log_children()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  target_log_id uuid;
  parent_record RECORD;
  is_trusted_db_admin boolean;
BEGIN
  is_trusted_db_admin := (
    coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
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
    IF NOT EXISTS (
      SELECT 1 FROM public.file_objects fo
      WHERE fo.id = NEW.file_id
        AND fo.bucket_id = 'kkn-private'
        AND fo.uploaded_by = parent_record.author_id
    ) AND NOT is_trusted_db_admin THEN
      RAISE EXCEPTION 'Lampiran logbook hanya dapat menautkan file privat milik penulis catatan.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. Transactional Server-Side DPL Review RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.review_daily_log(
  p_log_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_reviewer_id uuid;
  v_clean_note text;
  v_log_status text;
  v_inserted public.daily_log_reviews%ROWTYPE;
BEGIN
  v_reviewer_id := (SELECT auth.uid());
  IF v_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi JWT diperlukan untuk memverifikasi logbook.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_kkn_role('dpl') THEN
    RAISE EXCEPTION 'Hanya DPL dengan membership aktif yang berwenang menetapkan keputusan verifikasi.'
      USING ERRCODE = '42501';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('verified', 'revision_requested') THEN
    RAISE EXCEPTION 'Keputusan verifikasi tidak valid. Gunakan verified atau revision_requested.'
      USING ERRCODE = '23514';
  END IF;

  v_clean_note := nullif(btrim(coalesce(p_note, '')), '');
  IF p_decision = 'revision_requested' AND v_clean_note IS NULL THEN
    RAISE EXCEPTION 'Catatan revisi wajib diisi oleh DPL.'
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
    RAISE EXCEPTION 'Hanya logbook berstatus Tercatat/Diajukan yang dapat diproses oleh DPL.'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.daily_log_reviews (log_id, reviewer_id, decision, note)
  VALUES (p_log_id, v_reviewer_id, p_decision, v_clean_note)
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'id', v_inserted.id,
    'log_id', v_inserted.log_id,
    'reviewer_id', v_inserted.reviewer_id,
    'decision', v_inserted.decision,
    'note', v_inserted.note,
    'reviewed_at', v_inserted.reviewed_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_daily_log(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_daily_log(uuid, text, text) TO authenticated, service_role;

-- =============================================================================
-- 4. Privacy-Safe Team Activity Summary RPC (strictly active members, daily/cat/program aggregates)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_logbook_team_summary(
  p_today_date date DEFAULT CURRENT_DATE,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
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
  IF NOT app_private.is_active_member() THEN
    RAISE EXCEPTION 'Akses ringkasan aktivitas tim hanya tersedia untuk anggota aktif KKN.'
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) TO authenticated, service_role;

COMMIT;

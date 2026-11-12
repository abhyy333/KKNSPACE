-- Phase 4.2 Decision Alignment:
-- 1) DPL as final verifier via append-only daily_log_reviews + sync trigger
-- 2) Ketua & Sekretaris allowed to author their own daily_logs alongside anggota & bendahara
-- 3) Post-verification corrections linked via correction_of_log_id + correction_reason (original stays immutable)
-- 4) Aggregate team activity summary RPC (get_logbook_team_summary) for anggota & bendahara without leaking other members' entries

-- =============================================================================
-- 1. Correction linkage columns on public.daily_logs
-- =============================================================================
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS correction_of_log_id uuid NULL REFERENCES public.daily_logs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS correction_reason text NULL;

ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_correction_reason_check,
  ADD CONSTRAINT daily_logs_correction_reason_check
    CHECK (
      (correction_of_log_id IS NULL AND correction_reason IS NULL)
      OR (correction_of_log_id IS NOT NULL AND nullif(btrim(correction_reason), '') IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS daily_logs_correction_of_idx
  ON public.daily_logs USING btree (correction_of_log_id);

-- =============================================================================
-- 2. DPL Verification Table: public.daily_log_reviews (append-only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.daily_log_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('verified', 'revision_requested')),
  note text NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_log_reviews_revision_note_check
    CHECK (decision <> 'revision_requested' OR nullif(btrim(note), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS daily_log_reviews_log_idx
  ON public.daily_log_reviews USING btree (log_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS daily_log_reviews_reviewer_idx
  ON public.daily_log_reviews USING btree (reviewer_id);

ALTER TABLE public.daily_log_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_log_reviews_select ON public.daily_log_reviews;
CREATE POLICY daily_log_reviews_select
  ON public.daily_log_reviews
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_private.is_super_admin())
    OR EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_reviews.log_id
    )
  );

DROP POLICY IF EXISTS daily_log_reviews_dpl_insert ON public.daily_log_reviews;
CREATE POLICY daily_log_reviews_dpl_insert
  ON public.daily_log_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND (SELECT app_private.has_kkn_role('dpl'))
  );

DROP POLICY IF EXISTS super_admin_all_daily_log_reviews ON public.daily_log_reviews;
CREATE POLICY super_admin_all_daily_log_reviews
  ON public.daily_log_reviews
  FOR ALL
  TO authenticated
  USING ((SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_super_admin()));

-- =============================================================================
-- 3. Update student authoring RLS policies (include ketua & sekretaris)
-- =============================================================================
DROP POLICY IF EXISTS daily_logs_owner_manage ON public.daily_logs;
CREATE POLICY daily_logs_owner_manage
  ON public.daily_logs
  FOR ALL
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
  );

DROP POLICY IF EXISTS daily_log_attachments_owner_insert ON public.daily_log_attachments;
CREATE POLICY daily_log_attachments_owner_insert
  ON public.daily_log_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_attachments.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
    AND EXISTS (
      SELECT 1 FROM public.file_objects fo
      WHERE fo.id = daily_log_attachments.file_id
        AND fo.uploaded_by = (SELECT auth.uid())
        AND fo.bucket_id = 'kkn-private'
    )
  );

DROP POLICY IF EXISTS daily_log_attachments_owner_delete ON public.daily_log_attachments;
CREATE POLICY daily_log_attachments_owner_delete
  ON public.daily_log_attachments
  FOR DELETE
  TO authenticated
  USING (
    (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_attachments.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
  );

DROP POLICY IF EXISTS daily_log_participants_owner_manage ON public.daily_log_participants;
CREATE POLICY daily_log_participants_owner_manage
  ON public.daily_log_participants
  FOR ALL
  TO authenticated
  USING (
    (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_participants.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
  )
  WITH CHECK (
    (
      (SELECT app_private.has_kkn_role('ketua'))
      OR (SELECT app_private.has_kkn_role('sekretaris'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_participants.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
  );

-- =============================================================================
-- 4. Trigger Functions for Reviews & Logbook Correction / Anti-Escalation
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

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = NEW.reviewer_id
        AND m.role = 'dpl'
        AND m.status = 'active'
    )
    OR app_private.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Hanya DPL aktif atau Super Admin yang berwenang memverifikasi logbook.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.sync_daily_log_after_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  UPDATE public.daily_logs
  SET verification_status = NEW.decision,
      verified_by = NEW.reviewer_id,
      verified_at = NEW.reviewed_at,
      verification_note = nullif(btrim(coalesce(NEW.note, '')), ''),
      updated_at = now()
  WHERE id = NEW.log_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.reject_daily_log_review_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  RAISE EXCEPTION 'Riwayat pemeriksaan logbook bersifat append-only dan tidak dapat diubah atau dihapus.'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS validate_daily_log_review_trigger ON public.daily_log_reviews;
CREATE TRIGGER validate_daily_log_review_trigger
  BEFORE INSERT ON public.daily_log_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.validate_daily_log_review();

DROP TRIGGER IF EXISTS sync_daily_log_after_review_trigger ON public.daily_log_reviews;
CREATE TRIGGER sync_daily_log_after_review_trigger
  AFTER INSERT ON public.daily_log_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.sync_daily_log_after_review();

DROP TRIGGER IF EXISTS reject_daily_log_review_mutation_trigger ON public.daily_log_reviews;
CREATE TRIGGER reject_daily_log_review_mutation_trigger
  BEFORE UPDATE OR DELETE ON public.daily_log_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.reject_daily_log_review_mutation();

DROP TRIGGER IF EXISTS audit_daily_log_reviews ON public.daily_log_reviews;
CREATE TRIGGER audit_daily_log_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_log_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

CREATE OR REPLACE FUNCTION app_private.protect_and_validate_daily_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  is_admin_or_service boolean;
  is_trusted_review_sync boolean;
  orig_record RECORD;
BEGIN
  is_admin_or_service := (
    app_private.is_super_admin()
    OR coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );

  IF TG_OP = 'DELETE' THEN
    IF OLD.verification_status = 'verified' AND NOT is_admin_or_service THEN
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

  -- Validate post-verification correction linkage
  IF NEW.correction_of_log_id IS NOT NULL THEN
    IF NEW.correction_of_log_id = NEW.id THEN
      RAISE EXCEPTION 'Catatan koreksi tidak dapat merujuk ke dirinya sendiri.'
        USING ERRCODE = '23514';
    END IF;

    SELECT id, author_id, verification_status, correction_of_log_id
    INTO orig_record
    FROM public.daily_logs
    WHERE id = NEW.correction_of_log_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Catatan logbook asli yang akan dikoreksi tidak ditemukan.'
        USING ERRCODE = '23503';
    END IF;

    IF orig_record.author_id IS DISTINCT FROM NEW.author_id AND NOT is_admin_or_service THEN
      RAISE EXCEPTION 'Koreksi logbook hanya dapat dibuat oleh pemilik catatan asli.'
        USING ERRCODE = '42501';
    END IF;

    IF orig_record.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'Catatan koreksi hanya dibuat untuk catatan yang sudah terverifikasi (catatan belum terverifikasi cukup disunting langsung).'
        USING ERRCODE = '23514';
    END IF;

    IF orig_record.correction_of_log_id IS NOT NULL THEN
      RAISE EXCEPTION 'Koreksi harus terhubung langsung ke catatan utama yang diverifikasi, bukan ke koreksi lain.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_admin_or_service THEN
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

  IF NOT is_admin_or_service AND NOT is_trusted_review_sync THEN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      RAISE EXCEPTION 'Pemilik catatan logbook tidak dapat diubah.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.correction_of_log_id IS DISTINCT FROM OLD.correction_of_log_id THEN
      RAISE EXCEPTION 'Referensi catatan koreksi tidak dapat diubah setelah dibuat.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.verification_status = 'verified' THEN
      RAISE EXCEPTION 'Catatan logbook yang sudah diverifikasi tidak dapat diubah; buat catatan koreksi baru yang terhubung ke catatan ini.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       AND NEW.verification_status IN ('verified', 'revision_requested') THEN
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

-- =============================================================================
-- 5. Aggregate Team Summary RPC (for anggota & bendahara without exposing entries)
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
BEGIN
  IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
    RAISE EXCEPTION 'Akses ringkasan aktivitas tim hanya tersedia untuk anggota aktif KKN.'
      USING ERRCODE = '42501';
  END IF;

  -- ISO week Monday..Sunday around p_today_date
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
    'program_breakdown', v_programs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_logbook_team_summary(date, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) TO authenticated;

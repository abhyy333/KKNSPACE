-- Phase 4.2: Digital Activity Logbook
-- Extends existing public.daily_logs (zero duplicate logbook tables), adds private
-- attachments & participant links, enforces verification immutability & anti-escalation
-- triggers, and wires full audit trail to public.audit_events.

-- 1. Extend public.daily_logs cleanly
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS activity_category text NOT NULL DEFAULT 'lainnya',
  ADD COLUMN IF NOT EXISTS work_program_id uuid NULL REFERENCES public.work_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location text NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NULL,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verified_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS verification_note text NULL;

ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_activity_category_check,
  ADD CONSTRAINT daily_logs_activity_category_check
    CHECK (
      activity_category IN (
        'program_kerja',
        'sosialisasi',
        'administrasi',
        'koordinasi',
        'observasi',
        'piket_posko',
        'lainnya'
      )
    );

ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_duration_minutes_check,
  ADD CONSTRAINT daily_logs_duration_minutes_check
    CHECK (duration_minutes IS NULL OR (duration_minutes > 0 AND duration_minutes <= 1440));

ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_verification_status_check,
  ADD CONSTRAINT daily_logs_verification_status_check
    CHECK (
      verification_status IN (
        'draft',
        'submitted',
        'verified',
        'revision_requested'
      )
    );

-- 2. Companion tables: daily_log_attachments and daily_log_participants
CREATE TABLE IF NOT EXISTS public.daily_log_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.file_objects(id) ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_log_attachments_log_file_unique UNIQUE (log_id, file_id)
);

CREATE TABLE IF NOT EXISTS public.daily_log_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_log_participants_log_user_unique UNIQUE (log_id, user_id)
);

ALTER TABLE public.daily_log_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_participants ENABLE ROW LEVEL SECURITY;

-- 3. Trigger functions for daily_logs validation, anti-escalation & immutability after verification
CREATE OR REPLACE FUNCTION app_private.protect_and_validate_daily_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  is_admin_or_service boolean;
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

  IF TG_OP = 'INSERT' THEN
    IF NOT is_admin_or_service THEN
      IF NEW.verification_status IN ('verified', 'revision_requested') THEN
        RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan melalui alur verifikasi resmi.'
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
  IF NOT is_admin_or_service THEN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      RAISE EXCEPTION 'Pemilik catatan logbook tidak dapat diubah.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.verification_status = 'verified' THEN
      RAISE EXCEPTION 'Catatan logbook yang sudah diverifikasi tidak dapat diubah secara langsung.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       AND NEW.verification_status IN ('verified', 'revision_requested') THEN
      RAISE EXCEPTION 'Status verifikasi logbook hanya dapat ditetapkan melalui alur verifikasi resmi.'
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

DROP TRIGGER IF EXISTS protect_and_validate_daily_log_trigger ON public.daily_logs;
CREATE TRIGGER protect_and_validate_daily_log_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_and_validate_daily_log();

CREATE OR REPLACE FUNCTION app_private.protect_daily_log_children()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  target_log_id uuid;
  parent_status text;
  is_admin_or_service boolean;
BEGIN
  is_admin_or_service := (
    app_private.is_super_admin()
    OR coalesce((SELECT auth.role()), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  );

  target_log_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.log_id ELSE NEW.log_id END;

  SELECT verification_status INTO parent_status
  FROM public.daily_logs
  WHERE id = target_log_id;

  IF parent_status = 'verified' AND NOT is_admin_or_service THEN
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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_daily_log_attachments_trigger ON public.daily_log_attachments;
CREATE TRIGGER protect_daily_log_attachments_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.daily_log_attachments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_daily_log_children();

DROP TRIGGER IF EXISTS protect_daily_log_participants_trigger ON public.daily_log_participants;
CREATE TRIGGER protect_daily_log_participants_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.daily_log_participants
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_daily_log_children();

-- 4. Audit triggers for daily_logs, daily_log_attachments, and daily_log_participants
DROP TRIGGER IF EXISTS audit_daily_logs ON public.daily_logs;
CREATE TRIGGER audit_daily_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

DROP TRIGGER IF EXISTS audit_daily_log_attachments ON public.daily_log_attachments;
CREATE TRIGGER audit_daily_log_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_log_attachments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

DROP TRIGGER IF EXISTS audit_daily_log_participants ON public.daily_log_participants;
CREATE TRIGGER audit_daily_log_participants
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_log_participants
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

-- 5. RLS policies for daily_log_attachments and daily_log_participants
-- Mirror parent daily_logs visibility so anggota/bendahara cannot read other members' logs/files
DROP POLICY IF EXISTS daily_log_attachments_select ON public.daily_log_attachments;
CREATE POLICY daily_log_attachments_select
  ON public.daily_log_attachments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_private.is_super_admin())
    OR EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_attachments.log_id
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
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
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
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_attachments.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
  );

DROP POLICY IF EXISTS super_admin_all_daily_log_attachments ON public.daily_log_attachments;
CREATE POLICY super_admin_all_daily_log_attachments
  ON public.daily_log_attachments
  FOR ALL
  TO authenticated
  USING ((SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_super_admin()));

DROP POLICY IF EXISTS daily_log_participants_select ON public.daily_log_participants;
CREATE POLICY daily_log_participants_select
  ON public.daily_log_participants
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_private.is_super_admin())
    OR EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_participants.log_id
    )
  );

DROP POLICY IF EXISTS daily_log_participants_owner_manage ON public.daily_log_participants;
CREATE POLICY daily_log_participants_owner_manage
  ON public.daily_log_participants
  FOR ALL
  TO authenticated
  USING (
    (
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
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
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
    )
    AND EXISTS (
      SELECT 1 FROM public.daily_logs dl
      WHERE dl.id = daily_log_participants.log_id
        AND dl.author_id = (SELECT auth.uid())
        AND dl.verification_status <> 'verified'
    )
  );

DROP POLICY IF EXISTS super_admin_all_daily_log_participants ON public.daily_log_participants;
CREATE POLICY super_admin_all_daily_log_participants
  ON public.daily_log_participants
  FOR ALL
  TO authenticated
  USING ((SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_super_admin()));

-- 6. Supporting indexes for filter, recap, and FK queries
CREATE INDEX IF NOT EXISTS daily_logs_log_date_idx
  ON public.daily_logs USING btree (log_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS daily_logs_work_program_idx
  ON public.daily_logs USING btree (work_program_id);

CREATE INDEX IF NOT EXISTS daily_logs_category_status_idx
  ON public.daily_logs USING btree (activity_category, verification_status);

CREATE INDEX IF NOT EXISTS daily_log_attachments_log_idx
  ON public.daily_log_attachments USING btree (log_id);

CREATE INDEX IF NOT EXISTS daily_log_attachments_file_idx
  ON public.daily_log_attachments USING btree (file_id);

CREATE INDEX IF NOT EXISTS daily_log_participants_user_idx
  ON public.daily_log_participants USING btree (user_id);

CREATE INDEX IF NOT EXISTS daily_log_attachments_uploaded_by_idx
  ON public.daily_log_attachments USING btree (uploaded_by);

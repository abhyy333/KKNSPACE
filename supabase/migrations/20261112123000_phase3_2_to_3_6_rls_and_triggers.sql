-- Phase 3.2 - 3.6: RLS alignment & integrity triggers per Phase 3.0 approved decisions

-- 1) Phase 3.2: Active members (including anggota, bendahara, dpl) can create and manage their own calendar events
DROP POLICY IF EXISTS calendar_events_member_create_own ON public.calendar_events;
CREATE POLICY calendar_events_member_create_own
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (
    (SELECT app_private.is_active_member())
    AND created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT app_private.is_active_member())
    AND created_by = (SELECT auth.uid())
  );

-- 2) Phase 3.3: Both anggota AND bendahara assigned to a work program can update progress
DROP POLICY IF EXISTS work_programs_assignee_update ON public.work_programs;
CREATE POLICY work_programs_assignee_update
  ON public.work_programs
  FOR UPDATE
  TO authenticated
  USING (
    (
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
    )
    AND (SELECT app_private.is_program_assignee(work_programs.id))
  )
  WITH CHECK (
    (
      (SELECT app_private.has_kkn_role('anggota'))
      OR (SELECT app_private.has_kkn_role('bendahara'))
    )
    AND (SELECT app_private.is_program_assignee(work_programs.id))
  );

-- Prevent non-lead assignees from changing publication_status on work_programs
CREATE OR REPLACE FUNCTION app_private.protect_work_program_publication_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NEW.publication_status IS DISTINCT FROM OLD.publication_status THEN
    IF NOT (
      app_private.has_kkn_role('ketua')
      OR app_private.has_kkn_role('sekretaris')
      OR app_private.is_super_admin()
    ) THEN
      RAISE EXCEPTION 'Hanya Ketua, Sekretaris, atau Super Admin yang dapat mengubah status publikasi program kerja.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_work_program_publication_status ON public.work_programs;
CREATE TRIGGER protect_work_program_publication_status
  BEFORE UPDATE ON public.work_programs
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_work_program_publication_status();

-- 3) Phase 3.4 & 3.5: Active members can view internal draft media, documents, and file metadata
DROP POLICY IF EXISTS file_objects_read_members ON public.file_objects;
CREATE POLICY file_objects_read_members
  ON public.file_objects
  FOR SELECT
  TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS media_read_members ON public.media_assets;
CREATE POLICY media_read_members
  ON public.media_assets
  FOR SELECT
  TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS documents_read_members ON public.documents;
CREATE POLICY documents_read_members
  ON public.documents
  FOR SELECT
  TO authenticated
  USING ((SELECT app_private.is_active_member()));

-- Allow DPL to upload and manage their own draft media/documents as active member
DROP POLICY IF EXISTS media_dpl_own_manage ON public.media_assets;
CREATE POLICY media_dpl_own_manage
  ON public.media_assets
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.is_active_member())
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.is_active_member())
  );

DROP POLICY IF EXISTS documents_dpl_own_manage ON public.documents;
CREATE POLICY documents_dpl_own_manage
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.is_active_member())
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.is_active_member())
  );

-- Guard publication_status transitions on media_assets & documents so only ketua/sekretaris/super_admin can publish or archive
CREATE OR REPLACE FUNCTION app_private.protect_media_document_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  is_publisher boolean;
BEGIN
  is_publisher := (
    app_private.has_kkn_role('ketua')
    OR app_private.has_kkn_role('sekretaris')
    OR app_private.is_super_admin()
  );

  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status <> 'draft' AND NOT is_publisher THEN
      RAISE EXCEPTION 'Hanya Ketua atau Sekretaris yang dapat mempublikasikan langsung ke portal.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.publication_status IS DISTINCT FROM OLD.publication_status AND NOT is_publisher THEN
      RAISE EXCEPTION 'Hanya Ketua atau Sekretaris yang dapat mengubah status publikasi.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_media_publication ON public.media_assets;
CREATE TRIGGER protect_media_publication
  BEFORE INSERT OR UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_media_document_publication();

DROP TRIGGER IF EXISTS protect_document_publication ON public.documents;
CREATE TRIGGER protect_document_publication
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_media_document_publication();

-- 4) Phase 3.5: Automatically synchronize public.reports.status when DPL inserts a review
CREATE OR REPLACE FUNCTION app_private.sync_report_status_after_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  target_report_id uuid;
BEGIN
  SELECT rv.report_id INTO target_report_id
  FROM public.report_versions rv
  WHERE rv.id = NEW.report_version_id;

  IF target_report_id IS NOT NULL THEN
    UPDATE public.reports
    SET status = NEW.decision,
        updated_at = now()
    WHERE id = target_report_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_report_status_after_review ON public.report_reviews;
CREATE TRIGGER sync_report_status_after_review
  AFTER INSERT ON public.report_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.sync_report_status_after_review();

-- 5) Performance indexes for Phase 3.2 - 3.5 queries
CREATE INDEX IF NOT EXISTS tasks_program_status_idx
  ON public.tasks USING btree (program_id, status);

CREATE INDEX IF NOT EXISTS task_assignees_task_user_idx
  ON public.task_assignees USING btree (task_id, user_id);

CREATE INDEX IF NOT EXISTS media_assets_pub_created_idx
  ON public.media_assets USING btree (publication_status, created_at DESC);

CREATE INDEX IF NOT EXISTS documents_pub_created_idx
  ON public.documents USING btree (publication_status, created_at DESC);

CREATE INDEX IF NOT EXISTS report_versions_report_version_idx
  ON public.report_versions USING btree (report_id, version_number DESC);

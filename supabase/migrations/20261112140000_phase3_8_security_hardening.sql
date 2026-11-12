-- Phase 3.8 Security Hardening & Database Policy Fixes
-- Addresses Phase 3.7 audit findings M-01, M-02, M-03, M-04, L-01, and L-02.
-- All statements are idempotent and preserve existing accounts, roles, and operational data.

-- =============================================================================
-- M-01: Enforce uploader UUID folder prefix and safe path on public.file_objects
-- =============================================================================
DROP POLICY IF EXISTS file_objects_member_insert ON public.file_objects;
CREATE POLICY file_objects_member_insert
  ON public.file_objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.is_active_member())
    AND bucket_id = 'kkn-private'
    AND left(object_path, 37) = ((SELECT auth.uid())::text || '/')
    AND char_length(object_path) > 37
    AND strpos(object_path, '..') = 0
    AND strpos(object_path, '//') = 0
  );

-- =============================================================================
-- M-02 & L-01: Harden media_assets & documents management policies
-- - Require active membership in USING as well as WITH CHECK (prevents suspended delete/update)
-- - Scope dpl_own_manage explicitly to active 'dpl' role so non-DPL cannot bypass assignee rules
-- - Restrict non-lead (anggota, bendahara, dpl) updates/deletes to 'draft' rows only
-- =============================================================================
DROP POLICY IF EXISTS media_assignee_manage ON public.media_assets;
CREATE POLICY media_assignee_manage
  ON public.media_assets
  FOR ALL
  TO authenticated
  USING (
    (uploaded_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    AND (
      (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  )
  WITH CHECK (
    (uploaded_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    AND (
      (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  );

DROP POLICY IF EXISTS media_dpl_own_manage ON public.media_assets;
CREATE POLICY media_dpl_own_manage
  ON public.media_assets
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.has_kkn_role('dpl'))
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.has_kkn_role('dpl'))
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  );

DROP POLICY IF EXISTS documents_assignee_manage ON public.documents;
CREATE POLICY documents_assignee_manage
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    (uploaded_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    AND (
      (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  )
  WITH CHECK (
    (uploaded_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    AND (
      (SELECT app_private.has_kkn_role('bendahara'))
      OR (SELECT app_private.has_kkn_role('anggota'))
    )
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  );

DROP POLICY IF EXISTS documents_dpl_own_manage ON public.documents;
CREATE POLICY documents_dpl_own_manage
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.has_kkn_role('dpl'))
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT app_private.has_kkn_role('dpl'))
    AND (SELECT app_private.is_active_member())
    AND publication_status = 'draft'
  );

-- =============================================================================
-- M-03: Require active membership when task assignees update tasks
-- =============================================================================
DROP POLICY IF EXISTS tasks_assignee_update ON public.tasks;
CREATE POLICY tasks_assignee_update
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_private.is_task_assignee(id))
    AND (SELECT app_private.is_active_member())
  )
  WITH CHECK (
    (SELECT app_private.is_task_assignee(id))
    AND (SELECT app_private.is_active_member())
  );

-- =============================================================================
-- M-04: Protect public.profiles.is_active from self-modification
-- Non-Super-Admin authenticated users may update full_name/phone/avatar, never is_active.
-- =============================================================================
CREATE OR REPLACE FUNCTION app_private.protect_profile_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NOT (
      app_private.is_super_admin()
      OR coalesce((SELECT auth.role()), '') = 'service_role'
      OR session_user IN ('postgres', 'supabase_admin')
    ) THEN
      RAISE EXCEPTION 'Hanya Super Admin atau sistem terpercaya yang dapat mengubah status aktif profil.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_is_active_before_update ON public.profiles;
CREATE TRIGGER protect_profile_is_active_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_profile_is_active();

-- =============================================================================
-- L-02: Protect public.reports.status transitions to 'approved' / 'revision_requested'
-- Only sync_report_status_after_review (nested trigger depth >= 2) backed by a valid
-- active DPL review on the currently submitted report version may transition status.
-- =============================================================================
CREATE OR REPLACE FUNCTION app_private.protect_report_review_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('approved', 'revision_requested') THEN
      RAISE EXCEPTION 'Status laporan disetujui atau perlu revisi hanya dapat ditetapkan melalui peninjauan DPL.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved', 'revision_requested') THEN
      -- Direct REST/SQL UPDATE runs at trigger depth 1; review sync trigger runs at depth >= 2
      IF pg_catalog.pg_trigger_depth() < 2
         OR OLD.status <> 'submitted'
         OR NEW.current_version_id IS NULL
         OR NOT EXISTS (
           SELECT 1
           FROM public.report_reviews rr
           JOIN public.report_versions rv ON rv.id = rr.report_version_id
           JOIN public.memberships m ON m.user_id = rr.reviewer_id
           WHERE rv.id = NEW.current_version_id
             AND rv.report_id = NEW.id
             AND rr.decision = NEW.status
             AND m.role = 'dpl'
             AND m.status = 'active'
         ) THEN
        RAISE EXCEPTION 'Status laporan disetujui atau perlu revisi hanya dapat ditetapkan melalui peninjauan DPL yang sah.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_report_review_status_before_write ON public.reports;
CREATE TRIGGER protect_report_review_status_before_write
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_report_review_status();

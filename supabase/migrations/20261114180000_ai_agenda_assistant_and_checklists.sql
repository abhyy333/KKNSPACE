-- Migration: 20261114180000_ai_agenda_assistant_and_checklists.sql
-- Description: Extend calendar_events, add agenda_activity_steps, agenda_activity_logs, and activity_documentations linkage

-- 1. Extend calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Posko KKN Desa Pringgasela Selatan',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Umum',
  ADD COLUMN IF NOT EXISTS pic_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsible_division TEXT NOT NULL DEFAULT 'Acara',
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS target_output TEXT,
  ADD COLUMN IF NOT EXISTS equipment_needed JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'internal' CHECK (publication_status IN ('draft', 'internal', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS execution_status TEXT NOT NULL DEFAULT 'not_started' CHECK (execution_status IN ('not_started', 'in_progress', 'completed', 'postponed')),
  ADD COLUMN IF NOT EXISTS related_program_id UUID REFERENCES public.work_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_timeline_stage_id UUID REFERENCES public.kkn_timeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add foreign key constraint for created_by if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_created_by_fkey' AND table_name = 'calendar_events'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Populate pic_id for existing records
UPDATE public.calendar_events SET pic_id = created_by WHERE pic_id IS NULL AND created_by IS NOT NULL;

-- 2. Create agenda_activity_steps table
CREATE TABLE IF NOT EXISTS public.agenda_activity_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  completion_status BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actual_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_steps_agenda_order
  ON public.agenda_activity_steps (agenda_id, order_index ASC);

-- 3. Create agenda_activity_logs table
CREATE TABLE IF NOT EXISTS public.agenda_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_logs_agenda_date
  ON public.agenda_activity_logs (agenda_id, created_at DESC);

-- 4. Extend activity_documentations with related_agenda_id
ALTER TABLE public.activity_documentations
  ADD COLUMN IF NOT EXISTS related_agenda_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_docs_related_agenda
  ON public.activity_documentations (related_agenda_id);

-- 5. Helper / Trigger Function for Calendar Event Publication
CREATE OR REPLACE FUNCTION app_private.protect_calendar_event_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status IN ('published', 'archived') THEN
      IF NOT (
        app_private.has_kkn_role('ketua')
        OR app_private.has_kkn_role('sekretaris')
        OR app_private.is_super_admin()
        OR coalesce((SELECT auth.role()), '') = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin')
      ) THEN
        RAISE EXCEPTION 'Hanya Ketua, Sekretaris, atau Super Admin yang dapat mempublikasikan agenda secara langsung.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.publication_status IS DISTINCT FROM OLD.publication_status THEN
      IF NOT (
        app_private.has_kkn_role('ketua')
        OR app_private.has_kkn_role('sekretaris')
        OR app_private.is_super_admin()
        OR coalesce((SELECT auth.role()), '') = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin')
      ) THEN
        RAISE EXCEPTION 'Hanya Ketua, Sekretaris, atau Super Admin yang berwenang mengubah status publikasi agenda.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_calendar_event_publication ON public.calendar_events;
CREATE TRIGGER tr_protect_calendar_event_publication
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION app_private.protect_calendar_event_publication();

-- 6. Audit Event Trigger for calendar_events
DROP TRIGGER IF EXISTS tr_calendar_events_audit ON public.calendar_events;
CREATE TRIGGER tr_calendar_events_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

-- 7. RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_lead_manage" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_member_create_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_read_members" ON public.calendar_events;
DROP POLICY IF EXISTS "super_admin_all_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_read" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

CREATE POLICY "calendar_events_read"
  ON public.calendar_events
  FOR SELECT
  USING (
    publication_status = 'published'
    OR (SELECT app_private.is_active_member())
    OR (SELECT app_private.is_super_admin())
  );

CREATE POLICY "calendar_events_insert"
  ON public.calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()))
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "calendar_events_update"
  ON public.calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_private.is_super_admin())
    OR (SELECT app_private.has_kkn_role('ketua'))
    OR (SELECT app_private.has_kkn_role('sekretaris'))
    OR created_by = (SELECT auth.uid())
    OR pic_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
        AND m.division = calendar_events.responsible_division
    )
  )
  WITH CHECK (
    (SELECT app_private.is_super_admin())
    OR (SELECT app_private.has_kkn_role('ketua'))
    OR (SELECT app_private.has_kkn_role('sekretaris'))
    OR created_by = (SELECT auth.uid())
    OR pic_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
        AND m.division = calendar_events.responsible_division
    )
  );

CREATE POLICY "calendar_events_delete"
  ON public.calendar_events
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_private.is_super_admin())
    OR (SELECT app_private.has_kkn_role('ketua'))
    OR (SELECT app_private.has_kkn_role('sekretaris'))
    OR (created_by = (SELECT auth.uid()) AND publication_status = 'draft')
  );

-- 8. RLS on agenda_activity_steps
ALTER TABLE public.agenda_activity_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_steps_read" ON public.agenda_activity_steps;
DROP POLICY IF EXISTS "agenda_steps_insert" ON public.agenda_activity_steps;
DROP POLICY IF EXISTS "agenda_steps_update" ON public.agenda_activity_steps;
DROP POLICY IF EXISTS "agenda_steps_delete" ON public.agenda_activity_steps;

CREATE POLICY "agenda_steps_read"
  ON public.agenda_activity_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = agenda_activity_steps.agenda_id
        AND (ce.publication_status = 'published' OR (SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()))
    )
  );

CREATE POLICY "agenda_steps_insert"
  ON public.agenda_activity_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_private.is_active_member())
    AND EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = agenda_activity_steps.agenda_id
        AND (
          (SELECT app_private.is_super_admin())
          OR (SELECT app_private.has_kkn_role('ketua'))
          OR (SELECT app_private.has_kkn_role('sekretaris'))
          OR ce.created_by = (SELECT auth.uid())
          OR ce.pic_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = (SELECT auth.uid())
              AND m.status = 'active'
              AND m.division = ce.responsible_division
          )
        )
    )
  );

CREATE POLICY "agenda_steps_update"
  ON public.agenda_activity_steps
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_private.is_active_member())
    AND EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = agenda_activity_steps.agenda_id
        AND (
          (SELECT app_private.is_super_admin())
          OR (SELECT app_private.has_kkn_role('ketua'))
          OR (SELECT app_private.has_kkn_role('sekretaris'))
          OR ce.created_by = (SELECT auth.uid())
          OR ce.pic_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = (SELECT auth.uid())
              AND m.status = 'active'
              AND m.division = ce.responsible_division
          )
        )
    )
  );

CREATE POLICY "agenda_steps_delete"
  ON public.agenda_activity_steps
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_private.is_active_member())
    AND EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = agenda_activity_steps.agenda_id
        AND (
          (SELECT app_private.is_super_admin())
          OR (SELECT app_private.has_kkn_role('ketua'))
          OR (SELECT app_private.has_kkn_role('sekretaris'))
          OR ce.created_by = (SELECT auth.uid())
          OR ce.pic_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = (SELECT auth.uid())
              AND m.status = 'active'
              AND m.division = ce.responsible_division
          )
        )
    )
  );

-- 9. RLS on agenda_activity_logs (Append-Only)
ALTER TABLE public.agenda_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_logs_read" ON public.agenda_activity_logs;
DROP POLICY IF EXISTS "agenda_logs_insert" ON public.agenda_activity_logs;

CREATE POLICY "agenda_logs_read"
  ON public.agenda_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_private.is_active_member())
    OR (SELECT app_private.is_super_admin())
  );

CREATE POLICY "agenda_logs_insert"
  ON public.agenda_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()))
    AND actor_user_id = (SELECT auth.uid())
  );

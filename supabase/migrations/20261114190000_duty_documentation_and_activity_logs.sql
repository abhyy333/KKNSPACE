-- ============================================================================
-- MIGRATION: 20261114190000_duty_documentation_and_activity_logs.sql
-- KKN SPACE — Duty Documentation Photos & Admin Activity Log Enhancements
-- ============================================================================

-- 1. Create table for duty shift photo documentation
CREATE TABLE IF NOT EXISTS public.duty_shift_documentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.file_objects(id) ON DELETE CASCADE,
  caption text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duty_shift_docs_shift ON public.duty_shift_documentations(duty_shift_id);
CREATE INDEX IF NOT EXISTS idx_duty_shift_docs_file ON public.duty_shift_documentations(file_id);
CREATE INDEX IF NOT EXISTS idx_duty_shift_docs_uploader ON public.duty_shift_documentations(uploaded_by);

-- 2. Enable RLS on duty_shift_documentations
ALTER TABLE public.duty_shift_documentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duty_shift_docs_select ON public.duty_shift_documentations;
CREATE POLICY duty_shift_docs_select ON public.duty_shift_documentations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
    OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
  );

DROP POLICY IF EXISTS duty_shift_docs_insert ON public.duty_shift_documentations;
CREATE POLICY duty_shift_docs_insert ON public.duty_shift_documentations
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.duty_shifts ds
        WHERE ds.id = duty_shift_id
        AND (
          ds.assigned_user_id = auth.uid()
          OR ds.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('ketua', 'sekretaris')
          )
          OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS duty_shift_docs_delete ON public.duty_shift_documentations;
CREATE POLICY duty_shift_docs_delete ON public.duty_shift_documentations
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('ketua', 'sekretaris')
    )
    OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
  );

-- 3. Enhance public.audit_events with metadata columns
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS actor_name_snapshot text;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'success';
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_audit_events_table ON public.audit_events(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);

-- 4. Update app_private.write_audit_event trigger function
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
  v_actor_name text;
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_desc text;
  v_sensitive_keys text[] := ARRAY['password', 'token', 'access_token', 'refresh_token', 'secret', 'service_role_key'];
BEGIN
  v_actor_id := (SELECT auth.uid());

  IF v_actor_id IS NOT NULL THEN
    SELECT u.email::text
    INTO v_actor_email
    FROM auth.users u
    WHERE u.id = v_actor_id;

    SELECT p.full_name::text
    INTO v_actor_name
    FROM public.profiles p
    WHERE p.id = v_actor_id;

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
    v_actor_name := 'Sistem Backend';
  ELSE
    v_actor_authority := 'system';
    v_actor_name := 'Sistem Otomatis';
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

  -- Generate human-friendly description
  v_desc := CASE
    WHEN tg_table_name = 'calendar_events' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat agenda: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui agenda: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus agenda: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'duty_shifts' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat jadwal piket posko tanggal ' || coalesce(v_new->>'shift_date', '')
        WHEN 'UPDATE' THEN 'Mengubah jadwal piket posko tanggal ' || coalesce(v_new->>'shift_date', '')
        WHEN 'DELETE' THEN 'Menghapus jadwal piket posko tanggal ' || coalesce(v_old->>'shift_date', '')
      END
    WHEN tg_table_name = 'duty_shift_documentations' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mengunggah foto dokumentasi piket posko'
        WHEN 'UPDATE' THEN 'Mengubah foto dokumentasi piket posko'
        WHEN 'DELETE' THEN 'Menghapus foto dokumentasi piket posko'
      END
    WHEN tg_table_name = 'work_programs' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan program kerja: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Mengubah program kerja: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus program kerja: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'tasks' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat tugas tim: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui tugas tim: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus tugas tim: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'finance_transactions' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mencatat transaksi ' || coalesce(v_new->>'transaction_type', '') || ': ' || coalesce(v_new->>'description', '')
        WHEN 'UPDATE' THEN 'Memperbarui transaksi keuangan: ' || coalesce(v_new->>'description', '')
        WHEN 'DELETE' THEN 'Menghapus transaksi keuangan: ' || coalesce(v_old->>'description', '')
      END
    WHEN tg_table_name = 'inventory_items' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan barang inventaris: ' || coalesce(v_new->>'item_name', '')
        WHEN 'UPDATE' THEN 'Mengubah data inventaris: ' || coalesce(v_new->>'item_name', '')
        WHEN 'DELETE' THEN 'Menghapus data inventaris: ' || coalesce(v_old->>'item_name', '')
      END
    WHEN tg_table_name = 'meetings' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menjadwalkan rapat: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Mengubah rapat: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus rapat: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'survey_responses' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mencatat survei warga: ' || coalesce(v_new->>'respondent_name', '')
        WHEN 'UPDATE' THEN 'Memperbarui data survei warga: ' || coalesce(v_new->>'respondent_name', '')
        WHEN 'DELETE' THEN 'Menghapus data survei warga'
      END
    WHEN tg_table_name = 'media_assets' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mengunggah dokumentasi kegiatan: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui dokumentasi kegiatan: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus dokumentasi kegiatan: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'documents' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mengunggah dokumen arsip: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui dokumen arsip: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus dokumen arsip: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'memberships' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan keanggotaan tim'
        WHEN 'UPDATE' THEN 'Mengubah role/status keanggotaan'
        WHEN 'DELETE' THEN 'Menghapus keanggotaan tim'
      END
    WHEN tg_table_name = 'invitations' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mengirim undangan anggota ke ' || coalesce(v_new->>'email', '')
        WHEN 'UPDATE' THEN 'Memperbarui status undangan'
        WHEN 'DELETE' THEN 'Mencabut undangan anggota'
      END
    ELSE
      lower(tg_op) || ' on ' || tg_table_name
  END;

  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    actor_name_snapshot,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    status,
    description
  )
  VALUES (
    v_actor_id,
    v_actor_email,
    v_actor_authority,
    v_actor_name,
    lower(tg_op),
    tg_table_name,
    v_id,
    v_old,
    v_new,
    'success',
    v_desc
  );

  IF tg_op = 'DELETE' THEN
    RETURN old;
  ELSE
    RETURN new;
  END IF;
END;
$function$;

-- 5. Attach audit triggers on duty_shifts and duty_shift_documentations
DROP TRIGGER IF EXISTS audit_duty_shifts ON public.duty_shifts;
CREATE TRIGGER audit_duty_shifts
  AFTER INSERT OR UPDATE OR DELETE ON public.duty_shifts
  FOR EACH ROW EXECUTE FUNCTION app_private.write_audit_event();

DROP TRIGGER IF EXISTS audit_duty_shift_documentations ON public.duty_shift_documentations;
CREATE TRIGGER audit_duty_shift_documentations
  AFTER INSERT OR UPDATE OR DELETE ON public.duty_shift_documentations
  FOR EACH ROW EXECUTE FUNCTION app_private.write_audit_event();

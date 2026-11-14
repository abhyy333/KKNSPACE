-- ====================================================================
-- PHASE D3 — RISK REGISTER FOR KKN SPACE
-- Operational Risk Management & Mitigation Tracking
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.kkn_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('operasional', 'keuangan', 'logistik', 'program_kerja', 'koordinasi', 'keselamatan', 'administrasi')),
  likelihood text NOT NULL DEFAULT 'medium' CHECK (likelihood IN ('low', 'medium', 'high')),
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  pic_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  mitigation_strategy text,
  target_date date,
  status text NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'mitigating', 'monitoring', 'resolved')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kkn_risks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kkn_risks TO authenticated;

DROP POLICY IF EXISTS kkn_risks_read_active_members ON public.kkn_risks;
CREATE POLICY kkn_risks_read_active_members ON public.kkn_risks
  FOR SELECT TO authenticated
  USING ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()));

DROP POLICY IF EXISTS kkn_risks_insert_active_members ON public.kkn_risks;
CREATE POLICY kkn_risks_insert_active_members ON public.kkn_risks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()));

DROP POLICY IF EXISTS kkn_risks_update_active_members ON public.kkn_risks;
CREATE POLICY kkn_risks_update_active_members ON public.kkn_risks
  FOR UPDATE TO authenticated
  USING ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()));

DROP POLICY IF EXISTS kkn_risks_delete_lead_only ON public.kkn_risks;
CREATE POLICY kkn_risks_delete_lead_only ON public.kkn_risks
  FOR DELETE TO authenticated
  USING ((SELECT app_private.is_super_admin()) OR (SELECT app_private.has_kkn_role('ketua')) OR (SELECT app_private.has_kkn_role('sekretaris')));

-- Migration: 20261114170000_kkn_timeline_and_roadmap.sql
-- Description: Creates kkn_timeline_settings and kkn_timeline_stages with RLS and initial seed data

CREATE TABLE IF NOT EXISTS public.kkn_timeline_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Timeline & Roadmap KKN',
  eyebrow text NOT NULL DEFAULT 'ROADMAP KKN',
  description text DEFAULT 'Perjalanan pengabdian mahasiswa Universitas Mataram di Desa Pringgasela Selatan.',
  location text DEFAULT 'Desa Pringgasela Selatan, Kec. Pringgasela, Lombok Timur',
  university_name text DEFAULT 'Universitas Mataram',
  academic_year text DEFAULT '2026',
  student_count integer DEFAULT 10,
  dpl_count integer DEFAULT 1,
  start_date date DEFAULT '2026-01-15',
  end_date date DEFAULT '2026-02-18',
  timezone text DEFAULT 'Asia/Makassar',
  hero_image_url text DEFAULT '/assets/village/goa_kopong_wisata_air.jpg',
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.kkn_timeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid REFERENCES public.kkn_timeline_settings(id) ON DELETE CASCADE,
  stage_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  slug text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  short_description text NOT NULL,
  detailed_description text,
  objectives text[] DEFAULT '{}',
  icon_type text DEFAULT 'preparation',
  illustration_url text,
  sort_order integer DEFAULT 0,
  confirmed_completed boolean DEFAULT false,
  is_published boolean DEFAULT true,
  related_program_ids uuid[] DEFAULT '{}',
  related_event_ids uuid[] DEFAULT '{}',
  related_doc_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.kkn_timeline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kkn_timeline_stages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'kkn_timeline_settings' AND policyname = 'Allow public read published timeline settings'
  ) THEN
    CREATE POLICY "Allow public read published timeline settings" ON public.kkn_timeline_settings 
    FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'kkn_timeline_settings' AND policyname = 'Allow admins and leaders manage timeline settings'
  ) THEN
    CREATE POLICY "Allow admins and leaders manage timeline settings" ON public.kkn_timeline_settings 
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()) 
      OR EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND role IN ('ketua', 'sekretaris') AND status = 'active')
    ) 
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()) 
      OR EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND role IN ('ketua', 'sekretaris') AND status = 'active')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'kkn_timeline_stages' AND policyname = 'Allow public read published timeline stages'
  ) THEN
    CREATE POLICY "Allow public read published timeline stages" ON public.kkn_timeline_stages 
    FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'kkn_timeline_stages' AND policyname = 'Allow admins and leaders manage timeline stages'
  ) THEN
    CREATE POLICY "Allow admins and leaders manage timeline stages" ON public.kkn_timeline_stages 
    FOR ALL TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()) 
      OR EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND role IN ('ketua', 'sekretaris') AND status = 'active')
    ) 
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()) 
      OR EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND role IN ('ketua', 'sekretaris') AND status = 'active')
    );
  END IF;
END $$;

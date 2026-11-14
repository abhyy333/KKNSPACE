-- ============================================================================
-- MIGRATION: 20261114220000_sponsors_and_partners_management.sql
-- KKN SPACE — Sponsors & Partners Management (Pipeline, Directory, Showcase)
-- ============================================================================

-- 1. Create table for sponsors and partners
CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('sponsor_utama', 'sponsor_pendukung', 'sponsor_produk', 'media_partner', 'mitra_kolaborasi')),
  contribution_type text NOT NULL CHECK (contribution_type IN ('finansial', 'produk_barang', 'konsumsi', 'peralatan', 'jasa_layanan', 'dukungan_publikasi', 'lainnya')),
  contribution_description text,
  description text,
  logo_file_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  website_url text,
  social_media_url text,
  start_date date,
  end_date date,
  partnership_status text NOT NULL DEFAULT 'prospek' CHECK (partnership_status IN ('prospek', 'dihubungi', 'negosiasi', 'dikonfirmasi', 'selesai', 'tidak_dilanjutkan')),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'pending_approval', 'published', 'withdrawn', 'rejected')),
  publication_rejection_reason text,
  display_order integer NOT NULL DEFAULT 0,
  pic_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  first_contact_date date,
  last_contact_date date,
  next_follow_up_date date,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) REFERENCES public.profiles(id),
  approved_by uuid REFERENCES auth.users(id) REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sponsors_publication ON public.sponsors(publication_status, is_archived, display_order);
CREATE INDEX IF NOT EXISTS idx_sponsors_partnership ON public.sponsors(partnership_status);
CREATE INDEX IF NOT EXISTS idx_sponsors_category ON public.sponsors(category);
CREATE INDEX IF NOT EXISTS idx_sponsors_logo ON public.sponsors(logo_file_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_pic ON public.sponsors(pic_user_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_follow_up ON public.sponsors(next_follow_up_date);

-- 2. Create table for sponsor communications / follow-ups
CREATE TABLE IF NOT EXISTS public.sponsor_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) REFERENCES public.profiles(id),
  action_summary text NOT NULL,
  communication_result text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_comms_sponsor ON public.sponsor_communications(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_comms_user ON public.sponsor_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_comms_follow_up ON public.sponsor_communications(follow_up_date);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_communications ENABLE ROW LEVEL SECURITY;

-- Helper function for sponsor management permission
CREATE OR REPLACE FUNCTION app_private.can_manage_sponsors()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog'
AS $$
  SELECT (
    app_private.is_super_admin()
    OR app_private.has_kkn_role('ketua')
    OR app_private.has_kkn_role('sekretaris')
  );
$$;

-- RLS on public.sponsors
CREATE POLICY sponsors_select ON public.sponsors
  FOR SELECT TO authenticated
  USING (
    app_private.can_manage_sponsors()
  );

CREATE POLICY sponsors_insert ON public.sponsors
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.can_manage_sponsors()
    AND created_by = auth.uid()
    AND (
      app_private.is_super_admin()
      OR publication_status IN ('draft', 'pending_approval')
    )
  );

CREATE POLICY sponsors_update ON public.sponsors
  FOR UPDATE TO authenticated
  USING (
    app_private.can_manage_sponsors()
  )
  WITH CHECK (
    app_private.can_manage_sponsors()
    AND (
      app_private.is_super_admin()
      OR publication_status IN ('draft', 'pending_approval', 'rejected')
    )
  );

CREATE POLICY sponsors_delete ON public.sponsors
  FOR DELETE TO authenticated
  USING (
    app_private.is_super_admin()
  );

-- RLS on public.sponsor_communications
CREATE POLICY sponsor_comms_select ON public.sponsor_communications
  FOR SELECT TO authenticated
  USING (
    app_private.can_manage_sponsors()
  );

CREATE POLICY sponsor_comms_insert ON public.sponsor_communications
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.can_manage_sponsors()
    AND user_id = auth.uid()
  );

CREATE POLICY sponsor_comms_update ON public.sponsor_communications
  FOR UPDATE TO authenticated
  USING (
    app_private.is_super_admin() OR user_id = auth.uid()
  )
  WITH CHECK (
    app_private.is_super_admin() OR user_id = auth.uid()
  );

CREATE POLICY sponsor_comms_delete ON public.sponsor_communications
  FOR DELETE TO authenticated
  USING (
    app_private.is_super_admin() OR user_id = auth.uid()
  );

-- Function for public showcase
CREATE OR REPLACE FUNCTION public.get_public_sponsors()
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  contribution_type text,
  contribution_description text,
  description text,
  logo_file_id uuid,
  website_url text,
  social_media_url text,
  start_date date,
  end_date date,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
  SELECT
    s.id,
    s.name,
    s.category,
    s.contribution_type,
    s.contribution_description,
    s.description,
    s.logo_file_id,
    s.website_url,
    s.social_media_url,
    s.start_date,
    s.end_date,
    s.display_order
  FROM public.sponsors s
  WHERE s.publication_status = 'published'
    AND s.is_archived = false
    AND (s.start_date IS NULL OR s.start_date <= (now() AT TIME ZONE 'Asia/Makassar')::date)
    AND (s.end_date IS NULL OR s.end_date >= (now() AT TIME ZONE 'Asia/Makassar')::date)
  ORDER BY
    CASE s.category
      WHEN 'sponsor_utama' THEN 1
      WHEN 'sponsor_pendukung' THEN 2
      WHEN 'sponsor_produk' THEN 3
      WHEN 'media_partner' THEN 4
      WHEN 'mitra_kolaborasi' THEN 5
      ELSE 6
    END ASC,
    s.display_order ASC,
    s.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_sponsors() TO anon, authenticated;

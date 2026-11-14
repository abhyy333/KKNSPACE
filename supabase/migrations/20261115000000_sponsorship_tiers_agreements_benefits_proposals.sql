-- Migration: 20261115000000_sponsorship_tiers_agreements_benefits_proposals.sql
-- Description: Implement complete Sponsor & Partners Management System:
--   1. Sponsorship Package templates (Diamond, Platinum, Gold, Silver, Custom)
--   2. Sponsor Agreements with immutable package snapshots
--   3. Sponsor Benefit Fulfillment Tracker
--   4. Manual Template-Based Sponsor Proposal Generator (NO AI)
--   5. Central Admin Activity Log integration

-- 1. Create sponsorship_packages table
CREATE TABLE IF NOT EXISTS public.sponsorship_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  description TEXT NOT NULL,
  default_benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  public_visibility BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed initial standard packages
INSERT INTO public.sponsorship_packages (tier_key, display_name, badge_label, description, default_benefits, display_order, is_active, public_visibility)
VALUES 
  (
    'diamond',
    'Diamond Partnership',
    'Diamond Partner',
    'Kemitraan strategis tingkat premier dengan apresiasi paling terkemuka pada seluruh media KKN SPACE dan kegiatan posko.',
    '["Penempatan logo utama pada Beranda KKN SPACE", "Penempatan logo paling terkemuka pada direktori resmi /sponsors", "Penempatan logo prioritas pada bilah footer publik", "Publikasi apresiasi khusus pada dokumentasi kegiatan", "Logo pada materi cetak dan publikasi spanduk posko utama", "Apresiasi khusus dan sambutan pada acara puncak pengabdian"]'::jsonb,
    1,
    true,
    true
  ),
  (
    'platinum',
    'Platinum Partnership',
    'Platinum Partner',
    'Kemitraan tingkat premium dengan apresiasi komprehensif pada portal digital dan materi publikasi kegiatan.',
    '["Penempatan logo ukuran besar pada direktori resmi /sponsors", "Posisi prioritas pada kategori mitra terkait", "Publikasi apresiasi khusus dalam galeri kegiatan", "Logo pada materi spanduk kegiatan dan media sosial", "Pencantuman identitas mitra pada laporan akhir KKN"]'::jsonb,
    2,
    true,
    true
  ),
  (
    'gold',
    'Gold Partnership',
    'Gold Partner',
    'Dukungan kemitraan penting yang menunjang operasional dan realisasi program unggulan posko.',
    '["Logo resmi pada direktori mitra /sponsors", "Pencantuman nama mitra dalam publikasi apresiasi kolektif", "Logo pada materi publikasi kegiatan terkait", "Sertifikat penghargaan kemitraan resmi KKN"]'::jsonb,
    3,
    true,
    true
  ),
  (
    'silver',
    'Silver Partnership',
    'Silver Partner',
    'Dukungan gotong royong dan kontribusi penunjang pengabdian masyarakat di Desa Pringgasela Selatan.',
    '["Pencantuman logo dan nama pada direktori mitra KKN", "Pencantuman nama pada rilis apresiasi kolektif", "Sertifikat penghargaan kemitraan resmi KKN"]'::jsonb,
    4,
    true,
    true
  ),
  (
    'custom',
    'Custom Partnership',
    'Mitra Kolaborasi Khusus',
    'Kolaborasi fleksibel yang disesuaikan secara khusus sesuai kesepakatan kontribusi barang, jasa, media, atau program.',
    '["Bentuk apresiasi dan publikasi disesuaikan dengan nota kesepakatan", "Dukungan publikasi media dan dokumentasi desa", "Pencantuman profil pada direktori mitra resmi"]'::jsonb,
    5,
    true,
    true
  )
ON CONFLICT (tier_key) DO NOTHING;

-- Extend sponsors table
ALTER TABLE public.sponsors 
  ADD COLUMN IF NOT EXISTS tier_key TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL;

-- 2. Create sponsor_agreements table
CREATE TABLE IF NOT EXISTS public.sponsor_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL,
  tier_key TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  agreed_financial_contribution NUMERIC DEFAULT 0,
  estimated_non_financial_value NUMERIC DEFAULT 0,
  contribution_format_summary TEXT,
  payment_schedule TEXT,
  start_date DATE,
  end_date DATE,
  special_terms TEXT,
  agreement_status TEXT NOT NULL DEFAULT 'draft' CHECK (agreement_status IN ('draft', 'negotiation', 'confirmed', 'active', 'completed', 'terminated')),
  package_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_date DATE,
  pic_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  finance_transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Create sponsor_benefit_fulfillments table
CREATE TABLE IF NOT EXISTS public.sponsor_benefit_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.sponsor_agreements(id) ON DELETE CASCADE,
  benefit_title TEXT NOT NULL,
  benefit_description TEXT,
  responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_date DATE,
  fulfillment_status TEXT NOT NULL DEFAULT 'belum_dijadwalkan' CHECK (fulfillment_status IN ('belum_dijadwalkan', 'direncanakan', 'dalam_proses', 'terpenuhi', 'tidak_dapat_dipenuhi', 'dibatalkan')),
  fulfillment_notes TEXT,
  proof_attachment_file_id UUID,
  proof_url TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Create sponsor_proposals table
CREATE TABLE IF NOT EXISTS public.sponsor_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL,
  proposal_number TEXT NOT NULL UNIQUE,
  recipient_organization TEXT NOT NULL,
  recipient_pic_name TEXT,
  tier_key TEXT NOT NULL DEFAULT 'custom',
  proposal_title TEXT NOT NULL,
  package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL,
  requested_contribution_summary TEXT,
  proposal_content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent', 'negotiation', 'accepted', 'rejected', 'expired')),
  sent_at DATE,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS on new tables
ALTER TABLE public.sponsorship_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_benefit_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_proposals ENABLE ROW LEVEL SECURITY;

-- sponsorship_packages policies
CREATE POLICY "Public can view active visible packages"
  ON public.sponsorship_packages
  FOR SELECT
  USING (is_active = true AND public_visibility = true);

CREATE POLICY "Managers can view all packages"
  ON public.sponsorship_packages
  FOR SELECT
  TO authenticated
  USING (app_private.can_manage_sponsors());

CREATE POLICY "Super admins can manage packages"
  ON public.sponsorship_packages
  FOR ALL
  TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

-- sponsor_agreements policies
CREATE POLICY "Managers can view sponsor agreements"
  ON public.sponsor_agreements
  FOR SELECT
  TO authenticated
  USING (app_private.can_manage_sponsors());

CREATE POLICY "Managers can insert sponsor agreements"
  ON public.sponsor_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Managers can update sponsor agreements"
  ON public.sponsor_agreements
  FOR UPDATE
  TO authenticated
  USING (app_private.can_manage_sponsors())
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Super admins can delete sponsor agreements"
  ON public.sponsor_agreements
  FOR DELETE
  TO authenticated
  USING (app_private.is_super_admin());

-- sponsor_benefit_fulfillments policies
CREATE POLICY "Managers can view benefit fulfillments"
  ON public.sponsor_benefit_fulfillments
  FOR SELECT
  TO authenticated
  USING (app_private.can_manage_sponsors());

CREATE POLICY "Managers can insert benefit fulfillments"
  ON public.sponsor_benefit_fulfillments
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Managers can update benefit fulfillments"
  ON public.sponsor_benefit_fulfillments
  FOR UPDATE
  TO authenticated
  USING (app_private.can_manage_sponsors())
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Super admins can delete benefit fulfillments"
  ON public.sponsor_benefit_fulfillments
  FOR DELETE
  TO authenticated
  USING (app_private.is_super_admin());

-- sponsor_proposals policies
CREATE POLICY "Managers can view sponsor proposals"
  ON public.sponsor_proposals
  FOR SELECT
  TO authenticated
  USING (app_private.can_manage_sponsors());

CREATE POLICY "Managers can insert sponsor proposals"
  ON public.sponsor_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Managers can update sponsor proposals"
  ON public.sponsor_proposals
  FOR UPDATE
  TO authenticated
  USING (app_private.can_manage_sponsors())
  WITH CHECK (app_private.can_manage_sponsors());

CREATE POLICY "Super admins can delete sponsor proposals"
  ON public.sponsor_proposals
  FOR DELETE
  TO authenticated
  USING (app_private.is_super_admin());

-- Public RPCs
CREATE OR REPLACE FUNCTION public.get_public_sponsors_v2()
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  tier_key TEXT,
  contribution_type TEXT,
  contribution_description TEXT,
  description TEXT,
  logo_file_id UUID,
  website_url TEXT,
  social_media_url TEXT,
  start_date DATE,
  end_date DATE,
  display_order INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    s.id,
    s.name,
    s.category,
    coalesce(s.tier_key, 'none') AS tier_key,
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
  ORDER BY s.display_order ASC, s.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_sponsors_v2() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_sponsorship_packages()
RETURNS TABLE (
  id UUID,
  tier_key TEXT,
  display_name TEXT,
  badge_label TEXT,
  description TEXT,
  default_benefits JSONB,
  display_order INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    p.id,
    p.tier_key,
    p.display_name,
    p.badge_label,
    p.description,
    p.default_benefits,
    p.display_order
  FROM public.sponsorship_packages p
  WHERE p.is_active = true
    AND p.public_visibility = true
  ORDER BY p.display_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_sponsorship_packages() TO anon, authenticated;

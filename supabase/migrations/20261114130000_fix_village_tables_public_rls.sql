-- Migration: Fix public read RLS policy on village tables
-- Separate public read (is_published = true) from super admin draft read to eliminate permission denied on system_admins

BEGIN;

-- 1. Village Profiles
DROP POLICY IF EXISTS "Public can read published village_profiles" ON public.village_profiles;
DROP POLICY IF EXISTS "Super Admins can read all village_profiles" ON public.village_profiles;
CREATE POLICY "Public can read published village_profiles"
  ON public.village_profiles FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_profiles"
  ON public.village_profiles FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

-- 2. Village Dusuns
DROP POLICY IF EXISTS "Public can read published village_dusuns" ON public.village_dusuns;
DROP POLICY IF EXISTS "Super Admins can read all village_dusuns" ON public.village_dusuns;
CREATE POLICY "Public can read published village_dusuns"
  ON public.village_dusuns FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_dusuns"
  ON public.village_dusuns FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

-- 3. Village Destinations
DROP POLICY IF EXISTS "Public can read published village_destinations" ON public.village_destinations;
DROP POLICY IF EXISTS "Super Admins can read all village_destinations" ON public.village_destinations;
CREATE POLICY "Public can read published village_destinations"
  ON public.village_destinations FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_destinations"
  ON public.village_destinations FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

-- 4. Village Cultural Heritages
DROP POLICY IF EXISTS "Public can read published village_cultural_heritages" ON public.village_cultural_heritages;
DROP POLICY IF EXISTS "Super Admins can read all village_cultural_heritages" ON public.village_cultural_heritages;
CREATE POLICY "Public can read published village_cultural_heritages"
  ON public.village_cultural_heritages FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_cultural_heritages"
  ON public.village_cultural_heritages FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

-- 5. Village Economic Potentials
DROP POLICY IF EXISTS "Public can read published village_economic_potentials" ON public.village_economic_potentials;
DROP POLICY IF EXISTS "Super Admins can read all village_economic_potentials" ON public.village_economic_potentials;
CREATE POLICY "Public can read published village_economic_potentials"
  ON public.village_economic_potentials FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_economic_potentials"
  ON public.village_economic_potentials FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

-- 6. Village Gallery Items
DROP POLICY IF EXISTS "Public can read published village_gallery_items" ON public.village_gallery_items;
DROP POLICY IF EXISTS "Super Admins can read all village_gallery_items" ON public.village_gallery_items;
CREATE POLICY "Public can read published village_gallery_items"
  ON public.village_gallery_items FOR SELECT
  TO public
  USING (is_published = true);
CREATE POLICY "Super Admins can read all village_gallery_items"
  ON public.village_gallery_items FOR SELECT
  TO authenticated
  USING (app_private.is_super_admin());

COMMIT;

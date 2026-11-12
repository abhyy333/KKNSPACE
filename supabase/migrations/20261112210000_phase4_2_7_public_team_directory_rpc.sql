-- Bugfix Phase 4.2.7: Public Team Page Data Source Integration
-- Exposes non-sensitive active directory fields from public.kkn_team_directory
-- for the unauthenticated /tim portal without loosening table RLS or leaking PII.

CREATE OR REPLACE FUNCTION public.get_public_team_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  study_program text,
  academic_status text,
  position_label text,
  role text,
  division text,
  has_photo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    d.id,
    d.full_name,
    d.study_program,
    d.academic_status,
    d.position_label,
    d.role,
    d.division,
    (d.photo_file_id IS NOT NULL OR d.photo_path IS NOT NULL) AS has_photo
  FROM public.kkn_team_directory AS d
  WHERE d.is_active = true
  ORDER BY
    CASE d.role
      WHEN 'dpl' THEN 1
      WHEN 'ketua' THEN 2
      WHEN 'sekretaris' THEN 3
      WHEN 'bendahara' THEN 4
      ELSE 5
    END,
    d.full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_team_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_team_directory() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_team_directory() IS
  'Returns non-sensitive active KKN team directory profiles for the public /tim portal without exposing NIM, phone numbers, emails, linked user IDs, or private storage paths.';

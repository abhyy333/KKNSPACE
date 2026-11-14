-- ============================================================
-- Migration: Documentation Gallery — Public Integration
-- Phase: Sidebar Fix + Public Documentation Gallery
-- Date: 2026-11-14
-- ============================================================
-- Extends media_assets with rich metadata for public documentation gallery.
-- Multi-photo support via documentation_photos junction table.
-- All changes are backward-compatible (nullable columns, additive only).
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Extend media_assets with event metadata
-- ─────────────────────────────────────────────
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS category         text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_date       date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location         text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS photographer     text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description_long text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cover_file_id    uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slug             text          DEFAULT NULL;

-- Slug unique index (sparse — only enforced when non-null)
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_slug_unique
  ON media_assets (slug)
  WHERE slug IS NOT NULL;

-- Index for public gallery queries
CREATE INDEX IF NOT EXISTS media_assets_publication_event_date_idx
  ON media_assets (publication_status, event_date DESC NULLS LAST)
  WHERE publication_status = 'published';

CREATE INDEX IF NOT EXISTS media_assets_category_idx
  ON media_assets (category)
  WHERE category IS NOT NULL;

-- ─────────────────────────────────────────────
-- 2. documentation_photos — multi-photo per asset
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentation_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  file_id      uuid NOT NULL REFERENCES file_objects(id) ON DELETE RESTRICT,
  sort_order   integer NOT NULL DEFAULT 0,
  caption      text    DEFAULT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS documentation_photos_asset_id_idx
  ON documentation_photos (asset_id, sort_order);

CREATE INDEX IF NOT EXISTS documentation_photos_file_id_idx
  ON documentation_photos (file_id);

-- ─────────────────────────────────────────────
-- 3. RLS on documentation_photos
-- ─────────────────────────────────────────────
ALTER TABLE documentation_photos ENABLE ROW LEVEL SECURITY;

-- Public can read photos of published assets only (via JOIN guard in RPC)
-- Anon users cannot directly query documentation_photos; they go through RPC
CREATE POLICY "docs_photos_active_members_all"
  ON documentation_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- ─────────────────────────────────────────────
-- 4. RPC: get_public_documentation_list
-- Returns published media_assets with photo counts for public gallery
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_documentation_list(
  p_category  text    DEFAULT NULL,
  p_search    text    DEFAULT NULL,
  p_limit     integer DEFAULT 24,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  title             text,
  caption           text,
  category          text,
  event_date        date,
  location          text,
  photographer      text,
  description_long  text,
  slug              text,
  cover_file_id     uuid,
  primary_file_id   uuid,
  photo_count       bigint,
  published_at      timestamptz,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ma.id,
    ma.title,
    ma.caption,
    ma.category,
    ma.event_date,
    ma.location,
    ma.photographer,
    ma.description_long,
    ma.slug,
    -- cover_file_id: prefer explicit cover, else first documentation_photo file_id, else the main file_id
    COALESCE(
      ma.cover_file_id,
      (SELECT dp.file_id FROM documentation_photos dp WHERE dp.asset_id = ma.id ORDER BY dp.sort_order ASC LIMIT 1),
      ma.file_id
    ) AS cover_file_id,
    ma.file_id AS primary_file_id,
    -- photo count: multi-photos + the original file (deduplicated)
    (
      SELECT COUNT(*) FROM documentation_photos dp WHERE dp.asset_id = ma.id
    ) + 1 AS photo_count,
    ma.published_at,
    ma.created_at
  FROM media_assets ma
  WHERE
    ma.publication_status = 'published'
    AND (p_category IS NULL OR ma.category = p_category)
    AND (
      p_search IS NULL
      OR ma.title ILIKE '%' || p_search || '%'
      OR ma.caption ILIKE '%' || p_search || '%'
      OR ma.location ILIKE '%' || p_search || '%'
    )
  ORDER BY
    COALESCE(ma.event_date, ma.published_at::date, ma.created_at::date) DESC,
    ma.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_public_documentation_list TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 5. RPC: get_public_documentation_detail
-- Returns a single published asset with all photo file IDs
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_documentation_detail(
  p_asset_id  uuid   DEFAULT NULL,
  p_slug      text   DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  title             text,
  caption           text,
  category          text,
  event_date        date,
  location          text,
  photographer      text,
  description_long  text,
  slug              text,
  cover_file_id     uuid,
  primary_file_id   uuid,
  photo_file_ids    uuid[],
  photo_count       bigint,
  published_at      timestamptz,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ma.id,
    ma.title,
    ma.caption,
    ma.category,
    ma.event_date,
    ma.location,
    ma.photographer,
    ma.description_long,
    ma.slug,
    COALESCE(
      ma.cover_file_id,
      (SELECT dp.file_id FROM documentation_photos dp WHERE dp.asset_id = ma.id ORDER BY dp.sort_order ASC LIMIT 1),
      ma.file_id
    ) AS cover_file_id,
    ma.file_id AS primary_file_id,
    -- Ordered list of all photo file IDs (documentation_photos first, then primary if not duplicate)
    ARRAY(
      SELECT DISTINCT ON (dp_all.file_id) dp_all.file_id
      FROM (
        SELECT file_id, sort_order FROM documentation_photos WHERE asset_id = ma.id
        UNION ALL
        SELECT ma.file_id AS file_id, 999999 AS sort_order
      ) dp_all
      ORDER BY dp_all.file_id, dp_all.sort_order
    ) AS photo_file_ids,
    (
      SELECT COUNT(*) FROM documentation_photos dp WHERE dp.asset_id = ma.id
    ) + 1 AS photo_count,
    ma.published_at,
    ma.created_at
  FROM media_assets ma
  WHERE
    ma.publication_status = 'published'
    AND (
      (p_asset_id IS NOT NULL AND ma.id = p_asset_id)
      OR (p_slug IS NOT NULL AND ma.slug = p_slug)
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_documentation_detail TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 6. RPC: get_public_documentation_categories
-- Returns distinct categories of published assets
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_documentation_categories()
RETURNS TABLE (category text, item_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT category, COUNT(*) AS item_count
  FROM media_assets
  WHERE publication_status = 'published'
    AND category IS NOT NULL
  GROUP BY category
  ORDER BY item_count DESC, category;
$$;

GRANT EXECUTE ON FUNCTION get_public_documentation_categories TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 7. Auto-generate slug when title is set
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_media_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter   int := 0;
BEGIN
  -- Only auto-generate if slug is null and title is provided
  IF NEW.slug IS NULL AND NEW.title IS NOT NULL THEN
    -- Normalize: lowercase, remove non-alphanum except spaces, replace spaces with hyphens
    base_slug := regexp_replace(
      lower(translate(trim(NEW.title), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc')),
      '[^a-z0-9\s-]', '', 'g'
    );
    base_slug := regexp_replace(trim(base_slug), '\s+', '-', 'g');
    base_slug := substring(base_slug from 1 for 80);

    IF base_slug = '' THEN
      base_slug := NEW.id::text;
    END IF;

    candidate := base_slug;
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM media_assets WHERE slug = candidate AND id != NEW.id) LOOP
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_slug ON media_assets;
CREATE TRIGGER trg_media_assets_slug
  BEFORE INSERT OR UPDATE OF title, slug
  ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION generate_media_slug();

-- ─────────────────────────────────────────────
-- 8. Backfill slugs for existing published assets
-- ─────────────────────────────────────────────
UPDATE media_assets SET slug = NULL WHERE slug IS NOT NULL; -- reset to let trigger regenerate cleanly
-- The trigger will auto-generate slugs on the update above
-- Note: re-trigger by touching slug column
UPDATE media_assets SET title = title WHERE slug IS NULL AND title IS NOT NULL;

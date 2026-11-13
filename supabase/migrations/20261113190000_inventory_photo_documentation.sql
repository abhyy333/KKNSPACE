-- Migration: 20261113190000_inventory_photo_documentation.sql
-- Description: Multi-photo documentation system for inventory items with condition timelines, acquisition proofs, and end-of-kkn reconciliation comparison.

-- 1. Create public.inventory_photos table
CREATE TABLE IF NOT EXISTS public.inventory_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.file_objects(id) ON DELETE RESTRICT,
    storage_path TEXT NOT NULL,
    photo_type TEXT NOT NULL DEFAULT 'general' CHECK (photo_type IN ('primary', 'front', 'back_side', 'spec_serial', 'condition', 'accessories', 'general')),
    documentation_category TEXT NOT NULL DEFAULT 'kondisi_awal' CHECK (documentation_category IN ('kondisi_awal', 'pembelian', 'perpindahan', 'kerusakan', 'pengembalian', 'kondisi_akhir', 'kelengkapan')),
    condition_snapshot TEXT CHECK (condition_snapshot IN ('new', 'good', 'fair', 'damaged', 'lost')),
    caption TEXT,
    documentation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploader_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_photos_item_id ON public.inventory_photos(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_photos_category ON public.inventory_photos(documentation_category);
CREATE INDEX IF NOT EXISTS idx_inventory_photos_primary ON public.inventory_photos(item_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_inventory_photos_file_id ON public.inventory_photos(file_id);

ALTER TABLE public.inventory_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_photos' AND policyname = 'inventory_photos_read_active_members'
    ) THEN
        CREATE POLICY inventory_photos_read_active_members ON public.inventory_photos
            FOR SELECT
            TO authenticated
            USING (
                (SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin())
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_photos' AND policyname = 'inventory_photos_insert_active_members'
    ) THEN
        CREATE POLICY inventory_photos_insert_active_members ON public.inventory_photos
            FOR INSERT
            TO authenticated
            WITH CHECK (
                ((SELECT app_private.is_active_member()) OR (SELECT app_private.is_super_admin()))
                AND (uploaded_by IS NULL OR uploaded_by = (SELECT auth.uid()))
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_photos' AND policyname = 'inventory_photos_update_authorized'
    ) THEN
        CREATE POLICY inventory_photos_update_authorized ON public.inventory_photos
            FOR UPDATE
            TO authenticated
            USING (
                (SELECT app_private.is_super_admin())
                OR uploaded_by = (SELECT auth.uid())
            )
            WITH CHECK (
                (SELECT app_private.is_super_admin())
                OR uploaded_by = (SELECT auth.uid())
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_photos' AND policyname = 'inventory_photos_delete_authorized'
    ) THEN
        CREATE POLICY inventory_photos_delete_authorized ON public.inventory_photos
            FOR DELETE
            TO authenticated
            USING (
                (SELECT app_private.is_super_admin())
                OR uploaded_by = (SELECT auth.uid())
            );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_inventory_primary_photo(
    p_photo_id UUID
)
RETURNS public.inventory_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_photo public.inventory_photos;
    v_item_id UUID;
BEGIN
    IF NOT (app_private.is_active_member() OR app_private.is_super_admin()) THEN
        RAISE EXCEPTION 'Forbidden: active KKN membership required.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_photo
    FROM public.inventory_photos
    WHERE id = p_photo_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Foto inventaris tidak ditemukan.'
            USING ERRCODE = 'P0002';
    END IF;

    v_item_id := v_photo.item_id;

    -- Reset previous primary photos for this item
    UPDATE public.inventory_photos
    SET is_primary = false, updated_at = timezone('utc', now())
    WHERE item_id = v_item_id AND is_primary = true;

    -- Set this photo as primary
    UPDATE public.inventory_photos
    SET is_primary = true, updated_at = timezone('utc', now())
    WHERE id = p_photo_id
    RETURNING * INTO v_photo;

    -- Sync to inventory_items.photo_file_id
    UPDATE public.inventory_items
    SET photo_file_id = v_photo.file_id, updated_at = timezone('utc', now())
    WHERE id = v_item_id;

    RETURN v_photo;
END;
$$;

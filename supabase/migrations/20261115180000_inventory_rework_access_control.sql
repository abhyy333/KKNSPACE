-- ==============================================================================
-- KKN SPACE — INVENTARIS BARANG: REWORK & ACCESS CONTROL
-- Migration: 20261115180000_inventory_rework_access_control.sql
-- Description:
-- 1. Expands inventory_movements movement_type check constraint for full activity audit.
-- 2. Hardens trigger protect_inventory_item_mutation on inventory_items.
--    - Enforces auth.uid() ownership for PERSONAL_OWNED.
--    - Enforces Ketua / Sekretaris / Super Admin authority for non-personal items.
--    - Prevents Ketua / Sekretaris from modifying or deleting other members' personal items.
-- 3. Hardens trigger protect_inventory_photo_mutation on inventory_photos.
--    - Enforces that only the genuine item owner or Super Admin can mutate photos of PERSONAL_OWNED items.
--    - Enforces that only Ketua / Sekretaris / Super Admin can mutate photos of non-personal items.
-- 4. Hardens archive_inventory_item and restore_inventory_item RPCs.
-- ==============================================================================

-- 1. Expand inventory_movements movement_type constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_movement_type_check'
  ) THEN
    ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_movement_type_check;
  END IF;
END $$;

ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_movement_type_check
CHECK (movement_type = ANY (ARRAY[
  'in'::text,
  'out'::text,
  'borrow'::text,
  'return'::text,
  'adjustment'::text,
  'archived'::text,
  'restored'::text,
  'updated'::text,
  'photo_added'::text,
  'photo_removed'::text,
  'photo_updated'::text,
  'location_changed'::text,
  'condition_changed'::text,
  'transfer'::text,
  'reconciliation'::text
]));

-- 1b. Ensure inventory_movements.user_id references profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_user_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements 
    ADD CONSTRAINT inventory_movements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Item mutation protection function & trigger
CREATE OR REPLACE FUNCTION public.protect_inventory_item_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_super_admin boolean := false;
  v_is_core_leader boolean := false;
  v_user_name text;
BEGIN
  v_user_id := auth.uid();

  -- Background/service role bypass
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check Super Admin
  v_is_super_admin := public.is_super_admin_v2();

  -- Check Ketua or Sekretaris
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id
      AND role IN ('ketua', 'sekretaris')
      AND status = 'active'
  ) INTO v_is_core_leader;

  -- Profile full name fallback
  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- INSERT OPERATION
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := v_user_id;

    -- PERSONAL_OWNED items
    IF NEW.ownership_type = 'PERSONAL_OWNED' THEN
      -- Automatically bind owner_member_id to the authenticating user
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        NEW.owner_member_id := v_user_id;
        IF NEW.owner_name IS NULL OR TRIM(NEW.owner_name) = '' THEN
          NEW.owner_name := COALESCE(v_user_name, 'Anggota KKN');
        END IF;
      ELSE
        -- Admin / Leaders can register for a member, but default to caller if empty
        IF NEW.owner_member_id IS NULL THEN
          NEW.owner_member_id := v_user_id;
        END IF;
        IF NEW.owner_name IS NULL OR TRIM(NEW.owner_name) = '' THEN
          SELECT full_name INTO NEW.owner_name
          FROM public.profiles
          WHERE id = NEW.owner_member_id;
          IF NEW.owner_name IS NULL THEN
            NEW.owner_name := COALESCE(v_user_name, 'Anggota KKN');
          END IF;
        END IF;
      END IF;
    ELSE
      -- Non-personal items (GROUP_OWNED, BORROWED_EXTERNAL, DONATED)
      -- Only Super Admin or Core Leaders (Ketua, Sekretaris) may register
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat mendaftarkan aset kelompok, pinjaman, atau hibah.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE OPERATION
  IF TG_OP = 'UPDATE' THEN
    -- Prevent altering created_by
    NEW.created_by := OLD.created_by;

    -- If personal item: only owner or Super Admin may update
    IF OLD.ownership_type = 'PERSONAL_OWNED' THEN
      IF NOT v_is_super_admin AND (OLD.owner_member_id IS DISTINCT FROM v_user_id) THEN
        RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat memperbarui barang pribadi milik Anda sendiri.';
      END IF;
    ELSE
      -- If non-personal: only Super Admin or Ketua/Sekretaris may update
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat memperbarui barang inventaris non-pribadi.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE OPERATION
  IF TG_OP = 'DELETE' THEN
    -- If personal item: only owner or Super Admin may delete/archive
    IF OLD.ownership_type = 'PERSONAL_OWNED' THEN
      IF NOT v_is_super_admin AND (OLD.owner_member_id IS DISTINCT FROM v_user_id) THEN
        RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat menghapus barang pribadi milik Anda sendiri.';
      END IF;
    ELSE
      -- If non-personal: only Super Admin or Ketua/Sekretaris may delete
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat menghapus barang non-pribadi.';
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_inventory_item_mutation ON public.inventory_items;
CREATE TRIGGER trg_protect_inventory_item_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_inventory_item_mutation();

-- 3. Photo mutation protection function & trigger
CREATE OR REPLACE FUNCTION public.protect_inventory_photo_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_super_admin boolean := false;
  v_is_core_leader boolean := false;
  v_parent_item public.inventory_items%ROWTYPE;
  v_target_item_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_target_item_id := COALESCE(NEW.item_id, OLD.item_id);

  SELECT * INTO v_parent_item
  FROM public.inventory_items
  WHERE id = v_target_item_id;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_is_super_admin := public.is_super_admin_v2();

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id
      AND role IN ('ketua', 'sekretaris')
      AND status = 'active'
  ) INTO v_is_core_leader;

  -- Check ownership of parent item
  IF v_parent_item.ownership_type = 'PERSONAL_OWNED' THEN
    IF NOT v_is_super_admin AND (v_parent_item.owner_member_id IS DISTINCT FROM v_user_id) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya pemilik barang atau Super Admin yang dapat mengelola foto barang pribadi.';
    END IF;
  ELSE
    IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat mengelola foto barang inventaris non-pribadi.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.uploaded_by := v_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_inventory_photo_mutation ON public.inventory_photos;
CREATE TRIGGER trg_protect_inventory_photo_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_inventory_photo_mutation();

-- 4. Secure archive & restore RPCs
CREATE OR REPLACE FUNCTION public.archive_inventory_item(
  p_item_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_item record;
  v_is_super_admin boolean := false;
  v_is_core_leader boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk mengarsipkan barang.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  IF v_item.is_archived THEN
    RAISE EXCEPTION 'Barang ini sudah berada dalam arsip.';
  END IF;

  v_is_super_admin := public.is_super_admin_v2();

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id
      AND role IN ('ketua', 'sekretaris')
      AND status = 'active'
  ) INTO v_is_core_leader;

  IF v_item.ownership_type = 'PERSONAL_OWNED' THEN
    IF NOT v_is_super_admin AND (v_item.owner_member_id IS DISTINCT FROM v_user_id) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya pemilik barang atau Super Admin yang dapat mengarsipkan barang pribadi ini.';
    END IF;
  ELSE
    IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat mengarsipkan aset kelompok atau pinjaman.';
    END IF;
  END IF;

  UPDATE public.inventory_items
  SET is_archived = true,
      archived_at = NOW(),
      archived_by = v_user_id,
      archival_reason = COALESCE(p_reason, 'Diarsipkan oleh pengguna'),
      updated_at = NOW()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, user_id, notes,
    from_location, to_location, from_holder, to_holder, movement_date
  ) VALUES (
    p_item_id, 'archived', v_item.quantity, v_user_id,
    COALESCE(p_reason, 'Diarsipkan oleh pengguna'),
    COALESCE(v_item.current_location, v_item.location, 'Posko'),
    'Arsip Inventaris',
    COALESCE(v_item.responsible_person, v_item.owner_name, 'Posko'),
    'Arsip',
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang berhasil dipindahkan ke arsip.',
    'item_id', p_item_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_item record;
  v_is_super_admin boolean := false;
  v_is_core_leader boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk memulihkan barang.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  IF NOT v_item.is_archived THEN
    RAISE EXCEPTION 'Barang ini masih aktif dan tidak diarsipkan.';
  END IF;

  v_is_super_admin := public.is_super_admin_v2();

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id
      AND role IN ('ketua', 'sekretaris')
      AND status = 'active'
  ) INTO v_is_core_leader;

  IF v_item.ownership_type = 'PERSONAL_OWNED' THEN
    IF NOT v_is_super_admin AND (v_item.owner_member_id IS DISTINCT FROM v_user_id) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya pemilik barang atau Super Admin yang dapat memulihkan barang pribadi ini.';
    END IF;
  ELSE
    IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat memulihkan aset kelompok atau pinjaman.';
    END IF;
  END IF;

  UPDATE public.inventory_items
  SET is_archived = false,
      archived_at = NULL,
      archived_by = NULL,
      archival_reason = NULL,
      updated_at = NOW()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, user_id, notes,
    from_location, to_location, from_holder, to_holder, movement_date
  ) VALUES (
    p_item_id, 'restored', v_item.quantity, v_user_id,
    'Barang diaktifkan kembali dari arsip',
    'Arsip Inventaris',
    COALESCE(v_item.current_location, v_item.location, 'Posko'),
    'Arsip',
    COALESCE(v_item.responsible_person, v_item.owner_name, 'Posko'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang berhasil diaktifkan kembali.',
    'item_id', p_item_id
  );
END;
$$;

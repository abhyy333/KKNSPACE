-- ==============================================================================
-- KKN SPACE — INVENTARIS: HAPUS BARANG PRIBADI & PERBAIKAN FOREIGN KEY
-- Migration: 20261115184000_personal_inventory_hard_delete_and_fk_fix.sql
-- Description:
-- 1. Adds item_name and item_code columns to public.inventory_movements to preserve audit data.
-- 2. Backfills existing movement records with item_name and item_code.
-- 3. Updates foreign key on inventory_movements.item_id to DROP NOT NULL and ON DELETE SET NULL.
-- 4. Updates foreign key on inventory_loans.item_id to DROP NOT NULL and ON DELETE SET NULL.
-- 5. Expands inventory_movements movement_type check to include 'deleted'.
-- 6. Implements atomic RPC delete_personal_inventory_item(p_item_id) strictly authorized
--    to item owner (auth.uid() = owner_member_id) or Super Admin for PERSONAL_OWNED items only.
-- 7. Updates trigger protect_inventory_item_mutation() to block hard deletes on non-personal items.
-- ==============================================================================

-- 1. Add item_name & item_code to inventory_movements
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS item_name text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS item_code text;

-- 2. Backfill existing movements
UPDATE public.inventory_movements m
SET item_name = i.name, item_code = i.item_code
FROM public.inventory_items i
WHERE m.item_id = i.id AND m.item_name IS NULL;

-- 3. Expand movement_type check to include 'deleted'
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
  'deleted'::text,
  'updated'::text,
  'photo_added'::text,
  'photo_removed'::text,
  'photo_updated'::text,
  'location_changed'::text,
  'condition_changed'::text,
  'transfer'::text,
  'reconciliation'::text
]));

-- 4. Fix foreign key on inventory_movements: DROP NOT NULL and ON DELETE SET NULL
ALTER TABLE public.inventory_movements ALTER COLUMN item_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_item_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_item_id_fkey;
  END IF;
END $$;

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT inventory_movements_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- 5. Fix foreign key on inventory_loans: DROP NOT NULL and ON DELETE SET NULL
ALTER TABLE public.inventory_loans ALTER COLUMN item_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_loans'::regclass
      AND conname = 'inventory_loans_item_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_loans DROP CONSTRAINT inventory_loans_item_id_fkey;
  END IF;
END $$;

ALTER TABLE public.inventory_loans 
ADD CONSTRAINT inventory_loans_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- 5b. Provide compatibility function for is_super_admin_v2()
CREATE OR REPLACE FUNCTION public.is_super_admin_v2()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(app_private.is_super_admin(), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_v2() TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin_v2() TO service_role;

-- 5c. Update prevent_inventory_item_hard_delete trigger function
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Personal items can be deleted; movements retain item_name and item_code via ON DELETE SET NULL.
  IF OLD.ownership_type = 'PERSONAL_OWNED' THEN
    RETURN OLD;
  END IF;

  -- For non-personal items, hard delete is forbidden; archive must be used instead.
  RAISE EXCEPTION 'Barang non-pribadi "%" tidak dapat dihapus permanen. Gunakan fitur arsip barang.', OLD.name;
END;
$$;

-- 6. Trigger protect_inventory_item_mutation
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

  v_is_super_admin := public.is_super_admin_v2();

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_user_id
      AND role IN ('ketua', 'sekretaris')
      AND status = 'active'
  ) INTO v_is_core_leader;

  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- INSERT OPERATION
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := v_user_id;

    IF NEW.ownership_type = 'PERSONAL_OWNED' THEN
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        NEW.owner_member_id := v_user_id;
        IF NEW.owner_name IS NULL OR TRIM(NEW.owner_name) = '' THEN
          NEW.owner_name := COALESCE(v_user_name, 'Anggota KKN');
        END IF;
      ELSE
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
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat mendaftarkan aset kelompok, pinjaman, atau hibah.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE OPERATION
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;

    IF OLD.ownership_type = 'PERSONAL_OWNED' THEN
      IF NOT v_is_super_admin AND (OLD.owner_member_id IS DISTINCT FROM v_user_id) THEN
        RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat memperbarui barang pribadi milik Anda sendiri.';
      END IF;
    ELSE
      IF NOT v_is_super_admin AND NOT v_is_core_leader THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Ketua, Sekretaris, atau Super Admin yang dapat memperbarui barang inventaris non-pribadi.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE OPERATION
  IF TG_OP = 'DELETE' THEN
    IF OLD.ownership_type IS DISTINCT FROM 'PERSONAL_OWNED' THEN
      RAISE EXCEPTION 'Akses ditolak: Barang aset kelompok, pinjaman, dan hibah tidak boleh dihapus keras; gunakan fitur arsip.';
    END IF;

    IF NOT v_is_super_admin AND (OLD.owner_member_id IS DISTINCT FROM v_user_id) THEN
      RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat menghapus barang pribadi milik Anda sendiri.';
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

-- 7. RPC delete_personal_inventory_item
CREATE OR REPLACE FUNCTION public.delete_personal_inventory_item(
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
  v_user_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk menghapus barang.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  -- Strictly check ownership category: ONLY PERSONAL_OWNED may be deleted
  IF v_item.ownership_type IS DISTINCT FROM 'PERSONAL_OWNED' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya barang berkategori Milik Pribadi yang dapat dihapus. Aset kelompok atau pinjaman/hibah hanya dapat diarsipkan.';
  END IF;

  v_is_super_admin := public.is_super_admin_v2();

  -- Strictly check caller authorization:
  -- Only the authenticating owner OR Super Admin may delete
  IF NOT v_is_super_admin AND (v_item.owner_member_id IS DISTINCT FROM v_user_id) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda hanya memiliki kewenangan untuk menghapus barang pribadi milik Anda sendiri.';
  END IF;

  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- Ensure existing movements for this item retain item_name and item_code
  UPDATE public.inventory_movements
  SET item_name = COALESCE(item_name, v_item.name),
      item_code = COALESCE(item_code, v_item.item_code)
  WHERE item_id = p_item_id;

  -- Record audit trail log of the permanent deletion
  INSERT INTO public.inventory_movements (
    item_id, item_name, item_code, movement_type, quantity, user_id, notes,
    from_location, to_location, from_holder, to_holder, movement_date
  ) VALUES (
    p_item_id, v_item.name, v_item.item_code, 'deleted', v_item.quantity, v_user_id,
    'Barang pribadi dihapus permanen dari inventaris posko',
    COALESCE(v_item.current_location, v_item.location, 'Posko'),
    'Dihapus',
    COALESCE(v_item.owner_name, v_user_name, 'Pemilik'),
    'Dihapus',
    NOW()
  );

  -- Delete the item row atomically.
  DELETE FROM public.inventory_items
  WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang pribadi berhasil dihapus permanen.',
    'item_id', p_item_id,
    'item_name', v_item.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO service_role;


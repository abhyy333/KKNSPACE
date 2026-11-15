-- ============================================================================
-- KKN SPACE — INVENTORY SOFT DELETE, OWNERSHIP AUTHORIZATION & AUDIT INTEGRATION
-- Migration: 20261115143000_inventory_soft_delete_and_ownership_authorization.sql
-- ============================================================================

-- 1. ADD SOFT DELETE / ARCHIVE COLUMNS TO INVENTORY_ITEMS
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archival_reason text;

CREATE INDEX IF NOT EXISTS idx_inventory_items_is_archived 
  ON public.inventory_items(is_archived);

-- 2. EXPAND INVENTORY_MOVEMENTS MOVEMENT_TYPE CHECK TO PERMIT 'archived' AND 'restored'
ALTER TABLE public.inventory_movements 
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements 
  ADD CONSTRAINT inventory_movements_movement_type_check 
  CHECK (movement_type = ANY (ARRAY['in'::text, 'out'::text, 'borrow'::text, 'return'::text, 'adjustment'::text, 'archived'::text, 'restored'::text]));

-- 3. HARD DELETE PREVENTION TRIGGER: PRESERVE RELATIONAL DATA AND TRANSACTION HISTORY
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE item_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_loans WHERE item_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_handovers WHERE item_id = OLD.id) THEN
    RAISE EXCEPTION 'Barang "%" tidak dapat dihapus permanen karena memiliki riwayat pergerakan atau transaksi. Gunakan fitur arsip barang agar riwayat tetap terjaga.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_inventory_item_hard_delete ON public.inventory_items;
CREATE TRIGGER trg_prevent_inventory_item_hard_delete
  BEFORE DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_inventory_item_hard_delete();

-- 4. SECURE SERVER-SIDE RPC FUNCTION: ARCHIVE INVENTORY ITEM
CREATE OR REPLACE FUNCTION public.archive_inventory_item(
  p_item_id uuid,
  p_reason text DEFAULT 'Diarsipkan oleh pengguna'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_item record;
  v_is_super_admin boolean;
  v_is_kkn_admin boolean;
  v_is_admin boolean;
  v_is_owner boolean;
  v_effective_reason text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login untuk melakukan pengarsipan barang.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  IF v_item.is_archived = true THEN
    RAISE EXCEPTION 'Barang "%" sudah dalam status diarsipkan.', v_item.name;
  END IF;

  -- Resolve administrative authorities
  v_is_super_admin := COALESCE((SELECT app_private.is_super_admin()), false);
  v_is_kkn_admin := COALESCE(
    (SELECT app_private.has_kkn_role('ketua')) OR 
    (SELECT app_private.has_kkn_role('sekretaris')) OR 
    (SELECT app_private.has_kkn_role('bendahara')),
    false
  );
  v_is_admin := v_is_super_admin OR v_is_kkn_admin;

  -- Verify ownership: genuine owner identity via owner_member_id (NOT mere current holder)
  v_is_owner := (v_item.owner_member_id IS NOT NULL AND v_item.owner_member_id = v_user_id);

  -- Ownership Authorization Rules:
  -- Rule 1: Group asset (GROUP_OWNED or owner_member_id IS NULL) can ONLY be archived by Admin
  IF v_item.ownership_type = 'GROUP_OWNED' OR v_item.owner_member_id IS NULL THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Akses ditolak: Aset milik kelompok hanya dapat diarsipkan oleh Admin posko.';
    END IF;
  ELSE
    -- Rule 2: Personal or other items can ONLY be archived by official owner or Admin
    IF NOT (v_is_owner OR v_is_admin) THEN
      RAISE EXCEPTION 'Akses ditolak: Anda bukan pemilik resmi barang ini dan tidak memiliki izin Admin.';
    END IF;
  END IF;

  v_effective_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Diarsipkan oleh pengguna');

  -- Perform Soft Delete
  UPDATE public.inventory_items
  SET 
    is_archived = true,
    archived_at = now(),
    archived_by = v_user_id,
    archival_reason = v_effective_reason,
    updated_at = now()
  WHERE id = p_item_id;

  -- Record archival movement for full auditability and trace
  INSERT INTO public.inventory_movements (
    item_id,
    movement_type,
    quantity,
    from_location,
    to_location,
    from_holder,
    to_holder,
    notes,
    user_id,
    created_at
  ) VALUES (
    p_item_id,
    'archived',
    GREATEST(COALESCE(v_item.quantity, 1), 1),
    COALESCE(v_item.current_location, v_item.location, 'Posko KKN'),
    'Arsip Inventaris',
    COALESCE(v_item.current_holder_name, v_item.owner_name, 'Posko'),
    'Arsip',
    v_effective_reason,
    v_user_id,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang inventaris berhasil diarsipkan.',
    'item_id', p_item_id,
    'item_name', v_item.name,
    'archived_at', now()
  );
END;
$$;

-- 5. SECURE SERVER-SIDE RPC FUNCTION: RESTORE INVENTORY ITEM FROM ARCHIVE
CREATE OR REPLACE FUNCTION public.restore_inventory_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_item record;
  v_is_super_admin boolean;
  v_is_kkn_admin boolean;
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  IF v_item.is_archived = false THEN
    RAISE EXCEPTION 'Barang "%" saat ini masih aktif.', v_item.name;
  END IF;

  v_is_super_admin := COALESCE((SELECT app_private.is_super_admin()), false);
  v_is_kkn_admin := COALESCE(
    (SELECT app_private.has_kkn_role('ketua')) OR 
    (SELECT app_private.has_kkn_role('sekretaris')) OR 
    (SELECT app_private.has_kkn_role('bendahara')),
    false
  );
  v_is_admin := v_is_super_admin OR v_is_kkn_admin;
  v_is_owner := (v_item.owner_member_id IS NOT NULL AND v_item.owner_member_id = v_user_id);

  IF v_item.ownership_type = 'GROUP_OWNED' OR v_item.owner_member_id IS NULL THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Admin yang dapat mengaktifkan kembali aset kelompok.';
    END IF;
  ELSE
    IF NOT (v_is_owner OR v_is_admin) THEN
      RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang mengaktifkan kembali barang ini.';
    END IF;
  END IF;

  UPDATE public.inventory_items
  SET 
    is_archived = false,
    archived_at = NULL,
    archived_by = NULL,
    archival_reason = NULL,
    updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id,
    movement_type,
    quantity,
    from_location,
    to_location,
    from_holder,
    to_holder,
    notes,
    user_id,
    created_at
  ) VALUES (
    p_item_id,
    'restored',
    GREATEST(COALESCE(v_item.quantity, 1), 1),
    'Arsip Inventaris',
    COALESCE(v_item.current_location, v_item.location, 'Posko KKN'),
    'Arsip',
    COALESCE(v_item.current_holder_name, v_item.owner_name, 'Posko'),
    'Barang diaktifkan kembali dari arsip',
    v_user_id,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang inventaris berhasil diaktifkan kembali.',
    'item_id', p_item_id,
    'item_name', v_item.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_inventory_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_inventory_item(uuid) TO authenticated;

-- 6. RLS POLICIES FOR INVENTORY OWNERS AND ADMINS
-- Ensure owners can also update their own personal items directly
DROP POLICY IF EXISTS "inventory_items_owner_update" ON public.inventory_items;
CREATE POLICY "inventory_items_owner_update"
  ON public.inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    owner_member_id = auth.uid()
    OR (SELECT app_private.is_super_admin())
    OR (SELECT app_private.has_kkn_role('ketua'))
    OR (SELECT app_private.has_kkn_role('sekretaris'))
    OR (SELECT app_private.has_kkn_role('bendahara'))
  )
  WITH CHECK (
    owner_member_id = auth.uid()
    OR (SELECT app_private.is_super_admin())
    OR (SELECT app_private.has_kkn_role('ketua'))
    OR (SELECT app_private.has_kkn_role('sekretaris'))
    OR (SELECT app_private.has_kkn_role('bendahara'))
  );

-- 7. UPDATE WRITE_AUDIT_EVENT TRIGGER TO PROPERLY CAPTURE ARCHIVAL EVENTS
CREATE OR REPLACE FUNCTION app_private.write_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_actor_authority text;
  v_actor_name text;
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_desc text;
  v_sensitive_keys text[] := ARRAY['password', 'token', 'access_token', 'refresh_token', 'secret', 'service_role_key'];
BEGIN
  v_actor_id := (SELECT auth.uid());

  IF v_actor_id IS NOT NULL THEN
    SELECT u.email::text
    INTO v_actor_email
    FROM auth.users u
    WHERE u.id = v_actor_id;

    SELECT p.full_name::text
    INTO v_actor_name
    FROM public.profiles p
    WHERE p.id = v_actor_id;

    IF EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = v_actor_id) THEN
      v_actor_authority := 'super_admin';
    ELSE
      SELECT m.role
      INTO v_actor_authority
      FROM public.memberships m
      WHERE m.user_id = v_actor_id AND m.status = 'active'
      LIMIT 1;
      v_actor_authority := coalesce(v_actor_authority, 'authenticated');
    END IF;
  ELSIF coalesce((SELECT auth.role()), '') = 'service_role' THEN
    v_actor_authority := 'service_role';
    v_actor_name := 'Sistem Backend';
  ELSE
    v_actor_authority := 'system';
    v_actor_name := 'Sistem Otomatis';
  END IF;

  IF tg_op = 'INSERT' THEN
    v_new := to_jsonb(new) - v_sensitive_keys;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'user_id', v_new ->> 'meeting_id');
  ELSIF tg_op = 'UPDATE' THEN
    v_old := to_jsonb(old) - v_sensitive_keys;
    v_new := to_jsonb(new) - v_sensitive_keys;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'user_id', v_new ->> 'meeting_id');
  ELSE
    v_old := to_jsonb(old) - v_sensitive_keys;
    v_id := coalesce(v_old ->> 'id', v_old ->> 'user_id', v_old ->> 'meeting_id');
  END IF;

  v_desc := CASE
    WHEN tg_table_name = 'inventory_items' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan barang inventaris: ' || coalesce(v_new->>'name', '')
        WHEN 'UPDATE' THEN
          CASE
            WHEN (coalesce((v_old->>'is_archived')::boolean, false) = false) AND ((v_new->>'is_archived')::boolean = true) THEN
              'Mengarsipkan barang: ' || coalesce(v_new->>'name', '')
            WHEN (coalesce((v_old->>'is_archived')::boolean, false) = true) AND ((v_new->>'is_archived')::boolean = false) THEN
              'Mengaktifkan kembali barang: ' || coalesce(v_new->>'name', '')
            ELSE 'Mengubah data inventaris: ' || coalesce(v_new->>'name', '')
          END
        WHEN 'DELETE' THEN 'Menghapus data inventaris: ' || coalesce(v_old->>'name', '')
      END
    WHEN tg_table_name = 'sponsors' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat data calon/mitra sponsor: ' || coalesce(v_new->>'name', '')
        WHEN 'UPDATE' THEN
          CASE
            WHEN (v_old->>'publication_status') IS DISTINCT FROM (v_new->>'publication_status') THEN
              'Mengubah status publikasi sponsor ' || coalesce(v_new->>'name', '') || ' menjadi ' || coalesce(v_new->>'publication_status', '')
            WHEN (v_old->>'partnership_status') IS DISTINCT FROM (v_new->>'partnership_status') THEN
              'Mengubah status kerja sama sponsor ' || coalesce(v_new->>'name', '') || ' menjadi ' || coalesce(v_new->>'partnership_status', '')
            ELSE 'Memperbarui data sponsor: ' || coalesce(v_new->>'name', '')
          END
        WHEN 'DELETE' THEN 'Menghapus data sponsor: ' || coalesce(v_old->>'name', '')
      END
    WHEN tg_table_name = 'sponsorship_packages' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan template paket kemitraan: ' || coalesce(v_new->>'display_name', '')
        WHEN 'UPDATE' THEN 'Memperbarui template paket kemitraan: ' || coalesce(v_new->>'display_name', '')
        WHEN 'DELETE' THEN 'Menghapus template paket kemitraan: ' || coalesce(v_old->>'display_name', '')
      END
    WHEN tg_table_name = 'sponsor_agreements' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat kesepakatan kemitraan sponsor: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN
          CASE
            WHEN (v_old->>'agreement_status') IS DISTINCT FROM (v_new->>'agreement_status') THEN
              'Mengubah status kesepakatan kemitraan (' || coalesce(v_new->>'title', '') || ') menjadi ' || coalesce(v_new->>'agreement_status', '')
            ELSE 'Memperbarui kesepakatan kemitraan: ' || coalesce(v_new->>'title', '')
          END
        WHEN 'DELETE' THEN 'Menghapus kesepakatan kemitraan: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'sponsor_benefit_fulfillments' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan komitmen benefit sponsor: ' || coalesce(v_new->>'benefit_title', '')
        WHEN 'UPDATE' THEN
          CASE
            WHEN (v_old->>'fulfillment_status') IS DISTINCT FROM (v_new->>'fulfillment_status') THEN
              'Mengubah status realisasi benefit (' || coalesce(v_new->>'benefit_title', '') || ') menjadi ' || coalesce(v_new->>'fulfillment_status', '')
            ELSE 'Memperbarui realisasi benefit sponsor: ' || coalesce(v_new->>'benefit_title', '')
          END
        WHEN 'DELETE' THEN 'Menghapus komitmen benefit sponsor'
      END
    WHEN tg_table_name = 'sponsor_proposals' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menyusun proposal sponsor: ' || coalesce(v_new->>'proposal_number', '') || ' (' || coalesce(v_new->>'recipient_organization', '') || ')'
        WHEN 'UPDATE' THEN
          CASE
            WHEN (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
              'Mengubah status proposal ' || coalesce(v_new->>'proposal_number', '') || ' menjadi ' || coalesce(v_new->>'status', '')
            ELSE 'Memperbarui proposal sponsor: ' || coalesce(v_new->>'proposal_number', '')
          END
        WHEN 'DELETE' THEN 'Menghapus proposal sponsor: ' || coalesce(v_old->>'proposal_number', '')
      END
    WHEN tg_table_name = 'sponsor_communications' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mencatat tindak lanjut komunikasi sponsor'
        WHEN 'UPDATE' THEN 'Memperbarui catatan komunikasi sponsor'
        WHEN 'DELETE' THEN 'Menghapus catatan komunikasi sponsor'
      END
    WHEN tg_table_name = 'calendar_events' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat agenda: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui agenda: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus agenda: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'duty_shifts' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat dokumentasi piket posko: ' || coalesce(NULLIF(v_new->>'title', ''), coalesce(v_new->>'shift_date', ''))
        WHEN 'UPDATE' THEN 'Mengubah dokumentasi piket posko: ' || coalesce(NULLIF(v_new->>'title', ''), coalesce(v_new->>'shift_date', ''))
        WHEN 'DELETE' THEN 'Menghapus dokumentasi piket posko: ' || coalesce(NULLIF(v_old->>'title', ''), coalesce(v_old->>'shift_date', ''))
      END
    WHEN tg_table_name = 'duty_shift_documentations' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mengunggah foto dokumentasi piket posko'
        WHEN 'UPDATE' THEN 'Mengubah foto dokumentasi piket posko'
        WHEN 'DELETE' THEN 'Menghapus foto dokumentasi piket posko'
      END
    WHEN tg_table_name = 'work_programs' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Menambahkan program kerja: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Mengubah program kerja: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus program kerja: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'tasks' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Membuat tugas tim: ' || coalesce(v_new->>'title', '')
        WHEN 'UPDATE' THEN 'Memperbarui tugas tim: ' || coalesce(v_new->>'title', '')
        WHEN 'DELETE' THEN 'Menghapus tugas tim: ' || coalesce(v_old->>'title', '')
      END
    WHEN tg_table_name = 'finance_transactions' THEN
      CASE tg_op
        WHEN 'INSERT' THEN 'Mencatat transaksi ' || coalesce(v_new->>'type', '') || ': ' || coalesce(v_new->>'description', '')
        WHEN 'UPDATE' THEN 'Memperbarui transaksi keuangan: ' || coalesce(v_new->>'description', '')
        WHEN 'DELETE' THEN 'Menghapus transaksi keuangan: ' || coalesce(v_old->>'description', '')
      END
    ELSE
      lower(tg_op) || ' on ' || tg_table_name
  END;

  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    actor_name_snapshot,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    status,
    description
  )
  VALUES (
    v_actor_id,
    v_actor_email,
    v_actor_authority,
    v_actor_name,
    lower(tg_op),
    tg_table_name,
    v_id,
    v_old,
    v_new,
    'success',
    v_desc
  );

  IF tg_op = 'DELETE' THEN
    RETURN old;
  ELSE
    RETURN new;
  END IF;
END;
$function$;

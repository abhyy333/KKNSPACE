-- ============================================================================
-- KKN SPACE — PHASE 5.2 ADDENDUM: INVENTORY OWNERSHIP & END-OF-KKN RECONCILIATION
-- Migration Version: 20261113175000
-- Additive Schema Expansion for inventory_items, inventory_handovers, and movements
-- ============================================================================

-- 1. EXPAND INVENTORY_ITEMS WITH OWNERSHIP, TRACKING MODEL, STATUS & RECONCILIATION
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS tracking_model text NOT NULL DEFAULT 'tracked',
  ADD COLUMN IF NOT EXISTS ownership_type text NOT NULL DEFAULT 'GROUP_OWNED',
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_owner_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_kkn_plan text,
  ADD COLUMN IF NOT EXISTS lender_name text,
  ADD COLUMN IF NOT EXISTS lender_contact text,
  ADD COLUMN IF NOT EXISTS borrow_start_date date,
  ADD COLUMN IF NOT EXISTS borrow_due_date date,
  ADD COLUMN IF NOT EXISTS lender_notes text,
  ADD COLUMN IF NOT EXISTS funding_source text,
  ADD COLUMN IF NOT EXISTS purchase_cost numeric,
  ADD COLUMN IF NOT EXISTS receipt_proof_url text,
  ADD COLUMN IF NOT EXISTS item_status text NOT NULL DEFAULT 'stored',
  ADD COLUMN IF NOT EXISTS current_location text DEFAULT 'Posko',
  ADD COLUMN IF NOT EXISTS current_holder_name text,
  ADD COLUMN IF NOT EXISTS current_holder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_qr_printed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciliation_final_action text,
  ADD COLUMN IF NOT EXISTS reconciliation_notes text,
  ADD COLUMN IF NOT EXISTS reconciliation_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_receiver_name text,
  ADD COLUMN IF NOT EXISTS reconciliation_proof_url text,
  ADD COLUMN IF NOT EXISTS reconciliation_confirmed boolean DEFAULT false;

-- Backfill default values for existing items
UPDATE public.inventory_items
SET 
  tracking_model = COALESCE(tracking_model, 'tracked'),
  ownership_type = CASE 
    WHEN source = 'pribadi' THEN 'PERSONAL_OWNED'
    WHEN source = 'pinjaman' THEN 'BORROWED_EXTERNAL'
    WHEN source = 'hibah' THEN 'DONATED'
    ELSE COALESCE(ownership_type, 'GROUP_OWNED')
  END,
  owner_name = COALESCE(owner_name, responsible_person, 'Kelompok KKN'),
  current_location = COALESCE(location, 'Posko'),
  item_status = COALESCE(item_status, 'stored'),
  reconciliation_status = COALESCE(reconciliation_status, 'pending')
WHERE tracking_model IS NULL OR ownership_type IS NULL OR item_status IS NULL;

-- 2. CREATE INVENTORY_HANDOVERS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  from_holder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_holder_name text NOT NULL,
  to_holder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_holder_name text NOT NULL,
  origin_location text NOT NULL,
  destination_location text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
  purpose text,
  notes text,
  proof_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. EXPAND INVENTORY_MOVEMENTS
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS from_location text,
  ADD COLUMN IF NOT EXISTS to_location text,
  ADD COLUMN IF NOT EXISTS from_holder text,
  ADD COLUMN IF NOT EXISTS to_holder text,
  ADD COLUMN IF NOT EXISTS handover_id uuid REFERENCES public.inventory_handovers(id) ON DELETE SET NULL;

-- 4. ROW LEVEL SECURITY (RLS) FOR HANDOVERS
ALTER TABLE public.inventory_handovers ENABLE ROW LEVEL SECURITY;

-- Read policy: active members and super admin
DROP POLICY IF EXISTS "Active members can view handovers" ON public.inventory_handovers;
CREATE POLICY "Active members can view handovers"
  ON public.inventory_handovers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Insert policy: active members can initiate handovers
DROP POLICY IF EXISTS "Active members can create handovers" ON public.inventory_handovers;
CREATE POLICY "Active members can create handovers"
  ON public.inventory_handovers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid() AND m.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.system_admins sa
        WHERE sa.user_id = auth.uid()
      )
    )
  );

-- Update policy: receiver or sender or manager can accept/reject/cancel
DROP POLICY IF EXISTS "Participants can update handover status" ON public.inventory_handovers;
CREATE POLICY "Participants can update handover status"
  ON public.inventory_handovers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = to_holder_id
    OR auth.uid() = from_holder_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('ketua', 'sekretaris', 'bendahara')
    )
    OR EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- 5. RPC FUNCTION: ACCEPT HANDOVER ATOMICALLY
CREATE OR REPLACE FUNCTION public.accept_inventory_handover(
  p_handover_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_handover RECORD;
BEGIN
  -- 1. Lock and fetch handover
  SELECT * INTO v_handover
  FROM public.inventory_handovers
  WHERE id = p_handover_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data serah terima tidak ditemukan.';
  END IF;

  IF v_handover.status != 'pending' THEN
    RAISE EXCEPTION 'Serah terima sudah diproses sebelumnya (status: %).', v_handover.status;
  END IF;

  -- 2. Update handover status
  UPDATE public.inventory_handovers
  SET 
    status = 'accepted',
    confirmed_at = now(),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_handover_id;

  -- 3. Update inventory_items current holder and location
  UPDATE public.inventory_items
  SET
    current_holder_id = v_handover.to_holder_id,
    current_holder_name = v_handover.to_holder_name,
    current_location = v_handover.destination_location,
    item_status = CASE 
      WHEN v_handover.destination_location = 'Posko' THEN 'stored'
      ELSE 'in_use'
    END,
    updated_at = now()
  WHERE id = v_handover.item_id;

  -- 4. Record permanent movement
  INSERT INTO public.inventory_movements (
    item_id,
    movement_type,
    quantity,
    user_id,
    notes,
    from_location,
    to_location,
    from_holder,
    to_holder,
    handover_id
  ) VALUES (
    v_handover.item_id,
    'transfer',
    1,
    auth.uid(),
    COALESCE(p_notes, 'Serah terima barang disetujui.'),
    v_handover.origin_location,
    v_handover.destination_location,
    v_handover.from_holder_name,
    v_handover.to_holder_name,
    p_handover_id
  );
END;
$$;

-- 6. RPC FUNCTION: RESOLVE ITEM RECONCILIATION ATOMICALLY
CREATE OR REPLACE FUNCTION public.resolve_item_reconciliation(
  p_item_id uuid,
  p_final_action text,
  p_final_condition text,
  p_receiver_name text,
  p_notes text,
  p_proof_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_reconciliation_status text;
BEGIN
  -- 1. Lock and fetch item
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
  END IF;

  -- Determine reconciliation status
  IF p_final_action IN ('not_found', 'lost_damaged_resolution', 'lost_damaged_action') OR p_final_condition IN ('damaged', 'lost') THEN
    v_reconciliation_status := 'problematic';
  ELSIF p_final_action IN ('pending_return', 'awaiting_lender_confirmation') THEN
    v_reconciliation_status := 'waiting_confirmation';
  ELSE
    v_reconciliation_status := 'resolved';
  END IF;

  -- 2. Update item
  UPDATE public.inventory_items
  SET
    reconciliation_status = v_reconciliation_status,
    reconciliation_final_action = p_final_action,
    condition = p_final_condition,
    reconciliation_receiver_name = p_receiver_name,
    reconciliation_notes = p_notes,
    reconciliation_proof_url = p_proof_url,
    reconciliation_at = now(),
    reconciliation_by = auth.uid(),
    reconciliation_confirmed = true,
    item_status = CASE
      WHEN p_final_action IN ('returned_to_owner', 'taken_home', 'returned_to_lender') THEN 'returned'
      WHEN p_final_action IN ('not_found') THEN 'lost'
      WHEN p_final_condition = 'damaged' THEN 'damaged'
      WHEN p_final_action IN ('disposed_approved') THEN 'disposed'
      ELSE item_status
    END,
    updated_at = now()
  WHERE id = p_item_id;

  -- 3. Log movement
  INSERT INTO public.inventory_movements (
    item_id,
    movement_type,
    quantity,
    user_id,
    notes,
    from_location,
    to_location,
    from_holder,
    to_holder
  ) VALUES (
    p_item_id,
    'reconciliation',
    1,
    auth.uid(),
    'Rekonsiliasi akhir KKN: ' || p_final_action || '. Catatan: ' || COALESCE(p_notes, '-'),
    v_item.current_location,
    CASE WHEN p_final_action IN ('returned_to_owner', 'taken_home', 'returned_to_lender') THEN 'Dikembalikan ke Pemilik' ELSE v_item.current_location END,
    v_item.current_holder_name,
    p_receiver_name
  );
END;
$$;

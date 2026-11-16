-- ==============================================================================
-- KKN SPACE — SECURITY REMEDIATION MIGRATION
-- Migration: 20261116020000_security_remediation_audit_and_search_path.sql
-- Description:
--   1. Enables Row Level Security on public.audit_events and restricts SELECT
--      to Admin and Super Admin; revokes direct client mutations.
--   2. Enforces explicit `SET search_path` on SECURITY DEFINER functions to eliminate
--      search path shadowing risks.
--   3. Revokes EXECUTE permissions from `anon` and `PUBLIC` on sensitive administrative RPCs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY & ACCESS CONTROLS ON public.audit_events
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.audit_events ENABLE ROW LEVEL SECURITY;

-- Remove public/anon direct data modification privileges
REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM authenticated, anon, PUBLIC;
REVOKE ALL ON public.audit_events FROM anon;

-- Grant SELECT only to authenticated users (evaluated through RLS) and service_role
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Admins can view audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Service role has full access to audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Authenticated users cannot insert audit events directly" ON public.audit_events;

-- Admin & Super Admin SELECT policy
CREATE POLICY "Admins can view audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (
    app_private.is_admin_or_super_admin()
  );

-- Service role full access policy
CREATE POLICY "Service role has full access to audit events"
  ON public.audit_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. HARDEN SECURITY DEFINER FUNCTIONS WITH EXPLICIT search_path
-- ------------------------------------------------------------------------------

-- 2a. is_super_admin_v2()
CREATE OR REPLACE FUNCTION public.is_super_admin_v2()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, app_private, pg_temp
STABLE
AS $$
  SELECT COALESCE(app_private.is_super_admin(), false);
$$;

-- 2b. prevent_inventory_item_hard_delete()
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
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

-- 2c. accept_inventory_handover()
CREATE OR REPLACE FUNCTION public.accept_inventory_handover(
  p_handover_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
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

-- 2d. resolve_item_reconciliation()
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
SET search_path = public, app_private, pg_temp
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

-- 2e. protect_calendar_event_publication()
CREATE OR REPLACE FUNCTION app_private.protect_calendar_event_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status IN ('published', 'archived') THEN
      IF NOT (
        app_private.has_kkn_role('ketua')
        OR app_private.has_kkn_role('sekretaris')
        OR app_private.is_super_admin()
        OR coalesce((SELECT auth.role()), '') = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin')
      ) THEN
        RAISE EXCEPTION 'Hanya Ketua, Sekretaris, atau Super Admin yang dapat mempublikasikan agenda secara langsung.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.publication_status IS DISTINCT FROM OLD.publication_status THEN
      IF NOT (
        app_private.has_kkn_role('ketua')
        OR app_private.has_kkn_role('sekretaris')
        OR app_private.is_super_admin()
        OR coalesce((SELECT auth.role()), '') = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin')
      ) THEN
        RAISE EXCEPTION 'Hanya Ketua, Sekretaris, atau Super Admin yang berwenang mengubah status publikasi agenda.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. REVOKE UNNECESSARY EXECUTE PERMISSIONS FROM anon / PUBLIC ON ADMIN RPCS
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.reset_finance_ledger(numeric, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_finance_transaction_classification(uuid, uuid, text, text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.is_admin_or_super_admin() FROM anon, PUBLIC;

-- Re-affirm grants for authenticated and service_role
GRANT EXECUTE ON FUNCTION public.reset_finance_ledger(numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_finance_transaction_classification(uuid, uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_admin_or_super_admin() TO authenticated, service_role;

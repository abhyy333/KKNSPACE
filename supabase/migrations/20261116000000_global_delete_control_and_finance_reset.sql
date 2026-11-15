-- ==============================================================================
-- KKN SPACE — GLOBAL DELETE CONTROL, FINANCE RESET & EXPENDITURE ANALYTICS
-- Migration: 20261116000000_global_delete_control_and_finance_reset.sql
-- Description:
-- 1. Enforces global admin-only permanent deletion across all system modules.
--    Replaces personal item deletion permissions: only Admin / Super Admin can delete.
-- 2. Creates finance_books table for cash book lifecycle, periods, and archival snapshots.
-- 3. Adds spending_purpose, recipient_or_vendor, program_id, book_id, is_archived
--    to finance_transactions to support expenditure analytics.
-- 4. Hardens reject_finance_mutation() to allow archiving & classification while
--    strictly preserving nominal amount, type, date, recorder, and reversal immutability.
-- 5. Implements transactional atomic RPC reset_finance_ledger() with pre-reset snapshot.
-- 6. Implements RPC update_finance_transaction_classification() for reclassifying details.
-- 7. Hardens storage delete policies and audit logging for financial books and mutations.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. GLOBAL DELETE CONTROL ENFORCEMENT
-- ------------------------------------------------------------------------------

-- Helper function to check if caller is an Admin or Super Admin
CREATE OR REPLACE FUNCTION app_private.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins sa
    WHERE sa.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = (SELECT auth.uid())
      AND m.status = 'active'
      AND m.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION app_private.is_admin_or_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin_or_super_admin() TO anon;
GRANT EXECUTE ON FUNCTION app_private.is_admin_or_super_admin() TO service_role;

-- Universal trigger function to block permanent deletion from non-admin accounts
CREATE OR REPLACE FUNCTION app_private.enforce_admin_only_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Service role / postgres internal operations (auth.uid() IS NULL) bypass trigger
  IF v_uid IS NULL THEN
    RETURN OLD;
  END IF;

  -- Verify Admin or Super Admin privilege
  IF NOT app_private.is_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Penghapusan data secara permanen hanya dapat dilakukan oleh Admin dan Super Admin.'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$$;

-- Apply enforce_admin_only_delete trigger to all relevant operational tables
DO $$
DECLARE
  v_target_tables text[] := ARRAY[
    'calendar_events',
    'agenda_activity_steps',
    'work_programs',
    'tasks',
    'task_assignees',
    'meetings',
    'meeting_agenda_items',
    'meeting_minutes',
    'meeting_attendees',
    'meeting_decisions',
    'inventory_items',
    'inventory_loans',
    'inventory_photos',
    'survey_forms',
    'survey_questions',
    'survey_responses',
    'duty_shifts',
    'duty_shift_documentations',
    'activity_documentations',
    'activity_documentation_photos',
    'documentation_photos',
    'media_assets',
    'documents',
    'kkn_team_directory',
    'sponsors',
    'sponsorship_tiers',
    'sponsorship_agreements',
    'sponsor_proposals',
    'sponsor_communications',
    'sponsor_benefit_fulfillments',
    'kkn_risks',
    'daily_logs',
    'daily_log_attachments',
    'daily_log_participants'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_target_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_admin_only_delete ON public.%I;', t);
      EXECUTE format('
        CREATE TRIGGER trg_enforce_admin_only_delete
        BEFORE DELETE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION app_private.enforce_admin_only_delete();
      ', t);
    END IF;
  END LOOP;
END $$;

-- Update protect_inventory_item_mutation trigger: remove owner deletion bypass
CREATE OR REPLACE FUNCTION public.protect_inventory_item_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
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

  v_is_super_admin := app_private.is_admin_or_super_admin();

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

  -- DELETE OPERATION (Strictly Admin / Super Admin ONLY)
  IF TG_OP = 'DELETE' THEN
    IF NOT v_is_super_admin THEN
      RAISE EXCEPTION 'Akses ditolak: Penghapusan barang inventaris secara permanen hanya dapat dilakukan oleh Admin dan Super Admin.'
        USING ERRCODE = '42501';
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update RPC delete_personal_inventory_item: remove personal owner bypass
CREATE OR REPLACE FUNCTION public.delete_personal_inventory_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
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

  v_is_super_admin := app_private.is_admin_or_super_admin();

  -- Strictly check caller authorization: Admin / Super Admin only
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Akses ditolak: Penghapusan barang secara permanen hanya dapat dilakukan oleh Admin dan Super Admin.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang inventaris tidak ditemukan.';
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
    'Barang dihapus permanen oleh Administrator',
    COALESCE(v_item.current_location, v_item.location, 'Posko'),
    'Dihapus',
    COALESCE(v_item.owner_name, v_user_name, 'Admin'),
    'Dihapus',
    NOW()
  );

  -- Delete the item row atomically.
  DELETE FROM public.inventory_items
  WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Barang berhasil dihapus permanen oleh Administrator.',
    'item_id', p_item_id,
    'item_name', v_item.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_personal_inventory_item(uuid) TO service_role;

-- Storage DELETE policy on kkn-private: restrict to Admin / Super Admin
DROP POLICY IF EXISTS kkn_private_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS kkn_private_admin_only_delete ON storage.objects;
CREATE POLICY kkn_private_admin_only_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kkn-private'
    AND app_private.is_admin_or_super_admin()
  );

-- RLS DELETE policies refinement across key operational tables
DROP POLICY IF EXISTS "Members can delete activity photos" ON public.activity_documentation_photos;
CREATE POLICY "Admins can delete activity photos"
  ON public.activity_documentation_photos
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "Members can delete activity documentations" ON public.activity_documentations;
CREATE POLICY "Admins can delete activity documentations"
  ON public.activity_documentations
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "daily_log_attachments_owner_delete" ON public.daily_log_attachments;
CREATE POLICY "daily_log_attachments_admin_delete"
  ON public.daily_log_attachments
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "daily_logs_owner_delete" ON public.daily_logs;
CREATE POLICY "daily_logs_admin_delete"
  ON public.daily_logs
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "duty_shift_docs_delete" ON public.duty_shift_documentations;
CREATE POLICY "duty_shift_docs_admin_delete"
  ON public.duty_shift_documentations
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "inventory_photos_delete_authorized" ON public.inventory_photos;
CREATE POLICY "inventory_photos_admin_delete"
  ON public.inventory_photos
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "kkn_risks_delete_lead_only" ON public.kkn_risks;
CREATE POLICY "kkn_risks_admin_delete"
  ON public.kkn_risks
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());

DROP POLICY IF EXISTS "sponsor_comms_delete" ON public.sponsor_communications;
CREATE POLICY "sponsor_comms_admin_delete"
  ON public.sponsor_communications
  FOR DELETE
  TO authenticated
  USING (app_private.is_admin_or_super_admin());


-- ------------------------------------------------------------------------------
-- 2. FINANCE BOOKS & PERIOD ARCHIVAL TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_number integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Buku Kas Utama (Periode Awal)',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  initial_balance numeric NOT NULL DEFAULT 0.00 CHECK (initial_balance >= 0),
  archived_at timestamptz NULL,
  archived_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot_transaction_count integer NULL,
  snapshot_total_income numeric NULL,
  snapshot_total_expense numeric NULL,
  snapshot_final_balance numeric NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial book if none exists
INSERT INTO public.finance_books (book_number, title, status, initial_balance)
SELECT 1, 'Buku Kas Utama (Periode Awal)', 'active', 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.finance_books);

-- Enable RLS on finance_books
ALTER TABLE public.finance_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_books_read_all ON public.finance_books;
CREATE POLICY finance_books_read_all
  ON public.finance_books
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS finance_books_admin_write ON public.finance_books;
CREATE POLICY finance_books_admin_write
  ON public.finance_books
  FOR ALL
  TO authenticated
  USING (app_private.is_admin_or_super_admin())
  WITH CHECK (app_private.is_admin_or_super_admin());

-- ------------------------------------------------------------------------------
-- 3. HARDEN REJECT_FINANCE_MUTATION FOR ARCHIVE & CLASSIFICATION SUPPORT
-- ------------------------------------------------------------------------------

-- Update reject_finance_mutation to strictly guard financial amounts, types, dates,
-- recorders, and reversal references, while allowing archiving (book_id, is_archived)
-- and safe classification (spending_purpose, recipient_or_vendor, program_id, category_id).
CREATE OR REPLACE FUNCTION app_private.reject_finance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Strict block on DELETE: finance transactions cannot be hard-deleted
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Transaksi keuangan tidak dapat dihapus permanen. Gunakan fitur Reset Keuangan untuk mengarsipkan atau fitur Pembatalan/Pembalik.'
      USING ERRCODE = '55000';
  END IF;

  -- On UPDATE: protect financial core integrity
  IF TG_OP = 'UPDATE' THEN
    -- Amount is strictly immutable
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      RAISE EXCEPTION 'Nominal transaksi keuangan bersifat permanen dan tidak dapat diubah.'
        USING ERRCODE = '55000';
    END IF;

    -- Type is strictly immutable
    IF NEW.type IS DISTINCT FROM OLD.type THEN
      RAISE EXCEPTION 'Jenis transaksi keuangan (pemasukan/pengeluaran) tidak dapat diubah.'
        USING ERRCODE = '55000';
    END IF;

    -- Transaction date is immutable
    IF NEW.transaction_date IS DISTINCT FROM OLD.transaction_date THEN
      RAISE EXCEPTION 'Tanggal transaksi keuangan tidak dapat diubah.'
        USING ERRCODE = '55000';
    END IF;

    -- Recorded_by is immutable
    IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
      RAISE EXCEPTION 'Pencatat transaksi keuangan tidak dapat diubah.'
        USING ERRCODE = '55000';
    END IF;

    -- Reversal target is immutable
    IF NEW.reversal_of_transaction_id IS DISTINCT FROM OLD.reversal_of_transaction_id THEN
      RAISE EXCEPTION 'Tautan pembalik transaksi tidak dapat diubah.'
        USING ERRCODE = '55000';
    END IF;

    -- Allow updating book_id, is_archived, spending_purpose, recipient_or_vendor, program_id, category_id
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ENHANCE FINANCE TRANSACTIONS SCHEMA
-- ------------------------------------------------------------------------------

ALTER TABLE public.finance_transactions
ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.finance_books(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS spending_purpose text NULL,
ADD COLUMN IF NOT EXISTS recipient_or_vendor text NULL,
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.work_programs(id) ON DELETE SET NULL;

-- Backfill existing transactions with the initial active book
UPDATE public.finance_transactions
SET book_id = (SELECT id FROM public.finance_books WHERE status = 'active' ORDER BY book_number ASC LIMIT 1)
WHERE book_id IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_finance_transactions_book_id ON public.finance_transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_is_archived ON public.finance_transactions(is_archived);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_program_id ON public.finance_transactions(program_id);


-- ------------------------------------------------------------------------------
-- 5. ATOMIC TRANSACTIONAL RPC: RESET FINANCE LEDGER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_finance_ledger(
  p_new_initial_balance numeric,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_active_book record;
  v_new_book_id uuid;
  v_new_book_number integer;
  v_new_book_title text;
  v_count_all integer := 0;
  v_total_income numeric := 0;
  v_total_expense numeric := 0;
  v_final_balance numeric := 0;
  v_reversed_ids uuid[];
  v_category_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk melakukan reset keuangan.';
  END IF;

  -- 1. Strictly verify Admin or Super Admin authority
  IF NOT app_private.is_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Reset keuangan hanya dapat dilakukan oleh Admin dan Super Admin.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validate new initial balance
  IF p_new_initial_balance IS NULL OR p_new_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo awal buku kas baru harus berupa angka valid >= 0.';
  END IF;

  -- Get caller profile info
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;

  -- 3. Lock and retrieve current active book
  SELECT * INTO v_active_book
  FROM public.finance_books
  WHERE status = 'active'
  ORDER BY book_number DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ditemukan buku kas aktif yang dapat direset.';
  END IF;

  -- 4. Calculate accurate pre-reset summary snapshot
  -- Identify all reversed target transaction IDs
  SELECT COALESCE(array_agg(reversal_of_transaction_id), ARRAY[]::uuid[])
  INTO v_reversed_ids
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND reversal_of_transaction_id IS NOT NULL;

  -- Total count of rows in the active period
  SELECT count(*)
  INTO v_count_all
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id;

  -- Calculate effective income
  SELECT COALESCE(sum(amount), 0)
  INTO v_total_income
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND type = 'income'
    AND reversal_of_transaction_id IS NULL
    AND id != ALL(v_reversed_ids);

  -- Calculate effective expense
  SELECT COALESCE(sum(amount), 0)
  INTO v_total_expense
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND type = 'expense'
    AND reversal_of_transaction_id IS NULL
    AND id != ALL(v_reversed_ids);

  -- Add initial balance of the active book
  v_final_balance := COALESCE(v_active_book.initial_balance, 0) + v_total_income - v_total_expense;

  -- 5. Archive current book with exact snapshot
  UPDATE public.finance_books
  SET status = 'archived',
      archived_at = now(),
      archived_by = v_user_id,
      snapshot_transaction_count = v_count_all,
      snapshot_total_income = v_total_income,
      snapshot_total_expense = v_total_expense,
      snapshot_final_balance = v_final_balance,
      notes = p_notes,
      updated_at = now()
  WHERE id = v_active_book.id;

  -- 6. Mark all transactions of the old book as archived
  UPDATE public.finance_transactions
  SET is_archived = true
  WHERE book_id = v_active_book.id;

  -- 7. Create new active cash book
  v_new_book_number := v_active_book.book_number + 1;
  v_new_book_title := 'Buku Kas Periode ' || v_new_book_number;

  INSERT INTO public.finance_books (
    book_number,
    title,
    status,
    initial_balance,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_new_book_number,
    v_new_book_title,
    'active',
    p_new_initial_balance,
    COALESCE(p_notes, 'Buku kas baru setelah reset'),
    now(),
    now()
  ) RETURNING id INTO v_new_book_id;

  -- 8. If new initial balance > 0, record an initial balance entry in the new book
  IF p_new_initial_balance > 0 THEN
    -- Ensure category 'Saldo Awal' exists
    SELECT id INTO v_category_id
    FROM public.finance_categories
    WHERE type = 'income' AND name = 'Saldo Awal'
    LIMIT 1;

    IF v_category_id IS NULL THEN
      INSERT INTO public.finance_categories (name, type, is_active)
      VALUES ('Saldo Awal', 'income', true)
      RETURNING id INTO v_category_id;
    END IF;

    INSERT INTO public.finance_transactions (
      book_id,
      category_id,
      type,
      amount,
      description,
      spending_purpose,
      transaction_date,
      recorded_by,
      is_archived
    ) VALUES (
      v_new_book_id,
      v_category_id,
      'income',
      p_new_initial_balance,
      'Saldo Awal Buku Kas Baru (Reset Keuangan)',
      'Modal awal periode baru setelah reset keuangan',
      CURRENT_DATE,
      v_user_id,
      false
    );
  END IF;

  -- 9. Insert comprehensive audit trail log
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
  ) VALUES (
    v_user_id,
    v_user_email,
    'super_admin',
    v_user_name,
    'finance_reset',
    'finance_books',
    v_new_book_id::text,
    jsonb_build_object(
      'archived_book_id', v_active_book.id,
      'archived_book_number', v_active_book.book_number,
      'snapshot_transaction_count', v_count_all,
      'snapshot_total_income', v_total_income,
      'snapshot_total_expense', v_total_expense,
      'snapshot_final_balance', v_final_balance
    ),
    jsonb_build_object(
      'new_book_id', v_new_book_id,
      'new_book_number', v_new_book_number,
      'new_initial_balance', p_new_initial_balance,
      'notes', p_notes
    ),
    'success',
    format('Reset Keuangan KKN: Mengarsipkan Buku Kas #%s (Saldo Akhir: Rp %s) dan membuka Buku Kas #%s (Saldo Awal: Rp %s)',
      v_active_book.book_number,
      to_char(v_final_balance, 'FM999,999,999,999'),
      v_new_book_number,
      to_char(p_new_initial_balance, 'FM999,999,999,999')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reset keuangan berhasil dilaksanakan. Buku kas lama telah diarsipkan secara utuh.',
    'archived_book', jsonb_build_object(
      'id', v_active_book.id,
      'book_number', v_active_book.book_number,
      'snapshot_transaction_count', v_count_all,
      'snapshot_total_income', v_total_income,
      'snapshot_total_expense', v_total_expense,
      'snapshot_final_balance', v_final_balance
    ),
    'new_book', jsonb_build_object(
      'id', v_new_book_id,
      'book_number', v_new_book_number,
      'title', v_new_book_title,
      'initial_balance', p_new_initial_balance
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_finance_ledger(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_finance_ledger(numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_finance_ledger(numeric, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 6. RPC: UPDATE FINANCE TRANSACTION CLASSIFICATION
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_finance_transaction_classification(
  p_transaction_id uuid,
  p_category_id uuid DEFAULT NULL,
  p_spending_purpose text DEFAULT NULL,
  p_recipient_or_vendor text DEFAULT NULL,
  p_program_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_tx record;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan.';
  END IF;

  -- Authorized: Admin, Super Admin, or Bendahara
  IF NOT (
    app_private.is_admin_or_super_admin()
    OR app_private.has_kkn_role('bendahara')
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Bendahara, Admin, atau Super Admin yang dapat mengklasifikasikan rincian penggunaan transaksi.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tx
  FROM public.finance_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi keuangan tidak ditemukan.';
  END IF;

  v_old_values := jsonb_build_object(
    'category_id', v_tx.category_id,
    'spending_purpose', v_tx.spending_purpose,
    'recipient_or_vendor', v_tx.recipient_or_vendor,
    'program_id', v_tx.program_id
  );

  UPDATE public.finance_transactions
  SET category_id = COALESCE(p_category_id, category_id),
      spending_purpose = COALESCE(p_spending_purpose, spending_purpose),
      recipient_or_vendor = COALESCE(p_recipient_or_vendor, recipient_or_vendor),
      program_id = COALESCE(p_program_id, program_id)
  WHERE id = p_transaction_id;

  v_new_values := jsonb_build_object(
    'category_id', COALESCE(p_category_id, v_tx.category_id),
    'spending_purpose', COALESCE(p_spending_purpose, v_tx.spending_purpose),
    'recipient_or_vendor', COALESCE(p_recipient_or_vendor, v_tx.recipient_or_vendor),
    'program_id', COALESCE(p_program_id, v_tx.program_id)
  );

  -- Log audit event for reclassification
  INSERT INTO public.audit_events (
    actor_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    status,
    description
  ) VALUES (
    v_user_id,
    'finance_reclassified',
    'finance_transactions',
    p_transaction_id::text,
    v_old_values,
    v_new_values,
    'success',
    format('Memperbarui rincian klasifikasi transaksi: %s', v_tx.description)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Rincian transaksi berhasil diperbarui.',
    'transaction_id', p_transaction_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_finance_transaction_classification(uuid, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_finance_transaction_classification(uuid, uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.update_finance_transaction_classification(uuid, uuid, text, text, uuid) TO service_role;

COMMIT;

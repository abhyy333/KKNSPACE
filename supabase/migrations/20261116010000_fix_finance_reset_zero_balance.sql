-- Migration: Fix finance reset zero balance and optional notes handling
-- 1. Ensure reset_finance_ledger explicitly handles p_new_initial_balance = 0 as valid numerical 0
-- 2. Cleanly handles p_notes as NULL when empty/whitespace (never '0' or unwanted defaults)

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
  v_new_book_number int;
  v_new_book_title text;
  v_count_all int := 0;
  v_total_income numeric := 0;
  v_total_expense numeric := 0;
  v_final_balance numeric := 0;
  v_reversed_ids uuid[];
  v_category_id uuid;
  v_clean_notes text;
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

  -- 2. Validate new initial balance (must be numeric and >= 0)
  IF p_new_initial_balance IS NULL OR p_new_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo awal buku kas baru harus berupa angka valid >= 0.';
  END IF;

  -- Clean notes: if empty or only whitespace, set to NULL (never '0' or placeholder text)
  v_clean_notes := NULLIF(TRIM(p_notes), '');

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
  SELECT COALESCE(array_agg(reversal_of_transaction_id), ARRAY[]::uuid[])
  INTO v_reversed_ids
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND reversal_of_transaction_id IS NOT NULL;

  SELECT count(*)
  INTO v_count_all
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id;

  SELECT COALESCE(sum(amount), 0)
  INTO v_total_income
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND type = 'income'
    AND reversal_of_transaction_id IS NULL
    AND id != ALL(v_reversed_ids);

  SELECT COALESCE(sum(amount), 0)
  INTO v_total_expense
  FROM public.finance_transactions
  WHERE book_id = v_active_book.id
    AND type = 'expense'
    AND reversal_of_transaction_id IS NULL
    AND id != ALL(v_reversed_ids);

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
      notes = v_clean_notes,
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
    v_clean_notes,
    now(),
    now()
  ) RETURNING id INTO v_new_book_id;

  -- 8. If new initial balance > 0, record an initial balance entry in the new book
  -- If p_new_initial_balance == 0, NO initial transaction is created; book starts clean at 0.
  IF p_new_initial_balance > 0 THEN
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
      'Saldo Awal Periode ' || v_new_book_number,
      'Modal kas awal buku kas baru setelah reset keuangan',
      CURRENT_DATE,
      v_user_id,
      false
    );
  END IF;

  -- 9. Audit log entry
  INSERT INTO public.audit_events (
    actor_id,
    actor_email,
    actor_authority,
    actor_name_snapshot,
    action,
    table_name,
    record_id,
    status,
    description,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_user_id,
    v_user_email,
    'super_admin',
    v_user_name,
    'RESET_LEDGER',
    'finance_books',
    v_new_book_id::text,
    'success',
    'Reset buku kas keuangan: ' || v_active_book.title || ' diarsipkan (saldo akhir Rp ' || v_final_balance || '), ' || v_new_book_title || ' aktif dengan saldo awal Rp ' || p_new_initial_balance,
    jsonb_build_object(
      'archived_book_id', v_active_book.id,
      'archived_book_number', v_active_book.book_number,
      'snapshot_transaction_count', v_count_all,
      'snapshot_total_income', v_total_income,
      'snapshot_total_expense', v_total_expense,
      'snapshot_final_balance', v_final_balance,
      'archived_at', now()
    ),
    jsonb_build_object(
      'new_book_id', v_new_book_id,
      'new_book_number', v_new_book_number,
      'new_book_title', v_new_book_title,
      'initial_balance', p_new_initial_balance,
      'notes', v_clean_notes
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reset buku kas berhasil dilakukan. Buku kas lama telah diarsipkan.',
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

-- Phase 4.1 Financial Management Hardening
-- Ensures ledger reversal consistency, category/type validation, attachment immutability,
-- anti-IDOR file_objects verification on finance_attachments, and full audit coverage.
-- Preserves all existing accounts, roles, and operational data.

-- 1. Validate finance transactions (descriptions, categories, and reversals)
CREATE OR REPLACE FUNCTION app_private.validate_finance_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  orig_record RECORD;
  cat_record RECORD;
BEGIN
  IF nullif(btrim(NEW.description), '') IS NULL THEN
    RAISE EXCEPTION 'Deskripsi transaksi tidak boleh kosong.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reversal_of_transaction_id IS NOT NULL THEN
    SELECT id, type, amount, category_id, reversal_of_transaction_id
    INTO orig_record
    FROM public.finance_transactions
    WHERE id = NEW.reversal_of_transaction_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transaksi asli yang akan dibalik tidak ditemukan.'
        USING ERRCODE = '23503';
    END IF;

    IF orig_record.reversal_of_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'Transaksi pembalik tidak dapat dibalik ulang.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.amount IS DISTINCT FROM orig_record.amount THEN
      RAISE EXCEPTION 'Nominal transaksi pembalik harus sama dengan transaksi asli.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.type = orig_record.type THEN
      RAISE EXCEPTION 'Jenis transaksi pembalik harus berlawanan dengan transaksi asli.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.category_id IS NOT NULL AND orig_record.category_id IS NOT NULL
       AND NEW.category_id IS DISTINCT FROM orig_record.category_id THEN
      RAISE EXCEPTION 'Kategori transaksi pembalik harus sesuai dengan transaksi asli.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.category_id IS NOT NULL THEN
      SELECT id, type, is_active
      INTO cat_record
      FROM public.finance_categories
      WHERE id = NEW.category_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Kategori transaksi tidak ditemukan.'
          USING ERRCODE = '23503';
      END IF;

      IF NOT cat_record.is_active THEN
        RAISE EXCEPTION 'Kategori transaksi sedang nonaktif dan tidak dapat dipilih.'
          USING ERRCODE = '23514';
      END IF;

      IF cat_record.type IS DISTINCT FROM NEW.type THEN
        RAISE EXCEPTION 'Kategori transaksi tidak sesuai dengan jenis pemasukan/pengeluaran.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_finance_transaction_before_insert ON public.finance_transactions;
CREATE TRIGGER validate_finance_transaction_before_insert
  BEFORE INSERT ON public.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION app_private.validate_finance_transaction();

-- 2. Harden finance_attachments (anti-IDOR insert, immutability, audit events)
DROP POLICY IF EXISTS finance_attachments_treasurer_insert ON public.finance_attachments;
CREATE POLICY finance_attachments_treasurer_insert
  ON public.finance_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_private.has_kkn_role('bendahara'))
    AND EXISTS (
      SELECT 1
      FROM public.file_objects fo
      WHERE fo.id = file_id
        AND fo.uploaded_by = (SELECT auth.uid())
        AND fo.bucket_id = 'kkn-private'
    )
  );

DROP TRIGGER IF EXISTS finance_attachments_immutable ON public.finance_attachments;
CREATE TRIGGER finance_attachments_immutable
  BEFORE UPDATE OR DELETE ON public.finance_attachments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.reject_finance_mutation();

DROP TRIGGER IF EXISTS audit_finance_attachments ON public.finance_attachments;
CREATE TRIGGER audit_finance_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.finance_attachments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

-- 3. Audit trail for finance_categories lifecycle
DROP TRIGGER IF EXISTS audit_finance_categories ON public.finance_categories;
CREATE TRIGGER audit_finance_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION app_private.write_audit_event();

-- 4. Performance indexes for period & category queries
CREATE INDEX IF NOT EXISTS finance_transactions_category_id_idx
  ON public.finance_transactions (category_id);

CREATE INDEX IF NOT EXISTS finance_transactions_type_date_idx
  ON public.finance_transactions (type, transaction_date DESC);

CREATE INDEX IF NOT EXISTS finance_transactions_recorded_by_idx
  ON public.finance_transactions (recorded_by);

CREATE INDEX IF NOT EXISTS finance_categories_type_active_idx
  ON public.finance_categories (type, is_active);

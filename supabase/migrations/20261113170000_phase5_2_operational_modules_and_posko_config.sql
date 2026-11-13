-- ====================================================================
-- PHASE 5.2 — OPERATIONAL MODULES & POSKO CONFIGURATION
-- Additive migration for Meetings, Inventory, Surveys, and Posko Settings
-- ====================================================================

-- 1. MODUL 1: RAPAT & NOTULENSI
-- --------------------------------------------------------------------
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE public.meeting_minutes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS key_points text,
  ADD COLUMN IF NOT EXISTS discussion_summary text,
  ADD COLUMN IF NOT EXISTS conclusions text;

ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  ADD COLUMN IF NOT EXISTS progress_notes text;

ALTER TABLE public.meeting_attendees
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.meeting_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.file_objects(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, file_id)
);

ALTER TABLE public.meeting_attachments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attachments TO authenticated;

DROP POLICY IF EXISTS meeting_attachments_read_members ON public.meeting_attachments;
CREATE POLICY meeting_attachments_read_members ON public.meeting_attachments
  FOR SELECT TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS meeting_attachments_lead_manage ON public.meeting_attachments;
CREATE POLICY meeting_attachments_lead_manage ON public.meeting_attachments
  FOR ALL TO authenticated
  USING ((SELECT app_private.has_kkn_role('ketua')) OR (SELECT app_private.has_kkn_role('sekretaris')))
  WITH CHECK ((SELECT app_private.has_kkn_role('ketua')) OR (SELECT app_private.has_kkn_role('sekretaris')));

DROP POLICY IF EXISTS super_admin_all_meeting_attachments ON public.meeting_attachments;
CREATE POLICY super_admin_all_meeting_attachments ON public.meeting_attachments
  FOR ALL TO authenticated
  USING ((SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_super_admin()));

DROP POLICY IF EXISTS meeting_attendees_self_update ON public.meeting_attendees;
CREATE POLICY meeting_attendees_self_update ON public.meeting_attendees
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT app_private.is_active_member()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS meeting_decisions_assignee_update ON public.meeting_decisions;
CREATE POLICY meeting_decisions_assignee_update ON public.meeting_decisions
  FOR UPDATE TO authenticated
  USING (responsible_user_id = (SELECT auth.uid()) AND (SELECT app_private.is_active_member()))
  WITH CHECK (responsible_user_id = (SELECT auth.uid()) AND (SELECT app_private.is_active_member()));


-- 2. MODUL 2: INVENTARIS & LOGISTIK POSKO
-- --------------------------------------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS item_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Lainnya',
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'asset' CHECK (item_type IN ('asset', 'consumable')),
  ADD COLUMN IF NOT EXISTS available_quantity integer NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS price numeric(14, 2),
  ADD COLUMN IF NOT EXISTS photo_file_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS responsible_person text;

CREATE TABLE IF NOT EXISTS public.inventory_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  borrower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'borrowed', 'returned', 'overdue', 'cancelled')),
  borrow_date timestamptz,
  expected_return_date timestamptz NOT NULL,
  actual_return_date timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  rejection_reason text,
  condition_before text NOT NULL DEFAULT 'good' CHECK (condition_before IN ('good', 'fair', 'damaged', 'lost')),
  condition_after text CHECK (condition_after IS NULL OR condition_after IN ('good', 'fair', 'damaged', 'lost')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_loans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_loans TO authenticated;

DROP POLICY IF EXISTS inventory_loans_read_members ON public.inventory_loans;
CREATE POLICY inventory_loans_read_members ON public.inventory_loans
  FOR SELECT TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS inventory_loans_borrower_insert ON public.inventory_loans;
CREATE POLICY inventory_loans_borrower_insert ON public.inventory_loans
  FOR INSERT TO authenticated
  WITH CHECK (
    borrower_id = (SELECT auth.uid()) 
    AND (SELECT app_private.is_active_member())
    AND status = 'pending'
  );

DROP POLICY IF EXISTS inventory_loans_borrower_cancel ON public.inventory_loans;
CREATE POLICY inventory_loans_borrower_cancel ON public.inventory_loans
  FOR UPDATE TO authenticated
  USING (
    borrower_id = (SELECT auth.uid()) 
    AND status = 'pending'
  )
  WITH CHECK (
    borrower_id = (SELECT auth.uid()) 
    AND status = 'cancelled'
  );

DROP POLICY IF EXISTS inventory_loans_manage_roles ON public.inventory_loans;
CREATE POLICY inventory_loans_manage_roles ON public.inventory_loans
  FOR ALL TO authenticated
  USING (
    (SELECT app_private.has_kkn_role('ketua')) 
    OR (SELECT app_private.has_kkn_role('sekretaris')) 
    OR (SELECT app_private.has_kkn_role('bendahara'))
  )
  WITH CHECK (
    (SELECT app_private.has_kkn_role('ketua')) 
    OR (SELECT app_private.has_kkn_role('sekretaris')) 
    OR (SELECT app_private.has_kkn_role('bendahara'))
  );

DROP POLICY IF EXISTS super_admin_all_inventory_loans ON public.inventory_loans;
CREATE POLICY super_admin_all_inventory_loans ON public.inventory_loans
  FOR ALL TO authenticated
  USING ((SELECT app_private.is_super_admin()))
  WITH CHECK ((SELECT app_private.is_super_admin()));

CREATE OR REPLACE FUNCTION public.approve_and_handout_inventory_loan(
  p_loan_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_loan record;
  v_item record;
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF NOT (
    (SELECT app_private.is_super_admin()) OR 
    (SELECT app_private.has_kkn_role('ketua')) OR 
    (SELECT app_private.has_kkn_role('sekretaris')) OR 
    (SELECT app_private.has_kkn_role('bendahara'))
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pengelola yang dapat menyetujui peminjaman.';
  END IF;

  SELECT * INTO v_loan FROM public.inventory_loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data peminjaman tidak ditemukan.';
  END IF;

  IF v_loan.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Peminjaman tidak dapat diserahkan karena berstatus: %', v_loan.status;
  END IF;

  SELECT * INTO v_item FROM public.inventory_items WHERE id = v_loan.item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data barang tidak ditemukan.';
  END IF;

  IF v_item.available_quantity < v_loan.quantity THEN
    RAISE EXCEPTION 'Stok barang tidak mencukupi. Tersedia: %, diminta: %', v_item.available_quantity, v_loan.quantity;
  END IF;

  UPDATE public.inventory_loans
  SET status = 'borrowed',
      borrow_date = COALESCE(borrow_date, now()),
      approved_by = v_user_id,
      approved_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_loan_id;

  UPDATE public.inventory_items
  SET available_quantity = available_quantity - v_loan.quantity,
      updated_at = now()
  WHERE id = v_loan.item_id;

  INSERT INTO public.inventory_movements(
    item_id,
    movement_type,
    quantity,
    user_id,
    notes,
    movement_date
  ) VALUES (
    v_loan.item_id,
    'borrow',
    v_loan.quantity,
    v_loan.borrower_id,
    COALESCE(p_notes, 'Peminjaman barang disetujui & diserahkan'),
    now()
  );

  RETURN jsonb_build_object('success', true, 'loan_id', p_loan_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.return_inventory_loan(
  p_loan_id uuid,
  p_condition_after text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_loan record;
  v_item record;
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF NOT (
    (SELECT app_private.is_super_admin()) OR 
    (SELECT app_private.has_kkn_role('ketua')) OR 
    (SELECT app_private.has_kkn_role('sekretaris')) OR 
    (SELECT app_private.has_kkn_role('bendahara'))
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pengelola yang dapat mencatat pengembalian.';
  END IF;

  IF p_condition_after NOT IN ('good', 'fair', 'damaged', 'lost') THEN
    RAISE EXCEPTION 'Kondisi barang setelah peminjaman tidak valid.';
  END IF;

  SELECT * INTO v_loan FROM public.inventory_loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data peminjaman tidak ditemukan.';
  END IF;

  IF v_loan.status <> 'borrowed' THEN
    RAISE EXCEPTION 'Peminjaman tidak dalam status dipinjam (status: %).', v_loan.status;
  END IF;

  SELECT * INTO v_item FROM public.inventory_items WHERE id = v_loan.item_id FOR UPDATE;

  UPDATE public.inventory_loans
  SET status = 'returned',
      actual_return_date = now(),
      condition_after = p_condition_after,
      notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
      updated_at = now()
  WHERE id = p_loan_id;

  IF p_condition_after = 'lost' THEN
    UPDATE public.inventory_items
    SET quantity = GREATEST(0, quantity - v_loan.quantity),
        condition = 'damaged',
        updated_at = now()
    WHERE id = v_loan.item_id;
  ELSE
    UPDATE public.inventory_items
    SET available_quantity = available_quantity + v_loan.quantity,
        condition = CASE WHEN p_condition_after = 'damaged' THEN 'damaged' ELSE condition END,
        updated_at = now()
    WHERE id = v_loan.item_id;
  END IF;

  INSERT INTO public.inventory_movements(
    item_id,
    movement_type,
    quantity,
    user_id,
    notes,
    movement_date
  ) VALUES (
    v_loan.item_id,
    'return',
    v_loan.quantity,
    v_loan.borrower_id,
    COALESCE(p_notes, format('Pengembalian barang kondisi: %s', p_condition_after)),
    now()
  );

  RETURN jsonb_build_object('success', true, 'loan_id', p_loan_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_item record;
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF NOT (
    (SELECT app_private.is_super_admin()) OR 
    (SELECT app_private.has_kkn_role('ketua')) OR 
    (SELECT app_private.has_kkn_role('sekretaris')) OR 
    (SELECT app_private.has_kkn_role('bendahara'))
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pengelola yang dapat mengubah stok.';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Jumlah penyesuaian harus lebih dari 0.';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'adjustment') THEN
    RAISE EXCEPTION 'Tipe mutasi tidak valid: %', p_movement_type;
  END IF;

  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RAISE EXCEPTION 'Alasan mutasi/penyesuaian stok wajib diisi.';
  END IF;

  SELECT * INTO v_item FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang tidak ditemukan.';
  END IF;

  IF p_movement_type = 'in' THEN
    UPDATE public.inventory_items
    SET quantity = quantity + p_quantity,
        available_quantity = available_quantity + p_quantity,
        updated_at = now()
    WHERE id = p_item_id;
  ELSIF p_movement_type = 'out' THEN
    IF v_item.available_quantity < p_quantity THEN
      RAISE EXCEPTION 'Stok tersedia tidak mencukupi (Tersedia: %, Pengurangan: %).', v_item.available_quantity, p_quantity;
    END IF;
    UPDATE public.inventory_items
    SET quantity = GREATEST(0, quantity - p_quantity),
        available_quantity = GREATEST(0, available_quantity - p_quantity),
        updated_at = now()
    WHERE id = p_item_id;
  ELSIF p_movement_type = 'adjustment' THEN
    UPDATE public.inventory_items
    SET quantity = p_quantity,
        available_quantity = GREATEST(0, p_quantity - (quantity - available_quantity)),
        updated_at = now()
    WHERE id = p_item_id;
  END IF;

  INSERT INTO public.inventory_movements(
    item_id,
    movement_type,
    quantity,
    user_id,
    notes,
    movement_date
  ) VALUES (
    p_item_id,
    p_movement_type,
    p_quantity,
    v_user_id,
    p_notes,
    now()
  );

  RETURN jsonb_build_object('success', true, 'item_id', p_item_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_and_handout_inventory_loan(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_inventory_loan(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(uuid, text, integer, text) TO authenticated;


-- 3. MODUL 3: SURVEI & PENDATAAN DESA
-- --------------------------------------------------------------------
ALTER TABLE public.survey_forms
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'lainnya' CHECK (category IN ('wilayah_dusun', 'ekonomi_umkm', 'potensi_desa', 'kebutuhan_warga', 'posyandu_agregat', 'lainnya')),
  ADD COLUMN IF NOT EXISTS target_dusun text,
  ADD COLUMN IF NOT EXISTS template_key text;

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'verified', 'archived')),
  ADD COLUMN IF NOT EXISTS respondent_name text,
  ADD COLUMN IF NOT EXISTS dusun text,
  ADD COLUMN IF NOT EXISTS location_details text,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS survey_responses_read_members ON public.survey_responses;
CREATE POLICY survey_responses_read_members ON public.survey_responses
  FOR SELECT TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS survey_responses_member_insert ON public.survey_responses;
CREATE POLICY survey_responses_member_insert ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (SELECT auth.uid()) 
    AND (SELECT app_private.is_active_member())
  );

DROP POLICY IF EXISTS survey_responses_member_update_own ON public.survey_responses;
CREATE POLICY survey_responses_member_update_own ON public.survey_responses
  FOR UPDATE TO authenticated
  USING (
    submitted_by = (SELECT auth.uid()) 
    AND status = 'draft'
  )
  WITH CHECK (
    submitted_by = (SELECT auth.uid()) 
    AND status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS survey_answers_read_members ON public.survey_answers;
CREATE POLICY survey_answers_read_members ON public.survey_answers
  FOR SELECT TO authenticated
  USING ((SELECT app_private.is_active_member()));

DROP POLICY IF EXISTS survey_answers_member_insert ON public.survey_answers;
CREATE POLICY survey_answers_member_insert ON public.survey_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr 
      WHERE sr.id = response_id AND sr.submitted_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS survey_answers_member_update ON public.survey_answers;
CREATE POLICY survey_answers_member_update ON public.survey_answers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr 
      WHERE sr.id = response_id AND sr.submitted_by = (SELECT auth.uid()) AND sr.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr 
      WHERE sr.id = response_id AND sr.submitted_by = (SELECT auth.uid())
    )
  );


-- 4. MODUL 4: PENGATURAN POSKO & KONFIGURASI KKN
-- --------------------------------------------------------------------
ALTER TABLE public.group_settings
  ADD COLUMN IF NOT EXISTS platform_name text DEFAULT 'KKN SPACE',
  ADD COLUMN IF NOT EXISTS university text DEFAULT 'Universitas Mataram',
  ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2026/2027',
  ADD COLUMN IF NOT EXISTS kkn_batch text DEFAULT 'Periode II 2026',
  ADD COLUMN IF NOT EXISTS province text DEFAULT 'Nusa Tenggara Barat',
  ADD COLUMN IF NOT EXISTS regency text DEFAULT 'Lombok Timur',
  ADD COLUMN IF NOT EXISTS district text DEFAULT 'Pringgasela',
  ADD COLUMN IF NOT EXISTS village text DEFAULT 'Pringgasela Selatan',
  ADD COLUMN IF NOT EXISTS posko_dusun text DEFAULT 'Pringgasela Daye',
  ADD COLUMN IF NOT EXISTS posko_address text DEFAULT 'Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur',
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS prep_date date,
  ADD COLUMN IF NOT EXISTS withdrawal_date date,
  ADD COLUMN IF NOT EXISTS dpl_name text DEFAULT 'Lalu Muhammad Aby Dujana, M.Si.',
  ADD COLUMN IF NOT EXISTS dpl_nip text,
  ADD COLUMN IF NOT EXISTS dpl_contact text,
  ADD COLUMN IF NOT EXISTS posko_description text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS important_notes text,
  ADD COLUMN IF NOT EXISTS posko_photo_file_id uuid REFERENCES public.file_objects(id) ON DELETE SET NULL;

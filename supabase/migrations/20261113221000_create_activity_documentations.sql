-- ==============================================================================
-- KKN SPACE — PUBLIC ACTIVITY DOCUMENTATION & PHOTO ALBUMS
-- Migration: 20261113221000_create_activity_documentations.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.activity_documentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'program_kerja',
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT,
  end_time TEXT,
  location_name TEXT NOT NULL,
  dusun_name TEXT,
  objectives TEXT,
  execution_steps TEXT,
  results TEXT,
  photographer_name TEXT,
  cover_photo_id UUID REFERENCES public.file_objects(id) ON DELETE SET NULL,
  cover_photo_path TEXT,
  publication_status TEXT NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT now(),
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_activity_doc_status CHECK (publication_status IN ('draft', 'published', 'archived')),
  CONSTRAINT chk_activity_doc_category CHECK (category IN ('program_kerja', 'observasi_survei', 'kegiatan_desa', 'sosialisasi', 'lainnya'))
);

CREATE TABLE IF NOT EXISTS public.activity_documentation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activity_documentations(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.file_objects(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photographer TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_docs_status_date ON public.activity_documentations(publication_status, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_docs_slug ON public.activity_documentations(slug);
CREATE INDEX IF NOT EXISTS idx_activity_docs_category ON public.activity_documentations(category);
CREATE INDEX IF NOT EXISTS idx_activity_doc_photos_activity_id ON public.activity_documentation_photos(activity_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_activity_doc_photos_file_id ON public.activity_documentation_photos(file_id);

-- Enable RLS
ALTER TABLE public.activity_documentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_documentation_photos ENABLE ROW LEVEL SECURITY;

-- Helper check for active workspace member or admin
CREATE OR REPLACE FUNCTION public.is_active_kkn_member(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = $1 AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.system_admins
    WHERE user_id = $1
  );
$$;

-- RLS Policies for activity_documentations
DROP POLICY IF EXISTS "Public can view published activity documentations" ON public.activity_documentations;
CREATE POLICY "Public can view published activity documentations"
ON public.activity_documentations
FOR SELECT
TO public
USING (
  publication_status = 'published'
  OR (auth.uid() IS NOT NULL AND public.is_active_kkn_member(auth.uid()))
);

DROP POLICY IF EXISTS "Members can insert activity documentations" ON public.activity_documentations;
CREATE POLICY "Members can insert activity documentations"
ON public.activity_documentations
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_kkn_member(auth.uid()));

DROP POLICY IF EXISTS "Members can update activity documentations" ON public.activity_documentations;
CREATE POLICY "Members can update activity documentations"
ON public.activity_documentations
FOR UPDATE
TO authenticated
USING (public.is_active_kkn_member(auth.uid()))
WITH CHECK (public.is_active_kkn_member(auth.uid()));

DROP POLICY IF EXISTS "Members can delete activity documentations" ON public.activity_documentations;
CREATE POLICY "Members can delete activity documentations"
ON public.activity_documentations
FOR DELETE
TO authenticated
USING (public.is_active_kkn_member(auth.uid()));

-- RLS Policies for activity_documentation_photos
DROP POLICY IF EXISTS "Public can view photos of published activities" ON public.activity_documentation_photos;
CREATE POLICY "Public can view photos of published activities"
ON public.activity_documentation_photos
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.activity_documentations a
    WHERE a.id = activity_documentation_photos.activity_id
      AND (a.publication_status = 'published' OR (auth.uid() IS NOT NULL AND public.is_active_kkn_member(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Members can insert activity photos" ON public.activity_documentation_photos;
CREATE POLICY "Members can insert activity photos"
ON public.activity_documentation_photos
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_kkn_member(auth.uid()));

DROP POLICY IF EXISTS "Members can update activity photos" ON public.activity_documentation_photos;
CREATE POLICY "Members can update activity photos"
ON public.activity_documentation_photos
FOR UPDATE
TO authenticated
USING (public.is_active_kkn_member(auth.uid()))
WITH CHECK (public.is_active_kkn_member(auth.uid()));

DROP POLICY IF EXISTS "Members can delete activity photos" ON public.activity_documentation_photos;
CREATE POLICY "Members can delete activity photos"
ON public.activity_documentation_photos
FOR DELETE
TO authenticated
USING (public.is_active_kkn_member(auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_activity_doc_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_doc_updated_at ON public.activity_documentations;
CREATE TRIGGER trg_activity_doc_updated_at
BEFORE UPDATE ON public.activity_documentations
FOR EACH ROW
EXECUTE FUNCTION public.handle_activity_doc_updated_at();

-- Seed initial activities
DO $$
DECLARE
  v_first_file_id UUID;
  v_second_file_id UUID;
  v_third_file_id UUID;
  v_first_path TEXT;
  v_second_path TEXT;
  v_third_path TEXT;
  v_act1_id UUID := 'a1111111-1111-4111-a111-111111111111';
  v_act2_id UUID := 'a2222222-2222-4222-a222-222222222222';
  v_act3_id UUID := 'a3333333-3333-4333-a333-333333333333';
BEGIN
  -- Grab sample files from file_objects if present
  SELECT id, object_path INTO v_first_file_id, v_first_path
  FROM public.file_objects
  WHERE mime_type LIKE 'image/%'
  ORDER BY created_at ASC LIMIT 1;

  SELECT id, object_path INTO v_second_file_id, v_second_path
  FROM public.file_objects
  WHERE mime_type LIKE 'image/%' AND id != v_first_file_id
  ORDER BY created_at ASC LIMIT 1;

  SELECT id, object_path INTO v_third_file_id, v_third_path
  FROM public.file_objects
  WHERE mime_type LIKE 'image/%' AND id NOT IN (COALESCE(v_first_file_id, '00000000-0000-0000-0000-000000000000'), COALESCE(v_second_file_id, '00000000-0000-0000-0000-000000000000'))
  ORDER BY created_at ASC LIMIT 1;

  -- Insert Activity 1: Digitalisasi UMKM
  INSERT INTO public.activity_documentations (
    id, title, slug, category, short_description, description,
    activity_date, start_time, end_time, location_name, dusun_name,
    objectives, execution_steps, results, photographer_name,
    cover_photo_id, cover_photo_path, publication_status, sort_order
  ) VALUES (
    v_act1_id,
    'Digitalisasi & Pendampingan UMKM Tenun Ikat dan Pangan Lokal',
    'digitalisasi-pendampingan-umkm-tenun-ikat-pangan-lokal',
    'program_kerja',
    'Pendampingan pelaku UMKM lokal dalam pembuatan katalog produk digital, QRIS, dan kemasan higienis berstandar pasar.',
    'Kegiatan pendampingan intensif bagi pelaku usaha mikro, kecil, dan menengah (UMKM) tenun tradisional dan pengrajin kuliner Desa Pringgasela Selatan. Program ini bertujuan memperkenalkan ekosistem perdagangan digital, optimalisasi branding visual kemasan, serta pendaftaran merchant QRIS guna mempermudah transaksi pengunjung sentra tenun.',
    '2026-11-12',
    '09:00',
    '15:30',
    'Sentra Tenun Pringgasela Selatan',
    'Dusun Gubuk Timuk',
    '1. Meningkatkan literasi keuangan dan transaksi digital bagi pengrajin tenun tradisional.\n2. Membuat profil dan etalase digital produk tenun Pringgasela Selatan.\n3. Membantu pendaftaran QRIS bagi kelompok usaha wanita binaan desa.',
    '1. Identifikasi dan inventarisasi produk unggulan tenun dan kuliner lokal.\n2. Workshop interaktif pemanfaatan smartphone untuk fotografi produk komersial.\n3. Asistensi langsung pembukaan rekening merchant dan pembuatan QRIS.\n4. Penyusunan deskripsi dan katalog digital produk desa.',
    'Sebanyak 14 pelaku UMKM tenun dan olahan pangan berhasil memiliki QRIS aktif dan etalase produk digital. Foto produk telah terstandarisasi untuk promosi pada portal desa.',
    'Muhammad Agits Haibatulloh',
    v_first_file_id,
    COALESCE(v_first_path, 'brand/kkn-pringgasela-selatan-2026-2027.png'),
    'published',
    1
  ) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description;

  -- Insert Photos for Activity 1
  IF v_first_file_id IS NOT NULL AND v_first_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act1_id, v_first_file_id, v_first_path, 'Sesi pemotretan produk kain tenun songket khas Pringgasela Selatan', 'Muhammad Agits Haibatulloh', 1, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_second_file_id IS NOT NULL AND v_second_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act1_id, v_second_file_id, v_second_path, 'Pendampingan langsung registrasi merchant transaksi digital', 'Dini Aprilia', 2, false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_third_file_id IS NOT NULL AND v_third_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act1_id, v_third_file_id, v_third_path, 'Diskusi bersama pengrajin tenun mengenai strategi pemasaran digital', 'Tim Dokumentasi KKN', 3, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert Activity 2: Observasi Sanitasi & Posyandu
  INSERT INTO public.activity_documentations (
    id, title, slug, category, short_description, description,
    activity_date, start_time, end_time, location_name, dusun_name,
    objectives, execution_steps, results, photographer_name,
    cover_photo_id, cover_photo_path, publication_status, sort_order
  ) VALUES (
    v_act2_id,
    'Observasi Lapangan Pemetaan Sanitasi Dusun & Layanan Posyandu',
    'observasi-lapangan-pemetaan-sanitasi-posyandu',
    'observasi_survei',
    'Observasi komprehensif mata air desa, fasilitas posyandu, dan pemetaan sarana sanitasi dusun.',
    'Pelaksanaan survei lapangan dan observasi langsung ke beberapa dusun di Desa Pringgasela Selatan untuk mengumpulkan data riil mengenai ketersediaan sarana sanitasi warga, kebersihan aliran drainase, serta jadwal dan fasilitas pemeriksaan balita pada Posyandu setempat.',
    '2026-11-09',
    '08:30',
    '14:00',
    'Balai Dusun Dasan Baru & Posyandu Melati',
    'Dusun Dasan Baru',
    '1. Memetakan kondisi fisik saluran drainase dan akses air bersih rumah tangga.\n2. Meninjau ketersediaan instrumen penimbangan dan pencatatan gizi balita di Posyandu.\n3. Merumuskan rekomendasi intervensi sanitasi posko KKN.',
    '1. Koordinasi dengan Kepala Dusun dan kader posyandu setempat.\n2. Penelusuran rute saluran sanitasi warga sepanjang 1,2 km.\n3. Observasi proses penimbangan dan pemberian makanan tambahan (PMT) balita.\n4. Input data temuan ke formulir survei desa KKN SPACE.',
    'Data 82 balita posyandu terverifikasi. Teridentifikasi 2 titik saluran drainase yang memerlukan kerja bakti pembersihan berkala bersama warga.',
    'Dini Aprilia',
    v_second_file_id,
    COALESCE(v_second_path, 'brand/kkn-pringgasela-selatan-2026-2027.png'),
    'published',
    2
  ) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description;

  IF v_second_file_id IS NOT NULL AND v_second_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act2_id, v_second_file_id, v_second_path, 'Pemeriksaan catatan tumbuh kembang balita bersama kader Posyandu Melati', 'Dini Aprilia', 1, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_first_file_id IS NOT NULL AND v_first_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act2_id, v_first_file_id, v_first_path, 'Peninjauan sarana sanitasi dan jalur pipa mata air pegunungan', 'Muhammad Agits Haibatulloh', 2, false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert Activity 3: Sosialisasi dan Musyawarah Desa
  INSERT INTO public.activity_documentations (
    id, title, slug, category, short_description, description,
    activity_date, start_time, end_time, location_name, dusun_name,
    objectives, execution_steps, results, photographer_name,
    cover_photo_id, cover_photo_path, publication_status, sort_order
  ) VALUES (
    v_act3_id,
    'Musyawarah Desa & Pemaparan Rencana Kerja KKN Pringgasela Selatan',
    'musyawarah-desa-pemaparan-rencana-kerja-kkn',
    'kegiatan_desa',
    'Pertemuan silaturahmi dan sambutan resmi perangkat desa, BPD, tokoh agama, serta karang taruna menyambut mahasiswa KKN UNRAM.',
    'Kegiatan musyawarah desa perdana yang diselenggarakan di Aula Pertemuan Kantor Desa Pringgasela Selatan. Acara dihadiri Kepala Desa, jajaran perangkat desa, Badan Permusyawaratan Desa (BPD), tokoh pemuda Karang Taruna, serta Dosen Pembimbing Lapangan (DPL) secara virtual.',
    '2026-11-05',
    '19:30',
    '22:00',
    'Aula Pertemuan Kantor Desa Pringgasela Selatan',
    'Dusun Selatan',
    '1. Menjalin silaturahmi dan memperkenalkan seluruh anggota tim mahasiswa KKN UNRAM.\n2. Memaparkan 4 program kerja prioritas yang akan dijalankan selama periode KKN.\n3. Menampung masukan dan menyelaraskan jadwal kegiatan dengan agenda kemasyarakatan desa.',
    '1. Pembukaan oleh MC dan sambutan selamat datang oleh Kepala Desa Pringgasela Selatan.\n2. Sambutan perwakilan DPL UNRAM.\n3. Presentasi rencana kerja oleh Ketua KKN.\n4. Sesi tanya jawab dan masukan dari kepala dusun dan tokoh masyarakat.\n5. Doa bersama dan ramah tamah.',
    'Seluruh program kerja disepakati dan mendapat dukungan penuh dari pihak desa. Posko KKN resmi beroperasi dan terintegrasi dalam kalender kegiatan desa.',
    'Tim Dokumentasi KKN',
    v_third_file_id,
    COALESCE(v_third_path, 'brand/kkn-pringgasela-selatan-2026-2027.png'),
    'published',
    3
  ) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description;

  IF v_third_file_id IS NOT NULL AND v_third_path IS NOT NULL THEN
    INSERT INTO public.activity_documentation_photos (activity_id, file_id, storage_path, caption, photographer, sort_order, is_cover)
    VALUES (v_act3_id, v_third_file_id, v_third_path, 'Penyampaian paparan program kerja oleh Ketua KKN di depan perangkat desa', 'Tim Dokumentasi KKN', 1, true)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

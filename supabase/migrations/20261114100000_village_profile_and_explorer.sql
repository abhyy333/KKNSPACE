-- Migration: 20261114100000_village_profile_and_explorer.sql
-- Description: Schema and seed data for Premium Village Profile, Cultural Heritage & Interactive Geographic Explorer (Desa Pringgasela Selatan)

-- Drop existing legacy table if exists
DROP TABLE IF EXISTS public.village_profile CASCADE;

-- 1. Main Village Profile Table
CREATE TABLE IF NOT EXISTS public.village_profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_title TEXT NOT NULL DEFAULT 'Pringgasela Selatan',
  hero_subtitle TEXT NOT NULL DEFAULT 'Merawat Warisan, Menumbuhkan Masa Depan',
  hero_image_url TEXT NOT NULL DEFAULT '/assets/village/dongdala_hias_desa.jpg',
  overview TEXT NOT NULL,
  history_narrative TEXT NOT NULL,
  established_year INT NOT NULL DEFAULT 2010,
  decree_preparation TEXT NOT NULL DEFAULT 'Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010',
  decree_definitive TEXT NOT NULL DEFAULT 'Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011',
  kades_name TEXT NOT NULL DEFAULT 'Baihaki Habil',
  area_hectares NUMERIC NOT NULL DEFAULT 465,
  elevation_masl TEXT NOT NULL DEFAULT '350 - 450 mdpl',
  jadesta_id TEXT NOT NULL DEFAULT '63548',
  stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  boundaries JSONB NOT NULL DEFAULT '{}'::jsonb,
  trah_diversity JSONB NOT NULL DEFAULT '[]'::jsonb,
  geojson_data JSONB,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Village Dusun / Kewilayahan Table
CREATE TABLE IF NOT EXISTS public.village_dusuns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  order_index INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  key_potentials TEXT[] NOT NULL DEFAULT '{}',
  notable_places TEXT[] NOT NULL DEFAULT '{}',
  center_coordinates JSONB NOT NULL DEFAULT '{"lat": -8.5492, "lng": 116.4485}'::jsonb,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Village Destinations Table
CREATE TABLE IF NOT EXISTS public.village_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('alam', 'budaya', 'buatan', 'religi', 'agrowisata')),
  status_type TEXT NOT NULL CHECK (status_type IN ('destinasi_dikelola', 'potensi_wisata', 'sentra_kerajinan', 'lokasi_budaya')),
  dusun_name TEXT NOT NULL,
  description TEXT NOT NULL,
  uniqueness TEXT NOT NULL,
  activities TEXT[] NOT NULL DEFAULT '{}',
  access_info TEXT,
  coordinates JSONB NOT NULL DEFAULT '{"lat": -8.5492, "lng": 116.4485}'::jsonb,
  cover_image_url TEXT,
  sources TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Village Cultural Heritage Table
CREATE TABLE IF NOT EXISTS public.village_cultural_heritages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tenun', 'festival', 'kesenian_musik', 'tradisi_religi', 'batik', 'keberagaman')),
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  dusun_origin TEXT NOT NULL,
  preservation_efforts TEXT,
  cover_image_url TEXT,
  references_text TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Village Economic Potentials Table
CREATE TABLE IF NOT EXISTS public.village_economic_potentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('pertanian', 'umkm_tenun', 'umkm_batik', 'kerajinan_kayu', 'pariwisata_desa')),
  dusun_name TEXT NOT NULL,
  description TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Village Gallery Items Table
CREATE TABLE IF NOT EXISTS public.village_gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('alam', 'kerajinan', 'budaya', 'masyarakat', 'pertanian', 'pariwisata', 'festival')),
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  location TEXT NOT NULL,
  year_taken TEXT NOT NULL,
  credit TEXT NOT NULL,
  license_note TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Village References Table
CREATE TABLE IF NOT EXISTS public.village_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author_publisher TEXT NOT NULL,
  year TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('pemerintah', 'akademik', 'media', 'arsip_desa')),
  notes TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.village_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_dusuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_cultural_heritages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_economic_potentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_references ENABLE ROW LEVEL SECURITY;

-- Public can read published data
CREATE POLICY "Public can read published village_profiles"
  ON public.village_profiles FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published village_dusuns"
  ON public.village_dusuns FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published village_destinations"
  ON public.village_destinations FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published village_cultural_heritages"
  ON public.village_cultural_heritages FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published village_economic_potentials"
  ON public.village_economic_potentials FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read published village_gallery_items"
  ON public.village_gallery_items FOR SELECT
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Public can read village_references"
  ON public.village_references FOR SELECT
  TO PUBLIC USING (true);

-- Super Admins have full management access (INSERT, UPDATE, DELETE)
CREATE POLICY "Super Admins can manage village_profiles"
  ON public.village_profiles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_dusuns"
  ON public.village_dusuns FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_destinations"
  ON public.village_destinations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_cultural_heritages"
  ON public.village_cultural_heritages FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_economic_potentials"
  ON public.village_economic_potentials FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_gallery_items"
  ON public.village_gallery_items FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can manage village_references"
  ON public.village_references FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));

-- ==========================================
-- SEED FACTUAL DATA (DESA PRINGGASELA SELATAN)
-- ==========================================

-- 1. Seed Main Profile
INSERT INTO public.village_profiles (
  id,
  hero_title,
  hero_subtitle,
  hero_image_url,
  overview,
  history_narrative,
  established_year,
  decree_preparation,
  decree_definitive,
  kades_name,
  area_hectares,
  elevation_masl,
  jadesta_id,
  stats,
  boundaries,
  trah_diversity,
  is_published
) VALUES (
  'default',
  'Pringgasela Selatan',
  'Merawat Warisan, Menumbuhkan Masa Depan',
  '/assets/village/dongdala_hias_desa.jpg',
  'Desa Pringgasela Selatan merupakan desa agraris dan sentra kebudayaan Sasak di lereng tenggara Gunung Rinjani, Kecamatan Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat. Dikenal dengan kekayaan tradisi tenun songket gedogan, kesegaran mata air alami Timba Gerah, panorama air terjun Goa Kopong, persawahan berlatar Rinjani di Batu Tambun, serta keharmonisan tiga trah suku besar yang hidup berdampingan secara rukun.',
  'Desa Pringgasela Selatan merupakan hasil pemekaran dari Desa Pringgasela (desa induk). Langkah pembentukan berawal dari peresmian sebagai Desa Persiapan pada tanggal 15 November 2010 berdasarkan Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010. Melalui dinamika aspirasi dan kesiapan tata kelola wilayah, desa ini resmi ditetapkan sebagai Desa Definitif pada tanggal 25 November 2011 berdasarkan Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011 di bawah kepemimpinan Kepala Desa Baihaki Habil. Masyarakat desa terdiri atas perpaduan tiga trah historis (Pringgasela, Rempung/Sumbawa, dan Masbagik) yang bersatu padu membangun kemandirian ekonomi desa berbasis pertanian terpadu dan kriya tenun tradisional.',
  2010,
  'Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010',
  'Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011',
  'Baihaki Habil',
  465,
  '350 - 450 mdpl',
  '63548',
  '[
    {"label": "Luas Wilayah", "value": "465 Ha", "year": "2024", "source": "Dokumen Profil Desa & Jadesta Kemenpar", "note": "Dominasi lahan persawahan irigasi teknis dan perkebunan"},
    {"label": "Kewilayahan Dusun", "value": "7 Dusun", "year": "2024", "source": "Perbup Lotim No. 7/2011", "note": "Gubuk Lauk, Gubuk Rempung, Sinar Sari, Kedondong, Timba Gerah, Pancor Kopong, Pancor Kopong Utara"},
    {"label": "Ketinggian Wilayah", "value": "350 - 450 mdpl", "year": "2024", "source": "BPS Kabupaten Lombok Timur", "note": "Kawasan lereng tenggara Gunung Rinjani berhawa sejuk"},
    {"label": "Keberagaman Kultural", "value": "3 Trah Historis", "year": "2024", "source": "Katalog Jadesta Kemenpar RI", "note": "Trah Pringgasela, Trah Rempung/Sumbawa, Trah Masbagik"},
    {"label": "Prestasi Kebudayaan", "value": "Top 10 Nasional", "year": "2022", "source": "Kemendikbudristek RI", "note": "Nominasi Desa Budaya Unggulan Tingkat Nasional dari 385 Desa se-Indonesia"},
    {"label": "Klasifikasi Desa Wisata", "value": "Desa Wisata Rintisan", "year": "2024", "source": "Jadesta Kemenpar (ID #63548)", "note": "Fokus pariwisata berbasis budaya tenun, alam mata air, dan agrowisata"}
  ]'::jsonb,
  '{
    "north": "Desa Pringgasela (Desa Induk, Kecamatan Pringgasela)",
    "south": "Desa Rempung (Kecamatan Pringgasela)",
    "west": "Desa Masbagik Baru (Kecamatan Masbagik)",
    "east": "Desa Pringgasela Timur (Kecamatan Pringgasela)"
  }'::jsonb,
  '[
    {
      "name": "Trah Pringgasela",
      "origin": "Keluarga & keturunan asal Pringgasela Induk (Tanaq Gadang)",
      "character": "Mewarisi kearifan tenun songket gedogan, tradisi keagamaan Sasak, dan tatanan adat luhur yang berpusat di wilayah utara desa (Gubuk Lauk)."
    },
    {
      "name": "Trah Rempung (Sumbawa)",
      "origin": "Keturunan perantau leluhur Tanah Samawa (Sumbawa) & Rempung",
      "character": "Membawa jejak relasi kultural Samawa di koridor selatan (Gubuk Rempung), tradisi agraris yang tangguh, serta penghormatan pada tokoh ulama TGH. Muhammad Toyyib."
    },
    {
      "name": "Trah Masbagik",
      "origin": "Komunitas masyarakat yang terhubung ke perbatasan barat Masbagik",
      "character": "Memperkaya dialek bahasa, dinamika perdagangan lokal, serta keahlian seni kriya batik Sasambo dan kriya pertukangan di Kedondong."
    }
  ]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  hero_image_url = EXCLUDED.hero_image_url,
  overview = EXCLUDED.overview,
  history_narrative = EXCLUDED.history_narrative,
  stats = EXCLUDED.stats,
  boundaries = EXCLUDED.boundaries,
  trah_diversity = EXCLUDED.trah_diversity,
  updated_at = NOW();

-- 2. Seed 7 Dusun
INSERT INTO public.village_dusuns (name, slug, order_index, description, key_potentials, notable_places, center_coordinates, cover_image_url, is_published)
VALUES
  (
    'Gubuk Lauk',
    'gubuk-lauk',
    1,
    'Dusun pusat administrasi desa sekaligus sentra kerajinan tenun songket tradisional dengan alat gedogan. Rumah bagi komunitas perempuan penenun yang mewariskan teknik tenun bukan mesin secara turun-temurun.',
    ARRAY['Sentra Tenun Gedogan', 'Sekolah Tenun Anak Usia Dini', 'Pewarnaan Benang Alami', 'Pelayanan Kantor Desa'],
    ARRAY['Kantor Desa Pringgasela Selatan', 'Sanggar Tenun Gedogan Gubuk Lauk', 'Posko Pengabdian KKN'],
    '{"lat": -8.5485, "lng": 116.4490}'::jsonb,
    '/assets/village/tenun_gedogan_gubuk_lauk.jpg',
    true
  ),
  (
    'Gubuk Rempung',
    'gubuk-rempung',
    2,
    'Kewilayahan di koridor selatan yang kental dengan sejarah dakwah Islam dan pembauran trah Rempung/Sumbawa. Menjadi pusat ziarah masyarakat berkat makam ulama kharismatik TGH. Muhammad Toyyib.',
    ARRAY['Wisata Religi Makam TGH. Muhammad Toyyib', 'Kearifan Tradisi Ziarah', 'Pelestarian Zikir Zaman'],
    ARRAY['Makam Ulama TGH. Muhammad Toyyib', 'Ruas Jalan Utama Jl. TGH. Muhammad Toyib'],
    '{"lat": -8.5585, "lng": 116.4465}'::jsonb,
    '/assets/village/kerajinan_budaya_desa.jpg',
    true
  ),
  (
    'Kedondong',
    'kedondong',
    3,
    'Sentra kreativitas batik khas Nusa Tenggara Barat (Batik Sasambo). Memadukan kreasi motif Sasak, Samawa, dan Mbojo dengan konsep wisata edukasi berkelanjutan (sustainable tourism) yang dikunjungi wisatawan lokal dan mancanegara.',
    ARRAY['Produksi Batik Sasambo (Tulis & Cap)', 'Wisata Edukasi Membatik Bale Seagana', 'Pewarnaan Ramah Lingkungan'],
    ARRAY['Sanggar Seagana Batik Sasambo', 'Bale Workshop Batik Kedondong'],
    '{"lat": -8.5510, "lng": 116.4440}'::jsonb,
    '/assets/village/verifikasi_desa_budaya.jpg',
    true
  ),
  (
    'Timba Gerah',
    'timba-gerah',
    4,
    'Dusun yang dianugerahi limpahan mata air alami pegunungan yang tidak pernah surut meski musim kemarau panjang. Dikenal dengan kolam pemandian mata air segar serta sentra pertukangan kriya dan mebel kayu.',
    ARRAY['Kolam Renang Madu (Mata Air Alami)', 'Sentra Pengrajin Kayu & Mebel', 'Pertanian Sayur & Hortikultura'],
    ARRAY['Kolam Renang Madu', 'Mata Air Alami Timba Gerah', 'Bengkel Mebel Kayu Warga'],
    '{"lat": -8.5535, "lng": 116.4520}'::jsonb,
    '/assets/village/aparatur_desa_pringgasela_selatan.jpg',
    true
  ),
  (
    'Pancor Kopong',
    'pancor-kopong',
    5,
    'Kawasan bentang alam di sisi barat laut yang menyimpan daya tarik wisata air celah tebing bebatuan Goa Kopong serta menjadi basis pelestarian kesenian musik tradisional Klenang Nunggal yang nyaris punah.',
    ARRAY['Objek Wisata Air Terjun Goa Kopong', 'Kesenian Musik Tradisional Klenang Nunggal', 'Pemandian Mata Air Alami'],
    ARRAY['Kawasan Pemandian Alami Pancor Kopong', 'Sanggar Kesenian Tradisional Klenang'],
    '{"lat": -8.5410, "lng": 116.4430}'::jsonb,
    '/assets/village/goa_kopong_wisata_air.jpg',
    true
  ),
  (
    'Pancor Kopong Utara',
    'pancor-kopong-utara',
    6,
    'Wilayah hulu perbatasan perbukitan dan aliran sungai pegunungan yang asri, perkebunan bambu tradisional, serta jalur pelestarian sumber air resapan hulu Goa Kopong.',
    ARRAY['Hulu Aliran Celah Tebing Goa Kopong', 'Konservasi Daerah Aliran Sungai', 'Kebun Bambu Tradisional'],
    ARRAY['Celah Hulu Aliran Sungai Goa Kopong', 'Spot Tracking Alami'],
    '{"lat": -8.5375, "lng": 116.4425}'::jsonb,
    '/assets/village/dongdala_hias_desa.jpg',
    true
  ),
  (
    'Sinar Sari',
    'sinar-sari',
    7,
    'Kewilayahan agraris dengan bentang persawahan subur, jalur irigasi desa, serta perkebunan rakyat yang menopang ketahanan pangan dan aktivitas tani harian masyarakat desa.',
    ARRAY['Pertanian Padi & Jagung', 'Peternakan Rakyat', 'Agrowisata Pedesaan'],
    ARRAY['Persawahan Sinar Sari', 'Jalur Usaha Tani Lingkar Desa'],
    '{"lat": -8.5560, "lng": 116.4500}'::jsonb,
    '/assets/village/festival_dongdala_nyiru.jpg',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  order_index = EXCLUDED.order_index,
  description = EXCLUDED.description,
  key_potentials = EXCLUDED.key_potentials,
  notable_places = EXCLUDED.notable_places,
  center_coordinates = EXCLUDED.center_coordinates,
  cover_image_url = EXCLUDED.cover_image_url,
  updated_at = NOW();

-- 3. Seed Destinations
INSERT INTO public.village_destinations (name, slug, category, status_type, dusun_name, description, uniqueness, activities, access_info, coordinates, cover_image_url, sources, order_index, is_published)
VALUES
  (
    'Air Terjun & Pemandian Goa Kopong',
    'goa-kopong',
    'alam',
    'potensi_wisata',
    'Pancor Kopong / Pancor Kopong Utara',
    'Objek wisata alam berupa air terjun alami dan pemandian mata air yang mengalir dari celah tebing bebatuan goa rimbun. Airnya sangat jernih dan segar karena bersumber langsung dari mata air pegunungan Rinjani.',
    'Formasi ceruk bebatuan mirip goa alami dengan kucuran air terjun sejuk di tengah persawahan dan pepohonan asri perbatasan Pringgasela Selatan.',
    ARRAY['Berenang di pemandian alami', 'Fotografi alam celah tebing goa', 'Relaksasi mata air pegunungan'],
    'Dapat diakses sekitar 10 menit dari Kantor Desa Pringgasela Selatan via jalan dusun beraspal dan jalan semen pematang sawah.',
    '{"lat": -8.5395, "lng": 116.4420}'::jsonb,
    '/assets/village/goa_kopong_wisata_air.jpg',
    'Jadesta Kemenpar RI #63548 & Jurnal Wicara Unram (2025)',
    1,
    true
  ),
  (
    'Kolam Renang Madu Timba Gerah',
    'kolam-renang-madu',
    'buatan',
    'destinasi_dikelola',
    'Timba Gerah',
    'Destinasi pemandian rekreasi keluarga yang memanfaatkan mata air alami murni Timba Gerah. Air kolam mengalir terus-menerus tanpa kaporit atau pengawet kimia, dikeringkan dan diisi ulang setiap hari agar senantiasa segar.',
    'Air alami pegunungan yang tidak pernah kering meskipun kemarau. Penamaan unik oleh warga setempat karena latar belakang pemilik yang memiliki tiga istri (bermadu).',
    ARRAY['Berenang di kolam air tawar alami', 'Rekreasi keluarga ramah anak', 'Menikmati kuliner lokal pedesaan'],
    'Berlokasi di Dusun Timba Gerah, tepi jalan poros desa dengan area parkir roda dua dan roda empat.',
    '{"lat": -8.5535, "lng": 116.4520}'::jsonb,
    '/assets/village/aparatur_desa_pringgasela_selatan.jpg',
    'Jadesta Kemenpar RI #63548 & Publikasi Pariwisata Lombok Timur',
    2,
    true
  ),
  (
    'Persawahan Batu Tambun & Lanskap Rinjani',
    'batu-tambun',
    'agrowisata',
    'potensi_wisata',
    'Sinar Sari / Wilayah Tani Desa',
    'Bentang persawahan terasering yang subur dengan pemandangan terbuka menghadap megahnya Gunung Rinjani di sisi utara. Menjadi lokasi favorit untuk fotografi matahari terbit dan paket wisata edukasi tani.',
    'Panorama sawah berundak dengan aliran irigasi P3A yang jernih dan latar lanskap Rinjani tanpa terhalang gedung modern. Kerap dijadikan runway peragaan busana kain tenun dalam festival desa.',
    ARRAY['Paket edukasi One Day To Be Farmer', 'Fotografi panorama lanskap Rinjani', 'Jalan santai pagi di pematang sawah'],
    'Terletak di sepanjang jalur usaha tani Batu Tambun, mudah dijangkau dengan berjalan kaki atau sepeda motor.',
    '{"lat": -8.5430, "lng": 116.4530}'::jsonb,
    '/assets/village/dongdala_hias_desa.jpg',
    'Jadesta Kemenpar RI #63548 & Arsip P3A Batu Tambun',
    3,
    true
  ),
  (
    'Sentra Tenun Gedogan Gubuk Lauk',
    'sentra-tenun-gubuk-lauk',
    'budaya',
    'sentra_kerajinan',
    'Gubuk Lauk',
    'Pusat kebudayaan tenun tradisional bukan mesin (ATBM) khas Sasak. Wisatawan dapat menyaksikan para ibu dan gadis desa memintal benang, mewarnai bahan dengan dedaunan dan kulit kayu, serta menenun kain songket.',
    'Suara ketukan khas alat tenun kayu gedogan yang merdu memenuhi gang-gang dusun, menjaga keaslian motif leluhur tanpa sentuhan mesin modern.',
    ARRAY['Melihat proses menenun tradisional', 'Mempelajari teknik pewarnaan alami', 'Membeli kain tenun langsung dari penenun'],
    'Berada di sekitar Kantor Desa Pringgasela Selatan, Dusun Gubuk Lauk. Akses sangat mudah dijangkau.',
    '{"lat": -8.5480, "lng": 116.4490}'::jsonb,
    '/assets/village/tenun_gedogan_gubuk_lauk.jpg',
    'Jurnal Abdi Populika (2023) & Massmedia.id (2022)',
    4,
    true
  ),
  (
    'Sanggar Seagana Batik Sasambo Kedondong',
    'batik-sasambo-kedondong',
    'budaya',
    'sentra_kerajinan',
    'Kedondong',
    'Rumah produksi dan galeri edukasi batik khas NTB (Sasambo: Sasak, Samawa, Mbojo) yang dipelopori perajin lokal Kusman Jayadi. Mengintegrasikan produksi batik tulis/cap dengan konsep wisata edukasi berkelanjutan.',
    'Kombinasi motif etnik tiga suku besar NTB dan pewarnaan ramah lingkungan yang diminati wisatawan mancanegara untuk workshop singkat membatik.',
    ARRAY['Workshop edukasi membatik tulis dan cap', 'Kunjungan galeri karya batik', 'Pemesanan busana batik custom'],
    'Berlokasi di Dusun Kedondong, dapat dicapai 5 menit dari jalan utama desa.',
    '{"lat": -8.5510, "lng": 116.4440}'::jsonb,
    '/assets/village/verifikasi_desa_budaya.jpg',
    'Massmedia.id & Suarapemerintah.id (2022)',
    5,
    true
  ),
  (
    'Makam Bersejarah TGH. Muhammad Toyyib',
    'makam-tgh-muhammad-toyyib',
    'religi',
    'lokasi_budaya',
    'Gubuk Rempung',
    'Situs religi makam ulama perintis dakwah Islam yang sangat dihormati di kawasan Pringgasela dan sekitarnya. Menjadi pusat ziarah masyarakat untuk mendoakan dan meneladani keteladanan sang tokoh.',
    'Ketokohan ulama pejuang dakwah yang namanya diabadikan menjadi ruas jalan utama penghubung antar-desa Jl. TGH. Muhammad Toyib.',
    ARRAY['Wisata ziarah religi', 'Mempelajari sejarah dakwah lokal', 'Mengikuti agenda doa bersama masyarakat'],
    'Terletak di Dusun Gubuk Rempung, tepat di sisi Jl. TGH. Muhammad Toyib.',
    '{"lat": -8.5590, "lng": 116.4460}'::jsonb,
    '/assets/village/kerajinan_budaya_desa.jpg',
    'Jadesta Kemenpar RI #63548 & Dokumen Sejarah Kewilayahan',
    6,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status_type = EXCLUDED.status_type,
  dusun_name = EXCLUDED.dusun_name,
  description = EXCLUDED.description,
  uniqueness = EXCLUDED.uniqueness,
  activities = EXCLUDED.activities,
  access_info = EXCLUDED.access_info,
  coordinates = EXCLUDED.coordinates,
  cover_image_url = EXCLUDED.cover_image_url,
  sources = EXCLUDED.sources,
  order_index = EXCLUDED.order_index,
  updated_at = NOW();

-- 4. Seed Cultural Heritages
INSERT INTO public.village_cultural_heritages (title, category, summary, description, dusun_origin, preservation_efforts, cover_image_url, references_text, order_index, is_published)
VALUES
  (
    'Tradisi Tenun Alat Gedogan',
    'tenun',
    'Kearifan kriya tenun bukan mesin yang melekat erat di pinggang para penenun perempuan Sasak di Gubuk Lauk.',
    'Tenun Gedogan merupakan salah satu identitas budaya terpenting Desa Pringgasela Selatan. Menggunakan perkakas kayu dan bambu bersahaja yang diikatkan ke punggung penenun yang duduk bersila di lantai, kain songket ditenun helai demi helai dengan ketelitian tinggi. Bahan benang diolah dan diwarnai secara alami menggunakan ekstrak tumbuhan seperti daun tarum untuk warna nila, kulit pohon mahoni untuk kecokelatan, dan kunyit untuk warna kuning.',
    'Dusun Gubuk Lauk',
    'Kelompok Nina Penenun menginisiasi sekolah tenun informal untuk anak-anak perempuan sejak dini, menggunakan alat gedogan mainan dari pelepah kelapa agar regenerasi penenun tetap lestari.',
    '/assets/village/tenun_gedogan_gubuk_lauk.jpg',
    'Jurnal Abdi Populika (2023), Jadesta Kemenpar (2024), Massmedia (2022)',
    1,
    true
  ),
  (
    'Festival Dongdala & Parade Nyiru Jaja Bejangkongan',
    'festival',
    'Perayaan budaya tahunan pemersatu keberagaman tiga trah masyarakat desa dengan tradisi khas parade nyiru.',
    'Kata "Dongdala" dalam bahasa lokal berarti pelangi—lambang perpaduan warna-warni yang berbeda menjadi satu harmoni yang indah. Festival ini dirayakan untuk mempererat persaudaraan antarwarga dari 7 kewilayahan dan 3 trah. Puncak festival ditandai dengan tradisi parade Nyiru Jaja Bejangkongan, di mana ribuan perempuan mengenakan pakaian adat Sasak sambil menyunggi nyiru (tampah bambu) berisi jajanan tradisional berjalan berdampingan (bejangkongan).',
    'Seluruh Kewilayahan Desa Pringgasela Selatan',
    'Diselenggarakan rutin oleh pemerintah desa dan pemuda sadar wisata untuk merayakan hari jadi desa, mempromosikan UMKM tenun dan kuliner, serta memperkuat kohesi sosial.',
    '/assets/village/festival_dongdala_nyiru.jpg',
    'Kick News (2023), Kompas.id (2023), Suara Selaparang (2023)',
    2,
    true
  ),
  (
    'Kesenian Musik Tradisional Klenang Nunggal',
    'kesenian_musik',
    'Instrumen musik perkusi lempeng besi tradisional khas Lombok yang menghasilkan harmoni ritmis interlocking.',
    'Musik Klenang Nunggal adalah kesenian musik perkusi tradisional langka yang menggunakan bilah-bilah lempengan besi dengan nada berbeda. Setiap pemain memegang dan membunyikan satu lempeng besi, sehingga melodi utuh hanya bisa tercipta melalui kerja sama dan rasa harmoni yang padu antar-musisi. Dahulu dimainkan untuk mengiringi arak-arakan pengantin adat Sasak.',
    'Dusun Pancor Kopong',
    'Kelompok seni pemuda di Pancor Kopong membangkitkan kembali instrumen Klenang Nunggal agar tidak punah tergerus zaman modern dan menampilkannya di panggung kebudayaan desa.',
    '/assets/village/kerajinan_budaya_desa.jpg',
    'Jadesta Kemenpar (2024) & Liputan Media Kebudayaan NTB',
    3,
    true
  ),
  (
    'Tradisi Religius Zikir Zaman',
    'tradisi_religi',
    'Lantunan zikir, wirid puji-pujian, dan gerakan dinamis religius warisan dakwah para ulama pendahulu.',
    'Zikir Zaman (atau Zikir Saman lokal) adalah kesenian tradisi bernuansa Islam yang memadukan wirid puji-pujian kepada Allah SWT dan shalawat Nabi Muhammad SAW dengan gerakan tubuh berirama dan olah napas dinamis. Amalan ini diwariskan oleh para tokoh agama dan mursyid tarekat secara turun-temurun, kerap ditampilkan dalam hajatan syukuran masyarakat dan perayaan hari besar Islam.',
    'Dusun Gubuk Rempung & Pancor Kopong',
    'Dilestarikan oleh kelompok jamaah keagamaan desa dan majelis ta''lim sebagai wahana syiar dakwah dan penguatan spiritualitas generasi muda.',
    '/assets/village/aparatur_desa_pringgasela_selatan.jpg',
    'Jadesta Kemenpar (2024) & Dokumen Kebudayaan Desa',
    4,
    true
  ),
  (
    'Seni Kriya Batik Sasambo Kedondong',
    'batik',
    'Inovasi batik khas NTB yang menggabungkan filosofi ragam hias Sasak, Samawa, dan Mbojo.',
    'Batik Sasambo di Dusun Kedondong memadukan kearifan lokal motif tenun dan alam Lombok Timur ke dalam kain batik tulis dan cap modern. Dipelopori oleh perajin lokal di Sanggar Seagana, karya batik ini menggunakan malam dan teknik pewarnaan ramah lingkungan, sekaligus menjadi pusat magang keterampilan bagi generasi muda desa.',
    'Dusun Kedondong',
    'Pengembangan sanggar kriya terpadu dengan paket wisata edukasi membatik dan kerja sama dengan sekolah kejuruan di Lombok Timur.',
    '/assets/village/verifikasi_desa_budaya.jpg',
    'Massmedia (2022) & Satu Nusa (2022)',
    5,
    true
  ),
  (
    'Keberagaman Harmonis Tiga Trah Masyarakat',
    'keberagaman',
    'Fondasi sosial masyarakat Pringgasela Selatan yang memadukan Trah Pringgasela, Trah Rempung/Sumbawa, dan Trah Masbagik.',
    'Desa Pringgasela Selatan memiliki struktur masyarakat unik yang terbentuk dari tiga garis keturunan historis (Trah Pringgasela, Trah Rempung/Sumbawa, dan Trah Masbagik). Perbedaan latar belakang ini tidak menimbulkan sekat, melainkan menjadi kekuatan kultural yang memperkaya dialek bahasa, teknik kriya, serta etos gotong royong warga desa.',
    'Lintas Dusun Desa Pringgasela Selatan',
    'Diwadahi secara inklusif dalam musyawarah adat desa, perayaan bersama Festival Dongdala, dan sinergi pembangunan antar-kewilayahan.',
    '/assets/village/dongdala_hias_desa.jpg',
    'Jadesta Kemenpar (2024) & Dokumen Pemekaran Desa',
    6,
    true
  )
ON CONFLICT DO NOTHING;

-- 5. Seed Economic Potentials
INSERT INTO public.village_economic_potentials (title, sector, dusun_name, description, highlights, cover_image_url, order_index, is_published)
VALUES
  (
    'Lumbung Pertanian Irigasi Batu Tambun',
    'pertanian',
    'Sinar Sari & Wilayah Tani Desa',
    'Lahan persawahan teknis subur dengan pasokan air melimpah dari mata air pegunungan yang dikelola melalui Perkumpulan Petani Pemakai Air (P3A) Batu Tambun.',
    ARRAY['Produksi padi sawah varietas unggul', 'Budidaya palawija & hortikultura sayuran', 'Jalan usaha tani terhubung ke jalan lingkar desa'],
    '/assets/village/dongdala_hias_desa.jpg',
    1,
    true
  ),
  (
    'Ekonomi Kreatif Tenun Songket Gedogan',
    'umkm_tenun',
    'Gubuk Lauk',
    'Produksi kain tenun songket dan tenun ikat tangan bernilai seni tinggi yang dipasarkan ke kolektor busana nasional hingga mancanegara.',
    ARRAY['Pemberdayaan ekonomi perempuan penenun', 'Penggunaan pewarna ramah lingkungan bernilai ekspor', 'Kelompok usaha bersama pengrajin desa'],
    '/assets/village/tenun_event_ekspor.jpg',
    2,
    true
  ),
  (
    'Industri Kriya Batik Sasambo & Workshop Edukasi',
    'umkm_batik',
    'Kedondong',
    'Pengembangan kerajinan batik Sasambo yang menggabungkan penjualan kain jadi dengan layanan paket workshop membatik.',
    ARRAY['Produksi batik tulis & batik cap motif khas Sasambo', 'Sentra magang kejuruan kriya tekstil', 'Kunjungan wisatawan minat khusus mancanegara'],
    '/assets/village/verifikasi_desa_budaya.jpg',
    3,
    true
  ),
  (
    'Sentra Mebel & Kerajinan Kayu Timba Gerah',
    'kerajinan_kayu',
    'Timba Gerah',
    'Geliat industri rumahan pertukangan kayu yang memproduksi perabotan rumah tangga, kusen, dan ornamen ukir kayu berkualitas.',
    ARRAY['Pengolahan kayu jati dan kayu lokal berkualitas', 'Penyedia kebutuhan interior warga sekitar', 'Penyerapan tenaga kerja pemuda dusun'],
    '/assets/village/aparatur_desa_pringgasela_selatan.jpg',
    4,
    true
  ),
  (
    'Pariwisata Berbasis Masyarakat (Community-Based Tourism)',
    'pariwisata_desa',
    'Pancor Kopong & Timba Gerah',
    'Pemanfaatan potensi mata air alami dan keindahan alam pedesaan sebagai daya tarik rekreasi yang dikelola secara swadaya.',
    ARRAY['Paket agrowisata One Day To Be Farmer', 'Wisata pemandian air alami Kolam Madu & Goa Kopong', 'Wisata kuliner jajanan tradisional pasar'],
    '/assets/village/goa_kopong_wisata_air.jpg',
    5,
    true
  )
ON CONFLICT DO NOTHING;

-- 6. Seed Gallery Items
INSERT INTO public.village_gallery_items (title, category, image_url, caption, location, year_taken, credit, license_note, alt_text, order_index, is_featured, is_published)
VALUES
  (
    'Penenun Tradisional Alat Gedogan Gubuk Lauk',
    'kerajinan',
    '/assets/village/tenun_gedogan_gubuk_lauk.jpg',
    'Perajin perempuan di Dusun Gubuk Lauk memintal dan merapatkan helai benang tenun songket menggunakan alat gedogan bukan mesin warisan leluhur.',
    'Dusun Gubuk Lauk, Desa Pringgasela Selatan',
    '2022',
    'Dokumentasi Tim Desa Budaya / Massmedia.id',
    'Digunakan untuk dokumentasi profil desa & edukasi kebudayaan KKN SPACE',
    'Penenun tradisional wanita duduk bersila menggunakan alat tenun kayu gedogan di Gubuk Lauk Pringgasela Selatan',
    1,
    true,
    true
  ),
  (
    'Parade Nyiru Jaja Bejangkongan Festival Dongdala',
    'festival',
    '/assets/village/festival_dongdala_nyiru.jpg',
    'Ribuan kaum perempuan berbusana adat khas Pringgasela menyunggi nyiru berisi aneka jajanan pasar tradisional berjalan berdampingan sebagai simbol persatuan tiga trah.',
    'Jalan Desa Pringgasela Selatan',
    '2023',
    'Dokumentasi Festival Dongdala / Kick News Today',
    'Dokumentasi pers festival kebudayaan Desa Pringgasela Selatan',
    'Parade wanita berbusana adat Sasak menyunggi tampah nyiru bambu berisi kue tradisional di Festival Dongdala',
    2,
    true,
    true
  ),
  (
    'Verifikasi Lapangan Nominasi Desa Budaya Unggulan Nasional',
    'budaya',
    '/assets/village/verifikasi_desa_budaya.jpg',
    'Penilaian lapangan oleh dewan juri Kemendikbudristek RI saat Desa Pringgasela Selatan lolos ke jajaran 10 besar nominasi Desa Budaya Unggulan Nasional.',
    'Kantor Desa Pringgasela Selatan',
    '2022',
    'Arsip Pemdes Pringgasela Selatan / Massmedia.id',
    'Arsip publik penghargaan kebudayaan nasional',
    'Tim verifikasi penilai Desa Budaya Nasional dari Kemendikbudristek berdialog dengan tokoh dan pemuda desa',
    3,
    true,
    true
  ),
  (
    'Pemandangan Desa Menyambut Perayaan Dongdala',
    'budaya',
    '/assets/village/dongdala_hias_desa.jpg',
    'Suasana perkampungan Pringgasela Selatan yang berhias kain tenun dan ornamen khas menyambut helatan akbar budaya Dongdala.',
    'Kawasan Pemukiman Desa Pringgasela Selatan',
    '2023',
    'Tim Harian Kompas (Kompas.id)',
    'Dokumentasi jurnalistik Harian Kompas untuk publikasi budaya',
    'Pemandangan pemukiman asri Desa Pringgasela Selatan yang dihias ornamen kain tenun tradisional',
    4,
    true,
    true
  ),
  (
    'Karya Tenun Songket Berkualitas Ekspor',
    'kerajinan',
    '/assets/village/tenun_event_ekspor.jpg',
    'Helai kain tenun ikat dan songket khas Pringgasela dengan pewarnaan alami yang diminati pasar busana nasional hingga mancanegara.',
    'Sentra Kriya Desa Pringgasela Selatan',
    '2023',
    'Inside Lombok',
    'Dokumentasi pers ekonomi kreatif Pringgasela',
    'Display helai kain tenun songket tradisional berkualitas tinggi dengan motif khas Pringgasela',
    5,
    false,
    true
  ),
  (
    'Aparatur Pemerintah Desa Pringgasela Selatan',
    'masyarakat',
    '/assets/village/aparatur_desa_pringgasela_selatan.jpg',
    'Jajaran aparatur Pemerintah Desa Pringgasela Selatan bersama tokoh masyarakat dan pemuda dalam upaya pemajuan desa.',
    'Halaman Kantor Desa Pringgasela Selatan',
    '2022',
    'Dokumentasi Pemerintah Desa / Massmedia.id',
    'Dokumentasi resmi tata kelola desa',
    'Kepala Desa Baihaki Habil bersama perangkat desa dan tim pendamping desa budaya',
    6,
    false,
    true
  ),
  (
    'Display Kerajinan Kriya dan Budaya Desa',
    'budaya',
    '/assets/village/kerajinan_budaya_desa.jpg',
    'Pameran ragam produk kriya, busana adat, dan ornamen kerajinan tangan hasil karya masyarakat Pringgasela Selatan.',
    'Balai Pertemuan Desa Pringgasela Selatan',
    '2022',
    'Arsip Budaya Desa / Massmedia.id',
    'Arsip pameran kriya desa',
    'Ragam produk kerajinan tangan dan kain tenun songket terpajang rapi di galeri desa',
    7,
    false,
    true
  ),
  (
    'Air Terjun dan Pemandian Alami Goa Kopong',
    'alam',
    '/assets/village/goa_kopong_wisata_air.jpg',
    'Keindahan pancuran air jernih yang bersumber dari mata air pegunungan mengalir melintasi ceruk bebatuan alami di kawasan Pancor Kopong.',
    'Dusun Pancor Kopong Utara, Desa Pringgasela Selatan',
    '2023',
    'Lombok Experience',
    'Dokumentasi pariwisata alam Lombok Timur',
    'Pemandangan air terjun jernih mengalir di antara celah tebing bebatuan goa rimbun',
    8,
    true,
    true
  )
ON CONFLICT DO NOTHING;

-- 7. Seed Village References
INSERT INTO public.village_references (title, author_publisher, year, url, source_type, notes, order_index)
VALUES
  (
    'Profil Desa Wisata Pringgasela Selatan (#63548)',
    'Kementerian Pariwisata Republik Indonesia (Jadesta)',
    '2024',
    'https://jadesta.kemenpar.go.id/desa/63548',
    'pemerintah',
    'Memuat data resmi klasifikasi Desa Wisata Rintisan, 3 trah masyarakat, sentra tenun Gubuk Lauk, Goa Kopong, Kolam Madu Timba Gerah, dan potensi budaya.',
    1
  ),
  (
    'Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010 tentang Pembentukan Desa Persiapan Pringgasela Selatan',
    'Pemerintah Kabupaten Lombok Timur',
    '2010',
    NULL,
    'arsip_desa',
    'Dokumen hukum peresmian status desa persiapan hasil pemekaran dari Desa Pringgasela induk pada 15 November 2010.',
    2
  ),
  (
    'Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011 tentang Penetapan Desa Definitif Pringgasela Selatan',
    'Pemerintah Kabupaten Lombok Timur',
    '2011',
    NULL,
    'arsip_desa',
    'Dokumen hukum pengesahan status desa definitif pada 25 November 2011 yang membagi wilayah ke dalam 7 dusun kewilayahan.',
    3
  ),
  (
    'Branding dan Promosi Wisata Alam Serta Budaya Desa Pringgasela Selatan Berbasis Media Digital',
    'Jurnal Wicara Desa, Universitas Mataram (Vol. 3 No. 3)',
    '2025',
    'https://jurnal.unram.ac.id/index.php/wicara/en/article/download/6727/3611/23493',
    'akademik',
    'Kajian akademis pengabdian KKN-PMD Unram mengenai potensi wisata alam Goa Kopong, tenun gedogan Gubuk Lauk, dan strategi promosi digital desa.',
    4
  ),
  (
    'Penguatan Peran Komunitas Bale Tenun Sebagai Sumber Belajar Seni Dan Budaya Di Sekolah Dasar',
    'Jurnal Abdi Populika, Universitas Hamzanwadi (Vol. 4 No. 1)',
    '2023',
    'https://e-journal.hamzanwadi.ac.id/index.php/abdipopulika/article/download/9389/pdf',
    'akademik',
    'Penelitian tentang pelestarian teknik tenun gedogan bukan mesin dan regenerasi sekolah tenun bagi anak-anak di Pringgasela.',
    5
  ),
  (
    'Desa Pringgasela Selatan Masuk 10 Besar Nominasi Desa Budaya Unggulan dari 385 Desa Seluruh Indonesia',
    'Massmedia.id',
    '2022',
    'https://massmedia.id/desa-pringgasela-selatan-masuk-10-besar-nominasi-desa-budaya-unggulan-dari-385-desa-seluruh-indonesia/',
    'media',
    'Liputan verifikasi lapangan Anugerah Desa Budaya Kemendikbudristek RI atas konsistensi kriya tenun dan pelestarian seni tradisi desa.',
    6
  ),
  (
    'Dongdala Festival, Pemersatu Keturunan di Pringgasela Lombok Timur',
    'Kick News Today',
    '2023',
    'https://kicknews.today/dongdala-festival-pemersatu-keturunan-di-pringgasela-lombok-timur/',
    'media',
    'Dokumentasi penyelenggaraan Festival Dongdala dan parade tradisi Nyiru Jaja Bejangkongan sebagai simbol keharmonisan 3 trah masyarakat.',
    7
  ),
  (
    'Sambut Perayaan Dongdala, Pringgasela Berhias (Welcoming the Dongdala Celebration)',
    'Harian Kompas (Kompas.id)',
    '2023',
    'https://www.kompas.id/baca/english/2023/12/18/en-sambut-perayaan-dongdala-pringgasela-berhias',
    'media',
    'Liputan jurnalisme data Harian Kompas mengenai perayaan kebudayaan dan dekorasi tenun di pemukiman Pringgasela Selatan.',
    8
  ),
  (
    'Dihidupkan Lewat Berbagai Event, Tenun Pringgasela Dipesan Sampai ke Luar Negeri',
    'Inside Lombok',
    '2023',
    'https://insidelombok.id/ekonomi/dihidupkan-lewat-berbagai-event-tenun-pringgasela-dipesan-sampai-ke-luar-negeri/',
    'media',
    'Dokumentasi geliat ekonomi kreatif perajin tenun songket dan dampak event kebudayaan terhadap pesanan mancanegara.',
    9
  )
ON CONFLICT DO NOTHING;

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Sparkles,
  Landmark,
  ArrowRight,
  Users,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { VillageHero } from '@/components/village/VillageHero'
import {
  fetchVillageProfile,
  fetchVillageDusuns,
  fetchVillageDestinations,
  fetchVillageCulturalHeritages,
  fetchVillageReferences,
} from '@/services/villageApi'

export const VillageProfilePage: React.FC = () => {
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['village-profile'],
    queryFn: fetchVillageProfile,
  })

  const { data: dusuns = [] } = useQuery({
    queryKey: ['village-dusuns'],
    queryFn: fetchVillageDusuns,
  })

  const { data: destinations = [] } = useQuery({
    queryKey: ['village-destinations'],
    queryFn: () => fetchVillageDestinations(),
  })

  const { data: heritages = [] } = useQuery({
    queryKey: ['village-cultural-heritages'],
    queryFn: fetchVillageCulturalHeritages,
  })

  const { data: references = [] } = useQuery({
    queryKey: ['village-references'],
    queryFn: fetchVillageReferences,
  })

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      {/* Sub Navigation Bar */}
      <VillageSubnav />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-12">
        {/* Editorial Hero Section */}
        <VillageHero
          title={profile?.hero_title}
          subtitle={profile?.hero_subtitle}
          narrative={profile?.overview}
          imageUrl={profile?.hero_image_url}
        />

        {/* Key Verified Statistics Cards */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-warm-300 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Data Statistik Faktual Terverifikasi
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
                Indikator Utama Desa
              </h2>
            </div>
            <span className="text-xs text-charcoal-muted">
              Berdasarkan Jadesta Kemenpar & Dokumen Resmi Pemkab Lombok Timur
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {isProfileLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl bg-warm-200" />
              ))
            ) : (
              profile?.stats.map((stat, idx) => (
                <Card
                  key={idx}
                  className="border-warm-300 bg-white hover:border-sage-400 transition-all shadow-sm"
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                    <div>
                      <span className="text-[10px] text-charcoal-muted uppercase tracking-wider block font-medium">
                        {stat.label}
                      </span>
                      <p className="text-lg sm:text-xl font-serif font-bold text-sage-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-warm-100 flex items-center justify-between text-[10px] text-charcoal-muted">
                      <span>Tahun {stat.year}</span>
                      <span className="truncate max-w-[80px]" title={stat.source}>
                        {stat.source.split(' ')[0]}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Sekilas Tentang Desa & Karakteristik Wilayah */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-warm-300 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-sage-700 via-amber-600 to-sage-800" />
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                  <Badge className="bg-sage-100 text-sage-800 border-sage-300 text-[10px] font-medium mb-2">
                    Identitas & Bentang Wilayah
                  </Badge>
                  <h3 className="text-2xl font-serif font-bold text-charcoal leading-snug">
                    Harmoni Agraris dan Kriya Leluhur di Kaki Rinjani
                  </h3>
                </div>

                <div className="prose prose-sage max-w-none text-charcoal text-xs sm:text-sm leading-relaxed space-y-4">
                  <p>
                    Desa Pringgasela Selatan merupakan desa pemekaran yang terletak di Kecamatan
                    Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat. Terbentang di
                    ketinggian 350 hingga 450 meter di atas permukaan laut pada lereng tenggara
                    Gunung Rinjani, desa ini dikaruniai iklim sejuk, tanah vulkanik yang subur, dan
                    aliran mata air alami pegunungan yang tidak pernah surut sepanjang tahun.
                  </p>
                  <p>
                    Kehidupan masyarakat Pringgasela Selatan berakar kuat pada nilai-nilai agraris
                    dan kebudayaan Sasak. Di sela-sela hamparan persawahan terasering Batu Tambun,
                    berkembang sentra kerajinan tenun tradisional dengan alat gedogan bukan mesin di
                    Gubuk Lauk, sentra batik khas Nusa Tenggara Barat (Batik Sasambo) di Kedondong,
                    serta pemandian air alami pegunungan seperti Goa Kopong dan Kolam Renang Madu
                    Timba Gerah.
                  </p>
                  <p>
                    Secara sosiokultural, desa ini dibentuk oleh perpaduan tiga trah besar—Trah
                    Pringgasela, Trah Rempung/Sumbawa, dan Trah Masbagik—yang hidup berdampingan
                    secara harmonis dalam bingkai kearifan lokal gotong royong dan tradisi tahunan
                    Festival Dongdala.
                  </p>
                </div>

                {/* Boundaries Grid */}
                <div className="bg-warm-50 rounded-xl p-4 border border-warm-200 space-y-3">
                  <h4 className="text-xs font-serif font-bold text-charcoal flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-sage-600" />
                    <span>Batas Wilayah Administratif Resmi</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-warm-200">
                      <span className="text-charcoal-muted text-[10px] block font-medium">
                        Sebelah Utara
                      </span>
                      <span className="font-medium text-charcoal">
                        {profile?.boundaries.north || 'Desa Pringgasela (Desa Induk)'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-warm-200">
                      <span className="text-charcoal-muted text-[10px] block font-medium">
                        Sebelah Selatan
                      </span>
                      <span className="font-medium text-charcoal">
                        {profile?.boundaries.south || 'Desa Rempung'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-warm-200">
                      <span className="text-charcoal-muted text-[10px] block font-medium">
                        Sebelah Barat
                      </span>
                      <span className="font-medium text-charcoal">
                        {profile?.boundaries.west || 'Desa Masbagik Baru'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-warm-200">
                      <span className="text-charcoal-muted text-[10px] block font-medium">
                        Sebelah Timur
                      </span>
                      <span className="font-medium text-charcoal">
                        {profile?.boundaries.east || 'Desa Pringgasela Timur'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keberagaman 3 Trah */}
            <Card className="border-warm-300 bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-warm-200">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Fondasi Sosiokultural
                  </span>
                </div>
                <CardTitle className="text-xl font-serif font-bold text-charcoal">
                  Keberagaman Tiga Trah Masyarakat
                </CardTitle>
                <p className="text-xs text-charcoal-muted">
                  Berdasarkan katalogisasi Jejaring Desa Wisata (Jadesta) Kementerian Pariwisata RI
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile?.trah_diversity.map((trah, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-warm-200 bg-warm-50/70 space-y-2 hover:border-sage-400 transition-colors"
                    >
                      <Badge className="bg-sage-200/80 text-sage-900 border-sage-300 text-[10px] font-semibold">
                        {trah.name}
                      </Badge>
                      <p className="text-[11px] text-charcoal-muted font-medium">
                        {trah.origin}
                      </p>
                      <p className="text-xs text-charcoal leading-relaxed">
                        {trah.character}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Quick Summary & Posko KKN */}
          <div className="lg:col-span-4 space-y-6">
            {/* Tata Kelola Desa */}
            <Card className="border-warm-300 bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-warm-200">
                <CardTitle className="text-sm font-serif font-bold text-charcoal flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-sage-600" />
                  <span>Tata Kelola Administrasi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="border-b border-warm-200 pb-2.5">
                  <span className="text-[10px] text-charcoal-muted block uppercase">
                    Status Pemerintahan
                  </span>
                  <span className="font-semibold text-charcoal">
                    Desa Definitif (Pemekaran 2011)
                  </span>
                </div>
                <div className="border-b border-warm-200 pb-2.5">
                  <span className="text-[10px] text-charcoal-muted block uppercase">
                    Dasar Hukum Definitif
                  </span>
                  <span className="font-medium text-charcoal text-[11px]">
                    {profile?.decree_definitive}
                  </span>
                </div>
                <div className="border-b border-warm-200 pb-2.5">
                  <span className="text-[10px] text-charcoal-muted block uppercase">
                    Kepala Desa
                  </span>
                  <span className="font-semibold text-charcoal">
                    {profile?.kades_name}
                  </span>
                </div>
                <div className="border-b border-warm-200 pb-2.5">
                  <span className="text-[10px] text-charcoal-muted block uppercase">
                    ID Jadesta Kemenpar
                  </span>
                  <a
                    href="https://jadesta.kemenpar.go.id/desa/63548"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-700 hover:text-sage-900 inline-flex items-center gap-1"
                  >
                    <span>#{profile?.jadesta_id} (Desa Wisata Rintisan)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="pt-1">
                  <Link
                    to="/profil-desa/sejarah"
                    className="inline-flex items-center gap-1 text-xs text-sage-700 hover:text-sage-900 font-semibold"
                  >
                    <span>Baca Sejarah & Pemekaran Lengkap</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Posko KKN Hubungan Komunitas */}
            <Card className="border-warm-300 bg-sage-50/80 shadow-sm border-l-4 border-l-sage-600">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sage-900 text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-sage-600" />
                  <span>Kemitraan KKN SPACE</span>
                </div>
                <p className="text-xs text-charcoal leading-relaxed">
                  Program Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela
                  Selatan mendampingi digitalisasi promosi UMKM tenun tradisional, penyusunan profil
                  dan geoportal desa, pendampingan posyandu balita, serta penguatan literasi anak.
                </p>
                <div className="pt-2 border-t border-sage-200/80 text-[11px] text-sage-800">
                  <span className="font-semibold">Lokasi Posko: </span>
                  <span>Dusun Gubuk Lauk, Pringgasela Selatan</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links Subpages */}
            <Card className="border-warm-300 bg-white shadow-sm">
              <CardHeader className="pb-2 border-b border-warm-200">
                <CardTitle className="text-xs font-serif font-bold text-charcoal">
                  Jelajahi Profil Lebih Lanjut
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-warm-100 text-xs">
                {[
                  { to: '/profil-desa/wilayah', title: 'Peta Interaktif 7 Dusun', desc: 'Eksplorasi geografis dan sentra desa' },
                  { to: '/profil-desa/pariwisata', title: 'Destinasi Pariwisata', desc: 'Goa Kopong, Kolam Madu, Batu Tambun' },
                  { to: '/profil-desa/budaya', title: 'Adat & Warisan Budaya', desc: 'Tenun Gedogan, Dongdala, Klenang' },
                  { to: '/profil-desa/potensi-desa', title: 'Potensi Ekonomi & UMKM', desc: 'Pertanian, Tenun, Batik Sasambo' },
                  { to: '/profil-desa/galeri', title: 'Galeri Foto Asli Desa', desc: 'Dokumentasi visual terverifikasi' },
                ].map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    className="p-3.5 flex items-center justify-between hover:bg-warm-50 transition-colors group"
                  >
                    <div>
                      <span className="font-medium text-charcoal group-hover:text-sage-800 block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-charcoal-muted">
                        {item.desc}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-charcoal-muted group-hover:text-sage-700 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* 7 Dusun Grid Preview */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-warm-300 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Pembagian Administratif Kewilayahan
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
                Tujuh Dusun Desa Pringgasela Selatan
              </h2>
            </div>
            <Link
              to="/profil-desa/wilayah"
              className="text-xs text-sage-700 hover:text-sage-900 font-semibold inline-flex items-center gap-1"
            >
              <span>Buka di Peta Interaktif</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dusuns.map((dusun) => (
              <Card
                key={dusun.id}
                className="border-warm-300 bg-white shadow-sm hover:shadow-md hover:border-sage-400 transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {dusun.cover_image_url && (
                    <div className="h-36 w-full overflow-hidden bg-warm-200">
                      <img
                        src={dusun.cover_image_url}
                        alt={dusun.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">
                        Dusun #{dusun.order_index}
                      </span>
                      <span className="text-[10px] text-charcoal-muted">
                        Pringgasela Selatan
                      </span>
                    </div>
                    <h3 className="text-base font-serif font-bold text-charcoal">
                      {dusun.name}
                    </h3>
                    <p className="text-xs text-charcoal-muted line-clamp-3 leading-relaxed">
                      {dusun.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2 border-t border-warm-100">
                  <div className="flex flex-wrap gap-1">
                    {dusun.key_potentials.slice(0, 2).map((pot, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-charcoal font-medium"
                      >
                        {pot}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/profil-desa/wilayah?dusun=${dusun.slug}`}
                    className="text-[11px] text-sage-700 hover:text-sage-900 font-semibold inline-flex items-center gap-1 pt-1"
                  >
                    <span>Lihat Lokasi & Detail</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Highlight Destinasi & Warisan Budaya */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Destinasi Wisata */}
          <Card className="border-warm-300 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-warm-200 flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">
                  Potensi & Destinasi
                </span>
                <CardTitle className="text-lg font-serif font-bold text-charcoal">
                  Daya Tarik Pariwisata
                </CardTitle>
              </div>
              <Link
                to="/profil-desa/pariwisata"
                className="text-xs text-sage-700 hover:text-sage-900 font-medium inline-flex items-center gap-0.5"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {destinations.slice(0, 3).map((dest) => (
                <div
                  key={dest.id}
                  className="p-3 rounded-xl border border-warm-200 bg-warm-50/60 flex items-start gap-3 hover:border-sage-400 transition-colors"
                >
                  {dest.cover_image_url && (
                    <img
                      src={dest.cover_image_url}
                      alt={dest.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 border border-warm-200"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-sage-100 text-sage-800 border-sage-300 text-[9px] uppercase">
                        {dest.category}
                      </Badge>
                      <span className="text-[10px] text-charcoal-muted truncate">
                        {dest.dusun_name}
                      </span>
                    </div>
                    <h4 className="text-xs font-serif font-bold text-charcoal truncate">
                      {dest.name}
                    </h4>
                    <p className="text-[11px] text-charcoal-muted line-clamp-2">
                      {dest.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Warisan Budaya */}
          <Card className="border-warm-300 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-warm-200 flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                  Adat & Tradisi
                </span>
                <CardTitle className="text-lg font-serif font-bold text-charcoal">
                  Warisan yang Terus Hidup
                </CardTitle>
              </div>
              <Link
                to="/profil-desa/budaya"
                className="text-xs text-sage-700 hover:text-sage-900 font-medium inline-flex items-center gap-0.5"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {heritages.slice(0, 3).map((heritage) => (
                <div
                  key={heritage.id}
                  className="p-3 rounded-xl border border-warm-200 bg-warm-50/60 flex items-start gap-3 hover:border-amber-400 transition-colors"
                >
                  {heritage.cover_image_url && (
                    <img
                      src={heritage.cover_image_url}
                      alt={heritage.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 border border-warm-200"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] uppercase">
                        {heritage.category}
                      </Badge>
                      <span className="text-[10px] text-charcoal-muted truncate">
                        {heritage.dusun_origin}
                      </span>
                    </div>
                    <h4 className="text-xs font-serif font-bold text-charcoal truncate">
                      {heritage.title}
                    </h4>
                    <p className="text-[11px] text-charcoal-muted line-clamp-2">
                      {heritage.summary}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Sumber Referensi & Verifikasi Fakta */}
        <section className="space-y-4 pt-6 border-t border-warm-300">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              Integritas & Akuntabilitas Informasi
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
              Daftar Sumber Referensi & Arsip Faktual
            </h2>
            <p className="text-xs text-charcoal-muted">
              Seluruh data geografis, sejarah pemekaran, kewilayahan, kebudayaan, dan foto pada
              halaman ini dihimpun dan diverifikasi dari sumber primer berikut:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {references.map((ref) => (
              <div
                key={ref.id}
                className="p-3.5 rounded-xl border border-warm-200 bg-white space-y-1.5 text-xs hover:border-sage-400 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <Badge className="bg-warm-100 text-charcoal border-warm-300 uppercase text-[9px]">
                    {ref.source_type}
                  </Badge>
                  <span className="text-charcoal-muted font-medium">Tahun {ref.year}</span>
                </div>
                <h4 className="font-semibold text-charcoal text-[11px] leading-snug">
                  {ref.title}
                </h4>
                <p className="text-[10px] text-charcoal-muted">
                  {ref.author_publisher}
                </p>
                {ref.notes && (
                  <p className="text-[10px] text-charcoal/80 leading-relaxed pt-1 border-t border-warm-100">
                    {ref.notes}
                  </p>
                )}
                {ref.url && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-sage-700 hover:text-sage-900 font-semibold pt-1"
                  >
                    <span>Lihat Sumber Daring</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

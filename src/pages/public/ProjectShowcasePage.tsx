import React from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Globe,
  Layers,
  Layout,
  Calendar,
  FileText,
  Camera,
  Coins,
  Package,
  Users,
  Award,
  ChevronRight,
  UserCheck,
  Building2,
  Sparkles,
  Map,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { SeoHead } from '@/components/seo/SeoHead'
import { generateProjectWebApplicationSchema } from '@/config/developer'
import { SEO_DICTIONARY, generateBreadcrumbSchema } from '@/config/seo'
import { useLocale } from '@/i18n'

interface FeatureItem {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  highlights: string[]
}

const PROJECT_FEATURES: FeatureItem[] = [
  {
    icon: <Layout className="h-5 w-5 text-sage-700" />,
    title: 'Dashboard & Koordinasi Kelompok',
    subtitle: 'Sentra Pemantauan Terpadu',
    description:
      'Pusat pemantauan capaian program kerja secara visual, jadwal agenda terdekat posko, rekap ringkas keuangan, status inventaris, dan pengumuman mendesak.',
    highlights: ['Metrik capaian real-time', 'Ringkasan tugas & agenda', 'Banner pengumuman posko'],
  },
  {
    icon: <Layers className="h-5 w-5 text-sage-700" />,
    title: 'Manajemen Program Kerja',
    subtitle: 'Eksekusi & Pelacakan Proker',
    description:
      'Perencanaan dan pengawalan program kerja KKN terstruktur: tahapan inisiasi, pelaksanaan lapangan, indikator keberhasilan, dan publikasi transparansi ke warga.',
    highlights: ['Tahapan proker terukur', 'Status progress mingguan', 'Etalase proker publik'],
  },
  {
    icon: <Calendar className="h-5 w-5 text-sage-700" />,
    title: 'Agenda & Kalender Kegiatan',
    subtitle: 'Sinkronisasi Waktu Tim',
    description:
      'Jadwal kegiatan harian mahasiswa bersama aparat desa, tokoh pemuda, dan warga 7 dusun agar koordinasi waktu terlaksana tanpa tumpang tindih.',
    highlights: ['Kalender kegiatan posko', 'Pengingat acara desa', 'Kategori kegiatan'],
  },
  {
    icon: <FileText className="h-5 w-5 text-sage-700" />,
    title: 'Digital Logbook & Presensi Piket',
    subtitle: 'Akuntabilitas Aktivitas Harian',
    description:
      'Pencatatan aktivitas mandiri harian setiap mahasiswa KKN, verifikasi jadwal piket posko (Duty), dan pelaporan catatan lapangan secara digital.',
    highlights: ['Catatan kegiatan harian', 'Jadwal piket posko', 'Rekap akuntabilitas'],
  },
  {
    icon: <Camera className="h-5 w-5 text-sage-700" />,
    title: 'Dokumentasi & Media Gallery',
    subtitle: 'Arsip Visual Pengabdian',
    description:
      'Manajemen berkas foto resolusi tinggi terorganisir per program kerja dan kegiatan kemasyarakatan, terhubung langsung dengan Supabase Storage.',
    highlights: ['Penyimpanan cloud terstruktur', 'Kategorisasi kegiatan', 'Galeri publik & desa'],
  },
  {
    icon: <Coins className="h-5 w-5 text-sage-700" />,
    title: 'Manajemen Keuangan Transparan',
    subtitle: 'Tata Kelola Kas & Anggaran',
    description:
      'Pencatatan arus kas masuk dan keluar secara terperinci, alokasi anggaran per pos program, klasifikasi pengeluaran, dan audit trail transaksi.',
    highlights: ['Buku kas digital', 'Klasifikasi per posko & proker', 'Transparansi anggaran'],
  },
  {
    icon: <Package className="h-5 w-5 text-sage-700" />,
    title: 'Inventaris & Logistik Posko',
    subtitle: 'Pelacakan Aset Perlengkapan',
    description:
      'Pencatatan aset barang posko, status peminjaman, jumlah ketersediaan, serta pemantauan kondisi fisik perlengkapan selama masa KKN.',
    highlights: ['Katalog aset posko', 'Riwayat peminjaman', 'Monitoring kondisi barang'],
  },
  {
    icon: <Users className="h-5 w-5 text-sage-700" />,
    title: 'Direktori Anggota & Kontrol Akses',
    subtitle: 'Tata Kelola 10 Mahasiswa KKN',
    description:
      'Data profil resmi tim mahasiswa multidisiplin Universitas Mataram dengan hak akses berbasis peran (Ketua, Bendahara, Sekretaris, Anggota).',
    highlights: ['Multi-role permissions', 'Direktori profil anggota', 'Keamanan data berbasis RLS'],
  },
  {
    icon: <Award className="h-5 w-5 text-sage-700" />,
    title: 'Workspace DPL (Dosen Pembimbing)',
    subtitle: 'Monitoring & Bimbingan Akademik',
    description:
      'Portal khusus DPL untuk memantau kemajuan kelompok, memeriksa laporan akhir, memberikan arahan supervisi, dan mereview evaluasi pengabdian.',
    highlights: ['Akses evaluasi DPL', 'Supervisi program kerja', 'Review laporan akhir'],
  },
  {
    icon: <Map className="h-5 w-5 text-sage-700" />,
    title: 'Geoportal 7 Dusun & Administrasi Desa',
    subtitle: 'Sistem Informasi Spasial Desa',
    description:
      'Peta interaktif wilayah administratif Desa Pringgasela Selatan, pemetaan 7 dusun binaan, sentra tenun tradisional Sasak, dan informasi kependudukan.',
    highlights: ['Peta GIS interaktif Leaflet', 'Profil 7 dusun desa', 'Sentra tenun Gedogan'],
  },
]

const SCREENSHOT_GALLERY = [
  {
    title: 'Portal Beranda Publik KKN SPACE',
    category: 'Antarmuka Publik',
    image: '/story_assets/scene1_public_home.png',
    description: 'Etalase keterbukaan informasi program kerja, berita posko, dan profil desa untuk masyarakat luas.',
  },
  {
    title: 'Digital Workspace & Manajemen Proker',
    category: 'Ruang Kolaborasi Internal',
    image: '/story_assets/scene3_workspace.png',
    description: 'Pusat koordinasi tugas tim, kalender agenda posko, dan pemantauan tahapan kegiatan mahasiswa.',
  },
  {
    title: 'Modul Inventaris & Logistik Posko',
    category: 'Manajemen Logistik',
    image: '/story_assets/scene4_inventory.png',
    description: 'Pelacakan stok barang inventaris, peminjaman peralatan, dan kondisi aset posko secara akurat.',
  },
  {
    title: 'Timeline & Milestone Pengabdian',
    category: 'Roadmap Kegiatan',
    image: '/story_assets/scene5_timeline.png',
    description: 'Tahapan operasional mulai dari pembekalan, survei awal, hingga pelaporan akhir di Universitas Mataram.',
  },
]

export const ProjectShowcasePage: React.FC = () => {
  const { locale } = useLocale()
  const seo = SEO_DICTIONARY[locale]?.projectShowcase || SEO_DICTIONARY['id-ID'].projectShowcase

  const breadcrumbs = [
    { name: 'Beranda', url: '/' },
    { name: 'Projects', url: '/projects/kkn-space' },
    { name: 'KKN SPACE', url: '/projects/kkn-space' },
  ]

  const structuredSchemas = [
    generateBreadcrumbSchema(breadcrumbs),
    generateProjectWebApplicationSchema(),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonicalPath="/projects/kkn-space"
        keywords={seo.keywords}
        structuredData={structuredSchemas}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-charcoal-muted">
        <Link to="/" className="hover:text-sage-700 transition-colors">
          Beranda
        </Link>
        <ChevronRight className="h-3 w-3 text-warm-400" />
        <span className="text-sage-700 font-medium">Projects</span>
        <ChevronRight className="h-3 w-3 text-warm-400" />
        <span className="text-charcoal font-semibold">KKN SPACE</span>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#23382B] via-[#1E3025] to-[#16241C] p-6 sm:p-10 md:p-12 text-white shadow-xl">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sage-200 border border-sage-400/30">
                <Sparkles className="h-3.5 w-3.5 text-sage-300" />
                Featured Project
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-warm-100 border border-white/15">
                <Building2 className="h-3.5 w-3.5 text-sage-300" />
                Universitas Mataram
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 border border-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Production Live
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold tracking-tight text-white leading-tight">
              KKN SPACE — Web Application untuk KKN Desa Pringgasela Selatan
            </h1>

            <p className="text-sm sm:text-base text-warm-200/90 leading-relaxed font-sans">
              KKN SPACE merupakan platform digital untuk mendukung pengelolaan dan koordinasi kegiatan
              Kuliah Kerja Nyata di Desa Pringgasela Selatan, Universitas Mataram.
            </p>

            {/* Developer Authorship Card (Hero) */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 border border-white/15 backdrop-blur-xs max-w-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-600 text-white font-serif font-bold text-base border border-white/20">
                AH
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-warm-200/80 font-medium">Dirancang &amp; Dikembangkan Oleh:</div>
                <Link
                  to="/developer/abdul-habir-al-majdi"
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-sage-200 transition-colors"
                >
                  <span>Abdul Habir Al Majdi</span>
                  <ArrowRight className="h-3.5 w-3.5 text-sage-300 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <div className="text-[11px] text-warm-200/70 truncate">
                  Web Developer · Mahasiswa Teknik Elektro Universitas Mataram
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info & Action Buttons */}
          <div className="flex flex-col gap-3 shrink-0 lg:w-72">
            <Link
              to="/workspace"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage-500 hover:bg-sage-600 text-white px-5 py-3 text-xs font-semibold transition-all shadow-md"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Buka Digital Workspace</span>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 text-xs font-semibold backdrop-blur-xs transition-all shadow-xs"
            >
              <Globe className="h-4 w-4 text-sage-200" />
              <span>Jelajahi Portal Publik</span>
            </Link>

            <Link
              to="/developer/abdul-habir-al-majdi"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent hover:bg-white/5 text-warm-100 px-5 py-2.5 text-xs font-medium transition-all"
            >
              <UserCheck className="h-4 w-4 text-sage-300" />
              <span>Lihat Profil Developer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Project Metadata Overview Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Kategori
          </div>
          <div className="text-xs sm:text-sm font-semibold text-charcoal mt-1">Web Application</div>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Digital Workspace</div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Institusi
          </div>
          <div className="text-xs sm:text-sm font-semibold text-charcoal mt-1">Universitas Mataram</div>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Fakultas Teknik</div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Lokasi KKN
          </div>
          <div className="text-xs sm:text-sm font-semibold text-charcoal mt-1">Pringgasela Selatan</div>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Lombok Timur, NTB</div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Lead Developer
          </div>
          <Link
            to="/developer/abdul-habir-al-majdi"
            className="text-xs sm:text-sm font-semibold text-sage-700 hover:text-sage-800 underline underline-offset-2 mt-1 block"
          >
            Abdul Habir Al Majdi
          </Link>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Teknik Elektro</div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Status
          </div>
          <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">Production</div>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Periode 2026–2027</div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
            Arsitektur
          </div>
          <div className="text-xs sm:text-sm font-semibold text-charcoal mt-1">
            React &amp; Supabase
          </div>
          <div className="text-[11px] text-charcoal-muted mt-0.5">Full-Stack &amp; GIS</div>
        </div>
      </section>

      {/* Project Background & Narrative */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Globe className="h-4 w-4" />
          <span>Tentang Platform KKN SPACE</span>
        </div>
        <Card className="border-warm-200 bg-white">
          <CardContent className="p-6 sm:p-8 space-y-4 text-charcoal leading-relaxed text-sm sm:text-base">
            <p className="font-medium text-charcoal text-base sm:text-lg border-l-4 border-sage-600 pl-4 py-0.5 text-sage-950">
              KKN SPACE dirancang sebagai platform kolaborasi terpusat untuk memfasilitasi kebutuhan koordinasi,
              akuntabilitas kegiatan, dan publikasi desa selama mahasiswa Universitas Mataram melaksanakan
              pengabdian di Desa Pringgasela Selatan.
            </p>
            <p className="text-charcoal-muted">
              Sebelum kehadiran KKN SPACE, koordinasi kelompok KKN umumnya tersebar di berbagai kanal obrolan
              instan dan dokumen terpisah, yang seringkali menyebabkan risiko hilangnya arsip kegiatan, tidak
              tercatatnya detail arus kas, dan kesulitan supervisi bagi Dosen Pembimbing Lapangan (DPL).
            </p>
            <p className="text-charcoal-muted">
              Melalui inisiatif dan rekayasa perangkat lunak oleh <strong>Abdul Habir Al Majdi</strong>, platform
              KKN SPACE mengintegrasikan seluruh instrumen esensial: mulai dari pelacakan program kerja, agenda harian,
              logbook digital, pencatatan kas transparan, kontrol barang inventaris posko, hingga portal geoportal
              spasial yang menampilkan pesona sentra tenun tradisional Sasak di 7 dusun Desa Pringgasela Selatan.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Core Features Showcase */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Layers className="h-4 w-4" />
          <span>10 Fitur Utama Implementasi Nyata</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROJECT_FEATURES.map((feature, idx) => (
            <Card key={idx} className="border-warm-200 bg-white hover:border-sage-300 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 border border-sage-200 mt-0.5">
                    {feature.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                      {feature.subtitle}
                    </span>
                    <h3 className="font-semibold text-charcoal text-base">{feature.title}</h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
                  {feature.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-warm-100">
                  {feature.highlights.map((item, hIdx) => (
                    <span
                      key={hIdx}
                      className="inline-flex items-center gap-1 rounded-md bg-warm-50 border border-warm-200 px-2 py-0.5 text-[11px] text-charcoal font-medium"
                    >
                      <CheckCircle2 className="h-3 w-3 text-sage-600" />
                      {item}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Authentic Visual Screenshots Showcase */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Camera className="h-4 w-4" />
          <span>Tampilan Antarmuka Aplikasi (Existing Assets)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SCREENSHOT_GALLERY.map((shot, idx) => (
            <Card key={idx} className="overflow-hidden border-warm-200 bg-white group hover:shadow-card transition-shadow">
              <div className="relative aspect-video w-full overflow-hidden bg-warm-200 border-b border-warm-200">
                <img
                  src={shot.image}
                  alt={shot.title}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder gracefully if image not found
                    ;(e.target as HTMLImageElement).src = '/brand/kkn-pringgasela-selatan-2026-2027-master.jpg'
                  }}
                />
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center rounded-full bg-charcoal/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-medium text-white">
                    {shot.category}
                  </span>
                </div>
              </div>
              <CardContent className="p-5 space-y-1.5">
                <h4 className="text-sm font-semibold text-charcoal">{shot.title}</h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">{shot.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Technology Architecture */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <ShieldCheck className="h-4 w-4" />
          <span>Arsitektur &amp; Teknologi</span>
        </div>

        <Card className="border-warm-200 bg-white">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-sage-800">
                  Frontend &amp; Performa
                </h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Dibangun menggunakan <strong>React 19</strong>, <strong>TypeScript</strong>, dan <strong>Tailwind CSS</strong> dengan bundler <strong>Vite</strong>. Menggunakan code splitting dinamis dengan mekanisme retry otomatis untuk menjamin keandalan pemuatan aplikasi pada koneksi mobile.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary">React 19</Badge>
                  <Badge variant="secondary">TypeScript</Badge>
                  <Badge variant="secondary">Vite</Badge>
                  <Badge variant="secondary">Tailwind CSS</Badge>
                  <Badge variant="secondary">React Router v7</Badge>
                  <Badge variant="secondary">TanStack Query</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-sage-800">
                  Backend, Database &amp; RLS
                </h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Menggunakan <strong>Supabase</strong> dan database relasional <strong>PostgreSQL</strong>. Keamanan data pengguna dilindungi oleh kebijakan <strong>Row-Level Security (RLS)</strong> setingkat baris, memastikan pemisahan ketat antara data publik dan data sensitif mahasiswa.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary">Supabase</Badge>
                  <Badge variant="secondary">PostgreSQL</Badge>
                  <Badge variant="secondary">Row-Level Security</Badge>
                  <Badge variant="secondary">Supabase Auth</Badge>
                  <Badge variant="secondary">Storage Buckets</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-sage-800">
                  Geoportal &amp; SEO Prerender
                </h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Integrasi visual spasial menggunakan <strong>Leaflet</strong> dan <strong>MapLibre GL</strong> untuk geoportal 7 dusun. Didukung pipeline <strong>SEO prerender otomatis</strong> yang menginjeksi Schema.org dan metadata unik ke setiap halaman publik.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary">Leaflet GIS</Badge>
                  <Badge variant="secondary">MapLibre GL</Badge>
                  <Badge variant="secondary">Schema.org JSON-LD</Badge>
                  <Badge variant="secondary">Vercel Edge</Badge>
                  <Badge variant="secondary">Static Prerendering</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Developer Profile Connect Card */}
      <section className="rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-warm-100 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sage-700 text-white font-serif font-bold text-xl shadow-xs">
              AH
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Pengembang Aplikasi
              </span>
              <h3 className="text-xl font-serif font-semibold text-charcoal">
                Abdul Habir Al Majdi
              </h3>
              <p className="text-xs text-charcoal-muted max-w-xl mt-0.5">
                Mahasiswa Teknik Elektro Universitas Mataram yang merancang arsitektur sistem, integrasi backend Supabase, dan antarmuka KKN SPACE.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/developer/abdul-habir-al-majdi"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sage-700 hover:bg-sage-800 text-white px-4 py-2.5 text-xs font-semibold transition-colors"
            >
              <span>Kunjungi Profil Lengkap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-warm-300 bg-white hover:bg-warm-50 text-charcoal px-3.5 py-2.5 text-xs font-semibold transition-colors"
            >
              <Globe className="h-4 w-4 text-sage-700" />
              <span>Beranda Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Navigation Footer CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-warm-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" className="h-10 w-10 shrink-0 drop-shadow-xs" />
          <div>
            <h4 className="text-sm font-semibold text-charcoal">KKN SPACE Desa Pringgasela Selatan</h4>
            <p className="text-xs text-charcoal-muted">
              Platform Kolaborasi KKN Universitas Mataram Periode 2026–2027.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            to="/tim"
            className="font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            Tim Mahasiswa KKN
          </Link>
          <span className="text-warm-300">·</span>
          <Link
            to="/profil-desa"
            className="font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            Profil Desa
          </Link>
          <span className="text-warm-300">·</span>
          <Link
            to="/"
            className="font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}

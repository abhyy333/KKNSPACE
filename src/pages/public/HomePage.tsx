import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Users,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Sparkles,
  Megaphone,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { fetchHomePublicOverview } from '@/services/publicApi'
import {
  formatPublicDate,
  formatPublicDateRange,
  PUBLIC_PROGRAM_STATUS_META,
} from '@/lib/publicFormat'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'

export const HomePage: React.FC = () => {
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'home-overview'],
    queryFn: fetchHomePublicOverview,
    staleTime: 60_000,
    retry: 2,
  })

  const programsCount = overview?.programsCount ?? 0
  const announcementsCount = overview?.announcementsCount ?? 0
  const mediaCount = overview?.mediaCount ?? 0

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#23382B] to-[#1E3025] px-6 py-12 text-white shadow-lg sm:px-12 sm:py-16 md:px-16">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-sage-300 uppercase">
                <BrandLogo size="xs" variant="dark" className="h-5 w-5 lg:hidden" />
                <span>KKN PRINGGASELA SELATAN 2026–2027 · UNIVERSITAS MATARAM</span>
              </div>

              <h1 className="text-3xl font-serif font-medium tracking-tight sm:text-4xl lg:text-5xl leading-tight">
                Sinergi Membangun Kemandirian Desa Pringgasela Selatan
              </h1>

              <p className="text-sm sm:text-base text-warm-200/90 leading-relaxed font-sans max-w-2xl">
                Portal publik transparansi program kerja mahasiswa pengabdian, publikasi inovasi sentra
                tenun Sasak, pengumuman resmi kegiatan, serta dokumentasi pemberdayaan warga desa.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/workspace">
                  <Button
                    size="default"
                    className="bg-white text-charcoal hover:bg-warm-100 font-medium text-xs sm:text-sm gap-2 h-10 px-5 rounded-lg shadow-sm"
                  >
                    <ArrowRight className="h-4 w-4 text-sage-700" />
                    <span>Masuk Workspace Pengurus</span>
                  </Button>
                </Link>

                <Link to="/tim">
                  <Button
                    variant="subtle"
                    size="default"
                    className="text-xs sm:text-sm gap-2 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <Users className="h-4 w-4" />
                    <span>Profil Tim KKN</span>
                  </Button>
                </Link>

                <Link to="/dokumentasi">
                  <Button
                    variant="subtle"
                    size="default"
                    className="text-xs sm:text-sm gap-2 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Galeri Dokumentasi</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex shrink-0 items-center justify-center p-2">
              <BrandLogo
                size="custom"
                variant="dark"
                className="h-48 w-48 xl:h-56 xl:w-56 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-warm-300 bg-white shadow-subtle">
            <CardContent className="p-5">
              <span className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider block">
                Masa Pengabdian
              </span>
              <div className="mt-2 text-2xl font-serif font-semibold text-charcoal">
                45 Hari
              </div>
              <p className="mt-1 text-xs text-charcoal-muted">Periode KKN 2026</p>
            </CardContent>
          </Card>

          <Link to="/program-kerja" className="block group">
            <Card className="border-warm-300 bg-white shadow-subtle group-hover:border-sage-400 transition-colors">
              <CardContent className="p-5">
                <span className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider block">
                  Program Terpublikasi
                </span>
                <div className="mt-2 text-2xl font-serif font-semibold text-charcoal">
                  {isLoading ? <Skeleton className="h-8 w-24" /> : `${programsCount} Program`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-sage-700 font-medium group-hover:underline">
                  <span>Lihat Daftar Program</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dokumentasi" className="block group">
            <Card className="border-warm-300 bg-white shadow-subtle group-hover:border-sage-400 transition-colors">
              <CardContent className="p-5">
                <span className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider block">
                  Dokumentasi Publik
                </span>
                <div className="mt-2 text-2xl font-serif font-semibold text-charcoal">
                  {isLoading ? <Skeleton className="h-8 w-24" /> : `${mediaCount} Media`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-sage-700 font-medium group-hover:underline">
                  <span>Buka Galeri Publik</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <a href="#pengumuman" className="block group">
            <Card className="border-warm-300 bg-white shadow-subtle group-hover:border-sage-400 transition-colors">
              <CardContent className="p-5">
                <span className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider block">
                  Pengumuman Resmi
                </span>
                <div className="mt-2 text-2xl font-serif font-semibold text-charcoal">
                  {isLoading ? <Skeleton className="h-8 w-24" /> : `${announcementsCount} Info`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-sage-700 font-medium group-hover:underline">
                  <span>Baca Pengumuman</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      </section>

      {/* Pengumuman Terbaru Section */}
      <section id="pengumuman" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-300 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
              <Megaphone className="h-3.5 w-3.5" />
              <span>Informasi Publik</span>
            </div>
            <h2 className="text-xl font-serif font-semibold text-charcoal mt-1">
              Pengumuman Terbaru Posko KKN
            </h2>
          </div>
          <span className="text-xs text-charcoal-muted">
            Menampilkan pengumuman berstatus publikasi resmi
          </span>
        </div>

        {isLoading ? (
          <PublicCardGridSkeleton count={3} />
        ) : isError ? (
          <PublicSectionError
            message={error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data.'}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : overview && overview.announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overview.announcements.map((item) => (
              <Card key={item.id} className="border-warm-300 bg-white hover:shadow-card transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-charcoal-muted">
                    <span className="inline-flex items-center gap-1 text-sage-700 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatPublicDate(item.published_at || item.created_at, 'Terbaru')}
                    </span>
                    <Badge variant="success">Terpublikasi</Badge>
                  </div>
                  <h3 className="text-base font-semibold text-charcoal leading-snug break-words">
                    {item.title}
                  </h3>
                  <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-4 break-words">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <PublicEmptyState
            icon={<Megaphone className="h-5 w-5" />}
            title="Belum ada pengumuman yang dipublikasikan"
            description="Pengumuman resmi untuk warga dan mitra desa akan tampil di sini setelah diterbitkan oleh pengurus KKN atau DPL."
          />
        )}
      </section>

      {/* Program Kerja Unggulan Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-300 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Program Kerja Prioritas</span>
            </div>
            <h2 className="text-xl font-serif font-semibold text-charcoal mt-1">
              Ringkasan Program Kerja Terpublikasi
            </h2>
          </div>
          <Link
            to="/program-kerja"
            className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1"
          >
            <span>Seluruh Program Kerja</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <PublicCardGridSkeleton count={3} />
        ) : isError ? (
          <PublicSectionError
            message={error instanceof Error ? error.message : 'Gagal memuat program kerja.'}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : overview && overview.programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overview.programs.map((program) => {
              const statusMeta = PUBLIC_PROGRAM_STATUS_META[program.status]
              return (
                <Card key={program.id} className="border-warm-300 bg-white hover:shadow-card transition-shadow">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      <span className="text-[11px] text-charcoal-muted">
                        {formatPublicDateRange(program.start_date, program.end_date)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-charcoal leading-snug">
                      {program.title}
                    </h3>
                    <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-3">
                      {program.description || 'Deskripsi program kerja akan diperbarui oleh tim pengurus.'}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <PublicEmptyState
            icon={<Award className="h-5 w-5" />}
            title="Belum ada program kerja yang dipublikasikan"
            description="Daftar program kerja KKN akan muncul secara otomatis setelah disetujui untuk publikasi oleh Ketua atau Sekretaris KKN."
          />
        )}
      </section>

      {/* Dokumentasi Terbaru Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-300 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Dokumentasi Kegiatan</span>
            </div>
            <h2 className="text-xl font-serif font-semibold text-charcoal mt-1">
              Dokumentasi Terpublikasi Terbaru
            </h2>
          </div>
          <Link
            to="/dokumentasi"
            className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1"
          >
            <span>Lihat Seluruh Dokumentasi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <PublicCardGridSkeleton count={3} />
        ) : isError ? (
          <PublicSectionError
            message={error instanceof Error ? error.message : 'Gagal memuat dokumentasi.'}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : overview && overview.media.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {overview.media.map((media) => (
              <Card key={media.id} className="border-warm-300 bg-white overflow-hidden hover:shadow-card transition-shadow">
                <div className="h-36 bg-sage-800 p-5 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between text-[11px] text-warm-200">
                    <span className="inline-flex items-center gap-1 bg-black/25 px-2.5 py-0.5 rounded-full">
                      <ImageIcon className="h-3 w-3" />
                      Arsip Publik
                    </span>
                    <span>{formatPublicDate(media.published_at || media.created_at, 'Terbaru')}</span>
                  </div>
                  <h3 className="text-base font-serif font-semibold leading-snug line-clamp-2">
                    {media.title || 'Dokumentasi Kegiatan KKN'}
                  </h3>
                </div>
                <CardContent className="p-5">
                  <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-3">
                    {media.caption || 'Catatan kegiatan lapangan mahasiswa KKN Desa Pringgasela Selatan.'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <PublicEmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="Belum ada dokumentasi kegiatan yang dipublikasikan"
            description="Dokumentasi visual dan catatan lapangan yang telah dipublikasikan oleh tim KKN akan tampil di sini."
          />
        )}
      </section>

      {/* Info Dusun & Desa */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-warm-300 bg-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-sage-700 font-semibold uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5" />
              <span>Wilayah Pengabdian</span>
            </div>
            <h3 className="text-lg font-serif font-semibold text-charcoal">
              Menjangkau 7 Dusun di Desa Pringgasela Selatan
            </h3>
            <p className="text-xs text-charcoal-muted max-w-xl leading-relaxed">
              Tim KKN hadir dan berbaur secara langsung dengan warga di seluruh dusun binaan
              untuk memastikan keberlanjutan program dan dampak nyata bagi masyarakat.
            </p>
          </div>
          <Link to="/profil-desa">
            <Button variant="outline" className="text-xs shrink-0">
              Lihat Profil Desa Selengkapnya
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

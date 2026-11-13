import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Camera,
  ArrowLeft,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Target,
  ListOrdered,
  FileText,
  AlertCircle,
  Home,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchPublicActivityDetail,
  getPublicDocumentationPhotoUrl,
} from '@/services/publicApi'
import { formatPublicDate } from '@/lib/publicFormat'
import type { ActivityDocCategory } from '@/types/database'

const CATEGORY_BADGES: Record<
  ActivityDocCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  program_kerja: {
    label: 'Program Kerja',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  observasi_survei: {
    label: 'Observasi & Survei',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  kegiatan_desa: {
    label: 'Kegiatan Desa',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  sosialisasi: {
    label: 'Sosialisasi',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
  },
  lainnya: {
    label: 'Dokumentasi',
    bg: 'bg-warm-100',
    text: 'text-charcoal',
    border: 'border-warm-300',
  },
}

export const DocumentationDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [photoIndexBySlug, setPhotoIndexBySlug] = useState<Record<string, number>>({})
  const activePhotoIndex = photoIndexBySlug[slug || ''] ?? 0
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public', 'activity-detail', slug],
    queryFn: () => fetchPublicActivityDetail(slug || ''),
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: 1,
  })

  const activity = data?.activity
  const prevActivity = data?.prevActivity
  const nextActivity = data?.nextActivity
  const photos = activity?.photos || []

  const setActivePhotoIndex = useCallback((updater: number | ((prev: number) => number)) => {
    setPhotoIndexBySlug((map) => {
      const current = map[slug || ''] ?? 0
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...map, [slug || '']: next }
    })
  }, [slug])

  // Navigation handlers
  const handlePrevPhoto = useCallback(() => {
    if (photos.length <= 1) return
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length, setActivePhotoIndex])

  const handleNextPhoto = useCallback(() => {
    if (photos.length <= 1) return
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length, setActivePhotoIndex])

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto()
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevPhoto, handleNextPhoto])

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next Photo
      handleNextPhoto()
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Previous Photo
      handlePrevPhoto()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-4 w-48 bg-warm-200 rounded" />
        <div className="space-y-3">
          <div className="h-6 w-32 bg-warm-200 rounded" />
          <div className="h-10 w-3/4 bg-warm-200 rounded" />
          <div className="h-4 w-1/2 bg-warm-200 rounded" />
        </div>
        <div className="aspect-[16/9] w-full bg-warm-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-warm-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !activity) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-serif font-semibold text-charcoal">
          Album Kegiatan Tidak Ditemukan
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-muted max-w-md mx-auto">
          {error instanceof Error
            ? error.message
            : 'Album dokumentasi ini mungkin belum dipublikasikan atau URL tidak valid.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            Coba Lagi
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/dokumentasi')}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Katalog</span>
          </Button>
        </div>
      </div>
    )
  }

  const categoryMeta =
    CATEGORY_BADGES[activity.category] || CATEGORY_BADGES.lainnya
  const currentPhoto = photos[activePhotoIndex] || null
  const currentPhotoUrl = currentPhoto
    ? getPublicDocumentationPhotoUrl(currentPhoto.id, currentPhoto.file_id)
    : activity.cover_photo_id
      ? getPublicDocumentationPhotoUrl(null, activity.cover_photo_id)
      : '/brand/kkn-pringgasela-selatan-2026-2027.png'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-charcoal-muted flex-wrap"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1 hover:text-charcoal transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Beranda</span>
        </Link>
        <span>/</span>
        <Link
          to="/dokumentasi"
          className="hover:text-charcoal transition-colors"
        >
          Dokumentasi
        </Link>
        <span>/</span>
        <span className="text-charcoal font-medium truncate max-w-xs sm:max-w-md">
          {activity.title}
        </span>
      </nav>

      {/* Back button & Category */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-300 pb-5">
        <Link
          to="/dokumentasi"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-800 hover:text-sage-950 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Katalog Dokumentasi</span>
        </Link>

        <span
          className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold border ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border} w-fit`}
        >
          {categoryMeta.label}
        </span>
      </div>

      {/* Activity Title & Key Metadata Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-charcoal tracking-tight leading-snug">
          {activity.title}
        </h1>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-[13px] text-charcoal-muted">
          <div className="flex items-center gap-1.5 font-medium text-charcoal">
            <Calendar className="h-4 w-4 text-sage-600" />
            <span>{formatPublicDate(activity.activity_date)}</span>
          </div>

          {activity.start_time && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-sage-600" />
              <span>
                {activity.start_time}
                {activity.end_time ? ` – ${activity.end_time} WITA` : ' WITA'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-sage-600" />
            <span>
              {activity.dusun_name ? `${activity.dusun_name}, ` : ''}
              {activity.location_name}
            </span>
          </div>

          {activity.photographer_name && (
            <div className="flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-sage-600" />
              <span>Dokumentator: {activity.photographer_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Photo Gallery Carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-charcoal-muted px-1">
          <span className="font-medium text-charcoal flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sage-600" />
            Galeri Foto Kegiatan
          </span>
          {photos.length > 0 && (
            <span className="font-mono bg-warm-200/70 px-2 py-0.5 rounded text-[11px] text-charcoal font-semibold">
              Foto {activePhotoIndex + 1} dari {photos.length}
            </span>
          )}
        </div>

        {/* Big Display Area */}
        <div
          className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl bg-charcoal overflow-hidden select-none shadow-md group"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Photo Image */}
          <img
            key={currentPhotoUrl}
            src={currentPhotoUrl}
            alt={currentPhoto?.caption || activity.title}
            className="h-full w-full object-contain sm:object-cover transition-all duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (!target.src.includes('brand/kkn-pringgasela-selatan-2026-2027.png')) {
                target.src = '/brand/kkn-pringgasela-selatan-2026-2027.png'
                target.className = 'h-full w-full object-contain p-12 bg-warm-100'
              }
            }}
          />

          {/* Navigation Arrows (Desktop hover / Mobile visible) */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/85 text-white p-2.5 backdrop-blur-xs transition-transform duration-200 hover:scale-110 shadow-lg"
                title="Foto Sebelumnya (Panah Kiri)"
                aria-label="Foto Sebelumnya"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/85 text-white p-2.5 backdrop-blur-xs transition-transform duration-200 hover:scale-110 shadow-lg"
                title="Foto Berikutnya (Panah Kanan)"
                aria-label="Foto Berikutnya"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Swipe indicator pill on mobile */}
          <div className="absolute top-3 left-3 sm:hidden">
            <span className="rounded-full bg-black/50 backdrop-blur-xs px-2.5 py-1 text-[10px] text-white/90">
              Geser untuk foto lain
            </span>
          </div>

          {/* Bottom Photo Metadata Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-0.5 max-w-2xl">
              <p className="text-xs sm:text-sm font-medium leading-snug drop-shadow-sm">
                {currentPhoto?.caption || activity.title}
              </p>
              {currentPhoto?.photographer && (
                <p className="text-[11px] text-warm-200 drop-shadow-xs">
                  Foto: {currentPhoto.photographer}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <a
                href={currentPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-xs px-2.5 py-1 text-[11px] text-white transition-colors"
                title="Buka foto resolusi penuh"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Lihat Penuh</span>
              </a>
            </div>
          </div>
        </div>

        {/* Thumbnail Row with Click-to-Jump */}
        {photos.length > 1 && (
          <div className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 scrollbar-thin">
            {photos.map((p, idx) => {
              const isSelected = idx === activePhotoIndex
              const thumbUrl = getPublicDocumentationPhotoUrl(p.id, p.file_id)

              return (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative h-16 w-24 sm:h-20 sm:w-28 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    isSelected
                      ? 'border-sage-600 ring-2 ring-sage-300 scale-105 shadow-sm'
                      : 'border-warm-300/80 hover:border-sage-400 opacity-70 hover:opacity-100'
                  }`}
                  title={`Foto ${idx + 1}: ${p.caption || ''}`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        '/brand/kkn-pringgasela-selatan-2026-2027.png'
                    }}
                  />
                  {isSelected && (
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-sage-500 ring-1 ring-white" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Activity Structured Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Left Column: Full Description & Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Full Description */}
          <section className="bg-white rounded-xl border border-warm-300/80 p-6 space-y-3 shadow-xs">
            <h2 className="text-base font-serif font-semibold text-charcoal flex items-center gap-2">
              <FileText className="h-4 w-4 text-sage-600" />
              <span>Deskripsi Lengkap Kegiatan</span>
            </h2>
            <div className="text-xs sm:text-sm text-charcoal-muted leading-relaxed whitespace-pre-line space-y-2">
              {activity.description}
            </div>
          </section>

          {/* Execution Steps / Tahapan Pelaksanaan */}
          {activity.execution_steps && (
            <section className="bg-white rounded-xl border border-warm-300/80 p-6 space-y-3 shadow-xs">
              <h2 className="text-base font-serif font-semibold text-charcoal flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-sage-600" />
                <span>Tahapan Pelaksanaan &amp; Proses</span>
              </h2>
              <div className="text-xs sm:text-sm text-charcoal-muted leading-relaxed whitespace-pre-line space-y-1.5">
                {activity.execution_steps}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Objectives & Outcomes */}
        <div className="space-y-6">
          {/* Objectives / Tujuan Kegiatan */}
          {activity.objectives && (
            <section className="bg-white rounded-xl border border-warm-300/80 p-6 space-y-3 shadow-xs">
              <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider flex items-center gap-2 text-sage-800">
                <Target className="h-4 w-4 text-sage-600" />
                <span>Tujuan Kegiatan</span>
              </h2>
              <div className="text-xs text-charcoal-muted leading-relaxed whitespace-pre-line">
                {activity.objectives}
              </div>
            </section>
          )}

          {/* Results / Capaian Hasil */}
          {activity.results && (
            <section className="bg-sage-50/70 rounded-xl border border-sage-200/90 p-6 space-y-3 shadow-xs">
              <h2 className="text-sm font-semibold text-sage-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Hasil &amp; Capaian Posko</span>
              </h2>
              <div className="text-xs text-sage-900/90 leading-relaxed whitespace-pre-line">
                {activity.results}
              </div>
            </section>
          )}

          {/* Posko Identity Badge */}
          <div className="rounded-xl border border-warm-200 bg-warm-100/60 p-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase text-charcoal-muted tracking-wider">
              Identitas Pelaksana
            </div>
            <p className="text-xs font-semibold text-charcoal">
              KKN Kolaborasi Pringgasela Selatan 2026–2027
            </p>
            <p className="text-[11px] text-charcoal-muted">
              Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Mataram
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Activity Navigation (Previous & Next Activity Links) */}
      <section className="pt-8 border-t border-warm-300 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Previous Activity */}
          {prevActivity ? (
            <Link
              to={`/dokumentasi/${prevActivity.slug}`}
              className="group flex flex-col p-4 rounded-xl border border-warm-300 bg-white hover:border-sage-400 hover:shadow-xs transition-all"
            >
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider flex items-center gap-1 group-hover:text-sage-700">
                <ArrowLeft className="h-3 w-3" />
                <span>Kegiatan Sebelumnya</span>
              </span>
              <span className="text-xs sm:text-sm font-serif font-semibold text-charcoal mt-1 line-clamp-1 group-hover:text-sage-900">
                {prevActivity.title}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Next Activity */}
          {nextActivity ? (
            <Link
              to={`/dokumentasi/${nextActivity.slug}`}
              className="group flex flex-col p-4 rounded-xl border border-warm-300 bg-white hover:border-sage-400 hover:shadow-xs transition-all sm:text-right"
            >
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider flex items-center gap-1 sm:justify-end group-hover:text-sage-700">
                <span>Kegiatan Selanjutnya</span>
                <ArrowRight className="h-3 w-3" />
              </span>
              <span className="text-xs sm:text-sm font-serif font-semibold text-charcoal mt-1 line-clamp-1 group-hover:text-sage-900">
                {nextActivity.title}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {/* Return to All Documentation Button */}
        <div className="text-center pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dokumentasi')}
            className="text-xs gap-2"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Lihat Seluruh Album Dokumentasi</span>
          </Button>
        </div>
      </section>
    </div>
  )
}
export default DocumentationDetailPage

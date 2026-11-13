import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Image as ImageIcon,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  X,
} from 'lucide-react'
import {
  fetchPublicActivityAlbums,
  getPublicDocumentationPhotoUrl,
} from '@/services/publicApi'
import { formatPublicDate } from '@/lib/publicFormat'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'
import type { ActivityDocCategory } from '@/types/database'

const CATEGORY_TABS: Array<{ id: 'all' | ActivityDocCategory; label: string }> = [
  { id: 'all', label: 'Semua Album' },
  { id: 'program_kerja', label: 'Program Kerja' },
  { id: 'observasi_survei', label: 'Observasi & Survei' },
  { id: 'kegiatan_desa', label: 'Kegiatan Desa' },
  { id: 'sosialisasi', label: 'Sosialisasi' },
]

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

export const DocumentationPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | ActivityDocCategory>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const {
    data: albums = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'activity-albums', selectedCategory, searchTerm],
    queryFn: () =>
      fetchPublicActivityAlbums({
        category: selectedCategory,
        search: searchTerm,
      }),
    staleTime: 60_000,
    retry: 2,
  })

  const totalPhotoCount = useMemo(() => {
    return albums.reduce((acc, curr) => acc + (curr.photos?.length || 0), 0)
  }, [albums])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-warm-300 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Layers className="h-4 w-4" />
          <span>Katalog Dokumentasi Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-charcoal mt-1 tracking-tight">
          Dokumentasi &amp; Album Kegiatan Posko
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-muted mt-2 max-w-3xl leading-relaxed">
          Kumpulan album foto dan catatan kronologis kegiatan mahasiswa KKN Universitas Mataram di Desa
          Pringgasela Selatan Periode 2026–2027. Disajikan transparan untuk seluruh masyarakat desa dan sivitas akademika.
        </p>

        {/* Quick Stats Pill */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-charcoal-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100/70 border border-sage-200/80 px-3 py-1 font-medium text-sage-800">
            <Sparkles className="h-3 w-3 text-sage-600" />
            {albums.length} Album Kegiatan
          </span>
          {totalPhotoCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-200/60 border border-warm-300 px-3 py-1 font-medium text-charcoal">
              <Camera className="h-3 w-3 text-charcoal-muted" />
              {totalPhotoCount} Dokumentasi Foto
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-warm-100/80 rounded-xl border border-warm-200/90 w-fit">
          {CATEGORY_TABS.map((tab) => {
            const active = selectedCategory === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-sage-700 text-white shadow-xs font-semibold'
                    : 'text-charcoal-muted hover:text-charcoal hover:bg-white/70'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kegiatan, dusun, atau topik..."
            className="pl-9 pr-8 text-xs h-9 bg-white border-warm-300 focus:border-sage-500 rounded-lg"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
              title="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Album Cards Grid */}
      {isLoading ? (
        <PublicCardGridSkeleton count={3} columnsClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : isError ? (
        <PublicSectionError
          message={error instanceof Error ? error.message : 'Gagal memuat katalog dokumentasi kegiatan.'}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : albums.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {albums.map((album) => {
            const categoryMeta =
              CATEGORY_BADGES[album.category] || CATEGORY_BADGES.lainnya
            const photos = album.photos || []
            const coverPhoto = photos.find((p) => p.is_cover) || photos[0]
            const coverUrl = coverPhoto
              ? getPublicDocumentationPhotoUrl(coverPhoto.id, coverPhoto.file_id)
              : album.cover_photo_id
                ? getPublicDocumentationPhotoUrl(null, album.cover_photo_id)
                : '/brand/kkn-pringgasela-selatan-2026-2027.png'

            // Preview thumbnails (next 3 photos)
            const previewPhotos = photos.slice(1, 4)

            return (
              <Card
                key={album.id}
                className="group border border-warm-300/80 bg-white hover:border-sage-300 transition-all duration-200 overflow-hidden flex flex-col rounded-xl shadow-xs hover:shadow-md"
              >
                <Link
                  to={`/dokumentasi/${album.slug || album.id}`}
                  className="flex flex-col flex-1"
                >
                  {/* Cover Image Container */}
                  <div className="relative aspect-[16/10] w-full bg-warm-200 overflow-hidden">
                    <img
                      src={coverUrl}
                      alt={album.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback to official brand logo if storage fails to load
                        const target = e.target as HTMLImageElement
                        if (!target.src.includes('brand/kkn-pringgasela-selatan-2026-2027.png')) {
                          target.src = '/brand/kkn-pringgasela-selatan-2026-2027.png'
                          target.className = 'h-full w-full object-contain p-6 bg-warm-100'
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold border ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border} backdrop-blur-xs`}
                      >
                        {categoryMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white shadow-xs">
                        <Camera className="h-3 w-3" />
                        {album.photo_count || photos.length} Foto
                      </span>
                    </div>

                    {/* Bottom overlay: Location */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-xs text-warm-100 font-medium truncate drop-shadow-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-sage-300" />
                      <span className="truncate">
                        {album.dusun_name ? `${album.dusun_name} · ` : ''}
                        {album.location_name}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      {/* Date & Time info */}
                      <div className="flex items-center gap-3 text-[11px] text-charcoal-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-sage-600" />
                          {formatPublicDate(album.activity_date)}
                        </span>
                        {album.start_time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-sage-600" />
                            {album.start_time}
                            {album.end_time ? ` – ${album.end_time} WITA` : ' WITA'}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-base font-serif font-semibold text-charcoal leading-snug line-clamp-2 group-hover:text-sage-800 transition-colors">
                        {album.title}
                      </h2>

                      {/* Short Description */}
                      <p className="text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                        {album.short_description || album.description}
                      </p>
                    </div>

                    {/* Thumbnail preview row & Action link */}
                    <div className="space-y-3 pt-3 border-t border-warm-200">
                      {previewPhotos.length > 0 && (
                        <div className="flex items-center gap-2">
                          {previewPhotos.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="relative h-11 w-11 rounded-lg overflow-hidden bg-warm-100 border border-warm-300 shrink-0"
                            >
                              <img
                                src={getPublicDocumentationPhotoUrl(p.id, p.file_id)}
                                alt={`Preview ${idx + 1}`}
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src =
                                    '/brand/kkn-pringgasela-selatan-2026-2027.png'
                                }}
                              />
                            </div>
                          ))}
                          {photos.length > 4 && (
                            <div className="h-11 w-11 rounded-lg bg-warm-100 border border-warm-300 flex items-center justify-center text-[10px] font-semibold text-charcoal-muted shrink-0">
                              +{photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Footer: Photographer & "Buka Album" */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-charcoal-muted truncate max-w-[50%]">
                          {album.photographer_name
                            ? `Dok: ${album.photographer_name}`
                            : 'Dok: Tim KKN'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-sage-700 group-hover:text-sage-900 group-hover:translate-x-0.5 transition-all text-xs">
                          <span>Buka Album</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <PublicEmptyState
            icon={<ImageIcon className="h-6 w-6 text-warm-400" />}
            title={
              searchTerm || selectedCategory !== 'all'
                ? 'Tidak ada album yang sesuai dengan filter'
                : 'Belum ada album dokumentasi yang dipublikasikan'
            }
            description={
              searchTerm || selectedCategory !== 'all'
                ? 'Coba ganti kata kunci pencarian atau pilih kategori Semua Album untuk menampilkan seluruh kegiatan.'
                : 'Album kegiatan yang diunggah dan dipublikasikan oleh posko KKN akan otomatis muncul pada katalog publik ini.'
            }
          />
          {(searchTerm || selectedCategory !== 'all') && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all')
                  setSearchTerm('')
                }}
                className="text-xs"
              >
                Reset Filter &amp; Pencarian
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export default DocumentationPage

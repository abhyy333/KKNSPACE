import React, { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicDocPhoto } from '@/components/public/PublicDocPhoto'
import {
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'
import {
  fetchPublicDocumentationList,
  fetchPublicDocumentationCategories,
} from '@/services/publicApi'
import { formatPublicDate } from '@/lib/publicFormat'
import {
  Camera,
  Calendar,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  Images,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

// ─── Category color mapping ───────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'Program Kerja': 'bg-sage-100 text-sage-800 border-sage-200',
  'Observasi Survei': 'bg-blue-50 text-blue-700 border-blue-200',
  'Kegiatan Kelompok': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kegiatan Sosial': 'bg-rose-50 text-rose-700 border-rose-200',
}
function categoryColor(cat: string | null): string {
  if (!cat) return 'bg-warm-100 text-charcoal-muted border-warm-300'
  return CATEGORY_COLORS[cat] ?? 'bg-warm-100 text-charcoal border-warm-300'
}

// ─── Documentation Card ───────────────────────────────────
interface DocCardProps {
  id: string
  title: string | null
  caption: string | null
  category: string | null
  event_date: string | null
  location: string | null
  photographer: string | null
  cover_file_id: string | null
  photo_count: number
  slug: string | null
}

const DocumentationCard: React.FC<DocCardProps> = ({
  id, title, caption, category, event_date, location, photographer, cover_file_id, photo_count, slug,
}) => {
  const href = `/dokumentasi/${slug || id}`

  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-warm-300 bg-white hover:shadow-card hover:border-warm-400 transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative overflow-hidden">
        <PublicDocPhoto
          fileId={cover_file_id}
          assetId={id}
          alt={title ?? 'Dokumentasi kegiatan'}
          aspectClass="aspect-[4/3]"
          className="w-full group-hover:scale-[1.03] transition-transform duration-300"
        />
        {/* Photo count badge */}
        {photo_count > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-charcoal/75 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
            <Images className="h-3 w-3" />
            {photo_count} foto
          </span>
        )}
        {/* Category overlay */}
        {category && (
          <span className={cn(
            'absolute top-2 left-2 rounded-full border px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm bg-white/80',
            categoryColor(category)
          )}>
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-charcoal-muted">
          {event_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-sage-600" />
              {formatPublicDate(event_date, 'Tanggal menyusul')}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-sage-600" />
              {location}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-charcoal leading-snug line-clamp-2 group-hover:text-sage-800 transition-colors">
          {title || 'Dokumentasi Kegiatan KKN'}
        </h2>

        {/* Caption */}
        {caption && (
          <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-2">{caption}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-warm-200">
          {photographer && (
            <span className="flex items-center gap-1 text-[11px] text-charcoal-muted">
              <Camera className="h-3 w-3" />
              {photographer}
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-sage-700 group-hover:gap-1 transition-all">
            Lihat album
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton ───────────────────────────────────────────
const CardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-warm-300 bg-white overflow-hidden">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
)

// ─── Main Page ───────────────────────────────────────────
export const DocumentationPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const deferredSearch = useDeferredValue(search)

  // Reset page on filter change
  const handleCategory = (cat: string | null) => {
    setActiveCategory(cat)
    setPage(0)
  }
  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(0)
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['public', 'doc-categories'],
    queryFn: fetchPublicDocumentationCategories,
    staleTime: 120_000,
  })

  const {
    data: docs = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'docs', activeCategory, deferredSearch, page],
    queryFn: () =>
      fetchPublicDocumentationList({
        category: activeCategory,
        search: deferredSearch || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    staleTime: 60_000,
    retry: 2,
    placeholderData: (prev) => prev,
  })

  const hasMore = docs.length === PAGE_SIZE
  const hasFilters = !!activeCategory || !!deferredSearch

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="space-y-1 border-b border-warm-300 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Dokumentasi Kegiatan</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal">
          Galeri Dokumentasi KKN
        </h1>
        <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">
          Arsip visual dan catatan kegiatan pengabdian KKN Pringgasela Selatan 2026–2027.
          Setiap album merekam momen dan dampak nyata di lapangan.
        </p>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari kegiatan, lokasi..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 text-sm bg-white border-warm-300"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-charcoal-muted shrink-0" />
            <button
              onClick={() => handleCategory(null)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                !activeCategory
                  ? 'bg-sage-700 text-white border-sage-700'
                  : 'bg-white text-charcoal border-warm-300 hover:border-warm-400'
              )}
            >
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => handleCategory(c.category)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  activeCategory === c.category
                    ? 'bg-sage-700 text-white border-sage-700'
                    : 'bg-white text-charcoal border-warm-300 hover:border-warm-400'
                )}
              >
                {c.category}
                <span className="ml-1 opacity-60">({c.item_count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <PublicSectionError
          message={error instanceof Error ? error.message : 'Gagal memuat dokumentasi kegiatan.'}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : docs.length > 0 ? (
        <>
          {/* Results summary */}
          {hasFilters && (
            <p className="text-xs text-charcoal-muted">
              Menampilkan {docs.length} hasil
              {activeCategory && <> untuk kategori <strong>{activeCategory}</strong></>}
              {deferredSearch && <> pencarian &ldquo;<strong>{deferredSearch}</strong>&rdquo;</>}
            </p>
          )}

          <div className={cn(
            'grid gap-6 transition-opacity duration-200',
            isFetching && 'opacity-60',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}>
            {docs.map((doc) => (
              <DocumentationCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                caption={doc.caption}
                category={doc.category}
                event_date={doc.event_date}
                location={doc.location}
                photographer={doc.photographer}
                cover_file_id={doc.cover_file_id}
                photo_count={doc.photo_count}
                slug={doc.slug}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-4">
            {page > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={isFetching}
                className="border-warm-300 text-charcoal hover:bg-warm-100"
              >
                ← Sebelumnya
              </Button>
            )}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="border-warm-300 text-charcoal hover:bg-warm-100"
              >
                {isFetching ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Muat lebih banyak →'
                )}
              </Button>
            )}
          </div>
        </>
      ) : (
        <PublicEmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title={
            hasFilters
              ? 'Tidak ada dokumentasi yang sesuai'
              : 'Belum ada dokumentasi yang dipublikasikan'
          }
          description={
            hasFilters
              ? 'Coba ubah kata kunci pencarian atau pilih kategori lain.'
              : 'Galeri dokumentasi publik masih kosong. Dokumentasi yang diterbitkan oleh tim akan muncul di sini secara otomatis.'
          }
        />
      )}
    </div>
  )
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicDocPhoto } from '@/components/public/PublicDocPhoto'
import {
  fetchPublicDocumentationDetail,
  fetchPublicDocumentationList,
  fetchPublicDocumentationPhotoUrl,
} from '@/services/publicApi'
import { formatPublicDate } from '@/lib/publicFormat'
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  Tag,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Lightbox ────────────────────────────────────────────
interface LightboxProps {
  fileId: string
  assetId: string
  alt: string
  onClose: () => void
}

const Lightbox: React.FC<LightboxProps> = ({ fileId, assetId, alt, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        aria-label="Tutup"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <PublicDocPhoto
          fileId={fileId}
          assetId={assetId}
          alt={alt}
          aspectClass=""
          className="max-h-[90vh] max-w-[90vw] h-auto w-auto"
        />
      </div>
    </div>
  )
}

// ─── Photo Carousel ───────────────────────────────────────
interface CarouselProps {
  fileIds: string[]
  assetId: string
  title: string
}

const PhotoCarousel: React.FC<CarouselProps> = ({ fileIds, assetId, title }) => {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(idx, fileIds.length - 1)))
  }, [fileIds.length])

  const prev = () => goTo(current - 1)
  const next = () => goTo(current + 1)

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxOpen) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, lightboxOpen])

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50) {
      if (delta < 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  if (fileIds.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-warm-200 flex items-center justify-center text-charcoal-muted">
        <Images className="h-10 w-10 opacity-30" />
      </div>
    )
  }

  const currentFileId = fileIds[current]

  return (
    <div className="space-y-3">
      {/* Main slide */}
      <div
        className="relative select-none rounded-xl overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          className="w-full text-left"
          onClick={() => setLightboxOpen(true)}
          title="Klik untuk memperbesar"
          type="button"
        >
          <PublicDocPhoto
            fileId={currentFileId}
            assetId={assetId}
            alt={`${title} — Foto ${current + 1}`}
            aspectClass="aspect-[4/3]"
            className="w-full cursor-zoom-in"
          />
        </button>

        {/* Prev / Next buttons */}
        {fileIds.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-charcoal/60 p-1.5 text-white hover:bg-charcoal/80 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              disabled={current === fileIds.length - 1}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-charcoal/60 p-1.5 text-white hover:bg-charcoal/80 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Counter */}
        <span className="absolute bottom-3 right-3 rounded-full bg-charcoal/70 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
          {current + 1} / {fileIds.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      {fileIds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fileIds.map((fid, idx) => (
            <button
              key={fid}
              onClick={() => goTo(idx)}
              type="button"
              aria-label={`Foto ${idx + 1}`}
              className={cn(
                'flex-none rounded-lg overflow-hidden border-2 transition-all',
                idx === current
                  ? 'border-sage-700 ring-2 ring-sage-200'
                  : 'border-transparent opacity-60 hover:opacity-90'
              )}
              style={{ width: 72, height: 54 }}
            >
              <ThumbnailImg fileId={fid} assetId={assetId} idx={idx} title={title} />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          fileId={currentFileId}
          assetId={assetId}
          alt={`${title} — Foto ${current + 1}`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}

// Small thumbnail that fetches its own URL
const ThumbnailImg: React.FC<{ fileId: string; assetId: string; idx: number; title: string }> = ({
  fileId, assetId, idx, title,
}) => {
  const [err, setErr] = useState(false)
  const { data: url } = useQuery({
    queryKey: ['public-doc-photo', fileId, assetId],
    queryFn: () => fetchPublicDocumentationPhotoUrl(fileId, assetId),
    enabled: !!fileId,
    staleTime: 240_000,
  })

  if (!url || err) {
    return <div className="w-full h-full bg-warm-300 flex items-center justify-center text-[10px] text-charcoal-muted">{idx + 1}</div>
  }
  return (
    <img
      src={url}
      alt={`${title} thumbnail ${idx + 1}`}
      onError={() => setErr(true)}
      loading="lazy"
      className="w-full h-full object-cover"
    />
  )
}

// ─── Main Detail Page ─────────────────────────────────────
export const DocumentationDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const {
    data: doc,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['public', 'doc-detail', slug],
    queryFn: () => (slug ? fetchPublicDocumentationDetail(slug) : Promise.resolve(null)),
    enabled: !!slug,
    staleTime: 60_000,
    retry: 1,
  })

  // Related docs (same category, exclude self)
  const { data: related = [] } = useQuery({
    queryKey: ['public', 'docs', doc?.category, null, 0],
    queryFn: () =>
      fetchPublicDocumentationList({ category: doc?.category ?? null, limit: 4 }),
    enabled: !!doc,
    staleTime: 60_000,
  })
  const relatedFiltered = related.filter((r) => r.id !== doc?.id).slice(0, 3)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-warm-300 bg-white p-10 text-center space-y-3">
          <Images className="h-10 w-10 text-charcoal-muted mx-auto opacity-40" />
          <h2 className="text-lg font-semibold text-charcoal">Dokumentasi tidak tersedia</h2>
          <p className="text-sm text-charcoal-muted max-w-sm mx-auto">
            {error instanceof Error ? error.message : 'Album ini mungkin telah ditarik atau belum dipublikasikan.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dokumentasi')}
            className="mt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Kembali ke Galeri
          </Button>
        </div>
      </div>
    )
  }

  const photoFileIds: string[] =
    Array.isArray(doc.photo_file_ids) && doc.photo_file_ids.length > 0
      ? doc.photo_file_ids
      : doc.primary_file_id
      ? [doc.primary_file_id]
      : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-muted">
        <Link to="/" className="hover:text-charcoal transition-colors">Beranda</Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <Link to="/dokumentasi" className="hover:text-charcoal transition-colors">Dokumentasi</Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="truncate text-charcoal max-w-[200px]">{doc.title ?? 'Kegiatan'}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* ── Left: Carousel + Description ── */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            {doc.category && (
              <Badge variant="outline" className="text-xs text-sage-700 border-sage-200 bg-sage-50">
                <Tag className="h-3 w-3 mr-1" />
                {doc.category}
              </Badge>
            )}
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal leading-snug">
              {doc.title ?? 'Dokumentasi Kegiatan KKN'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted">
              {doc.event_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sage-600" />
                  {formatPublicDate(doc.event_date, 'Tanggal menyusul')}
                </span>
              )}
              {doc.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sage-600" />
                  {doc.location}
                </span>
              )}
              {doc.photographer && (
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-sage-600" />
                  {doc.photographer}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Images className="h-3.5 w-3.5 text-sage-600" />
                {doc.photo_count} foto
              </span>
            </div>
          </div>

          {/* Carousel */}
          <PhotoCarousel
            fileIds={photoFileIds}
            assetId={doc.id}
            title={doc.title ?? 'Dokumentasi'}
          />

          {/* Description */}
          {(doc.description_long || doc.caption) && (
            <div className="rounded-xl border border-warm-300 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-charcoal">Tentang Kegiatan</h3>
              <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-line">
                {doc.description_long || doc.caption}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Info sidebar ── */}
        <div className="space-y-5">
          {/* Detail info card */}
          <div className="rounded-xl border border-warm-300 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-charcoal border-b border-warm-200 pb-2">
              Informasi Kegiatan
            </h3>
            <dl className="space-y-3 text-sm">
              {doc.category && (
                <div>
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Kategori</dt>
                  <dd className="mt-0.5 text-charcoal">{doc.category}</dd>
                </div>
              )}
              {doc.event_date && (
                <div>
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Tanggal</dt>
                  <dd className="mt-0.5 text-charcoal">{formatPublicDate(doc.event_date, '—')}</dd>
                </div>
              )}
              {doc.location && (
                <div>
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Lokasi</dt>
                  <dd className="mt-0.5 text-charcoal">{doc.location}</dd>
                </div>
              )}
              {doc.photographer && (
                <div>
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Fotografer</dt>
                  <dd className="mt-0.5 text-charcoal">{doc.photographer}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Jumlah Foto</dt>
                <dd className="mt-0.5 text-charcoal">{doc.photo_count} foto</dd>
              </div>
              {doc.published_at && (
                <div>
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">Dipublikasikan</dt>
                  <dd className="mt-0.5 text-charcoal">{formatPublicDate(doc.published_at, '—')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Back button */}
          <Link
            to="/dokumentasi"
            className="flex items-center gap-2 text-sm text-sage-700 hover:text-sage-900 font-medium transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Kembali ke Galeri
          </Link>
        </div>
      </div>

      {/* ── Related ── */}
      {relatedFiltered.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-warm-300">
          <h3 className="text-sm font-semibold text-charcoal">Kegiatan Lainnya</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedFiltered.map((r) => (
              <Link
                key={r.id}
                to={`/dokumentasi/${r.slug || r.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-warm-300 bg-white hover:border-warm-400 hover:shadow-card transition-all"
              >
                <PublicDocPhoto
                  fileId={r.cover_file_id}
                  assetId={r.id}
                  alt={r.title ?? 'Kegiatan'}
                  aspectClass="aspect-[4/3]"
                  className="w-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-3">
                  <p className="text-xs font-medium text-charcoal line-clamp-2 group-hover:text-sage-800 transition-colors">
                    {r.title ?? 'Dokumentasi Kegiatan'}
                  </p>
                  {r.event_date && (
                    <p className="text-[11px] text-charcoal-muted mt-1">
                      {formatPublicDate(r.event_date, '')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import { useToast } from '@/components/ui/toast'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react'

export interface LightboxPhotoItem {
  id?: string
  file_id: string
  caption?: string | null
  title?: string | null
  original_name?: string | null
}

interface PhotoLightboxModalProps {
  open: boolean
  onClose: () => void
  photos: LightboxPhotoItem[]
  initialIndex?: number
  onDownload?: (fileId: string) => void
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  open,
  onClose,
  photos,
  initialIndex = 0,
  onDownload,
}) => {
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setZoomLevel(1)
      setDragOffset({ x: 0, y: 0 })
    }
  }, [open, initialIndex])

  const currentPhoto = photos[currentIndex] || null

  const { data: signedData, isLoading, isError } = useQuery({
    queryKey: ['signed-url', currentPhoto?.file_id, false],
    queryFn: () => (currentPhoto?.file_id ? getPrivateFileSignedUrl(currentPhoto.file_id, false) : null),
    enabled: Boolean(open && currentPhoto?.file_id),
    staleTime: 300_000,
    retry: 1,
  })

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setZoomLevel(1)
      setDragOffset({ x: 0, y: 0 })
    }
  }, [currentIndex, photos.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setZoomLevel(1)
      setDragOffset({ x: 0, y: 0 })
    }
  }, [currentIndex])

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.5, 1)
      if (next === 1) setDragOffset({ x: 0, y: 0 })
      return next
    })
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
    setDragOffset({ x: 0, y: 0 })
  }

  const handleToggleZoom = () => {
    if (zoomLevel > 1) {
      handleResetZoom()
    } else {
      setZoomLevel(2)
    }
  }

  const handleDownloadOriginal = async () => {
    if (!currentPhoto?.file_id) return
    if (onDownload) {
      onDownload(currentPhoto.file_id)
      return
    }

    try {
      const res = await getPrivateFileSignedUrl(currentPhoto.file_id, true)
      if (res?.signedUrl) {
        window.open(res.signedUrl, '_blank')
      }
    } catch {
      toast({
        title: 'Gagal Mengunduh Foto',
        description: 'Tautan unduhan berkas asli tidak dapat diakses.',
        variant: 'error',
      })
    }
  }

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, handleNext, handlePrev])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return
    setDragOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (!open || !currentPhoto) return null

  const title = currentPhoto.caption || currentPhoto.title || currentPhoto.original_name || 'Dokumentasi Kegiatan'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-charcoal/95 backdrop-blur-md select-none overscroll-none"
      onClick={onClose}
      onMouseUp={handleMouseUp}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 bg-charcoal/70 border-b border-white/10 text-white z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <Eye className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-white truncate max-w-md sm:max-w-xl">
              {title}
            </h2>
            {photos.length > 1 && (
              <p className="text-[11px] text-white/60">
                Foto {currentIndex + 1} dari {photos.length}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center rounded-lg bg-white/10 p-0.5 mr-1 border border-white/15">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Perkecil (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 text-[11px] font-mono text-white/90 min-w-10 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Perbesar (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadOriginal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors border border-white/15"
            title="Unduh Berkas Asli"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Unduh Asli</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white transition-colors border border-white/15 ml-1"
            title="Tutup (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              disabled={currentIndex === 0}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-charcoal/70 text-white hover:bg-charcoal border border-white/20 disabled:opacity-20 transition-all shadow-lg"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              disabled={currentIndex === photos.length - 1}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-charcoal/70 text-white hover:bg-charcoal border border-white/20 disabled:opacity-20 transition-all shadow-lg"
              title="Foto Berikutnya"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        <div
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-white">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-xs text-white/70">Memuat berkas gambar resolusi penuh...</p>
            </div>
          ) : isError || !signedData?.signedUrl ? (
            <div className="p-8 text-center text-white bg-charcoal/60 rounded-xl border border-white/10 max-w-md">
              <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">Gagal Memuat Gambar</p>
              <p className="text-xs text-white/60 mt-1">
                Tautan berkas privat tidak dapat diakses atau telah kedaluwarsa.
              </p>
            </div>
          ) : (
            <div
              className={`transition-transform duration-150 ease-out select-none ${
                zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
              }`}
              style={{
                transform: `scale(${zoomLevel}) translate(${dragOffset.x / zoomLevel}px, ${dragOffset.y / zoomLevel}px)`,
              }}
              onMouseDown={handleMouseDown}
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleToggleZoom()
              }}
            >
              <img
                src={signedData.signedUrl}
                alt={title}
                className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-md shadow-2xl pointer-events-auto"
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      <div
        className="px-4 py-2 bg-charcoal/80 border-t border-white/10 text-white/70 text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span>Klik ganda untuk memperbesar (1x &harr; 2x)</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline">Gunakan tombol panah untuk navigasi</span>
        </div>
        <div className="text-white/50 text-[10px]">
          Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">Esc</kbd> untuk menutup
        </div>
      </div>
    </div>
  )
}

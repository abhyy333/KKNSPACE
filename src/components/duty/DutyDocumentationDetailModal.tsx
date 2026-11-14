import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import type { DutyShift, DutyShiftDocumentation, WorkspaceMemberSummary } from '@/types/database'
import {
  Camera,
  Download,
  Eye,
  Trash2,
  Edit3,
  X,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface DutyDocumentationDetailModalProps {
  shift: DutyShift | null
  open: boolean
  onClose: () => void
  onEdit?: (shift: DutyShift) => void
  onDelete?: (shift: DutyShift) => void
  memberMap: Map<string, WorkspaceMemberSummary>
  currentUserId?: string
  isSuperAdmin?: boolean
  userRole?: string
}

export const DutyDocumentationDetailModal: React.FC<DutyDocumentationDetailModalProps> = ({
  shift,
  open,
  onClose,
  onEdit,
  onDelete,
  memberMap,
  currentUserId,
  isSuperAdmin,
  userRole,
}) => {
  const { toast } = useToast()
  const [lightboxPhoto, setLightboxPhoto] = useState<DutyShiftDocumentation | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [isLoadingLightbox, setIsLoadingLightbox] = useState(false)

  if (!shift) return null

  const docs = shift.documentations || []
  const canManage =
    Boolean(isSuperAdmin) ||
    userRole === 'ketua' ||
    userRole === 'sekretaris' ||
    Boolean(currentUserId && shift.created_by === currentUserId)

  const creator = shift.created_by ? memberMap.get(shift.created_by) : undefined
  const creatorName = creator?.full_name || 'Anggota Posko'
  const creatorInitials = creatorName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const formattedDate = shift.created_at
    ? new Date(shift.created_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : shift.shift_date
    ? new Date(`${shift.shift_date}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Hari ini'

  const handleOpenLightbox = async (photo: DutyShiftDocumentation) => {
    setLightboxPhoto(photo)
    setIsLoadingLightbox(true)
    try {
      const res = await getPrivateFileSignedUrl(photo.file_id, false)
      setLightboxUrl(res?.signedUrl || null)
    } catch {
      toast({
        title: 'Gagal Memuat Foto',
        description: 'Tidak dapat memperoleh tautan akses foto.',
        variant: 'error',
      })
    } finally {
      setIsLoadingLightbox(false)
    }
  }

  const handleDownload = async (fileId: string) => {
    try {
      const res = await getPrivateFileSignedUrl(fileId, true)
      if (res?.signedUrl) {
        window.open(res.signedUrl, '_blank')
      }
    } catch {
      toast({
        title: 'Gagal Mengunduh Foto',
        description: 'Tautan unduhan tidak tersedia.',
        variant: 'error',
      })
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={shift.title || shift.notes || 'Dokumentasi Piket Posko'}
        description={`Dokumentasi kegiatan piket posko KKN.`}
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-5 text-xs text-charcoal">
          {/* Metadata Card: Uploader & Timestamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-warm-50/80 rounded-xl border border-warm-200">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-forest/10 border border-forest/20 text-forest font-semibold text-xs flex items-center justify-center shrink-0">
                {creatorInitials}
              </div>
              <div>
                <p className="font-semibold text-charcoal text-xs">{creatorName}</p>
                <div className="flex items-center gap-2 text-[11px] text-charcoal-muted mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-forest" />
                    {formattedDate}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-medium text-forest">
                    <Camera className="h-3 w-3" />
                    {docs.length} Foto Tersimpan
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons if user can manage */}
            {canManage && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onEdit(shift)
                    }}
                    className="h-7 px-2.5 text-xs gap-1 border-warm-300 text-charcoal hover:bg-warm-100"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-forest" />
                    <span>Edit</span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onDelete(shift)
                    }}
                    className="h-7 px-2.5 text-xs gap-1 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Keterangan Kegiatan */}
          {shift.notes ? (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
                Keterangan Kegiatan &amp; Kondisi Posko
              </h4>
              <div className="p-3.5 bg-white rounded-lg border border-warm-200 leading-relaxed text-charcoal whitespace-pre-line text-xs">
                {shift.notes}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-warm-50 rounded-lg border border-warm-200 text-charcoal-muted italic text-[11px]">
              Tidak ada keterangan tertulis untuk dokumentasi piket ini.
            </div>
          )}

          {/* Galeri Foto Kegiatan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
                Galeri Foto Kegiatan Posko ({docs.length})
              </h4>
              <span className="text-[10px] text-charcoal-muted">
                Klik foto untuk melihat ukuran penuh
              </span>
            </div>

            {docs.length === 0 ? (
              <div className="p-8 text-center bg-warm-50 rounded-xl border border-dashed border-warm-300 space-y-2">
                <div className="w-10 h-10 rounded-full bg-forest/10 text-forest mx-auto flex items-center justify-center">
                  <Camera className="h-5 w-5 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-charcoal">Belum Ada Foto Terlampir</p>
                <p className="text-[11px] text-charcoal-muted max-w-xs mx-auto">
                  {canManage
                    ? 'Klik tombol Edit untuk mengunggah foto dokumentasi kegiatan piket posko ini.'
                    : 'Dokumentasi ini belum memiliki lampiran foto.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {docs.map((photo) => (
                  <DetailPhotoCard
                    key={photo.id}
                    photo={photo}
                    onClick={() => handleOpenLightbox(photo)}
                    onDownload={() => handleDownload(photo.file_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end pt-3 border-t border-warm-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-warm-300 text-charcoal hover:bg-warm-100"
            >
              Tutup &amp; Kembali ke Daftar Piket
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal (Click to zoom photo) */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/90 p-4 backdrop-blur-xs overscroll-none"
          onClick={() => {
            setLightboxPhoto(null)
            setLightboxUrl(null)
          }}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setLightboxPhoto(null)
                setLightboxUrl(null)
              }}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Tutup foto"
            >
              <X className="h-5 w-5" />
            </button>

            {isLoadingLightbox ? (
              <div className="flex h-80 w-full items-center justify-center text-white">
                <Skeleton className="h-80 w-full max-w-lg bg-white/10 rounded-lg animate-pulse" />
              </div>
            ) : lightboxUrl ? (
              <div className="space-y-3 w-full flex flex-col items-center">
                <img
                  src={lightboxUrl}
                  alt={lightboxPhoto.caption || 'Foto dokumentasi piket'}
                  className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />
                <div className="flex items-center justify-between w-full px-2 text-white/90 text-xs">
                  <span className="truncate max-w-md">
                    {lightboxPhoto.caption || shift.title || 'Foto Kegiatan Piket Posko'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload(lightboxPhoto.file_id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors text-xs shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Asli</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-white text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-400" />
                <p className="text-xs">Gagal memuat pratinjau gambar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Single card in detail photo gallery
 */
const DetailPhotoCard: React.FC<{
  photo: DutyShiftDocumentation
  onClick: () => void
  onDownload: () => void
}> = ({ photo, onClick, onDownload }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['signed-url', photo.file_id, false],
    queryFn: () => getPrivateFileSignedUrl(photo.file_id, false),
    staleTime: 300_000,
    retry: 1,
  })

  return (
    <div className="group relative aspect-4/3 rounded-xl overflow-hidden bg-charcoal/5 border border-warm-200 shadow-2xs hover:shadow-md transition-shadow">
      {isLoading ? (
        <div className="w-full h-full bg-warm-200 animate-pulse flex flex-col items-center justify-center gap-1.5 text-charcoal-muted">
          <Skeleton className="absolute inset-0 w-full h-full" />
          <Loader2 className="relative z-10 h-5 w-5 text-forest animate-spin" />
        </div>
      ) : isError || !data?.signedUrl ? (
        <div className="w-full h-full bg-warm-100 flex flex-col items-center justify-center p-3 text-center">
          <AlertCircle className="h-5 w-5 text-rose-500 mb-1" />
          <p className="text-[11px] font-semibold text-charcoal">Gagal memuat foto</p>
          <p className="text-[9px] text-charcoal-muted line-clamp-1">
            {error instanceof Error ? error.message : 'Tautan tidak valid'}
          </p>
        </div>
      ) : (
        <>
          <img
            src={data.signedUrl}
            alt={photo.caption || 'Foto piket'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div
            onClick={onClick}
            className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-2"
          >
            <div className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white transition-colors shadow-sm">
              <Eye className="h-4 w-4 text-forest" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
              className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white transition-colors shadow-sm"
              title="Unduh foto"
            >
              <Download className="h-4 w-4 text-charcoal" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

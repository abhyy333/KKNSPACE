import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { getPrivateFileSignedUrl, formatBytes } from '@/services/storageApi'
import {
  uploadDutyShiftPhoto,
  deleteDutyShiftPhoto,
} from '@/services/agendaApi'
import type {
  DutyShift,
  DutyShiftDocumentation,
  WorkspaceMemberSummary,
} from '@/types/database'
import {
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Eye,
  Download,
  AlertCircle,
  Clock,
  User,
  Plus,
} from 'lucide-react'

interface StagedFile {
  id: string
  file: File
  previewUrl: string
  caption: string
}

interface DutyPhotoDocumentationModalProps {
  shift: DutyShift | null
  open: boolean
  onClose: () => void
  membersMap: Map<string, WorkspaceMemberSummary>
  currentUserId?: string
  isSuperAdmin?: boolean
  userRole?: string
}

const DutyPhotoThumb: React.FC<{
  fileId: string
  alt: string
  onClick: () => void
}> = ({ fileId, alt, onClick }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['signed-url', fileId, false],
    queryFn: () => getPrivateFileSignedUrl(fileId, false),
    staleTime: 300_000,
    retry: 1,
  })

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-lg" />
  }

  if (!data?.signedUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-warm-200 text-charcoal-muted rounded-lg">
        <ImageIcon className="h-6 w-6 opacity-40" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="group relative h-full w-full overflow-hidden rounded-lg bg-warm-200 cursor-pointer"
    >
      <img
        src={data.signedUrl}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-charcoal/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="h-5 w-5 text-white" />
      </div>
    </div>
  )
}

export const DutyPhotoDocumentationModal: React.FC<DutyPhotoDocumentationModalProps> = ({
  shift,
  open,
  onClose,
  membersMap,
  currentUserId,
  isSuperAdmin,
  userRole,
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<DutyShiftDocumentation | null>(null)

  const { data: lightboxUrl } = useQuery({
    queryKey: ['signed-url', lightboxPhoto?.file_id, false],
    queryFn: () =>
      lightboxPhoto ? getPrivateFileSignedUrl(lightboxPhoto.file_id, false) : null,
    enabled: Boolean(lightboxPhoto),
    staleTime: 300_000,
  })

  const deletePhotoMutation = useMutation({
    mutationFn: deleteDutyShiftPhoto,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'duty-shifts'] })
      toast({
        title: 'Foto Dokumentasi Dihapus',
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menghapus Foto',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  if (!shift) return null

  const isLeaderOrAdmin =
    Boolean(isSuperAdmin) || userRole === 'ketua' || userRole === 'sekretaris'
  const isAssigned = Boolean(currentUserId && shift.assigned_user_id === currentUserId)
  const isCreator = Boolean(currentUserId && shift.created_by === currentUserId)
  const canUpload = isLeaderOrAdmin || isAssigned || isCreator

  const existingDocs = shift.documentations ?? []

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validNewFiles: StagedFile[] = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`Berkas "${file.name}" melebihi batas 5 MB.`)
        continue
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        setUploadError(`Format "${file.name}" tidak didukung. Harap gunakan JPEG, JPG, PNG, atau WebP.`)
        continue
      }

      validNewFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      })
    }

    setStagedFiles((prev) => [...prev, ...validNewFiles])
    e.target.value = ''
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  const updateStagedCaption = (id: string, caption: string) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, caption } : f))
    )
  }

  const handleUploadAll = async () => {
    if (stagedFiles.length === 0) return
    setIsUploading(true)
    setUploadError(null)
    setUploadProgress({ current: 0, total: stagedFiles.length })

    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        const item = stagedFiles[i]
        setUploadProgress({ current: i + 1, total: stagedFiles.length })
        await uploadDutyShiftPhoto({
          dutyShiftId: shift.id,
          file: item.file,
          caption: item.caption,
        })
        URL.revokeObjectURL(item.previewUrl)
      }

      setStagedFiles([])
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'duty-shifts'] })

      toast({
        title: 'Foto Dokumentasi Disimpan',
        description: `Berhasil mengunggah ${stagedFiles.length} foto dokumentasi piket.`,
        variant: 'success',
      })
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah foto dokumentasi.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const canDeleteDoc = (doc: DutyShiftDocumentation) => {
    return isLeaderOrAdmin || (currentUserId && doc.uploaded_by === currentUserId)
  }

  const handleDownload = async (fileId: string, _filename?: string) => {
    try {
      const res = await getPrivateFileSignedUrl(fileId, true)
      if (res?.signedUrl) {
        window.open(res.signedUrl, '_blank')
      }
    } catch (err: any) {
      toast({
        title: 'Gagal Mengunduh Foto',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Dokumentasi Piket Posko"
        description={`Sesi piket ${shift.shift_date} (${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)})`}
        maxWidthClass="max-w-3xl"
        scrollableContent={false}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            {/* Upload Area for Authorized Users */}
            {canUpload ? (
              <div className="space-y-3 rounded-xl border border-dashed border-warm-300 bg-warm-50/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-forest" />
                      <span>Unggah Foto Dokumentasi</span>
                    </h4>
                    <p className="text-[11px] text-charcoal-muted mt-0.5">
                      Foto bukti kebersihan posko, kondisi sarana, atau penerimaan tamu (JPEG, PNG, WebP maks. 5 MB).
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-forest/90 self-start sm:self-auto">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Pilih Foto</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFilesSelected}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadError && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Staged photos preview */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-warm-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-charcoal">
                        {stagedFiles.length} foto siap diunggah:
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUploading}
                        onClick={handleUploadAll}
                        className="h-8 px-3 text-xs bg-forest hover:bg-forest/90 text-white font-semibold gap-1.5 shadow-xs"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>
                              Mengunggah {uploadProgress?.current}/{uploadProgress?.total}...
                            </span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-3.5 w-3.5" />
                            <span>Simpan {stagedFiles.length} Foto</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stagedFiles.map((sf) => (
                        <div
                          key={sf.id}
                          className="flex items-start gap-3 rounded-lg border border-warm-200 bg-white p-2.5 shadow-2xs"
                        >
                          <img
                            src={sf.previewUrl}
                            alt="Pratinjau"
                            className="h-16 w-16 rounded-md object-cover shrink-0 border border-warm-200"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-medium text-charcoal truncate">
                                {sf.file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeStagedFile(sf.id)}
                                disabled={isUploading}
                                className="text-charcoal-muted hover:text-red-600 p-0.5"
                                title="Batal unggah foto ini"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-charcoal-muted block">
                              {formatBytes(sf.file.size)}
                            </span>
                            <Input
                              value={sf.caption}
                              onChange={(e) => updateStagedCaption(sf.id, e.target.value)}
                              placeholder="Keterangan foto (opsional)..."
                              className="h-7 text-[11px]"
                              disabled={isUploading}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Saved Photos Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-forest" />
                  <span>Foto Tersimpan ({existingDocs.length})</span>
                </h4>
              </div>

              {existingDocs.length === 0 ? (
                <div className="rounded-xl border border-warm-200 bg-warm-50/50 p-8 text-center space-y-2">
                  <ImageIcon className="h-8 w-8 text-warm-400 mx-auto opacity-50" />
                  <p className="text-xs font-medium text-charcoal">
                    Belum ada foto dokumentasi untuk sesi piket ini
                  </p>
                  <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto">
                    {canUpload
                      ? 'Gunakan form di atas untuk mengunggah bukti kebersihan atau aktivitas posko selama jadwal piket.'
                      : 'Anggota yang bertugas atau Ketua/Sekretaris dapat mengunggah dokumentasi piket.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {existingDocs.map((doc) => {
                    const uploader = membersMap.get(doc.uploaded_by)
                    const canDelete = canDeleteDoc(doc)

                    return (
                      <div
                        key={doc.id}
                        className="group flex flex-col rounded-lg border border-warm-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="relative aspect-4/3 w-full bg-warm-100">
                          <DutyPhotoThumb
                            fileId={doc.file_id}
                            alt={doc.caption || 'Dokumentasi piket'}
                            onClick={() => setLightboxPhoto(doc)}
                          />
                        </div>

                        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                          <p className="text-xs font-medium text-charcoal line-clamp-2">
                            {doc.caption || 'Tanpa keterangan'}
                          </p>

                          <div className="pt-1 border-t border-warm-100 flex items-center justify-between text-[10px] text-charcoal-muted">
                            <span className="truncate flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" />
                              <strong className="text-charcoal font-medium">
                                {uploader?.full_name || 'Anggota'}
                              </strong>
                            </span>
                            <span className="shrink-0 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(doc.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setLightboxPhoto(doc)}
                              className="h-6 px-2 text-[10px] text-forest gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Lihat</span>
                            </Button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownload(
                                    doc.file_id,
                                    doc.file_object?.original_name || 'piket.jpg'
                                  )
                                }
                                className="p-1 text-charcoal-muted hover:text-charcoal transition-colors"
                                title="Unduh foto"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => deletePhotoMutation.mutate(doc.id)}
                                  disabled={deletePhotoMutation.isPending}
                                  className="p-1 text-charcoal-muted hover:text-red-600 transition-colors"
                                  title="Hapus foto ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Modal Footer */}
          <div className="flex shrink-0 items-center justify-end border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium text-charcoal"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <Modal
          open={Boolean(lightboxPhoto)}
          onClose={() => setLightboxPhoto(null)}
          title={lightboxPhoto.caption || 'Foto Dokumentasi Piket Posko'}
          maxWidthClass="max-w-2xl"
          scrollableContent={false}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
              <div className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                {lightboxUrl?.signedUrl ? (
                  <img
                    src={lightboxUrl.signedUrl}
                    alt={lightboxPhoto.caption || 'Pratinjau'}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                )}
              </div>

              {lightboxPhoto.caption && (
                <p className="text-xs text-charcoal bg-warm-50 p-2.5 rounded-lg border border-warm-200">
                  {lightboxPhoto.caption}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-charcoal-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-forest" />
                  Diunggah oleh:{' '}
                  <strong className="text-charcoal">
                    {membersMap.get(lightboxPhoto.uploaded_by)?.full_name || 'Anggota Posko'}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-forest" />
                  {new Date(lightboxPhoto.created_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleDownload(
                    lightboxPhoto.file_id,
                    lightboxPhoto.file_object?.original_name || 'piket.jpg'
                  )
                }
                className="h-8 px-3 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Foto</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLightboxPhoto(null)}
                className="h-8 px-3.5 text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

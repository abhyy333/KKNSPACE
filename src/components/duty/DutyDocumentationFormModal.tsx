import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatBytes, getPrivateFileSignedUrl } from '@/services/storageApi'
import {
  createDutyDocumentation,
  updateDutyDocumentation,
  deleteDutyShiftPhoto,
  uploadDutyShiftPhoto,
} from '@/services/agendaApi'
import type { DutyShift, DutyShiftDocumentation } from '@/types/database'
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react'

interface StagedFile {
  id: string
  file: File
  previewUrl: string
}

interface DutyDocumentationFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  shift?: DutyShift | null
  currentUserId?: string
}

export const DutyDocumentationFormModal: React.FC<DutyDocumentationFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  shift,
}) => {
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [existingPhotos, setExistingPhotos] = useState<DutyShiftDocumentation[]>([])
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEditing = Boolean(shift)

  // Initialize or reset form
  useEffect(() => {
    if (!open) {
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      setStagedFiles([])
      setErrorMessage(null)
      setPhotosToDelete([])
      return
    }

    if (shift) {
      setTitle(shift.title || shift.notes || '')
      setNotes(shift.notes || '')
      setExistingPhotos(shift.documentations || [])
    } else {
      setTitle('')
      setNotes('')
      setExistingPhotos([])
    }
    setStagedFiles([])
    setPhotosToDelete([])
    setErrorMessage(null)
  }, [open, shift])

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp']
    const maxBytes = 5 * 1024 * 1024 // 5 MB

    const validNewStaged: StagedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      if (!allowedMime.includes(file.type)) {
        errors.push(`"${file.name}" bukan format gambar yang didukung (JPEG, PNG, WebP).`)
        continue
      }
      if (file.size > maxBytes) {
        errors.push(`"${file.name}" melebihi batas ukuran maksimal 5 MB (${formatBytes(file.size)}).`)
        continue
      }
      if (file.size <= 0) {
        errors.push(`"${file.name}" berkas kosong.`)
        continue
      }

      validNewStaged.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    if (errors.length > 0) {
      setErrorMessage(errors[0])
    }

    if (validNewStaged.length > 0) {
      setStagedFiles((prev) => [...prev, ...validNewStaged])
    }

    e.target.value = ''
  }

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleMarkPhotoForDelete = (photoId: string) => {
    setPhotosToDelete((prev) => [...prev, photoId])
  }

  const handleUndoDeletePhoto = (photoId: string) => {
    setPhotosToDelete((prev) => prev.filter((id) => id !== photoId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Judul piket wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && shift) {
        // 1. Delete marked photos
        if (photosToDelete.length > 0) {
          for (const photoId of photosToDelete) {
            await deleteDutyShiftPhoto(photoId)
          }
        }

        // 2. Upload new photos if any
        if (stagedFiles.length > 0) {
          setUploadProgress({ current: 0, total: stagedFiles.length })
          for (let i = 0; i < stagedFiles.length; i++) {
            setUploadProgress({ current: i + 1, total: stagedFiles.length })
            await uploadDutyShiftPhoto({
              dutyShiftId: shift.id,
              file: stagedFiles[i].file,
            })
          }
        }

        // 3. Update title & notes
        await updateDutyDocumentation(shift.id, {
          title: trimmedTitle,
          notes: notes.trim() || undefined,
        })

        toast({
          title: 'Dokumentasi Diperbarui',
          description: 'Perubahan dokumentasi piket posko berhasil disimpan.',
          variant: 'success',
        })
      } else {
        // Create new documentation with staged files
        if (stagedFiles.length > 0) {
          setUploadProgress({ current: 0, total: stagedFiles.length })
        }

        await createDutyDocumentation({
          title: trimmedTitle,
          notes: notes.trim() || undefined,
          files: stagedFiles.map((s) => s.file),
        })

        toast({
          title: 'Dokumentasi Disimpan',
          description: 'Dokumentasi piket posko berhasil ditambahkan.',
          variant: 'success',
        })
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan dokumentasi piket.'
      setErrorMessage(msg)
      toast({
        title: 'Gagal Menyimpan Dokumentasi',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title={isEditing ? 'Edit Dokumentasi Piket' : 'Tambah Dokumentasi Piket'}
      description="Unggah dokumentasi kegiatan dan kondisi posko secara visual dan sederhana."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-charcoal">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* 1. Judul Piket */}
        <div className="space-y-1.5">
          <label htmlFor="piket-title" className="font-semibold text-charcoal block">
            Judul Piket <span className="text-rose-500">*</span>
          </label>
          <Input
            id="piket-title"
            placeholder="Merapikan dan Membersihkan Posko"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
            className="text-xs bg-warm-50/50 border-warm-300 focus-visible:ring-forest"
          />
        </div>

        {/* 2. Upload Foto */}
        <div className="space-y-2">
          <label className="font-semibold text-charcoal block">
            Upload Foto
          </label>

          {/* Existing Photos when editing */}
          {isEditing && existingPhotos.length > 0 && (
            <div className="space-y-1.5 pb-2">
              <p className="text-[11px] font-medium text-charcoal-muted">
                Foto Tersimpan ({existingPhotos.length - photosToDelete.length}):
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {existingPhotos.map((photo) => {
                  const isDeleted = photosToDelete.includes(photo.id)
                  return (
                    <ExistingPhotoThumb
                      key={photo.id}
                      photo={photo}
                      isMarkedDelete={isDeleted}
                      onDelete={() => handleMarkPhotoForDelete(photo.id)}
                      onUndo={() => handleUndoDeletePhoto(photo.id)}
                      disabled={isSubmitting}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Dropzone Upload */}
          <div className="relative border-2 border-dashed border-warm-300 hover:border-forest/50 bg-warm-50/50 hover:bg-warm-100/50 rounded-xl p-4 transition-colors text-center">
            <input
              type="file"
              id="duty-file-upload"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFilesSelected}
              disabled={isSubmitting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-forest/10 text-forest flex items-center justify-center">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-charcoal">
                Pilih Foto Kegiatan Posko
              </p>
              <p className="text-[11px] text-charcoal-muted max-w-xs">
                Format didukung: JPEG, PNG, WebP (Maks. 5 MB per foto). Dapat memilih beberapa foto sekaligus.
              </p>
            </div>
          </div>

          {/* Staged Photos Preview Grid */}
          {stagedFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-charcoal-muted">
                <span>Foto Baru Terpilih ({stagedFiles.length}):</span>
                <button
                  type="button"
                  onClick={() => {
                    stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
                    setStagedFiles([])
                  }}
                  disabled={isSubmitting}
                  className="text-rose-600 hover:underline text-[10px]"
                >
                  Hapus Semua
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {stagedFiles.map((staged) => (
                  <div
                    key={staged.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-warm-300 bg-charcoal/5 shadow-2xs"
                  >
                    <img
                      src={staged.previewUrl}
                      alt={staged.file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFile(staged.id)}
                        disabled={isSubmitting}
                        className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                        title="Hapus foto ini"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-charcoal/70 text-white leading-none">
                      {formatBytes(staged.file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Indicator */}
          {uploadProgress && (
            <div className="p-3 rounded-lg bg-forest/5 border border-forest/20 text-forest text-xs flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>
                Mengunggah foto kegiatan piket ({uploadProgress.current} dari {uploadProgress.total})...
              </span>
            </div>
          )}
        </div>

        {/* 3. Keterangan */}
        <div className="space-y-1.5">
          <label htmlFor="piket-notes" className="font-semibold text-charcoal block">
            Keterangan
          </label>
          <textarea
            id="piket-notes"
            rows={3}
            placeholder="Ceritakan kegiatan atau kondisi posko selama piket..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-md border border-warm-300 bg-warm-50/50 p-2.5 text-xs text-charcoal placeholder:text-charcoal-muted/70 focus:outline-none focus:ring-1 focus:ring-forest resize-none leading-relaxed"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !title.trim()}
            className="text-xs bg-forest hover:bg-forest-dark text-white gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Dokumentasi'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Thumbnail for existing photo when editing
 */
const ExistingPhotoThumb: React.FC<{
  photo: DutyShiftDocumentation
  isMarkedDelete: boolean
  onDelete: () => void
  onUndo: () => void
  disabled?: boolean
}> = ({ photo, isMarkedDelete, onDelete, onUndo, disabled }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['signed-url', photo.file_id, false],
    queryFn: () => getPrivateFileSignedUrl(photo.file_id, false),
    staleTime: 300_000,
  })

  if (isLoading || !data?.signedUrl) {
    return (
      <div className="aspect-square rounded-lg bg-warm-200 animate-pulse flex items-center justify-center">
        <ImageIcon className="h-4 w-4 text-warm-400" />
      </div>
    )
  }

  return (
    <div className={`relative aspect-square rounded-lg overflow-hidden border ${isMarkedDelete ? 'border-rose-400 opacity-40' : 'border-warm-300'}`}>
      <img
        src={data.signedUrl}
        alt="Foto tersimpan"
        className="w-full h-full object-cover"
      />
      {isMarkedDelete ? (
        <div className="absolute inset-0 bg-rose-950/60 flex flex-col items-center justify-center p-1 text-center">
          <span className="text-[9px] text-white font-medium mb-1">Akan dihapus</span>
          <button
            type="button"
            onClick={onUndo}
            disabled={disabled}
            className="px-1.5 py-0.5 rounded bg-white text-rose-700 text-[9px] font-bold"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors shadow-xs"
          title="Tandai untuk dihapus"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

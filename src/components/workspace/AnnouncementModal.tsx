import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  announcementFormSchema,
  type AnnouncementFormInput,
} from '@/services/dashboardApi'
import type { Announcement } from '@/types/database'
import { AlertCircle, Loader2, Megaphone } from 'lucide-react'

interface AnnouncementModalProps {
  open: boolean
  onClose: () => void
  onSubmitForm: (values: AnnouncementFormInput) => Promise<void>
  initialData?: Announcement | null
  isSubmitting?: boolean
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  open,
  onClose,
  onSubmitForm,
  initialData = null,
  isSubmitting = false,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isEditing = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnnouncementFormInput>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      content: initialData?.content ?? '',
      status: initialData?.status ?? 'published',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: initialData?.title ?? '',
        content: initialData?.content ?? '',
        status: initialData?.status ?? 'published',
      })
    }
  }, [open, initialData, reset])

  const handleClose = () => {
    setSubmitError(null)
    onClose()
  }

  const handleFormSubmit = async (values: AnnouncementFormInput) => {
    setSubmitError(null)
    try {
      await onSubmitForm(values)
      handleClose()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan pengumuman.'
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Pengumuman' : 'Buat Pengumuman Posko'}
      description="Sampaikan pengingat kegiatan, arahan DPL, atau informasi resmi untuk seluruh anggota posko."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="announcement-title"
            className="text-xs font-medium text-charcoal block"
          >
            Judul Pengumuman <span className="text-red-500">*</span>
          </label>
          <Input
            id="announcement-title"
            placeholder="Misal: Jadwal Kunjungan DPL & Evaluasi Minggu Ini"
            disabled={isSubmitting}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-[11px] text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="announcement-content"
            className="text-xs font-medium text-charcoal block"
          >
            Isi Pesan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="announcement-content"
            rows={4}
            placeholder="Tuliskan rincian informasi, waktu pelaksanaan, atau hal yang perlu disiapkan tim..."
            disabled={isSubmitting}
            className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('content')}
          />
          {errors.content && (
            <p className="text-[11px] text-red-600">{errors.content.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="announcement-status"
            className="text-xs font-medium text-charcoal block"
          >
            Status Publikasi
          </label>
          <select
            id="announcement-status"
            disabled={isSubmitting}
            className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('status')}
          >
            <option value="published">Publikasikan Langsung (Tampil di Dashboard &amp; Notifikasi)</option>
            <option value="draft">Simpan sebagai Draf</option>
            {isEditing && <option value="archived">Arsipkan</option>}
          </select>
          {errors.status && (
            <p className="text-[11px] text-red-600">{errors.status.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Megaphone className="h-3.5 w-3.5" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Pengumuman'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

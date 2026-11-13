import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { adminApi } from '@/services/adminApi'
import { ManualInviteLinkPanel } from '@/components/admin/ManualInviteLinkPanel'
import type { KknRole } from '@/types/database'
import { AlertCircle, Loader2, Mail, User, Shield, FileText, Send } from 'lucide-react'

const ROLE_OPTIONS: { value: KknRole; label: string; desc: string }[] = [
  { value: 'ketua', label: 'Ketua KKN', desc: 'Mengelola program kerja & publikasi konten' },
  { value: 'sekretaris', label: 'Sekretaris', desc: 'Mengelola administrasi, rapat & draf laporan' },
  { value: 'bendahara', label: 'Bendahara', desc: 'Mengelola keuangan & inventaris posko' },
  { value: 'anggota', label: 'Anggota', desc: 'Mengelola tugas pribadi, agenda & dokumentasi' },
  { value: 'dpl', label: 'DPL (Dosen Pembimbing)', desc: 'Memantau kegiatan & evaluasi tim' },
]

const inviteSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  email: z
    .string()
    .trim()
    .min(1, 'Alamat email wajib diisi')
    .email('Format alamat email tidak valid')
    .transform((v) => v.toLowerCase()),
  role: z.enum(['ketua', 'sekretaris', 'bendahara', 'anggota', 'dpl'], {
    message: 'Pilih salah satu role KKN yang valid',
  }),
  division: z.string().max(60, 'Nama divisi maksimal 60 karakter').optional(),
  note: z.string().max(300, 'Catatan maksimal 300 karakter').optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteUserDialogProps {
  open: boolean
  onClose: () => void
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const [manualFallback, setManualFallback] = useState<{
    email: string
    inviteLink: string
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'anggota',
      division: '',
      note: '',
    },
  })

  const handleClose = () => {
    if (isSubmitting) return
    setServerError(null)
    setManualFallback(null)
    reset()
    onClose()
  }

  const onSubmit = async (data: InviteFormData) => {
    setServerError(null)

    try {
      const normalizedEmail = data.email.toLowerCase()
      const result = await adminApi.inviteUser({
        full_name: data.full_name,
        email: normalizedEmail,
        role: data.role,
        division: data.division?.trim() || undefined,
        note: data.note || undefined,
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview-direct'] }),
      ])
      reset()

      if (result.delivery_method === 'manual_link' && result.invite_link) {
        toast({
          variant: 'success',
          title: 'Undangan Dibuat (Tautan Manual)',
          description: 'SMTP menolak pengiriman email; salin tautan aktivasi pada dialog.',
        })
        setManualFallback({
          email: normalizedEmail,
          inviteLink: result.invite_link,
          message: result.message,
        })
        return
      }

      toast({
        variant: 'success',
        title: 'Undangan Terkirim',
        description: result.message,
      })

      onClose()
    } catch (err: any) {
      const message = err?.message || 'Gagal mengirimkan undangan. Periksa koneksi dan status Edge Function.'
      setServerError(message)
      toast({
        variant: 'error',
        title: 'Gagal Mengirim Undangan',
        description: message,
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={manualFallback ? 'Salin Tautan Undangan Anggota' : 'Undang Anggota KKN Baru'}
      description={
        manualFallback
          ? 'Bagikan tautan aktivasi ini langsung ke calon anggota KKN.'
          : 'Kirim undangan resmi via Supabase Auth dan tetapkan peran awal keanggotaan posko.'
      }
    >
      {manualFallback ? (
        <ManualInviteLinkPanel
          email={manualFallback.email}
          inviteLink={manualFallback.inviteLink}
          message={manualFallback.message}
          onDone={handleClose}
        />
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{serverError}</div>
          </div>
        )}

        {/* Nama Lengkap */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-sage-600" />
            <span>Nama Lengkap</span>
            <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Contoh: Siti Rahmawati"
            disabled={isSubmitting}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-[11px] text-red-600 font-medium">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-sage-600" />
            <span>Alamat Email Aktif</span>
            <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            placeholder="anggota@email.com"
            disabled={isSubmitting}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-[11px] text-red-600 font-medium">{errors.email.message}</p>
          )}
          <p className="text-[10px] text-charcoal-muted">
            Email otomatis dinormalisasi menjadi huruf kecil. Tautan berlaku selama 7 hari.
          </p>
        </div>

        {/* Role Awal */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sage-600" />
            <span>Peran (Role) KKN Awal</span>
            <span className="text-red-500">*</span>
          </label>
          <select
            disabled={isSubmitting}
            {...register('role')}
            className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs shadow-subtle transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="text-[11px] text-red-600 font-medium">{errors.role.message}</p>
          )}
        </div>

        {/* Divisi Operasional */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal block">
            Divisi Operasional <span className="text-charcoal-muted font-normal">(opsional)</span>
          </label>
          <Input
            type="text"
            placeholder="Misal: Acara, Humas, Logistik, Dokumentasi"
            disabled={isSubmitting}
            {...register('division')}
          />
          {errors.division && (
            <p className="text-[11px] text-red-600 font-medium">{errors.division.message}</p>
          )}
        </div>

        {/* Catatan Internal */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-sage-600" />
            <span>Catatan Internal (Opsional)</span>
          </label>
          <Input
            type="text"
            placeholder="Misal: Koordinator Divisi Pendidikan / NIM"
            disabled={isSubmitting}
            {...register('note')}
          />
          {errors.note && (
            <p className="text-[11px] text-red-600 font-medium">{errors.note.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="sm"
            className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Mengirim Undangan...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Kirim Undangan</span>
              </>
            )}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  )
}

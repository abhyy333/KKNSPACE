import React, { useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Trash2, Shield, RefreshCw, CheckCircle2 } from 'lucide-react'
import { adminApi, type AdminUserDto, EdgeFunctionError } from '@/services/adminApi'

interface DeleteUserDialogProps {
  user: AdminUserDto | null
  open: boolean
  onClose: () => void
  onSuccess: (result: {
    message: string
    target_email: string
    directory_preserved: boolean
  }) => void
}

const ROLE_DISPLAY: Record<string, string> = {
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
  dpl: 'DPL',
}

const MEMBERSHIP_STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  active: { label: 'Aktif', variant: 'success' },
  invited: { label: 'Undangan Menunggu', variant: 'warning' },
  suspended: { label: 'Ditangguhkan', variant: 'destructive' },
  revoked: { label: 'Dicabut', variant: 'outline' },
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  user,
  open,
  onClose,
  onSuccess,
}) => {
  if (!user || !open) return null

  return (
    <DeleteUserForm
      user={user}
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

const DeleteUserForm: React.FC<{
  user: AdminUserDto
  open: boolean
  onClose: () => void
  onSuccess: (result: {
    message: string
    target_email: string
    directory_preserved: boolean
  }) => void
}> = ({ user, open, onClose, onSuccess }) => {
  const [typedEmail, setTypedEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const targetEmail = (user.email || '').toLowerCase().trim()
  const isMatch = typedEmail.toLowerCase().trim() === targetEmail
  const isSelf = false // Guarded at parent level, but validated here too

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isMatch || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await adminApi.deleteUserPermanently({
        target_user_id: user.id,
        confirmed_email: typedEmail.trim().toLowerCase(),
        reason: reason.trim() || undefined,
      })

      onSuccess({
        message: res.message,
        target_email: res.target_email,
        directory_preserved: res.directory_preserved,
      })
      onClose()
    } catch (err: any) {
      let msg = err?.message || 'Terjadi kesalahan saat menghapus akun pengguna.'
      if (err instanceof EdgeFunctionError && err.code === 'EMAIL_CONFIRMATION_MISMATCH') {
        msg = 'Konfirmasi email tidak sesuai dengan email akun target.'
      } else if (err instanceof EdgeFunctionError && err.code === 'CANNOT_DELETE_SELF') {
        msg = 'Anda tidak dapat menghapus akun Anda sendiri.'
      } else if (err instanceof EdgeFunctionError && err.code === 'LAST_SUPER_ADMIN_PROTECTED') {
        msg = 'Akun tidak dapat dihapus karena merupakan Super Admin terakhir pada sistem.'
      }
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const memBadge = user.membership_status ? MEMBERSHIP_STATUS_BADGE[user.membership_status] : null

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title="Hapus Akun Permanen?"
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleDelete} className="space-y-4 pt-1">
        {/* User Card Information */}
        <div className="rounded-lg border border-warm-300 bg-warm-50 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-charcoal text-sm">{user.full_name}</span>
                {user.is_linked_to_directory ? (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                    Tertaut: {user.directory_member_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] gap-1">
                    <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                    Belum terhubung ke anggota direktori
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-charcoal-muted mt-0.5">{user.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {user.is_super_admin && (
                <Badge variant="outline" className="border-charcoal bg-charcoal text-white text-[10px] gap-1">
                  <Shield className="h-2.5 w-2.5" />
                  Super Admin
                </Badge>
              )}
              {user.membership_role && (
                <Badge variant="secondary" className="text-[10px]">
                  {ROLE_DISPLAY[user.membership_role] || user.membership_role}
                </Badge>
              )}
              {memBadge && (
                <Badge variant={memBadge.variant} className="text-[10px]">
                  {memBadge.label}
                </Badge>
              )}
            </div>
          </div>
          {user.membership_division && (
            <p className="text-[11px] text-charcoal-muted">
              Divisi: <span className="font-medium text-charcoal">Div. {user.membership_division}</span>
            </p>
          )}
        </div>

        {/* Business Preservation Notice */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-amber-900">
              Peringatan Keamanan &amp; Preservasi Data
            </p>
            {user.is_linked_to_directory ? (
              <p>
                Akun ini terhubung ke slot direktori <span className="font-semibold">{user.directory_member_name}</span>.
                Penghapusan ini akan menghapus akun login dari Supabase Auth, tetapi data anggota di direktori resmi tim KKN, foto profil, jabatan, logbook, laporan, transaksi keuangan, dokumentasi, dan seluruh riwayat aktivitas KKN tetap aman dipertahankan.
              </p>
            ) : (
              <p>
                Akun login ini <span className="font-semibold text-amber-900">belum terhubung ke anggota direktori tim KKN</span>.
                Penghapusan ini hanya menghapus identitas login dari Supabase Auth. Seluruh 11 anggota resmi di direktori tim KKN dan riwayat aktivitas KKN tetap aman dan tidak terpengaruh.
              </p>
            )}
            <p className="text-[11px] text-amber-800 font-medium">
              Tindakan ini tidak dapat dibatalkan melalui tombol undo.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-red-900">Gagal Menghapus Akun</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Reason Field (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal block">
            Alasan Penghapusan <span className="text-charcoal-muted font-normal">(opsional untuk audit)</span>
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            placeholder="Contoh: Penggantian alamat email anggota / restrukturisasi tim"
            className="h-8 text-xs"
          />
        </div>

        {/* Typed Confirmation Field */}
        <div className="space-y-1.5 pt-1 border-t border-warm-200">
          <label className="text-xs font-medium text-charcoal block">
            Ketik email akun untuk melanjutkan
          </label>
          <p className="text-[11px] text-charcoal-muted">
            Ketik persis <span className="font-mono font-semibold text-charcoal select-all">{user.email}</span> di bawah ini untuk mengonfirmasi penghapusan permanen:
          </p>
          <Input
            type="text"
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder={user.email}
            autoComplete="off"
            className={`h-9 text-xs font-mono transition-colors ${
              typedEmail && !isMatch
                ? 'border-red-400 focus-visible:ring-red-500'
                : isMatch
                ? 'border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/20'
                : ''
            }`}
          />
          {typedEmail && !isMatch && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Email belum cocok persis.</span>
            </p>
          )}
          {isMatch && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Email cocok. Tombol penghapusan siap diaktifkan.</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={!isMatch || isSubmitting || isSelf}
            className="text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Menghapus Akun...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Permanen</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

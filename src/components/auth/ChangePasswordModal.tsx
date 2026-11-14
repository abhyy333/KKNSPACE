import React, { useState } from 'react'
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
  userEmail?: string | null
  provider?: string
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
  userEmail,
  provider = 'email',
}) => {
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Password supports check
  const isPasswordSupported = !provider || provider === 'email'

  // Real-time validation flags
  const hasMinLength = newPassword.length >= MIN_PASSWORD_LENGTH
  const isDifferent = Boolean(
    newPassword && currentPassword && newPassword !== currentPassword
  )
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword)

  const handleResetAndClose = () => {
    if (isLoading) return
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setError(null)
    setSuccessNotice(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessNotice(null)

    // Pre-flight client validations
    if (!currentPassword) {
      setError('Password saat ini wajib diisi.')
      return
    }
    if (!newPassword) {
      setError('Password baru wajib diisi.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`)
      return
    }
    if (newPassword === currentPassword) {
      setError('Password baru tidak boleh sama dengan password saat ini.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.')
      return
    }

    setIsLoading(true)

    try {
      // 1. Ensure user has active authentication session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session || !session.user) {
        throw new Error('Sesi autentikasi telah berakhir. Silakan login kembali ke Workspace.')
      }

      const email = userEmail || session.user.email
      if (!email) {
        throw new Error('Alamat email pengguna tidak ditemukan pada sesi saat ini.')
      }

      // 2. Safe Re-authentication to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        const msg = signInError.message?.toLowerCase() || ''
        if (
          msg.includes('invalid login credentials') ||
          msg.includes('invalid_grant') ||
          signInError.status === 400
        ) {
          throw new Error('Password saat ini tidak benar. Silakan periksa kembali.')
        }
        if (signInError.status === 429) {
          throw new Error('Terlalu banyak percobaan. Harap tunggu beberapa saat sebelum mencoba kembali.')
        }
        throw new Error('Gagal memverifikasi password saat ini. Silakan coba kembali.')
      }

      // 3. Update password via Supabase Auth updateUser
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        const msg = updateError.message?.toLowerCase() || ''
        if (msg.includes('same password') || msg.includes('should be different')) {
          throw new Error('Password baru tidak boleh sama dengan password saat ini.')
        }
        if (msg.includes('weak') || msg.includes('at least')) {
          throw new Error(`Password baru tidak memenuhi persyaratan keamanan (minimal ${MIN_PASSWORD_LENGTH} karakter).`)
        }
        throw new Error(updateError.message || 'Gagal memperbarui password akun.')
      }

      // 4. Success state & notification
      const successMsg =
        'Password berhasil diperbarui. Gunakan password baru saat login berikutnya.'
      setSuccessNotice(successMsg)

      toast({
        title: 'Password Berhasil Diperbarui',
        description: 'Gunakan password baru saat login berikutnya.',
        variant: 'success',
      })

      // Clean close after brief feedback
      setTimeout(() => {
        handleResetAndClose()
      }, 1600)
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat memperbarui password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleResetAndClose}
      title="Ganti Password Akun"
      description="Ubah password akun KKN SPACE Anda untuk memastikan keamanan akses posko."
      maxWidthClass="max-w-md"
    >
      {!isPasswordSupported ? (
        <div className="p-4 rounded-xl bg-warm-100 border border-warm-300 text-xs text-charcoal-muted leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-charcoal">
            <ShieldCheck className="h-4 w-4 text-sage-700" />
            <span>Penyedia Autentikasi Eksternal</span>
          </div>
          <p>
            Akun Anda saat ini menggunakan metode autentikasi penyedia eksternal ({provider}). Pengaturan password hanya berlaku untuk akun dengan metode email dan password posko KKN SPACE.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {successNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed font-medium">{successNotice}</div>
            </div>
          )}

          {/* 1. Password Saat Ini */}
          <div className="space-y-1.5">
            <label
              htmlFor="field-current-password"
              className="text-xs font-medium text-charcoal flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5 text-sage-700" />
              <span>
                Password Saat Ini <span className="text-red-600">*</span>
              </span>
            </label>
            <div className="relative">
              <Input
                id="field-current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Masukkan password saat ini"
                disabled={isLoading || Boolean(successNotice)}
                autoComplete="current-password"
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                aria-label={showCurrent ? 'Sembunyikan password saat ini' : 'Tampilkan password saat ini'}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* 2. Password Baru */}
          <div className="space-y-1.5">
            <label
              htmlFor="field-new-password"
              className="text-xs font-medium text-charcoal flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-sage-700" />
              <span>
                Password Baru <span className="text-red-600">*</span>
              </span>
            </label>
            <div className="relative">
              <Input
                id="field-new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Minimal 8 karakter unik"
                disabled={isLoading || Boolean(successNotice)}
                autoComplete="new-password"
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                aria-label={showNew ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* 3. Konfirmasi Password Baru */}
          <div className="space-y-1.5">
            <label
              htmlFor="field-confirm-password"
              className="text-xs font-medium text-charcoal flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-sage-700" />
              <span>
                Konfirmasi Password Baru <span className="text-red-600">*</span>
              </span>
            </label>
            <div className="relative">
              <Input
                id="field-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Ketik ulang password baru Anda"
                disabled={isLoading || Boolean(successNotice)}
                autoComplete="new-password"
                className="pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Real-time Checklist Feedback */}
          <div className="p-3 rounded-xl bg-warm-50 border border-warm-200 text-[11px] space-y-1.5">
            <div className="font-semibold text-charcoal text-[10px] uppercase tracking-wider mb-1">
              Ketentuan Keamanan Password:
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  hasMinLength
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-warm-200 text-charcoal-muted'
                }`}
              >
                {hasMinLength ? '✓' : '•'}
              </span>
              <span className={hasMinLength ? 'text-emerald-900 font-medium' : 'text-charcoal-muted'}>
                Minimal 8 karakter
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isDifferent
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-warm-200 text-charcoal-muted'
                }`}
              >
                {isDifferent ? '✓' : '•'}
              </span>
              <span className={isDifferent ? 'text-emerald-900 font-medium' : 'text-charcoal-muted'}>
                Berbeda dari password saat ini
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isMatch
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-warm-200 text-charcoal-muted'
                }`}
              >
                {isMatch ? '✓' : '•'}
              </span>
              <span className={isMatch ? 'text-emerald-900 font-medium' : 'text-charcoal-muted'}>
                Konfirmasi password cocok
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-warm-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || Boolean(successNotice)}
              onClick={handleResetAndClose}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || Boolean(successNotice)}
              className="bg-sage-800 hover:bg-sage-900 text-white text-xs gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Simpan Password Baru</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

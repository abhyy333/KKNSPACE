import React, { useState } from 'react'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import {
  MIN_PASSWORD_LENGTH,
  validateChangePasswordForm,
} from '@/lib/passwordPolicy'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  userEmail?: string | null
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  userEmail,
}) => {
  const { toast } = useToast()

  // Form states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Show / Hide password toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [touched, setTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Real-time validation computation
  const validation = validateChangePasswordForm(
    currentPassword,
    newPassword,
    confirmPassword
  )

  // Real-time rules for visual checklist
  const ruleMinLength = newPassword.length >= MIN_PASSWORD_LENGTH
  const ruleDifferent =
    Boolean(newPassword) &&
    Boolean(currentPassword) &&
    newPassword !== currentPassword
  const ruleMatch =
    Boolean(newPassword) &&
    Boolean(confirmPassword) &&
    newPassword === confirmPassword

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setErrorMessage(null)
    setIsSuccess(false)
    setTouched({ current: false, new: false, confirm: false })
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ current: true, new: true, confirm: true })
    setErrorMessage(null)

    // Re-check validation
    if (!validation.isValid) {
      if (validation.errors.current) {
        setErrorMessage(validation.errors.current)
      } else if (validation.errors.new) {
        setErrorMessage(validation.errors.new)
      } else if (validation.errors.confirm) {
        setErrorMessage(validation.errors.confirm)
      }
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Verify active session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      const email = userEmail || user?.email
      if (userError || !user || !email) {
        throw new Error('Sesi autentikasi telah berakhir. Silakan login kembali.')
      }

      // 2. Re-authenticate / Verify current password securely via Supabase Auth
      const { data: signInData, error: verifyError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: currentPassword,
        })

      if (verifyError || !signInData.user) {
        if (verifyError?.status === 429) {
          throw new Error(
            'Terlalu banyak percobaan masuk. Harap tunggu beberapa saat demi keamanan akun Anda.'
          )
        }
        throw new Error('Password saat ini tidak benar.')
      }

      // 3. Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        if (
          updateError.message?.toLowerCase().includes('same') ||
          updateError.message?.toLowerCase().includes('different')
        ) {
          throw new Error('Password baru tidak boleh sama dengan password saat ini.')
        }
        if (updateError.status === 422) {
          throw new Error('Password baru tidak memenuhi standar keamanan server.')
        }
        throw new Error(
          'Gagal memperbarui password. Silakan periksa koneksi Anda dan coba kembali.'
        )
      }

      // 4. Success State
      setIsSuccess(true)
      toast({
        variant: 'success',
        title: 'Password Berhasil Diperbarui',
        description:
          'Password berhasil diperbarui. Gunakan password baru saat login berikutnya.',
      })
    } catch (err: any) {
      // Never expose raw passwords or stack traces
      const msg =
        err?.message ||
        'Terjadi kendala koneksi saat memperbarui password. Silakan coba lagi.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ganti Password"
      description="Kelola kata sandi akun KKN SPACE Anda secara aman."
      maxWidthClass="max-w-md"
    >
      {isSuccess ? (
        <div className="py-6 px-1 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-serif font-bold text-charcoal">
              Password Berhasil Diperbarui
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-sm mx-auto">
              Password berhasil diperbarui. Gunakan password baru saat login berikutnya.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleClose}
              className="w-full bg-sage-800 hover:bg-sage-900 text-white text-xs h-9 font-medium"
            >
              Selesai &amp; Tutup
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* 1. Current Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="current-password-input"
              className="text-xs font-medium text-charcoal flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-sage-700" />
                <span>Password Saat Ini</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <Input
                id="current-password-input"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setErrorMessage(null)
                }}
                onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                placeholder="Masukkan password saat ini"
                disabled={isSubmitting}
                className="pr-10 text-xs font-mono"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex={-1}
                aria-label={
                  showCurrentPassword
                    ? 'Sembunyikan password saat ini'
                    : 'Tampilkan password saat ini'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {touched.current && validation.errors.current && (
              <p className="text-[11px] text-red-600 font-medium">
                {validation.errors.current}
              </p>
            )}
          </div>

          {/* 2. New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-password-input"
              className="text-xs font-medium text-charcoal flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-sage-700" />
                <span>Password Baru</span>
                <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] text-charcoal-muted">
                Min. {MIN_PASSWORD_LENGTH} karakter
              </span>
            </label>
            <div className="relative">
              <Input
                id="new-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setErrorMessage(null)
                }}
                onBlur={() => setTouched((p) => ({ ...p, new: true }))}
                placeholder="Masukkan password baru minimal 8 karakter"
                disabled={isSubmitting}
                className="pr-10 text-xs font-mono"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
                aria-label={
                  showNewPassword
                    ? 'Sembunyikan password baru'
                    : 'Tampilkan password baru'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {touched.new && validation.errors.new && (
              <p className="text-[11px] text-red-600 font-medium">
                {validation.errors.new}
              </p>
            )}
          </div>

          {/* 3. Confirm New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password-input"
              className="text-xs font-medium text-charcoal flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sage-700" />
                <span>Konfirmasi Password Baru</span>
                <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <Input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrorMessage(null)
                }}
                onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                placeholder="Ketik ulang password baru Anda"
                disabled={isSubmitting}
                className="pr-10 text-xs font-mono"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={
                  showConfirmPassword
                    ? 'Sembunyikan konfirmasi password'
                    : 'Tampilkan konfirmasi password'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {touched.confirm && validation.errors.confirm && (
              <p className="text-[11px] text-red-600 font-medium">
                {validation.errors.confirm}
              </p>
            )}
          </div>

          {/* Live Security Checklist */}
          <div className="p-3 rounded-xl bg-warm-100/70 border border-warm-200 space-y-1.5 text-[11px]">
            <span className="text-charcoal-muted font-medium block">
              Ketentuan Keamanan Password:
            </span>
            <div className="grid grid-cols-1 gap-1">
              <div
                className={`flex items-center gap-2 transition-colors ${
                  ruleMinLength ? 'text-emerald-700 font-medium' : 'text-charcoal-muted'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    ruleMinLength
                      ? 'bg-emerald-600 text-white'
                      : 'border border-charcoal-muted/40'
                  }`}
                >
                  {ruleMinLength && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>Minimal 8 karakter</span>
              </div>

              <div
                className={`flex items-center gap-2 transition-colors ${
                  ruleDifferent ? 'text-emerald-700 font-medium' : 'text-charcoal-muted'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    ruleDifferent
                      ? 'bg-emerald-600 text-white'
                      : 'border border-charcoal-muted/40'
                  }`}
                >
                  {ruleDifferent && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>Berbeda dari password saat ini</span>
              </div>

              <div
                className={`flex items-center gap-2 transition-colors ${
                  ruleMatch ? 'text-emerald-700 font-medium' : 'text-charcoal-muted'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    ruleMatch
                      ? 'bg-emerald-600 text-white'
                      : 'border border-charcoal-muted/40'
                  }`}
                >
                  {ruleMatch && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>Konfirmasi password baru cocok</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-warm-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleClose}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !validation.isValid}
              className="bg-sage-800 hover:bg-sage-900 text-white text-xs gap-1.5 shadow-subtle min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Simpan Password</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

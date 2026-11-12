import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  UserCheck,
  User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adminApi, EdgeFunctionError } from '@/services/adminApi'
import { useAuth } from '@/hooks/useAuth'
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
  validatePasswordConfirmation,
} from '@/lib/passwordPolicy'

const ROLE_LABELS: Record<string, string> = {
  ketua: 'Ketua KKN',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota KKN',
  dpl: 'DPL (Dosen Pembimbing Lapangan)',
}

export const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate()
  const { refreshAccessContext } = useAuth()

  const [verifying, setVerifying] = useState(true)
  const [inviteInfo, setInviteInfo] = useState<{
    email: string
    role: string
    position_label?: string | null
    division?: string | null
    full_name?: string
    already_accepted: boolean
  } | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)

  // Form states
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const verifyInviteFlow = async () => {
      // 1. Check URL error fragments first
      const hash = window.location.hash
      const search = window.location.search
      if (hash.includes('error=') || search.includes('error=')) {
        const raw = hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, '')
        const params = new URLSearchParams(raw)
        const desc = params.get('error_description') || 'Tautan undangan tidak valid atau sudah kedaluwarsa.'
        if (isMounted) {
          setFatalError(desc.replace(/\+/g, ' '))
          setVerifying(false)
        }
        return
      }

      // 2. Wait briefly for Supabase SDK to process URL token/code if present
      let { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const retry = await supabase.auth.getSession()
        session = retry.data.session
      }

      if (!isMounted) return

      if (!session) {
        setFatalError(
          'Sesi undangan tidak ditemukan atau tautan sudah kedaluwarsa. Silakan klik tautan resmi dari email undangan Anda atau hubungi Super Admin.'
        )
        setVerifying(false)
        return
      }

      // 3. Verify invitation validity securely on backend Edge Function
      try {
        const verification = await adminApi.verifyInvitation()
        if (!isMounted) return

        setInviteInfo({
          email: verification.email,
          role: verification.role,
          position_label: verification.position_label,
          division: verification.division,
          full_name: verification.full_name,
          already_accepted: verification.already_accepted,
        })
        if (verification.full_name) {
          setFullName(verification.full_name)
        }
      } catch (err: any) {
        if (!isMounted) return
        if (err instanceof EdgeFunctionError && err.isNotDeployed) {
          setFatalError(
            'Layanan penerimaan undangan (admin-accept-invitation) belum terpasang di server Supabase.'
          )
        } else {
          setFatalError(err?.message || 'Undangan tidak valid, telah dicabut, atau sudah kedaluwarsa.')
        }
      } finally {
        if (isMounted) {
          setVerifying(false)
        }
      }
    }

    verifyInviteFlow()

    return () => {
      isMounted = false
    }
  }, [])

  const validateForm = (pwd: string, confirm: string): boolean => {
    const errs: string[] = []
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.push('Nama lengkap wajib diisi (minimal 2 karakter).')
    }
    errs.push(...validatePasswordConfirmation(pwd, confirm))
    setValidationErrors(errs)
    return errs.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm(password, confirmPassword)) return

    setIsSubmitting(true)

    try {
      // 1. Set user's new password in Supabase Auth
      const { error: pwdErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      })

      if (pwdErr) {
        setSubmitError(pwdErr.message || 'Gagal menyimpan kata sandi baru.')
        return
      }

      // 2. Finalize invitation acceptance on backend (sets membership active & records audit)
      await adminApi.acceptInvitation(fullName.trim())

      // 3. Refresh global AuthContext so WorkspaceGuard receives updated membership
      await refreshAccessContext()

      setIsSuccess(true)
      setTimeout(() => {
        navigate('/workspace', { replace: true })
      }, 2000)
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal menyelesaikan penerimaan undangan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-warm-300 rounded-xl p-8 shadow-card text-center space-y-4">
          <Loader2 className="h-8 w-8 text-sage-600 animate-spin mx-auto" />
          <h2 className="text-base font-semibold text-charcoal">
            Memverifikasi Undangan KKN SPACE...
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Memeriksa validitas tautan dan status keanggotaan Anda di server.
          </p>
        </div>
      </div>
    )
  }

  // Invalid / Expired / Revoked State
  if (fatalError) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted hover:text-charcoal transition-colors mx-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>

          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-serif">
                Undangan Tidak Dapat Diproses
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1 text-xs">
                {fatalError}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Silakan hubungi Super Admin kelompok KKN untuk mendapatkan pengiriman ulang undangan yang valid.
              </p>
              <Link to="/auth/login">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Ke Halaman Masuk
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Already accepted state
  if (inviteInfo?.already_accepted) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <UserCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-serif">
                Keanggotaan Sudah Aktif
              </CardTitle>
              <CardDescription className="pt-1 text-xs leading-relaxed">
                Undangan untuk <span className="font-mono text-charcoal">{inviteInfo.email}</span> sudah pernah diaktifkan sebelumnya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <Button
                onClick={async () => {
                  await refreshAccessContext()
                  navigate('/workspace', { replace: true })
                }}
                className="w-full text-xs"
              >
                Masuk ke Workspace KKN
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Activation Completed State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-serif">
                Akun & Keanggotaan Aktif!
              </CardTitle>
              <CardDescription className="pt-1 text-xs leading-relaxed">
                Selamat bergabung di KKN SPACE sebagai{' '}
                <strong>{ROLE_LABELS[inviteInfo?.role || ''] || inviteInfo?.role}</strong>. Anda akan dialihkan ke ruang kerja posko...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Main Activation Form
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sage-700 text-white font-serif font-bold text-xl shadow-card">
            K
          </div>
          <h1 className="text-2xl font-serif font-semibold text-charcoal tracking-tight">
            Aktivasi Akun Anggota KKN
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Selesaikan pendaftaran akun Anda dan buat kata sandi untuk mengakses workspace posko.
          </p>
        </div>

        <Card className="border-warm-300 shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-warm-200 flex-wrap">
              <div className="text-xs">
                <span className="text-charcoal-muted block text-[10px] uppercase tracking-wider">Email Terundang</span>
                <span className="font-mono font-medium text-charcoal">{inviteInfo?.email}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[11px]">
                  {inviteInfo?.position_label || ROLE_LABELS[inviteInfo?.role || ''] || inviteInfo?.role}
                </Badge>
                {inviteInfo?.division && (
                  <Badge variant="outline" className="text-[11px]">
                    Div. {inviteInfo.division}
                  </Badge>
                )}
              </div>
            </div>
            <CardTitle className="text-sm pt-2">Buat Kata Sandi Masuk</CardTitle>
            <CardDescription>
              Peran KKN Anda ditetapkan secara resmi oleh Super Admin sesuai undangan.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{submitError}</div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Periksa Persyaratan Form:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-sage-600" />
                  <span>Nama Lengkap</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Nama lengkap Anda"
                  value={fullName}
                  disabled={isSubmitting}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sage-600" />
                  <span>Kata Sandi Baru</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                    value={password}
                    disabled={isSubmitting}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-charcoal-muted">
                  {PASSWORD_REQUIREMENTS_HINT}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sage-600" />
                  <span>Konfirmasi Kata Sandi</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Ulangi kata sandi"
                    value={confirmPassword}
                    disabled={isSubmitting}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-medium h-9 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengaktifkan Akun...</span>
                  </>
                ) : (
                  <span>Aktifkan Akun & Masuk Workspace</span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-2 border-t border-warm-200 p-4 bg-warm-50/50 rounded-b-lg text-[11px] text-charcoal-muted text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-sage-600" />
              <span>Aktivasi terverifikasi langsung melalui Edge Function KKN SPACE.</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

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
  UserCheck,
  User,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adminApi, EdgeFunctionError } from '@/services/adminApi'
import { useAuth } from '@/hooks/useAuth'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePasswordConfirmation,
} from '@/lib/passwordPolicy'
import type { EmailOtpType } from '@supabase/supabase-js'

type AcceptFlowMode =
  | 'loading'
  | 'landing'
  | 'set_password'
  | 'already_accepted'
  | 'success'
  | 'error'

export const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate()
  const { refreshAccessContext } = useAuth()

  const [mode, setMode] = useState<AcceptFlowMode>('loading')
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)

  // Token parameters from URL (kept in component memory, not in localStorage)
  const [tokenParams, setTokenParams] = useState<{
    tokenHash: string
    type: string
    name: string
    pos: string
    prog: string
  } | null>(null)

  // Verified invitation information
  const [inviteInfo, setInviteInfo] = useState<{
    email: string
    role: string
    position_label?: string | null
    division?: string | null
    full_name?: string
    already_accepted: boolean
  } | null>(null)

  // Form states for password creation
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set Referrer-Policy to no-referrer dynamically to prevent bearer token leakage
  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]') as HTMLMetaElement | null
    let created = false
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'referrer'
      meta.content = 'no-referrer'
      document.head.appendChild(meta)
      created = true
    } else {
      meta.content = 'no-referrer'
    }

    return () => {
      if (created && meta && meta.parentNode) {
        meta.parentNode.removeChild(meta)
      }
    }
  }, [])

  // Initial URL inspection on mount (GET SAFETY GUARANTEE: Never calls verifyOtp here!)
  useEffect(() => {
    let isMounted = true

    const inspectUrlAndSession = async () => {
      // 1. Check URL error fragments first (e.g. from direct expired action link)
      const hash = window.location.hash
      const search = window.location.search

      if (hash.includes('error=') || search.includes('error=')) {
        const raw = hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, '')
        const params = new URLSearchParams(raw)
        const desc = params.get('error_description') || 'Tautan aktivasi tidak valid atau sudah kedaluwarsa.'
        if (isMounted) {
          setFatalError(desc.replace(/\+/g, ' '))
          setMode('error')
        }
        return
      }

      const searchParams = new URLSearchParams(search)
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token')
      const verificationType = searchParams.get('type') || 'invite'
      const paramName = searchParams.get('name') || ''
      const paramPos = searchParams.get('pos') || ''
      const paramProg = searchParams.get('prog') || ''

      // 2. If token_hash exists in URL:
      // STAY ON SAFE ACTIVATION LANDING PAGE.
      // DO NOT call verifyOtp, DO NOT exchange token, DO NOT make session, DO NOT consume token.
      if (tokenHash) {
        if (isMounted) {
          setTokenParams({
            tokenHash,
            type: verificationType,
            name: paramName,
            pos: paramPos,
            prog: paramProg,
          })
          if (paramName) {
            setFullName(paramName)
          }
          setMode('landing')
        }
        return
      }

      // 3. If NO token_hash in URL:
      // Check if user already has an active session (e.g. returning after email confirmation)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session) {
          try {
            const verification = await adminApi.verifyInvitation()
            if (!isMounted) return

            if (verification.already_accepted) {
              setInviteInfo({
                email: verification.email,
                role: verification.role,
                position_label: verification.position_label,
                division: verification.division,
                full_name: verification.full_name,
                already_accepted: true,
              })
              setMode('already_accepted')
              return
            }

            setInviteInfo({
              email: verification.email,
              role: verification.role,
              position_label: verification.position_label,
              division: verification.division,
              full_name: verification.full_name,
              already_accepted: false,
            })
            if (verification.full_name) {
              setFullName(verification.full_name)
            }
            setMode('set_password')
            return
          } catch (err: any) {
            if (!isMounted) return
            if (err instanceof EdgeFunctionError && err.isNotDeployed) {
              setFatalError('Layanan penerimaan undangan (admin-accept-invitation) belum terpasang di server.')
            } else {
              setFatalError(err?.message || 'Undangan tidak valid, telah dicabut, atau sudah kedaluwarsa.')
            }
            setMode('error')
            return
          }
        }

        // Neither token_hash nor session found
        setFatalError(
          'Tautan aktivasi tidak lengkap atau token tidak ditemukan. Pastikan Anda membuka tautan lengkap yang disalin dari Super Admin.'
        )
        setMode('error')
      } catch (err: any) {
        if (isMounted) {
          setFatalError(err?.message || 'Terjadi kesalahan saat memeriksa sesi aktivasi.')
          setMode('error')
        }
      }
    }

    inspectUrlAndSession()

    return () => {
      isMounted = false
    }
  }, [])

  // Explicit user activation trigger: Only executed when user clicks "Aktifkan Akun"
  const handleExplicitActivation = async () => {
    if (!tokenParams?.tokenHash || isActivating) return

    setIsActivating(true)
    setFatalError(null)

    try {
      // 1. Explicitly verify the token hash with Supabase Auth
      const { data, error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: tokenParams.tokenHash,
        type: (tokenParams.type as EmailOtpType) || 'invite',
      })

      if (otpErr || !data.session) {
        const rawMsg = otpErr?.message || 'Gagal memverifikasi token aktivasi.'
        if (
          rawMsg.toLowerCase().includes('expired') ||
          rawMsg.toLowerCase().includes('invalid') ||
          rawMsg.toLowerCase().includes('already')
        ) {
          setFatalError(
            'Tautan aktivasi tidak valid, telah kedaluwarsa, atau sudah pernah digunakan sebelumnya. Silakan hubungi Super Admin untuk mengirimkan tautan undangan baru.'
          )
        } else {
          setFatalError(rawMsg)
        }
        setMode('error')
        return
      }

      // 2. Clean sensitive token_hash from address bar immediately to prevent bearer leakage
      window.history.replaceState({}, document.title, window.location.pathname)

      // 3. Fetch verified directory & invitation details securely from backend
      try {
        const verification = await adminApi.verifyInvitation()

        if (verification.already_accepted) {
          setInviteInfo({
            email: verification.email,
            role: verification.role,
            position_label: verification.position_label,
            division: verification.division,
            full_name: verification.full_name,
            already_accepted: true,
          })
          setMode('already_accepted')
          return
        }

        setInviteInfo({
          email: verification.email,
          role: verification.role,
          position_label: verification.position_label,
          division: verification.division,
          full_name: verification.full_name,
          already_accepted: false,
        })
        if (verification.full_name) {
          setFullName(verification.full_name)
        }
      } catch {
        // Fallback to URL metadata or auth user metadata if verifyInvitation is unreachable
        const fallbackName = tokenParams.name || (data.session.user.user_metadata?.full_name as string) || ''
        if (fallbackName) {
          setFullName(fallbackName)
        }
        setInviteInfo({
          email: data.session.user.email || '',
          role: 'anggota',
          position_label: tokenParams.pos || 'Anggota',
          division: null,
          full_name: fallbackName,
          already_accepted: false,
        })
      }

      // 4. Transition to password creation step
      setMode('set_password')
    } catch (err: any) {
      setFatalError(err?.message || 'Terjadi kesalahan sistem saat memproses aktivasi akun.')
      setMode('error')
    } finally {
      setIsActivating(false)
    }
  }

  const validateForm = (pwd: string, confirm: string): boolean => {
    const errs: string[] = []
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.push('Nama lengkap wajib diisi (minimal 2 karakter).')
    }
    errs.push(...validatePasswordConfirmation(pwd, confirm))
    setValidationErrors(errs)
    return errs.length === 0
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm(password, confirmPassword)) return

    setIsSubmitting(true)

    try {
      // 1. Update user password in Supabase Auth
      const { error: pwdErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      })

      if (pwdErr) {
        setSubmitError(pwdErr.message || 'Gagal menyimpan kata sandi baru.')
        return
      }

      // 2. Finalize member linking on backend (links directory, updates membership active, marks invite accepted)
      await adminApi.acceptInvitation(fullName.trim())

      // 3. Refresh global AuthContext
      await refreshAccessContext()

      setMode('success')
      setTimeout(() => {
        navigate('/workspace', { replace: true })
      }, 2000)
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal menyelesaikan aktivasi akun.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --------------------------------------------------------------------------
  // STATE 1: INITIAL LOADING
  // --------------------------------------------------------------------------
  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-warm-300 rounded-xl p-8 shadow-card text-center space-y-4">
          <Loader2 className="h-8 w-8 text-sage-600 animate-spin mx-auto" />
          <h2 className="text-base font-semibold text-charcoal">
            Menyiapkan Halaman Aktivasi...
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Memuat identitas dan konfigurasi keamanan akun KKN SPACE Anda.
          </p>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 2: ERROR / EXPIRED / INVALID
  // --------------------------------------------------------------------------
  if (mode === 'error') {
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
                Aktivasi Tidak Dapat Diproses
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1 text-xs text-charcoal-muted">
                {fatalError || 'Tautan aktivasi tidak valid atau telah kedaluwarsa.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Silakan hubungi Super Admin kelompok KKN untuk mendapatkan tautan undangan baru yang valid.
              </p>
              <div className="space-y-2">
                <Link to="/auth/login" className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Ke Halaman Masuk
                  </Button>
                </Link>
                <Link to="/" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-charcoal-muted">
                    Halaman Depan Portal KKN
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 3: ALREADY ACCEPTED & ACTIVE
  // --------------------------------------------------------------------------
  if (mode === 'already_accepted') {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <UserCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-serif">
                Akun Sudah Aktif
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1 text-xs text-charcoal-muted">
                Undangan untuk akun <span className="font-mono text-charcoal">{inviteInfo?.email}</span> telah diterima sebelumnya. Keanggotaan Anda di KKN SPACE sudah aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Anda dapat langsung masuk ke Workspace KKN untuk mengakses agenda, program kerja, dan koordinasi tim.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/workspace', { replace: true })}
                className="w-full bg-charcoal hover:bg-black text-white text-xs py-2"
              >
                Buka Workspace KKN
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 4: SUCCESS STATE
  // --------------------------------------------------------------------------
  if (mode === 'success') {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-serif">
                Aktivasi Berhasil!
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1 text-xs text-charcoal-muted">
                Selamat datang di KKN SPACE, <strong className="text-charcoal">{fullName || 'Anggota'}</strong>. Akun Anda telah aktif dan terhubung ke direktori resmi tim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-center gap-2 text-xs text-sage-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengarahkan ke Workspace KKN...</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/workspace', { replace: true })}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white text-xs mt-2"
              >
                Lanjut Sekarang
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 5: SAFE LANDING PAGE (NO TOKEN CONSUMED ON GET)
  // --------------------------------------------------------------------------
  if (mode === 'landing') {
    const memberName = tokenParams?.name || 'Calon Anggota KKN'
    const position = tokenParams?.pos || 'Anggota KKN'
    const studyProgram = tokenParams?.prog || 'S1'

    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          <div className="text-center space-y-2.5">
            <BrandLogo size="xl" className="h-16 w-16 mx-auto drop-shadow-md" />
            <div>
              <h1 className="text-2xl font-serif font-bold text-charcoal">
                Aktivasi Akun Anggota KKN
              </h1>
              <p className="text-xs font-medium text-sage-800 mt-1">
                KKN Pringgasela Selatan 2026–2027 · Universitas Mataram
              </p>
              <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto mt-0.5 leading-relaxed">
                Selamat datang di KKN SPACE. Silakan aktivasi akun untuk mulai menggunakan Workspace kelompok KKN Desa Pringgasela Selatan.
              </p>
            </div>
          </div>

          <Card className="border-warm-300 shadow-card">
            <CardHeader className="pb-3 border-b border-warm-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                  Konfirmasi Identitas
                </span>
                <Badge variant="outline" className="text-[10px] bg-warm-50 text-sage-800 border-warm-300">
                  Undangan Resmi
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Member Card Details */}
              <div className="p-3.5 bg-warm-50 rounded-lg border border-warm-200 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-charcoal-muted block">
                    Nama Anggota
                  </span>
                  <span className="font-semibold text-charcoal text-sm block">
                    {memberName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-warm-200/80 text-[11px]">
                  <div>
                    <span className="text-[10px] text-charcoal-muted block">Jabatan Resmi</span>
                    <span className="font-medium text-charcoal block">{position}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-muted block">Institusi</span>
                    <span className="font-medium text-sage-800 block">Universitas Mataram</span>
                  </div>
                  {studyProgram && studyProgram !== 'S1' && (
                    <div className="col-span-2 pt-1">
                      <span className="text-[10px] text-charcoal-muted block">Program Studi</span>
                      <span className="font-medium text-charcoal block">{studyProgram}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Information Guidance */}
              <div className="p-3 bg-sage-50/60 rounded-lg border border-sage-200 text-xs text-sage-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-sage-800 text-[11px]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Langkah Aktivasi Akun</span>
                </div>
                <p className="text-[11px] text-sage-800/90 leading-relaxed">
                  Klik tombol <strong>Aktifkan Akun</strong> di bawah ini untuk memverifikasi undangan dan melanjutkan ke pembuatan kata sandi pribadi Anda.
                </p>
              </div>

              {/* Explicit Activation Action */}
              <Button
                type="button"
                onClick={handleExplicitActivation}
                disabled={isActivating}
                className="w-full bg-sage-700 hover:bg-sage-800 text-white font-medium py-2.5 text-xs gap-2 shadow-sm transition-all"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memverifikasi Undangan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Aktifkan Akun</span>
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-charcoal-muted leading-relaxed">
                Tautan ini aman dibuka dan hanya diproses setelah tombol di atas ditekan.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 6: PASSWORD CREATION FORM (AFTER TOKEN VERIFIED)
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="text-center space-y-2.5">
          <BrandLogo size="xl" className="h-16 w-16 mx-auto drop-shadow-md" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-charcoal">
              Buat Kata Sandi Pribadi
            </h1>
            <p className="text-xs font-medium text-sage-800 mt-1">
              KKN Pringgasela Selatan 2026–2027 · Universitas Mataram
            </p>
            <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto mt-0.5 leading-relaxed">
              Undangan resmi telah terverifikasi. Tentukan kata sandi akun untuk mulai masuk ke Workspace KKN SPACE.
            </p>
          </div>
        </div>

        <Card className="border-warm-300 shadow-card">
          <form onSubmit={handlePasswordSubmit}>
            <CardHeader className="pb-3 border-b border-warm-200">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-semibold text-charcoal">
                    Profil &amp; Keamanan Akun
                  </CardTitle>
                  <CardDescription className="text-[11px] text-charcoal-muted">
                    {inviteInfo?.email && (
                      <span className="font-mono">{inviteInfo.email}</span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-warm-50 text-sage-800 border-warm-300">
                  {inviteInfo?.position_label || 'Anggota'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {submitError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{submitError}</div>
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Lengkap Sesuai Direktori"
                  disabled={isSubmitting}
                  className="text-xs"
                />
              </div>

              {/* Kata Sandi Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sage-600" />
                  <span>Kata Sandi Baru</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (validationErrors.length > 0) {
                        validateForm(e.target.value, confirmPassword)
                      }
                    }}
                    placeholder="Minimal 6 karakter"
                    disabled={isSubmitting}
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sage-600" />
                  <span>Konfirmasi Kata Sandi</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (validationErrors.length > 0) {
                        validateForm(password, e.target.value)
                      }
                    }}
                    placeholder="Ulangi kata sandi baru"
                    disabled={isSubmitting}
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Hint & Errors */}
              {validationErrors.length > 0 ? (
                <div className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600 font-medium">
                      • {err}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-charcoal-muted">
                  {PASSWORD_REQUIREMENTS_HINT}
                </p>
              )}
            </CardContent>

            <CardFooter className="pt-3 border-t border-warm-200">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-charcoal hover:bg-black text-white font-medium text-xs py-2 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan &amp; Mengaktifkan Akun...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Simpan Kata Sandi &amp; Masuk</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

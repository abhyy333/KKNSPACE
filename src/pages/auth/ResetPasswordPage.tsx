import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
  validatePasswordConfirmation,
} from '@/lib/passwordPolicy'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isVerifyingSession, setIsVerifyingSession] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // 1. Session Recovery & Token Verification
  useEffect(() => {
    let isMounted = true

    // Listen to Supabase auth state change for PASSWORD_RECOVERY or SIGNED_IN
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsSessionValid(true)
        setIsVerifyingSession(false)
        setErrorMessage(null)
      }
    })

    // Verify active session and URL parameters
    const checkSession = async () => {
      // Check for error parameters in the hash or query (e.g. #error=access_denied&error_description=...)
      const hash = window.location.hash
      const search = window.location.search

      if (hash.includes('error=') || search.includes('error=')) {
        const raw = hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, '')
        const params = new URLSearchParams(raw)
        const desc = params.get('error_description') || 'Tautan pemulihan tidak valid atau sudah kedaluwarsa.'
        if (isMounted) {
          setErrorMessage(desc.replace(/\+/g, ' '))
          setIsVerifyingSession(false)
          setIsSessionValid(false)
        }
        return
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }

        if (isMounted) {
          if (session) {
            setIsSessionValid(true)
          } else {
            // Give Supabase client a short window to process token from URL hash/code
            setTimeout(async () => {
              if (!isMounted) return
              const { data: retryData } = await supabase.auth.getSession()
              if (retryData.session) {
                setIsSessionValid(true)
              } else {
                setIsSessionValid(false)
              }
              setIsVerifyingSession(false)
            }, 1200)
            return
          }
          setIsVerifyingSession(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Gagal memverifikasi sesi pemulihan.')
          setIsSessionValid(false)
          setIsVerifyingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  // 2. Password Strength Validation (Client-Side)
  const validatePassword = (pwd: string, confirm: string): boolean => {
    const errors = validatePasswordConfirmation(pwd, confirm)
    setValidationErrors(errors)
    return errors.length === 0
  }

  // 3. Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validatePassword(password, confirmPassword)) {
      return
    }

    setIsSubmitting(true)

    try {
      // Supabase Auth updateUser call
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setErrorMessage(error.message || "Gagal memperbarui kata sandi. Silakan coba kembali.")
        return
      }

      setIsSuccess(true)

      // Safely end the recovery session
      await supabase.auth.signOut()

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth/login')
      }, 3500)
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat menyimpan kata sandi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading State while verifying session
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-warm-300 rounded-xl p-8 shadow-card text-center space-y-4">
          <Loader2 className="h-8 w-8 text-sage-600 animate-spin mx-auto" />
          <h2 className="text-base font-semibold text-charcoal">
            Memverifikasi Tautan Pemulihan...
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Menghubungkan sesi autentikasi aman dengan server Supabase. Mohon tunggu sebentar.
          </p>
        </div>
      </div>
    )
  }

  // Invalid or Expired Token State
  if (!isSessionValid && !isSuccess) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted hover:text-charcoal transition-colors mx-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>

          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-serif">
                Tautan Pemulihan Tidak Valid
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1">
                {errorMessage || "Tautan pemulihan kata sandi tidak ditemukan, telah kedaluwarsa, atau sudah pernah digunakan sebelumnya."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Untuk alasan keamanan, tautan pemulihan kata sandi hanya berlaku satu kali dalam jangka waktu terbatas. Silakan ajukan tautan baru melalui form lupa password.
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/auth/forgot-password">
                  <Button variant="default" size="sm" className="w-full text-xs">
                    Minta Tautan Pemulihan Baru
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Kembali ke Halaman Masuk
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
          <Card className="border-warm-300 shadow-card text-center">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-serif">
                Kata Sandi Berhasil Diperbarui
              </CardTitle>
              <CardDescription className="leading-relaxed pt-1">
                Kata sandi baru akun posko Anda telah aktif dan tersimpan secara aman di Supabase Auth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Sesi pemulihan telah ditutup secara aman. Anda akan dialihkan ke halaman login dalam beberapa detik.
              </p>
              <Link to="/auth/login">
                <Button variant="default" size="sm" className="w-full text-xs gap-2">
                  <span>Masuk Sekarang dengan Sandi Baru</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Form State
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sage-700 text-white font-serif font-bold text-xl shadow-card">
            K
          </div>
          <h1 className="text-2xl font-serif font-semibold text-charcoal tracking-tight">
            Atur Ulang Kata Sandi
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Masukkan kata sandi baru untuk akun KKN SPACE Anda.
          </p>
        </div>

        <Card className="border-warm-300 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sage-600" />
              <span>Sandi Baru Akun Posko</span>
            </CardTitle>
            <CardDescription>
              Pastikan kata sandi baru memenuhi standar keamanan posko KKN.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Persyaratan Kata Sandi Belum Terpenuhi:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sage-600" />
                  <span>Kata Sandi Baru</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                    value={password}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (validationErrors.length > 0) {
                        validatePassword(e.target.value, confirmPassword)
                      }
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                    aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
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
                  <span>Konfirmasi Kata Sandi Baru</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (validationErrors.length > 0) {
                        validatePassword(password, e.target.value)
                      }
                    }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal p-1"
                    aria-label={showConfirmPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !password || !confirmPassword}
                className="w-full text-xs font-medium h-9 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan Kata Sandi...</span>
                  </>
                ) : (
                  <span>Simpan Kata Sandi Baru</span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-2 border-t border-warm-200 p-4 bg-warm-50/50 rounded-b-lg text-[11px] text-charcoal-muted text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-sage-600" />
              <span>Sandi baru akan dienkripsi secara aman dengan algoritma bcrypt Supabase.</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

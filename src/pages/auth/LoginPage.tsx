import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Mail, ArrowLeft, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().min(1, "Alamat email wajib diisi").email("Format alamat email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTarget = searchParams.get('redirect')

  const { signIn } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)

    const result = await signIn(data.email, data.password)

    if (result.error) {
      const msg = result.error.message
      if (msg === "Invalid login credentials" || msg?.includes("invalid_grant")) {
        setServerError("Email atau kata sandi tidak sesuai. Silakan periksa kembali.")
      } else {
        setServerError(msg || "Gagal masuk. Silakan coba kembali beberapa saat lagi.")
      }
      return
    }

    // Determine safe destination based on authorization (Dual-Role Super Admin supports both /admin and /workspace)
    if (result.isSuperAdmin) {
      const destination =
        redirectTarget && (redirectTarget.startsWith('/admin') || redirectTarget.startsWith('/workspace'))
          ? redirectTarget
          : '/admin'
      navigate(destination, { replace: true })
    } else if (result.hasActiveMembership) {
      const destination = redirectTarget && !redirectTarget.startsWith('/admin') ? redirectTarget : '/workspace'
      navigate(destination, { replace: true })
    } else {
      // Authenticated but no role and not super admin
      navigate('/unauthorized?reason=no_membership', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-warm-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted hover:text-charcoal transition-colors mx-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda Publik</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sage-700 text-white font-serif font-bold text-xl shadow-card">
            K
          </div>
          <h1 className="text-2xl font-serif font-semibold text-charcoal tracking-tight">
            Masuk ke KKN SPACE
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Ruang kerja kolaboratif digital kelompok KKN Desa Pringgasela Selatan.
          </p>
        </div>

        <Card className="border-warm-300 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Autentikasi Akun Posko</CardTitle>
            <CardDescription>
              Gunakan email posko yang telah terdaftar dan diverifikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serverError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{serverError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-sage-600" />
                  <span>Alamat Email</span>
                </label>
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  disabled={isSubmitting}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-sage-600" />
                    <span>Kata Sandi</span>
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-[11px] text-sage-700 hover:underline"
                  >
                    Lupa sandi?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-medium h-9 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Autentikasi...</span>
                  </>
                ) : (
                  <span>Masuk ke Ruang Kerja</span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-2 border-t border-warm-200 p-4 bg-warm-50/50 rounded-b-lg">
            <div className="flex items-center gap-2 text-[11px] text-charcoal-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-sage-600 shrink-0" />
              <span>Pendaftaran akun hanya dapat dilakukan melalui undangan Super Admin.</span>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center text-[11px] text-charcoal-muted">
          <p>KKN SPACE · Single-group Digital Workspace</p>
        </div>
      </div>
    </div>
  )
}

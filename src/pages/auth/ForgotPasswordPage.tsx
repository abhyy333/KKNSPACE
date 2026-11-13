import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { BrandLogo } from '@/components/brand/BrandLogo'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const redirectTo = `${env.APP_BASE_URL}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        // Handle common rate-limit or bad request errors from Supabase
        if (error.status === 429) {
          setErrorMessage("Terlalu banyak permintaan pemulihan kata sandi. Harap tunggu beberapa saat sebelum mencoba kembali.")
        } else {
          setErrorMessage(error.message || "Gagal mengirimkan instruksi pemulihan. Silakan periksa kembali email Anda.")
        }
        return
      }

      setIsSubmitted(true)
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan jaringan atau server. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

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

        <div className="text-center space-y-2.5">
          <BrandLogo size="xl" className="h-16 w-16 mx-auto drop-shadow-md" />
          <div>
            <h1 className="text-2xl font-serif font-semibold text-charcoal tracking-tight">
              Pemulihan Kata Sandi
            </h1>
            <p className="text-xs font-medium text-sage-800 mt-1">
              KKN Pringgasela Selatan 2026–2027 · Universitas Mataram
            </p>
            <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto mt-0.5">
              Masukkan alamat email akun posko Anda untuk menerima tautan atur ulang kata sandi.
            </p>
          </div>
        </div>

        <Card className="border-warm-300 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-serif">Lupa Sandi Akun</CardTitle>
            <CardDescription>
              Tautan pemulihan akan dikirimkan secara aman oleh sistem Supabase Auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {isSubmitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-charcoal">Instruksi Terkirim</h4>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    Jika alamat email <span className="font-medium text-charcoal">{email}</span> terdaftar di posko KKN SPACE, tautan pemulihan kata sandi telah dikirimkan ke kotak masuk Anda.
                  </p>
                  <p className="text-[11px] text-charcoal-light">
                    Periksa juga folder <span className="font-semibold">Spam</span> atau <span className="font-semibold">Promotions</span> apabila email belum muncul dalam beberapa menit.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/auth/login">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Kembali ke Halaman Masuk
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-sage-600" />
                    <span>Alamat Email Terdaftar</span>
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full text-xs font-medium h-9 gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mengirimkan Tautan...</span>
                    </>
                  ) : (
                    <span>Kirim Tautan Pemulihan</span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-2 border-t border-warm-200 p-4 bg-warm-50/50 rounded-b-lg text-[11px] text-charcoal-muted text-center">
            <span>Tautan pemulihan berlaku terbatas dan hanya dapat digunakan satu kali.</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

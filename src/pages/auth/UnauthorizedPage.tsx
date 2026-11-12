import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Home, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export const UnauthorizedPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')
  const { user, isSuperAdmin, signOut } = useAuth()

  let title = "Akses Tidak Diizinkan"
  let description = "Anda tidak memiliki wewenang atau hak akses untuk membuka halaman ini."

  if (reason === 'no_membership') {
    if (isSuperAdmin) {
      title = "Bukan Anggota Kelompok KKN"
      description = "Akun Anda terdaftar sebagai Super Admin sistem, namun belum memiliki keanggotaan (membership) aktif di kelompok KKN ini. Workspace hanya dapat dibuka oleh anggota operasional KKN."
    } else {
      title = "Belum Memiliki Keanggotaan KKN"
      description = "Akun Anda belum memiliki status keanggotaan aktif dalam kelompok KKN ini. Hubungi Super Admin posko untuk mendapatkan undangan resmi."
    }
  } else if (reason === 'inactive') {
    title = "Akun Telah Dinonaktifkan"
    description = "Status profil akun Anda sedang dinonaktifkan oleh administrator sistem. Silakan hubungi Super Admin untuk mengaktifkan kembali akses akun Anda."
  } else if (reason === 'admin_only') {
    title = "Akses Khusus Super Admin"
    description = "Halaman Admin Console hanya dapat diakses oleh administrator sistem yang terdaftar di system_admins."
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-warm-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
      <div className="max-w-md w-full min-w-0">
        <Card className="border-warm-300 shadow-card">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2 border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-serif">{title}</CardTitle>
            <CardDescription className="pt-1 text-xs leading-relaxed break-words">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {user && (
              <div className="p-2.5 rounded bg-warm-50 border border-warm-200 text-xs text-charcoal-muted break-words">
                <span>Terautentikasi: </span>
                <span className="font-mono text-charcoal font-medium break-all">{user.email}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {isSuperAdmin && (
                <Link to="/admin">
                  <Button variant="default" size="sm" className="w-full text-xs gap-1.5 bg-charcoal hover:bg-black text-white">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Masuk ke Admin Console</span>
                  </Button>
                </Link>
              )}

              <Link to="/">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  <span>Kembali ke Beranda Publik</span>
                </Button>
              </Link>

              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="w-full text-xs gap-1.5 text-charcoal-muted hover:text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Akun</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

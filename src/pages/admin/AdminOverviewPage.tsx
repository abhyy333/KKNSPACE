import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { Shield, UserPlus, Users, History, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { adminApi } from '@/services/adminApi'
import { BrandLogo } from '@/components/brand/BrandLogo'

export const AdminOverviewPage: React.FC = () => {
  const { user } = useAuth()

  const { data: adminData, isLoading: loadingAdminData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers({ page: 1, perPage: 10 }),
    retry: false,
  })

  const { data: directCounts, isLoading: loadingDirect } = useQuery({
    queryKey: ['admin-overview-direct'],
    queryFn: async () => {
      const [profRes, invRes, auditRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('audit_events').select('id, action, created_at').order('created_at', { ascending: false }).limit(5),
      ])
      return {
        profilesCount: profRes.count ?? 0,
        pendingInvitesCount: invRes.count ?? 0,
        audits: auditRes.data ?? [],
      }
    },
    retry: false,
  })

  const totalAccounts = adminData?.summary?.totalAuthUsers ?? directCounts?.profilesCount
  const pendingInvitations = adminData?.summary?.pendingInvitations ?? directCounts?.pendingInvitesCount
  const audits = directCounts?.audits ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <BrandLogo size="lg" className="h-12 w-12 shrink-0 drop-shadow-xs hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-charcoal text-charcoal">
                Super Admin Console
              </Badge>
              <span className="text-xs text-charcoal-muted font-mono">{user?.email}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
              Pusat Kendali Platform KKN SPACE
            </h1>
            <p className="text-xs text-charcoal-muted mt-1">
              KKN Pringgasela Selatan 2026–2027 Universitas Mataram · Kelola akun, otorisasi peran, dan audit sistem.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/workspace">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-sage-300 bg-sage-50 text-sage-800 hover:bg-sage-100">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Buka Workspace KKN</span>
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button size="sm" className="bg-charcoal hover:bg-black text-white text-xs gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Kelola &amp; Undang Anggota</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Total Akun Terdaftar
              </p>
              {loadingAdminData && loadingDirect ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <>
                  <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1">
                    {totalAccounts ?? 0} Akun
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-1">
                    {adminData?.summary
                      ? `${adminData.summary.activeAccounts} aktif · ${adminData.summary.inactiveAccounts} nonaktif`
                      : 'Terverifikasi di database'}
                  </p>
                </>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-200 text-charcoal">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Undangan Pending
              </p>
              {loadingAdminData && loadingDirect ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <>
                  <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1">
                    {pendingInvitations ?? 0} Menunggu
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Menunggu konfirmasi email
                  </p>
                </>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-100 text-sage-800">
              <UserPlus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Status Keamanan RLS
              </p>
              <h3 className="text-base font-semibold text-emerald-700 mt-1">
                Aktif & Terlindungi
              </h3>
              <p className="text-xs text-charcoal-muted mt-1">
                Deny-by-default diberlakukan
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aturan Bisnis & Akses Non-Negosiabel</CardTitle>
            <CardDescription>Prinsip keamanan utama sistem KKN SPACE</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-charcoal">
            <div className="p-3 rounded-md bg-warm-100 border border-warm-200 space-y-1">
              <div className="font-semibold text-charcoal flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sage-700" />
                <span>Otoritas Super Admin Tunggal</span>
              </div>
              <p className="text-charcoal-muted leading-relaxed">
                Hanya Super Admin (<span className="font-mono text-charcoal font-medium">{user?.email}</span>) yang memiliki wewenang mengundang, membuat akun, mengubah status aktif/nonaktif, dan menetapkan peran awal KKN.
              </p>
            </div>

            <div className="p-3 rounded-md bg-warm-100 border border-warm-200 space-y-1">
              <div className="font-semibold text-charcoal flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span>Tanpa Registrasi Publik Mandiri</span>
              </div>
              <p className="text-charcoal-muted leading-relaxed">
                Platform tidak mengizinkan pendaftaran mandiri (self-signup). Seluruh akses harus melalui tautan undangan resmi dengan token kedaluwarsa.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Log Audit Sistem Terkini</CardTitle>
              <CardDescription>Aktivitas administratif & autentikasi dari database</CardDescription>
            </div>
            <Link to="/admin/audit">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <span>Seluruh Log</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {loadingDirect ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : audits.length === 0 ? (
              <div className="p-4 text-center rounded border border-dashed border-warm-300 text-charcoal-muted">
                Belum ada catatan peristiwa audit di database.
              </div>
            ) : (
              audits.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2.5 rounded border border-warm-200 bg-white">
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-charcoal-muted" />
                    <span className="font-mono text-[11px] font-medium text-charcoal">{log.action}</span>
                  </div>
                  <div className="text-[11px] text-charcoal-muted font-mono">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

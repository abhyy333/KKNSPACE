import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { fetchGroupSettings } from '@/services/dashboardApi'
import {
  AlertCircle,
  Calendar,
  MapPin,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Belum ditetapkan oleh Super Admin'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin } = useAuth()

  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'group-settings'],
    queryFn: fetchGroupSettings,
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Pengaturan Posko &amp; Kelompok KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Informasi identitas resmi kelompok KKN, desa penempatan, serta rentang periode pengabdian.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-60" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Profil Posko
                </p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-serif">
                    Identitas Kelompok Terdaftar
                  </CardTitle>
                  <CardDescription>
                    Data bersumber langsung dari tabel konfigurasi posko (`group_settings`).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Read-Only Anggota
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                    <SettingsIcon className="h-3.5 w-3.5 text-sage-700" />
                    Nama Kelompok / Platform
                  </span>
                  <p className="text-sm font-semibold text-charcoal">
                    {settings?.group_name || 'KKN SPACE'}
                  </p>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sage-700" />
                    Desa Penempatan Posko
                  </span>
                  <p className="text-sm font-semibold text-charcoal">
                    {settings?.village_name?.trim() || 'Belum ditetapkan oleh Super Admin'}
                  </p>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sage-700" />
                    Tanggal Mulai Periode KKN
                  </span>
                  <p className="text-sm font-semibold text-charcoal">
                    {formatDate(settings?.period_start)}
                  </p>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sage-700" />
                    Tanggal Selesai Periode KKN
                  </span>
                  <p className="text-sm font-semibold text-charcoal">
                    {formatDate(settings?.period_end)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sage-200 bg-sage-50/50">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-sage-700" />
                Kebijakan Perubahan Posko
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-charcoal-muted">
              <p>
                Sesuai kebijakan tata kelola platform, perubahan nama kelompok, lokasi desa penempatan, dan periode KKN hanya dapat dilakukan oleh <strong>Super Admin</strong>.
              </p>
              {isSuperAdmin && (
                <Link to="/admin/settings" className="block pt-1">
                  <Button size="sm" variant="default" className="w-full text-xs gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Buka Pengaturan di Admin Console</span>
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

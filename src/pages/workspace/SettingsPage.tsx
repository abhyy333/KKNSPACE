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
  Shield,
  GraduationCap,
  ExternalLink,
  Phone,
  Compass,
  ArrowRight,
} from 'lucide-react'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Belum ditetapkan'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-600 text-sage-800 bg-sage-50">
              Pusat Informasi Posko
            </Badge>
            <span className="text-xs text-charcoal-muted">Profil Resmi Kelompok KKN</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Pengaturan Posko &amp; Identitas Kelompok
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Data terdaftar resmi kelompok KKN, wilayah penempatan, periode pengabdian, serta dosen pembimbing lapangan.
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

      {/* Super Admin Notice Banner */}
      {isSuperAdmin && (
        <Card className="border-sage-300 bg-sage-50/70 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-700 text-white">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-charcoal">Akses Khusus Super Admin</p>
                <p className="text-charcoal-muted">
                  Halaman ini berstatus read-only bagi anggota umum. Anda dapat mengubah data konfigurasi posko melalui menu administrasi.
                </p>
              </div>
            </div>

            <Link to="/admin/kkn-config">
              <Button size="sm" className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5">
                <span>Buka Konfigurasi KKN di Admin Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">Gagal Memuat Konfigurasi Posko</p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan sistem.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Identitas Kelompok */}
            <Card className="bg-white">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-sage-700" />
                  <span>A. Identitas Kelompok KKN</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Informasi universitas dan angkatan kelompok terdaftar.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Nama Platform &amp; Kelompok</span>
                  <p className="text-sm font-bold text-charcoal">{settings?.group_name || 'KKN SPACE'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Perguruan Tinggi</span>
                    <p className="font-semibold text-charcoal">{settings?.university || 'Universitas Mataram'}</p>
                  </div>
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Tahun Akademik</span>
                    <p className="font-semibold text-charcoal">{settings?.academic_year || '2026/2027'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Periode / Angkatan</span>
                  <p className="font-semibold text-charcoal">{settings?.kkn_batch || 'Periode Semester Ganjil 2026'}</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Lokasi Penempatan Posko */}
            <Card className="bg-white">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sage-700" />
                  <span>B. Lokasi Penempatan &amp; Posko</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Wilayah administrasi desa binaan dan posko operasional.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Desa / Kelurahan</span>
                    <p className="font-semibold text-charcoal">{settings?.village || settings?.village_name || 'Pringgasela Selatan'}</p>
                  </div>
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Kecamatan</span>
                    <p className="font-semibold text-charcoal">{settings?.district || 'Pringgasela'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Kabupaten / Kota</span>
                    <p className="font-semibold text-charcoal">{settings?.regency || 'Lombok Timur'}</p>
                  </div>
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Provinsi</span>
                    <p className="font-semibold text-charcoal">{settings?.province || 'Nusa Tenggara Barat'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Alamat Lengkap Posko</span>
                  <p className="font-semibold text-charcoal">{settings?.posko_address || 'Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur'}</p>
                  {settings?.posko_dusun && (
                    <p className="text-[11px] text-charcoal-muted mt-0.5">Dusun Posko: {settings.posko_dusun}</p>
                  )}
                </div>

                {settings?.maps_url && (
                  <div className="pt-1">
                    <a
                      href={settings.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sage-800 underline flex items-center gap-1 font-medium hover:text-sage-900"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>Buka Titik Koordinat Posko di Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Periode Waktu KKN */}
            <Card className="bg-white">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-sage-700" />
                  <span>C. Periode Waktu Pelaksanaan KKN</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Jadwal resmi masa persiapan, operasional lapangan, dan penarikan.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Tanggal Mulai Lapangan</span>
                    <p className="text-sm font-semibold text-charcoal">{formatDate(settings?.period_start)}</p>
                  </div>
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Tanggal Selesai / Penarikan</span>
                    <p className="text-sm font-semibold text-charcoal">{formatDate(settings?.period_end || settings?.withdrawal_date)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Tahap Persiapan &amp; Pembekalan</span>
                  <p className="font-semibold text-charcoal">{formatDate(settings?.prep_date)}</p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Dosen Pembimbing & Kontak Posko */}
            <Card className="bg-white">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <Phone className="h-4 w-4 text-sage-700" />
                  <span>D. Pembimbing Lapangan &amp; Kontak Posko</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Dosen Pembimbing Lapangan (DPL) dan jalur komunikasi darurat.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Dosen Pembimbing Lapangan (DPL)</span>
                  <p className="text-sm font-semibold text-charcoal">{settings?.dpl_name || 'Lalu Muhammad Aby Dujana, M.Si.'}</p>
                  {settings?.dpl_nip && <p className="text-[11px] text-charcoal-muted">NIP/NIDN: {settings.dpl_nip}</p>}
                </div>

                <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                  <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Kontak Darurat Posko</span>
                  <p className="font-semibold text-charcoal">{settings?.emergency_contact || 'Hubungi Ketua atau Sekretaris Posko'}</p>
                </div>

                {settings?.important_notes && (
                  <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1">
                    <span className="text-[11px] text-charcoal-muted uppercase font-semibold">Catatan &amp; Informasi Khusus Posko</span>
                    <p className="text-charcoal whitespace-pre-wrap">{settings.important_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

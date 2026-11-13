import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { fetchGroupSettings, updateGroupSettings } from '@/services/dashboardApi'
import type { GroupSettings } from '@/types/database'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  Save,
  RefreshCw,
  GraduationCap,
  MapPin,
  Calendar,
  Phone,
} from 'lucide-react'

export const AdminKknConfigPage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    data: settings,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-group-settings'],
    queryFn: fetchGroupSettings,
  })

  // Form State
  const [formData, setFormData] = useState<Partial<GroupSettings>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (settings) {
      setFormData({
        group_name: settings.group_name || 'KKN SPACE',
        platform_name: settings.platform_name || 'KKN SPACE',
        university: settings.university || 'Universitas Mataram',
        academic_year: settings.academic_year || '2026/2027',
        kkn_batch: settings.kkn_batch || 'Periode II 2026',
        province: settings.province || 'Nusa Tenggara Barat',
        regency: settings.regency || 'Lombok Timur',
        district: settings.district || 'Pringgasela',
        village: settings.village || 'Pringgasela Selatan',
        village_name: settings.village || 'Pringgasela Selatan',
        posko_dusun: settings.posko_dusun || 'Pringgasela Daye',
        posko_address:
          settings.posko_address ||
          'Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur',
        latitude: settings.latitude ?? undefined,
        longitude: settings.longitude ?? undefined,
        maps_url: settings.maps_url || '',
        prep_date: settings.prep_date || '',
        period_start: settings.period_start || '',
        period_end: settings.period_end || '',
        withdrawal_date: settings.withdrawal_date || '',
        dpl_name: settings.dpl_name || 'Lalu Muhammad Aby Dujana, M.Si.',
        dpl_nip: settings.dpl_nip || '',
        dpl_contact: settings.dpl_contact || '',
        emergency_contact: settings.emergency_contact || '',
        important_notes: settings.important_notes || '',
        posko_description: settings.posko_description || '',
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: updateGroupSettings,
    onSuccess: (updated) => {
      toast({
        title: 'Konfigurasi Posko Berhasil Disimpan',
        description: 'Perubahan telah tersimpan dan disinkronkan ke seluruh modul KKN SPACE.',
        variant: 'success',
      })
      queryClient.setQueryData(['admin-group-settings'], updated)
      queryClient.invalidateQueries({ queryKey: ['workspace', 'group-settings'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menyimpan Konfigurasi',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const handleChange = (field: keyof GroupSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const errors: Record<string, string> = {}
    if (formData.period_start && formData.period_end && formData.period_end < formData.period_start) {
      errors.period_end = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
    }
    if (
      formData.prep_date &&
      formData.period_start &&
      formData.period_start < formData.prep_date
    ) {
      errors.period_start = 'Tanggal mulai pelaksanaan tidak boleh lebih awal dari persiapan.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast({
        title: 'Validasi Form Gagal',
        description: 'Silakan periksa kembali rentang tanggal periode KKN.',
        variant: 'error',
      })
      return
    }

    // Sync village_name with village
    const payload = {
      ...formData,
      village_name: formData.village || formData.village_name,
    }

    await updateMutation.mutateAsync(payload)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-charcoal text-charcoal bg-warm-100">
              Admin Console
            </Badge>
            <span className="text-xs text-charcoal-muted">Single Source of Truth Posko</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Konfigurasi KKN &amp; Identitas Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pusat konfigurasi resmi identitas kelompok KKN, wilayah desa penempatan, periode kalender, DPL, dan fasilitas posko.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: Identitas Kelompok */}
          <Card className="bg-white">
            <CardHeader className="p-5 pb-3 border-b border-warm-200">
              <CardTitle className="text-sm font-serif font-semibold flex items-center gap-2 text-charcoal">
                <GraduationCap className="h-4 w-4 text-sage-700" />
                <span>A. Identitas Kelompok KKN</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Nama kelompok, institusi perguruan tinggi, dan angkatan pengabdian.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3.5 p-3 rounded-lg bg-warm-50 border border-warm-200">
                <BrandLogo size="lg" className="h-12 w-12 drop-shadow-xs shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal">Identitas Visual Resmi Kelompok KKN</p>
                  <p className="text-[11px] text-charcoal-muted truncate">
                    KKN Pringgasela Selatan 2026–2027 · Universitas Mataram (Logo aktif di seluruh portal &amp; workspace)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Nama Kelompok KKN *</label>
                  <Input
                    value={formData.group_name || ''}
                    onChange={(e) => handleChange('group_name', e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Nama Platform Sistem</label>
                  <Input
                    value={formData.platform_name || ''}
                    onChange={(e) => handleChange('platform_name', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Perguruan Tinggi *</label>
                  <Input
                    value={formData.university || ''}
                    onChange={(e) => handleChange('university', e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Tahun Akademik</label>
                  <Input
                    value={formData.academic_year || ''}
                    onChange={(e) => handleChange('academic_year', e.target.value)}
                    placeholder="2026/2027"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Periode / Angkatan</label>
                  <Input
                    value={formData.kkn_batch || ''}
                    onChange={(e) => handleChange('kkn_batch', e.target.value)}
                    placeholder="Periode II 2026"
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section B: Lokasi Penempatan Posko */}
          <Card className="bg-white">
            <CardHeader className="p-5 pb-3 border-b border-warm-200">
              <CardTitle className="text-sm font-serif font-semibold flex items-center gap-2 text-charcoal">
                <MapPin className="h-4 w-4 text-sage-700" />
                <span>B. Lokasi Penempatan Wilayah &amp; Posko</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Wilayah administrasi desa penempatan dan lokasi fisik posko utama.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Desa *</label>
                  <Input
                    value={formData.village || ''}
                    onChange={(e) => handleChange('village', e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Kecamatan</label>
                  <Input
                    value={formData.district || ''}
                    onChange={(e) => handleChange('district', e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Kabupaten / Kota</label>
                  <Input
                    value={formData.regency || ''}
                    onChange={(e) => handleChange('regency', e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Provinsi</label>
                  <Input
                    value={formData.province || ''}
                    onChange={(e) => handleChange('province', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Nama Dusun Posko</label>
                  <Input
                    value={formData.posko_dusun || ''}
                    onChange={(e) => handleChange('posko_dusun', e.target.value)}
                    placeholder="Contoh: Pringgasela Daye"
                    className="text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-charcoal block mb-1">Alamat Lengkap Posko</label>
                  <Input
                    value={formData.posko_address || ''}
                    onChange={(e) => handleChange('posko_address', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Tautan Lokasi Google Maps</label>
                <Input
                  value={formData.maps_url || ''}
                  onChange={(e) => handleChange('maps_url', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="text-xs font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section C: Periode KKN */}
          <Card className="bg-white">
            <CardHeader className="p-5 pb-3 border-b border-warm-200">
              <CardTitle className="text-sm font-serif font-semibold flex items-center gap-2 text-charcoal">
                <Calendar className="h-4 w-4 text-sage-700" />
                <span>C. Periode Waktu KKN</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Jadwal resmi tahapan persiapan, penerjunan lapangan, dan penarikan tim.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Tahap Persiapan</label>
                  <Input
                    type="date"
                    value={formData.prep_date || ''}
                    onChange={(e) => handleChange('prep_date', e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Tanggal Mulai Lapangan</label>
                  <Input
                    type="date"
                    value={formData.period_start || ''}
                    onChange={(e) => handleChange('period_start', e.target.value)}
                    className="text-xs"
                  />
                  {formErrors.period_start && (
                    <p className="text-[10px] text-red-600 mt-1">{formErrors.period_start}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Tanggal Selesai Lapangan</label>
                  <Input
                    type="date"
                    value={formData.period_end || ''}
                    onChange={(e) => handleChange('period_end', e.target.value)}
                    className="text-xs"
                  />
                  {formErrors.period_end && (
                    <p className="text-[10px] text-red-600 mt-1">{formErrors.period_end}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Tanggal Penarikan</label>
                  <Input
                    type="date"
                    value={formData.withdrawal_date || ''}
                    onChange={(e) => handleChange('withdrawal_date', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section D: Pembimbing & Posko */}
          <Card className="bg-white">
            <CardHeader className="p-5 pb-3 border-b border-warm-200">
              <CardTitle className="text-sm font-serif font-semibold flex items-center gap-2 text-charcoal">
                <Phone className="h-4 w-4 text-sage-700" />
                <span>D. Dosen Pembimbing (DPL) &amp; Informasi Posko</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Data resmi dosen pembimbing lapangan dan kontak darurat posko.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">Nama Lengkap DPL</label>
                  <Input
                    value={formData.dpl_name || ''}
                    onChange={(e) => handleChange('dpl_name', e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">NIP / NIDN DPL</label>
                  <Input
                    value={formData.dpl_nip || ''}
                    onChange={(e) => handleChange('dpl_nip', e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">Kontak Darurat Posko</label>
                  <Input
                    value={formData.emergency_contact || ''}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                    placeholder="Nomor telepon / WA posko"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Deskripsi Posko</label>
                <textarea
                  rows={2}
                  value={formData.posko_description || ''}
                  onChange={(e) => handleChange('posko_description', e.target.value)}
                  placeholder="Keterangan fasilitas posko..."
                  className="w-full p-2 border border-warm-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Catatan Khusus</label>
                <textarea
                  rows={2}
                  value={formData.important_notes || ''}
                  onChange={(e) => handleChange('important_notes', e.target.value)}
                  placeholder="Informasi penting bagi seluruh anggota..."
                  className="w-full p-2 border border-warm-300 rounded text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-charcoal-muted">
              Terakhir diperbarui:{' '}
              {settings?.updated_at
                ? new Date(settings.updated_at).toLocaleString('id-ID')
                : 'Belum pernah'}
            </span>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? 'Menyimpan...' : 'Simpan Semua Konfigurasi'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

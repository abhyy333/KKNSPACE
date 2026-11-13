import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchSurveyForms,
  createSurveyForm,
  updateSurveyFormStatus,
  fetchSurveyResponses,
  fetchSurveyResponseById,
  submitSurveyResponse,
  verifySurveyResponse,
  calculateSurveyStats,
  DUSUN_PRINGGASELA_SELATAN,
  PREDEFINED_SURVEY_TEMPLATES,
  type SurveyFormDetail,
  type SurveyResponseDetail,
} from '@/services/surveysApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  SurveyCategory,
  SurveyResponseStatus,
} from '@/types/database'
import {
  ClipboardList,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Eye,
  MapPin,
  Check,
  ShieldCheck,
  Building2,
  Store,
  Compass,
  Users2,
  Activity,
  FileCheck2,
} from 'lucide-react'

const CATEGORY_META: Record<SurveyCategory, { label: string; icon: any; color: string }> = {
  wilayah_dusun: { label: 'Profil Wilayah Dusun', icon: Building2, color: 'text-blue-700 bg-blue-50' },
  ekonomi_umkm: { label: 'Potensi UMKM Warga', icon: Store, color: 'text-emerald-700 bg-emerald-50' },
  potensi_desa: { label: 'Potensi Sumber Daya Desa', icon: Compass, color: 'text-sage-800 bg-sage-50' },
  kebutuhan_warga: { label: 'Aspirasi & Kebutuhan Warga', icon: Users2, color: 'text-amber-800 bg-amber-50' },
  posyandu_agregat: { label: 'Rekap Posyandu (Agregat)', icon: Activity, color: 'text-rose-700 bg-rose-50' },
  lainnya: { label: 'Survei Khusus', icon: ClipboardList, color: 'text-charcoal bg-warm-100' },
}

const RESPONSE_STATUS_META: Record<
  SurveyResponseStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'warning' },
  submitted: { label: 'Menunggu Verifikasi', variant: 'secondary' },
  verified: { label: 'Terverifikasi Sah', variant: 'success' },
  archived: { label: 'Diarsipkan', variant: 'outline' },
}

export const SurveysPage: React.FC = () => {
  const { isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()

  const canManage = isSuperAdmin || membership?.role === 'ketua' || membership?.role === 'sekretaris'

  const [activeTab, setActiveTab] = useState<'forms' | 'responses' | 'analytics'>('forms')
  const [selectedCategory, setSelectedCategory] = useState<SurveyCategory | 'all'>('all')
  const [selectedDusun, setSelectedDusun] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<SurveyResponseStatus | 'all'>('all')

  // Modals
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false)
  const [answeringForm, setAnsweringForm] = useState<SurveyFormDetail | null>(null)
  const [viewingResponseId, setViewingResponseId] = useState<string | null>(null)

  // Queries
  const {
    data: forms = [],
    isLoading: isLoadingForms,
    isFetching: isFetchingForms,
    refetch: refetchForms,
  } = useQuery({
    queryKey: ['survey-forms', selectedCategory],
    queryFn: () => fetchSurveyForms({ category: selectedCategory }),
  })

  const {
    data: responses = [],
    isLoading: isLoadingResponses,
    refetch: refetchResponses,
  } = useQuery({
    queryKey: ['survey-responses', selectedCategory, selectedDusun, selectedStatus],
    queryFn: () =>
      fetchSurveyResponses({
        category: selectedCategory,
        dusun: selectedDusun,
        status: selectedStatus,
      }),
  })

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['survey-stats'],
    queryFn: calculateSurveyStats,
  })

  const { data: activeResponseDetail, refetch: refetchResponseDetail } = useQuery({
    queryKey: ['survey-response-detail', viewingResponseId],
    queryFn: () => (viewingResponseId ? fetchSurveyResponseById(viewingResponseId) : null),
    enabled: Boolean(viewingResponseId),
  })

  // Export to CSV
  const handleExportCSV = () => {
    if (responses.length === 0) {
      toast({ title: 'Tidak Ada Data untuk Diekspor', variant: 'error' })
      return
    }

    const headers = ['ID', 'Kategori', 'Judul Formulir', 'Dusun', 'Responden/Subjek', 'Status', 'Pengumpul', 'Tanggal Pengumpulan']
    const rows = responses.map((r) => [
      r.id,
      r.form?.category || '-',
      `"${(r.form?.title || '').replace(/"/g, '""')}"`,
      r.dusun || '-',
      `"${(r.respondent_name || '-').replace(/"/g, '""')}"`,
      r.status,
      r.submitter?.full_name || '-',
      new Date(r.created_at).toLocaleDateString('id-ID'),
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `rekapitulasi_survei_kkn_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-600 text-sage-800 bg-sage-50">
              Operasional Lapangan
            </Badge>
            <span className="text-xs text-charcoal-muted">Instrumen Pendataan Desa</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Survei &amp; Pendataan Lapangan Desa
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pengumpulan data kondisi dusun, profil pelaku UMKM, pemetaan potensi desa, kebutuhan warga, dan agregat posyandu.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchForms()
              refetchResponses()
              refetchStats()
            }}
            disabled={isFetchingForms}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingForms ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <Button size="sm" variant="outline" onClick={handleExportCSV} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsCreateFormModalOpen(true)}
              className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Formulir Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Total Formulir</p>
              <p className="text-base font-bold text-charcoal">{stats?.totalForms || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Formulir Aktif</p>
              <p className="text-base font-bold text-emerald-700">{stats?.activeForms || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Data Terkumpul</p>
              <p className="text-base font-bold text-charcoal">{stats?.totalResponses || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Draft / Review</p>
              <p className="text-base font-bold text-amber-700">
                {(stats?.totalResponses || 0) - (stats?.verifiedResponses || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white col-span-2 lg:col-span-1">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Terverifikasi Sah</p>
              <p className="text-base font-bold text-sage-800">{stats?.verifiedResponses || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-warm-200/60 rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'forms' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Instrumen Formulir ({forms.length})
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'responses' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Hasil Pengumpulan Data ({responses.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'analytics' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Rekapitulasi Wilayah &amp; Dusun
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab !== 'analytics' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="text-xs h-9 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="all">Semua Kategori</option>
              <option value="wilayah_dusun">Profil Dusun</option>
              <option value="ekonomi_umkm">Potensi UMKM</option>
              <option value="potensi_desa">Potensi Desa</option>
              <option value="kebutuhan_warga">Kebutuhan Warga</option>
              <option value="posyandu_agregat">Posyandu Agregat</option>
            </select>
          )}

          {activeTab === 'responses' && (
            <>
              <select
                value={selectedDusun}
                onChange={(e) => setSelectedDusun(e.target.value)}
                className="text-xs h-9 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="all">Semua Dusun</option>
                {DUSUN_PRINGGASELA_SELATAN.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="text-xs h-9 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Menunggu Verifikasi</option>
                <option value="verified">Terverifikasi</option>
                <option value="draft">Draft</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: FORMULIR SURVEI */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          {isLoadingForms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : forms.length === 0 ? (
            <Card className="border-dashed border-warm-300 bg-white">
              <CardContent className="p-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-charcoal">
                    Belum Ada Formulir Survei
                  </h3>
                  <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                    Pilih salah satu dari 5 template survei resmi KKN untuk mulai mengumpulkan data lapangan.
                  </p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => setIsCreateFormModalOpen(true)}
                    className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Pilih Template Survei</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => {
                const catMeta = CATEGORY_META[form.category] || CATEGORY_META.lainnya
                const Icon = catMeta.icon

                return (
                  <Card
                    key={form.id}
                    className="bg-white hover:border-sage-400 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${catMeta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{catMeta.label}</span>
                        </span>

                        <Badge
                          variant={form.status === 'active' ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {form.status === 'active' ? 'Aktif' : form.status === 'draft' ? 'Draft' : 'Ditutup'}
                        </Badge>
                      </div>

                      <CardTitle className="text-sm font-serif font-semibold text-charcoal mt-2 line-clamp-1">
                        {form.title}
                      </CardTitle>
                      {form.description && (
                        <CardDescription className="text-xs line-clamp-2">
                          {form.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3">
                      <div className="p-2.5 rounded-lg border border-warm-200 bg-warm-50/60 text-xs flex items-center justify-between">
                        <span className="text-charcoal-muted">Pertanyaan: {form.fields?.length || 0} Butir</span>
                        <span className="font-semibold text-sage-900">
                          {form.response_count || 0} Data Masuk
                        </span>
                      </div>

                      {form.target_dusun && (
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                          <MapPin className="h-3 w-3 text-sage-700 shrink-0" />
                          <span className="truncate">Wilayah: {form.target_dusun}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-warm-200 flex items-center justify-between gap-2">
                        {form.status === 'active' && (
                          <Button
                            size="sm"
                            onClick={() => setAnsweringForm(form)}
                            className="w-full text-xs h-7 bg-sage-700 hover:bg-sage-800 text-white"
                          >
                            Isi Data Survei Ini
                          </Button>
                        )}

                        {canManage && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const nextStatus = form.status === 'active' ? 'closed' : 'active'
                              await updateSurveyFormStatus(form.id, nextStatus)
                              refetchForms()
                            }}
                            className="text-xs h-7 shrink-0 text-charcoal-muted"
                          >
                            {form.status === 'active' ? 'Tutup' : 'Aktifkan'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HASIL PENGUMPULAN DATA */}
      {activeTab === 'responses' && (
        <Card className="bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-serif">Data Lapangan Terkumpul</CardTitle>
            <CardDescription className="text-xs">
              Daftar respons formulir survei yang dicatat oleh anggota tim di lapangan.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-2">
            {isLoadingResponses ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : responses.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-8">
                Belum ada data pengumpulan survei yang sesuai filter.
              </p>
            ) : (
              <div className="space-y-2.5">
                {responses.map((resp) => {
                  const statusMeta = RESPONSE_STATUS_META[resp.status] || RESPONSE_STATUS_META.submitted

                  return (
                    <div
                      key={resp.id}
                      className="p-3 rounded-lg border border-warm-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-warm-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">
                            {resp.form?.title || 'Formulir Survei'}
                          </span>
                          <Badge variant={statusMeta.variant} className="text-[10px]">
                            {statusMeta.label}
                          </Badge>
                        </div>

                        <p className="text-charcoal-muted">
                          Lokasi Dusun: <span className="font-medium text-charcoal">{resp.dusun || '-'}</span>
                          {resp.respondent_name && (
                            <>
                              {' '}· Subjek / Responden:{' '}
                              <span className="font-medium text-charcoal">{resp.respondent_name}</span>
                            </>
                          )}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-charcoal-muted">
                          <span>Pengumpul: {resp.submitter?.full_name || 'Anggota Tim'}</span>
                          <span>Waktu: {new Date(resp.created_at).toLocaleString('id-ID')}</span>
                          {resp.verified_by && (
                            <span className="text-emerald-700 font-medium">
                              Diverifikasi oleh: {resp.verifier?.full_name || 'Pengurus'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingResponseId(resp.id)}
                          className="text-xs h-7 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat Jawaban</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: REKAPITULASI & STATISTIK DUSUN */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Breakdown by Dusun */}
            <Card className="bg-white">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-serif">
                  Distribusi Pengumpulan per Dusun
                </CardTitle>
                <CardDescription className="text-xs">
                  Jumlah entri data survei yang berhasil dikumpulkan di 7 Dusun Desa Pringgasela Selatan.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="space-y-2.5">
                  {DUSUN_PRINGGASELA_SELATAN.map((dusun) => {
                    const count = stats?.byDusun?.[dusun] || 0
                    const total = stats?.totalResponses || 1
                    const percentage = Math.round((count / (total || 1)) * 100)

                    return (
                      <div key={dusun} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-charcoal">{dusun}</span>
                          <span className="font-mono text-charcoal-muted">
                            {count} Entri ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-warm-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-sage-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (count / (total || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Breakdown by Category */}
            <Card className="bg-white">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-serif">
                  Distribusi Instrumen Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Cakupan bidang pendataan yang dihimpun tim KKN.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="space-y-3">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = stats?.byCategory?.[key] || 0
                    const Icon = meta.icon
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-warm-200 bg-warm-50/50 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`p-1.5 rounded ${meta.color}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium text-charcoal">{meta.label}</span>
                        </div>
                        <span className="font-mono font-semibold text-charcoal">{count} Data</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE FORM (TEMPLATE PICKER) */}
      {isCreateFormModalOpen && (
        <CreateSurveyFormModal
          open={isCreateFormModalOpen}
          onClose={() => setIsCreateFormModalOpen(false)}
          onSuccess={() => {
            setIsCreateFormModalOpen(false)
            refetchForms()
            refetchStats()
          }}
        />
      )}

      {/* MODAL 2: FILL SURVEY RESPONSE */}
      {answeringForm && (
        <FillSurveyModal
          open={Boolean(answeringForm)}
          onClose={() => setAnsweringForm(null)}
          form={answeringForm}
          onSuccess={() => {
            setAnsweringForm(null)
            refetchResponses()
            refetchStats()
            refetchForms()
          }}
        />
      )}

      {/* MODAL 3: VIEW & VERIFY RESPONSE */}
      {viewingResponseId && (
        <ViewResponseModal
          open={Boolean(viewingResponseId)}
          onClose={() => setViewingResponseId(null)}
          response={activeResponseDetail}
          canManage={canManage}
          onSuccess={() => {
            refetchResponseDetail()
            refetchResponses()
            refetchStats()
          }}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Create Survey Form with Template Picker
// -------------------------------------------------------------
interface CreateSurveyFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateSurveyFormModal: React.FC<CreateSurveyFormModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('profil_dusun')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDusun, setTargetDusun] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = PREDEFINED_SURVEY_TEMPLATES.find((t) => t.key === selectedTemplateKey)

  React.useEffect(() => {
    if (selectedTemplate) {
      setTitle(selectedTemplate.title)
      setDescription(selectedTemplate.description)
    }
  }, [selectedTemplateKey, selectedTemplate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selectedTemplate) return

    setIsSubmitting(true)
    try {
      await createSurveyForm({
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedTemplate.category,
        target_dusun: targetDusun !== 'all' ? targetDusun : undefined,
        template_key: selectedTemplate.key,
        fields: selectedTemplate.fields,
      })
      toast({ title: 'Formulir Survei Berhasil Dibuat', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Membuat Formulir', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Buat Instrumen Formulir Survei Baru" maxWidthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-charcoal block mb-1.5">
            Pilih Template Survei Resmi
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PREDEFINED_SURVEY_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.key}
                onClick={() => setSelectedTemplateKey(tmpl.key)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplateKey === tmpl.key
                    ? 'border-sage-600 bg-sage-50/70 shadow-xs'
                    : 'border-warm-200 bg-white hover:border-warm-300'
                }`}
              >
                <p className="font-semibold text-charcoal">{tmpl.title}</p>
                <p className="text-[11px] text-charcoal-muted line-clamp-2 mt-1">
                  {tmpl.description}
                </p>
                <span className="text-[10px] text-sage-800 font-medium mt-2 inline-block">
                  {tmpl.fields.length} Butir Pertanyaan
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Judul Formulir *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Target Wilayah Dusun</label>
            <select
              value={targetDusun}
              onChange={(e) => setTargetDusun(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="all">Seluruh 7 Dusun (Desa Pringgasela Selatan)</option>
              {DUSUN_PRINGGASELA_SELATAN.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi &amp; Panduan Petugas</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        {selectedTemplate && (
          <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-2">
            <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wider">
              Pratinjau Butir Pertanyaan Template:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedTemplate.fields.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] text-charcoal-muted py-0.5">
                  <span className="truncate">
                    {i + 1}. {f.label}
                  </span>
                  <span className="text-[10px] uppercase font-mono shrink-0 ml-2">
                    {f.field_type} {f.required ? '*' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Membuat Formulir...' : 'Aktifkan Formulir'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Fill Survey Response (Pengisian Data Lapangan)
// -------------------------------------------------------------
interface FillSurveyModalProps {
  open: boolean
  onClose: () => void
  form: SurveyFormDetail
  onSuccess: () => void
}

const FillSurveyModal: React.FC<FillSurveyModalProps> = ({ open, onClose, form, onSuccess }) => {
  const { toast } = useToast()
  const [dusun, setDusun] = useState(form.target_dusun || 'Pringgasela Daye')
  const [respondentName, setRespondentName] = useState('')
  const [locationDetails, setLocationDetails] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFieldChange = (fieldId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: val }))
  }

  const handleSave = async (statusToSet: SurveyResponseStatus) => {
    setIsSubmitting(true)
    try {
      const formattedAnswers = form.fields.map((field) => {
        const val = answers[field.id]
        if (Array.isArray(val)) {
          return { field_id: field.id, answer_json: val, answer_text: val.join(', ') }
        }
        return { field_id: field.id, answer_text: val != null ? String(val) : null }
      })

      await submitSurveyResponse({
        form_id: form.id,
        dusun,
        respondent_name: respondentName.trim() || undefined,
        location_details: locationDetails.trim() || undefined,
        notes: notes.trim() || undefined,
        status: statusToSet,
        answers: formattedAnswers,
      })

      toast({
        title: statusToSet === 'verified' ? 'Data Lapangan Dikirim' : 'Draft Survei Tersimpan',
        description: 'Respons berhasil dicatat ke dalam database KKN SPACE.',
        variant: 'success',
      })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan Survei', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pengisian Data: ${form.title}`} maxWidthClass="max-w-2xl">
      <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Dusun Penempatan *</label>
            <select
              value={dusun}
              onChange={(e) => setDusun(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
              required
            >
              {DUSUN_PRINGGASELA_SELATAN.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">
              Nama Responden / Subjek Usaha (Opsional)
            </label>
            <Input
              placeholder="Contoh: Bapak Sahdan / Ibu Mariani"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Titik Lokasi / Alamat Spesifik</label>
          <Input
            placeholder="Contoh: RT 03 Dusun Pringgasela Daye (Dekat Masjid At-Taqwa)"
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-3 pt-2 border-t border-warm-200">
          <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wider">
            Daftar Pertanyaan Survei:
          </p>

          {form.fields.map((field, idx) => (
            <div key={field.id} className="p-3 rounded-lg border border-warm-200 bg-warm-50/40 space-y-1.5">
              <label className="font-semibold text-charcoal block">
                {idx + 1}. {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              {field.field_type === 'text' && (
                <Input
                  value={answers[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="text-xs bg-white"
                />
              )}

              {field.field_type === 'number' && (
                <Input
                  type="number"
                  value={answers[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="text-xs bg-white font-mono"
                />
              )}

              {field.field_type === 'long_text' && (
                <textarea
                  rows={2}
                  value={answers[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded text-xs bg-white"
                />
              )}

              {field.field_type === 'single_choice' && (
                <select
                  value={answers[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full text-xs h-9 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
                >
                  <option value="">-- Pilih salah satu --</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.field_type === 'multiple_choice' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(field.options || []).map((opt) => {
                    const currentSelected: string[] = answers[field.id] || []
                    const isChecked = currentSelected.includes(opt)
                    return (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer text-[11px] text-charcoal">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFieldChange(field.id, [...currentSelected, opt])
                            } else {
                              handleFieldChange(
                                field.id,
                                currentSelected.filter((item) => item !== opt)
                              )
                            }
                          }}
                          className="rounded border-warm-300 text-sage-600 focus:ring-sage-500"
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Tambahan Petugas</label>
          <textarea
            rows={2}
            placeholder="Catatan observasi lapangan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isSubmitting}
          >
            Simpan Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSave('submitted')}
            disabled={isSubmitting}
            className="bg-sage-700 hover:bg-sage-800 text-white"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Hasil Survei'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: View & Verify Survey Response
// -------------------------------------------------------------
interface ViewResponseModalProps {
  open: boolean
  onClose: () => void
  response: SurveyResponseDetail | null | undefined
  canManage: boolean
  onSuccess: () => void
}

const ViewResponseModal: React.FC<ViewResponseModalProps> = ({
  open,
  onClose,
  response,
  canManage,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [verificationNotes, setVerificationNotes] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  if (!open) return null

  const handleVerify = async (verified: boolean) => {
    if (!response) return
    setIsVerifying(true)
    try {
      await verifySurveyResponse(response.id, verified, verificationNotes)
      toast({
        title: verified ? 'Data Survei Telah Diverifikasi' : 'Status Dikembalikan ke Draft',
        variant: 'success',
      })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Verifikasi', description: err.message, variant: 'error' })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Detail Hasil Pengumpulan Data Lapangan" maxWidthClass="max-w-2xl">
      {!response ? (
        <div className="p-8 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      ) : (
        <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-charcoal">{response.form?.title}</span>
              <Badge variant={RESPONSE_STATUS_META[response.status].variant}>
                {RESPONSE_STATUS_META[response.status].label}
              </Badge>
            </div>
            <p className="text-charcoal-muted">
              Dusun: <span className="font-semibold text-charcoal">{response.dusun || '-'}</span>
              {response.respondent_name && (
                <> · Responden: <span className="font-semibold text-charcoal">{response.respondent_name}</span></>
              )}
            </p>
            <p className="text-[11px] text-charcoal-muted">
              Pengumpul: {response.submitter?.full_name || 'Anggota Tim'} · Waktu:{' '}
              {new Date(response.created_at).toLocaleString('id-ID')}
            </p>
          </div>

          {/* Answers */}
          <div className="space-y-2.5">
            <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wider">
              Jawaban Responden:
            </p>
            {response.answers?.map((ans, idx) => (
              <div key={ans.id} className="p-3 rounded-lg border border-warm-200 bg-white space-y-1">
                <p className="font-semibold text-charcoal">
                  {idx + 1}. {ans.field?.label || 'Pertanyaan'}
                </p>
                <p className="text-charcoal-muted whitespace-pre-wrap font-sans bg-warm-50 p-2 rounded">
                  {ans.answer_text || (ans.answer_json ? JSON.stringify(ans.answer_json) : '-')}
                </p>
              </div>
            ))}
          </div>

          {/* Verification Box for Leads */}
          {canManage && response.status !== 'verified' && (
            <div className="rounded-lg border border-sage-300 bg-sage-50/60 p-3 space-y-2">
              <p className="font-semibold text-charcoal flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sage-800" />
                <span>Panel Verifikasi Pengurus Posko</span>
              </p>
              <textarea
                rows={2}
                placeholder="Catatan verifikasi atau rekomendasi tindak lanjut..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full p-2 border border-warm-300 rounded text-xs bg-white"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => handleVerify(true)}
                  disabled={isVerifying}
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Verifikasi Data Sah
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-warm-200">
            <Button size="sm" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

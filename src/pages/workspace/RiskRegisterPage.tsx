import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchKknRisks,
  createKknRisk,
  updateKknRisk,
  deleteKknRisk,
  type CreateRiskInput,
  type UpdateRiskInput,
} from '@/services/risksApi'
import { fetchTeamDirectory } from '@/services/membersApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  KknRisk,
  RiskCategory,
  RiskLikelihood,
  RiskImpact,
  RiskPriority,
  RiskStatus,
} from '@/types/database'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Download,
  Edit2,
  Trash2,
  User,
  Calendar,
  Layers,
} from 'lucide-react'

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  operasional: 'Operasional & Lapangan',
  keuangan: 'Keuangan & Kas',
  logistik: 'Logistik & Inventaris',
  program_kerja: 'Program Kerja',
  koordinasi: 'Koordinasi / Kemitraan',
  keselamatan: 'Kesehatan & K3',
  administrasi: 'Administrasi Posko',
}

const LIKELIHOOD_LABELS: Record<RiskLikelihood, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

const IMPACT_LABELS: Record<RiskImpact, string> = {
  low: 'Ringan',
  medium: 'Sedang',
  high: 'Besar',
}

const PRIORITY_META: Record<
  RiskPriority,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive'; colorClass: string }
> = {
  low: { label: 'Rendah', variant: 'success', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  medium: { label: 'Sedang', variant: 'warning', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  high: { label: 'Tinggi', variant: 'secondary', colorClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  critical: { label: 'Kritis', variant: 'destructive', colorClass: 'bg-red-100 text-red-800 border-red-300' },
}

const STATUS_META: Record<RiskStatus, { label: string; badgeVariant: 'warning' | 'secondary' | 'success' }> = {
  identified: { label: 'Teridentifikasi', badgeVariant: 'warning' },
  mitigating: { label: 'Dalam Mitigasi', badgeVariant: 'secondary' },
  monitoring: { label: 'Monitoring', badgeVariant: 'secondary' },
  resolved: { label: 'Terkendali / Selesai', badgeVariant: 'success' },
}

// Auto-determine priority from likelihood & impact
export function autoCalculatePriority(likelihood: RiskLikelihood, impact: RiskImpact): RiskPriority {
  if (likelihood === 'high' && impact === 'high') return 'critical'
  if ((likelihood === 'high' && impact === 'medium') || (likelihood === 'medium' && impact === 'high')) {
    return 'critical'
  }
  if ((likelihood === 'high' && impact === 'low') || (likelihood === 'medium' && impact === 'medium') || (likelihood === 'low' && impact === 'high')) {
    return 'high'
  }
  if ((likelihood === 'medium' && impact === 'low') || (likelihood === 'low' && impact === 'medium')) {
    return 'medium'
  }
  return 'low'
}

export const RiskRegisterPage: React.FC = () => {
  const { isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const canManage = isSuperAdmin || membership?.role === 'ketua' || membership?.role === 'sekretaris'

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [matrixFilter, setMatrixFilter] = useState<{ likelihood: RiskLikelihood; impact: RiskImpact } | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [riskToEdit, setRiskToEdit] = useState<KknRisk | null>(null)
  const [riskToDelete, setRiskToDelete] = useState<KknRisk | null>(null)

  // Queries
  const {
    data: risks = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['kkn-risks'],
    queryFn: fetchKknRisks,
  })

  const { data: directoryMembers = [] } = useQuery({
    queryKey: ['team-directory-members'],
    queryFn: fetchTeamDirectory,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createKknRisk,
    onSuccess: () => {
      toast({ title: 'Risiko Berhasil Dicatat', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['kkn-risks'] })
      setIsCreateModalOpen(false)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Mencatat Risiko', description: err.message, variant: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRiskInput }) => updateKknRisk(id, input),
    onSuccess: () => {
      toast({ title: 'Risiko Berhasil Diperbarui', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['kkn-risks'] })
      setRiskToEdit(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memperbarui Risiko', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteKknRisk,
    onSuccess: () => {
      toast({ title: 'Risiko Berhasil Dihapus', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['kkn-risks'] })
      setRiskToDelete(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menghapus Risiko', description: err.message, variant: 'error' })
    },
  })

  // Summary Metrics
  const totalRisks = risks.length
  const criticalHighCount = risks.filter((r) => r.priority === 'critical' || r.priority === 'high').length
  const activeMitigatingCount = risks.filter((r) => r.status === 'mitigating' || r.status === 'identified').length
  const resolvedCount = risks.filter((r) => r.status === 'resolved').length

  // Filtered List
  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      if (matrixFilter) {
        if (risk.likelihood !== matrixFilter.likelihood || risk.impact !== matrixFilter.impact) {
          return false
        }
      }
      if (selectedCategory !== 'all' && risk.category !== selectedCategory) return false
      if (selectedPriority !== 'all' && risk.priority !== selectedPriority) return false
      if (selectedStatus !== 'all' && risk.status !== selectedStatus) return false

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchTitle = risk.title.toLowerCase().includes(query)
        const matchDesc = risk.description?.toLowerCase().includes(query) || false
        const matchPic = risk.pic_profile?.full_name.toLowerCase().includes(query) || false
        const matchMitigation = risk.mitigation_strategy?.toLowerCase().includes(query) || false
        if (!matchTitle && !matchDesc && !matchPic && !matchMitigation) return false
      }

      return true
    })
  }, [risks, matrixFilter, selectedCategory, selectedPriority, selectedStatus, searchTerm])

  // Count risks per matrix cell [likelihood][impact]
  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of ['high', 'medium', 'low'] as RiskLikelihood[]) {
      for (const i of ['low', 'medium', 'high'] as RiskImpact[]) {
        counts[`${l}-${i}`] = 0
      }
    }
    for (const r of risks) {
      const key = `${r.likelihood}-${r.impact}`
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [risks])

  // CSV Export
  const handleExportCSV = () => {
    if (risks.length === 0) {
      toast({ title: 'Tidak ada data risiko untuk diekspor', variant: 'warning' })
      return
    }

    const headers = [
      'No',
      'Judul Risiko',
      'Kategori',
      'Probabilitas',
      'Dampak',
      'Tingkat Prioritas',
      'Status',
      'PIC Penanggung Jawab',
      'Tenggat Waktu',
      'Strategi Mitigasi',
      'Tanggal Dibuat',
    ]

    const rows = filteredRisks.map((r, idx) => [
      String(idx + 1),
      `"${r.title.replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[r.category] || r.category}"`,
      LIKELIHOOD_LABELS[r.likelihood],
      IMPACT_LABELS[r.impact],
      PRIORITY_META[r.priority].label,
      STATUS_META[r.status].label,
      `"${(r.pic_profile?.full_name || 'Seluruh Tim').replace(/"/g, '""')}"`,
      r.target_date || '-',
      `"${(r.mitigation_strategy || '').replace(/"/g, '""')}"`,
      r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `risk-register-kkn-pringgasela-selatan-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({ title: 'Ekspor Risk Register Berhasil', variant: 'success' })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-red-600 text-red-800 bg-red-50">
              Operasional &amp; Kontingensi
            </Badge>
            <span className="text-xs text-charcoal-muted">Sistem Manajemen Risiko Posko</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Risk Register &amp; Matriks Risiko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Identifikasi dini potensi hambatan proker, analisis matriks 3x3 (Kemungkinan vs Dampak), dan rencana mitigasi tim KKN.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs gap-1.5"
            title="Ekspor CSV Risk Register"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>

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

          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Risiko Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Total Risiko Tercatat</p>
              <p className="text-lg font-bold text-charcoal">{totalRisks}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Risiko Kritis &amp; Tinggi</p>
              <p className="text-lg font-bold text-red-700">{criticalHighCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Sedang Dalam Mitigasi</p>
              <p className="text-lg font-bold text-blue-700">{activeMitigatingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Terkendali / Selesai</p>
              <p className="text-lg font-bold text-emerald-700">{resolvedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3x3 Risk Matrix (Kemungkinan vs Dampak) */}
      <Card className="bg-white border-warm-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-charcoal flex items-center gap-2">
              <Layers className="h-4 w-4 text-sage-700" />
              <span>Matriks Risiko 3×3 (Probabilitas vs Dampak)</span>
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted mt-0.5">
              Klik pada kotak matriks untuk menyaring risiko berdasarkan tingkat keparahannya.
            </CardDescription>
          </div>
          {matrixFilter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMatrixFilter(null)}
              className="text-xs h-7 text-sage-800 border-sage-300 bg-sage-50"
            >
              Reset Filter Matriks ({LIKELIHOOD_LABELS[matrixFilter.likelihood]} × {IMPACT_LABELS[matrixFilter.impact]})
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[480px] max-w-2xl mx-auto">
              {/* Matrix Layout */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-stretch text-xs text-center">
                {/* Header row: Impact labels */}
                <div className="font-semibold text-charcoal-muted flex items-center justify-center text-[11px]">
                  Kemungkinan ↓ / Dampak →
                </div>
                <div className="font-semibold text-charcoal bg-warm-100 py-1.5 rounded text-[11px]">
                  Ringan (Minor)
                </div>
                <div className="font-semibold text-charcoal bg-warm-100 py-1.5 rounded text-[11px]">
                  Sedang (Moderate)
                </div>
                <div className="font-semibold text-charcoal bg-warm-100 py-1.5 rounded text-[11px]">
                  Besar (Major)
                </div>

                {/* Row 1: High Likelihood */}
                <div className="font-semibold text-charcoal bg-warm-100 py-3 rounded flex items-center justify-center text-[11px]">
                  Tinggi
                </div>
                {/* Cell: High - Low */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'low'
                        ? null
                        : { likelihood: 'high', impact: 'low' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'low'
                      ? 'ring-2 ring-orange-500 shadow-sm'
                      : ''
                  } bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    <span>Tinggi</span>
                    <span className="text-xs bg-orange-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['high-low'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-800 mt-2 font-medium">Prioritas Tinggi</div>
                </button>
                {/* Cell: High - Medium */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'medium'
                        ? null
                        : { likelihood: 'high', impact: 'medium' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'medium'
                      ? 'ring-2 ring-red-500 shadow-sm'
                      : ''
                  } bg-red-100 hover:bg-red-200 border-red-300 text-red-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-red-800">
                    <span>Kritis</span>
                    <span className="text-xs bg-red-300/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['high-medium'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-red-800 mt-2 font-medium">Prioritas Kritis</div>
                </button>
                {/* Cell: High - High */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'high'
                        ? null
                        : { likelihood: 'high', impact: 'high' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'high' && matrixFilter?.impact === 'high'
                      ? 'ring-2 ring-red-600 shadow-sm'
                      : ''
                  } bg-red-200 hover:bg-red-300 border-red-400 text-red-950 font-bold`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-red-900">
                    <span>Kritis Ekstrem</span>
                    <span className="text-xs bg-red-400/80 px-1.5 py-0.5 rounded-full text-white">
                      {matrixCounts['high-high'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-red-900 mt-2">Prioritas Kritis</div>
                </button>

                {/* Row 2: Medium Likelihood */}
                <div className="font-semibold text-charcoal bg-warm-100 py-3 rounded flex items-center justify-center text-[11px]">
                  Sedang
                </div>
                {/* Cell: Medium - Low */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'low'
                        ? null
                        : { likelihood: 'medium', impact: 'low' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'low'
                      ? 'ring-2 ring-amber-500 shadow-sm'
                      : ''
                  } bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <span>Sedang</span>
                    <span className="text-xs bg-amber-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['medium-low'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-800 mt-2 font-medium">Prioritas Sedang</div>
                </button>
                {/* Cell: Medium - Medium */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'medium'
                        ? null
                        : { likelihood: 'medium', impact: 'medium' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'medium'
                      ? 'ring-2 ring-orange-500 shadow-sm'
                      : ''
                  } bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    <span>Tinggi</span>
                    <span className="text-xs bg-orange-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['medium-medium'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-800 mt-2 font-medium">Prioritas Tinggi</div>
                </button>
                {/* Cell: Medium - High */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'high'
                        ? null
                        : { likelihood: 'medium', impact: 'high' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'medium' && matrixFilter?.impact === 'high'
                      ? 'ring-2 ring-red-500 shadow-sm'
                      : ''
                  } bg-red-100 hover:bg-red-200 border-red-300 text-red-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-red-800">
                    <span>Kritis</span>
                    <span className="text-xs bg-red-300/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['medium-high'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-red-800 mt-2 font-medium">Prioritas Kritis</div>
                </button>

                {/* Row 3: Low Likelihood */}
                <div className="font-semibold text-charcoal bg-warm-100 py-3 rounded flex items-center justify-center text-[11px]">
                  Rendah
                </div>
                {/* Cell: Low - Low */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'low'
                        ? null
                        : { likelihood: 'low', impact: 'low' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'low'
                      ? 'ring-2 ring-emerald-500 shadow-sm'
                      : ''
                  } bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <span>Rendah</span>
                    <span className="text-xs bg-emerald-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['low-low'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-2 font-medium">Prioritas Rendah</div>
                </button>
                {/* Cell: Low - Medium */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'medium'
                        ? null
                        : { likelihood: 'low', impact: 'medium' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'medium'
                      ? 'ring-2 ring-amber-500 shadow-sm'
                      : ''
                  } bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <span>Sedang</span>
                    <span className="text-xs bg-amber-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['low-medium'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-800 mt-2 font-medium">Prioritas Sedang</div>
                </button>
                {/* Cell: Low - High */}
                <button
                  type="button"
                  onClick={() =>
                    setMatrixFilter(
                      matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'high'
                        ? null
                        : { likelihood: 'low', impact: 'high' }
                    )
                  }
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    matrixFilter?.likelihood === 'low' && matrixFilter?.impact === 'high'
                      ? 'ring-2 ring-orange-500 shadow-sm'
                      : ''
                  } bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-950`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    <span>Tinggi</span>
                    <span className="text-xs bg-orange-200/80 px-1.5 py-0.5 rounded-full">
                      {matrixCounts['low-high'] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-800 mt-2 font-medium">Prioritas Tinggi</div>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-warm-200">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-charcoal-muted" />
          <Input
            placeholder="Cari nama risiko, strategi mitigasi, atau PIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-9 bg-warm-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal"
          >
            <option value="all">Semua Prioritas</option>
            <option value="critical">Kritis</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal"
          >
            <option value="all">Semua Status</option>
            <option value="identified">Teridentifikasi</option>
            <option value="mitigating">Dalam Mitigasi</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Tuntas / Terkendali</option>
          </select>

          {(selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all' || searchTerm || matrixFilter) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedPriority('all')
                setSelectedStatus('all')
                setSearchTerm('')
                setMatrixFilter(null)
              }}
              className="text-xs h-8 text-charcoal-muted hover:text-charcoal"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Risk Items List / Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredRisks.length === 0 ? (
        <Card className="border-dashed border-warm-300 bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-charcoal">Belum Ada Catatan Risiko</h3>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                {searchTerm || matrixFilter || selectedCategory !== 'all'
                  ? 'Tidak ada risiko yang sesuai dengan filter pencarian Anda.'
                  : 'Seluruh potensi kendala operasional, finansial, dan K3 posko dapat dipetakan di sini.'}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Risiko Pertama</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRisks.map((risk) => {
            const priorityMeta = PRIORITY_META[risk.priority]
            const statusMeta = STATUS_META[risk.status]

            return (
              <div
                key={risk.id}
                className="bg-white rounded-lg border border-warm-200 p-4 hover:border-sage-400 transition-colors shadow-2xs space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-charcoal">{risk.title}</span>
                      <Badge variant="outline" className="text-[10px] text-charcoal-muted border-warm-300">
                        {CATEGORY_LABELS[risk.category] || risk.category}
                      </Badge>
                      <Badge variant={priorityMeta.variant} className="text-[10px]">
                        Prioritas {priorityMeta.label}
                      </Badge>
                      <Badge variant={statusMeta.badgeVariant} className="text-[10px]">
                        {statusMeta.label}
                      </Badge>
                    </div>

                    {risk.description && (
                      <p className="text-xs text-charcoal-muted leading-relaxed whitespace-pre-wrap">
                        {risk.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                    {canManage && (
                      <select
                        value={risk.status}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: risk.id,
                            input: { status: e.target.value as RiskStatus },
                          })
                        }
                        className="text-[11px] h-7 px-2 rounded border border-warm-300 bg-white text-charcoal font-medium"
                      >
                        <option value="identified">Teridentifikasi</option>
                        <option value="mitigating">Dalam Mitigasi</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="resolved">Tuntas / Terkendali</option>
                      </select>
                    )}

                    {canManage && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRiskToEdit(risk)}
                          className="h-7 w-7 text-charcoal-muted hover:text-sage-700"
                          title="Edit Risiko"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRiskToDelete(risk)}
                          className="h-7 w-7 text-charcoal-muted hover:text-red-600"
                          title="Hapus Risiko"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mitigation strategy block */}
                {risk.mitigation_strategy && (
                  <div className="p-2.5 rounded bg-warm-50 border border-warm-200 text-xs space-y-1">
                    <span className="font-semibold text-charcoal text-[11px] flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-sage-700" />
                      Strategi Mitigasi &amp; Kontingensi:
                    </span>
                    <p className="text-charcoal-muted leading-relaxed whitespace-pre-wrap pl-4">
                      {risk.mitigation_strategy}
                    </p>
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-warm-100 text-xs text-charcoal-muted">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-sage-700" />
                      <span>
                        PIC: <strong className="text-charcoal">{risk.pic_profile?.full_name || 'Seluruh Tim Posko'}</strong>
                      </span>
                    </div>

                    {risk.target_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-sage-700" />
                        <span>
                          Target: <strong className="text-charcoal">{risk.target_date}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-warm-100 text-charcoal-muted">
                      Probabilitas: <strong>{LIKELIHOOD_LABELS[risk.likelihood]}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-warm-100 text-charcoal-muted">
                      Dampak: <strong>{IMPACT_LABELS[risk.impact]}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Risk Modal */}
      <RiskFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data)
        }}
        isSubmitting={createMutation.isPending}
        directoryMembers={directoryMembers}
        title="Catat Risiko Baru Posko"
      />

      {/* Edit Risk Modal */}
      <RiskFormModal
        open={Boolean(riskToEdit)}
        onClose={() => setRiskToEdit(null)}
        initialRisk={riskToEdit}
        onSubmit={async (data) => {
          if (riskToEdit) {
            await updateMutation.mutateAsync({ id: riskToEdit.id, input: data })
          }
        }}
        isSubmitting={updateMutation.isPending}
        directoryMembers={directoryMembers}
        title="Edit Catatan Risiko Posko"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(riskToDelete)}
        onClose={() => setRiskToDelete(null)}
        onConfirm={async () => {
          if (riskToDelete) {
            await deleteMutation.mutateAsync(riskToDelete.id)
          }
        }}
        title="Hapus Catatan Risiko?"
        description={`Apakah Anda yakin ingin menghapus risiko "${riskToDelete?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Risiko"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// -------------------------------------------------------------
// Risk Form Modal Sub-Component (Create & Edit)
// -------------------------------------------------------------
interface RiskFormModalProps {
  open: boolean
  onClose: () => void
  initialRisk?: KknRisk | null
  onSubmit: (input: CreateRiskInput) => Promise<void>
  isSubmitting: boolean
  directoryMembers: any[]
  title: string
}

const RiskFormModal: React.FC<RiskFormModalProps> = ({
  open,
  onClose,
  initialRisk,
  onSubmit,
  isSubmitting,
  directoryMembers,
  title,
}) => {
  const [riskTitle, setRiskTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RiskCategory>('operasional')
  const [likelihood, setLikelihood] = useState<RiskLikelihood>('medium')
  const [impact, setImpact] = useState<RiskImpact>('medium')
  const [priority, setPriority] = useState<RiskPriority>('medium')
  const [picUserId, setPicUserId] = useState<string>('')
  const [mitigationStrategy, setMitigationStrategy] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [status, setStatus] = useState<RiskStatus>('identified')

  React.useEffect(() => {
    if (initialRisk) {
      setRiskTitle(initialRisk.title || '')
      setDescription(initialRisk.description || '')
      setCategory(initialRisk.category || 'operasional')
      setLikelihood(initialRisk.likelihood || 'medium')
      setImpact(initialRisk.impact || 'medium')
      setPriority(initialRisk.priority || 'medium')
      setPicUserId(initialRisk.pic_user_id || '')
      setMitigationStrategy(initialRisk.mitigation_strategy || '')
      setTargetDate(initialRisk.target_date || '')
      setStatus(initialRisk.status || 'identified')
    } else {
      setRiskTitle('')
      setDescription('')
      setCategory('operasional')
      setLikelihood('medium')
      setImpact('medium')
      setPriority(autoCalculatePriority('medium', 'medium'))
      setPicUserId('')
      setMitigationStrategy('')
      setTargetDate('')
      setStatus('identified')
    }
  }, [initialRisk, open])

  // Auto update priority when likelihood or impact changes
  const handleLikelihoodChange = (val: RiskLikelihood) => {
    setLikelihood(val)
    setPriority(autoCalculatePriority(val, impact))
  }

  const handleImpactChange = (val: RiskImpact) => {
    setImpact(val)
    setPriority(autoCalculatePriority(likelihood, val))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!riskTitle.trim()) return

    await onSubmit({
      title: riskTitle.trim(),
      description: description.trim() || undefined,
      category,
      likelihood,
      impact,
      priority,
      pic_user_id: picUserId || null,
      mitigation_strategy: mitigationStrategy.trim() || undefined,
      target_date: targetDate || null,
      status,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-charcoal block mb-1">Judul Risiko *</label>
          <Input
            value={riskTitle}
            onChange={(e) => setRiskTitle(e.target.value)}
            placeholder="Contoh: Keterlambatan logistik spanduk untuk seminar desa"
            required
            className="text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Kategori Risiko</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RiskCategory)}
              className="w-full p-2 border border-warm-300 rounded text-xs bg-white text-charcoal"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Status Penanganan</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RiskStatus)}
              className="w-full p-2 border border-warm-300 rounded text-xs bg-white text-charcoal"
            >
              <option value="identified">Teridentifikasi</option>
              <option value="mitigating">Dalam Mitigasi</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Tuntas / Terkendali</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi Konteks Risiko</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Penyebab dan potensi hambatan yang dihadapi..."
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        {/* 3x3 Evaluation Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded bg-warm-50 border border-warm-200">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Probabilitas</label>
            <select
              value={likelihood}
              onChange={(e) => handleLikelihoodChange(e.target.value as RiskLikelihood)}
              className="w-full p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal font-medium"
            >
              <option value="low">Rendah (Low)</option>
              <option value="medium">Sedang (Medium)</option>
              <option value="high">Tinggi (High)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Dampak (Impact)</label>
            <select
              value={impact}
              onChange={(e) => handleImpactChange(e.target.value as RiskImpact)}
              className="w-full p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal font-medium"
            >
              <option value="low">Ringan (Low)</option>
              <option value="medium">Sedang (Medium)</option>
              <option value="high">Besar (High)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Tingkat Prioritas</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RiskPriority)}
              className="w-full p-1.5 border border-warm-300 rounded text-xs bg-white text-charcoal font-bold"
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="critical">Kritis</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Rencana &amp; Strategi Mitigasi</label>
          <textarea
            rows={2}
            value={mitigationStrategy}
            onChange={(e) => setMitigationStrategy(e.target.value)}
            placeholder="Langkah nyata untuk mencegah atau mengatasi risiko ini..."
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">PIC Penanggung Jawab</label>
            <select
              value={picUserId}
              onChange={(e) => setPicUserId(e.target.value)}
              className="w-full p-2 border border-warm-300 rounded text-xs bg-white text-charcoal"
            >
              <option value="">Seluruh Tim / Posko</option>
              {directoryMembers.map((m) => (
                <option key={m.id} value={m.linked_user_id || m.id}>
                  {m.full_name} ({m.position_label || m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Target Penyelesaian</label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-sage-700 hover:bg-sage-800 text-white"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Risiko'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

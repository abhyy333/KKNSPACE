import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  formatRupiah,
  formatFinanceDate,
  computeExpenditureAnalytics,
  generateExpenditureAnalyticsCSV,
  type ExpenditureAnalytics,
} from '@/lib/finance'
import {
  PieChart,
  TrendingDown,
  Receipt,
  Store,
  Target,
  Eye,
  Edit2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingBag,
  Download,
  AlertCircle,
} from 'lucide-react'
import type {
  FinanceTransaction,
  FinanceCategory,
  WorkspaceMemberSummary,
  FileObject,
} from '@/types/database'
import type { FinanceAttachmentWithFile } from '@/services/financeApi'

interface FinanceExpenditureAnalyticsProps {
  transactions: FinanceTransaction[]
  categories: FinanceCategory[]
  workPrograms: Array<{ id: string; title: string }>
  membersById: Record<string, WorkspaceMemberSummary>
  attachmentsByTransaction: Record<string, FinanceAttachmentWithFile[]>
  currentCashBalance: number
  canManageClassification: boolean
  onOpenReclassifyModal: (tx: FinanceTransaction) => void
  onPreviewReceipt: (file: FileObject) => void
}

export const FinanceExpenditureAnalytics: React.FC<FinanceExpenditureAnalyticsProps> = ({
  transactions,
  categories,
  workPrograms,
  membersById,
  attachmentsByTransaction,
  currentCashBalance,
  canManageClassification,
  onOpenReclassifyModal,
  onPreviewReceipt,
}) => {
  const { toast } = useToast()

  // Filter States
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_30_days' | 'custom'>('all')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedRecorder, setSelectedRecorder] = useState<string>('all')
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  // Sub-tab view for details: 'category_table' | 'recipient_table'
  const [detailViewMode, setDetailViewMode] = useState<'category_table' | 'recipient_table'>('category_table')

  // Compute Makassar Date Range
  const dateRange = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())

    if (periodFilter === 'this_month') {
      const yearMonth = today.slice(0, 7)
      const [y, m] = yearMonth.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      return {
        startDate: `${yearMonth}-01`,
        endDate: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
        label: `Bulan Ini (${yearMonth})`,
      }
    }

    if (periodFilter === 'last_30_days') {
      const [y, m, d] = today.split('-').map(Number)
      const baseDate = new Date(Date.UTC(y, m - 1, d))
      const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 86_400_000)
      const start = thirtyDaysAgo.toISOString().split('T')[0]
      return {
        startDate: start,
        endDate: today,
        label: `30 Hari Terakhir (${formatFinanceDate(start)} – ${formatFinanceDate(today)})`,
      }
    }

    if (periodFilter === 'custom' && customStart && customEnd) {
      const start = customStart <= customEnd ? customStart : customEnd
      const end = customStart <= customEnd ? customEnd : customStart
      return {
        startDate: start,
        endDate: end,
        label: `Rentang Kustom (${formatFinanceDate(start)} – ${formatFinanceDate(end)})`,
      }
    }

    return undefined
  }, [periodFilter, customStart, customEnd])

  // Run Unified Expenditure Analytics
  const analytics: ExpenditureAnalytics = useMemo(() => {
    return computeExpenditureAnalytics({
      transactions,
      categories,
      programs: workPrograms,
      dateRange: dateRange ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : undefined,
      categoryIdFilter: selectedCategory,
      programIdFilter: selectedProgram,
      recordedByFilter: selectedRecorder,
      currentCashBalance,
    })
  }, [
    transactions,
    categories,
    workPrograms,
    dateRange,
    selectedCategory,
    selectedProgram,
    selectedRecorder,
    currentCashBalance,
  ])

  // Unique recipient list for dropdown filter
  const uniqueRecipients = useMemo(() => {
    const set = new Set<string>()
    for (const r of analytics.recipientDistribution) {
      if (!r.isUnspecified && r.recipientName) {
        set.add(r.recipientName)
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [analytics.recipientDistribution])

  // Categories map for lookups
  const categoryById = useMemo(() => {
    const map = new Map<string, FinanceCategory>()
    for (const c of categories) {
      map.set(c.id, c)
    }
    return map
  }, [categories])

  // Filtered expense transactions for table view
  const displayExpenses = useMemo(() => {
    return analytics.topExpensesList.filter((tx) => {
      // Recipient filter
      if (selectedRecipient !== 'all') {
        if (selectedRecipient === '__unspecified__') {
          if (tx.recipientOrVendor !== 'Belum ada rincian') return false
        } else if (tx.recipientOrVendor.toLowerCase() !== selectedRecipient.toLowerCase()) {
          return false
        }
      }

      // Filter matching search term
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        tx.description.toLowerCase().includes(term) ||
        tx.recipientOrVendor.toLowerCase().includes(term) ||
        tx.spendingPurpose.toLowerCase().includes(term) ||
        tx.categoryName.toLowerCase().includes(term)
      )
    })
  }, [analytics.topExpensesList, selectedRecipient, searchTerm])

  const toggleExpand = (id: string) => {
    setExpandedTxId((prev) => (prev === id ? null : id))
  }

  // Handle Export CSV
  const handleExportAnalyticsCSV = () => {
    if (analytics.expenseCount === 0) {
      toast({
        title: 'Tidak Ada Data Pengeluaran',
        description: 'Tidak ada transaksi pengeluaran pada filter yang dipilih.',
        variant: 'error',
      })
      return
    }

    try {
      const csvContent = generateExpenditureAnalyticsCSV({
        analytics,
        dateRangeLabel: dateRange?.label ?? 'Seluruh Transaksi KKN',
        expenses: displayExpenses.map((e) => ({
          id: e.id,
          transaction_date: e.transactionDate,
          category_id: categories.find((c) => c.name === e.categoryName)?.id || null,
          amount: e.amount,
          description: e.description,
          recipient_or_vendor: e.recipientOrVendor !== 'Belum ada rincian' ? e.recipientOrVendor : null,
          spending_purpose: e.spendingPurpose !== 'Belum ada rincian' ? e.spendingPurpose : null,
          recorded_by: e.recordedBy,
        })),
        categoriesById: categoryById,
        membersById,
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `Analisis_Pengeluaran_Kas_KKN_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Laporan Analisis Berhasil Diunduh',
        description: 'Berkas CSV analisis pengeluaran berhasil dibuat.',
        variant: 'success',
      })
    } catch (err: unknown) {
      toast({
        title: 'Gagal Mengunduh CSV',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mengekspor.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <PieChart className="h-5 w-5 text-rose-600" />
            <span>Analisis Pengeluaran Kas KKN</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Transparansi alokasi dana posko: uang paling banyak digunakan untuk apa dan dibayarkan kepada siapa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-warm-100 p-1 rounded-lg border border-warm-200 text-xs">
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                periodFilter === 'all'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('this_month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                periodFilter === 'this_month'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('last_30_days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                periodFilter === 'last_30_days'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                periodFilter === 'custom'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Kustom
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportAnalyticsCSV}
            className="text-xs gap-1.5 border-warm-300 bg-white hover:bg-warm-50 text-charcoal"
          >
            <Download className="h-3.5 w-3.5 text-sage-700" />
            <span>Ekspor Analisis (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Controls */}
      {periodFilter === 'custom' && (
        <div className="rounded-xl border border-warm-200 bg-white p-3 flex flex-wrap items-center gap-3 text-xs">
          <Calendar className="h-4 w-4 text-charcoal-muted" />
          <span className="font-semibold text-charcoal">Rentang Tanggal:</span>
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-auto h-8 text-xs"
          />
          <span className="text-charcoal-muted">sampai</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-auto h-8 text-xs"
          />
        </div>
      )}

      {/* SECTION C: RINGKASAN ANALISIS (DYNAMIC NARRATIVE) */}
      <div className="rounded-xl border border-sage-200 bg-gradient-to-br from-sage-50/70 via-white to-warm-50/80 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-sage-200/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sage-600 animate-pulse" />
            <h3 className="text-xs font-bold text-sage-900 uppercase tracking-wider">
              Ringkasan Analisis Pengeluaran Aktual
            </h3>
          </div>
          <span className="text-[11px] text-charcoal-muted">
            {dateRange?.label ?? 'Seluruh Pelaksanaan KKN'}
          </span>
        </div>

        {analytics.expenseCount === 0 ? (
          <p className="text-xs text-charcoal-muted italic py-1">
            Belum ada transaksi pengeluaran tercatat pada periode atau filter yang dipilih.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-charcoal">
            {/* Ringkasan Kategori */}
            <div className="p-3 bg-white/90 rounded-lg border border-warm-200/80 space-y-1">
              <span className="text-[11px] text-charcoal-muted block font-medium">Kategori Terbesar</span>
              <p className="font-semibold text-charcoal text-sm">
                {analytics.topCategory ? (
                  <>
                    <span className="text-rose-700">{analytics.topCategory.categoryName}</span>
                    <span className="text-xs font-normal text-charcoal-muted ml-1">
                      ({formatRupiah(analytics.topCategory.totalAmount)} · {analytics.topCategory.percentage.toFixed(1)}%)
                    </span>
                  </>
                ) : (
                  'Belum ada data'
                )}
              </p>
              <p className="text-[11px] text-charcoal-muted">
                Kategori ini menyerap proporsi dana tertinggi dari posko.
              </p>
            </div>

            {/* Ringkasan Penerima / Vendor */}
            <div className="p-3 bg-white/90 rounded-lg border border-warm-200/80 space-y-1">
              <span className="text-[11px] text-charcoal-muted block font-medium">Penerima Pembayaran Terbesar</span>
              <p className="font-semibold text-charcoal text-sm truncate" title={analytics.topRecipient?.recipientName}>
                {analytics.topRecipient ? (
                  <>
                    <span className="text-sage-800">{analytics.topRecipient.recipientName}</span>
                    <span className="text-xs font-normal text-charcoal-muted ml-1">
                      ({formatRupiah(analytics.topRecipient.totalAmount)} · {analytics.topRecipient.percentage.toFixed(1)}%)
                    </span>
                  </>
                ) : (
                  'Belum dicatat'
                )}
              </p>
              <p className="text-[11px] text-charcoal-muted">
                {analytics.topRecipient
                  ? `Dibayarkan melalui ${analytics.topRecipient.transactionCount} kali transaksi belanja.`
                  : 'Nama toko/pihak penerima belum diinput.'}
              </p>
            </div>

            {/* Ringkasan Total Pengeluaran */}
            <div className="p-3 bg-white/90 rounded-lg border border-warm-200/80 space-y-1">
              <span className="text-[11px] text-charcoal-muted block font-medium">Total & Frekuensi Belanja</span>
              <p className="font-semibold text-rose-800 text-sm">
                {formatRupiah(analytics.totalEffectiveExpense)}
                <span className="text-xs font-normal text-charcoal-muted ml-1.5">
                  ({analytics.expenseCount} transaksi)
                </span>
              </p>
              <p className="text-[11px] text-charcoal-muted">
                Rata-rata {formatRupiah(Math.round(analytics.averageExpensePerTransaction))} per transaksi belanja.
              </p>
            </div>
          </div>
        )}

        {/* Honest Completeness Notice */}
        {(analytics.unspecifiedRecipientCount > 0 || analytics.unspecifiedPurposeCount > 0) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Catatan Kejujuran &amp; Kelengkapan Data</p>
              <p className="text-[11px] text-amber-800">
                Terdapat <strong>{analytics.unspecifiedRecipientCount}</strong> transaksi (total{' '}
                <strong>{formatRupiah(analytics.unspecifiedRecipientAmount)}</strong>) yang belum memiliki nama
                penerima/toko, atau belum dilengkapi rincian keperluan. Data ditampilkan apa adanya tanpa menebak.
                {canManageClassification && (
                  <span className="ml-1">
                    Gunakan tombol <strong>Klasifikasi</strong> pada daftar di bawah untuk melengkapinya.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STAT CARDS / KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            Total Pengeluaran
          </span>
          <div className="text-lg font-black text-rose-900">
            {formatRupiah(analytics.totalEffectiveExpense)}
          </div>
          <span className="text-[10px] text-rose-700">
            {analytics.expenseCount} kali pengeluaran
          </span>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-charcoal-muted" />
            Kategori Terbesar
          </span>
          <div className="text-base font-bold text-charcoal truncate" title={analytics.topCategory?.categoryName}>
            {analytics.topCategory?.categoryName || '—'}
          </div>
          <span className="text-[10px] text-charcoal-muted">
            {analytics.topCategory
              ? `${formatRupiah(analytics.topCategory.totalAmount)} (${analytics.topCategory.percentage.toFixed(1)}%)`
              : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-charcoal-muted" />
            Penerima Terbesar
          </span>
          <div className="text-base font-bold text-charcoal truncate" title={analytics.topRecipient?.recipientName}>
            {analytics.topRecipient?.recipientName || '—'}
          </div>
          <span className="text-[10px] text-charcoal-muted">
            {analytics.topRecipient
              ? `${formatRupiah(analytics.topRecipient.totalAmount)} (${analytics.topRecipient.percentage.toFixed(1)}%)`
              : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-charcoal-muted" />
            Rerata per Transaksi
          </span>
          <div className="text-lg font-bold text-charcoal">
            {formatRupiah(Math.round(analytics.averageExpensePerTransaction))}
          </div>
          <span className="text-[10px] text-charcoal-muted">
            Rata-rata nominal per nota
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1 col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-emerald-600" />
            Sisa Saldo Kas Bersih
          </span>
          <div className="text-lg font-black text-emerald-900">
            {formatRupiah(analytics.remainingBalance)}
          </div>
          <span className="text-[10px] text-emerald-700">
            Setelah seluruh pengeluaran
          </span>
        </div>
      </div>

      {/* SECTION A & B: VISUALISASI PENGELUARAN PER KATEGORI & PENERIMA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Grafik Pengeluaran per Kategori */}
        <Card className="border-warm-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Layers className="h-4 w-4 text-sage-700" />
                <span>Pengeluaran Berdasarkan Kategori</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {analytics.categoryDistribution.length} Kategori
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Proporsi dan persentase penggunaan dana posko untuk setiap kategori kegiatan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {analytics.categoryDistribution.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-8">
                Belum ada transaksi pengeluaran pada rentang waktu ini.
              </p>
            ) : (
              <div className="space-y-3.5">
                {analytics.categoryDistribution.map((cat, idx) => {
                  const colors = [
                    'bg-rose-500 text-rose-700',
                    'bg-amber-500 text-amber-700',
                    'bg-emerald-500 text-emerald-700',
                    'bg-blue-500 text-blue-700',
                    'bg-purple-500 text-purple-700',
                    'bg-teal-500 text-teal-700',
                  ]
                  const colorClass = colors[idx % colors.length]
                  const barColor = colorClass.split(' ')[0]

                  return (
                    <div key={cat.categoryId || 'uncategorized'} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-charcoal flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${barColor}`} />
                          {cat.categoryName}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-charcoal-muted">
                            {cat.transactionCount} nota
                          </span>
                          <span className="font-bold text-charcoal">
                            {formatRupiah(cat.totalAmount)}
                          </span>
                          <span className="font-semibold text-rose-700 w-12 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* Bar Visualization */}
                      <div className="h-2.5 w-full rounded-full bg-warm-100 overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card B: Pengeluaran Berdasarkan Penerima / Vendor */}
        <Card className="border-warm-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Store className="h-4 w-4 text-sage-700" />
                <span>Pengeluaran Berdasarkan Penerima / Toko</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {analytics.recipientDistribution.length} Pihak Penerima
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Uang kas dibayarkan kepada pihak/toko penyedia, diurutkan dari terbesar ke terkecil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {analytics.recipientDistribution.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-8">
                Belum ada data penerima dana pada periode ini.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {analytics.recipientDistribution.map((rec, i) => (
                  <div
                    key={rec.recipientName + i}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      rec.isUnspecified
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-warm-200 bg-warm-50/40 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-charcoal-muted w-4 shrink-0">
                        {i + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${rec.isUnspecified ? 'text-amber-900 italic' : 'text-charcoal'}`}>
                          {rec.recipientName}
                        </p>
                        <p className="text-[10px] text-charcoal-muted">
                          {rec.transactionCount} kali pembayaran
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-charcoal">
                        {formatRupiah(rec.totalAmount)}
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700">
                        {rec.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DETAIL TABLES & BREAKDOWNS (TABBED: KATEGORI vs PENERIMA vs PROGRAM) */}
      <Card className="border-warm-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-warm-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sage-700" />
                <span>Tabel Rincian Analisis Pengeluaran</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian tabular teragregasi untuk verifikasi dan pembukuan posko.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-warm-100 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDetailViewMode('category_table')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  detailViewMode === 'category_table'
                    ? 'bg-white text-charcoal shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                Rincian Kategori
              </button>
              <button
                type="button"
                onClick={() => setDetailViewMode('recipient_table')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  detailViewMode === 'recipient_table'
                    ? 'bg-white text-charcoal shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                Rincian Penerima / Toko
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {detailViewMode === 'category_table' ? (
            /* TABEL RINCIAN KATEGORI (Requirement 2.A) */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-warm-100/70 border-b border-warm-200 text-charcoal-muted font-semibold">
                    <th className="py-2.5 px-4">Kategori Transaksi</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Total Pengeluaran (Rp)</th>
                    <th className="py-2.5 px-4 text-right">Rerata per Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {analytics.categoryDistribution.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-charcoal-muted">
                        Tidak ada data kategori pengeluaran.
                      </td>
                    </tr>
                  ) : (
                    analytics.categoryDistribution.map((cat, i) => {
                      const avg = cat.transactionCount > 0 ? cat.totalAmount / cat.transactionCount : 0
                      return (
                        <tr key={cat.categoryId || i} className="hover:bg-warm-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-charcoal flex items-center gap-2">
                            <span className="font-mono text-[11px] text-charcoal-muted">{i + 1}.</span>
                            <span>{cat.categoryName}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">
                            {cat.transactionCount}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-charcoal">
                            {formatRupiah(cat.totalAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-charcoal-muted font-mono">
                            {formatRupiah(Math.round(avg))}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                            {cat.percentage.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {analytics.categoryDistribution.length > 0 && (
                  <tfoot>
                    <tr className="bg-warm-100 font-bold border-t-2 border-warm-300 text-charcoal">
                      <td className="py-2.5 px-4">Total Pengeluaran Efektif</td>
                      <td className="py-2.5 px-4 text-center font-mono">{analytics.expenseCount}</td>
                      <td className="py-2.5 px-4 text-right text-rose-900">
                        {formatRupiah(analytics.totalEffectiveExpense)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {formatRupiah(Math.round(analytics.averageExpensePerTransaction))}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700">100.00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            /* TABEL RINCIAN PENERIMA / TUJUAN (Requirement 2.B) */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-warm-100/70 border-b border-warm-200 text-charcoal-muted font-semibold">
                    <th className="py-2.5 px-4">Nama Toko / Penerima / Tujuan Pembayaran</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Total Uang Dibayarkan (Rp)</th>
                    <th className="py-2.5 px-4 text-right">Persentase dari Total</th>
                    <th className="py-2.5 px-4 text-center">Status Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {analytics.recipientDistribution.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-charcoal-muted">
                        Tidak ada data penerima dana.
                      </td>
                    </tr>
                  ) : (
                    analytics.recipientDistribution.map((rec, i) => (
                      <tr
                        key={rec.recipientName + i}
                        className={`transition-colors ${
                          rec.isUnspecified ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-warm-50/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-charcoal flex items-center gap-2">
                          <span className="font-mono text-[11px] text-charcoal-muted">{i + 1}.</span>
                          <span className={rec.isUnspecified ? 'text-amber-900 italic' : ''}>
                            {rec.recipientName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {rec.transactionCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-charcoal">
                          {formatRupiah(rec.totalAmount)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                          {rec.percentage.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {rec.isUnspecified ? (
                            <Badge variant="warning" className="text-[10px]">
                              Belum Dilengkapi
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              Lengkap
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {analytics.recipientDistribution.length > 0 && (
                  <tfoot>
                    <tr className="bg-warm-100 font-bold border-t-2 border-warm-300 text-charcoal">
                      <td className="py-2.5 px-4">Total Pengeluaran Terdistribusi</td>
                      <td className="py-2.5 px-4 text-center font-mono">{analytics.expenseCount}</td>
                      <td className="py-2.5 px-4 text-right text-rose-900">
                        {formatRupiah(analytics.totalEffectiveExpense)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700">100.00%</td>
                      <td className="py-2.5 px-4 text-center">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION D: DAFTAR TRANSAKSI PENGELUARAN DENGAN FILTER DETAIL */}
      <Card className="border-warm-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sage-700" />
                <span>Daftar Transaksi Pengeluaran Kas</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Detail nota pengeluaran dengan filter kategori, penerima/toko, program kerja, dan keperluan.
              </CardDescription>
            </div>

            {/* Quick Search */}
            <div className="w-full md:w-64">
              <Input
                type="text"
                placeholder="Cari keperluan / toko / vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Sub-Filters (Requirement 2.D) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Kategori</option>
              {categories
                .filter((c) => c.type === 'expense')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Penerima / Toko</option>
              <option value="__unspecified__">⚠️ Belum Ada Rincian Toko</option>
              {uniqueRecipients.map((rec) => (
                <option key={rec} value={rec}>
                  {rec}
                </option>
              ))}
            </select>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Program Kerja</option>
              <option value="none">Operasional Posko / Tanpa Program</option>
              {workPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <select
              value={selectedRecorder}
              onChange={(e) => setSelectedRecorder(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Pencatat Transaksi</option>
              {Object.values(membersById).map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayExpenses.length === 0 ? (
            <div className="text-center py-10 text-xs text-charcoal-muted space-y-1">
              <p className="font-semibold text-charcoal">Tidak ditemukan transaksi pengeluaran</p>
              <p>Sesuaikan filter atau kata kunci pencarian di atas.</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-200">
              {displayExpenses.map((tx) => {
                const origTx = transactions.find((t) => t.id === tx.id)
                const attachments = attachmentsByTransaction[tx.id] || []
                const recorder = membersById[tx.recordedBy]
                const isExpanded = expandedTxId === tx.id

                return (
                  <div key={tx.id} className="p-3.5 hover:bg-warm-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-charcoal">{tx.description}</span>
                          <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 border-rose-200 text-rose-800">
                            {tx.categoryName}
                          </Badge>
                          {tx.programTitle && (
                            <Badge variant="secondary" className="text-[10px] bg-sage-50 text-sage-800 border-sage-200">
                              {tx.programTitle}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-charcoal-muted">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3 text-sage-600" />
                            <span>
                              Penerima/Toko: <strong>{tx.recipientOrVendor}</strong>
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatFinanceDate(tx.transactionDate)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{recorder?.full_name || 'Bendahara'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-rose-700">
                            {formatRupiah(tx.amount)}
                          </div>
                          {attachments.length > 0 && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Ada Bukti Nota ({attachments.length})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {canManageClassification && origTx && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenReclassifyModal(origTx)}
                              className="h-8 px-2 text-xs text-sage-800 hover:bg-sage-50"
                              title="Perbarui rincian keperluan & vendor"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline ml-1">Klasifikasi</span>
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpand(tx.id)}
                            className="h-8 w-8 p-0 text-charcoal-muted"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-warm-200/80 bg-white rounded-lg p-3 space-y-2.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-charcoal-muted uppercase font-semibold block">
                              Keperluan &amp; Tujuan Rinci Penggunaan Dana
                            </span>
                            <p className="text-charcoal mt-0.5">
                              {tx.spendingPurpose !== 'Belum ada rincian' ? (
                                tx.spendingPurpose
                              ) : (
                                <span className="italic text-charcoal-muted">Belum ada rincian tujuan pengeluaran</span>
                              )}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-charcoal-muted uppercase font-semibold block">
                              Penerima Dana / Vendor
                            </span>
                            <p className="text-charcoal mt-0.5 font-medium">
                              {tx.recipientOrVendor !== 'Belum ada rincian' ? (
                                tx.recipientOrVendor
                              ) : (
                                <span className="italic text-charcoal-muted">Belum ada rincian toko / vendor</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Attachments list */}
                        {attachments.length > 0 && (
                          <div>
                            <span className="text-[10px] text-charcoal-muted uppercase font-semibold block mb-1">
                              Bukti Nota / Kuitansi Pembayaran
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {attachments.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => att.file && onPreviewReceipt(att.file)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-warm-300 bg-warm-50 text-xs font-medium text-sage-800 hover:bg-warm-100"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>{att.file?.original_name || 'Buka Bukti Kuitansi'}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatRupiah,
  formatFinanceDate,
  computeExpenditureAnalytics,
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
  // Filter States
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_30_days' | 'custom'>('all')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedRecorder, setSelectedRecorder] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

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
      }
    }

    if (periodFilter === 'last_30_days') {
      const [y, m, d] = today.split('-').map(Number)
      const baseDate = new Date(Date.UTC(y, m - 1, d))
      const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 86_400_000)
      return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today,
      }
    }

    if (periodFilter === 'custom' && customStart && customEnd) {
      return {
        startDate: customStart <= customEnd ? customStart : customEnd,
        endDate: customStart <= customEnd ? customEnd : customStart,
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
      dateRange,
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

  // Filtered expense transactions for table view
  const displayExpenses = useMemo(() => {
    // Filter matching search term
    return analytics.topExpensesList.filter((tx) => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        tx.description.toLowerCase().includes(term) ||
        tx.recipientOrVendor.toLowerCase().includes(term) ||
        tx.spendingPurpose.toLowerCase().includes(term) ||
        tx.categoryName.toLowerCase().includes(term)
      )
    })
  }, [analytics.topExpensesList, searchTerm])

  const toggleExpand = (id: string) => {
    setExpandedTxId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <PieChart className="h-5 w-5 text-rose-600" />
            <span>Analisis Penggunaan & Arah Pengeluaran Dana</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Transparansi alokasi kas posko: digunakan untuk apa, dibayarkan kepada siapa, dan persentase penggunaan per kategori.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-warm-100 p-1 rounded-lg border border-warm-200 self-start sm:self-auto text-xs">
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
            30 Hari Terakhir
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

      {/* SECTION A: RINGKASAN PENGGUNAAN DANA (KPIS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            Total Pengeluaran Efektif
          </span>
          <div className="text-lg font-black text-rose-900">
            {formatRupiah(analytics.totalEffectiveExpense)}
          </div>
          <span className="text-[10px] text-rose-700">
            {analytics.expenseCount} kali transaksi pengeluaran
          </span>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-charcoal-muted" />
            Pengeluaran Terbesar
          </span>
          <div className="text-lg font-bold text-charcoal">
            {analytics.maxExpense ? formatRupiah(analytics.maxExpense.amount) : 'Rp 0'}
          </div>
          <p className="text-[10px] text-charcoal-muted truncate" title={analytics.maxExpense?.description}>
            {analytics.maxExpense?.description || 'Belum ada pengeluaran'}
          </p>
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
            {analytics.topCategory ? `${formatRupiah(analytics.topCategory.totalAmount)} (${analytics.topCategory.percentage.toFixed(1)}%)` : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-charcoal-muted" />
            Rata-rata per Transaksi
          </span>
          <div className="text-lg font-bold text-charcoal">
            {formatRupiah(Math.round(analytics.averageExpensePerTransaction))}
          </div>
          <span className="text-[10px] text-charcoal-muted">
            Rerata pengeluaran per nota
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
            Setelah seluruh pengeluaran aktif
          </span>
        </div>
      </div>

      {/* SECTION B & D: DISTRIBUSI KATEGORI & VISUALISASI PERSENTASE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Card */}
        <Card className="lg:col-span-2 border-warm-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-charcoal flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sage-700" />
                <span>Distribusi & Persentase Pengeluaran per Kategori</span>
              </span>
              <Badge variant="outline" className="text-xs font-normal">
                {analytics.categoryDistribution.length} Kategori Aktif
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Total nominal dan proporsi belanja posko yang dihitung dari transaksi efektif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.categoryDistribution.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-6">
                Belum ada data transaksi pengeluaran pada periode yang dipilih.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.categoryDistribution.map((cat) => (
                  <div key={cat.categoryId || 'uncategorized'} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-charcoal flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        {cat.categoryName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-charcoal-muted text-[11px]">
                          {cat.transactionCount} transaksi
                        </span>
                        <span className="font-bold text-charcoal">
                          {formatRupiah(cat.totalAmount)}
                        </span>
                        <span className="font-semibold text-rose-700 w-12 text-right">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-warm-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Program Work Breakdown */}
        <Card className="border-warm-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
              <Target className="h-4 w-4 text-sage-700" />
              <span>Arah Pengeluaran Program</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Alokasi dana untuk kegiatan program kerja vs operasional posko.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.programBreakdown.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-6">
                Belum ada data pengeluaran terhubung program.
              </p>
            ) : (
              <div className="space-y-2.5">
                {analytics.programBreakdown.map((prog) => (
                  <div
                    key={prog.programId || 'general'}
                    className="rounded-lg border border-warm-200 bg-warm-50/50 p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-charcoal">
                      <span className="truncate pr-2">{prog.programTitle}</span>
                      <span className="shrink-0 text-sage-800">{formatRupiah(prog.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
                      <span>{prog.transactionCount} kali transaksi</span>
                      <span className="font-medium text-rose-700">{prog.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION C & D: RINCIAN TUJUAN PENGGUNAAN & DAFTAR TRANSAKSI */}
      <Card className="border-warm-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sage-700" />
                <span>Rincian Tujuan Penggunaan & Aliran Belanja Kas</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Detail penerima dana/toko vendor, program terkait, bukti nota, dan opsi klasifikasi ulang.
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

          {/* Sub-Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter((c) => c.type === 'expense').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <select
              value={selectedRecorder}
              onChange={(e) => setSelectedRecorder(e.target.value)}
              className="flex h-8 w-full rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal"
            >
              <option value="all">Semua Pencatat Transaksi</option>
              {Object.values(membersById).map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
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
                            <span>Penerima/Toko: <strong>{tx.recipientOrVendor}</strong></span>
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
                              Keperluan & Tujuan Rinci Penggunaan Dana
                            </span>
                            <p className="text-charcoal mt-0.5">
                              {tx.spendingPurpose !== 'Belum ada rincian' ? tx.spendingPurpose : (
                                <span className="italic text-charcoal-muted">Belum ada rincian tujuan pengeluaran</span>
                              )}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-charcoal-muted uppercase font-semibold block">
                              Penerima Dana / Vendor
                            </span>
                            <p className="text-charcoal mt-0.5 font-medium">
                              {tx.recipientOrVendor !== 'Belum ada rincian' ? tx.recipientOrVendor : (
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

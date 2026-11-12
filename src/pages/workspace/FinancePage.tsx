import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  Plus,
  Tags,
  Search,
  RotateCcw,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarRange,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { getLocalDateKey } from '@/services/dashboardApi'
import { fetchFinanceLedgerData } from '@/services/financeApi'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import {
  computeFinanceSummaryAndRecap,
  formatFinanceDate,
  formatRupiah,
  getRecapDateRange,
  type FinanceRecapPeriodMode,
} from '@/lib/finance'
import { FinanceTransactionModal } from '@/components/workspace/FinanceTransactionModal'
import { FinanceCategoryModal } from '@/components/workspace/FinanceCategoryModal'
import { FinanceReversalModal } from '@/components/workspace/FinanceReversalModal'
import type { FinanceCategory, FinanceTransaction, WorkspaceMemberSummary } from '@/types/database'

type TypeFilter = 'all' | 'income' | 'expense'

const EMPTY_CATEGORIES: FinanceCategory[] = []
const EMPTY_TRANSACTIONS: FinanceTransaction[] = []
const EMPTY_MEMBERS: Record<string, WorkspaceMemberSummary> = {}

const PERIOD_MODES: { value: FinanceRecapPeriodMode; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'custom', label: 'Rentang Pilihan' },
]

export const FinancePage: React.FC = () => {
  const { toast } = useToast()
  const { membership, isSuperAdmin } = useAuth()
  const canManageFinance =
    isSuperAdmin || (membership?.status === 'active' && membership.role === 'bendahara')

  const todayStr = getLocalDateKey()

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [reversalTarget, setReversalTarget] = useState<FinanceTransaction | null>(null)
  const [openingFileId, setOpeningFileId] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Recap period controls
  const [recapMode, setRecapMode] = useState<FinanceRecapPeriodMode>('monthly')
  const [recapAnchorDate, setRecapAnchorDate] = useState<string>(todayStr)
  const [recapCustomStart, setRecapCustomStart] = useState<string>(todayStr)
  const [recapCustomEnd, setRecapCustomEnd] = useState<string>(todayStr)

  const {
    data: ledger,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'finance'],
    queryFn: fetchFinanceLedgerData,
    staleTime: 30_000,
  })

  const categories = ledger?.categories ?? EMPTY_CATEGORIES
  const transactions = ledger?.transactions ?? EMPTY_TRANSACTIONS
  const attachmentsByTransaction = ledger?.attachmentsByTransaction ?? {}
  const membersById = ledger?.membersById ?? EMPTY_MEMBERS

  const categoryById = useMemo(() => {
    const map = new Map<string, (typeof categories)[number]>()
    for (const c of categories) {
      map.set(c.id, c)
    }
    return map
  }, [categories])

  const activeRecapRange = useMemo(
    () => getRecapDateRange(recapMode, recapAnchorDate, recapCustomStart, recapCustomEnd),
    [recapMode, recapAnchorDate, recapCustomStart, recapCustomEnd]
  )

  const summary = useMemo(
    () =>
      computeFinanceSummaryAndRecap(transactions, categories, {
        startDate: activeRecapRange.startDate,
        endDate: activeRecapRange.endDate,
      }),
    [transactions, categories, activeRecapRange.startDate, activeRecapRange.endDate]
  )

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (categoryFilter === 'uncategorized' && tx.category_id !== null) return false
      if (categoryFilter !== 'all' && categoryFilter !== 'uncategorized' && tx.category_id !== categoryFilter) {
        return false
      }
      if (startDateFilter && tx.transaction_date < startDateFilter) return false
      if (endDateFilter && tx.transaction_date > endDateFilter) return false

      if (normalizedSearch) {
        const categoryName = tx.category_id ? categoryById.get(tx.category_id)?.name ?? '' : ''
        const recorderName = membersById[tx.recorded_by]?.full_name ?? ''
        const haystack = `${tx.description} ${tx.correction_reason ?? ''} ${categoryName} ${recorderName}`.toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }

      return true
    })
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    startDateFilter,
    endDateFilter,
    searchQuery,
    categoryById,
    membersById,
  ])

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter) ||
    Boolean(searchQuery.trim())

  const resetFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setSearchQuery('')
  }

  const handleOpenAttachment = async (fileId: string) => {
    if (openingFileId) return
    setOpeningFileId(fileId)
    try {
      const result = await getPrivateFileSignedUrl(fileId, false)
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        title: 'Gagal membuka bukti transaksi',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.',
        variant: 'error',
      })
    } finally {
      setOpeningFileId(null)
    }
  }

  const getTransactionStatusMeta = (tx: FinanceTransaction) => {
    if (tx.reversal_of_transaction_id) {
      return { label: 'Pembalik', variant: 'sand' as const }
    }
    if (summary.reversedTargetIds.has(tx.id)) {
      return { label: 'Dibatalkan', variant: 'outline' as const }
    }
    return { label: 'Tercatat', variant: 'success' as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-300 text-sage-800 bg-sage-50">
              Buku Kas KKN
            </Badge>
            <span className="text-xs text-charcoal-muted">Transparansi & Audit Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-2">
            Keuangan & Kas Kelompok KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1 max-w-2xl">
            Pencatatan pemasukan, pengeluaran, bukti kuitansi privat, serta rekap kas berbasis histori transaksi aktual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageFinance ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCatModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Tags className="h-3.5 w-3.5" />
                <span>Kategori</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setTxModalOpen(true)}
                className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Catat Transaksi</span>
              </Button>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-warm-300 bg-warm-50 px-3 py-1.5 text-xs text-charcoal-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-sage-700" />
              <span>Mode Baca (Pencatatan hanya oleh Bendahara)</span>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-rose-200 bg-white">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-charcoal">Gagal memuat buku kas</h3>
                <p className="text-xs text-charcoal-muted">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan saat membaca data keuangan.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Coba Lagi</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-warm-300 bg-white">
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-charcoal-muted">
              <span>Saldo Kas Aktual</span>
              <Wallet className="h-4 w-4 text-sage-700" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <div
                className={`text-2xl font-serif font-semibold ${
                  summary.cashBalance < 0 ? 'text-rose-700' : 'text-charcoal'
                }`}
              >
                {formatRupiah(summary.cashBalance)}
              </div>
            )}
            <p className="text-[11px] text-charcoal-muted">
              Net histori transaksi tercatat ({summary.allTimeTotalCount} entri)
            </p>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white">
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-charcoal-muted">
              <span>Total Pemasukan</span>
              <TrendingUp className="h-4 w-4 text-emerald-700" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-serif font-semibold text-emerald-800">
                {formatRupiah(summary.allTimeIncome)}
              </div>
            )}
            <p className="text-[11px] text-charcoal-muted">Pemasukan efektif aktif</p>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white">
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-charcoal-muted">
              <span>Total Pengeluaran</span>
              <TrendingDown className="h-4 w-4 text-amber-700" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {formatRupiah(summary.allTimeExpense)}
              </div>
            )}
            <p className="text-[11px] text-charcoal-muted">Pengeluaran efektif aktif</p>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white">
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-charcoal-muted">
              <span>Jumlah Transaksi</span>
              <ReceiptText className="h-4 w-4 text-sage-700" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {summary.allTimeEffectiveCount}
              </div>
            )}
            <p className="text-[11px] text-charcoal-muted">
              {summary.allTimeReversedCount > 0
                ? `${summary.allTimeReversedCount} transaksi dibalik (${summary.allTimeTotalCount} total entri)`
                : 'Semua entri tercatat permanen'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rekap Periode & Kategori */}
      <Card className="border-warm-300 bg-white">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-warm-200 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-700 uppercase tracking-wider">
                <CalendarRange className="h-3.5 w-3.5" />
                <span>Rekap Periode & Kategori</span>
              </div>
              <h2 className="text-base font-serif font-semibold text-charcoal mt-1">
                {activeRecapRange.label}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setRecapMode(mode.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    recapMode === mode.value
                      ? 'bg-sage-700 text-white border-sage-700'
                      : 'bg-white text-charcoal border-warm-300 hover:bg-warm-50'
                  }`}
                >
                  {mode.label}
                </button>
              ))}

              {recapMode === 'custom' ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    aria-label="Rekap dari tanggal"
                    value={recapCustomStart}
                    onChange={(e) => setRecapCustomStart(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <span className="text-xs text-charcoal-muted">s.d.</span>
                  <Input
                    type="date"
                    aria-label="Rekap sampai tanggal"
                    value={recapCustomEnd}
                    onChange={(e) => setRecapCustomEnd(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
              ) : (
                <Input
                  type="date"
                  aria-label="Tanggal acuan rekap"
                  value={recapAnchorDate}
                  onChange={(e) => setRecapAnchorDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-3.5">
              <div className="text-[11px] text-charcoal-muted">Pemasukan Periode</div>
              <div className="text-base font-semibold text-emerald-800 mt-1">
                {formatRupiah(summary.periodIncome)}
              </div>
            </div>
            <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-3.5">
              <div className="text-[11px] text-charcoal-muted">Pengeluaran Periode</div>
              <div className="text-base font-semibold text-charcoal mt-1">
                {formatRupiah(summary.periodExpense)}
              </div>
            </div>
            <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-3.5">
              <div className="text-[11px] text-charcoal-muted">Selisih Periode</div>
              <div
                className={`text-base font-semibold mt-1 ${
                  summary.periodDifference < 0 ? 'text-rose-700' : 'text-sage-800'
                }`}
              >
                {formatRupiah(summary.periodDifference)}
              </div>
            </div>
            <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-3.5">
              <div className="text-[11px] text-charcoal-muted">Saldo s.d. Akhir Periode</div>
              <div className="text-base font-semibold text-charcoal mt-1">
                {formatRupiah(summary.cumulativeBalanceThroughEnd)}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-charcoal">Rincian Per Kategori (Periode Terpilih)</span>
              <span className="text-[11px] text-charcoal-muted">
                Dihitung dari {summary.periodEffectiveCount} transaksi efektif (tanpa saldo awal eksternal)
              </span>
            </div>

            {summary.categoryBreakdown.length === 0 ? (
              <div className="rounded-lg border border-dashed border-warm-300 p-4 text-center text-xs text-charcoal-muted">
                Belum ada transaksi efektif pada periode {activeRecapRange.label}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {summary.categoryBreakdown.map((item) => (
                  <div
                    key={`${item.type}-${item.categoryId ?? 'none'}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-warm-200 bg-white px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-charcoal truncate">
                        {item.categoryName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-charcoal-muted">
                        <Badge variant={item.type === 'income' ? 'success' : 'secondary'}>
                          {item.type === 'income' ? 'Masuk' : 'Keluar'}
                        </Badge>
                        <span>{item.transactionCount} transaksi</span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-charcoal shrink-0">
                      {formatRupiah(item.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter & Riwayat Transaksi */}
      <Card className="border-warm-300 bg-white">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-serif font-semibold text-charcoal">
                Riwayat Transaksi Keuangan
              </h2>
              <p className="text-xs text-charcoal-muted">
                Seluruh mutasi tercatat permanen. Koreksi hanya melalui transaksi pembalik (reversal).
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs self-start md:self-auto"
              >
                Reset Filter
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari deskripsi, kategori, atau pencatat..."
                aria-label="Cari transaksi"
                className="pl-9 text-xs h-9"
              />
            </div>

            <select
              aria-label="Filter jenis transaksi"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1.5 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>

            <select
              aria-label="Filter kategori"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1.5 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type === 'income' ? 'Masuk' : 'Keluar'})
                </option>
              ))}
              <option value="uncategorized">Tanpa Kategori</option>
            </select>

            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                aria-label="Filter dari tanggal"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                type="date"
                aria-label="Filter sampai tanggal"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-warm-300 bg-warm-50/50 p-10 text-center space-y-2">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                <ReceiptText className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal">
                {transactions.length === 0
                  ? 'Belum ada transaksi keuangan tercatat'
                  : 'Tidak ada transaksi yang cocok dengan filter'}
              </h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
                {transactions.length === 0
                  ? canManageFinance
                    ? 'Mulai dengan membuat kategori transaksi lalu mencatat pemasukan atau pengeluaran pertama kelompok.'
                    : 'Bendahara kelompok belum mencatat transaksi pemasukan maupun pengeluaran kas.'
                  : 'Ubah kata kunci pencarian, kategori, jenis, atau rentang tanggal untuk melihat transaksi lain.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-warm-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-warm-50 text-charcoal-muted uppercase text-[11px] border-b border-warm-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Tanggal</th>
                      <th className="px-4 py-3 font-semibold">Deskripsi & Pencatat</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold">Jenis</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                      <th className="px-4 py-3 font-semibold text-right">Bukti & Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200 bg-white">
                    {filteredTransactions.map((tx) => {
                      const category = tx.category_id ? categoryById.get(tx.category_id) : undefined
                      const recorder = membersById[tx.recorded_by]
                      const attachments = attachmentsByTransaction[tx.id] ?? []
                      const statusMeta = getTransactionStatusMeta(tx)
                      const isReversal = Boolean(tx.reversal_of_transaction_id)
                      const isReversed = summary.reversedTargetIds.has(tx.id)

                      return (
                        <tr key={tx.id} className="hover:bg-warm-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-charcoal">
                            {formatFinanceDate(tx.transaction_date)}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-medium text-charcoal">{tx.description}</div>
                            {tx.correction_reason && (
                              <div className="text-[11px] text-amber-800 mt-0.5">
                                Alasan: {tx.correction_reason}
                              </div>
                            )}
                            <div className="text-[11px] text-charcoal-muted mt-0.5">
                              Pencatat: {recorder?.full_name || 'Pengurus KKN'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-charcoal-muted">
                            {category?.name || 'Tanpa Kategori'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={tx.type === 'income' ? 'success' : 'secondary'}>
                              {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${
                              tx.type === 'income' ? 'text-emerald-800' : 'text-charcoal'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {attachments.map((att) => (
                                <Button
                                  key={att.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={openingFileId === att.file_id}
                                  onClick={() => void handleOpenAttachment(att.file_id)}
                                  className="h-7 px-2 text-[11px] gap-1"
                                  title={att.file?.original_name || 'Lihat bukti'}
                                >
                                  {openingFileId === att.file_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  <span>Bukti</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Button>
                              ))}

                              {canManageFinance && !isReversal && !isReversed && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReversalTarget(tx)}
                                  className="h-7 px-2 text-[11px] gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Balikkan</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="lg:hidden space-y-3">
                {filteredTransactions.map((tx) => {
                  const category = tx.category_id ? categoryById.get(tx.category_id) : undefined
                  const recorder = membersById[tx.recorded_by]
                  const attachments = attachmentsByTransaction[tx.id] ?? []
                  const statusMeta = getTransactionStatusMeta(tx)
                  const isReversal = Boolean(tx.reversal_of_transaction_id)
                  const isReversed = summary.reversedTargetIds.has(tx.id)

                  return (
                    <div
                      key={tx.id}
                      className="rounded-lg border border-warm-200 bg-white p-4 space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={tx.type === 'income' ? 'success' : 'secondary'}>
                            {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </Badge>
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </div>
                        <span className="text-[11px] text-charcoal-muted">
                          {formatFinanceDate(tx.transaction_date)}
                        </span>
                      </div>

                      <div>
                        <div className="font-semibold text-charcoal">{tx.description}</div>
                        {tx.correction_reason && (
                          <div className="text-[11px] text-amber-800 mt-0.5">
                            Alasan: {tx.correction_reason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-warm-100">
                        <div className="text-[11px] text-charcoal-muted">
                          <div>{category?.name || 'Tanpa Kategori'}</div>
                          <div>Pencatat: {recorder?.full_name || 'Pengurus KKN'}</div>
                        </div>
                        <div
                          className={`text-sm font-serif font-semibold ${
                            tx.type === 'income' ? 'text-emerald-800' : 'text-charcoal'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </div>
                      </div>

                      {(attachments.length > 0 || (canManageFinance && !isReversal && !isReversed)) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {attachments.map((att) => (
                            <Button
                              key={att.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={openingFileId === att.file_id}
                              onClick={() => void handleOpenAttachment(att.file_id)}
                              className="h-7 px-2.5 text-[11px] gap-1"
                            >
                              {openingFileId === att.file_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              <span>Lihat Bukti</span>
                            </Button>
                          ))}

                          {canManageFinance && !isReversal && !isReversed && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReversalTarget(tx)}
                              className="h-7 px-2.5 text-[11px] gap-1 border-amber-300 text-amber-800"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Balikkan</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals for Bendahara / Super Admin */}
      {canManageFinance && (
        <>
          <FinanceTransactionModal
            open={txModalOpen}
            onClose={() => setTxModalOpen(false)}
            categories={categories}
            onOpenCategoryManager={() => setCatModalOpen(true)}
          />
          <FinanceCategoryModal
            open={catModalOpen}
            onClose={() => setCatModalOpen(false)}
            categories={categories}
          />
          <FinanceReversalModal
            transaction={reversalTarget}
            onClose={() => setReversalTarget(null)}
          />
        </>
      )}
    </div>
  )
}

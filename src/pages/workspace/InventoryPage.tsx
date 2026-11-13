import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchInventoryItems,
  fetchInventoryLoans,
  fetchInventoryMovements,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  requestInventoryLoan,
  approveAndHandoutLoan,
  returnInventoryLoan,
  rejectInventoryLoan,
  cancelInventoryLoan,
  adjustInventoryStock,
  type CreateInventoryItemInput,
  type RequestLoanInput,
} from '@/services/inventoryApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  InventoryItem,
  InventoryLoan,
  InventoryCondition,
  InventoryItemType,
  InventoryLoanStatus,
} from '@/types/database'
import {
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ArrowRightLeft,
  Edit2,
  Trash2,
  MapPin,
  User,
} from 'lucide-react'

const CATEGORY_OPTIONS = [
  'Elektronik',
  'Peralatan Kebersihan',
  'Peralatan Dapur',
  'Perlengkapan Posko',
  'Peralatan Kegiatan',
  'Peralatan Kesehatan',
  'ATK & Administrasi',
  'Lainnya',
]

const CONDITION_BADGES: Record<
  InventoryCondition,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  good: { label: 'Baik', variant: 'success' },
  fair: { label: 'Cukup', variant: 'warning' },
  damaged: { label: 'Rusak', variant: 'destructive' },
  lost: { label: 'Hilang', variant: 'destructive' },
}

const LOAN_STATUS_BADGES: Record<
  InventoryLoanStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Menunggu Persetujuan', variant: 'warning' },
  approved: { label: 'Disetujui', variant: 'secondary' },
  borrowed: { label: 'Sedang Dipinjam', variant: 'secondary' },
  returned: { label: 'Dikembalikan', variant: 'success' },
  overdue: { label: 'Terlambat', variant: 'destructive' },
  rejected: { label: 'Ditolak', variant: 'destructive' },
  cancelled: { label: 'Dibatalkan', variant: 'outline' },
}

export const InventoryPage: React.FC = () => {
  const { user, isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const canManage =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris' ||
    membership?.role === 'bendahara'

  const [activeTab, setActiveTab] = useState<'all' | 'asset' | 'consumable' | 'loans' | 'damaged' | 'movements'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [borrowTargetItem, setBorrowTargetItem] = useState<InventoryItem | null>(null)
  const [returningLoan, setReturningLoan] = useState<InventoryLoan | null>(null)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<InventoryItem | null>(null)

  // Query: Inventory items
  const {
    data: items = [],
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['inventory-items', selectedCategory, searchTerm],
    queryFn: () =>
      fetchInventoryItems({
        category: selectedCategory,
        search: searchTerm,
      }),
  })

  // Query: Inventory loans
  const {
    data: loans = [],
    isLoading: isLoadingLoans,
    refetch: refetchLoans,
  } = useQuery({
    queryKey: ['inventory-loans'],
    queryFn: () => fetchInventoryLoans(),
  })

  // Query: Movements
  const {
    data: movements = [],
    isLoading: isLoadingMovements,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => fetchInventoryMovements(),
    enabled: activeTab === 'movements',
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      toast({ title: 'Barang Berhasil Ditambahkan', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      setIsCreateModalOpen(false)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menambah Barang', description: err.message, variant: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; input: Partial<CreateInventoryItemInput> }) =>
      updateInventoryItem(vars.id, vars.input),
    onSuccess: () => {
      toast({ title: 'Data Barang Diperbarui', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      setEditingItem(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memperbarui Barang', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      toast({ title: 'Barang Berhasil Dihapus', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      setItemToDelete(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menghapus Barang', description: err.message, variant: 'error' })
    },
  })

  const requestLoanMutation = useMutation({
    mutationFn: requestInventoryLoan,
    onSuccess: () => {
      toast({ title: 'Pengajuan Peminjaman Terkirim', description: 'Menunggu persetujuan pengelola posko.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['inventory-loans'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      setBorrowTargetItem(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Mengajukan Pinjaman', description: err.message, variant: 'error' })
    },
  })

  // Filtered views
  const assetItems = items.filter((i) => i.item_type === 'asset')
  const consumableItems = items.filter((i) => i.item_type === 'consumable')
  const damagedItems = items.filter((i) => i.condition === 'damaged' || i.condition === 'fair')
  const activeLoans = loans.filter((l) => l.status === 'borrowed' || l.status === 'pending')

  // Calculated Stats
  const totalItemsCount = items.length
  const totalQuantity = items.reduce((acc, curr) => acc + curr.quantity, 0)
  const totalAvailable = items.reduce((acc, curr) => acc + curr.available_quantity, 0)
  const totalBorrowedQuantity = items.reduce(
    (acc, curr) => acc + Math.max(0, curr.quantity - curr.available_quantity),
    0
  )
  const damagedCount = damagedItems.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-600 text-sage-800 bg-sage-50">
              Operasional KKN
            </Badge>
            <span className="text-xs text-charcoal-muted">Logistik &amp; Aset Posko</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Inventaris &amp; Logistik Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pengelolaan aset posko, stok barang habis pakai, peminjaman peralatan, dan mutasi barang secara konsisten.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchItems()
              refetchLoans()
              refetchMovements()
            }}
            disabled={isFetchingItems}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingItems ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Barang Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Jenis Barang</p>
              <p className="text-base font-bold text-charcoal">{totalItemsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Total Unit</p>
              <p className="text-base font-bold text-charcoal">{totalQuantity}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Stok Tersedia</p>
              <p className="text-base font-bold text-emerald-700">{totalAvailable}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Sedang Dipinjam</p>
              <p className="text-base font-bold text-amber-700">{totalBorrowedQuantity}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white col-span-2 lg:col-span-1">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-charcoal-muted">Perlu Perawatan</p>
              <p className="text-base font-bold text-red-700">{damagedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-warm-200/60 rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'all' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('asset')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'asset' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Aset Posko ({assetItems.length})
          </button>
          <button
            onClick={() => setActiveTab('consumable')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'consumable' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Habis Pakai ({consumableItems.length})
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'loans' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Peminjaman ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('damaged')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'damaged' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Perawatan ({damagedCount})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'movements' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Riwayat Mutasi
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'loans' && activeTab !== 'movements' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-charcoal-muted" />
            <Input
              placeholder="Cari nama atau kode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
        </div>
      </div>

      {/* TAB CONTENT: ITEMS (all / asset / consumable / damaged) */}
      {activeTab !== 'loans' && activeTab !== 'movements' && (
        <>
          {isLoadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            (() => {
              const displayList =
                activeTab === 'asset'
                  ? assetItems
                  : activeTab === 'consumable'
                    ? consumableItems
                    : activeTab === 'damaged'
                      ? damagedItems
                      : items

              if (displayList.length === 0) {
                return (
                  <Card className="border-dashed border-warm-300 bg-white">
                    <CardContent className="p-12 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
                        <Package className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-charcoal">
                          Tidak Ada Barang Ditemukan
                        </h3>
                        <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                          {searchTerm || selectedCategory !== 'all'
                            ? 'Tidak ada barang yang cocok dengan kriteria pencarian.'
                            : 'Belum ada data barang yang didaftarkan pada kategori ini.'}
                        </p>
                      </div>
                      {canManage && !searchTerm && (
                        <Button
                          size="sm"
                          onClick={() => setIsCreateModalOpen(true)}
                          className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white mt-2"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Daftarkan Barang Pertama</span>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayList.map((item) => {
                    const conditionMeta = CONDITION_BADGES[item.condition] || CONDITION_BADGES.good

                    return (
                      <Card
                        key={item.id}
                        className="bg-white hover:border-sage-400 transition-all flex flex-col justify-between"
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[10px] bg-warm-100 text-charcoal font-semibold px-2 py-0.5 rounded border border-warm-200">
                              {item.item_code || 'INV'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={item.item_type === 'asset' ? 'secondary' : 'outline'}
                                className="text-[10px]"
                              >
                                {item.item_type === 'asset' ? 'Aset' : 'Habis Pakai'}
                              </Badge>

                              <Badge variant={conditionMeta.variant} className="text-[10px]">
                                {conditionMeta.label}
                              </Badge>
                            </div>
                          </div>

                          <CardTitle className="text-sm font-serif font-semibold text-charcoal line-clamp-1 mt-2">
                            {item.name}
                          </CardTitle>
                          <p className="text-xs text-charcoal-muted">{item.category}</p>
                        </CardHeader>

                        <CardContent className="p-4 pt-1 space-y-3">
                          {/* Quantity pill */}
                          <div className="rounded-lg border border-warm-200 bg-warm-50/60 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-charcoal-muted">Stok Tersedia:</span>
                              <span
                                className={`font-semibold ${
                                  item.available_quantity > 0 ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {item.available_quantity} / {item.quantity} {item.unit}
                              </span>
                            </div>

                            <div className="w-full bg-warm-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.available_quantity > 0 ? 'bg-emerald-600' : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${
                                    item.quantity > 0
                                      ? Math.min(100, (item.available_quantity / item.quantity) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Extra info */}
                          <div className="space-y-1 text-xs text-charcoal-muted">
                            {item.location && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3 w-3 text-sage-700 shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                            {item.responsible_person && (
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="h-3 w-3 text-sage-700 shrink-0" />
                                <span className="truncate">PJ: {item.responsible_person}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-warm-200 flex items-center justify-between gap-2">
                            {item.item_type === 'asset' && item.available_quantity > 0 && (
                              <Button
                                size="sm"
                                onClick={() => setBorrowTargetItem(item)}
                                className="text-xs h-7 bg-sage-700 hover:bg-sage-800 text-white"
                              >
                                Pinjam
                              </Button>
                            )}

                            {canManage && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setStockAdjustmentItem(item)}
                                  className="text-xs h-7 px-2"
                                  title="Sesuaikan Stok / Mutasi"
                                >
                                  Mutasi
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingItem(item)}
                                  className="h-7 w-7 text-charcoal-muted hover:text-charcoal"
                                  title="Edit Barang"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setItemToDelete(item)}
                                  className="h-7 w-7 text-charcoal-muted hover:text-red-600"
                                  title="Hapus Barang"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            })()
          )}
        </>
      )}

      {/* TAB CONTENT: LOANS (Peminjaman) */}
      {activeTab === 'loans' && (
        <Card className="bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-serif">Daftar Peminjaman Barang</CardTitle>
            <CardDescription className="text-xs">
              Alur persetujuan, penyerahan, dan pengembalian barang posko KKN.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {isLoadingLoans ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : loans.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-8">
                Belum ada permohonan peminjaman barang saat ini.
              </p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => {
                  const statusMeta = LOAN_STATUS_BADGES[loan.status] || LOAN_STATUS_BADGES.pending
                  const isBorrower = loan.borrower_id === user?.id

                  return (
                    <div
                      key={loan.id}
                      className="p-3.5 rounded-lg border border-warm-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal text-sm">
                            {loan.item?.name || 'Barang'}
                          </span>
                          <span className="font-mono text-[10px] text-charcoal-muted">
                            ({loan.quantity} unit)
                          </span>
                          <Badge variant={statusMeta.variant} className="text-[10px]">
                            {statusMeta.label}
                          </Badge>
                        </div>

                        <p className="text-charcoal-muted">
                          Peminjam:{' '}
                          <span className="font-medium text-charcoal">
                            {loan.borrower?.full_name || 'Anggota Posko'}
                          </span>{' '}
                          · Keperluan: <span className="italic">{loan.purpose}</span>
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-charcoal-muted">
                          <span>
                            Rencana Kembali:{' '}
                            <span className="font-medium">
                              {new Date(loan.expected_return_date).toLocaleDateString('id-ID')}
                            </span>
                          </span>
                          {loan.actual_return_date && (
                            <span>
                              Dikembalikan:{' '}
                              {new Date(loan.actual_return_date).toLocaleDateString('id-ID')}
                            </span>
                          )}
                          {loan.condition_after && (
                            <span>
                              Kondisi Akhir:{' '}
                              {CONDITION_BADGES[loan.condition_after]?.label || loan.condition_after}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons based on status & role */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {canManage && (loan.status === 'pending' || loan.status === 'approved') && (
                          <>
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await approveAndHandoutLoan(loan.id)
                                  toast({
                                    title: 'Barang Diserahkan',
                                    description: 'Status peminjaman kini aktif dan stok barang telah dipotong.',
                                    variant: 'success',
                                  })
                                  refetchLoans()
                                  refetchItems()
                                } catch (err: any) {
                                  toast({
                                    title: 'Gagal Menyerahkan Barang',
                                    description: err.message,
                                    variant: 'error',
                                  })
                                }
                              }}
                              className="text-xs h-7 bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                              Setujui &amp; Serahkan
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const reason = prompt('Masukkan alasan penolakan:')
                                if (!reason?.trim()) return
                                try {
                                  await rejectInventoryLoan(loan.id, reason)
                                  toast({ title: 'Peminjaman Ditolak', variant: 'success' })
                                  refetchLoans()
                                } catch (err: any) {
                                  toast({ title: 'Gagal Menolak', description: err.message, variant: 'error' })
                                }
                              }}
                              className="text-xs h-7 text-red-700"
                            >
                              Tolak
                            </Button>
                          </>
                        )}

                        {canManage && loan.status === 'borrowed' && (
                          <Button
                            size="sm"
                            onClick={() => setReturningLoan(loan)}
                            className="text-xs h-7 bg-sage-700 hover:bg-sage-800 text-white"
                          >
                            Catat Pengembalian
                          </Button>
                        )}

                        {isBorrower && loan.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await cancelInventoryLoan(loan.id)
                                toast({ title: 'Peminjaman Dibatalkan', variant: 'success' })
                                refetchLoans()
                              } catch (err: any) {
                                toast({ title: 'Gagal Membatalkan', description: err.message, variant: 'error' })
                              }
                            }}
                            className="text-xs h-7 text-charcoal-muted"
                          >
                            Batalkan
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: MOVEMENTS (Riwayat Mutasi) */}
      {activeTab === 'movements' && (
        <Card className="bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-serif">Riwayat Mutasi Stok Inventaris</CardTitle>
            <CardDescription className="text-xs">
              Log transaksi keluar/masuk, peminjaman, dan penyesuaian stok.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {isLoadingMovements ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-xs text-charcoal-muted text-center py-8">
                Belum ada riwayat mutasi stok tercatat.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-warm-200 text-charcoal-muted font-semibold">
                      <th className="py-2 px-3">Waktu</th>
                      <th className="py-2 px-3">Nama Barang</th>
                      <th className="py-2 px-3">Tipe Mutasi</th>
                      <th className="py-2 px-3">Jumlah</th>
                      <th className="py-2 px-3">Petugas / Peminjam</th>
                      <th className="py-2 px-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-warm-50">
                        <td className="py-2.5 px-3 text-charcoal-muted whitespace-nowrap">
                          {new Date(m.movement_date).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-charcoal">
                          {m.item?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="uppercase text-[10px] font-semibold tracking-wider">
                            {m.movement_type === 'in'
                              ? 'Masuk'
                              : m.movement_type === 'out'
                                ? 'Keluar'
                                : m.movement_type === 'borrow'
                                  ? 'Dipinjam'
                                  : m.movement_type === 'return'
                                    ? 'Kembali'
                                    : 'Koreksi'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{m.quantity}</td>
                        <td className="py-2.5 px-3 text-charcoal-muted">
                          {m.user?.full_name || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-charcoal-muted">{m.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODALS */}
      {/* 1. Create/Edit Item Modal */}
      {(isCreateModalOpen || editingItem) && (
        <ItemFormModal
          open={isCreateModalOpen || Boolean(editingItem)}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingItem(null)
          }}
          initialData={editingItem}
          onSubmit={async (data) => {
            if (editingItem) {
              await updateMutation.mutateAsync({ id: editingItem.id, input: data })
            } else {
              await createMutation.mutateAsync(data as CreateInventoryItemInput)
            }
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* 2. Borrow Request Modal */}
      {borrowTargetItem && (
        <BorrowRequestModal
          open={Boolean(borrowTargetItem)}
          onClose={() => setBorrowTargetItem(null)}
          item={borrowTargetItem}
          onSubmit={async (data) => {
            await requestLoanMutation.mutateAsync(data)
          }}
          isSubmitting={requestLoanMutation.isPending}
        />
      )}

      {/* 3. Return Loan Modal */}
      {returningLoan && (
        <ReturnLoanModal
          open={Boolean(returningLoan)}
          onClose={() => setReturningLoan(null)}
          loan={returningLoan}
          onSuccess={() => {
            setReturningLoan(null)
            refetchLoans()
            refetchItems()
          }}
        />
      )}

      {/* 4. Stock Adjustment Modal */}
      {stockAdjustmentItem && (
        <StockAdjustmentModal
          open={Boolean(stockAdjustmentItem)}
          onClose={() => setStockAdjustmentItem(null)}
          item={stockAdjustmentItem}
          onSuccess={() => {
            setStockAdjustmentItem(null)
            refetchItems()
            refetchMovements()
          }}
        />
      )}

      {/* 5. Delete Item Confirmation */}
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (itemToDelete) {
            await deleteMutation.mutateAsync(itemToDelete.id)
          }
        }}
        title="Hapus Barang Inventaris?"
        description={`Apakah Anda yakin ingin menghapus barang "${itemToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Barang"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Add/Edit Item Form
// -------------------------------------------------------------
interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  initialData?: InventoryItem | null
  onSubmit: (data: Partial<CreateInventoryItemInput>) => Promise<void>
  isSubmitting: boolean
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  open,
  onClose,
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const isEditing = Boolean(initialData)
  const [name, setName] = useState(initialData?.name || '')
  const [itemCode, setItemCode] = useState(initialData?.item_code || '')
  const [category, setCategory] = useState(initialData?.category || 'Elektronik')
  const [itemType, setItemType] = useState<InventoryItemType>(initialData?.item_type || 'asset')
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)
  const [unit, setUnit] = useState(initialData?.unit || 'unit')
  const [condition, setCondition] = useState<InventoryCondition>(initialData?.condition || 'good')
  const [location, setLocation] = useState(initialData?.location || 'Posko KKN')
  const [responsiblePerson, setResponsiblePerson] = useState(initialData?.responsible_person || '')
  const [source, setSource] = useState(initialData?.source || '')
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '')
  const [description, setDescription] = useState(initialData?.description || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await onSubmit({
      name: name.trim(),
      item_code: itemCode.trim() || undefined,
      category,
      item_type: itemType,
      quantity: Number(quantity),
      unit: unit.trim() || 'unit',
      condition,
      location: location.trim() || undefined,
      responsible_person: responsiblePerson.trim() || undefined,
      source: source.trim() || undefined,
      price: price ? Number(price) : undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Ubah Data Barang' : 'Daftarkan Barang Baru ke Inventaris'}
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Nama Barang *</label>
            <Input
              placeholder="Contoh: Proyektor Epson EB-X400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Kode Barang (Opsional)</label>
            <Input
              placeholder="Kosongkan untuk auto-generate"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Jenis Barang</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as InventoryItemType)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="asset">Aset Posko (Dapat Dipinjam)</option>
              <option value="consumable">Habis Pakai (ATK, Spidol, Sabun, dll)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah *</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isEditing}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Satuan</label>
            <Input
              placeholder="unit / buah / rim"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Kondisi</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as InventoryCondition)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="good">Baik</option>
              <option value="fair">Cukup</option>
              <option value="damaged">Rusak</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Lokasi Penyimpanan</label>
            <Input
              placeholder="Posko KKN / Ruang Tengah"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Penanggung Jawab (PJ)</label>
            <Input
              placeholder="Nama anggota PJ..."
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Sumber Perolehan</label>
            <Input
              placeholder="Pribadi / Dana KKN / Hibah Desa"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Estimasi Harga (Rp)</label>
            <Input
              type="number"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Keterangan Tambahan</label>
          <textarea
            rows={2}
            placeholder="Catatan nomor seri, kelengkapan kabel, dll..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Daftarkan Barang'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Borrow Request Form
// -------------------------------------------------------------
interface BorrowRequestModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
  onSubmit: (input: RequestLoanInput) => Promise<void>
  isSubmitting: boolean
}

const BorrowRequestModal: React.FC<BorrowRequestModalProps> = ({
  open,
  onClose,
  item,
  onSubmit,
  isSubmitting,
}) => {
  const [quantity, setQuantity] = useState(1)
  const [purpose, setPurpose] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purpose.trim() || !expectedReturnDate) return

    await onSubmit({
      item_id: item.id,
      quantity,
      purpose: purpose.trim(),
      expected_return_date: new Date(`${expectedReturnDate}T23:59:59`).toISOString(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Peminjaman Barang">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
          <p className="font-semibold text-charcoal">{item.name}</p>
          <p className="text-charcoal-muted">
            Kode: <span className="font-mono">{item.item_code}</span> · Tersedia:{' '}
            <span className="font-semibold text-emerald-700">
              {item.available_quantity} {item.unit}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah Dipinjam *</label>
            <Input
              type="number"
              min={1}
              max={item.available_quantity}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.min(item.available_quantity, Math.max(1, parseInt(e.target.value) || 1)))
              }
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Rencana Tanggal Pengembalian *</label>
            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Keperluan Penggunaan *</label>
          <textarea
            rows={2}
            placeholder="Contoh: Presentasi penyuluhan stunting di Dusun Pringgasela Daye..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Mengirim...' : 'Kirim Permohonan Pinjam'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Return Loan Form
// -------------------------------------------------------------
interface ReturnLoanModalProps {
  open: boolean
  onClose: () => void
  loan: InventoryLoan
  onSuccess: () => void
}

const ReturnLoanModal: React.FC<ReturnLoanModalProps> = ({ open, onClose, loan, onSuccess }) => {
  const { toast } = useToast()
  const [conditionAfter, setConditionAfter] = useState<InventoryCondition>('good')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await returnInventoryLoan(loan.id, conditionAfter, notes)
      toast({ title: 'Pengembalian Berhasil Dicatat', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Mencatat Pengembalian', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pengembalian Barang">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
          <p className="font-semibold text-charcoal">
            {loan.quantity} unit barang telah diserahkan kembali.
          </p>
          <p className="text-charcoal-muted">
            Kondisi sebelum dipinjam: <span className="font-semibold">{CONDITION_BADGES[loan.condition_before].label}</span>
          </p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Kondisi Barang Setelah Dipakai *</label>
          <select
            value={conditionAfter}
            onChange={(e) => setConditionAfter(e.target.value as InventoryCondition)}
            className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
          >
            <option value="good">Baik (Lengkap & Berfungsi Normal)</option>
            <option value="fair">Cukup (Ada goresan/aus wajar)</option>
            <option value="damaged">Rusak (Perlu servis/perbaikan)</option>
            <option value="lost">Hilang (Barang tidak kembali)</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Tambahan Pengembalian</label>
          <textarea
            rows={2}
            placeholder="Catatan kondisi saat diterima kembali..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Memproses...' : 'Konfirmasi Pengembalian'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Stock Adjustment (Mutasi) Form
// -------------------------------------------------------------
interface StockAdjustmentModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
  onSuccess: () => void
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  open,
  onClose,
  item,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return

    setIsSubmitting(true)
    try {
      await adjustInventoryStock(item.id, movementType, quantity, notes)
      toast({ title: 'Mutasi Stok Berhasil', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Menyesuaikan Stok', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mutasi & Penyesuaian Stok Barang">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
          <p className="font-semibold text-charcoal">{item.name}</p>
          <p className="text-charcoal-muted">
            Stok saat ini: {item.available_quantity} / {item.quantity} {item.unit}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Aksi Mutasi *</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="w-full text-xs h-9 px-2.5 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="in">Barang Masuk (Tambah Stok)</option>
              <option value="out">Barang Keluar (Kurangi Stok)</option>
              <option value="adjustment">Koreksi Total Stok (Audit Fisik)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah Unit *</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Alasan Penyesuaian / Mutasi *</label>
          <textarea
            rows={2}
            placeholder="Contoh: Pembelian tambahan ATK posko / Pemakaian habis pakai kegiatan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Memproses...' : 'Simpan Mutasi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

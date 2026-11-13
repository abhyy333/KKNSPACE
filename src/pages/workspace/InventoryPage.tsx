import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import {
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchInventoryHandovers,
  createInventoryHandover,
  acceptInventoryHandover,
  rejectInventoryHandover,
  cancelInventoryHandover,
  resolveItemReconciliation,
  fetchInventoryLoans,
  approveAndHandoutLoan,
  returnInventoryLoan,
  adjustInventoryStock,
  fetchInventoryMovements,
  type CreateInventoryItemInput,
} from '@/services/inventoryApi'
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
  InventoryItem,
  InventoryLoan,
  InventoryCondition,
  InventoryTrackingModel,
  InventoryOwnershipType,
  InventoryItemStatus,
  InventoryHandover,
  InventoryReconciliationStatus,
  InventoryFinalAction,
  KknTeamDirectoryMember,
} from '@/types/database'
import {
  Package,
  Layers,
  AlertTriangle,
  Plus,
  Search,
  ArrowRightLeft,
  Edit2,
  Trash2,
  MapPin,
  User,
  QrCode,
  Printer,
  FileCheck,
  ArrowRight,
  Handshake,
  Download,
} from 'lucide-react'

// -------------------------------------------------------------
// Constants & Metadata
// -------------------------------------------------------------
const CATEGORY_OPTIONS = [
  'Elektronik',
  'Peralatan Dapur & Konsumsi',
  'Peralatan Rumah Tangga',
  'Peralatan Kebersihan',
  'Perlengkapan Posko',
  'Peralatan Kegiatan & Proker',
  'Peralatan Medis & P3K',
  'ATK & Administrasi',
  'Lainnya',
]

const LOCATION_OPTIONS = [
  'Posko',
  'Kamar',
  'Dapur',
  'Ruang Penyimpanan',
  'Lokasi Kegiatan',
  'Dibawa Anggota',
  'Lainnya',
]

const OWNERSHIP_META: Record<
  InventoryOwnershipType,
  { label: string; badgeClass: string; desc: string }
> = {
  GROUP_OWNED: {
    label: 'Aset Kelompok (Kas KKN)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    desc: 'Dibeli menggunakan kas kelompok atau dana bersama KKN.',
  },
  PERSONAL_OWNED: {
    label: 'Milik Pribadi Anggota',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    desc: 'Barang pribadi yang dibawa anggota ke posko.',
  },
  BORROWED_EXTERNAL: {
    label: 'Pinjaman Pihak Luar',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    desc: 'Dipinjam dari warga, pemilik posko, kampus, atau kantor desa.',
  },
  DONATED: {
    label: 'Hibah / Donasi',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    desc: 'Diterima melalui hibah atau sumbangan pihak ketiga.',
  },
}

const STATUS_META: Record<
  InventoryItemStatus,
  { label: string; badgeClass: string }
> = {
  stored: { label: 'Tersimpan di Posko', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  in_use: { label: 'Sedang Digunakan', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  borrowed_member: { label: 'Dipinjam Anggota', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  borrowed_external: { label: 'Dipinjam Pihak Luar', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' },
  maintenance: { label: 'Dalam Perbaikan', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  returned: { label: 'Sudah Dikembalikan', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  in_return_process: { label: 'Proses Pengembalian', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  lost: { label: 'Hilang', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  damaged: { label: 'Rusak', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  disposed: { label: 'Dihapuskan', badgeClass: 'bg-warm-100 text-charcoal border-warm-300' },
}

const CONDITION_BADGES: Record<
  InventoryCondition,
  { label: string; badgeClass: string }
> = {
  good: { label: 'Baik', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  fair: { label: 'Cukup', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  damaged: { label: 'Rusak', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  lost: { label: 'Hilang', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
}

const RECONCILIATION_STATUS_META: Record<
  InventoryReconciliationStatus,
  { label: string; badgeClass: string }
> = {
  pending: { label: 'Belum Direkonsiliasi', badgeClass: 'bg-warm-100 text-charcoal border-warm-300' },
  resolved: { label: 'Selesai & Beres', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  problematic: { label: 'Bermasalah / Butuh Tindak Lanjut', badgeClass: 'bg-rose-50 text-rose-800 border-rose-300' },
  waiting_confirmation: { label: 'Menunggu Konfirmasi', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' },
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

  // Main Tabs
  type MainTab = 'all' | 'group' | 'personal' | 'borrowed' | 'handovers' | 'reconciliation' | 'loans' | 'movements'
  const [activeTab, setActiveTab] = useState<MainTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null)
  const [handoverItem, setHandoverItem] = useState<InventoryItem | null>(null)
  const [reconcilingItem, setReconcilingItem] = useState<InventoryItem | null>(null)
  const [returningLoan, setReturningLoan] = useState<InventoryLoan | null>(null)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<InventoryItem | null>(null)
  const [isClosingReportOpen, setIsClosingReportOpen] = useState(false)
  const [isQuickScanModalOpen, setIsQuickScanModalOpen] = useState(false)

  // Queries
  const {
    data: items = [],
    isLoading: isLoadingItems,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['inventory-items', selectedCategory, searchTerm, selectedLocation],
    queryFn: () =>
      fetchInventoryItems({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        current_location: selectedLocation === 'all' ? undefined : selectedLocation,
        search: searchTerm,
      }),
  })

  const { data: directoryMembers = [] } = useQuery({
    queryKey: ['team-directory'],
    queryFn: fetchTeamDirectory,
  })

  const {
    data: handovers = [],
    isLoading: isLoadingHandovers,
    refetch: refetchHandovers,
  } = useQuery({
    queryKey: ['inventory-handovers'],
    queryFn: () => fetchInventoryHandovers(),
    enabled: activeTab === 'handovers' || activeTab === 'all',
  })

  const {
    data: loans = [],
    isLoading: isLoadingLoans,
    refetch: refetchLoans,
  } = useQuery({
    queryKey: ['inventory-loans'],
    queryFn: () => fetchInventoryLoans(),
    enabled: activeTab === 'loans' || activeTab === 'all',
  })

  const {
    data: movements = [],
    isLoading: isLoadingMovements,
  } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => fetchInventoryMovements(),
    enabled: activeTab === 'movements',
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      toast({ title: 'Barang Berhasil Didaftarkan', variant: 'success' })
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

  // Derived Categorized Lists
  const groupItems = useMemo(() => items.filter((i) => i.ownership_type === 'GROUP_OWNED'), [items])
  const personalItems = useMemo(() => items.filter((i) => i.ownership_type === 'PERSONAL_OWNED'), [items])
  const borrowedItems = useMemo(
    () => items.filter((i) => i.ownership_type === 'BORROWED_EXTERNAL' || i.ownership_type === 'DONATED'),
    [items]
  )

  // Calculated Stats
  const totalItemsCount = items.length
  const groupCount = groupItems.length
  const personalCount = personalItems.length
  const borrowedCount = borrowedItems.length
  const storedCount = items.filter((i) => i.item_status === 'stored').length
  const inUseCount = items.filter((i) => i.item_status === 'in_use' || i.item_status === 'borrowed_member').length
  const damagedOrLostCount = items.filter((i) => i.condition === 'damaged' || i.condition === 'lost' || i.item_status === 'lost' || i.item_status === 'damaged').length
  const reconciledCount = items.filter((i) => i.reconciliation_status === 'resolved').length
  const pendingReconcileCount = items.filter((i) => i.reconciliation_status === 'pending').length
  const problematicCount = items.filter((i) => i.reconciliation_status === 'problematic').length

  const reconciliationPercentage = totalItemsCount > 0 ? Math.round((reconciledCount / totalItemsCount) * 100) : 0

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-sage-100 px-2 py-0.5 text-xs font-semibold text-sage-800">
              <Package className="h-3 w-3" />
              <span>Operasional Lapangan</span>
            </span>
            <span className="text-xs text-charcoal-muted">KKN Desa Pringgasela Selatan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Inventaris &amp; Logistik Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1 max-w-2xl leading-relaxed">
            Sistem pencatatan terpadu dengan pelacakan kepemilikan (*Group*, *Personal*, *External*, *Donated*), serah terima antaranggota, QR code, dan rekonsiliasi akhir penutupan KKN.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsQuickScanModalOpen(true)}
            className="text-xs gap-1.5 border-warm-300 bg-white"
          >
            <QrCode className="h-3.5 w-3.5 text-sage-700" />
            <span>Cari / Scan QR</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsClosingReportOpen(true)}
            className="text-xs gap-1.5 border-sage-300 text-sage-800 bg-sage-50/70 hover:bg-sage-100"
          >
            <FileCheck className="h-3.5 w-3.5 text-sage-700" />
            <span>Laporan Penutupan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Daftarkan Barang Baru</span>
          </Button>
        </div>
      </div>

      {/* 2. Visual Metric Cards (Ownership & Reconciliation Highlights) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-warm-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-charcoal-muted">Total Barang</p>
            <p className="text-xl font-serif font-bold text-charcoal mt-1">{totalItemsCount}</p>
            <p className="text-[10px] text-charcoal-muted mt-0.5">Item terdaftar di posko</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-emerald-800">Aset Kelompok</p>
            <p className="text-xl font-serif font-bold text-emerald-900 mt-1">{groupCount}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Dibeli kas KKN</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-blue-800">Milik Pribadi</p>
            <p className="text-xl font-serif font-bold text-blue-900 mt-1">{personalCount}</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Bawaan anggota</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-amber-800">Pinjaman Luar / Hibah</p>
            <p className="text-xl font-serif font-bold text-amber-900 mt-1">{borrowedCount}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Warga, kampus, donatur</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-warm-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-charcoal-muted">Dalam Penggunaan</p>
            <p className="text-xl font-serif font-bold text-charcoal mt-1">{inUseCount}</p>
            <p className="text-[10px] text-charcoal-muted mt-0.5">Tersimpan: {storedCount} | Rusak/Hilang: {damagedOrLostCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-sage-50/70 border-sage-300">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-sage-900">Rekonsiliasi Akhir</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-serif font-bold text-sage-900">{reconciliationPercentage}%</span>
              <span className="text-[10px] text-sage-700">({reconciledCount}/{totalItemsCount})</span>
            </div>
            <p className="text-[10px] text-sage-800 mt-0.5">
              {pendingReconcileCount} belum beres {problematicCount > 0 ? `(${problematicCount} bermasalah)` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-warm-200 pb-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'all' ? 'bg-charcoal text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Semua Barang ({totalItemsCount})
          </button>

          <button
            onClick={() => setActiveTab('group')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'group' ? 'bg-emerald-800 text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Aset Kelompok ({groupCount})
          </button>

          <button
            onClick={() => setActiveTab('personal')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'personal' ? 'bg-blue-800 text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Milik Pribadi ({personalCount})
          </button>

          <button
            onClick={() => setActiveTab('borrowed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'borrowed' ? 'bg-amber-800 text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Pinjaman Luar ({borrowedCount})
          </button>

          <button
            onClick={() => setActiveTab('handovers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'handovers' ? 'bg-purple-800 text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Serah Terima Antaranggota ({handovers.filter((h) => h.status === 'pending').length} Baru)
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'reconciliation' ? 'bg-sage-800 text-white' : 'bg-warm-100 text-sage-900 font-bold hover:bg-sage-200'
            }`}
          >
            Penutupan KKN ({pendingReconcileCount} Belum Beres)
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'loans' ? 'bg-charcoal text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Pinjam Pakai Posko ({loans.filter((l) => l.status === 'borrowed' || l.status === 'pending').length})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'movements' ? 'bg-charcoal text-white' : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Riwayat Mutasi
          </button>
        </div>

        {/* Filters */}
        {(activeTab === 'all' || activeTab === 'group' || activeTab === 'personal' || activeTab === 'borrowed' || activeTab === 'reconciliation') && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
              <Input
                placeholder="Cari barang / kode / pemilik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8 w-44 sm:w-56"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
            >
              <option value="all">Semua Lokasi</option>
              {LOCATION_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB A: ITEMS CATALOG (All, Group, Personal, Borrowed) */}
      {(activeTab === 'all' || activeTab === 'group' || activeTab === 'personal' || activeTab === 'borrowed') && (
        <div className="space-y-4">
          {isLoadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            (() => {
              const displayList =
                activeTab === 'group'
                  ? groupItems
                  : activeTab === 'personal'
                  ? personalItems
                  : activeTab === 'borrowed'
                  ? borrowedItems
                  : items

              if (displayList.length === 0) {
                return (
                  <Card className="border-dashed border-warm-300 bg-white">
                    <CardContent className="p-12 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
                        <Package className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-charcoal">Tidak Ada Barang Ditemukan</h3>
                        <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                          Belum ada barang inventaris pada kategori atau filter ini.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white mt-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Daftarkan Barang Baru</span>
                      </Button>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayList.map((item) => {
                    const ownMeta = OWNERSHIP_META[item.ownership_type] || OWNERSHIP_META.GROUP_OWNED
                    const statusMeta = STATUS_META[item.item_status] || STATUS_META.stored
                    const conditionMeta = CONDITION_BADGES[item.condition] || CONDITION_BADGES.good
                    const isTracked = item.tracking_model === 'tracked'
                    const isOwner = user?.id && item.owner_member_id === user.id

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

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${ownMeta.badgeClass}`}>
                                {ownMeta.label}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusMeta.badgeClass}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                          </div>

                          <CardTitle className="text-base font-serif font-semibold text-charcoal mt-2 line-clamp-1">
                            {item.name}
                          </CardTitle>

                          <CardDescription className="text-xs text-charcoal-muted line-clamp-2 mt-0.5">
                            {item.description || 'Tidak ada deskripsi tambahan.'}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-3">
                          {/* Owner & Location Info Box */}
                          <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-2.5 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-charcoal-muted flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Pemilik Resmi:</span>
                              </span>
                              <span className="font-semibold text-charcoal truncate max-w-[150px]">
                                {item.owner_name || (item.ownership_type === 'GROUP_OWNED' ? 'Kelompok KKN' : '-')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-charcoal-muted flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>Lokasi Terkini:</span>
                              </span>
                              <span className="font-semibold text-charcoal">
                                {item.current_location || 'Posko'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-charcoal-muted">Pemegang Saat Ini:</span>
                              <span className="font-semibold text-charcoal truncate max-w-[150px]">
                                {item.current_holder_name || item.responsible_person || 'Posko KKN'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-warm-200/80">
                              <span className="text-charcoal-muted">Jumlah &amp; Kondisi:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-charcoal">
                                  {item.quantity} {item.unit}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${conditionMeta.badgeClass}`}>
                                  {conditionMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-warm-200">
                            <div className="flex items-center gap-1">
                              {isTracked && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setQrItem(item)}
                                  className="h-7 px-2 text-xs text-charcoal-muted hover:text-charcoal"
                                  title="Lihat & Cetak QR Code"
                                >
                                  <QrCode className="h-3.5 w-3.5" />
                                  <span className="ml-1 hidden sm:inline">QR</span>
                                </Button>
                              )}

                              {isTracked && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setHandoverItem(item)}
                                  className="h-7 px-2 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                                  title="Serah Terima Barang ke Anggota Lain"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  <span className="ml-1 hidden sm:inline">Serah Terima</span>
                                </Button>
                              )}

                              {item.item_type === 'consumable' && canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setStockAdjustmentItem(item)}
                                  className="h-7 px-2 text-xs text-amber-800 hover:bg-amber-50"
                                  title="Mutasi Stok Opname"
                                >
                                  <Layers className="h-3.5 w-3.5" />
                                  <span className="ml-1 hidden sm:inline">Mutasi</span>
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {(canManage || isOwner) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(item)}
                                  className="h-7 w-7 p-0 text-charcoal-muted hover:text-charcoal"
                                  title="Ubah Data Barang"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setItemToDelete(item)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Hapus Barang"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* TAB B: SERAH TERIMA ANTARANGGOTA (HANDOVERS) */}
      {activeTab === 'handovers' && (
        <Card className="bg-white border-warm-200">
          <CardHeader className="p-4 sm:p-5 border-b border-warm-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-serif font-semibold text-charcoal flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-purple-700" />
                  <span>Sistem Serah Terima &amp; Perpindahan Pemegang Barang</span>
                </CardTitle>
                <CardDescription className="text-xs text-charcoal-muted mt-1">
                  Mencegah barang pribadi atau aset posko tertukar atau tidak diketahui siapa pemegang fisiknya saat ini.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  if (items.filter((i) => i.tracking_model === 'tracked').length === 0) {
                    toast({ title: 'Belum Ada Barang Individual', description: 'Daftarkan barang individual terlebih dahulu.', variant: 'error' })
                    return
                  }
                  setHandoverItem(items.find((i) => i.tracking_model === 'tracked') || null)
                }}
                className="text-xs gap-1.5 bg-purple-700 hover:bg-purple-800 text-white"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Buat Serah Terima Baru</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingHandovers ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : handovers.length === 0 ? (
              <div className="p-12 text-center text-charcoal-muted text-xs">
                Belum ada catatan serah terima barang antaranggota.
              </div>
            ) : (
              <div className="divide-y divide-warm-200">
                {handovers.map((h) => {
                  const isPending = h.status === 'pending'
                  const isRecipient = user?.id && h.to_holder_id === user.id
                  const canAct = isRecipient || canManage

                  return (
                    <div key={h.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-warm-50/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal text-xs">
                            {h.item?.name || 'Barang Inventaris'}
                          </span>
                          <span className="font-mono text-[10px] bg-warm-100 text-charcoal px-1.5 py-0.2 rounded border border-warm-200">
                            {h.item?.item_code || 'INV'}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            h.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : h.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {h.status === 'accepted' ? 'Diterima & Sah' : h.status === 'rejected' ? 'Ditolak' : 'Menunggu Konfirmasi'}
                          </span>
                        </div>

                        <div className="text-xs text-charcoal-muted flex items-center gap-2 flex-wrap">
                          <span>Dari: <strong className="text-charcoal">{h.from_holder_name}</strong> ({h.origin_location})</span>
                          <ArrowRight className="h-3 w-3 text-charcoal-muted" />
                          <span>Kepada: <strong className="text-charcoal">{h.to_holder_name}</strong> ({h.destination_location})</span>
                        </div>

                        {h.purpose && (
                          <p className="text-[11px] text-charcoal-muted">Keperluan: {h.purpose}</p>
                        )}
                        {h.notes && (
                          <p className="text-[11px] text-charcoal-muted italic">Catatan: {h.notes}</p>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          {canAct && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await acceptInventoryHandover(h.id)
                                  toast({ title: 'Serah Terima Diterima', description: 'Lokasi dan pemegang barang telah diperbarui.', variant: 'success' })
                                  refetchHandovers()
                                  refetchItems()
                                } catch (err: any) {
                                  toast({ title: 'Gagal Konfirmasi', description: err.message, variant: 'error' })
                                }
                              }}
                              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                              Konfirmasi Penerimaan
                            </Button>
                          )}

                          {canAct && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const reason = prompt('Masukkan alasan penolakan:')
                                if (!reason?.trim()) return
                                try {
                                  await rejectInventoryHandover(h.id, reason)
                                  toast({ title: 'Serah Terima Ditolak', variant: 'success' })
                                  refetchHandovers()
                                } catch (err: any) {
                                  toast({ title: 'Gagal Menolak', description: err.message, variant: 'error' })
                                }
                              }}
                              className="text-xs h-8 text-rose-700 border-rose-200"
                            >
                              Tolak
                            </Button>
                          )}

                          {user?.id && h.created_by === user.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  await cancelInventoryHandover(h.id)
                                  toast({ title: 'Permintaan Dibatalkan', variant: 'success' })
                                  refetchHandovers()
                                } catch (err: any) {
                                  toast({ title: 'Gagal Membatalkan', description: err.message, variant: 'error' })
                                }
                              }}
                              className="text-xs h-8 text-charcoal-muted"
                            >
                              Batalkan
                            </Button>
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
      )}

      {/* TAB C: REKONSILIASI & PENUTUPAN AKHIR KKN (THE CRITICAL FEATURE) */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-4">
          <Card className="bg-sage-50/80 border-sage-300">
            <CardHeader className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-sage-900 bg-sage-200/80 px-2 py-0.5 rounded">
                      Proses Penutupan Inventaris KKN
                    </span>
                    <Badge variant={reconciliationPercentage === 100 ? 'success' : 'warning'}>
                      {reconciliationPercentage === 100 ? 'Siap Ditutup 100%' : `${reconciliationPercentage}% Terselesaikan`}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-serif font-semibold text-sage-950">
                    Checklist Serah Terima &amp; Penutupan Inventaris
                  </CardTitle>
                  <CardDescription className="text-xs text-sage-800 leading-relaxed max-w-2xl">
                    Memastikan tidak ada barang pribadi tertinggal di posko, barang pinjaman warga belum kembali, atau aset kelompok terbengkalai saat masa KKN berakhir.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsClosingReportOpen(true)}
                    className="text-xs gap-1.5 bg-white border-sage-300 text-sage-900"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak Lembar Laporan</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Checklist Table */}
          <Card className="bg-white border-warm-200">
            <CardContent className="p-0">
              <div className="divide-y divide-warm-200">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-charcoal-muted">
                    Belum ada barang untuk direkonsiliasi.
                  </div>
                ) : (
                  items.map((item) => {
                    const ownMeta = OWNERSHIP_META[item.ownership_type] || OWNERSHIP_META.GROUP_OWNED
                    const reconMeta = RECONCILIATION_STATUS_META[item.reconciliation_status] || RECONCILIATION_STATUS_META.pending
                    const isResolved = item.reconciliation_status === 'resolved'

                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isResolved ? 'bg-white' : 'bg-warm-50/40'
                        }`}
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-charcoal">{item.name}</span>
                            <span className="font-mono text-[10px] bg-warm-100 text-charcoal px-1.5 py-0.2 rounded border border-warm-200">
                              {item.item_code}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${ownMeta.badgeClass}`}>
                              {ownMeta.label}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${reconMeta.badgeClass}`}>
                              {reconMeta.label}
                            </span>
                          </div>

                          <div className="text-xs text-charcoal-muted flex items-center gap-3 flex-wrap">
                            <span>Pemilik: <strong className="text-charcoal">{item.owner_name || 'Kelompok KKN'}</strong></span>
                            <span>Pemegang Terkini: <strong className="text-charcoal">{item.current_holder_name || 'Posko'}</strong></span>
                            <span>Lokasi: {item.current_location}</span>
                          </div>

                          {item.reconciliation_final_action && (
                            <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded inline-block border border-emerald-200">
                              Status Akhir: <strong>{item.reconciliation_final_action}</strong> | Diterima oleh: {item.reconciliation_receiver_name || '-'}
                            </p>
                          )}

                          {item.reconciliation_notes && (
                            <p className="text-[11px] text-charcoal-muted italic">
                              Catatan Rekonsiliasi: {item.reconciliation_notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isResolved ? 'outline' : 'default'}
                            onClick={() => setReconcilingItem(item)}
                            className={`text-xs h-8 gap-1 ${
                              isResolved
                                ? 'text-charcoal-muted border-warm-300'
                                : 'bg-sage-800 hover:bg-sage-900 text-white font-semibold'
                            }`}
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            <span>{isResolved ? 'Ubah Status Akhir' : 'Proses Rekonsiliasi'}</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB D: LOANS / PEMINJAMAN POSKO */}
      {activeTab === 'loans' && (
        <Card className="bg-white border-warm-200">
          <CardHeader className="p-4 sm:p-5 border-b border-warm-200">
            <CardTitle className="text-base font-serif font-semibold text-charcoal">
              Riwayat Peminjaman &amp; Pemakaian Barang Posko
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Peminjaman perlengkapan kegiatan antaranggota posko yang memerlukan persetujuan pengurus.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingLoans ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : loans.length === 0 ? (
              <div className="p-12 text-center text-xs text-charcoal-muted">
                Belum ada transaksi peminjaman aktif.
              </div>
            ) : (
              <div className="divide-y divide-warm-200">
                {loans.map((loan) => (
                  <div key={loan.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-charcoal">
                          {loan.item?.name || 'Barang Posko'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-warm-100 text-charcoal border-warm-200">
                          {loan.quantity} {loan.item?.unit || 'unit'}
                        </span>
                        <Badge variant={loan.status === 'borrowed' ? 'secondary' : loan.status === 'returned' ? 'success' : 'warning'}>
                          {loan.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-charcoal-muted">
                        Peminjam: <strong className="text-charcoal">{loan.borrower?.full_name || '-'}</strong> | Batas Kembali: {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString('id-ID') : '-'}
                      </p>
                      {loan.purpose && (
                        <p className="text-[11px] text-charcoal-muted">Keperluan: {loan.purpose}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage && loan.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await approveAndHandoutLoan(loan.id)
                              toast({ title: 'Peminjaman Disetujui', variant: 'success' })
                              refetchLoans()
                              refetchItems()
                            } catch (err: any) {
                              toast({ title: 'Gagal Menyetujui', description: err.message, variant: 'error' })
                            }
                          }}
                          className="text-xs h-7 bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          Setujui &amp; Serahkan
                        </Button>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB E: MOVEMENTS AUDIT LOG */}
      {activeTab === 'movements' && (
        <Card className="bg-white border-warm-200">
          <CardHeader className="p-4 sm:p-5 border-b border-warm-200">
            <CardTitle className="text-base font-serif font-semibold text-charcoal">
              Riwayat Perpindahan, Mutasi &amp; Jejak Audit Inventaris
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted">
              Catatan permanen setiap kali barang berpindah tangan, berubah lokasi, bertambah, berkurang, atau direkonsiliasi.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingMovements ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-xs text-charcoal-muted">
                Belum ada riwayat mutasi tercatat.
              </div>
            ) : (
              <div className="divide-y divide-warm-200">
                {movements.map((m) => (
                  <div key={m.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-charcoal">{m.item?.name || 'Barang'}</span>
                        <span className="font-mono text-[10px] text-charcoal-muted">({m.item?.item_code || '-'})</span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-warm-100 text-charcoal">
                          {m.movement_type}
                        </span>
                      </div>
                      <p className="text-charcoal-muted">
                        {m.from_holder && m.to_holder ? `${m.from_holder} → ${m.to_holder}` : m.notes || 'Perubahan data inventaris'}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-charcoal-muted">
                      <p>{m.user?.full_name || 'Petugas'}</p>
                      <p>{new Date(m.movement_date).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================= */}
      {/* MODALS */}
      {/* ============================================================= */}

      {/* 1. Modal Tambah / Edit Barang (Multi Ownership & Tracking Model) */}
      <ItemFormModal
        open={isCreateModalOpen || Boolean(editingItem)}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingItem(null)
        }}
        initialData={editingItem}
        directoryMembers={directoryMembers}
        onSubmit={async (data) => {
          if (editingItem) {
            await updateMutation.mutateAsync({ id: editingItem.id, input: data })
          } else {
            await createMutation.mutateAsync(data as CreateInventoryItemInput)
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* 2. Modal QR Code & Cetak Label Stiker */}
      {qrItem && (
        <QrCodeModal
          open={Boolean(qrItem)}
          onClose={() => setQrItem(null)}
          item={qrItem}
        />
      )}

      {/* 3. Modal Serah Terima Antaranggota */}
      {handoverItem && (
        <HandoverModal
          open={Boolean(handoverItem)}
          onClose={() => setHandoverItem(null)}
          item={handoverItem}
          directoryMembers={directoryMembers}
          onSuccess={() => {
            setHandoverItem(null)
            refetchHandovers()
            refetchItems()
          }}
        />
      )}

      {/* 4. Modal Rekonsiliasi Akhir KKN */}
      {reconcilingItem && (
        <ReconciliationResolveModal
          open={Boolean(reconcilingItem)}
          onClose={() => setReconcilingItem(null)}
          item={reconcilingItem}
          onSuccess={() => {
            setReconcilingItem(null)
            refetchItems()
          }}
        />
      )}

      {/* 5. Modal Laporan Penutupan Inventaris KKN */}
      <ClosingReportModal
        open={isClosingReportOpen}
        onClose={() => setIsClosingReportOpen(false)}
        items={items}
        handovers={handovers}
      />

      {/* 6. Modal Quick Search / Scan QR */}
      <QuickSearchQrModal
        open={isQuickScanModalOpen}
        onClose={() => setIsQuickScanModalOpen(false)}
        items={items}
      />

      {/* 7. Modal Mutasi Stok Opname */}
      {stockAdjustmentItem && (
        <StockAdjustmentModal
          open={Boolean(stockAdjustmentItem)}
          onClose={() => setStockAdjustmentItem(null)}
          item={stockAdjustmentItem}
          onSuccess={() => {
            setStockAdjustmentItem(null)
            refetchItems()
          }}
        />
      )}

      {/* 8. Modal Catat Pengembalian Pinjaman */}
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

      {/* 9. Konfirmasi Hapus Barang */}
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
// Sub-Modal: Add/Edit Item Form (Ownership Decoupled)
// -------------------------------------------------------------
interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  initialData?: InventoryItem | null
  directoryMembers: KknTeamDirectoryMember[]
  onSubmit: (data: Partial<CreateInventoryItemInput>) => Promise<void>
  isSubmitting: boolean
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  open,
  onClose,
  initialData,
  directoryMembers,
  onSubmit,
  isSubmitting,
}) => {
  const [trackingModel, setTrackingModel] = useState<InventoryTrackingModel>('tracked')
  const [ownershipType, setOwnershipType] = useState<InventoryOwnershipType>('GROUP_OWNED')
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0])
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('unit')
  const [condition, setCondition] = useState<InventoryCondition>('good')
  const [currentLocation, setCurrentLocation] = useState(LOCATION_OPTIONS[0])
  const [currentHolderName, setCurrentHolderName] = useState('')

  // Specific to PERSONAL_OWNED
  const [ownerMemberId, setOwnerMemberId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [postKknPlan, setPostKknPlan] = useState('take_home')

  // Specific to BORROWED_EXTERNAL
  const [lenderName, setLenderName] = useState('')
  const [lenderContact, setLenderContact] = useState('')
  const [borrowDueDate, setBorrowDueDate] = useState('')
  const [lenderNotes, setLenderNotes] = useState('')

  // Specific to GROUP_OWNED
  const [fundingSource, setFundingSource] = useState('Dana Kas Kelompok')
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  React.useEffect(() => {
    if (initialData) {
      setTrackingModel(initialData.tracking_model || 'tracked')
      setOwnershipType(initialData.ownership_type || 'GROUP_OWNED')
      setName(initialData.name || '')
      setCategory(initialData.category || CATEGORY_OPTIONS[0])
      setDescription(initialData.description || '')
      setQuantity(initialData.quantity || 1)
      setUnit(initialData.unit || 'unit')
      setCondition(initialData.condition || 'good')
      setCurrentLocation(initialData.current_location || initialData.location || LOCATION_OPTIONS[0])
      setCurrentHolderName(initialData.current_holder_name || initialData.responsible_person || '')
      setOwnerMemberId(initialData.owner_member_id || '')
      setOwnerName(initialData.owner_name || '')
      setPostKknPlan(initialData.post_kkn_plan || 'take_home')
      setLenderName(initialData.lender_name || '')
      setLenderContact(initialData.lender_contact || '')
      setBorrowDueDate(initialData.borrow_due_date || '')
      setLenderNotes(initialData.lender_notes || '')
      setFundingSource(initialData.funding_source || 'Dana Kas Kelompok')
      setPurchaseCost(initialData.purchase_cost ?? '')
      setNotes(initialData.notes || '')
    } else {
      setTrackingModel('tracked')
      setOwnershipType('GROUP_OWNED')
      setName('')
      setCategory(CATEGORY_OPTIONS[0])
      setDescription('')
      setQuantity(1)
      setUnit('unit')
      setCondition('good')
      setCurrentLocation(LOCATION_OPTIONS[0])
      setCurrentHolderName('Posko KKN')
      setOwnerMemberId('')
      setOwnerName('')
      setPostKknPlan('take_home')
      setLenderName('')
      setLenderContact('')
      setBorrowDueDate('')
      setLenderNotes('')
      setFundingSource('Dana Kas Kelompok')
      setPurchaseCost('')
      setNotes('')
    }
  }, [initialData, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let determinedOwner = ownerName.trim()
    if (ownershipType === 'PERSONAL_OWNED' && ownerMemberId) {
      const found = directoryMembers.find((m) => m.linked_user_id === ownerMemberId || m.id === ownerMemberId)
      if (found) determinedOwner = found.full_name
    } else if (ownershipType === 'GROUP_OWNED') {
      determinedOwner = 'Kelompok KKN'
    } else if (ownershipType === 'BORROWED_EXTERNAL') {
      determinedOwner = lenderName.trim()
    }

    const payload: Partial<CreateInventoryItemInput> = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      item_type: trackingModel === 'tracked' ? 'asset' : 'consumable',
      tracking_model: trackingModel,
      ownership_type: ownershipType,
      owner_name: determinedOwner || undefined,
      owner_member_id: ownershipType === 'PERSONAL_OWNED' && ownerMemberId ? ownerMemberId : undefined,
      is_owner_confirmed: ownershipType === 'PERSONAL_OWNED',
      post_kkn_plan: ownershipType === 'PERSONAL_OWNED' ? postKknPlan : undefined,
      lender_name: ownershipType === 'BORROWED_EXTERNAL' ? lenderName.trim() : undefined,
      lender_contact: ownershipType === 'BORROWED_EXTERNAL' ? lenderContact.trim() : undefined,
      borrow_due_date: ownershipType === 'BORROWED_EXTERNAL' ? borrowDueDate || undefined : undefined,
      lender_notes: ownershipType === 'BORROWED_EXTERNAL' ? lenderNotes.trim() : undefined,
      funding_source: ownershipType === 'GROUP_OWNED' ? fundingSource.trim() : undefined,
      purchase_cost: purchaseCost !== '' ? Number(purchaseCost) : undefined,
      quantity: Number(quantity),
      unit: unit.trim() || 'unit',
      condition,
      current_location: currentLocation,
      current_holder_name: currentHolderName.trim() || determinedOwner || 'Posko KKN',
      notes: notes.trim() || undefined,
    }

    await onSubmit(payload)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Ubah Data Inventaris' : 'Daftarkan Barang Baru ke Inventaris Posko'}
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* 1. Model Pelacakan: Tracked vs Quantity */}
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-2">
          <label className="font-semibold text-charcoal block">Model Pelacakan Barang *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              onClick={() => setTrackingModel('tracked')}
              className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                trackingModel === 'tracked' ? 'border-sage-700 bg-sage-50 text-sage-900 font-semibold' : 'border-warm-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-sage-700" />
                <span>Barang Individual (Tracked)</span>
              </div>
              <p className="text-[11px] font-normal text-charcoal-muted mt-0.5">
                Laptop, kompor, rice cooker, speaker, alat peraga. Wajib QR &amp; pelacakan pemilik.
              </p>
            </div>

            <div
              onClick={() => setTrackingModel('quantity')}
              className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                trackingModel === 'quantity' ? 'border-sage-700 bg-sage-50 text-sage-900 font-semibold' : 'border-warm-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-sage-700" />
                <span>Barang Berjumlah (Quantity)</span>
              </div>
              <p className="text-[11px] font-normal text-charcoal-muted mt-0.5">
                Piring, sendok, gelas, ATK, sabun, kantong plastik. Dilacak kuantitas stoknya.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Klasifikasi Kepemilikan (Crucial Principle) */}
        <div>
          <label className="font-semibold text-charcoal block mb-1">Klasifikasi Kepemilikan Barang *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['GROUP_OWNED', 'PERSONAL_OWNED', 'BORROWED_EXTERNAL', 'DONATED'] as InventoryOwnershipType[]).map((type) => {
              const meta = OWNERSHIP_META[type]
              const isSelected = ownershipType === type

              return (
                <div
                  key={type}
                  onClick={() => setOwnershipType(type)}
                  className={`p-2 rounded-md border text-center cursor-pointer transition-all ${
                    isSelected ? 'border-sage-800 bg-sage-50 font-semibold text-sage-900' : 'border-warm-200 bg-white text-charcoal-muted'
                  }`}
                >
                  <p className="text-xs">{meta.label.split('(')[0]}</p>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-charcoal-muted mt-1 italic">{OWNERSHIP_META[ownershipType].desc}</p>
        </div>

        {/* 3. Conditional Fields based on Ownership */}
        {ownershipType === 'PERSONAL_OWNED' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
            <h4 className="font-semibold text-blue-900 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>Detail Kepemilikan Pribadi Anggota</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-charcoal block mb-1">Anggota Pemilik Barang *</label>
                <select
                  value={ownerMemberId}
                  onChange={(e) => {
                    setOwnerMemberId(e.target.value)
                    const m = directoryMembers.find((dm) => dm.linked_user_id === e.target.value || dm.id === e.target.value)
                    if (m) setOwnerName(m.full_name)
                  }}
                  className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
                >
                  <option value="">Pilih Anggota Tim</option>
                  {directoryMembers.map((m) => (
                    <option key={m.id} value={m.linked_user_id || m.id}>
                      {m.full_name} ({m.position_label || m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Rencana Pasca-KKN</label>
                <select
                  value={postKknPlan}
                  onChange={(e) => setPostKknPlan(e.target.value)}
                  className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
                >
                  <option value="take_home">Dibawa pulang oleh pemilik</option>
                  <option value="entrust_group">Dititipkan ke kelompok</option>
                  <option value="donate_to_village">Dihibahkan ke warga / desa</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {ownershipType === 'BORROWED_EXTERNAL' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
            <h4 className="font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Detail Pinjaman Pihak Luar</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-charcoal block mb-1">Nama Pemilik / Pihak Peminjam *</label>
                <Input
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Misal: Pak Haji Kadir (Pemilik Posko)"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Kontak Pemilik (HP / WA)</label>
                <Input
                  value={lenderContact}
                  onChange={(e) => setLenderContact(e.target.value)}
                  placeholder="0812xxxxxxxx (Terlindungi)"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Target Tanggal Pengembalian</label>
                <Input
                  type="date"
                  value={borrowDueDate}
                  onChange={(e) => setBorrowDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Catatan Kesepakatan Pinjaman</label>
                <Input
                  value={lenderNotes}
                  onChange={(e) => setLenderNotes(e.target.value)}
                  placeholder="Misal: Harus dikembalikan sebelum hari penarikan"
                />
              </div>
            </div>
          </div>
        )}

        {ownershipType === 'GROUP_OWNED' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
            <h4 className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>Detail Pembelian Aset Kelompok</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-charcoal block mb-1">Sumber Dana Pembelian</label>
                <Input
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value)}
                  placeholder="Kas Kelompok / Iuran Anggota / Sponsor"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">Nominal Pembelian (Rp)</label>
                <Input
                  type="number"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Misal: 250000"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Common Item Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Nama Barang *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Rice Cooker Miyako 1.8L"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Kategori Barang *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Lokasi Penyimpanan *</label>
            <select
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
            >
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Pemegang Fisik Saat Ini</label>
            <Input
              value={currentHolderName}
              onChange={(e) => setCurrentHolderName(e.target.value)}
              placeholder="Misal: Abdul Habir Al Majdi"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah &amp; Satuan *</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
                required
              />
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit, buah, set"
                className="flex-1"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Kondisi Fisik *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as InventoryCondition)}
              className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
            >
              <option value="good">Baik (Siap Pakai)</option>
              <option value="fair">Cukup (Sedikit Lecet / Aus)</option>
              <option value="damaged">Rusak (Perlu Perbaikan)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi &amp; Ciri Khusus</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Warna, nomor seri, kelengkapan kabel, atau tanda khusus agar tidak tertukar"
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Tambahan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
            placeholder="Catatan kondisi awal serah terima posko..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Daftarkan Barang'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: QR Code Display & Printable Label
// -------------------------------------------------------------
interface QrCodeModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ open, onClose, item }) => {
  const qrValue = JSON.stringify({
    code: item.item_code,
    name: item.name,
    owner: item.owner_name || 'Kelompok KKN',
    ownership: item.ownership_type,
    location: item.current_location,
  })

  const handlePrintLabel = () => {
    window.print()
  }

  return (
    <Modal open={open} onClose={onClose} title="Label &amp; QR Code Inventaris Posko" maxWidthClass="max-w-md">
      <div className="space-y-4 text-xs">
        {/* Printable Label Card Preview */}
        <div id="printable-qr-label" className="border-2 border-dashed border-charcoal/40 p-4 rounded-xl bg-white text-center space-y-2">
          <p className="text-[10px] font-bold tracking-widest text-charcoal uppercase">
            KKN DESA PRINGGASELA SELATAN 2026
          </p>

          <div className="flex justify-center p-2 bg-white">
            <QRCodeSVG value={qrValue} size={140} level="M" />
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-sm font-bold text-charcoal">{item.item_code}</p>
            <p className="font-serif text-sm font-semibold text-charcoal">{item.name}</p>
            <p className="text-[11px] text-charcoal-muted">
              Kepemilikan: <strong className="text-charcoal">{item.owner_name || 'Kelompok KKN'}</strong>
            </p>
            <p className="text-[10px] text-charcoal-muted">
              Lokasi: {item.current_location} ({item.condition.toUpperCase()})
            </p>
          </div>
        </div>

        <div className="bg-warm-50 p-2.5 rounded text-[11px] text-charcoal-muted leading-relaxed">
          Label stiker ini dapat dicetak dan ditempelkan pada fisik barang untuk memudahkan pendataan serta mencegah barang tertukar saat penutupan posko.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button type="button" size="sm" onClick={handlePrintLabel} className="bg-sage-800 hover:bg-sage-900 text-white gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Stiker Label</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Serah Terima Antaranggota (Handover)
// -------------------------------------------------------------
interface HandoverModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
  directoryMembers: KknTeamDirectoryMember[]
  onSuccess: () => void
}

const HandoverModal: React.FC<HandoverModalProps> = ({
  open,
  onClose,
  item,
  directoryMembers,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [toHolderId, setToHolderId] = useState('')
  const [toHolderName, setToHolderName] = useState('')
  const [destinationLocation, setDestinationLocation] = useState(LOCATION_OPTIONS[0])
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toHolderName.trim()) {
      toast({ title: 'Nama Penerima Wajib Diisi', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      await createInventoryHandover({
        item_id: item.id,
        to_holder_id: toHolderId || undefined,
        to_holder_name: toHolderName.trim(),
        origin_location: item.current_location || 'Posko',
        destination_location: destinationLocation,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      toast({ title: 'Serah Terima Diajukan', description: 'Menunggu konfirmasi penerimaan oleh penerima.', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Mengajukan', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Serah Terima Barang Antaranggota" maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-1">
          <p className="font-semibold text-purple-950 text-sm">{item.name}</p>
          <div className="text-charcoal-muted flex items-center gap-3">
            <span>Kode: <strong className="font-mono text-charcoal">{item.item_code}</strong></span>
            <span>Pemilik Asli: <strong className="text-charcoal">{item.owner_name || 'Kelompok KKN'}</strong></span>
          </div>
          <p className="text-[11px] text-purple-900 mt-1">
            Pemegang Fisik Saat Ini: <strong>{item.current_holder_name || 'Posko KKN'}</strong> ({item.current_location})
          </p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Pilih Anggota Penerima *</label>
          <select
            value={toHolderId}
            onChange={(e) => {
              setToHolderId(e.target.value)
              const m = directoryMembers.find((dm) => dm.linked_user_id === e.target.value || dm.id === e.target.value)
              if (m) setToHolderName(m.full_name)
            }}
            className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
            required
          >
            <option value="">Pilih Anggota Penerima</option>
            {directoryMembers.map((m) => (
              <option key={m.id} value={m.linked_user_id || m.id}>
                {m.full_name} ({m.position_label || m.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Lokasi Tujuan Pemakaian *</label>
          <select
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value)}
            className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
          >
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Keperluan Pemakaian</label>
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Misal: Dipinjam untuk presentasi penyuluhan stunting"
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Kondisi Saat Penyerahan</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misal: Kabel charger dan mouse lengkap dalam kondisi baik"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-purple-700 hover:bg-purple-800 text-white">
            {isSubmitting ? 'Memproses...' : 'Catat Serah Terima'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Rekonsiliasi Akhir KKN (Final Action Resolution)
// -------------------------------------------------------------
interface ReconciliationResolveModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
  onSuccess: () => void
}

const ReconciliationResolveModal: React.FC<ReconciliationResolveModalProps> = ({
  open,
  onClose,
  item,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isPersonal = item.ownership_type === 'PERSONAL_OWNED'
  const isExternal = item.ownership_type === 'BORROWED_EXTERNAL'
  const isGroup = item.ownership_type === 'GROUP_OWNED' || item.ownership_type === 'DONATED'

  const [finalAction, setFinalAction] = useState<InventoryFinalAction>(
    isPersonal
      ? 'returned_to_owner'
      : isExternal
      ? 'returned_to_lender'
      : 'stored_next_period'
  )
  const [finalCondition, setFinalCondition] = useState<InventoryCondition>(item.condition || 'good')
  const [receiverName, setReceiverName] = useState(
    isPersonal ? item.owner_name || '' : isExternal ? item.lender_name || '' : 'Pengurus Kelompok'
  )
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiverName.trim()) {
      toast({ title: 'Nama Pihak Penerima Wajib Diisi', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      await resolveItemReconciliation({
        item_id: item.id,
        final_action: finalAction,
        final_condition: finalCondition,
        receiver_name: receiverName.trim(),
        notes: notes.trim(),
      })
      toast({ title: 'Rekonsiliasi Disimpan', description: 'Status penyelesaian akhir telah diperbarui.', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Penyelesaian Rekonsiliasi Akhir KKN" maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-sage-300 bg-sage-50/70 p-3 space-y-1">
          <p className="font-semibold text-sage-950 text-sm">{item.name}</p>
          <p className="text-charcoal-muted">
            Kepemilikan: <strong className="text-charcoal">{OWNERSHIP_META[item.ownership_type].label}</strong> | Pemilik: {item.owner_name || 'Kelompok'}
          </p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Status Penyelesaian Akhir *</label>
          <select
            value={finalAction}
            onChange={(e) => setFinalAction(e.target.value as any)}
            className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
          >
            {isPersonal && (
              <>
                <option value="returned_to_owner">Sudah dikembalikan kepada pemilik</option>
                <option value="taken_home">Sudah dibawa pulang langsung oleh pemilik</option>
                <option value="entrusted_group">Masih dititipkan dengan persetujuan pemilik</option>
                <option value="not_found">Belum ditemukan (Hilang dalam pencarian)</option>
                <option value="damaged_reported">Rusak dan telah dilaporkan kepada pemilik</option>
              </>
            )}

            {isExternal && (
              <>
                <option value="returned_to_lender">Sudah dikembalikan kepada pemilik (Warga / Kampus)</option>
                <option value="pending_return">Belum dikembalikan (Masih di posko)</option>
                <option value="awaiting_lender_confirmation">Menunggu konfirmasi dari pemilik</option>
                <option value="lost_damaged_resolution">Hilang / rusak dan butuh penyelesaian ganti rugi</option>
              </>
            )}

            {isGroup && (
              <>
                <option value="stored_next_period">Disimpan untuk kelompok / periode berikutnya</option>
                <option value="handed_over">Diserahkan kepada pihak penerima / pengurus baru</option>
                <option value="moved_storage">Dipindahkan ke lokasi penyimpanan kampus / desa</option>
                <option value="sold_group_decision">Dijual berdasarkan keputusan bersama kelompok</option>
                <option value="donated_approved">Dihibahkan ke desa / masjid dengan persetujuan</option>
                <option value="disposed_approved">Dihapuskan / dimusnahkan secara sah</option>
                <option value="lost_damaged_action">Hilang / rusak dan butuh tindak lanjut</option>
              </>
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Pihak yang Menerima *</label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Nama jelas penerima barang"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Kondisi Akhir Barang *</label>
            <select
              value={finalCondition}
              onChange={(e) => setFinalCondition(e.target.value as InventoryCondition)}
              className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
            >
              <option value="good">Baik (Lengkap)</option>
              <option value="fair">Cukup (Wajar Pakai)</option>
              <option value="damaged">Rusak</option>
              <option value="lost">Hilang</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Berita Acara Rekonsiliasi *</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Keterangan serah terima, nomor kwitansi, atau bukti konfirmasi dari pemilik/penerima..."
            className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-800 hover:bg-sage-900 text-white font-semibold">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Status Rekonsiliasi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Laporan Penutupan Inventaris KKN (Print & CSV)
// -------------------------------------------------------------
interface ClosingReportModalProps {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
  handovers: InventoryHandover[]
}

const ClosingReportModal: React.FC<ClosingReportModalProps> = ({
  open,
  onClose,
  items,
}) => {
  const { toast } = useToast()

  const groupItems = items.filter((i) => i.ownership_type === 'GROUP_OWNED')
  const personalItems = items.filter((i) => i.ownership_type === 'PERSONAL_OWNED')
  const externalItems = items.filter((i) => i.ownership_type === 'BORROWED_EXTERNAL')
  const donatedItems = items.filter((i) => i.ownership_type === 'DONATED')

  const resolvedCount = items.filter((i) => i.reconciliation_status === 'resolved').length
  const pendingCount = items.filter((i) => i.reconciliation_status === 'pending').length
  const problematicCount = items.filter((i) => i.reconciliation_status === 'problematic').length

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ title: 'Tidak Ada Data untuk Diekspor', variant: 'error' })
      return
    }

    const headers = [
      'Kode Inventaris',
      'Nama Barang',
      'Model Pelacakan',
      'Klasifikasi Kepemilikan',
      'Nama Pemilik',
      'Lokasi Terkini',
      'Pemegang Terkini',
      'Jumlah',
      'Satuan',
      'Kondisi Terkini',
      'Status Rekonsiliasi',
      'Aksi Akhir Penutupan',
      'Penerima Akhir',
      'Catatan Rekonsiliasi',
    ]

    const rows = items.map((i) => [
      i.item_code || '-',
      `"${(i.name || '').replace(/"/g, '""')}"`,
      i.tracking_model,
      i.ownership_type,
      `"${(i.owner_name || '').replace(/"/g, '""')}"`,
      `"${(i.current_location || '').replace(/"/g, '""')}"`,
      `"${(i.current_holder_name || '').replace(/"/g, '""')}"`,
      i.quantity,
      i.unit,
      i.condition,
      i.reconciliation_status,
      `"${(i.reconciliation_final_action || '').replace(/"/g, '""')}"`,
      `"${(i.reconciliation_receiver_name || '').replace(/"/g, '""')}"`,
      `"${(i.reconciliation_notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan_Rekonsiliasi_Inventaris_KKN_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: 'Laporan Berhasil Diunduh (.CSV)', variant: 'success' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Laporan Akhir Penutupan Inventaris KKN" maxWidthClass="max-w-4xl" scrollableContent={false}>
      <div className="p-5 overflow-y-auto max-h-[75vh] space-y-6 text-xs print:p-0">
        {/* Document Header */}
        <div className="text-center pb-4 border-b-2 border-charcoal space-y-1">
          <p className="text-xs uppercase font-bold tracking-widest text-charcoal">
            LAPORAN REKONSILIASI &amp; BERITA ACARA PENUTUPAN INVENTARIS
          </p>
          <h2 className="text-base font-serif font-bold text-charcoal">
            KKN UNIVERSITAS MATARAM — DESA PRINGGASELA SELATAN 2026
          </h2>
          <p className="text-[11px] text-charcoal-muted">
            Kecamatan Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat
          </p>
        </div>

        {/* Executive Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded bg-warm-100">
            <p className="text-[10px] text-charcoal-muted">Total Barang Terdata</p>
            <p className="text-base font-bold text-charcoal">{items.length}</p>
          </div>
          <div className="p-2.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
            <p className="text-[10px]">Terselesaikan (Beres)</p>
            <p className="text-base font-bold">{resolvedCount}</p>
          </div>
          <div className="p-2.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
            <p className="text-[10px]">Belum Direkonsiliasi</p>
            <p className="text-base font-bold">{pendingCount}</p>
          </div>
          <div className="p-2.5 rounded bg-rose-50 text-rose-900 border border-rose-200">
            <p className="text-[10px]">Bermasalah / Butuh Tindak Lanjut</p>
            <p className="text-base font-bold">{problematicCount}</p>
          </div>
        </div>

        {/* Breakdown by Ownership */}
        <div className="space-y-2">
          <h4 className="font-semibold text-charcoal text-xs uppercase tracking-wider">
            1. Rekapitulasi Menurut Kepemilikan Barang
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="p-2 border border-warm-200 rounded">
              <span className="font-semibold text-charcoal">Aset Kelompok:</span> {groupItems.length} item
            </div>
            <div className="p-2 border border-warm-200 rounded">
              <span className="font-semibold text-charcoal">Milik Pribadi:</span> {personalItems.length} item
            </div>
            <div className="p-2 border border-warm-200 rounded">
              <span className="font-semibold text-charcoal">Pinjaman Luar:</span> {externalItems.length} item
            </div>
            <div className="p-2 border border-warm-200 rounded">
              <span className="font-semibold text-charcoal">Hibah/Donasi:</span> {donatedItems.length} item
            </div>
          </div>
        </div>

        {/* Detailed Items Table */}
        <div className="space-y-2">
          <h4 className="font-semibold text-charcoal text-xs uppercase tracking-wider">
            2. Daftar Rincian Barang &amp; Status Akhir
          </h4>
          <div className="border border-warm-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-warm-100 text-charcoal font-semibold border-b border-warm-200">
                <tr>
                  <th className="p-2">Kode</th>
                  <th className="p-2">Nama Barang</th>
                  <th className="p-2">Kepemilikan</th>
                  <th className="p-2">Pemilik</th>
                  <th className="p-2">Pemegang</th>
                  <th className="p-2">Status Akhir</th>
                  <th className="p-2">Penerima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-200">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-warm-50/50">
                    <td className="p-2 font-mono">{i.item_code}</td>
                    <td className="p-2 font-medium">{i.name}</td>
                    <td className="p-2">{OWNERSHIP_META[i.ownership_type].label.split('(')[0]}</td>
                    <td className="p-2">{i.owner_name || 'Kelompok'}</td>
                    <td className="p-2">{i.current_holder_name || 'Posko'}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        i.reconciliation_status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {i.reconciliation_final_action || i.reconciliation_status}
                      </span>
                    </td>
                    <td className="p-2">{i.reconciliation_receiver_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures Block for Official Closing */}
        <div className="pt-6 border-t border-warm-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="space-y-12">
            <p className="text-[11px] font-semibold text-charcoal">Ketua KKN</p>
            <p className="text-xs font-semibold underline text-charcoal">Josua Ujung</p>
          </div>
          <div className="space-y-12">
            <p className="text-[11px] font-semibold text-charcoal">Sekretaris KKN</p>
            <p className="text-xs font-semibold underline text-charcoal">Dini Aminarti</p>
          </div>
          <div className="space-y-12">
            <p className="text-[11px] font-semibold text-charcoal">Bendahara KKN</p>
            <p className="text-xs font-semibold underline text-charcoal">Tsaniatul Amni Alwan</p>
          </div>
          <div className="space-y-12">
            <p className="text-[11px] font-semibold text-charcoal">Dosen Pembimbing Lapangan</p>
            <p className="text-xs font-semibold underline text-charcoal">Lalu Muhammad Aby Dujana, M.Si.</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-warm-50 border-t border-warm-200 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
          Tutup
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>
          <Button size="sm" onClick={() => window.print()} className="text-xs gap-1.5 bg-sage-800 hover:bg-sage-900 text-white">
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Berita Acara</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Quick Search / Scan QR
// -------------------------------------------------------------
interface QuickSearchQrModalProps {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
}

const QuickSearchQrModal: React.FC<QuickSearchQrModalProps> = ({
  open,
  onClose,
  items,
}) => {
  const [queryCode, setQueryCode] = useState('')
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryCode.trim()) return
    const match = items.find(
      (i) => i.item_code?.toLowerCase() === queryCode.trim().toLowerCase()
    )
    setFoundItem(match || null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Cari / Pindai Kode QR Inventaris" maxWidthClass="max-w-md">
      <div className="space-y-4 text-xs">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value)}
            placeholder="Masukkan kode inventaris (misal: INV-PRB-438489)"
            className="text-xs"
            autoFocus
          />
          <Button type="submit" size="sm" className="bg-sage-700 hover:bg-sage-800 text-white">
            Cari
          </Button>
        </form>

        {foundItem ? (
          <div className="rounded-xl border border-sage-300 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-sage-900 bg-sage-50 px-2 py-0.5 rounded border border-sage-200">
                  {foundItem.item_code}
                </span>
                <h3 className="font-serif font-bold text-charcoal text-base mt-1.5">{foundItem.name}</h3>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${OWNERSHIP_META[foundItem.ownership_type].badgeClass}`}>
                {OWNERSHIP_META[foundItem.ownership_type].label}
              </span>
            </div>

            <div className="space-y-1 text-xs border-t border-warm-200 pt-2 text-charcoal">
              <p><strong className="text-charcoal-muted">Pemilik:</strong> {foundItem.owner_name || 'Kelompok KKN'}</p>
              <p><strong className="text-charcoal-muted">Pemegang Terkini:</strong> {foundItem.current_holder_name || foundItem.responsible_person || 'Posko'}</p>
              <p><strong className="text-charcoal-muted">Lokasi Terkini:</strong> {foundItem.current_location}</p>
              <p><strong className="text-charcoal-muted">Kondisi:</strong> {foundItem.condition}</p>
              <p><strong className="text-charcoal-muted">Status:</strong> {STATUS_META[foundItem.item_status].label}</p>
            </div>
          </div>
        ) : queryCode && (
          <div className="p-4 rounded-lg bg-warm-100 text-center text-charcoal-muted">
            Tidak ditemukan barang dengan kode &quot;{queryCode}&quot;.
          </div>
        )}
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Stock Adjustment (Mutasi Stok Opname)
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
    if (!notes.trim()) {
      toast({ title: 'Keterangan Wajib Diisi', variant: 'error' })
      return
    }

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
    <Modal open={open} onClose={onClose} title="Mutasi &amp; Penyesuaian Stok Barang" maxWidthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
          <p className="font-semibold text-charcoal">{item.name}</p>
          <p className="text-charcoal-muted">
            Stok saat ini: {item.available_quantity} / {item.quantity} {item.unit}
          </p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Jenis Mutasi *</label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as any)}
            className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
          >
            <option value="in">Barang Masuk / Tambah Stok (+)</option>
            <option value="out">Barang Keluar / Terpakai (-)</option>
            <option value="adjustment">Koreksi Stok Opname</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Jumlah *</label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Alasan / Keterangan Mutasi *</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misal: Pembelian tambahan kas atau pemakaian rapat warga"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Mutasi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Return Loan (Catat Pengembalian Pinjaman)
// -------------------------------------------------------------
interface ReturnLoanModalProps {
  open: boolean
  onClose: () => void
  loan: InventoryLoan
  onSuccess: () => void
}

const ReturnLoanModal: React.FC<ReturnLoanModalProps> = ({
  open,
  onClose,
  loan,
  onSuccess,
}) => {
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
    <Modal open={open} onClose={onClose} title="Catat Pengembalian Barang Posko" maxWidthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 space-y-1">
          <p className="font-semibold text-charcoal">{loan.quantity} unit barang telah diserahkan kembali.</p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Kondisi Barang Setelah Dipakai *</label>
          <select
            value={conditionAfter}
            onChange={(e) => setConditionAfter(e.target.value as InventoryCondition)}
            className="w-full text-xs h-8 px-2 rounded border border-warm-300 bg-white"
          >
            <option value="good">Baik (Lengkap)</option>
            <option value="fair">Cukup (Sedikit Kotor/Aus)</option>
            <option value="damaged">Rusak (Membutuhkan Perbaikan)</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Catatan Pemeriksaan</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Pemeriksaan fisik barang saat dikembalikan..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Pengembalian'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

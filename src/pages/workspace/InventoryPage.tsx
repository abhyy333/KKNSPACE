import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import {
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  archiveInventoryItem,
  restoreInventoryItem,
  adjustInventoryStock,
  fetchInventoryMovements,
  fetchInventorySignedPhotoUrls,
  type CreateInventoryItemInput,
} from '@/services/inventoryApi'
import { fetchTeamDirectory } from '@/services/membersApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { InventoryPhotoGalleryModal } from '@/components/workspace/InventoryPhotoGalleryModal'
import { optimizeImageFile } from '@/lib/imageOptimization'
import type {
  InventoryItem,
  InventoryCondition,
  InventoryTrackingModel,
  InventoryOwnershipType,
  InventoryItemStatus,
  KknTeamDirectoryMember,
} from '@/types/database'
import {
  Package,
  Layers,
  AlertTriangle,
  Plus,
  Search,
  Edit2,
  MapPin,
  User,
  QrCode,
  Printer,
  Camera,
  Eye,
  Upload,
  X,
  Archive,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
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
    desc: 'Aset milik kelompok KKN yang dibeli menggunakan kas atau anggaran bersama.',
  },
  PERSONAL_OWNED: {
    label: 'Milik Pribadi Anggota',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    desc: 'Barang pribadi bawaan anggota tim selama masa pengabdian KKN.',
  },
  BORROWED_EXTERNAL: {
    label: 'Pinjaman Pihak Luar',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    desc: 'Dipinjam dari warga, pemilik posko, kampus, atau pemerintah desa.',
  },
  DONATED: {
    label: 'Hibah / Donasi',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    desc: 'Diterima melalui hibah, bantuan sponsor, atau sumbangan pihak ketiga.',
  },
}

const STATUS_META: Record<
  InventoryItemStatus,
  { label: string; badgeClass: string }
> = {
  stored: { label: 'Tersimpan di Posko', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  in_use: { label: 'Sedang Digunakan', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  borrowed_member: { label: 'Dipakai Anggota', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
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

export type MainInventoryTab =
  | 'all'
  | 'my_items'
  | 'group'
  | 'personal'
  | 'borrowed'
  | 'archived'
  | 'activity'

// Helper formatter to convert inventory activity logs into human-readable Indonesian sentences
function formatActivitySentence(m: {
  user?: { full_name: string }
  item?: { name: string; item_code: string | null }
  movement_type: string
  notes?: string | null
  from_location?: string | null
  to_location?: string | null
  from_holder?: string | null
  to_holder?: string | null
  quantity?: number
}): string {
  const actor = m.user?.full_name?.trim() || 'Anggota Tim'
  const itemName = m.item?.name?.trim() || 'Barang'

  switch (m.movement_type) {
    case 'in':
      return `${actor} menambahkan barang ${itemName} ke dalam inventaris posko.`
    case 'archived':
      return `${actor} mengarsipkan barang ${itemName}${m.notes ? ` (${m.notes})` : ''}.`
    case 'restored':
      return `${actor} memulihkan barang ${itemName} dari arsip ke daftar inventaris aktif.`
    case 'photo_added':
      return `${actor} menambahkan foto dokumentasi untuk barang ${itemName}.`
    case 'photo_removed':
      return `${actor} menghapus foto dokumentasi barang ${itemName}.`
    case 'photo_updated':
      return `${actor} memperbarui foto utama barang ${itemName}.`
    case 'location_changed':
    case 'transfer':
      if (m.from_location && m.to_location && m.from_location !== m.to_location) {
        return `${actor} memindahkan lokasi barang ${itemName} dari ${m.from_location} ke ${m.to_location}.`
      }
      return `${actor} mengubah lokasi penyimpanan barang ${itemName}.`
    case 'condition_changed':
      return `${actor} memperbarui kondisi fisik barang ${itemName}${m.notes ? ` (${m.notes})` : ''}.`
    case 'adjustment':
      return `${actor} menyesuaikan kuantitas stok barang ${itemName}${m.quantity ? ` menjadi ${m.quantity}` : ''}.`
    case 'borrow':
      return `${actor} mencatat peminjaman barang ${itemName}${m.to_holder ? ` kepada ${m.to_holder}` : ''}.`
    case 'return':
      return `${actor} mencatat pengembalian barang ${itemName}${m.from_holder ? ` dari ${m.from_holder}` : ''}.`
    case 'out':
      return `${actor} mengeluarkan barang ${itemName} dari posko.`
    case 'updated':
      return `${actor} memperbarui data informasi barang ${itemName}.`
    default:
      if (m.notes && m.notes.length > 0) {
        return `${actor}: ${m.notes} (${itemName})`
      }
      return `${actor} memperbarui status barang ${itemName}.`
  }
}

export const InventoryPage: React.FC = () => {
  const { user, isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Authority Flags
  const isLeaderOrAdmin = Boolean(
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'
  )

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainInventoryTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [archivalReason, setArchivalReason] = useState('')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [itemToRestore, setItemToRestore] = useState<InventoryItem | null>(null)
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<InventoryItem | null>(null)
  const [isQuickScanModalOpen, setIsQuickScanModalOpen] = useState(false)
  const [galleryModalItem, setGalleryModalItem] = useState<InventoryItem | null>(null)

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

  // Archived items query
  const {
    data: archivedItems = [],
    isLoading: isLoadingArchivedItems,
  } = useQuery({
    queryKey: ['inventory-items-archived', searchTerm],
    queryFn: () =>
      fetchInventoryItems({
        is_archived: true,
        search: searchTerm,
      }),
    enabled: activeTab === 'archived',
  })

  const itemPhotoFileIds = useMemo(() => {
    return items.map((i) => i.photo_file_id).filter(Boolean) as string[]
  }, [items])

  const { data: itemPhotoUrls = {} } = useQuery({
    queryKey: ['inventory-photo-urls', itemPhotoFileIds],
    queryFn: () => fetchInventorySignedPhotoUrls(itemPhotoFileIds),
    enabled: itemPhotoFileIds.length > 0,
    staleTime: 1000 * 60 * 30,
  })

  const { data: directoryMembers = [] } = useQuery({
    queryKey: ['team-directory'],
    queryFn: fetchTeamDirectory,
  })

  // Activity Log Query (all members can read)
  const {
    data: movements = [],
    isLoading: isLoadingMovements,
  } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => fetchInventoryMovements(),
    enabled: activeTab === 'activity',
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      toast({ title: 'Barang Berhasil Didaftarkan', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
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
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setEditingItem(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memperbarui Barang', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) => archiveInventoryItem(vars.id, vars.reason),
    onSuccess: () => {
      toast({
        title: 'Barang Berhasil Diarsipkan',
        description: 'Barang dipindahkan ke arsip. Riwayat mutasi dan audit tersimpan aman.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items-archived'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setItemToDelete(null)
      setArchivalReason('')
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Mengarsipkan Barang', description: err.message, variant: 'error' })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreInventoryItem(id),
    onSuccess: () => {
      toast({
        title: 'Barang Berhasil Dipulihkan',
        description: 'Barang kembali aktif di daftar inventaris posko.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items-archived'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setItemToRestore(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memulihkan Barang', description: err.message, variant: 'error' })
    },
  })

  // Permission Checks per Item
  const canManageItem = (item: InventoryItem) => {
    if (isSuperAdmin) return true
    if (item.ownership_type === 'PERSONAL_OWNED') {
      return Boolean(user?.id && item.owner_member_id === user.id)
    }
    return isLeaderOrAdmin
  }

  const canArchiveItem = (item: InventoryItem) => {
    if (isSuperAdmin) return true
    if (item.ownership_type === 'PERSONAL_OWNED') {
      return Boolean(user?.id && item.owner_member_id === user.id)
    }
    return isLeaderOrAdmin
  }

  const canRestoreItemRecord = (item: InventoryItem) => {
    if (isSuperAdmin) return true
    if (item.ownership_type === 'PERSONAL_OWNED') {
      return Boolean(user?.id && item.owner_member_id === user.id)
    }
    return isLeaderOrAdmin
  }

  // Derived Categorized Lists
  const myItems = useMemo(
    () => items.filter((i) => i.ownership_type === 'PERSONAL_OWNED' && user?.id && i.owner_member_id === user.id),
    [items, user?.id]
  )
  const groupItems = useMemo(() => items.filter((i) => i.ownership_type === 'GROUP_OWNED'), [items])
  const personalItems = useMemo(() => items.filter((i) => i.ownership_type === 'PERSONAL_OWNED'), [items])
  const borrowedItems = useMemo(
    () => items.filter((i) => i.ownership_type === 'BORROWED_EXTERNAL' || i.ownership_type === 'DONATED'),
    [items]
  )

  // Calculated Stats
  const totalItemsCount = items.length
  const myItemsCount = myItems.length
  const groupCount = groupItems.length
  const personalCount = personalItems.length
  const borrowedCount = borrowedItems.length
  const inUseCount = items.filter((i) => i.item_status === 'in_use' || i.item_status === 'borrowed_member').length

  const tabOptions: { key: MainInventoryTab; label: string; count?: number }[] = [
    { key: 'all', label: 'Semua Barang Posko', count: totalItemsCount },
    { key: 'my_items', label: 'Barang Milik Saya', count: myItemsCount },
    { key: 'group', label: 'Aset Kelompok', count: groupCount },
    { key: 'personal', label: 'Semua Milik Pribadi', count: personalCount },
    { key: 'borrowed', label: 'Pinjaman & Hibah', count: borrowedCount },
    { key: 'archived', label: 'Arsip Barang', count: archivedItems.length },
    { key: 'activity', label: 'Riwayat Aktivitas', count: movements.length },
  ]

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
            Pencatatan inventaris posko dengan pelacakan kepemilikan transparan (*Aset Kelompok*, *Milik Pribadi*, *Pinjaman &amp; Hibah*), dokumentasi foto resmi, dan riwayat aktivitas terpadu.
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
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Daftarkan Barang</span>
          </Button>
        </div>
      </div>

      {/* 2. Visual Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-warm-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-charcoal-muted">Total Barang</p>
            <p className="text-xl font-serif font-bold text-charcoal mt-1">{totalItemsCount}</p>
            <p className="text-[10px] text-charcoal-muted mt-0.5">Item aktif di posko</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-blue-800">Barang Milik Saya</p>
            <p className="text-xl font-serif font-bold text-blue-900 mt-1">{myItemsCount}</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Bawaan pribadi Anda</p>
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
            <p className="text-[11px] font-semibold text-blue-800">Semua Milik Pribadi</p>
            <p className="text-xl font-serif font-bold text-blue-900 mt-1">{personalCount}</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Bawaan seluruh tim</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-amber-800">Pinjaman &amp; Hibah</p>
            <p className="text-xl font-serif font-bold text-amber-900 mt-1">{borrowedCount}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Warga, kampus, sponsor</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-warm-200">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-charcoal-muted">Dalam Penggunaan</p>
            <p className="text-xl font-serif font-bold text-charcoal mt-1">{inUseCount}</p>
            <p className="text-[10px] text-charcoal-muted mt-0.5">Aktif dipakai kegiatan</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navigation Controls: Clean Dropdown for Mobile + Compact Pills for Desktop */}
      <div className="space-y-3">
        {/* Mobile Dropdown Selector */}
        <div className="block sm:hidden">
          <label className="text-[11px] font-semibold text-charcoal-muted block mb-1">
            Navigasi Inventaris
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as MainInventoryTab)}
              className="w-full appearance-none text-xs font-semibold py-2.5 pl-3 pr-8 rounded-lg border border-warm-300 bg-white text-charcoal shadow-sm focus:border-sage-700 focus:ring-1 focus:ring-sage-700"
            >
              <option value="all">Semua Barang Posko ({totalItemsCount})</option>
              <option value="my_items">Barang Milik Saya ({myItemsCount})</option>
              <option value="group">Aset Kelompok ({groupCount})</option>
              <option value="personal">Semua Milik Pribadi ({personalCount})</option>
              <option value="borrowed">Pinjaman &amp; Hibah ({borrowedCount})</option>
              <option value="archived">Arsip Barang</option>
              <option value="activity">Riwayat Aktivitas</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-charcoal-muted" />
          </div>
        </div>

        {/* Desktop Segmented Tab Bar */}
        <div className="hidden sm:flex items-center justify-between gap-3 border-b border-warm-200 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.key
              let activeColor = 'bg-charcoal text-white'
              if (tab.key === 'my_items') activeColor = 'bg-blue-700 text-white shadow-sm'
              else if (tab.key === 'group') activeColor = 'bg-emerald-800 text-white shadow-sm'
              else if (tab.key === 'personal') activeColor = 'bg-blue-800 text-white shadow-sm'
              else if (tab.key === 'borrowed') activeColor = 'bg-amber-800 text-white shadow-sm'
              else if (tab.key === 'archived') activeColor = 'bg-stone-800 text-white shadow-sm'
              else if (tab.key === 'activity') activeColor = 'bg-sage-800 text-white shadow-sm'

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isActive ? activeColor : 'bg-warm-100 text-charcoal-muted hover:text-charcoal hover:bg-warm-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-warm-200 text-charcoal'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Filter & Search Bar */}
          {(activeTab === 'all' ||
            activeTab === 'my_items' ||
            activeTab === 'group' ||
            activeTab === 'personal' ||
            activeTab === 'borrowed' ||
            activeTab === 'archived') && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
                <Input
                  placeholder="Cari nama / kode / lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 w-44 lg:w-56"
                />
              </div>

              {activeTab !== 'archived' && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Search Box for filtered tabs */}
        <div className="block sm:hidden">
          {(activeTab === 'all' ||
            activeTab === 'my_items' ||
            activeTab === 'group' ||
            activeTab === 'personal' ||
            activeTab === 'borrowed' ||
            activeTab === 'archived') && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
                <Input
                  placeholder="Cari barang atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-9 w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. CONTENT SECTIONS */}

      {/* SECTION A: TAB BARANG MILIK SAYA */}
      {activeTab === 'my_items' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-blue-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Barang Pribadi Milik Anda</h3>
                <p className="text-xs text-charcoal-muted mt-0.5 leading-relaxed">
                  Menampilkan seluruh barang bawaan pribadi yang Anda daftarkan di posko KKN. Anda memiliki hak penuh untuk mengubah data, mengunggah foto fisik, atau menghapusnya kapan saja.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs gap-1.5 bg-blue-700 hover:bg-blue-800 text-white shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Barang Pribadi</span>
            </Button>
          </div>

          {isLoadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : myItems.length === 0 ? (
            <Card className="bg-white border-warm-200 text-center py-12">
              <CardContent className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-serif font-semibold text-charcoal text-base">
                  Belum Ada Barang Pribadi yang Anda Daftarkan
                </h3>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                  Daftarkan barang bawaan pribadi Anda (seperti laptop, perlengkapan tidur, atau kendaraan) agar tercatat rapi dan tidak tertukar.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-xs gap-1.5 bg-blue-700 hover:bg-blue-800 text-white mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Daftarkan Barang Pribadi Sekarang</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myItems.map((item) => {
                const conditionMeta = CONDITION_BADGES[item.condition] || CONDITION_BADGES.good
                const statusMeta = STATUS_META[item.item_status] || STATUS_META.stored
                const createdDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'

                return (
                  <Card key={item.id} className="bg-white hover:border-blue-400 transition-all flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded border border-blue-200">
                          {item.item_code || 'INV-PRB'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-300">
                            Milik Pribadi Saya
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
                        {item.description || 'Tidak ada catatan deskripsi tambahan.'}
                      </CardDescription>

                      {/* Photo Thumbnail */}
                      {item.photo_file_id && itemPhotoUrls[item.photo_file_id] ? (
                        <div
                          onClick={() => setGalleryModalItem(item)}
                          className="relative group cursor-pointer overflow-hidden rounded-md border border-warm-200 bg-warm-100 h-32 w-full mt-2"
                          title="Buka galeri foto lengkap"
                        >
                          <img
                            src={itemPhotoUrls[item.photo_file_id]}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                            <Eye className="h-4 w-4" />
                            <span>Buka Galeri Foto</span>
                          </div>
                          <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            <span>Foto</span>
                          </span>
                        </div>
                      ) : (
                        <div
                          onClick={() => setGalleryModalItem(item)}
                          className="mt-2 h-14 w-full rounded-md border border-dashed border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 flex items-center justify-center gap-1.5 text-blue-800 cursor-pointer transition-colors"
                          title="Belum ada foto fisik. Ketuk untuk mengunggah foto."
                        >
                          <Camera className="h-3.5 w-3.5 text-blue-700" />
                          <span className="text-[11px] font-medium">Tambah Foto Fisik</span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-2.5 text-xs space-y-1.5">
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
                          <span className="text-charcoal-muted">Kategori:</span>
                          <span className="font-medium text-charcoal">{item.category}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-charcoal-muted">Tanggal Input:</span>
                          <span className="font-medium text-charcoal">{createdDate}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-warm-200/80">
                          <span className="text-charcoal-muted">Kuantitas &amp; Kondisi:</span>
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

                      {/* Explicit Action Buttons for Personal Items */}
                      <div className="flex items-center justify-between pt-2 border-t border-warm-200 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGalleryModalItem(item)}
                          className="h-7 px-2.5 text-xs text-charcoal hover:bg-warm-100 border-warm-300 gap-1"
                          title="Kelola Foto Dokumentasi"
                        >
                          <Camera className="h-3.5 w-3.5 text-sage-700" />
                          <span>Kelola Foto</span>
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingItem(item)}
                            className="h-7 px-2.5 text-xs text-charcoal hover:bg-warm-100 border-warm-300 gap-1"
                            title="Ubah Data Barang"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setItemToDelete(item)
                              setArchivalReason('')
                            }}
                            className="h-7 px-2 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 gap-1"
                            title="Hapus / Arsipkan Barang"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Hapus</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION B: GENERAL INVENTORY GRID (SEMUA, ASET KELOMPOK, MILIK PRIBADI, PINJAMAN & HIBAH) */}
      {(activeTab === 'all' ||
        activeTab === 'group' ||
        activeTab === 'personal' ||
        activeTab === 'borrowed') && (
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
                  <Card className="bg-white border-warm-200 text-center py-12">
                    <CardContent className="space-y-3">
                      <div className="h-12 w-12 rounded-full bg-warm-100 text-charcoal-muted mx-auto flex items-center justify-center">
                        <Package className="h-6 w-6" />
                      </div>
                      <h3 className="font-serif font-semibold text-charcoal text-base">
                        Tidak Ada Barang Ditemukan
                      </h3>
                      <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                        {searchTerm
                          ? `Tidak ada barang yang cocok dengan kata kunci "${searchTerm}".`
                          : 'Belum ada data barang terdaftar untuk kategori ini.'}
                      </p>
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
                    const hasManageRight = canManageItem(item)
                    const hasArchiveRight = canArchiveItem(item)

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

                          {/* Item Photo Visual Identification */}
                          {item.photo_file_id && itemPhotoUrls[item.photo_file_id] ? (
                            <div
                              onClick={() => setGalleryModalItem(item)}
                              className="relative group cursor-pointer overflow-hidden rounded-md border border-warm-200 bg-warm-100 h-32 w-full mt-2"
                              title="Buka galeri foto lengkap"
                            >
                              <img
                                src={itemPhotoUrls[item.photo_file_id]}
                                alt={item.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                <Eye className="h-4 w-4" />
                                <span>Buka Galeri Foto</span>
                              </div>
                              <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                <span>Foto</span>
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => setGalleryModalItem(item)}
                              className="mt-2 h-14 w-full rounded-md border border-dashed border-warm-200 bg-warm-50/70 hover:bg-warm-100/80 flex items-center justify-center gap-1.5 text-charcoal-muted cursor-pointer transition-colors"
                              title="Belum ada foto. Ketuk untuk membuka galeri foto."
                            >
                              <Camera className="h-3.5 w-3.5 text-charcoal-muted" />
                              <span className="text-[11px]">
                                {hasManageRight ? 'Tambah Foto Dokumentasi' : 'Lihat Dokumentasi Foto'}
                              </span>
                            </div>
                          )}
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
                              <span className="text-charcoal-muted">Penanggung Jawab:</span>
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

                          {/* Action Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-warm-200">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setGalleryModalItem(item)}
                                className="h-7 px-2 text-xs text-charcoal-muted hover:text-charcoal"
                                title="Lihat & Kelola Foto Dokumentasi"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span className="ml-1 hidden sm:inline">Foto</span>
                              </Button>

                              {isTracked && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setQrItem(item)}
                                  className="h-7 px-2 text-xs text-charcoal-muted hover:text-charcoal"
                                  title="Lihat & Cetak Label QR Code"
                                >
                                  <QrCode className="h-3.5 w-3.5" />
                                  <span className="ml-1 hidden sm:inline">QR</span>
                                </Button>
                              )}

                              {item.item_type === 'consumable' && isLeaderOrAdmin && (
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
                              {hasManageRight && (
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

                              {hasArchiveRight && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setItemToDelete(item)
                                    setArchivalReason('')
                                  }}
                                  className="h-7 w-7 p-0 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                  title="Arsipkan Barang"
                                >
                                  <Archive className="h-3.5 w-3.5" />
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

      {/* SECTION C: TAB ARSIP BARANG */}
      {activeTab === 'archived' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-warm-300 bg-stone-50/70 p-4">
            <div className="flex items-start gap-3">
              <Archive className="h-5 w-5 text-stone-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Arsip Barang &amp; Logistik</h3>
                <p className="text-xs text-charcoal-muted mt-0.5 leading-relaxed">
                  Daftar barang yang telah diarsipkan atau selesai masa pakainya. Seluruh riwayat transaksi, mutasi, dan pencatatan tetap terjaga utuh di database. Pemilik sah atau Admin dapat memulihkan barang kembali ke daftar aktif sewaktu-waktu.
                </p>
              </div>
            </div>
          </div>

          {isLoadingArchivedItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : archivedItems.length === 0 ? (
            <Card className="bg-white border-warm-200 text-center py-12">
              <CardContent className="space-y-2">
                <CheckCircle2 className="h-10 w-10 text-stone-400 mx-auto" />
                <h3 className="font-serif font-semibold text-charcoal text-sm">
                  Tidak Ada Barang dalam Arsip
                </h3>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                  Seluruh barang posko saat ini masih berstatus aktif.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedItems.map((item) => {
                const ownMeta = OWNERSHIP_META[item.ownership_type] || OWNERSHIP_META.GROUP_OWNED
                const canRestore = canRestoreItemRecord(item)

                return (
                  <Card
                    key={item.id}
                    className="bg-white border-stone-300 flex flex-col justify-between opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded border border-stone-200">
                          {item.item_code || 'INV'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${ownMeta.badgeClass}`}>
                            {ownMeta.label}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-stone-100 text-stone-800 border-stone-300">
                            Diarsipkan
                          </span>
                        </div>
                      </div>

                      <CardTitle className="text-base font-serif font-semibold text-charcoal mt-2 line-clamp-1">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-charcoal-muted line-clamp-2 mt-0.5">
                        {item.archival_reason ? `Alasan: ${item.archival_reason}` : (item.description || 'Barang diarsipkan')}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal-muted">Pemilik Sah:</span>
                          <span className="font-semibold text-charcoal">
                            {item.ownership_type === 'GROUP_OWNED' ? 'Aset Kelompok KKN' : (item.owner_name || 'Tidak Diketahui')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal-muted">Jumlah:</span>
                          <span className="font-semibold text-charcoal">{item.quantity} {item.unit}</span>
                        </div>
                        {item.archived_at && (
                          <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
                            <span>Waktu Arsip:</span>
                            <span>{new Date(item.archived_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-warm-200">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGalleryModalItem(item)}
                          className="h-7 px-2 text-xs text-charcoal-muted hover:text-charcoal"
                        >
                          <Camera className="h-3.5 w-3.5 mr-1" />
                          <span>Foto</span>
                        </Button>

                        {canRestore && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setItemToRestore(item)}
                            className="h-7 px-2.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Aktifkan Kembali</span>
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

      {/* SECTION D: TAB RIWAYAT AKTIVITAS (REBRANDED FROM RIWAYAT MUTASI) */}
      {activeTab === 'activity' && (
        <Card className="bg-white border-warm-200">
          <CardHeader className="p-4 sm:p-5 border-b border-warm-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sage-700" />
              <CardTitle className="text-base font-serif font-semibold text-charcoal">
                Riwayat Aktivitas Inventaris Posko
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-charcoal-muted">
              Catatan transparan aktivitas barang posko (penambahan, pembaruan foto, perubahan lokasi/kondisi, pengarsipan, dan pemulihan) dalam kalimat informatif yang mudah dipahami seluruh tim.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingMovements ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-xs text-charcoal-muted">
                Belum ada catatan aktivitas inventaris tercatat.
              </div>
            ) : (
              <div className="divide-y divide-warm-200">
                {movements.map((m) => {
                  const sentence = formatActivitySentence(m)
                  const formattedDate = new Date(m.movement_date).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={m.id}
                      className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-warm-50/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-charcoal text-xs">
                            {sentence}
                          </span>
                          {m.item?.item_code && (
                            <span className="font-mono text-[10px] text-charcoal-muted bg-warm-100 px-1.5 py-0.2 rounded border border-warm-200">
                              {m.item.item_code}
                            </span>
                          )}
                        </div>

                        {/* Extra notes or movement context */}
                        {(m.from_location || m.to_location) && m.from_location !== m.to_location && (
                          <p className="text-[11px] text-charcoal-muted">
                            Lokasi: <span className="font-medium text-charcoal">{m.from_location || 'Posko'}</span> → <span className="font-medium text-charcoal">{m.to_location || 'Posko'}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right text-[11px] text-charcoal-muted shrink-0">
                        <p className="font-medium text-charcoal">{m.user?.full_name || 'Petugas'}</p>
                        <p>{formattedDate} WITA</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================= */}
      {/* MODALS */}
      {/* ============================================================= */}

      {/* 1. Modal Tambah / Edit Barang (Multi Ownership & Access Control) */}
      <ItemFormModal
        open={isCreateModalOpen || Boolean(editingItem)}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingItem(null)
        }}
        initialData={editingItem}
        directoryMembers={directoryMembers}
        currentUser={user}
        isLeaderOrAdmin={isLeaderOrAdmin}
        isSuperAdmin={isSuperAdmin}
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

      {/* 3. Modal Quick Search / Scan QR */}
      <QuickSearchQrModal
        open={isQuickScanModalOpen}
        onClose={() => setIsQuickScanModalOpen(false)}
        items={items}
        photoUrls={itemPhotoUrls}
        onOpenGallery={(item) => setGalleryModalItem(item)}
      />

      {/* 4. Modal Mutasi Stok Opname (Consumable) */}
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

      {/* 5. Modal Galeri & Dokumentasi Foto Inventaris */}
      <InventoryPhotoGalleryModal
        open={Boolean(galleryModalItem)}
        onClose={() => setGalleryModalItem(null)}
        item={galleryModalItem}
        canManage={galleryModalItem ? canManageItem(galleryModalItem) : false}
        onPhotoUpdated={() => {
          refetchItems()
          queryClient.invalidateQueries({ queryKey: ['inventory-photo-urls'] })
          queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
        }}
      />

      {/* 6. Modal Konfirmasi Arsip Barang */}
      <Modal
        open={Boolean(itemToDelete)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setItemToDelete(null)
            setArchivalReason('')
          }
        }}
        title="Arsipkan Barang Inventaris?"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-charcoal-muted">Nama Barang:</span>
              <span className="font-bold text-charcoal">{itemToDelete?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal-muted">Status Kepemilikan:</span>
              <span className="font-semibold text-charcoal">
                {itemToDelete?.ownership_type === 'GROUP_OWNED'
                  ? 'Aset Kelompok KKN'
                  : itemToDelete?.ownership_type === 'PERSONAL_OWNED'
                  ? `Milik Pribadi (${itemToDelete.owner_name || 'Anggota'})`
                  : itemToDelete?.owner_name || 'Pinjaman/Hibah'}
              </span>
            </div>
            {itemToDelete?.current_location && (
              <div className="flex items-center justify-between">
                <span className="text-charcoal-muted">Lokasi Terkini:</span>
                <span className="font-medium text-charcoal">{itemToDelete.current_location}</span>
              </div>
            )}
          </div>

          <p className="text-charcoal-muted leading-relaxed">
            Barang ini akan dipindahkan ke tab Arsip dan tidak muncul di daftar inventaris aktif. Seluruh data riwayat, mutasi, dan pencatatan tetap terjaga aman di sistem posko.
          </p>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Alasan Pengarsipan (Opsional)</label>
            <Input
              value={archivalReason}
              onChange={(e) => setArchivalReason(e.target.value)}
              placeholder="Contoh: Dibawa pulang pemilik / Masa pakai selesai / Rusak total"
              className="text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-warm-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                setItemToDelete(null)
                setArchivalReason('')
              }}
              className="w-full sm:w-auto text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (itemToDelete) {
                  await deleteMutation.mutateAsync({
                    id: itemToDelete.id,
                    reason: archivalReason.trim() || undefined,
                  })
                }
              }}
              className="bg-amber-700 hover:bg-amber-800 text-white w-full sm:w-auto text-xs gap-1.5"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{deleteMutation.isPending ? 'Mengarsipkan...' : 'Arsipkan Barang'}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Modal Konfirmasi Pulihkan Barang dari Arsip */}
      <ConfirmDialog
        open={Boolean(itemToRestore)}
        onClose={() => setItemToRestore(null)}
        onConfirm={async () => {
          if (itemToRestore) {
            await restoreMutation.mutateAsync(itemToRestore.id)
          }
        }}
        title="Aktifkan Kembali Barang?"
        description={`Barang "${itemToRestore?.name}" akan dipulihkan dari arsip dan kembali muncul di daftar inventaris aktif posko.`}
        confirmLabel="Aktifkan Kembali"
        cancelLabel="Batal"
      />
    </div>
  )
}

// -------------------------------------------------------------
// Sub-Modal: Item Form Modal (Create & Edit)
// -------------------------------------------------------------
interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  initialData?: InventoryItem | null
  directoryMembers: KknTeamDirectoryMember[]
  currentUser: { id: string; email?: string } | null
  isLeaderOrAdmin: boolean
  isSuperAdmin: boolean
  onSubmit: (data: Partial<CreateInventoryItemInput>) => Promise<void>
  isSubmitting: boolean
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  open,
  onClose,
  initialData,
  directoryMembers,
  currentUser,
  isLeaderOrAdmin,
  isSuperAdmin,
  onSubmit,
  isSubmitting,
}) => {
  const [trackingModel, setTrackingModel] = useState<InventoryTrackingModel>('tracked')
  const [ownershipType, setOwnershipType] = useState<InventoryOwnershipType>('PERSONAL_OWNED')
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

  // Photo Documentation State
  const [stagedPhotoFile, setStagedPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null)

  // Current logged in member's name from directory
  const currentMember = useMemo(() => {
    if (!currentUser?.id) return null
    return (
      directoryMembers.find(
        (m) => m.linked_user_id === currentUser.id || m.id === currentUser.id
      ) || null
    )
  }, [currentUser?.id, directoryMembers])

  React.useEffect(() => {
    setStagedPhotoFile(null)
    setPhotoPreview(null)
    setPhotoError(null)

    if (initialData) {
      setTrackingModel(initialData.tracking_model || 'tracked')
      setOwnershipType(initialData.ownership_type || 'PERSONAL_OWNED')
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
      // If ordinary member, ownership is locked to PERSONAL_OWNED
      if (!isLeaderOrAdmin && !isSuperAdmin) {
        setOwnershipType('PERSONAL_OWNED')
        setOwnerMemberId(currentUser?.id || '')
        setOwnerName(currentMember?.full_name || 'Anggota Tim')
        setCurrentHolderName(currentMember?.full_name || 'Anggota Tim')
      } else {
        setOwnershipType('GROUP_OWNED')
        setOwnerMemberId('')
        setOwnerName('Kelompok KKN')
        setCurrentHolderName('Posko KKN')
      }
      setName('')
      setCategory(CATEGORY_OPTIONS[0])
      setDescription('')
      setQuantity(1)
      setUnit('unit')
      setCondition('good')
      setCurrentLocation(LOCATION_OPTIONS[0])
      setPostKknPlan('take_home')
      setLenderName('')
      setLenderContact('')
      setBorrowDueDate('')
      setLenderNotes('')
      setFundingSource('Dana Kas Kelompok')
      setPurchaseCost('')
      setNotes('')
    }
  }, [initialData, open, isLeaderOrAdmin, isSuperAdmin, currentUser?.id, currentMember])

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setPhotoError('Format tidak didukung. Harap unggah foto dengan format JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Ukuran berkas asli maksimal 15 MB.')
      return
    }

    setIsProcessingPhoto(true)
    try {
      const optimized = await optimizeImageFile(file, 1200, 0.85)
      setStagedPhotoFile(optimized)
      setPhotoPreview(URL.createObjectURL(optimized))
    } catch (err: any) {
      setPhotoError(`Gagal memproses gambar: ${err.message}`)
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setStagedPhotoFile(null)
    setPhotoPreview(null)
    setPhotoError(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enforce photo for tracked item to prevent mix-ups
    const hasPhoto = stagedPhotoFile || Boolean(initialData?.photo_file_id)
    if (trackingModel === 'tracked' && !hasPhoto) {
      setPhotoError(
        'Foto fisik barang wajib diunggah untuk barang individual (Tracked) guna mencegah tertukar dan memastikan identitas visual yang akurat.'
      )
      return
    }

    // Determine ownership details
    let finalOwnershipType = ownershipType
    let determinedOwner = ownerName.trim()
    let determinedOwnerMemberId = ownerMemberId

    // Ordinary member rule: ALWAYS PERSONAL_OWNED bound to auth.uid()
    if (!isLeaderOrAdmin && !isSuperAdmin) {
      finalOwnershipType = 'PERSONAL_OWNED'
      determinedOwnerMemberId = currentUser?.id || ''
      determinedOwner = currentMember?.full_name || 'Anggota Tim'
    } else {
      if (finalOwnershipType === 'PERSONAL_OWNED') {
        if (determinedOwnerMemberId) {
          const found = directoryMembers.find(
            (m) => m.linked_user_id === determinedOwnerMemberId || m.id === determinedOwnerMemberId
          )
          if (found) determinedOwner = found.full_name
        } else {
          determinedOwnerMemberId = currentUser?.id || ''
          determinedOwner = currentMember?.full_name || 'Anggota Tim'
        }
      } else if (finalOwnershipType === 'GROUP_OWNED') {
        determinedOwner = 'Kelompok KKN'
        determinedOwnerMemberId = ''
      } else if (finalOwnershipType === 'BORROWED_EXTERNAL') {
        determinedOwner = lenderName.trim() || 'Pihak Luar'
        determinedOwnerMemberId = ''
      } else if (finalOwnershipType === 'DONATED') {
        determinedOwner = lenderName.trim() || 'Donatur'
        determinedOwnerMemberId = ''
      }
    }

    const payload: Partial<CreateInventoryItemInput> = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      item_type: trackingModel === 'tracked' ? 'asset' : 'consumable',
      tracking_model: trackingModel,
      ownership_type: finalOwnershipType,
      owner_name: determinedOwner || undefined,
      owner_member_id: finalOwnershipType === 'PERSONAL_OWNED' && determinedOwnerMemberId ? determinedOwnerMemberId : undefined,
      is_owner_confirmed: finalOwnershipType === 'PERSONAL_OWNED',
      post_kkn_plan: finalOwnershipType === 'PERSONAL_OWNED' ? postKknPlan : undefined,
      lender_name: (finalOwnershipType === 'BORROWED_EXTERNAL' || finalOwnershipType === 'DONATED') ? lenderName.trim() : undefined,
      lender_contact: finalOwnershipType === 'BORROWED_EXTERNAL' ? lenderContact.trim() : undefined,
      borrow_due_date: finalOwnershipType === 'BORROWED_EXTERNAL' ? borrowDueDate || undefined : undefined,
      lender_notes: finalOwnershipType === 'BORROWED_EXTERNAL' ? lenderNotes.trim() : undefined,
      funding_source: finalOwnershipType === 'GROUP_OWNED' ? fundingSource.trim() : undefined,
      purchase_cost: purchaseCost !== '' ? Number(purchaseCost) : undefined,
      quantity: Number(quantity),
      unit: unit.trim() || 'unit',
      condition,
      current_location: currentLocation,
      current_holder_name: currentHolderName.trim() || determinedOwner || 'Posko KKN',
      notes: notes.trim() || undefined,
    }

    if (stagedPhotoFile) {
      payload.photo_file = stagedPhotoFile
    }

    await onSubmit(payload)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Ubah Data Inventaris' : 'Daftarkan Barang ke Inventaris Posko'}
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
                Laptop, kompor, rice cooker, speaker, dispenser. Wajib QR &amp; pelacakan pemilik.
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

        {/* 2. Klasifikasi Kepemilikan (Access Controlled) */}
        <div>
          <label className="font-semibold text-charcoal block mb-1">Klasifikasi Kepemilikan Barang *</label>
          
          {(!isLeaderOrAdmin && !isSuperAdmin) ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 text-xs">Milik Pribadi Anggota</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                  Terisi Otomatis
                </span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Sebagai anggota, barang yang Anda input otomatis tercatat sebagai milik pribadi Anda sendiri. Aset kelompok, pinjaman posko, atau hibah didaftarkan oleh Ketua, Sekretaris, atau Admin.
              </p>
            </div>
          ) : (
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
          )}
          <p className="text-[11px] text-charcoal-muted mt-1 italic">{OWNERSHIP_META[ownershipType].desc}</p>
        </div>

        {/* 3. Conditional Fields based on Ownership */}
        {ownershipType === 'PERSONAL_OWNED' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
            <h4 className="font-semibold text-blue-900">Data Kepemilikan Pribadi</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-charcoal block mb-1">Pemilik Sah Barang *</label>
                {(!isLeaderOrAdmin && !isSuperAdmin) ? (
                  <Input
                    value={ownerName || currentMember?.full_name || 'Anggota Tim'}
                    disabled
                    className="bg-warm-100/70 text-charcoal font-semibold"
                  />
                ) : (
                  <select
                    value={ownerMemberId}
                    onChange={(e) => {
                      const id = e.target.value
                      setOwnerMemberId(id)
                      const found = directoryMembers.find((m) => m.linked_user_id === id || m.id === id)
                      if (found) setOwnerName(found.full_name)
                    }}
                    className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
                  >
                    <option value="">Pilih Anggota Tim...</option>
                    {directoryMembers.map((m) => (
                      <option key={m.id} value={m.linked_user_id || m.id}>
                        {m.full_name} ({m.position_label || m.role || 'Anggota'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-medium text-charcoal block mb-1">Rencana Pasca-KKN</label>
                <select
                  value={postKknPlan}
                  onChange={(e) => setPostKknPlan(e.target.value)}
                  className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
                >
                  <option value="take_home">Dibawa Pulang Pemilik</option>
                  <option value="donate_posko">Dihibahkan ke Posko / Warga</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {ownershipType === 'BORROWED_EXTERNAL' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
            <h4 className="font-semibold text-amber-900">Data Pemberi Pinjaman &amp; Tenggat</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-charcoal block mb-1">Nama Pemilik / Pemberi Pinjaman *</label>
                <Input
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Misal: Bapak H. Hamzan / Kantor Desa"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-charcoal block mb-1">Kontak Pemilik / No. WhatsApp</label>
                <Input
                  value={lenderContact}
                  onChange={(e) => setLenderContact(e.target.value)}
                  placeholder="08123456789"
                />
              </div>

              <div>
                <label className="font-medium text-charcoal block mb-1">Tenggat Pengembalian</label>
                <Input
                  type="date"
                  value={borrowDueDate}
                  onChange={(e) => setBorrowDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-charcoal block mb-1">Syarat / Perjanjian Pinjam</label>
              <Input
                value={lenderNotes}
                onChange={(e) => setLenderNotes(e.target.value)}
                placeholder="Misal: Wajib dikembalikan bersih dan kabel tergulung rapi"
              />
            </div>
          </div>
        )}

        {ownershipType === 'DONATED' && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2">
            <h4 className="font-semibold text-purple-900">Data Sumber Hibah / Bantuan Sponsor</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-charcoal block mb-1">Pemberi Hibah / Nama Sponsor *</label>
                <Input
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Misal: Alumni KKN / Sponsor Mandiri / Donatur Warga"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-charcoal block mb-1">Penanggung Jawab Aset</label>
                <Input
                  value={currentHolderName}
                  onChange={(e) => setCurrentHolderName(e.target.value)}
                  placeholder="Nama anggota yang bertanggung jawab"
                />
              </div>
            </div>
          </div>
        )}

        {ownershipType === 'GROUP_OWNED' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
            <h4 className="font-semibold text-emerald-900">Asal-Usul &amp; Anggaran Aset Kelompok</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-charcoal block mb-1">Sumber Pendanaan *</label>
                <Input
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value)}
                  placeholder="Misal: Kas Bersama KKN / Iuran Divisi / Sponsor"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-charcoal block mb-1">Biaya Pembelian (Rp)</label>
                <Input
                  type="number"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Contoh: 150000"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Core Item Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="font-semibold text-charcoal block mb-1">Nama Barang *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kompor Gas 2 Tungku Rinnai"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Kategori *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Kuantitas *</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Satuan</label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="unit / buah / pack"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Kondisi Fisik *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as InventoryCondition)}
              className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
            >
              <option value="good">Baik</option>
              <option value="fair">Cukup</option>
              <option value="damaged">Rusak</option>
              <option value="lost">Hilang</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal block mb-1">Lokasi Penyimpanan *</label>
            <select
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="w-full p-2 text-xs rounded border border-warm-300 bg-white"
            >
              {LOCATION_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Photo Upload Section */}
        <div className="rounded-lg border border-warm-300 bg-warm-50/70 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-charcoal block">Foto Fisik Barang *</label>
              <p className="text-[11px] text-charcoal-muted">
                Wajib untuk barang individual guna memastikan tanda fisik dan mencegah barang tertukar.
              </p>
            </div>
            {trackingModel === 'tracked' && (
              <span className="text-[10px] bg-sage-100 text-sage-800 font-semibold px-2 py-0.5 rounded border border-sage-300">
                Wajib Foto
              </span>
            )}
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />

          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden border border-warm-300 bg-white h-40 w-full flex items-center justify-center">
              <img src={photoPreview} alt="Pratinjau fisik" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                title="Hapus foto"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                Foto siap disimpan
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-warm-300 bg-white hover:bg-sage-50 hover:border-sage-400 transition-colors text-charcoal"
              >
                <Camera className="h-4 w-4 text-sage-700" />
                <span className="font-semibold text-xs">Ambil Foto dengan Kamera</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-warm-300 bg-white hover:bg-sage-50 hover:border-sage-400 transition-colors text-charcoal"
              >
                <Upload className="h-4 w-4 text-sage-700" />
                <span className="font-semibold text-xs">Pilih Foto dari Galeri</span>
              </button>
            </div>
          )}

          {isProcessingPhoto && (
            <p className="text-[11px] text-sage-700 animate-pulse">Mengompresi dan mengoptimasi resolusi gambar...</p>
          )}

          {photoError && (
            <div className="rounded p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{photoError}</span>
            </div>
          )}
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
            placeholder="Catatan kondisi awal barang di posko..."
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white w-full sm:w-auto">
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
          Label stiker ini dapat dicetak dan ditempelkan pada fisik barang untuk memudahkan pendataan serta mencegah barang tertukar saat kegiatan KKN.
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
// Sub-Modal: Quick Search / Scan QR
// -------------------------------------------------------------
interface QuickSearchQrModalProps {
  open: boolean
  onClose: () => void
  items: InventoryItem[]
  photoUrls: Record<string, string>
  onOpenGallery: (item: InventoryItem) => void
}

const QuickSearchQrModal: React.FC<QuickSearchQrModalProps> = ({
  open,
  onClose,
  items,
  photoUrls,
  onOpenGallery,
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

            {/* Visual Photo Card */}
            {foundItem.photo_file_id && photoUrls[foundItem.photo_file_id] ? (
              <div className="relative overflow-hidden rounded-lg border border-warm-200 bg-warm-100 h-44 w-full">
                <img
                  src={photoUrls[foundItem.photo_file_id]}
                  alt={foundItem.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  <span>Foto Fisik Resmi</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-warm-200 bg-warm-50 p-3 text-center text-xs text-charcoal-muted">
                Belum ada foto fisik terdaftar untuk barang ini.
              </div>
            )}

            <div className="space-y-1 text-xs border-t border-warm-200 pt-2 text-charcoal">
              <p><strong className="text-charcoal-muted">Pemilik:</strong> {foundItem.owner_name || 'Kelompok KKN'}</p>
              <p><strong className="text-charcoal-muted">Penanggung Jawab:</strong> {foundItem.current_holder_name || foundItem.responsible_person || 'Posko'}</p>
              <p><strong className="text-charcoal-muted">Lokasi Terkini:</strong> {foundItem.current_location}</p>
              <p><strong className="text-charcoal-muted">Kondisi:</strong> {foundItem.condition}</p>
              <p><strong className="text-charcoal-muted">Status:</strong> {STATUS_META[foundItem.item_status].label}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenGallery(foundItem)
                onClose()
              }}
              className="w-full text-xs gap-1.5 text-sage-900 border-sage-300 hover:bg-sage-50"
            >
              <Camera className="h-3.5 w-3.5 text-sage-700" />
              <span>Buka Galeri Foto Lengkap ({foundItem.name})</span>
            </Button>
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
  const [newQuantity, setNewQuantity] = useState(item.quantity)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast({ title: 'Alasan Wajib Diisi', description: 'Harap sertakan alasan mutasi penyesuaian stok.', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      await adjustInventoryStock(
        item.id,
        'adjustment',
        newQuantity,
        reason.trim()
      )
      toast({ title: 'Stok Berhasil Disesuaikan', variant: 'success' })
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
          <p className="text-charcoal-muted">Stok Tercatat Saat Ini: <strong className="text-charcoal">{item.quantity} {item.unit}</strong></p>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Jumlah Stok Fisik Sebenarnya *</label>
          <Input
            type="number"
            min={0}
            value={newQuantity}
            onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
            required
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Alasan Penyesuaian Stok *</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Stok opname mingguan / Habis dipakai kegiatan / Pembelian baru"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Mutasi Stok'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import {
  Activity,
  ShieldCheck,
  Users,
  Calendar,
  Clock,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Coins,
  Package,
  Image as ImageIcon,
  UserCheck,
  RefreshCw,
  Database,
  Handshake,
  ArrowRight,
  Archive,
  PlusCircle,
  Edit3,
  Trash2,
} from 'lucide-react'

export interface AuditEventRow {
  id: number | string
  actor_id: string | null
  actor_email: string | null
  actor_authority: string | null
  actor_name_snapshot: string | null
  action: string
  table_name: string
  record_id: string | null
  status: string | null
  description: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

const MODULE_DEFINITIONS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tables: string[] }
> = {
  inventory: {
    label: 'Inventaris & Logistik',
    icon: Package,
    tables: ['inventory_items', 'inventory_loans', 'inventory_handovers', 'inventory_movements', 'inventory_photos'],
  },
  finance: {
    label: 'Keuangan Posko',
    icon: Coins,
    tables: ['finance_transactions', 'finance_categories'],
  },
  work_programs: {
    label: 'Program Kerja',
    icon: Briefcase,
    tables: ['work_programs'],
  },
  duty: {
    label: 'Jadwal Piket',
    icon: Clock,
    tables: ['duty_shifts', 'duty_shift_documentations'],
  },
  calendar: {
    label: 'Kalender & Agenda',
    icon: Calendar,
    tables: ['calendar_events'],
  },
  tasks: {
    label: 'Tugas & Kegiatan',
    icon: CheckSquare,
    tables: ['tasks'],
  },
  meetings: {
    label: 'Rapat & Notulensi',
    icon: MessageSquare,
    tables: ['meetings', 'meeting_attendees', 'meeting_decisions'],
  },
  sponsors: {
    label: 'Sponsor & Mitra',
    icon: Handshake,
    tables: [
      'sponsors',
      'sponsor_communications',
      'sponsorship_packages',
      'sponsor_agreements',
      'sponsor_benefit_fulfillments',
      'sponsor_proposals',
      'partnership_contact_settings',
    ],
  },
  team: {
    label: 'Anggota & Tim',
    icon: Users,
    tables: ['kkn_team_directory', 'memberships', 'invitations', 'profiles'],
  },
  media: {
    label: 'Media & Berkas',
    icon: ImageIcon,
    tables: ['media_assets', 'documents', 'file_objects'],
  },
  surveys: {
    label: 'Survei & Respon',
    icon: UserCheck,
    tables: ['surveys', 'survey_responses'],
  },
}

// Friendly Indonesian field labels mapping
const FRIENDLY_FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  item_code: 'Kode Barang',
  description: 'Deskripsi',
  category: 'Kategori',
  quantity: 'Jumlah',
  unit: 'Satuan',
  condition: 'Kondisi',
  item_status: 'Status Barang',
  ownership_type: 'Kepemilikan',
  owner_name: 'Nama Pemilik',
  current_location: 'Lokasi Posko',
  location: 'Lokasi',
  current_holder_name: 'Pemegang Fisik',
  responsible_person: 'Penanggung Jawab',
  price: 'Harga / Nilai',
  purchase_cost: 'Biaya Pembelian',
  funding_source: 'Sumber Dana',
  notes: 'Catatan',
  is_archived: 'Status Arsip',
  archival_reason: 'Alasan Pengarsipan',
  archived_at: 'Waktu Pengarsipan',
  title: 'Judul',
  amount: 'Nominal (Rp)',
  type: 'Tipe',
  shift_date: 'Tanggal Piket',
  shift_type: 'Waktu Shift',
  status: 'Status',
  full_name: 'Nama Lengkap',
  role: 'Peran / Jabatan',
  start_date: 'Tanggal Mulai',
  end_date: 'Tanggal Selesai',
  target: 'Target',
  progress: 'Kemajuan (%)',
  company_name: 'Nama Perusahaan/Mitra',
  contact_person: 'Kontak Person',
  package_name: 'Paket Sponsorship',
}

// Human-friendly value labels
const FRIENDLY_VALUE_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  damaged: 'Rusak',
  lost: 'Hilang',
  stored: 'Tersimpan di Posko',
  in_use: 'Sedang Digunakan',
  borrowed_member: 'Dipinjam Anggota',
  borrowed_external: 'Dipinjam Pihak Luar',
  returned: 'Sudah Dikembalikan',
  in_return_process: 'Proses Pengembalian',
  maintenance: 'Dalam Perbaikan',
  disposed: 'Dihapuskan',
  GROUP_OWNED: 'Aset Kelompok KKN',
  PERSONAL_OWNED: 'Milik Pribadi Anggota',
  BORROWED_EXTERNAL: 'Pinjaman Luar',
  DONATED: 'Hibah / Donasi',
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  pagi: 'Shift Pagi',
  sore: 'Shift Sore',
  malam: 'Shift Malam',
  completed: 'Selesai',
  in_progress: 'Sedang Berjalan',
  planned: 'Direncanakan',
  cancelled: 'Dibatalkan',
  pending: 'Menunggu',
  true: 'Ya / Aktif',
  false: 'Tidak / Non-Aktif',
}

// Blacklisted keys (UUIDs, internal IDs, technical timestamps, security tokens)
const IGNORED_KEYS = new Set([
  'id',
  'item_id',
  'record_id',
  'user_id',
  'actor_id',
  'created_by',
  'updated_by',
  'archived_by',
  'owner_member_id',
  'current_holder_id',
  'to_holder_id',
  'borrower_id',
  'approved_by',
  'photo_file_id',
  'receipt_proof_url',
  'proof_url',
  'created_at',
  'updated_at',
  'metadata',
  'is_qr_printed',
  'password',
  'token',
  'secret',
  'jwt',
  'hash',
])

function getModuleInfo(tableName: string) {
  for (const [key, def] of Object.entries(MODULE_DEFINITIONS)) {
    if (def.tables.includes(tableName)) {
      return { key, label: def.label, Icon: def.icon }
    }
  }
  return { key: 'other', label: 'Sistem KKN', Icon: Database }
}

function formatValueFriendly(val: unknown, key: string): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') {
    if (key === 'is_archived') return val ? 'Diarsipkan' : 'Aktif'
    return val ? 'Ya' : 'Tidak'
  }
  if (typeof val === 'number') {
    if (key.includes('price') || key.includes('amount') || key.includes('cost')) {
      return `Rp ${val.toLocaleString('id-ID')}`
    }
    return val.toString()
  }
  const str = String(val)
  if (FRIENDLY_VALUE_LABELS[str]) {
    return FRIENDLY_VALUE_LABELS[str]
  }
  return str
}

function getObjectDisplayName(ev: AuditEventRow): string {
  const vals = ev.new_values || ev.old_values || {}
  const candidate =
    vals.name ||
    vals.title ||
    vals.full_name ||
    vals.item_name ||
    vals.company_name ||
    vals.package_name

  if (candidate && typeof candidate === 'string') {
    return candidate
  }

  // Extract from description if present
  if (ev.description) {
    const match = ev.description.match(/:\s*(.+)$/)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  const { label } = getModuleInfo(ev.table_name)
  return `data pada ${label}`
}

function getActionHeadline(ev: AuditEventRow): { actionLabel: string; icon: React.ComponentType<{ className?: string }>; colorClass: string } {
  const norm = (ev.action || '').toLowerCase()
  const isArchive =
    ev.description?.toLowerCase().includes('arsip') ||
    (ev.new_values?.is_archived === true && ev.old_values?.is_archived === false)

  if (isArchive) {
    return {
      actionLabel: 'mengarsipkan',
      icon: Archive,
      colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
    }
  }

  if (norm.includes('insert') || norm.includes('create')) {
    return {
      actionLabel: 'menambahkan',
      icon: PlusCircle,
      colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    }
  }

  if (norm.includes('update') || norm.includes('edit')) {
    return {
      actionLabel: 'memperbarui',
      icon: Edit3,
      colorClass: 'text-blue-800 bg-blue-50 border-blue-200',
    }
  }

  if (norm.includes('delete') || norm.includes('remove')) {
    return {
      actionLabel: 'menghapus',
      icon: Trash2,
      colorClass: 'text-rose-800 bg-rose-50 border-rose-200',
    }
  }

  return {
    actionLabel: 'mengelola',
    icon: Activity,
    colorClass: 'text-charcoal-muted bg-warm-100 border-warm-200',
  }
}

function getRoleBadge(authority: string | null) {
  const role = (authority || '').toLowerCase()
  if (role === 'super_admin' || role === 'admin') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
        Admin
      </span>
    )
  }
  if (role === 'ketua') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-900 border border-blue-300">
        Ketua KKN
      </span>
    )
  }
  if (role === 'sekretaris' || role === 'bendahara') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
        Pengurus Posko
      </span>
    )
  }
  if (role === 'dpl') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
        DPL
      </span>
    )
  }
  if (role === 'service_role') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-200 text-charcoal-muted border border-warm-300">
        Sistem
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-charcoal border border-warm-300">
      Anggota
    </span>
  )
}

export const AdminAuditPage: React.FC = () => {
  // Simple clean filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [selectedActionType, setSelectedActionType] = useState('ALL')
  const [selectedModule, setSelectedModule] = useState('ALL')
  const [selectedDateRange, setSelectedDateRange] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Fetch audit events directly from Supabase
  const {
    data: allEvents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-audit-events-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) {
        throw new Error(error.message)
      }

      return (data as AuditEventRow[]) || []
    },
    staleTime: 1000 * 30,
  })

  // Distinct list of users for simple filter dropdown
  const distinctUsers = useMemo(() => {
    const map = new Map<string, string>()
    allEvents.forEach((ev) => {
      const name = ev.actor_name_snapshot || (ev.actor_email ? ev.actor_email.split('@')[0] : null)
      if (name && !map.has(name)) {
        map.set(name, name)
      }
    })
    return Array.from(map.values()).sort()
  }, [allEvents])

  // Summary stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayCount = allEvents.filter((e) => e.created_at.startsWith(todayStr)).length
    const uniqueUserCount = new Set(allEvents.map((e) => e.actor_id || e.actor_email).filter(Boolean)).size
    return {
      total: allEvents.length,
      today: todayCount,
      uniqueUsers: uniqueUserCount,
    }
  }, [allEvents])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const actorName = (ev.actor_name_snapshot || ev.actor_email || '').toLowerCase()
      const objectName = getObjectDisplayName(ev).toLowerCase()
      const desc = (ev.description || '').toLowerCase()

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matches = actorName.includes(q) || objectName.includes(q) || desc.includes(q)
        if (!matches) return false
      }

      // 2. User Filter
      if (selectedUser !== 'ALL') {
        const u = selectedUser.toLowerCase()
        if (!actorName.includes(u)) return false
      }

      // 3. Action Type Filter
      if (selectedActionType !== 'ALL') {
        const normAction = (ev.action || '').toLowerCase()
        const isArchive =
          ev.description?.toLowerCase().includes('arsip') ||
          (ev.new_values?.is_archived === true && ev.old_values?.is_archived === false)

        if (selectedActionType === 'archive' && !isArchive) return false
        if (selectedActionType === 'insert' && (!normAction.includes('insert') && !normAction.includes('create'))) return false
        if (selectedActionType === 'update' && (!normAction.includes('update') || isArchive)) return false
        if (selectedActionType === 'delete' && (!normAction.includes('delete') && !normAction.includes('remove'))) return false
      }

      // 4. Module Filter
      if (selectedModule !== 'ALL') {
        const info = getModuleInfo(ev.table_name)
        if (info.key !== selectedModule) return false
      }

      // 5. Date Range Filter
      if (selectedDateRange !== 'ALL') {
        const itemTime = new Date(ev.created_at).getTime()
        const now = Date.now()
        const oneDayMs = 24 * 60 * 60 * 1000
        if (selectedDateRange === 'today' && now - itemTime > oneDayMs) return false
        if (selectedDateRange === '7d' && now - itemTime > 7 * oneDayMs) return false
        if (selectedDateRange === '30d' && now - itemTime > 30 * oneDayMs) return false
      }

      return true
    })
  }, [allEvents, searchQuery, selectedUser, selectedActionType, selectedModule, selectedDateRange])

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEvents.slice(start, start + pageSize)
  }, [filteredEvents, currentPage, pageSize])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedUser('ALL')
    setSelectedActionType('ALL')
    setSelectedModule('ALL')
    setSelectedDateRange('ALL')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedUser !== 'ALL' ||
    selectedActionType !== 'ALL' ||
    selectedModule !== 'ALL' ||
    selectedDateRange !== 'ALL'

  // Export clean CSV
  const handleExportCsv = () => {
    const rowsToExport = filteredEvents.length > 0 ? filteredEvents : allEvents

    const sanitizeCsvCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""'
      let str = String(val).replace(/"/g, '""')
      if (/^[=+@-]$/.test(str.charAt(0))) {
        str = "'" + str
      }
      return `"${str}"`
    }

    const headers = ['Waktu', 'Pengguna', 'Peran', 'Modul', 'Aksi', 'Objek', 'Deskripsi']
    const csvLines = [headers.map(sanitizeCsvCell).join(',')]

    rowsToExport.forEach((ev) => {
      const timeStr = new Date(ev.created_at).toLocaleString('id-ID')
      const actorName = ev.actor_name_snapshot || (ev.actor_email ? ev.actor_email.split('@')[0] : 'Sistem')
      const { label } = getModuleInfo(ev.table_name)
      const { actionLabel } = getActionHeadline(ev)
      const objName = getObjectDisplayName(ev)

      csvLines.push(
        [
          timeStr,
          actorName,
          ev.actor_authority || 'Anggota',
          label,
          actionLabel,
          objName,
          ev.description || '',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      )
    })

    const csvContent = '\uFEFF' + csvLines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `log-aktivitas-kkn-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-sage-100 px-2 py-0.5 text-xs font-semibold text-sage-800">
              <ShieldCheck className="h-3 w-3" />
              <span>Transparansi &amp; Audit Posko</span>
            </span>
            <span className="text-xs text-charcoal-muted">KKN Desa Pringgasela Selatan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Riwayat Aktivitas Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1 max-w-2xl">
            Catatan kronologis seluruh perubahan data inventaris, keuangan, proker, piket, dan sistem posko secara rapi dan mudah dipahami.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredEvents.length === 0}
            className="text-xs gap-1.5 border-warm-300 hover:bg-warm-100 text-charcoal"
          >
            <Download className="h-3.5 w-3.5 text-emerald-800" />
            <span>Ekspor Catatan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5 border-warm-300 hover:bg-warm-100 text-charcoal"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-800' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* 2. Summary Mini-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-warm-200 bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Total Aktivitas Tercatat</p>
              <p className="text-xl font-serif font-bold text-charcoal mt-0.5">
                {isLoading ? '...' : stats.total.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-warm-100 flex items-center justify-center text-charcoal">
              <Activity className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-200 bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Aktivitas Hari Ini</p>
              <p className="text-xl font-serif font-bold text-emerald-900 mt-0.5">
                {isLoading ? '...' : stats.today.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-200 bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Pengguna Aktif Terlibat</p>
              <p className="text-xl font-serif font-bold text-blue-900 mt-0.5">
                {isLoading ? '...' : stats.uniqueUsers}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-800">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Simple Filters */}
      <Card className="border-warm-200 bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-charcoal-muted" />
              <span>Filter Aktivitas</span>
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-emerald-800 hover:underline self-start sm:self-auto font-medium"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search Input */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
              <Input
                placeholder="Cari nama barang/orang..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Filter: Pengguna */}
            <div>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="ALL">Semua Pengguna</option>
                {distinctUsers.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Jenis Aktivitas */}
            <div>
              <select
                value={selectedActionType}
                onChange={(e) => {
                  setSelectedActionType(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="ALL">Semua Jenis Aksi</option>
                <option value="insert">Tambah Data Baru</option>
                <option value="update">Perubahan Data</option>
                <option value="archive">Pengarsipan Barang</option>
                <option value="delete">Penghapusan Data</option>
              </select>
            </div>

            {/* Filter: Modul */}
            <div>
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="ALL">Semua Modul Posko</option>
                {Object.entries(MODULE_DEFINITIONS).map(([key, def]) => (
                  <option key={key} value={key}>
                    {def.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Rentang Tanggal */}
            <div>
              <select
                value={selectedDateRange}
                onChange={(e) => {
                  setSelectedDateRange(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-warm-300 bg-white text-charcoal"
              >
                <option value="ALL">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="7d">7 Hari Terakhir</option>
                <option value="30d">30 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Activity List / Feed */}
      {isError && (
        <Card className="border-red-200 bg-red-50/70 p-4">
          <p className="text-xs text-red-800 font-semibold">Gagal memuat log aktivitas</p>
          <p className="text-xs text-red-700 mt-0.5">{(error as Error)?.message}</p>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed border-warm-300 bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-charcoal">Tidak Ada Aktivitas Ditemukan</h3>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Tidak ada aktivitas yang sesuai dengan filter yang Anda pilih.'
                  : 'Belum ada aktivitas yang dicatat di posko.'}
              </p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                Reset Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedEvents.map((ev) => {
            const { label: moduleLabel, Icon: ModIcon } = getModuleInfo(ev.table_name)
            const actorName =
              ev.actor_name_snapshot ||
              (ev.actor_email ? ev.actor_email.split('@')[0] : 'Sistem Posko')
            const objName = getObjectDisplayName(ev)
            const { actionLabel, icon: ActionIcon, colorClass } = getActionHeadline(ev)

            // Calculate changed fields
            const changedFields: Array<{
              key: string
              label: string
              oldVal: string
              newVal: string
            }> = []

            if (ev.old_values && ev.new_values) {
              const allKeys = Array.from(
                new Set([...Object.keys(ev.old_values), ...Object.keys(ev.new_values)])
              )
              for (const k of allKeys) {
                if (IGNORED_KEYS.has(k) || k.endsWith('_id')) continue
                const oldRaw = ev.old_values[k]
                const newRaw = ev.new_values[k]
                if (JSON.stringify(oldRaw) !== JSON.stringify(newRaw)) {
                  changedFields.push({
                    key: k,
                    label: FRIENDLY_FIELD_LABELS[k] || k.replace(/_/g, ' '),
                    oldVal: formatValueFriendly(oldRaw, k),
                    newVal: formatValueFriendly(newRaw, k),
                  })
                }
              }
            }

            // Key initial values for INSERT
            const initialFields: Array<{ label: string; val: string }> = []
            if (!ev.old_values && ev.new_values) {
              for (const [k, v] of Object.entries(ev.new_values)) {
                if (IGNORED_KEYS.has(k) || k.endsWith('_id') || v === null || v === '') continue
                initialFields.push({
                  label: FRIENDLY_FIELD_LABELS[k] || k.replace(/_/g, ' '),
                  val: formatValueFriendly(v, k),
                })
              }
            }

            const formattedTime = new Date(ev.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) + ' WIB'

            return (
              <Card
                key={ev.id}
                className="bg-white border-warm-200 hover:border-warm-300 transition-shadow shadow-xs"
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Top Bar: User + Role + Module Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-warm-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-charcoal text-sm">{actorName}</span>
                      {getRoleBadge(ev.actor_authority)}
                      <span className="text-[11px] text-charcoal-muted">&bull;</span>
                      <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                        <ModIcon className="h-3 w-3 text-sage-800" />
                        <span>{moduleLabel}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${colorClass}`}>
                        <ActionIcon className="h-3 w-3" />
                        <span className="capitalize">{actionLabel}</span>
                      </span>
                      <span className="text-[11px] text-charcoal-muted">{formattedTime}</span>
                    </div>
                  </div>

                  {/* Main Action Line */}
                  <div className="text-xs text-charcoal">
                    <span>Melakukan </span>
                    <strong className="text-charcoal font-semibold">{actionLabel}</strong>
                    <span> pada </span>
                    <strong className="text-emerald-900 font-semibold">{objName}</strong>
                    {ev.description && ev.description !== objName && (
                      <p className="text-xs text-charcoal-muted mt-0.5">{ev.description}</p>
                    )}
                  </div>

                  {/* Changed Fields / Perubahan */}
                  {changedFields.length > 0 && (
                    <div className="rounded-md bg-warm-50/80 border border-warm-200 p-3 space-y-1.5 text-xs">
                      <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wide">
                        Perubahan Data:
                      </p>
                      <ul className="space-y-1">
                        {changedFields.map((field) => (
                          <li
                            key={field.key}
                            className="flex flex-col sm:flex-row sm:items-center gap-1 text-charcoal"
                          >
                            <span className="text-charcoal-muted min-w-[140px] capitalize">
                              &bull; {field.label}:
                            </span>
                            <div className="flex items-center gap-1.5 font-medium flex-wrap">
                              <span className="text-rose-800 line-through bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                {field.oldVal}
                              </span>
                              <ArrowRight className="h-3 w-3 text-charcoal-muted shrink-0" />
                              <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {field.newVal}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Initial Data for INSERT */}
                  {initialFields.length > 0 && changedFields.length === 0 && (
                    <div className="rounded-md bg-warm-50/80 border border-warm-200 p-3 space-y-1.5 text-xs">
                      <p className="font-semibold text-charcoal text-[11px] uppercase tracking-wide">
                        Detail Data Baru:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {initialFields.slice(0, 6).map((field, idx) => (
                          <div key={idx} className="text-[11px]">
                            <span className="text-charcoal-muted block capitalize">{field.label}:</span>
                            <span className="font-semibold text-charcoal">{field.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* 5. Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-warm-200 text-xs text-charcoal-muted">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-charcoal">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-charcoal">
                {Math.min(currentPage * pageSize, filteredEvents.length)}
              </span>{' '}
              dari <span className="font-semibold text-charcoal">{filteredEvents.length}</span> aktivitas
              {hasActiveFilters && ` (difilter dari total ${allEvents.length})`}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs border-warm-300 gap-1 bg-white hover:bg-warm-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </Button>

              <span className="text-xs px-2 font-mono">
                Halaman {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs border-warm-300 gap-1 bg-white hover:bg-warm-100 disabled:opacity-50"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

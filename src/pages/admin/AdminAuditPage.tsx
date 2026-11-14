import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/dialog'
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
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Coins,
  Package,
  Image as ImageIcon,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Database,
  Handshake,
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
  calendar: {
    label: 'Kalender & Agenda',
    icon: Calendar,
    tables: ['calendar_events'],
  },
  duty: {
    label: 'Jadwal Piket',
    icon: Clock,
    tables: ['duty_shifts', 'duty_shift_documentations'],
  },
  work_programs: {
    label: 'Program Kerja',
    icon: Briefcase,
    tables: ['work_programs'],
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
  finance: {
    label: 'Keuangan Posko',
    icon: Coins,
    tables: ['finance_transactions', 'finance_categories'],
  },
  inventory: {
    label: 'Inventaris Posko',
    icon: Package,
    tables: ['inventory_items'],
  },
  media: {
    label: 'Media & Berkas',
    icon: ImageIcon,
    tables: ['media_assets', 'documents', 'file_objects'],
  },
  team: {
    label: 'Anggota & Tim',
    icon: Users,
    tables: ['kkn_team_directory', 'memberships', 'invitations', 'profiles'],
  },
  surveys: {
    label: 'Survei & Respon',
    icon: UserCheck,
    tables: ['surveys', 'survey_responses'],
  },
  sponsors: {
    label: 'Sponsor & Mitra',
    icon: Handshake,
    tables: ['sponsors', 'sponsor_communications'],
  },
}

function getModuleInfo(tableName: string) {
  for (const [key, def] of Object.entries(MODULE_DEFINITIONS)) {
    if (def.tables.includes(tableName)) {
      return { key, label: def.label, Icon: def.icon }
    }
  }
  return { key: 'other', label: tableName || 'Sistem', Icon: Database }
}

function getActionBadge(action: string) {
  const norm = (action || '').toLowerCase()
  if (norm.includes('insert') || norm.includes('create')) {
    return (
      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-[10px] font-medium hover:bg-emerald-100">
        Tambah
      </Badge>
    )
  }
  if (norm.includes('update') || norm.includes('edit')) {
    return (
      <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono text-[10px] font-medium hover:bg-blue-100">
        Ubah
      </Badge>
    )
  }
  if (norm.includes('delete') || norm.includes('remove')) {
    return (
      <Badge className="bg-rose-50 text-rose-800 border-rose-200 font-mono text-[10px] font-medium hover:bg-rose-100">
        Hapus
      </Badge>
    )
  }
  if (norm.includes('invitation_accepted')) {
    return (
      <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-mono text-[10px] font-medium hover:bg-teal-100">
        Terima Undangan
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-mono text-[10px] uppercase">
      {action}
    </Badge>
  )
}

function getRoleBadge(authority: string | null) {
  const role = (authority || '').toLowerCase()
  if (role === 'super_admin') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-forest/10 text-forest border border-forest/20">
        Super Admin
      </span>
    )
  }
  if (role === 'anggota' || role === 'member') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sage/15 text-forest border border-sage/30">
        Anggota
      </span>
    )
  }
  if (role === 'dpl') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
        DPL
      </span>
    )
  }
  if (role === 'coordinator') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-900 border border-indigo-200">
        Koordinator
      </span>
    )
  }
  if (role === 'service_role') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-charcoal-muted bg-warm-200/80 border border-warm-300">
        Sistem
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-charcoal-muted">
      {authority || 'User'}
    </span>
  )
}

function generateHumanDescription(ev: AuditEventRow): string {
  if (ev.description && ev.description.trim().length > 0) {
    return ev.description
  }

  const { label } = getModuleInfo(ev.table_name)
  const normAction = (ev.action || '').toLowerCase()

  if (normAction.includes('insert')) {
    return `Menambahkan entri baru pada modul ${label}`
  }
  if (normAction.includes('update')) {
    return `Memperbarui data pada modul ${label}`
  }
  if (normAction.includes('delete')) {
    return `Menghapus data dari modul ${label}`
  }
  if (normAction.includes('invitation_accepted')) {
    return 'Menerima dan mengonfirmasi undangan keanggotaan KKN'
  }
  return `Aktivitas ${ev.action} pada tabel ${ev.table_name}`
}

export const AdminAuditPage: React.FC = () => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('ALL')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedAction, setSelectedAction] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedDateRange, setSelectedDateRange] = useState('ALL')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Selected event for detail modal
  const [activeEvent, setActiveEvent] = useState<AuditEventRow | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)

  // Fetch audit events & profiles for actor names
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: async () => {
      const [eventsRes, profilesRes] = await Promise.all([
        supabase
          .from('audit_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('profiles').select('id, full_name'),
      ])

      if (eventsRes.error) throw eventsRes.error

      const profileMap = new Map<string, string>()
      if (profilesRes.data) {
        profilesRes.data.forEach((p) => {
          if (p.id && p.full_name) profileMap.set(p.id, p.full_name)
        })
      }

      const rows = (eventsRes.data ?? []) as AuditEventRow[]

      // Enrich with profile name if snapshot is null
      return rows.map((r) => {
        if (!r.actor_name_snapshot && r.actor_id && profileMap.has(r.actor_id)) {
          return {
            ...r,
            actor_name_snapshot: profileMap.get(r.actor_id) || null,
          }
        }
        return r
      })
    },
    retry: false,
    staleTime: 1000 * 30, // 30s
  })

  const allEvents = useMemo(() => data ?? [], [data])

  // Summary statistics
  const stats = useMemo(() => {
    const total = allEvents.length
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    let todayCount = 0
    const uniqueActors = new Set<string>()
    let adminCount = 0

    allEvents.forEach((ev) => {
      if (ev.created_at && ev.created_at.startsWith(todayStr)) {
        todayCount++
      }
      if (ev.actor_id) {
        uniqueActors.add(ev.actor_id)
      } else if (ev.actor_email) {
        uniqueActors.add(ev.actor_email)
      }

      const role = (ev.actor_authority || '').toLowerCase()
      if (
        role === 'super_admin' ||
        ['invitations', 'memberships', 'app_settings'].includes(ev.table_name)
      ) {
        adminCount++
      }
    })

    return {
      total,
      today: todayCount,
      uniqueUsers: uniqueActors.size,
      adminActions: adminCount,
    }
  }, [allEvents])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const desc = (ev.description || generateHumanDescription(ev)).toLowerCase()
        const actorName = (ev.actor_name_snapshot || '').toLowerCase()
        const email = (ev.actor_email || '').toLowerCase()
        const recId = (ev.record_id || '').toLowerCase()
        const tbl = (ev.table_name || '').toLowerCase()
        const matches =
          desc.includes(query) ||
          actorName.includes(query) ||
          email.includes(query) ||
          recId.includes(query) ||
          tbl.includes(query)
        if (!matches) return false
      }

      // Module filter
      if (selectedModule !== 'ALL') {
        const modDef = MODULE_DEFINITIONS[selectedModule]
        if (modDef) {
          if (!modDef.tables.includes(ev.table_name)) return false
        } else if (ev.table_name !== selectedModule) {
          return false
        }
      }

      // Role filter
      if (selectedRole !== 'ALL') {
        const auth = (ev.actor_authority || '').toLowerCase()
        if (selectedRole === 'member') {
          if (auth !== 'member' && auth !== 'anggota') return false
        } else if (auth !== selectedRole.toLowerCase()) {
          return false
        }
      }

      // Action filter
      if (selectedAction !== 'ALL') {
        const actionNorm = (ev.action || '').toLowerCase()
        if (selectedAction === 'insert' && !actionNorm.includes('insert')) return false
        if (selectedAction === 'update' && !actionNorm.includes('update')) return false
        if (selectedAction === 'delete' && !actionNorm.includes('delete')) return false
        if (selectedAction === 'invitation_accepted' && !actionNorm.includes('invitation_accepted'))
          return false
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const st = (ev.status || 'success').toLowerCase()
        if (st !== selectedStatus.toLowerCase()) return false
      }

      // Date range filter
      if (selectedDateRange !== 'ALL') {
        const itemDate = new Date(ev.created_at).getTime()
        const now = Date.now()
        const oneDayMs = 24 * 60 * 60 * 1000
        if (selectedDateRange === 'today' && now - itemDate > oneDayMs) return false
        if (selectedDateRange === '7d' && now - itemDate > 7 * oneDayMs) return false
        if (selectedDateRange === '30d' && now - itemDate > 30 * oneDayMs) return false
      }

      return true
    })
  }, [
    allEvents,
    searchQuery,
    selectedModule,
    selectedRole,
    selectedAction,
    selectedStatus,
    selectedDateRange,
  ])

  // Pagination slice
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEvents.slice(start, start + pageSize)
  }, [filteredEvents, currentPage, pageSize])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedModule('ALL')
    setSelectedRole('ALL')
    setSelectedAction('ALL')
    setSelectedStatus('ALL')
    setSelectedDateRange('ALL')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedModule !== 'ALL' ||
    selectedRole !== 'ALL' ||
    selectedAction !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedDateRange !== 'ALL'

  // Export to CSV with UTF-8 BOM and sanitization
  const handleExportCsv = () => {
    const rowsToExport = filteredEvents.length > 0 ? filteredEvents : allEvents

    const sanitizeCsvCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""'
      let str = String(val).replace(/"/g, '""')
      // Protect against CSV injection
      if (/^[=+@-]$/.test(str.charAt(0))) {
        str = "'" + str
      }
      return `"${str}"`
    }

    const headers = [
      'ID',
      'Waktu',
      'Pengguna',
      'Email Pengguna',
      'Role / Authority',
      'Modul',
      'Tabel Database',
      'Aksi',
      'Deskripsi Aktivitas',
      'Status',
      'Record ID',
    ]

    const csvRows = [headers.join(',')]

    rowsToExport.forEach((ev) => {
      const { label } = getModuleInfo(ev.table_name)
      const actorName = ev.actor_name_snapshot || ev.actor_email?.split('@')[0] || ev.actor_id || 'Sistem'
      const desc = generateHumanDescription(ev)

      const row = [
        sanitizeCsvCell(ev.id),
        sanitizeCsvCell(new Date(ev.created_at).toLocaleString('id-ID')),
        sanitizeCsvCell(actorName),
        sanitizeCsvCell(ev.actor_email || ''),
        sanitizeCsvCell(ev.actor_authority || ''),
        sanitizeCsvCell(label),
        sanitizeCsvCell(ev.table_name),
        sanitizeCsvCell(ev.action),
        sanitizeCsvCell(desc),
        sanitizeCsvCell(ev.status || 'success'),
        sanitizeCsvCell(ev.record_id || ''),
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const today = new Date().toISOString().split('T')[0]
    link.href = url
    link.setAttribute('download', `log-aktivitas-kkn-space-${today}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
              Log Aktivitas
            </h1>
            <Badge variant="outline" className="border-forest/20 text-forest bg-forest/5 text-xs">
              Audit Trail
            </Badge>
          </div>
          <p className="text-xs text-charcoal-muted mt-1">
            Pantau dan telusuri aktivitas pengguna di seluruh sistem KKN SPACE secara real-time dan immutable.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || allEvents.length === 0}
            className="text-xs gap-1.5 border-warm-300 hover:bg-warm-100 text-charcoal"
          >
            <Download className="h-3.5 w-3.5 text-forest" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5 border-warm-300 hover:bg-warm-100 text-charcoal"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-forest' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Total Aktivitas
              </p>
              <p className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
                {isLoading ? '...' : stats.total.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Aktivitas Hari Ini
              </p>
              <p className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
                {isLoading ? '...' : stats.today.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center text-forest">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Pengguna Aktif
              </p>
              <p className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
                {isLoading ? '...' : stats.uniqueUsers}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-300 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                Aksi Administrasi
              </p>
              <p className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
                {isLoading ? '...' : stats.adminActions}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-warm-300 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
              <Input
                type="text"
                placeholder="Cari aktivitas, nama pengguna, email, atau record ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 text-xs border-warm-300 focus-visible:ring-forest bg-warm-50/50"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 gap-1.5 self-end sm:self-auto shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </Button>
            )}
          </div>

          {/* Facet Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            {/* Module Filter */}
            <div>
              <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                Modul
              </label>
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="ALL">Semua Modul</option>
                <option value="calendar">Kalender & Agenda</option>
                <option value="duty">Jadwal Piket Posko</option>
                <option value="work_programs">Program Kerja</option>
                <option value="tasks">Tugas & Rundown</option>
                <option value="meetings">Rapat & Notulensi</option>
                <option value="finance">Keuangan Posko</option>
                <option value="inventory">Inventaris Posko</option>
                <option value="media">Media & Dokumen</option>
                <option value="team">Anggota & Tim</option>
                <option value="surveys">Survei & Respon</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                Role Pengguna
              </label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="ALL">Semua Role</option>
                <option value="super_admin">Super Admin</option>
                <option value="member">Anggota (Member)</option>
                <option value="dpl">DPL</option>
                <option value="coordinator">Koordinator Desa</option>
                <option value="service_role">Sistem (Service Role)</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                Jenis Aksi
              </label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="insert">Tambah (INSERT)</option>
                <option value="update">Ubah (UPDATE)</option>
                <option value="delete">Hapus (DELETE)</option>
                <option value="invitation_accepted">Terima Undangan</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                Status Eksekusi
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="ALL">Semua Status</option>
                <option value="success">Berhasil (Success)</option>
                <option value="failed">Gagal (Failed)</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block mb-1">
                Rentang Waktu
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => {
                  setSelectedDateRange(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
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

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-6 flex items-center justify-between gap-4 text-xs text-red-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Gagal memuat log audit</p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  {(error as Error)?.message || 'Terjadi kesalahan saat membaca tabel audit_events.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs bg-white">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Activity Table */}
      {!isError && (
        <Card className="overflow-hidden border-warm-300 shadow-sm">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-warm-200/60" />
              ))}
            </CardContent>
          ) : filteredEvents.length === 0 ? (
            <CardContent className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-200 text-charcoal">
                <Filter className="h-6 w-6 text-charcoal-muted" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal">Tidak Ada Aktivitas Ditemukan</h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                {hasActiveFilters
                  ? 'Tidak ada aktivitas yang sesuai dengan kombinasi filter atau pencarian Anda.'
                  : 'Belum ada aktivitas pengguna yang tercatat dalam log audit sistem.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs border-warm-300"
                >
                  Reset Semua Filter
                </Button>
              )}
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-warm-300 bg-warm-100/70 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                      <th className="px-4 py-3.5 whitespace-nowrap">Waktu</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Pengguna</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Role</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Modul</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Aksi</th>
                      <th className="px-4 py-3.5">Deskripsi</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200 bg-white">
                    {paginatedEvents.map((ev) => {
                      const { label, Icon: ModIcon } = getModuleInfo(ev.table_name)
                      const actorName =
                        ev.actor_name_snapshot ||
                        (ev.actor_email ? ev.actor_email.split('@')[0] : null) ||
                        (ev.actor_id ? `ID: ${ev.actor_id.slice(0, 8)}...` : 'Sistem')

                      const userInitials = (
                        ev.actor_name_snapshot
                          ? ev.actor_name_snapshot
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                          : actorName.slice(0, 2)
                      ).toUpperCase()

                      const desc = generateHumanDescription(ev)
                      const isSuccess = (ev.status || 'success').toLowerCase() === 'success'

                      return (
                        <tr key={ev.id} className="hover:bg-warm-50/80 transition-colors">
                          {/* Waktu */}
                          <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                            <div className="font-mono text-charcoal font-medium">
                              {new Date(ev.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-charcoal-muted font-mono">
                              {new Date(ev.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          </td>

                          {/* Pengguna */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-forest/10 border border-forest/20 text-forest font-semibold text-[10px] flex items-center justify-center shrink-0">
                                {userInitials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-charcoal truncate max-w-[150px]">
                                  {actorName}
                                </p>
                                {ev.actor_email && (
                                  <p className="text-[10px] text-charcoal-muted font-mono truncate max-w-[150px]">
                                    {ev.actor_email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getRoleBadge(ev.actor_authority)}
                          </td>

                          {/* Modul */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warm-100 text-charcoal text-[11px] border border-warm-200">
                              <ModIcon className="h-3 w-3 text-forest shrink-0" />
                              <span className="font-medium">{label}</span>
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getActionBadge(ev.action)}
                          </td>

                          {/* Deskripsi */}
                          <td className="px-4 py-3 text-xs text-charcoal max-w-sm">
                            <p className="line-clamp-2 leading-relaxed" title={desc}>
                              {desc}
                            </p>
                            {ev.record_id && (
                              <span className="text-[10px] font-mono text-charcoal-muted/80">
                                Ref: {ev.record_id.slice(0, 8)}...
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Berhasil
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                Gagal
                              </span>
                            )}
                          </td>

                          {/* Detail Button */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveEvent(ev)
                                setShowRawJson(false)
                              }}
                              className="h-8 px-2 text-xs text-forest hover:text-forest-dark hover:bg-forest/5 gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Detail</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-warm-300 bg-warm-50/60 text-xs text-charcoal-muted">
                <div>
                  Menampilkan{' '}
                  <span className="font-semibold text-charcoal">
                    {filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
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
            </>
          )}
        </Card>
      )}

      {/* Detail & Diff Modal */}
      {activeEvent && (
        <Modal
          open={!!activeEvent}
          onClose={() => setActiveEvent(null)}
          title={`Detail Aktivitas #${activeEvent.id}`}
          description={`Dicatat pada ${new Date(activeEvent.created_at).toLocaleString('id-ID')}`}
          maxWidthClass="max-w-3xl"
        >
          <div className="space-y-5 text-xs text-charcoal">
            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-warm-50 rounded-lg border border-warm-300">
              <div>
                <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wider">
                  Pengguna / Actor
                </p>
                <p className="font-semibold text-charcoal mt-0.5">
                  {activeEvent.actor_name_snapshot || activeEvent.actor_email || 'Sistem Otomatis'}
                </p>
                <p className="text-[11px] font-mono text-charcoal-muted">
                  {activeEvent.actor_email || 'No email'} &bull;{' '}
                  {activeEvent.actor_id ? `${activeEvent.actor_id.slice(0, 10)}...` : 'Service Role'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wider">
                  Role / Otoritas
                </p>
                <div className="mt-1">{getRoleBadge(activeEvent.actor_authority)}</div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wider">
                  Modul &amp; Tabel Target
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-charcoal">
                    {getModuleInfo(activeEvent.table_name).label}
                  </span>
                  <span className="text-[11px] font-mono text-charcoal-muted">
                    ({activeEvent.table_name})
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wider">
                  Jenis Aksi &amp; Status
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getActionBadge(activeEvent.action)}
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {activeEvent.status || 'success'}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2 border-t border-warm-200 pt-2.5">
                <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wider">
                  Deskripsi Lengkap
                </p>
                <p className="text-xs text-charcoal mt-0.5 font-medium">
                  {generateHumanDescription(activeEvent)}
                </p>
                {activeEvent.record_id && (
                  <p className="text-[10px] font-mono text-charcoal-muted mt-1">
                    Record ID: {activeEvent.record_id}
                  </p>
                )}
              </div>
            </div>

            {/* Before vs After Diff Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                  Perubahan Data (State Diff)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="h-6 text-[10px] font-mono text-forest hover:bg-forest/5"
                >
                  {showRawJson ? 'Tampilkan Tabel Perbandingan' : 'Lihat Raw JSON'}
                </Button>
              </div>

              {showRawJson ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 bg-warm-100 rounded border border-warm-300 overflow-x-auto max-h-60">
                    <p className="text-[10px] font-semibold text-charcoal-muted mb-1 uppercase font-sans">
                      Old Values (Sebelumnya)
                    </p>
                    <pre className="text-charcoal whitespace-pre-wrap">
                      {activeEvent.old_values
                        ? JSON.stringify(activeEvent.old_values, null, 2)
                        : 'null'}
                    </pre>
                  </div>
                  <div className="p-3 bg-warm-100 rounded border border-warm-300 overflow-x-auto max-h-60">
                    <p className="text-[10px] font-semibold text-charcoal-muted mb-1 uppercase font-sans">
                      New Values (Sesudahnya)
                    </p>
                    <pre className="text-charcoal whitespace-pre-wrap">
                      {activeEvent.new_values
                        ? JSON.stringify(activeEvent.new_values, null, 2)
                        : 'null'}
                    </pre>
                  </div>
                </div>
              ) : (
                <DiffComparisonView
                  oldValues={activeEvent.old_values}
                  newValues={activeEvent.new_values}
                  action={activeEvent.action}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-warm-300">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveEvent(null)}
                className="text-xs border-warm-300"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * Component to present readable side-by-side or stacked diffs
 */
function DiffComparisonView({
  oldValues,
  newValues,
  action,
}: {
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  action: string
}) {
  const SENSITIVE_KEYS = ['password', 'token', 'secret', 'jwt', 'hash', 'key']

  const isSensitive = (key: string) => {
    const k = key.toLowerCase()
    return SENSITIVE_KEYS.some((s) => k.includes(s))
  }

  const formatVal = (val: unknown, key: string): string => {
    if (val === null || val === undefined) return '—'
    if (isSensitive(key)) return '••••••••'
    if (typeof val === 'object') return JSON.stringify(val)
    if (typeof val === 'boolean') return val ? 'true' : 'false'
    return String(val)
  }

  // Collect all keys
  const allKeys = Array.from(
    new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])
  ).sort()

  if (allKeys.length === 0) {
    return (
      <div className="p-4 text-center bg-warm-50 rounded border border-warm-300 text-charcoal-muted text-xs">
        Tidak ada data snapshot lama atau baru yang tersimpan untuk aksi ini.
      </div>
    )
  }

  // Filter modified keys if action is update
  const isUpdate = (action || '').toLowerCase().includes('update')

  return (
    <div className="border border-warm-300 rounded-md overflow-hidden bg-white max-h-72 overflow-y-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-warm-100/70 border-b border-warm-300 text-[10px] font-semibold uppercase text-charcoal-muted">
            <th className="px-3 py-2 w-1/4">Field / Kolom</th>
            <th className="px-3 py-2 w-3/8">Nilai Lama (Sebelum)</th>
            <th className="px-3 py-2 w-3/8">Nilai Baru (Sesudah)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-200">
          {allKeys.map((key) => {
            const oldVal = oldValues ? oldValues[key] : undefined
            const newVal = newValues ? newValues[key] : undefined
            const changed = isUpdate && JSON.stringify(oldVal) !== JSON.stringify(newVal)

            return (
              <tr
                key={key}
                className={
                  changed
                    ? 'bg-amber-50/50 hover:bg-amber-50'
                    : 'hover:bg-warm-50/50'
                }
              >
                <td className="px-3 py-2 font-mono text-[11px] font-medium text-charcoal">
                  <div className="flex items-center gap-1.5">
                    {changed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    )}
                    <span>{key}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-charcoal-muted break-all max-w-xs">
                  {formatVal(oldVal, key)}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-charcoal break-all max-w-xs font-medium">
                  {formatVal(newVal, key)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

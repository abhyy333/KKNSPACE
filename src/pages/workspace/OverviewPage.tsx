import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { AnnouncementModal } from '@/components/workspace/AnnouncementModal'
import { PoskoOperationsSummaryCard } from '@/components/workspace/PoskoOperationsSummaryCard'
import { fetchTeamDirectory } from '@/services/membersApi'
import { fetchKknRisks } from '@/services/risksApi'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchDashboardSummary,
  updateAnnouncement,
  type AnnouncementFormInput,
} from '@/services/dashboardApi'
import type {
  Announcement,
  KknRole,
  TaskItem,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckSquare,
  Clock,
  DollarSign,
  Edit3,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { PublicDocPhoto } from '@/components/public/PublicDocPhoto'

const ROLE_BADGE_LABELS: Record<KknRole, string> = {
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
  dpl: 'DPL',
}

const PROGRAM_STATUS_META: Record<
  WorkProgram['status'],
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }
> = {
  completed: { label: 'Selesai', variant: 'success' },
  ongoing: { label: 'Berjalan', variant: 'secondary' },
  planned: { label: 'Terencana', variant: 'warning' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

const TASK_STATUS_META: Record<
  TaskItem['status'],
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }
> = {
  done: { label: 'Selesai', variant: 'success' },
  in_progress: { label: 'Dikerjakan', variant: 'secondary' },
  todo: { label: 'Belum Mulai', variant: 'warning' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

const ANNOUNCEMENT_STATUS_META: Record<
  Announcement['status'],
  { label: string; variant: 'success' | 'warning' | 'outline' }
> = {
  published: { label: 'Dipublikasikan', variant: 'success' },
  draft: { label: 'Draf', variant: 'warning' },
  archived: { label: 'Diarsipkan', variant: 'outline' },
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime())) return ''
  const dayLabel = start.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const startTime = start.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = Number.isNaN(end.getTime())
    ? ''
    : end.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
  return `${dayLabel} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

function formatShiftTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

function computePeriodBadge(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
  todayKey: string
): { label: string; variant: 'secondary' | 'success' | 'outline' } {
  if (!periodStart || !periodEnd) {
    return { label: 'Periode Belum Diatur', variant: 'outline' }
  }

  const msPerDay = 86_400_000
  const start = new Date(`${periodStart}T00:00:00`).getTime()
  const end = new Date(`${periodEnd}T00:00:00`).getTime()
  const today = new Date(`${todayKey}T00:00:00`).getTime()

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return { label: 'Periode Belum Valid', variant: 'outline' }
  }

  const totalDays = Math.floor((end - start) / msPerDay) + 1
  if (today < start) {
    const daysUntil = Math.ceil((start - today) / msPerDay)
    return { label: `H-${daysUntil} Persiapan`, variant: 'outline' }
  }
  if (today > end) {
    return { label: `Periode Selesai (${totalDays} Hari)`, variant: 'success' }
  }

  const currentDay = Math.floor((today - start) / msPerDay) + 1
  return { label: `Hari ke-${currentDay} / ${totalDays}`, variant: 'secondary' }
}

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-40" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((idx) => (
        <Card key={idx}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

export const OverviewPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null)
  const [deletingTarget, setDeletingTarget] = useState<Announcement | null>(null)

  const { data: teamDirectory = [] } = useQuery({
    queryKey: ['workspace', 'team-directory'],
    queryFn: fetchTeamDirectory,
    staleTime: 60_000,
  })

  const activeTeamDirectory = useMemo(() => {
    return teamDirectory.filter((m) => m.is_active)
  }, [teamDirectory])

  const dplCount = useMemo(
    () => activeTeamDirectory.filter((m) => m.role === 'dpl').length,
    [activeTeamDirectory]
  )
  const studentCount = useMemo(
    () => activeTeamDirectory.filter((m) => m.role !== 'dpl').length,
    [activeTeamDirectory]
  )
  const totalTeamCount = activeTeamDirectory.length

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
  })

  const { data: risks = [] } = useQuery({
    queryKey: ['kkn-risks'],
    queryFn: fetchKknRisks,
    staleTime: 30_000,
  })

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'announcements-preview'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: async () => {
      await invalidateDashboard()
      toast({
        title: 'Pengumuman Tersimpan',
        description: 'Pengumuman baru telah ditambahkan ke Workspace.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menyimpan Pengumuman',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: AnnouncementFormInput
    }) => updateAnnouncement(id, values),
    onSuccess: async () => {
      await invalidateDashboard()
      toast({
        title: 'Pengumuman Diperbarui',
        description: 'Perubahan pengumuman berhasil disimpan.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Memperbarui Pengumuman',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: async () => {
      setDeletingTarget(null)
      await invalidateDashboard()
      toast({
        title: 'Pengumuman Dihapus',
        description: 'Pengumuman telah dihapus dari sistem.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Pengumuman',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const memberMap = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary>()
    for (const m of data?.members ?? []) {
      map.set(m.user_id, m)
    }
    return map
  }, [data?.members])

  const assigneesByTaskId = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary[]>()
    for (const row of data?.taskAssignees ?? []) {
      const member = memberMap.get(row.user_id)
      if (!member) continue
      const existing = map.get(row.task_id) ?? []
      existing.push(member)
      map.set(row.task_id, existing)
    }
    return map
  }, [data?.taskAssignees, memberMap])

  const canCreateAnnouncement =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris' ||
    membership?.role === 'dpl'

  const canManageAnnouncement = (item: Announcement): boolean => {
    if (
      isSuperAdmin ||
      membership?.role === 'ketua' ||
      membership?.role === 'sekretaris'
    ) {
      return true
    }
    if (membership?.role === 'dpl' && user?.id && item.created_by === user.id) {
      return true
    }
    return false
  }

  const handleModalSubmit = async (values: AnnouncementFormInput) => {
    if (editingAnnouncement) {
      await updateMutation.mutateAsync({
        id: editingAnnouncement.id,
        values,
      })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-charcoal">
                Gagal Memuat Dashboard Workspace
              </h2>
              <p className="text-xs text-charcoal-muted mt-1">
                {error instanceof Error
                  ? error.message
                  : 'Terjadi gangguan saat mengambil data dari Supabase.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Coba Lagi</span>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const groupName = data.groupSettings?.group_name?.trim() || 'KKN SPACE'
  const villageName = data.groupSettings?.village_name?.trim()
  const periodBadge = computePeriodBadge(
    data.groupSettings?.period_start,
    data.groupSettings?.period_end,
    data.todayDateKey
  )

  const subtitleParts: string[] = [groupName]
  subtitleParts.push(
    villageName ? `Desa ${villageName}` : 'Lokasi desa posko belum diatur admin'
  )
  if (data.groupSettings?.period_start && data.groupSettings?.period_end) {
    subtitleParts.push(
      `${formatShortDate(data.groupSettings.period_start)} – ${formatShortDate(
        data.groupSettings.period_end
      )}`
    )
  }

  const totalPrograms = data.workPrograms.length
  const completedPrograms = data.workPrograms.filter(
    (p) => p.status === 'completed'
  ).length
  const ongoingPrograms = data.workPrograms.filter(
    (p) => p.status === 'ongoing'
  ).length
  const plannedPrograms = data.workPrograms.filter(
    (p) => p.status === 'planned'
  ).length

  const activeTasks = data.tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress'
  )
  const doneTasksCount = data.tasks.filter((t) => t.status === 'done').length

  const todayMs = new Date(`${data.todayDateKey}T00:00:00`).getTime()
  const threeDaysMs = todayMs + 3 * 86_400_000
  let dueSoonCount = 0
  let overdueCount = 0
  for (const task of activeTasks) {
    if (!task.due_date) continue
    const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
    if (Number.isNaN(dueMs)) continue
    if (dueMs < todayMs) overdueCount += 1
    else if (dueMs <= threeDaysMs) dueSoonCount += 1
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
              Selamat Datang di Workspace KKN
            </h1>
            <Badge variant={periodBadge.variant}>{periodBadge.label}</Badge>
          </div>
          <p className="text-xs text-charcoal-muted mt-1">
            {subtitleParts.join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Real-time Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/workspace/programs" className="block group">
          <Card className="transition-colors group-hover:border-sage-400">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                  Program Kerja
                </p>
                <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1">
                  {totalPrograms} Program
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  {totalPrograms === 0 ? (
                    'Belum ada program tercatat'
                  ) : (
                    <>
                      <span className="text-emerald-700 font-medium">
                        {completedPrograms} selesai
                      </span>{' '}
                      · {ongoingPrograms} berjalan · {plannedPrograms} rencana
                    </>
                  )}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-100 text-sage-800 shrink-0">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/workspace/tasks" className="block group">
          <Card className="transition-colors group-hover:border-sage-400">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                  Tugas Tim Berjalan
                </p>
                <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1">
                  {activeTasks.length} Tugas
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  {activeTasks.length === 0 && doneTasksCount === 0 ? (
                    'Belum ada tugas tim'
                  ) : (
                    <>
                      {overdueCount > 0 ? (
                        <span className="text-red-700 font-medium">
                          {overdueCount} lewat tenggat
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">
                          {dueSoonCount} tenggat dekat
                        </span>
                      )}{' '}
                      · {doneTasksCount} selesai
                    </>
                  )}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 shrink-0">
                <CheckSquare className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/workspace/finance" className="block group">
          <Card className="transition-colors group-hover:border-sage-400">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                  Saldo Kas Posko
                </p>
                <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1 truncate">
                  {idrFormatter.format(data.finance.balance)}
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  {data.finance.transactionCount === 0
                    ? 'Belum ada transaksi kas'
                    : `${data.finance.transactionCount} transaksi tercatat`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/workspace/members" className="block group">
          <Card className="transition-colors group-hover:border-sage-400">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                  Anggota Tim Posko
                </p>
                <h3 className="text-2xl font-serif font-semibold text-charcoal mt-1">
                  {totalTeamCount > 0 ? totalTeamCount : (data.teamDirectory?.length ?? 11)} Orang
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  {studentCount > 0 ? studentCount : (data.teamDirectory?.filter((m) => m.role !== 'dpl').length ?? 10)} Anggota KKN · {dplCount > 0 ? dplCount : (data.teamDirectory?.filter((m) => m.role === 'dpl').length ?? 1)} DPL
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-200 text-charcoal shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule, Duty Shifts, Work Programs, Active Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda & Duty Shifts */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-serif">
                  Agenda Mendatang &amp; Jadwal Piket Hari Ini
                </CardTitle>
                <CardDescription>
                  Jadwal kegiatan posko terdekat serta pembagian piket tanggal{' '}
                  {formatShortDate(data.todayDateKey)}
                </CardDescription>
              </div>
              <Link
                to="/workspace/agenda"
                className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1 shrink-0"
              >
                <span>Agenda</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.upcomingEvents.length === 0 && data.todayShifts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/70 p-6 text-center space-y-2">
                  <Calendar className="h-6 w-6 text-charcoal-muted mx-auto" />
                  <p className="text-xs font-medium text-charcoal">
                    Belum ada agenda mendatang atau jadwal piket hari ini
                  </p>
                  <p className="text-[11px] text-charcoal-muted max-w-md mx-auto">
                    Tambahkan agenda rapat, kunjungan desa, atau jadwal piket harian melalui modul Kalender Agenda dan Jadwal Piket.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link to="/workspace/agenda">
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        Buka Kalender Agenda
                      </Button>
                    </Link>
                    <Link to="/workspace/duty">
                      <Button size="sm" variant="ghost" className="text-xs h-8">
                        Lihat Jadwal Piket
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.upcomingEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3.5 rounded-lg border border-warm-200 bg-warm-50/60 p-3.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sage-100 text-sage-800 mt-0.5">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-charcoal">
                            {ev.title}
                          </h4>
                          <Badge variant="outline" className="text-[10px]">
                            {formatTimeRange(ev.start_at, ev.end_at)}
                          </Badge>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-charcoal-muted mt-1 line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {data.todayShifts.length > 0 && (
                    <div className="pt-2 border-t border-warm-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                          Piket Hari Ini
                        </span>
                        <Link
                          to="/workspace/duty"
                          className="text-[11px] font-medium text-sage-700 hover:text-sage-800"
                        >
                          Kelola Piket &rarr;
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {data.todayShifts.map((shift) => {
                          const assignee = shift.assigned_user_id
                            ? memberMap.get(shift.assigned_user_id)
                            : undefined
                          return (
                            <div
                              key={shift.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-warm-200 bg-white px-3 py-2 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-charcoal truncate">
                                  {assignee?.full_name || 'Belum ditugaskan'}
                                </p>
                                {shift.notes && (
                                  <p className="text-[11px] text-charcoal-muted truncate">
                                    {shift.notes}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatShiftTime(shift.start_time)}–
                                {formatShiftTime(shift.end_time)}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Programs & Active Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-serif">
                    Program Kerja
                  </CardTitle>
                  <CardDescription>
                    Ringkasan proker aktif di posko
                  </CardDescription>
                </div>
                <Link
                  to="/workspace/programs"
                  className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1"
                >
                  <span>Semua</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.workPrograms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/70 p-5 text-center space-y-2">
                    <p className="text-xs font-medium text-charcoal">
                      Belum ada program kerja
                    </p>
                    <p className="text-[11px] text-charcoal-muted">
                      Susun rencana proker desa di menu Program Kerja.
                    </p>
                  </div>
                ) : (
                  data.workPrograms.slice(0, 5).map((prog) => {
                    const meta = PROGRAM_STATUS_META[prog.status]
                    return (
                      <div
                        key={prog.id}
                        className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-medium text-charcoal line-clamp-1">
                            {prog.title}
                          </h4>
                          <Badge variant={meta.variant} className="text-[10px] shrink-0">
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-charcoal-muted">
                          {prog.start_date || prog.end_date
                            ? `${formatShortDate(prog.start_date)} – ${formatShortDate(
                                prog.end_date
                              )}`
                            : 'Jadwal pelaksanaan belum ditentukan'}
                        </p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-serif">
                    Tugas Tim Terbuka
                  </CardTitle>
                  <CardDescription>
                    Tugas dengan status aktif ({activeTasks.length})
                  </CardDescription>
                </div>
                <Link
                  to="/workspace/tasks"
                  className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1"
                >
                  <span>Kelola</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {activeTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/70 p-5 text-center space-y-2">
                    <p className="text-xs font-medium text-charcoal">
                      Tidak ada tugas terbuka
                    </p>
                    <p className="text-[11px] text-charcoal-muted">
                      Tugas operasional tim akan tampil di sini beserta tenggat dan penanggung jawabnya.
                    </p>
                  </div>
                ) : (
                  activeTasks.slice(0, 5).map((task) => {
                    const meta = TASK_STATUS_META[task.status]
                    const assignees = assigneesByTaskId.get(task.id) ?? []
                    const isOverdue =
                      Boolean(task.due_date) && task.due_date! < data.todayDateKey

                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-medium text-charcoal line-clamp-1">
                            {task.title}
                          </h4>
                          <Badge variant={meta.variant} className="text-[10px] shrink-0">
                            {meta.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-charcoal-muted">
                          <span className="truncate">
                            PJ:{' '}
                            {assignees.length > 0
                              ? assignees.map((a) => a.full_name).join(', ')
                              : 'Belum ditugaskan'}
                          </span>
                          <span
                            className={
                              isOverdue ? 'text-red-700 font-medium' : ''
                            }
                          >
                            {task.due_date
                              ? `Tenggat ${formatShortDate(task.due_date)}`
                              : 'Tanpa tenggat'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* B. Aktivitas Terbaru Kelompok */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-serif">
                  Aktivitas Terbaru
                </CardTitle>
                <CardDescription>
                  Pembaruan terkini dari program kerja, tugas tim, dan kegiatan posko
                </CardDescription>
              </div>
              <Sparkles className="h-4 w-4 text-sage-600" />
            </CardHeader>
            <CardContent>
              {!data.recentActivities || data.recentActivities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/70 p-5 text-center space-y-1.5">
                  <p className="text-xs font-medium text-charcoal">
                    Belum ada riwayat aktivitas terbaru
                  </p>
                  <p className="text-[11px] text-charcoal-muted">
                    Setiap pembaruan program kerja, tugas tim, dan rapat akan tercatat di panel ini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-200">
                  {data.recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warm-100 text-charcoal">
                          {act.type === 'program' && <Award className="h-3.5 w-3.5 text-sage-700" />}
                          {act.type === 'task' && <CheckSquare className="h-3.5 w-3.5 text-amber-700" />}
                          {act.type === 'meeting' && <Calendar className="h-3.5 w-3.5 text-blue-700" />}
                          {act.type === 'documentation' && <ImageIcon className="h-3.5 w-3.5 text-purple-700" />}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to={act.href}
                            className="font-medium text-charcoal hover:text-sage-800 transition-colors truncate block"
                          >
                            {act.title}
                          </Link>
                          <span className="text-[11px] text-charcoal-muted">
                            {formatShortDate(act.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={act.statusVariant} className="text-[10px] shrink-0">
                        {act.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* C. Dokumentasi Terbaru */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-serif">
                  Dokumentasi Terbaru
                </CardTitle>
                <CardDescription>
                  Arsip visual dan momen kegiatan lapangan tim posko
                </CardDescription>
              </div>
              <Link
                to="/workspace/documentation"
                className="text-xs font-medium text-sage-700 hover:text-sage-800 flex items-center gap-1"
              >
                <span>Galeri Lengkap</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {!data.recentDocumentations || data.recentDocumentations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/70 p-6 text-center space-y-2">
                  <ImageIcon className="h-6 w-6 text-charcoal-muted mx-auto" />
                  <p className="text-xs font-medium text-charcoal">
                    Belum ada dokumentasi kegiatan
                  </p>
                  <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto">
                    Dokumentasikan kegiatan pengabdian masyarakat di menu Galeri Dokumentasi untuk ditampilkan ke publik.
                  </p>
                  <Link to="/workspace/documentation">
                    <Button size="sm" variant="outline" className="text-xs h-8 mt-1">
                      Buka Galeri Dokumentasi
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {data.recentDocumentations.map((doc) => (
                    <Link
                      key={doc.id}
                      to="/workspace/documentation"
                      className="group flex flex-col overflow-hidden rounded-lg border border-warm-200 bg-white hover:border-sage-400 hover:shadow-subtle transition-all"
                    >
                      <PublicDocPhoto
                        fileId={doc.cover_file_id}
                        assetId={doc.id}
                        alt={doc.title}
                        aspectClass="aspect-[4/3]"
                        className="w-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                        <h4 className="text-xs font-semibold text-charcoal line-clamp-1 group-hover:text-sage-800 transition-colors">
                          {doc.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-charcoal-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {doc.event_date ? formatShortDate(doc.event_date) : formatShortDate(doc.created_at)}
                          </span>
                          {doc.location && (
                            <span className="flex items-center gap-0.5 truncate max-w-[90px]">
                              <MapPin className="h-2.5 w-2.5" />
                              {doc.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Announcements & Active Members Summary */}
        <div className="space-y-6">
          <Card className="border-sage-200 bg-gradient-to-b from-sage-50/80 to-white">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sage-700 text-white">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-charcoal">
                    Pengumuman Posko
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Arahan DPL &amp; informasi tim
                  </CardDescription>
                </div>
              </div>
              {canCreateAnnouncement && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setEditingAnnouncement(null)
                    setModalOpen(true)
                  }}
                  className="h-7 px-2.5 text-[11px] gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Buat</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {data.announcements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-sage-300 bg-white/80 p-4 text-center space-y-1.5">
                  <p className="text-xs font-medium text-charcoal">
                    Belum ada pengumuman
                  </p>
                  <p className="text-[11px] text-charcoal-muted">
                    {canCreateAnnouncement
                      ? 'Gunakan tombol "+ Buat" untuk mempublikasikan pengumuman kepada anggota posko.'
                      : 'Pengumuman resmi dari Ketua, Sekretaris, atau DPL akan tampil di sini.'}
                  </p>
                </div>
              ) : (
                data.announcements.slice(0, 5).map((item) => {
                  const author = memberMap.get(item.created_by)
                  const statusMeta = ANNOUNCEMENT_STATUS_META[item.status]
                  const manageable = canManageAnnouncement(item)

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-warm-200 bg-white p-3.5 space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-charcoal leading-snug">
                          {item.title}
                        </h4>
                        <Badge
                          variant={statusMeta.variant}
                          className="text-[10px] shrink-0"
                        >
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-charcoal-muted whitespace-pre-line leading-relaxed">
                        {item.content}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-warm-200/80 text-[10px] text-charcoal-muted">
                        <span className="truncate">
                          {author
                            ? `${author.full_name} (${ROLE_BADGE_LABELS[author.role]})`
                            : 'Pengurus / Admin'}
                          {' · '}
                          {formatShortDate(item.published_at || item.created_at)}
                        </span>

                        {manageable && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnnouncement(item)
                                setModalOpen(true)
                              }}
                              className="rounded p-1 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                              title="Edit pengumuman"
                              aria-label="Edit pengumuman"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTarget(item)}
                              className="rounded p-1 text-charcoal-muted hover:bg-red-50 hover:text-red-600"
                              title="Hapus pengumuman"
                              aria-label="Hapus pengumuman"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Ringkasan Operasional Posko */}
          <PoskoOperationsSummaryCard
            financeTransactions={data.financeTransactions ?? []}
            workPrograms={data.workPrograms ?? []}
            tasks={data.tasks ?? []}
            taskAssignees={data.taskAssignees ?? []}
            members={data.members ?? []}
            inventoryAlerts={data.inventoryAlerts ?? []}
            risks={risks}
            todayDateKey={data.todayDateKey}
          />
        </div>
      </div>

      <AnnouncementModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAnnouncement(null)
        }}
        initialData={editingAnnouncement}
        onSubmitForm={handleModalSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />


      <ConfirmDialog
        open={Boolean(deletingTarget)}
        onClose={() => setDeletingTarget(null)}
        onConfirm={() => {
          if (deletingTarget) {
            deleteMutation.mutate(deletingTarget.id)
          }
        }}
        title="Hapus Pengumuman?"
        description={
          deletingTarget
            ? `Pengumuman "${deletingTarget.title}" akan dihapus secara permanen dari dashboard dan daftar notifikasi.`
            : ''
        }
        confirmLabel="Hapus Pengumuman"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

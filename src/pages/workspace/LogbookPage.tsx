import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  GitBranch,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { getLocalDateKey } from '@/services/dashboardApi'
import {
  deleteDailyLogEntry,
  fetchLogbookBundle,
  fetchLogbookTeamSummary,
} from '@/services/logbookApi'
import { getRecapDateRange, type FinanceRecapPeriodMode } from '@/lib/finance'
import {
  buildCorrectionChain,
  canAuthorModifyLog,
  canCreateCorrectionForLog,
  canRoleReadTeamLogbook,
  canRoleVerifyLogbook,
  canRoleWriteLogbook,
  computeLogbookMetrics,
  filterLogbookEntries,
  formatLogbookDate,
  formatLogbookDuration,
  LOGBOOK_CATEGORIES,
  LOGBOOK_CATEGORY_LABELS,
  LOGBOOK_STATUS_META,
} from '@/lib/logbook'
import { LogbookFormModal } from '@/components/workspace/LogbookFormModal'
import { LogbookDetailModal } from '@/components/workspace/LogbookDetailModal'
import type {
  DailyLog,
  DailyLogAttachment,
  DailyLogCategory,
  DailyLogParticipant,
  DailyLogReview,
  DailyLogVerificationStatus,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'

const EMPTY_LOGS: DailyLog[] = []
const EMPTY_PROGRAMS: WorkProgram[] = []
const EMPTY_MEMBERS: WorkspaceMemberSummary[] = []
const EMPTY_ATTACHMENTS: Record<string, DailyLogAttachment[]> = {}
const EMPTY_PARTICIPANTS: Record<string, DailyLogParticipant[]> = {}
const EMPTY_REVIEWS: Record<string, DailyLogReview[]> = {}
const EMPTY_MEMBERS_MAP: Record<string, WorkspaceMemberSummary> = {}

type RecapScope = FinanceRecapPeriodMode | 'all'

export const LogbookPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialProgramParam = searchParams.get('programId') || 'all'
  const todayStr = getLocalDateKey()

  // Role capabilities strictly aligned with Phase 4.2.1 authorization rules
  const role = membership?.status === 'active' ? membership.role : null
  const canWriteOwnLogbook = canRoleWriteLogbook(role, isSuperAdmin)
  const canReadAllTeamLogs = canRoleReadTeamLogbook(role, isSuperAdmin)
  const canVerifyLogbook = canRoleVerifyLogbook(role, isSuperAdmin)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | DailyLogCategory>('all')
  const [programFilter, setProgramFilter] = useState<string>(initialProgramParam)
  const [statusFilter, setStatusFilter] = useState<'all' | DailyLogVerificationStatus>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  // Recap period controls
  const [recapScope, setRecapScope] = useState<RecapScope>('monthly')
  const [recapAnchorDate, setRecapAnchorDate] = useState(todayStr)
  const [recapCustomStart, setRecapCustomStart] = useState(todayStr)
  const [recapCustomEnd, setRecapCustomEnd] = useState(todayStr)

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null)
  const [correctionTargetLog, setCorrectionTargetLog] = useState<DailyLog | null>(null)
  const [detailLog, setDetailLog] = useState<DailyLog | null>(null)
  const [deletingLog, setDeletingLog] = useState<DailyLog | null>(null)

  const {
    data: bundle,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'logbook-bundle'],
    queryFn: fetchLogbookBundle,
    staleTime: 30_000,
  })

  const logs = bundle?.logs ?? EMPTY_LOGS
  const programs = bundle?.programs ?? EMPTY_PROGRAMS
  const members = bundle?.members ?? EMPTY_MEMBERS
  const attachmentsByLog = bundle?.attachmentsByLog ?? EMPTY_ATTACHMENTS
  const participantsByLog = bundle?.participantsByLog ?? EMPTY_PARTICIPANTS
  const reviewsByLog = bundle?.reviewsByLog ?? EMPTY_REVIEWS
  const membersById = bundle?.membersById ?? EMPTY_MEMBERS_MAP

  const detailChain = useMemo(
    () => (detailLog ? buildCorrectionChain(detailLog.id, logs) : { rootLog: null, ancestors: [], descendants: [] }),
    [detailLog, logs]
  )

  const dplPendingCount = useMemo(
    () => logs.filter((l) => l.verification_status === 'submitted').length,
    [logs]
  )

  const programMap = useMemo(() => {
    const map = new Map<string, WorkProgram>()
    for (const p of programs) map.set(p.id, p)
    return map
  }, [programs])

  const programTitlesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of programs) map.set(p.id, p.title)
    return map
  }, [programs])

  const authorNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.user_id, m.full_name)
    return map
  }, [members])

  const activeRecapRange = useMemo(() => {
    if (recapScope === 'all') return undefined
    const r = getRecapDateRange(recapScope, recapAnchorDate, recapCustomStart, recapCustomEnd)
    return { startDate: r.startDate, endDate: r.endDate, label: r.label }
  }, [recapScope, recapAnchorDate, recapCustomStart, recapCustomEnd])

  const {
    data: teamSummary,
    isLoading: isSummaryLoading,
    refetch: refetchTeamSummary,
    isFetching: isSummaryFetching,
  } = useQuery({
    queryKey: [
      'workspace',
      'logbook-team-summary',
      todayStr,
      activeRecapRange?.startDate ?? null,
      activeRecapRange?.endDate ?? null,
    ],
    queryFn: () =>
      fetchLogbookTeamSummary(
        todayStr,
        activeRecapRange?.startDate ?? null,
        activeRecapRange?.endDate ?? null
      ),
    staleTime: 30_000,
  })

  const metrics = useMemo(() => {
    if (teamSummary) {
      return {
        todayCount: teamSummary.today_count,
        weekCount: teamSummary.week_count,
        totalCount: teamSummary.total_count,
        rangeCount: teamSummary.range_count,
        activeAuthorsCount: teamSummary.active_authors_count,
        totalDurationMinutes: teamSummary.total_duration_minutes,
        categoryBreakdown: teamSummary.category_breakdown.map((item) => ({
          category: item.category,
          label: LOGBOOK_CATEGORY_LABELS[item.category] ?? item.category,
          count: Number(item.count ?? 0),
        })),
        programBreakdown: teamSummary.program_breakdown.map((item) => ({
          programId: item.program_id,
          programTitle: item.program_title,
          count: Number(item.count ?? 0),
        })),
        dailyBreakdown: teamSummary.daily_breakdown.slice(0, 10).map((item) => ({
          logDate: item.log_date,
          count: Number(item.count ?? 0),
        })),
      }
    }
    return {
      ...computeLogbookMetrics(
        logs,
        programs,
        todayStr,
        activeRecapRange
          ? { startDate: activeRecapRange.startDate, endDate: activeRecapRange.endDate }
          : undefined
      ),
      dailyBreakdown: [] as Array<{ logDate: string; count: number }>,
    }
  }, [teamSummary, logs, programs, todayStr, activeRecapRange])

  const filteredLogs = useMemo(
    () =>
      filterLogbookEntries(
        logs,
        {
          searchQuery,
          categoryFilter,
          programFilter,
          statusFilter,
          startDate: startDateFilter,
          endDate: endDateFilter,
          onlyMine,
          currentUserId: user?.id ?? null,
        },
        {
          programTitlesById,
          authorNamesById,
        }
      ),
    [
      logs,
      searchQuery,
      categoryFilter,
      programFilter,
      statusFilter,
      startDateFilter,
      endDateFilter,
      onlyMine,
      user?.id,
      programTitlesById,
      authorNamesById,
    ]
  )

  const deleteMutation = useMutation({
    mutationFn: deleteDailyLogEntry,
    onSuccess: async () => {
      setDeletingLog(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-bundle'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-team-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'work-program-log-summaries'] }),
      ])
      toast({
        title: 'Catatan Dihapus',
        description: 'Catatan aktivitas harian telah dihapus.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Catatan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const handleProgramFilterChange = (nextVal: string) => {
    setProgramFilter(nextVal)
    if (nextVal === 'all' && searchParams.has('programId')) {
      searchParams.delete('programId')
      setSearchParams(searchParams, { replace: true })
    }
  }

  const resetAllFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
    handleProgramFilterChange('all')
    setStatusFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setOnlyMine(false)
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    programFilter !== 'all' ||
    statusFilter !== 'all' ||
    startDateFilter !== '' ||
    endDateFilter !== '' ||
    onlyMine

  const canModifyLog = (log: DailyLog) =>
    canAuthorModifyLog(log, user?.id ?? null, role, isSuperAdmin)

  const canCorrectLog = (log: DailyLog) =>
    canCreateCorrectionForLog(log, user?.id ?? null, role, isSuperAdmin)

  const anyLoading = isLoading || isSummaryLoading
  const anyFetching = isFetching || isSummaryFetching

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Logbook Kegiatan KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pencatatan aktivitas harian mahasiswa, dokumentasi lapangan privat, verifikasi DPL, dan ringkasan kegiatan tim.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetch()
              void refetchTeamSummary()
            }}
            disabled={anyFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${anyFetching ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </Button>
          {canWriteOwnLogbook && (
            <Button
              size="sm"
              onClick={() => {
                setEditingLog(null)
                setCorrectionTargetLog(null)
                setFormModalOpen(true)
              }}
              className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Catat Aktivitas</span>
            </Button>
          )}
        </div>
      </div>

      {/* Role & Verification Workflow Policy Card */}
      <Card className="border-warm-300 bg-warm-50">
        <CardContent className="p-4 flex items-start gap-3 text-xs">
          <ShieldCheck className="h-4 w-4 text-sage-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-charcoal-muted leading-relaxed">
            <div className="font-semibold text-charcoal">
              Tata Kelola &amp; Verifikasi Logbook Kegiatan
            </div>
            {canVerifyLogbook ? (
              <p>
                Peran Anda berwenang sebagai <span className="font-medium text-charcoal">verifikator akhir (DPL)</span> dan dapat memantau seluruh logbook tim. Buka tombol <span className="font-medium text-charcoal">Detail</span> pada catatan berstatus Tercatat untuk memverifikasi atau meminta revisi.
              </p>
            ) : canReadAllTeamLogs ? (
              <p>
                Ketua dan Sekretaris dapat mencatat logbook pribadi sekaligus memantau seluruh logbook tim. Verifikasi akhir dilakukan oleh <span className="font-medium text-charcoal">DPL</span>; catatan Terverifikasi terkunci dan koreksi dibuat sebagai catatan koreksi baru yang terhubung.
              </p>
            ) : (
              <p>
                Anda melihat <span className="font-medium text-charcoal">riwayat detail logbook pribadi</span> Anda beserta <span className="font-medium text-charcoal">ringkasan agregat aktivitas tim</span>. Verifikasi akhir dilakukan oleh DPL; setelah Terverifikasi, perubahan hanya melalui catatan koreksi baru yang terhubung ke catatan asli.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stat Cards (Aggregate Team Summary for all active members) */}
      {anyLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-warm-300 bg-white">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                <span>Aktivitas Tim Hari Ini</span>
                <Calendar className="h-3.5 w-3.5 text-sage-700" />
              </div>
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {metrics.todayCount}
              </div>
              <p className="text-[11px] text-charcoal-muted">
                Tanggal {formatLogbookDate(todayStr)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-warm-300 bg-white">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                <span>Aktivitas Tim Minggu Ini</span>
                <CalendarRange className="h-3.5 w-3.5 text-sage-700" />
              </div>
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {metrics.weekCount}
              </div>
              <p className="text-[11px] text-charcoal-muted">Senin s.d. Minggu berjalan</p>
            </CardContent>
          </Card>

          <Card className="border-warm-300 bg-white">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                <span>Total Catatan Tim</span>
                <BookOpen className="h-3.5 w-3.5 text-sage-700" />
              </div>
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {metrics.totalCount}
              </div>
              <p className="text-[11px] text-charcoal-muted">
                {teamSummary
                  ? `${teamSummary.verified_count} terverifikasi · ${teamSummary.submitted_count} menunggu DPL`
                  : 'Aktivitas tim tercatat (non-draf)'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-warm-300 bg-white">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
                <span>Anggota Aktif Mencatat</span>
                <UserCheck className="h-3.5 w-3.5 text-sage-700" />
              </div>
              <div className="text-2xl font-serif font-semibold text-charcoal">
                {metrics.activeAuthorsCount}
              </div>
              <p className="text-[11px] text-charcoal-muted">
                {metrics.totalDurationMinutes > 0
                  ? `Total durasi ${formatLogbookDuration(metrics.totalDurationMinutes)} (periode)`
                  : 'Rekap agregat tim (non-draf)'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Recap & Category / Work Program Breakdown */}
      {!anyLoading && !isError && (
        <Card className="border-warm-300 bg-white">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-warm-200 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-charcoal">
                  Ringkasan &amp; Distribusi Aktivitas Tim
                </h2>
                <p className="text-[11px] text-charcoal-muted">
                  {activeRecapRange
                    ? `Periode: ${activeRecapRange.label} · ${metrics.rangeCount} catatan tim tercatat`
                    : `Seluruh periode KKN · ${metrics.rangeCount} catatan tim tercatat`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: 'daily', label: 'Harian' },
                    { value: 'weekly', label: 'Mingguan' },
                    { value: 'monthly', label: 'Bulanan' },
                    { value: 'all', label: 'Semua' },
                    { value: 'custom', label: 'Rentang' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setRecapScope(tab.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      recapScope === tab.value
                        ? 'bg-sage-700 text-white'
                        : 'bg-warm-100 text-charcoal-muted hover:bg-warm-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {recapScope !== 'all' && recapScope !== 'custom' && (
                  <Input
                    type="date"
                    value={recapAnchorDate}
                    onChange={(e) => setRecapAnchorDate(e.target.value)}
                    className="h-8 w-auto text-xs"
                  />
                )}
                {recapScope === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={recapCustomStart}
                      onChange={(e) => setRecapCustomStart(e.target.value)}
                      className="h-8 w-auto text-xs"
                    />
                    <span className="text-xs text-charcoal-muted">–</span>
                    <Input
                      type="date"
                      value={recapCustomEnd}
                      onChange={(e) => setRecapCustomEnd(e.target.value)}
                      className="h-8 w-auto text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {metrics.rangeCount === 0 ? (
              <p className="text-xs text-charcoal-muted py-2">
                Belum ada catatan aktivitas pada rentang waktu yang dipilih.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-charcoal">
                    Distribusi Berdasarkan Jenis Kegiatan
                  </h3>
                  <div className="space-y-1.5">
                    {metrics.categoryBreakdown.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between rounded-md border border-warm-200 bg-warm-50/70 px-3 py-1.5 text-xs"
                      >
                        <span className="text-charcoal">{item.label}</span>
                        <Badge variant="secondary" className="text-[11px]">
                          {item.count} catatan
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-charcoal">
                    Aktivitas Berdasarkan Program Kerja
                  </h3>
                  <div className="space-y-1.5">
                    {metrics.programBreakdown.map((item) => (
                      <div
                        key={item.programId ?? 'unlinked'}
                        className="flex items-center justify-between gap-2 rounded-md border border-warm-200 bg-warm-50/70 px-3 py-1.5 text-xs"
                      >
                        <span className="text-charcoal truncate">{item.programTitle}</span>
                        <Badge variant="outline" className="text-[11px] shrink-0">
                          {item.count} catatan
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-charcoal">
                    Rekap Aktivitas per Tanggal
                  </h3>
                  {metrics.dailyBreakdown.length === 0 ? (
                    <p className="text-[11px] text-charcoal-muted">
                      Belum ada pengelompokan tanggal.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {metrics.dailyBreakdown.map((item) => (
                        <div
                          key={item.logDate}
                          className="flex items-center justify-between gap-2 rounded-md border border-warm-200 bg-warm-50/70 px-3 py-1.5 text-xs"
                        >
                          <span className="text-charcoal">{formatLogbookDate(item.logDate)}</span>
                          <Badge variant="secondary" className="text-[11px] shrink-0">
                            {item.count} catatan
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="border-warm-300 bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, deskripsi, lokasi, atau pembuat..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | DailyLogCategory)}
              className="h-9 rounded-md border border-warm-300 bg-white px-2.5 text-xs text-charcoal"
            >
              <option value="all">Semua Jenis Kegiatan</option>
              {LOGBOOK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={programFilter}
              onChange={(e) => handleProgramFilterChange(e.target.value)}
              className="h-9 rounded-md border border-warm-300 bg-white px-2.5 text-xs text-charcoal"
            >
              <option value="all">Semua Program Kerja</option>
              <option value="none">Non-Program Kerja</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | DailyLogVerificationStatus)
              }
              className="h-9 rounded-md border border-warm-300 bg-white px-2.5 text-xs text-charcoal"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="submitted">Tercatat</option>
              <option value="verified">Terverifikasi</option>
              <option value="revision_requested">Perlu Revisi</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                <span>Dari:</span>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                <span>Sampai:</span>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              {canReadAllTeamLogs && user && (
                <label className="inline-flex items-center gap-1.5 text-xs text-charcoal cursor-pointer ml-1">
                  <input
                    type="checkbox"
                    checked={onlyMine}
                    onChange={(e) => setOnlyMine(e.target.checked)}
                    className="rounded border-warm-300 text-sage-700"
                  />
                  <span>Hanya catatan saya</span>
                </label>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetAllFilters}
                className="h-8 text-xs text-sage-700"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DPL Review Queue Callout */}
      {canVerifyLogbook && (
        <Card className="border-sage-200 bg-sage-50/60">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sage-700" />
                <span>Antrean Review DPL ({dplPendingCount} menunggu keputusan)</span>
              </div>
              <p className="text-[11px] text-charcoal-muted">
                Tinjau catatan logbook berstatus Tercatat untuk menetapkan Terverifikasi atau Minta Revisi.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'submitted' ? 'default' : 'outline'}
              onClick={() =>
                setStatusFilter((prev) => (prev === 'submitted' ? 'all' : 'submitted'))
              }
              className="text-xs shrink-0"
            >
              {statusFilter === 'submitted'
                ? 'Tampilkan Semua Status'
                : `Filter Antrean Review (${dplPendingCount})`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Activity List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-charcoal">
            {canReadAllTeamLogs ? 'Daftar Logbook Tim & Saya' : 'Riwayat Logbook Saya'}
          </h2>
          <p className="text-[11px] text-charcoal-muted">
            {canReadAllTeamLogs
              ? 'Menampilkan seluruh catatan aktivitas anggota beserta lampiran dan status verifikasi DPL.'
              : 'Menampilkan catatan aktivitas yang Anda buat sendiri. Catatan anggota lain tetap privat.'}
          </p>
        </div>
      </div>

      {/* Activity List / States */}
      {isError ? (
        <Card className="border-rose-200 bg-white">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Logbook Kegiatan
                </h3>
                <p className="text-xs text-charcoal-muted">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan saat membaca database.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs shrink-0">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-dashed border-warm-300 bg-white/80">
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-charcoal">
                {hasActiveFilters
                  ? 'Tidak ada aktivitas yang cocok dengan filter'
                  : 'Belum ada catatan logbook kegiatan'}
              </h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                {hasActiveFilters
                  ? 'Ubah kata kunci pencarian atau rentang tanggal untuk melihat catatan lainnya.'
                  : canWriteOwnLogbook
                    ? 'Mulai catat aktivitas harian KKN Anda beserta foto dokumentasi atau keterkaitan program kerja.'
                    : 'Catatan aktivitas anggota akan muncul di sini setelah mereka mengisi logbook harian.'}
              </p>
            </div>
            {canWriteOwnLogbook && !hasActiveFilters && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingLog(null)
                  setCorrectionTargetLog(null)
                  setFormModalOpen(true)
                }}
                className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buat Catatan Pertama</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const statusMeta = LOGBOOK_STATUS_META[log.verification_status]
            const linkedProg = log.work_program_id
              ? programMap.get(log.work_program_id) ?? null
              : null
            const author = membersById[log.author_id]
            const attachments = attachmentsByLog[log.id] ?? []
            const participants = participantsByLog[log.id] ?? []
            const editable = canModifyLog(log)
            const correctable = canCorrectLog(log)

            return (
              <Card key={log.id} className="border-warm-300 bg-white hover:shadow-subtle transition-shadow">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {LOGBOOK_CATEGORY_LABELS[log.activity_category]}
                        </Badge>
                        <Badge variant={statusMeta.variant} className="text-[10px]">
                          {log.verification_status === 'verified' && (
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                          )}
                          {statusMeta.label}
                        </Badge>
                        {canVerifyLogbook && log.verification_status === 'submitted' && (
                          <Badge variant="warning" className="text-[10px]">
                            Perlu Verifikasi DPL
                          </Badge>
                        )}
                        {log.correction_of_log_id && (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <GitBranch className="h-2.5 w-2.5" />
                            <span>Catatan Koreksi</span>
                          </Badge>
                        )}
                        {linkedProg && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Award className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[200px]">{linkedProg.title}</span>
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-charcoal leading-snug">
                        {log.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailLog(log)}
                        className="h-8 px-2.5 text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </Button>
                      {correctable && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingLog(null)
                            setCorrectionTargetLog(log)
                            setFormModalOpen(true)
                          }}
                          className="h-8 px-2.5 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          <span>Buat Koreksi</span>
                        </Button>
                      )}
                      {editable && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCorrectionTargetLog(null)
                              setEditingLog(log)
                              setFormModalOpen(true)
                            }}
                            className="h-8 px-2 text-xs gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingLog(log)}
                            className="h-8 px-2 text-xs gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                    {log.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-warm-200 text-[11px] text-charcoal-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-sage-700" />
                      {formatLogbookDate(log.log_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3 text-sage-700" />
                      {author?.full_name || 'Anggota KKN'}
                    </span>
                    {log.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-sage-700" />
                        {log.location}
                      </span>
                    )}
                    {log.duration_minutes && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-sage-700" />
                        {formatLogbookDuration(log.duration_minutes)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3 text-sage-700" />
                      {attachments.length} lampiran
                    </span>
                    {participants.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        +{participants.length} rekan terlibat
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit / Correction Modal */}
      <LogbookFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false)
          setEditingLog(null)
          setCorrectionTargetLog(null)
        }}
        editingLog={editingLog}
        correctionOfLog={correctionTargetLog}
        existingAttachments={editingLog ? attachmentsByLog[editingLog.id] ?? [] : []}
        existingParticipants={
          editingLog
            ? participantsByLog[editingLog.id] ?? []
            : correctionTargetLog
              ? participantsByLog[correctionTargetLog.id] ?? []
              : []
        }
        programs={programs}
        members={members}
        currentUserId={user?.id ?? null}
      />

      {/* Detail Modal */}
      <LogbookDetailModal
        log={detailLog}
        onClose={() => setDetailLog(null)}
        attachments={detailLog ? attachmentsByLog[detailLog.id] ?? [] : []}
        participants={detailLog ? participantsByLog[detailLog.id] ?? [] : []}
        reviews={detailLog ? reviewsByLog[detailLog.id] ?? [] : []}
        ancestorLogs={detailChain.ancestors}
        descendantLogs={detailChain.descendants}
        program={
          detailLog?.work_program_id
            ? programMap.get(detailLog.work_program_id) ?? null
            : null
        }
        membersById={membersById}
        canVerify={canVerifyLogbook}
        canCreateCorrection={detailLog ? canCorrectLog(detailLog) : false}
        onCreateCorrection={(target) => {
          setEditingLog(null)
          setCorrectionTargetLog(target)
          setFormModalOpen(true)
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingLog)}
        onClose={() => setDeletingLog(null)}
        onConfirm={() => {
          if (deletingLog) void deleteMutation.mutateAsync(deletingLog)
        }}
        title="Hapus Catatan Logbook?"
        description={
          deletingLog
            ? `Catatan "${deletingLog.title}" pada ${formatLogbookDate(deletingLog.log_date)} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus Catatan"
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}

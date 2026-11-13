import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMeetings,
  fetchMeetingById,
  createMeeting,
  deleteMeeting,
  updateAttendeeAttendance,
  upsertMeetingMinutes,
  addMeetingDecision,
  updateMeetingDecision,
  deleteMeetingDecision,
  addMeetingAgendaItem,
  deleteMeetingAgendaItem,
  type CreateMeetingInput,
  type MeetingDetail,
} from '@/services/meetingsApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  Meeting,
  MeetingStatus,
  MeetingAttendanceStatus,
  MeetingDecisionStatus,
} from '@/types/database'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  Printer,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'

const STATUS_BADGES: Record<
  MeetingStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' }
> = {
  planned: { label: 'Direncanakan', variant: 'warning' },
  in_progress: { label: 'Berlangsung', variant: 'secondary' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

const ATTENDANCE_LABELS: Record<MeetingAttendanceStatus, { label: string; color: string }> = {
  pending: { label: 'Belum Konfirmasi', color: 'bg-warm-200 text-charcoal-muted' },
  present: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  excused: { label: 'Izin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  absent: { label: 'Sakit / Tanpa Keterangan', color: 'bg-red-100 text-red-800 border-red-300' },
}

const DECISION_STATUS_LABELS: Record<
  MeetingDecisionStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' }
> = {
  todo: { label: 'Belum Mulai', variant: 'warning' },
  in_progress: { label: 'Sedang Berjalan', variant: 'secondary' },
  done: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

function formatMeetingDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatMeetingTime(startStr: string, endStr?: string | null): string {
  if (!startStr) return '-'
  const start = new Date(startStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (!endStr) return `${start} WITA`
  const end = new Date(endStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${start} - ${end} WITA`
}

export const MeetingsPage: React.FC = () => {
  const { user, isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const canManage = isSuperAdmin || membership?.role === 'ketua' || membership?.role === 'sekretaris'

  const [activeTab, setActiveTab] = useState<'all' | 'planned' | 'completed' | 'cancelled'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)

  // Query: meetings list
  const {
    data: meetings = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['meetings', activeTab, searchTerm],
    queryFn: () =>
      fetchMeetings({
        status: activeTab,
        search: searchTerm,
      }),
  })

  // Query: active meeting detail
  const { data: meetingDetail, isLoading: isLoadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['meeting-detail', selectedMeetingId],
    queryFn: () => (selectedMeetingId ? fetchMeetingById(selectedMeetingId) : null),
    enabled: Boolean(selectedMeetingId),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      toast({ title: 'Rapat Berhasil Dijadwalkan', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setIsCreateModalOpen(false)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Membuat Rapat', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      toast({ title: 'Rapat Berhasil Dihapus', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setMeetingToDelete(null)
      if (selectedMeetingId === meetingToDelete?.id) {
        setSelectedMeetingId(null)
      }
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menghapus Rapat', description: err.message, variant: 'error' })
    },
  })

  // Filtered stats
  const totalCount = meetings.length
  const upcomingCount = meetings.filter((m) => m.status === 'planned').length
  const completedCount = meetings.filter((m) => m.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-600 text-sage-800 bg-sage-50">
              Operasional KKN
            </Badge>
            <span className="text-xs text-charcoal-muted">Modul Musyawarah &amp; Notulensi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Rapat &amp; Notulensi Kelompok
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Agenda musyawarah tim posko, absensi mandiri, notulensi resmi sekretaris, dan pelacakan tindak lanjut.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
            >
              <Plus className="h-4 w-4" />
              <span>Jadwalkan Rapat</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Total Rapat</p>
              <p className="text-lg font-bold text-charcoal">{totalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Rapat Mendatang</p>
              <p className="text-lg font-bold text-amber-700">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Terlaksana</p>
              <p className="text-lg font-bold text-emerald-700">{completedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Notulensi Sah</p>
              <p className="text-lg font-bold text-sage-800">
                {meetings.filter((m) => m.status === 'completed').length} Dokumen
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-warm-200/60 rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'all' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Semua Rapat
          </button>
          <button
            onClick={() => setActiveTab('planned')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'planned' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Akan Datang
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'completed' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'cancelled' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Arsip / Batal
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-charcoal-muted" />
          <Input
            placeholder="Cari judul rapat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-9 bg-white"
          />
        </div>
      </div>

      {/* Meeting Cards List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : meetings.length === 0 ? (
        <Card className="border-dashed border-warm-300 bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-charcoal-muted">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-charcoal">Belum Ada Agenda Rapat</h3>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                {searchTerm
                  ? 'Tidak ada rapat yang sesuai dengan kata kunci pencarian.'
                  : 'Seluruh jadwal rapat, koordinasi proker, dan notulensi musyawarah akan tampil di sini.'}
              </p>
            </div>
            {canManage && !searchTerm && (
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Jadwalkan Rapat Pertama</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => {
            const badgeMeta = STATUS_BADGES[meeting.status] || STATUS_BADGES.planned
            return (
              <Card
                key={meeting.id}
                className="bg-white hover:border-sage-400 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={badgeMeta.variant} className="text-[10px]">
                      {badgeMeta.label}
                    </Badge>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setMeetingToDelete(meeting)}
                          className="h-6 w-6 text-charcoal-muted hover:text-red-600"
                          title="Hapus Rapat"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <CardTitle className="text-sm font-serif font-semibold text-charcoal line-clamp-1 mt-2">
                    {meeting.title}
                  </CardTitle>
                  {meeting.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {meeting.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="space-y-1.5 text-xs text-charcoal-muted">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                      <span className="truncate">{formatMeetingDate(meeting.meeting_date)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                      <span>{formatMeetingTime(meeting.meeting_date, meeting.end_time)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {meeting.meeting_link ? (
                        <>
                          <Video className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sage-800 underline truncate hover:text-sage-900"
                          >
                            Tautan Online Meet
                          </a>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                          <span className="truncate">{meeting.location || 'Posko KKN'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-warm-200 flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="w-full text-xs gap-1.5 bg-warm-100 hover:bg-sage-600 hover:text-white text-charcoal transition-colors"
                    >
                      <span>Buka Detail &amp; Notulensi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Meeting Detail Modal */}
      {selectedMeetingId && (
        <MeetingDetailModal
          open={Boolean(selectedMeetingId)}
          onClose={() => setSelectedMeetingId(null)}
          meeting={meetingDetail}
          isLoading={isLoadingDetail}
          currentUserId={user?.id}
          canManage={canManage}
          onRefresh={() => {
            refetchDetail()
            refetch()
          }}
        />
      )}

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data)
        }}
        isSubmitting={createMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(meetingToDelete)}
        onClose={() => setMeetingToDelete(null)}
        onConfirm={async () => {
          if (meetingToDelete) {
            await deleteMutation.mutateAsync(meetingToDelete.id)
          }
        }}
        title="Hapus Agenda Rapat?"
        description={`Apakah Anda yakin ingin menghapus rapat "${meetingToDelete?.title}"? Seluruh daftar hadir dan notulensi terkait akan ikut terhapus.`}
        confirmLabel="Hapus Rapat"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// -------------------------------------------------------------
// Meeting Detail Sub-Component with Tabs: Agenda, Absensi, Notulensi, Tindak Lanjut
// -------------------------------------------------------------

interface MeetingDetailModalProps {
  open: boolean
  onClose: () => void
  meeting: MeetingDetail | null | undefined
  isLoading: boolean
  currentUserId?: string
  canManage: boolean
  onRefresh: () => void
}

const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  open,
  onClose,
  meeting,
  isLoading,
  currentUserId,
  canManage,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'info' | 'agenda' | 'absensi' | 'notulensi' | 'tindak_lanjut'>('info')

  // Form states for Agenda
  const [newTopicTitle, setNewTopicTitle] = useState('')

  // Form states for Minutes
  const [isEditingMinutes, setIsEditingMinutes] = useState(false)
  const [minuteStatus, setMinuteStatus] = useState<'draft' | 'published'>('draft')
  const [minuteContent, setMinuteContent] = useState('')
  const [minuteKeyPoints, setMinuteKeyPoints] = useState('')
  const [minuteDiscussions, setMinuteDiscussions] = useState('')
  const [minuteConclusions, setMinuteConclusions] = useState('')

  // Form states for Decision
  const [newDecisionTitle, setNewDecisionTitle] = useState('')
  const [newDecisionText, setNewDecisionText] = useState('')
  const [newDecisionDueDate, setNewDecisionDueDate] = useState('')

  // Load existing minutes when opening
  React.useEffect(() => {
    if (meeting?.minutes) {
      setMinuteStatus(meeting.minutes.status)
      setMinuteContent(meeting.minutes.content || '')
      setMinuteKeyPoints(meeting.minutes.key_points || '')
      setMinuteDiscussions(meeting.minutes.discussion_summary || '')
      setMinuteConclusions(meeting.minutes.conclusions || '')
    } else {
      setMinuteStatus('draft')
      setMinuteContent('')
      setMinuteKeyPoints('')
      setMinuteDiscussions('')
      setMinuteConclusions('')
    }
  }, [meeting])

  if (!open) return null

  const myAttendance = meeting?.attendees?.find((a) => a.user_id === currentUserId)

  const handleSelfAttendance = async (status: MeetingAttendanceStatus) => {
    if (!meeting || !currentUserId) return
    try {
      await updateAttendeeAttendance(meeting.id, currentUserId, status)
      toast({ title: 'Presensi Disimpan', description: `Status kehadiran Anda: ${ATTENDANCE_LABELS[status].label}`, variant: 'success' })
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Gagal Konfirmasi Presensi', description: err.message, variant: 'error' })
    }
  }

  const handleSaveMinutes = async (statusToSet: 'draft' | 'published') => {
    if (!meeting) return
    try {
      await upsertMeetingMinutes(meeting.id, {
        status: statusToSet,
        content: minuteContent,
        key_points: minuteKeyPoints,
        discussion_summary: minuteDiscussions,
        conclusions: minuteConclusions,
      })
      toast({
        title: statusToSet === 'published' ? 'Notulensi Berhasil Diterbitkan' : 'Draft Notulensi Disimpan',
        variant: 'success',
      })
      setIsEditingMinutes(false)
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan Notulensi', description: err.message, variant: 'error' })
    }
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meeting || !newTopicTitle.trim()) return
    try {
      await addMeetingAgendaItem(meeting.id, newTopicTitle)
      setNewTopicTitle('')
      toast({ title: 'Topik Ditambahkan', variant: 'success' })
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Gagal Menambah Topik', description: err.message, variant: 'error' })
    }
  }

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meeting || !newDecisionText.trim()) return
    try {
      await addMeetingDecision(meeting.id, {
        title: newDecisionTitle || undefined,
        decision: newDecisionText,
        due_date: newDecisionDueDate || undefined,
        status: 'todo',
      })
      setNewDecisionTitle('')
      setNewDecisionText('')
      setNewDecisionDueDate('')
      toast({ title: 'Tindak Lanjut Dicatat', variant: 'success' })
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Gagal Mencatat Keputusan', description: err.message, variant: 'error' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidthClass="max-w-4xl" scrollableContent={false}>
      {isLoading || !meeting ? (
        <div className="p-8 space-y-4">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="p-5 border-b border-warm-300 bg-warm-50 flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGES[meeting.status].variant} className="text-[10px]">
                  {STATUS_BADGES[meeting.status].label}
                </Badge>
                <span className="text-xs text-charcoal-muted">
                  {formatMeetingDate(meeting.meeting_date)}
                </span>
              </div>
              <h2 className="text-lg font-serif font-semibold text-charcoal mt-1">
                {meeting.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} className="text-xs gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak / PDF</span>
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-5 border-b border-warm-300 bg-white shrink-0 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-sage-700 text-sage-900'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Informasi Rapat
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'agenda'
                  ? 'border-sage-700 text-sage-900'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Agenda ({meeting.agenda_items?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('absensi')}
              className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'absensi'
                  ? 'border-sage-700 text-sage-900'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Absensi ({meeting.attendees?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('notulensi')}
              className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'notulensi'
                  ? 'border-sage-700 text-sage-900'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Notulensi {meeting.minutes?.status === 'published' ? '(Terbit)' : '(Draft)'}
            </button>
            <button
              onClick={() => setActiveTab('tindak_lanjut')}
              className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'tindak_lanjut'
                  ? 'border-sage-700 text-sage-900'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Tindak Lanjut ({meeting.decisions?.length || 0})
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-warm-100/30">
            {/* TAB: INFO */}
            {activeTab === 'info' && (
              <div className="space-y-4 text-xs">
                <Card className="bg-white">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-charcoal text-sm">Deskripsi Rapat</h3>
                    <p className="text-charcoal-muted whitespace-pre-wrap leading-relaxed">
                      {meeting.description || 'Tidak ada deskripsi tambahan untuk rapat ini.'}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-warm-200 bg-white p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-charcoal-muted uppercase flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-sage-700" />
                      Waktu &amp; Tanggal
                    </span>
                    <p className="text-sm font-semibold text-charcoal">
                      {formatMeetingDate(meeting.meeting_date)}
                    </p>
                    <p className="text-xs text-charcoal-muted">
                      {formatMeetingTime(meeting.meeting_date, meeting.end_time)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-warm-200 bg-white p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-charcoal-muted uppercase flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-sage-700" />
                      Lokasi Pertemuan
                    </span>
                    {meeting.meeting_link ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-charcoal">Pertemuan Daring</p>
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sage-800 underline flex items-center gap-1"
                        >
                          <span>Buka Tautan Online Meet</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-charcoal">
                        {meeting.location || 'Posko Utama KKN Desa Pringgasela Selatan'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Self Attendance Action Card */}
                <Card className="border-sage-300 bg-sage-50/50">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5 text-left w-full sm:w-auto">
                      <p className="font-semibold text-charcoal">Konfirmasi Kehadiran Anda</p>
                      <p className="text-[11px] text-charcoal-muted">
                        Status Anda saat ini:{' '}
                        <span className="font-medium text-sage-900">
                          {myAttendance ? ATTENDANCE_LABELS[myAttendance.attendance_status].label : 'Belum Terdaftar'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant={myAttendance?.attendance_status === 'present' ? 'default' : 'outline'}
                        onClick={() => handleSelfAttendance('present')}
                        className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        Hadir
                      </Button>
                      <Button
                        size="sm"
                        variant={myAttendance?.attendance_status === 'excused' ? 'default' : 'outline'}
                        onClick={() => handleSelfAttendance('excused')}
                        className="text-xs h-8 text-amber-800"
                      >
                        Izin
                      </Button>
                      <Button
                        size="sm"
                        variant={myAttendance?.attendance_status === 'absent' ? 'default' : 'outline'}
                        onClick={() => handleSelfAttendance('absent')}
                        className="text-xs h-8 text-red-800"
                      >
                        Sakit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: AGENDA */}
            {activeTab === 'agenda' && (
              <div className="space-y-4">
                {canManage && (
                  <form onSubmit={handleAddTopic} className="flex gap-2">
                    <Input
                      placeholder="Tambah topik pembahasan baru..."
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <Button type="submit" size="sm" className="bg-sage-700 text-white text-xs shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Tambah Topik
                    </Button>
                  </form>
                )}

                {meeting.agenda_items?.length === 0 ? (
                  <p className="text-xs text-charcoal-muted text-center py-8">Belum ada topik pembahasan terdaftar.</p>
                ) : (
                  <div className="space-y-2">
                    {meeting.agenda_items?.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-warm-200 bg-white text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warm-200 font-semibold text-charcoal">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-charcoal">{item.title}</p>
                            {item.notes && <p className="text-charcoal-muted mt-0.5">{item.notes}</p>}
                          </div>
                        </div>

                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              await deleteMeetingAgendaItem(item.id)
                              onRefresh()
                            }}
                            className="h-6 w-6 text-charcoal-muted hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ABSENSI */}
            {activeTab === 'absensi' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-warm-200">
                  <span className="text-charcoal-muted">
                    Rekap Peserta: {meeting.attendees?.length || 0} Terdaftar
                  </span>
                  <div className="flex gap-2">
                    <span className="text-emerald-700 font-medium">
                      Hadir: {meeting.attendees?.filter((a) => a.attendance_status === 'present').length}
                    </span>
                    <span className="text-amber-700 font-medium">
                      Izin: {meeting.attendees?.filter((a) => a.attendance_status === 'excused').length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {meeting.attendees?.map((att) => (
                    <div
                      key={att.user_id}
                      className="p-3 rounded-lg border border-warm-200 bg-white flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-charcoal">
                          {att.profile?.full_name || 'Anggota Tim'}
                        </p>
                        {att.confirmed_at && (
                          <p className="text-[10px] text-charcoal-muted">
                            Konfirmasi: {new Date(att.confirmed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded border ${ATTENDANCE_LABELS[att.attendance_status].color}`}>
                        {ATTENDANCE_LABELS[att.attendance_status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: NOTULENSI */}
            {activeTab === 'notulensi' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant={minuteStatus === 'published' ? 'success' : 'warning'}>
                    Status: {minuteStatus === 'published' ? 'Diterbitkan Sah' : 'Draft / Konseptual'}
                  </Badge>

                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingMinutes(!isEditingMinutes)}
                      className="text-xs gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>{isEditingMinutes ? 'Tutup Editor' : 'Kelola Notulensi'}</span>
                    </Button>
                  )}
                </div>

                {isEditingMinutes ? (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-warm-200">
                    <div>
                      <label className="font-semibold text-charcoal block mb-1">Poin-Poin Penting Pembahasan</label>
                      <textarea
                        rows={2}
                        value={minuteKeyPoints}
                        onChange={(e) => setMinuteKeyPoints(e.target.value)}
                        placeholder="Contoh: Evaluasi proker digitalisasi, kendala operasional posko..."
                        className="w-full p-2 border border-warm-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-charcoal block mb-1">Ringkasan Diskusi Musyawarah</label>
                      <textarea
                        rows={3}
                        value={minuteDiscussions}
                        onChange={(e) => setMinuteDiscussions(e.target.value)}
                        placeholder="Uraian pendapat anggota dan tanggapan pimpinan rapat..."
                        className="w-full p-2 border border-warm-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-charcoal block mb-1">Kesimpulan Rapat</label>
                      <textarea
                        rows={2}
                        value={minuteConclusions}
                        onChange={(e) => setMinuteConclusions(e.target.value)}
                        placeholder="Kesimpulan akhir yang disepakati..."
                        className="w-full p-2 border border-warm-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-charcoal block mb-1">Isi Dokumen Notulensi Lengkap</label>
                      <textarea
                        rows={5}
                        value={minuteContent}
                        onChange={(e) => setMinuteContent(e.target.value)}
                        placeholder="Teks lengkap notulensi..."
                        className="w-full p-2 border border-warm-300 rounded text-xs font-mono"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveMinutes('draft')}
                        className="text-xs"
                      >
                        Simpan Sebagai Draft
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveMinutes('published')}
                        className="text-xs bg-sage-700 hover:bg-sage-800 text-white"
                      >
                        Terbitkan Notulensi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meeting.minutes ? (
                      <div className="space-y-4">
                        {meeting.minutes.key_points && (
                          <div className="bg-white p-4 rounded-lg border border-warm-200 space-y-1">
                            <h4 className="font-semibold text-charcoal">Poin Penting</h4>
                            <p className="text-charcoal-muted whitespace-pre-wrap">{meeting.minutes.key_points}</p>
                          </div>
                        )}

                        {meeting.minutes.discussion_summary && (
                          <div className="bg-white p-4 rounded-lg border border-warm-200 space-y-1">
                            <h4 className="font-semibold text-charcoal">Ringkasan Diskusi</h4>
                            <p className="text-charcoal-muted whitespace-pre-wrap">{meeting.minutes.discussion_summary}</p>
                          </div>
                        )}

                        {meeting.minutes.conclusions && (
                          <div className="bg-white p-4 rounded-lg border border-warm-200 space-y-1">
                            <h4 className="font-semibold text-charcoal">Kesimpulan Rapat</h4>
                            <p className="text-charcoal-muted whitespace-pre-wrap">{meeting.minutes.conclusions}</p>
                          </div>
                        )}

                        {meeting.minutes.content && (
                          <div className="bg-white p-4 rounded-lg border border-warm-200 space-y-1">
                            <h4 className="font-semibold text-charcoal">Isi Notulensi Lengkap</h4>
                            <p className="text-charcoal-muted whitespace-pre-wrap font-sans">{meeting.minutes.content}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal-muted text-center py-8">
                        Notulensi belum disusun oleh Sekretaris.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: TINDAK LANJUT */}
            {activeTab === 'tindak_lanjut' && (
              <div className="space-y-4 text-xs">
                {canManage && (
                  <form onSubmit={handleAddDecision} className="bg-white p-4 rounded-lg border border-warm-200 space-y-3">
                    <h4 className="font-semibold text-charcoal">Tambah Butir Keputusan / Action Item</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Judul Tindak Lanjut..."
                        value={newDecisionTitle}
                        onChange={(e) => setNewDecisionTitle(e.target.value)}
                        className="text-xs"
                      />
                      <Input
                        type="date"
                        value={newDecisionDueDate}
                        onChange={(e) => setNewDecisionDueDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Uraian keputusan dan aksi yang harus dilakukan..."
                      value={newDecisionText}
                      onChange={(e) => setNewDecisionText(e.target.value)}
                      className="w-full p-2 border border-warm-300 rounded text-xs"
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="bg-sage-700 text-white text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Simpan Tindak Lanjut
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {meeting.decisions?.length === 0 ? (
                    <p className="text-xs text-charcoal-muted text-center py-8">Belum ada keputusan atau tindak lanjut yang dicatat.</p>
                  ) : (
                    meeting.decisions?.map((dec) => {
                      const decMeta = DECISION_STATUS_LABELS[dec.status] || DECISION_STATUS_LABELS.todo
                      return (
                        <div key={dec.id} className="p-3 rounded-lg border border-warm-200 bg-white space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-charcoal">{dec.title || 'Action Item'}</p>
                              <p className="text-charcoal-muted mt-0.5">{dec.decision}</p>
                            </div>
                            <Badge variant={decMeta.variant} className="text-[10px]">
                              {decMeta.label}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-2 border-t border-warm-100">
                            <span>Tenggat: {dec.due_date ? formatMeetingDate(dec.due_date) : 'Tidak ada'}</span>

                            {canManage && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    const nextStatus: MeetingDecisionStatus =
                                      dec.status === 'todo' ? 'in_progress' : dec.status === 'in_progress' ? 'done' : 'todo'
                                    await updateMeetingDecision(dec.id, { status: nextStatus })
                                    onRefresh()
                                  }}
                                  className="h-6 text-[10px] text-sage-800"
                                >
                                  Ubah Status
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={async () => {
                                    await deleteMeetingDecision(dec.id)
                                    onRefresh()
                                  }}
                                  className="h-6 w-6 text-charcoal-muted hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// -------------------------------------------------------------
// Create Meeting Modal
// -------------------------------------------------------------

interface CreateMeetingModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateMeetingInput) => Promise<void>
  isSubmitting: boolean
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [startTime, setStartTime] = useState('19:30')
  const [endTime, setEndTime] = useState('21:00')
  const [location, setLocation] = useState('Posko Utama KKN')
  const [meetingLink, setMeetingLink] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !meetingDate) return

    const startDateTime = new Date(`${meetingDate}T${startTime}:00`).toISOString()
    const endDateTime = endTime ? new Date(`${meetingDate}T${endTime}:00`).toISOString() : undefined

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      meeting_date: startDateTime,
      end_time: endDateTime,
      location: location.trim() || undefined,
      meeting_link: meetingLink.trim() || undefined,
      status: 'planned',
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Jadwalkan Rapat Kelompok Baru">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-charcoal block mb-1">Judul Rapat *</label>
          <Input
            placeholder="Contoh: Rapat Evaluasi Mingguan & Pembagian Proker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi &amp; Tujuan</label>
          <textarea
            rows={2}
            placeholder="Tujuan musyawarah kelompok..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tanggal *</label>
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jam Mulai</label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jam Selesai</label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Lokasi Pertemuan</label>
            <Input
              placeholder="Posko KKN / Ruang Pertemuan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tautan Online (Opsional)</label>
            <Input
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-sage-700 hover:bg-sage-800 text-white"
          >
            {isSubmitting ? 'Menyimpan...' : 'Jadwalkan Rapat'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

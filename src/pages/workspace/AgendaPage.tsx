import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchWorkspaceMembers,
  getLocalDateKey,
} from '@/services/dashboardApi'
import {
  calendarEventFormSchema,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
  type CalendarEventFormInput,
} from '@/services/agendaApi'
import type { CalendarEvent, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
} from 'lucide-react'

function toDateInputValue(iso: string): string {
  return getLocalDateKey(new Date(iso))
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatEventDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatEventTimeSpan(startIso: string, endIso: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  return `${s.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${e.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export const AgendaPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const [filterTab, setFilterTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'calendar-events'],
    queryFn: fetchCalendarEvents,
    staleTime: 30_000,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: fetchWorkspaceMembers,
    staleTime: 60_000,
  })

  const memberMap = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary>()
    for (const m of members) map.set(m.user_id, m)
    return map
  }, [members])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CalendarEventFormInput>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      eventDate: getLocalDateKey(),
      startTime: '09:00',
      endTime: '11:00',
    },
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editingEvent) {
      reset({
        title: editingEvent.title,
        description: editingEvent.description ?? '',
        eventDate: toDateInputValue(editingEvent.start_at),
        startTime: toTimeInputValue(editingEvent.start_at),
        endTime: toTimeInputValue(editingEvent.end_at),
      })
    } else {
      reset({
        title: '',
        description: '',
        eventDate: getLocalDateKey(),
        startTime: '09:00',
        endTime: '11:00',
      })
    }
  }, [modalOpen, editingEvent, reset])

  const invalidateAgendaQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: async () => {
      await invalidateAgendaQueries()
      toast({
        title: 'Agenda Ditambahkan',
        description: 'Kegiatan baru telah dicatat ke kalender posko.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CalendarEventFormInput }) =>
      updateCalendarEvent(id, values),
    onSuccess: async () => {
      await invalidateAgendaQueries()
      toast({
        title: 'Agenda Diperbarui',
        description: 'Perubahan jadwal kegiatan berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: async () => {
      setDeletingEvent(null)
      await invalidateAgendaQueries()
      toast({
        title: 'Agenda Dihapus',
        description: 'Agenda kegiatan telah dihapus dari kalender.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Agenda',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const canManageEvent = (ev: CalendarEvent) => {
    if (
      isSuperAdmin ||
      membership?.role === 'ketua' ||
      membership?.role === 'sekretaris'
    ) {
      return true
    }
    return Boolean(user?.id && ev.created_by === user.id)
  }

  const handleCloseModal = () => {
    setFormError(null)
    setModalOpen(false)
    setEditingEvent(null)
  }

  const onSubmit = async (values: CalendarEventFormInput) => {
    setFormError(null)
    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      handleCloseModal()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan agenda kegiatan.'
      )
    }
  }

  const [todayKey] = useState(() => getLocalDateKey())

  const filteredEvents = useMemo(() => {
    const todayStartMs = new Date(`${todayKey}T00:00:00`).getTime()
    const query = searchTerm.trim().toLowerCase()

    const list = events.filter((ev) => {
      const endMs = new Date(ev.end_at).getTime()
      if (filterTab === 'upcoming' && endMs < todayStartMs) return false
      if (filterTab === 'past' && endMs >= todayStartMs) return false
      if (query) {
        const hay = `${ev.title} ${ev.description ?? ''}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })

    if (filterTab === 'past') {
      return [...list].sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      )
    }
    return list
  }, [events, filterTab, searchTerm, todayKey])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>()
    for (const ev of filteredEvents) {
      const key = getLocalDateKey(new Date(ev.start_at))
      const bucket = groups.get(key) ?? []
      bucket.push(ev)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries())
  }, [filteredEvents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Agenda &amp; Jadwal Kegiatan Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Kelola jadwal kegiatan desa, rapat warga, dan kunjungan lapangan kelompok KKN.
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
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setFormError(null)
              setEditingEvent(null)
              setModalOpen(true)
            }}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Agenda</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-warm-300 bg-warm-50 p-1 self-start">
          {(
            [
              { id: 'upcoming', label: 'Mendatang' },
              { id: 'past', label: 'Riwayat Lampau' },
              { id: 'all', label: 'Semua Agenda' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterTab === tab.id
                  ? 'bg-sage-600 text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul atau detail kegiatan..."
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <Card key={idx}>
              <CardContent className="p-5 space-y-2.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-80" />
                <Skeleton className="h-3 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Agenda
                </p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : groupedByDate.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <Calendar className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              {searchTerm
                ? 'Tidak ada agenda yang cocok dengan pencarian'
                : filterTab === 'upcoming'
                ? 'Belum ada agenda kegiatan mendatang'
                : 'Belum ada riwayat agenda tercatat'}
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Seluruh anggota aktif KKN dapat mengusulkan dan mencatat agenda kegiatan melalui tombol Tambah Agenda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  {formatEventDateLabel(items[0].start_at)}
                </h2>
                {dateKey === todayKey && (
                  <Badge variant="success" className="text-[10px]">
                    Hari Ini
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {items.map((ev) => {
                  const creator = memberMap.get(ev.created_by)
                  const manageable = canManageEvent(ev)

                  return (
                    <Card key={ev.id} className="hover:border-sage-300 transition-colors">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-800">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h3 className="text-sm font-semibold text-charcoal">
                              {ev.title}
                            </h3>
                            {ev.description && (
                              <p className="text-xs text-charcoal-muted whitespace-pre-line">
                                {ev.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-charcoal-muted">
                              <span className="inline-flex items-center gap-1 text-sage-800 font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                {formatEventTimeSpan(ev.start_at, ev.end_at)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                Dibuat oleh {creator?.full_name || 'Pengurus / Admin'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {manageable && (
                          <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setFormError(null)
                                setEditingEvent(ev)
                                setModalOpen(true)
                              }}
                              className="h-8 px-2.5 text-xs gap-1"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingEvent(ev)}
                              className="h-8 px-2.5 text-xs gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus</span>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingEvent ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Kegiatan'}
        description="Jadwal yang disimpan akan tampil di Kalender Posko dan ringkasan Dashboard."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="event-title" className="text-xs font-medium text-charcoal block">
              Judul Kegiatan <span className="text-red-500">*</span>
            </label>
            <Input
              id="event-title"
              placeholder="Misal: Sosialisasi Posyandu Dusun Krajan"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="event-date" className="text-xs font-medium text-charcoal block">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <Input id="event-date" type="date" {...register('eventDate')} />
              {errors.eventDate && (
                <p className="text-[11px] text-red-600">{errors.eventDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="event-start" className="text-xs font-medium text-charcoal block">
                Jam Mulai <span className="text-red-500">*</span>
              </label>
              <Input id="event-start" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-[11px] text-red-600">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="event-end" className="text-xs font-medium text-charcoal block">
                Jam Selesai <span className="text-red-500">*</span>
              </label>
              <Input id="event-end" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-[11px] text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="event-desc" className="text-xs font-medium text-charcoal block">
              Lokasi / Catatan Tambahan
            </label>
            <textarea
              id="event-desc"
              rows={3}
              placeholder="Balai desa, daftar perlengkapan, atau pihak yang terlibat..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-[11px] text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button type="button" variant="ghost" size="sm" onClick={handleCloseModal}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-1.5"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>{editingEvent ? 'Simpan Perubahan' : 'Simpan Agenda'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={() => {
          if (deletingEvent) deleteMutation.mutate(deletingEvent.id)
        }}
        title="Hapus Agenda Kegiatan?"
        description={
          deletingEvent
            ? `Agenda "${deletingEvent.title}" akan dihapus dari kalender posko.`
            : ''
        }
        confirmLabel="Hapus Agenda"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

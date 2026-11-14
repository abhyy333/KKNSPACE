import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { supabase } from '@/lib/supabase'
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
  AGENDA_CATEGORIES,
  AGENDA_DIVISIONS,
  type CalendarEventFormInput,
  type AgendaStepInput,
} from '@/services/agendaApi'
import type { CalendarEvent, WorkspaceMemberSummary } from '@/types/database'
import { AiAgendaAssistantModal } from '@/components/agenda/AiAgendaAssistantModal'
import { AgendaDetailModal } from '@/components/agenda/AgendaDetailModal'
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit3,
  Globe,
  Lock,
  Archive,
  Loader2,
  Milestone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  MapPin,
  CheckSquare,
  ListOrdered,
  ChevronRight,
  Filter,
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
  })} WITA`
}

export const AgendaPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const [filterTab, setFilterTab] = useState<
    'upcoming' | 'past' | 'published' | 'archived' | 'all'
  >('upcoming')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Step and equipment draft state for form
  const [formSteps, setFormSteps] = useState<AgendaStepInput[]>([])
  const [formEquipment, setFormEquipment] = useState<string[]>([])
  const [newEquipInput, setNewEquipInput] = useState('')
  const hasAiDraftRef = useRef(false)

  const isLeaderOrAdmin =
    isSuperAdmin || membership?.role === 'ketua' || membership?.role === 'sekretaris'

  // Fetch Calendar Events
  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'calendar-events'],
    queryFn: () => fetchCalendarEvents({ includeArchived: true }),
    staleTime: 30_000,
  })

  // Fetch Team Members
  const { data: members = [] } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: fetchWorkspaceMembers,
    staleTime: 60_000,
  })

  // Fetch Work Programs for Linkage
  const { data: workPrograms = [] } = useQuery({
    queryKey: ['workspace', 'work-programs-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_programs')
        .select('id, title')
        .order('title')
      return data ?? []
    },
    staleTime: 120_000,
  })

  // Fetch Timeline Stages for Linkage
  const { data: timelineStages = [] } = useQuery({
    queryKey: ['workspace', 'timeline-stages-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('kkn_timeline_stages')
        .select('id, title, stage_number')
        .order('stage_number')
      return data ?? []
    },
    staleTime: 120_000,
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<CalendarEventFormInput>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      eventDate: getLocalDateKey(),
      startTime: '09:00',
      endTime: '11:00',
      location: 'Posko KKN Desa Pringgasela Selatan',
      category: 'Umum',
      picId: user?.id || null,
      responsibleDivision: (membership?.division as string) || 'Acara',
      targetAudience: '',
      targetOutput: '',
      equipmentNeeded: [],
      publicationStatus: 'internal',
      executionStatus: 'not_started',
      relatedProgramId: null,
      relatedTimelineStageId: null,
      steps: [],
    },
  })

  // Synchronize form on open
  useEffect(() => {
    if (!modalOpen) return

    if (hasAiDraftRef.current) {
      hasAiDraftRef.current = false
      return
    }

    if (editingEvent) {
      const equip = Array.isArray(editingEvent.equipment_needed)
        ? editingEvent.equipment_needed
        : []
      const steps = Array.isArray(editingEvent.steps)
        ? editingEvent.steps.map((st) => ({
            id: st.id,
            title: st.title,
            description: st.description ?? '',
            order_index: st.order_index,
            completion_status: st.completion_status,
            actual_notes: st.actual_notes ?? '',
          }))
        : []

      setFormEquipment(equip)
      setFormSteps(steps)

      reset({
        title: editingEvent.title,
        description: editingEvent.description ?? '',
        eventDate: toDateInputValue(editingEvent.start_at),
        startTime: toTimeInputValue(editingEvent.start_at),
        endTime: toTimeInputValue(editingEvent.end_at),
        location: editingEvent.location || 'Posko KKN Desa Pringgasela Selatan',
        category: editingEvent.category || 'Umum',
        picId: editingEvent.pic_id || editingEvent.created_by,
        responsibleDivision: editingEvent.responsible_division || 'Acara',
        targetAudience: editingEvent.target_audience || '',
        targetOutput: editingEvent.target_output || '',
        equipmentNeeded: equip,
        publicationStatus: editingEvent.publication_status || 'internal',
        executionStatus: editingEvent.execution_status || 'not_started',
        relatedProgramId: editingEvent.related_program_id || null,
        relatedTimelineStageId: editingEvent.related_timeline_stage_id || null,
        steps: steps,
      })
    } else {
      setFormEquipment([])
      setFormSteps([])
      reset({
        title: '',
        description: '',
        eventDate: getLocalDateKey(),
        startTime: '09:00',
        endTime: '11:00',
        location: 'Posko KKN Desa Pringgasela Selatan',
        category: 'Umum',
        picId: user?.id || null,
        responsibleDivision: (membership?.division as string) || 'Acara',
        targetAudience: '',
        targetOutput: '',
        equipmentNeeded: [],
        publicationStatus: 'internal',
        executionStatus: 'not_started',
        relatedProgramId: null,
        relatedTimelineStageId: null,
        steps: [],
      })
    }
  }, [modalOpen, editingEvent, reset, user?.id, membership?.division])

  const invalidateAgendaQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-detail'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: async () => {
      await invalidateAgendaQueries()
      toast({
        title: 'Agenda Berhasil Disimpan',
        description: 'Kegiatan dan tahapan operasional dicatat ke kalender.',
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
        title: 'Agenda Berhasil Diperbarui',
        description: 'Perubahan agenda dan tahapan operasional telah disimpan.',
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
        description: 'Agenda kegiatan telah dihapus dari kalender posko.',
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menghapus Agenda',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const canManageEvent = (ev: CalendarEvent) => {
    if (isLeaderOrAdmin) return true
    if (user?.id && (ev.created_by === user.id || ev.pic_id === user.id)) return true
    if (membership?.division && ev.responsible_division === membership.division) return true
    return false
  }

  const handleCloseModal = () => {
    setFormError(null)
    setModalOpen(false)
    setEditingEvent(null)
  }

  const handleApplyAiData = (data: {
    title: string
    category: string
    description: string
    location: string
    responsibleDivision: string
    targetAudience: string
    targetOutput: string
    equipmentNeeded: string[]
    steps: {
      order_index: number
      title: string
      description: string
      completion_status: boolean
    }[]
  }) => {
    setValue('title', data.title)
    setValue('category', data.category)
    setValue('description', data.description)
    setValue('location', data.location)
    setValue('responsibleDivision', data.responsibleDivision)
    setValue('targetAudience', data.targetAudience)
    setValue('targetOutput', data.targetOutput)
    setValue('equipmentNeeded', data.equipmentNeeded)
    setValue('steps', data.steps)

    setFormEquipment(data.equipmentNeeded)
    setFormSteps(data.steps)

    hasAiDraftRef.current = true
    // Open form modal to let user inspect and save
    setModalOpen(true)

    toast({
      title: 'Rencana AI Diterapkan',
      description: 'Silakan tinjau tanggal, jam, dan rincian sebelum menyimpan agenda.',
      variant: 'success',
    })
  }

  const onSubmit = async (values: CalendarEventFormInput) => {
    setFormError(null)
    try {
      const payload: CalendarEventFormInput = {
        ...values,
        equipmentNeeded: formEquipment,
        steps: formSteps,
      }

      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, values: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      handleCloseModal()
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan agenda kegiatan.')
    }
  }

  // Equipment tag handling
  const addEquipTag = () => {
    const val = newEquipInput.trim()
    if (!val) return
    if (!formEquipment.includes(val)) {
      const updated = [...formEquipment, val]
      setFormEquipment(updated)
      setValue('equipmentNeeded', updated)
    }
    setNewEquipInput('')
  }

  const removeEquipTag = (idx: number) => {
    const updated = formEquipment.filter((_, i) => i !== idx)
    setFormEquipment(updated)
    setValue('equipmentNeeded', updated)
  }

  // Step item handling in form
  const addFormStep = () => {
    const nextIdx = formSteps.length + 1
    const updated = [
      ...formSteps,
      {
        order_index: nextIdx,
        title: `Tahapan ${nextIdx}`,
        description: '',
        completion_status: false,
      },
    ]
    setFormSteps(updated)
    setValue('steps', updated)
  }

  const removeFormStep = (idx: number) => {
    const updated = formSteps
      .filter((_, i) => i !== idx)
      .map((st, i) => ({ ...st, order_index: i + 1 }))
    setFormSteps(updated)
    setValue('steps', updated)
  }

  const updateFormStepField = (
    idx: number,
    field: 'title' | 'description',
    value: string
  ) => {
    const updated = [...formSteps]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormSteps(updated)
    setValue('steps', updated)
  }

  const [todayKey] = useState(() => getLocalDateKey())

  // Filter & Search Logic
  const filteredEvents = useMemo(() => {
    const todayStartMs = new Date(`${todayKey}T00:00:00`).getTime()
    const query = searchTerm.trim().toLowerCase()

    const list = events.filter((ev) => {
      // Publication status filter tab
      if (filterTab === 'published' && ev.publication_status !== 'published') return false
      if (filterTab === 'archived' && ev.publication_status !== 'archived') return false

      // Temporal filter tabs
      const endMs = new Date(ev.end_at).getTime()
      if (filterTab === 'upcoming' && endMs < todayStartMs) return false
      if (filterTab === 'past' && endMs >= todayStartMs) return false

      // Category filter
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false

      // Division filter
      if (selectedDivision !== 'all' && ev.responsible_division !== selectedDivision) return false

      // Search term
      if (query) {
        const hay = `${ev.title} ${ev.description ?? ''} ${ev.location ?? ''} ${
          ev.responsible_division ?? ''
        } ${ev.category ?? ''}`.toLowerCase()
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
  }, [events, filterTab, selectedCategory, selectedDivision, searchTerm, todayKey])

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
              Agenda &amp; Jadwal Kegiatan Posko
            </h1>
            <Badge variant="outline" className="border-forest text-forest bg-forest/5 text-xs font-medium">
              AI Co-Pilot Aktif
            </Badge>
          </div>
          <p className="text-xs text-charcoal-muted mt-1">
            Rencanakan agenda kegiatan KKN, integrasikan tahapan checklist lapangan, dan pantau realisasi kelompok secara terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary: Tambah Agenda Manual */}
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setFormError(null)
              setEditingEvent(null)
              setModalOpen(true)
            }}
            className="h-9 px-3.5 text-xs gap-1.5 bg-forest hover:bg-forest/90 text-white font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Tambah Agenda Manual</span>
          </Button>

          {/* Secondary: AI Agenda Assistant */}
          <Button
            size="sm"
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="h-9 px-3 text-xs gap-1.5 bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 font-semibold shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
            <span>AI Agenda Assistant</span>
          </Button>

          {/* Tertiary: Roadmap KKN */}
          <Link to="/timeline-kkn" target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs gap-1.5 border-warm-300 bg-white text-charcoal hover:bg-warm-100 hover:text-charcoal shadow-2xs"
            >
              <Milestone className="h-3.5 w-3.5 text-forest" />
              <span>Roadmap KKN</span>
            </Button>
          </Link>

          {/* Tertiary: Segarkan */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 border-warm-300 bg-white text-charcoal hover:bg-warm-100 hover:text-charcoal shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-warm-300 bg-warm-50 p-1 self-start flex-wrap">
            {(
              [
                { id: 'upcoming', label: 'Mendatang' },
                { id: 'past', label: 'Riwayat Lampau' },
                { id: 'published', label: 'Terpublikasi' },
                { id: 'archived', label: 'Arsip' },
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

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul, lokasi, atau deskripsi kegiatan..."
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {/* Category & Division Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-charcoal-muted font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Kategori:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-warm-300 bg-white px-2.5 py-1 text-xs text-charcoal focus:border-forest focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            {AGENDA_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <span className="text-warm-300">|</span>

          <span className="text-charcoal-muted font-medium">Divisi:</span>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="rounded-md border border-warm-300 bg-white px-2.5 py-1 text-xs text-charcoal focus:border-forest focus:outline-none"
          >
            <option value="all">Semua Divisi</option>
            {AGENDA_DIVISIONS.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Listing */}
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
                  {error instanceof Error ? error.message : 'Terjadi kesalahan sistem.'}
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
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-charcoal">
              {searchTerm || selectedCategory !== 'all' || selectedDivision !== 'all'
                ? 'Tidak ada agenda yang cocok dengan kriteria filter'
                : filterTab === 'upcoming'
                ? 'Belum ada agenda kegiatan mendatang'
                : 'Belum ada riwayat agenda tercatat'}
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Gunakan fitur <strong>AI Agenda Assistant</strong> untuk merancang agenda kegiatan desa yang terstruktur, lengkap dengan rincian tahapan checklist.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setAiModalOpen(true)}
                className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Buka AI Agenda Assistant</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
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
                  const pic = ev.pic_id ? memberMap.get(ev.pic_id) : null
                  const manageable = canManageEvent(ev)

                  const steps = ev.steps || []
                  const totalSteps = steps.length
                  const doneSteps = steps.filter((s) => s.completion_status).length
                  const stepPercent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

                  return (
                    <Card
                      key={ev.id}
                      className="hover:border-sage-300 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                      onClick={() => setSelectedDetailId(ev.id)}
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Calendar Icon Badge */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-800 group-hover:bg-forest group-hover:text-white transition-colors">
                            <Calendar className="h-5 w-5" />
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            {/* Badges line */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="border-forest text-forest bg-forest/5 text-[10px] font-semibold">
                                {ev.category || 'Umum'}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {ev.responsible_division || 'Acara'}
                              </Badge>

                              {ev.publication_status === 'published' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-medium text-emerald-800">
                                  <Globe className="h-2.5 w-2.5" />
                                  Publik
                                </span>
                              ) : ev.publication_status === 'archived' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.2 text-[10px] font-medium text-gray-700">
                                  <Archive className="h-2.5 w-2.5" />
                                  Arsip
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-medium text-blue-800">
                                  <Lock className="h-2.5 w-2.5" />
                                  Internal
                                </span>
                              )}

                              {ev.execution_status === 'completed' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.2 text-[10px] font-medium border border-emerald-200">
                                  Selesai
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-semibold text-charcoal group-hover:text-forest transition-colors">
                              {ev.title}
                            </h3>

                            {ev.description && (
                              <p className="text-xs text-charcoal-muted line-clamp-2">
                                {ev.description}
                              </p>
                            )}

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-charcoal-muted">
                              <span className="inline-flex items-center gap-1 text-forest font-medium">
                                <Clock className="h-3 w-3" />
                                {formatEventTimeSpan(ev.start_at, ev.end_at)}
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-forest" />
                                {ev.location || 'Posko KKN'}
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                PIC: <strong className="text-charcoal">{pic?.full_name || creator?.full_name || 'Tim KKN'}</strong>
                              </span>
                            </div>

                            {/* Checklist Progress Bar inside card */}
                            {totalSteps > 0 && (
                              <div className="pt-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-charcoal-muted flex items-center gap-1">
                                    <CheckSquare className="h-3 w-3 text-forest" />
                                    Tahapan: {doneSteps} dari {totalSteps} selesai
                                  </span>
                                  <span className="font-semibold text-forest">
                                    {stepPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-warm-200 overflow-hidden">
                                  <div
                                    className="h-full bg-forest rounded-full transition-all duration-300"
                                    style={{ width: `${stepPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div
                          className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-2 sm:pt-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDetailId(ev.id)}
                            className="h-8 px-2.5 text-xs text-forest gap-1 hover:bg-sage-100"
                          >
                            <span>Detail</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>

                          {manageable && (
                            <>
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
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Agenda */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingEvent ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Kegiatan'}
        description="Lengkapi informasi agenda kegiatan posko, pembagian tugas divisi, dan rincian tahapan lapangan."
        maxWidthClass="max-w-2xl"
        scrollableContent={false}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* AI Assistance Header Banner inside form */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50/90 p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-forest">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950">Gunakan AI Agenda Assistant</p>
                  <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                    Bantu susun judul, deskripsi operasional, sasaran, dan checklist tahapan secara otomatis.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setAiModalOpen(true)
                }}
                className="shrink-0 h-8 px-3 text-xs bg-forest hover:bg-forest/90 text-white font-semibold gap-1.5 shadow-xs"
              >
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Buka Asisten</span>
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="event-title" className="text-xs font-medium text-charcoal block">
                Judul Kegiatan <span className="text-red-500">*</span>
              </label>
              <Input
                id="event-title"
                placeholder="Misal: Sosialisasi Pencegahan Stunting Balita Dusun Krajan"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-[11px] text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Category & Division */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-category" className="text-xs font-medium text-charcoal block">
                  Kategori Kegiatan <span className="text-red-500">*</span>
                </label>
                <select
                  id="event-category"
                  {...register('category')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  {AGENDA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-division" className="text-xs font-medium text-charcoal block">
                  Divisi Penanggung Jawab <span className="text-red-500">*</span>
                </label>
                <select
                  id="event-division"
                  {...register('responsibleDivision')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  {AGENDA_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PIC & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-pic" className="text-xs font-medium text-charcoal block">
                  Penanggung Jawab (PIC)
                </label>
                <select
                  id="event-pic"
                  {...register('picId')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  <option value="">Pilih Anggota Tim</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name} ({m.role || 'Anggota'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-location" className="text-xs font-medium text-charcoal block">
                  Lokasi Kegiatan
                </label>
                <Input
                  id="event-location"
                  placeholder="Misal: Kantor Desa Pringgasela Selatan"
                  {...register('location')}
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-date" className="text-xs font-medium text-charcoal block">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <Input id="event-date" type="date" {...register('eventDate')} />
                {errors.eventDate && (
                  <p className="text-[11px] text-red-600">{errors.eventDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-start" className="text-xs font-medium text-charcoal block">
                  Jam Mulai <span className="text-red-500">*</span>
                </label>
                <Input id="event-start" type="time" {...register('startTime')} />
                {errors.startTime && (
                  <p className="text-[11px] text-red-600">{errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-end" className="text-xs font-medium text-charcoal block">
                  Jam Selesai <span className="text-red-500">*</span>
                </label>
                <Input id="event-end" type="time" {...register('endTime')} />
                {errors.endTime && (
                  <p className="text-[11px] text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="event-desc" className="text-xs font-medium text-charcoal block">
                Deskripsi Operasional Kegiatan
              </label>
              <textarea
                id="event-desc"
                rows={3}
                placeholder="Rincian latar belakang, tujuan, dan metode pelaksanaan kegiatan..."
                className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-[11px] text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Target Audience & Target Output */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-audience" className="text-xs font-medium text-charcoal block">
                  Target Sasaran Warga
                </label>
                <Input
                  id="event-audience"
                  placeholder="Misal: Kader posyandu dan ibu balita"
                  {...register('targetAudience')}
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-output" className="text-xs font-medium text-charcoal block">
                  Target Capaian (Output Terukur)
                </label>
                <Input
                  id="event-output"
                  placeholder="Misal: Peningkatan pemahaman gizi dan data balita"
                  {...register('targetOutput')}
                />
              </div>
            </div>

            {/* Logistics & Equipment Needed */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-charcoal block">
                Kebutuhan Perlengkapan / Logistik
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {formEquipment.map((eq, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2.5 py-0.5 text-xs text-charcoal"
                  >
                    <span>{eq}</span>
                    <button
                      type="button"
                      onClick={() => removeEquipTag(i)}
                      className="text-charcoal-muted hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newEquipInput}
                  onChange={(e) => setNewEquipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addEquipTag()
                    }
                  }}
                  placeholder="Tambah perlengkapan, misal: Proyektor, ATK..."
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEquipTag}
                  className="h-8 px-3 text-xs shrink-0"
                >
                  Tambah
                </Button>
              </div>
            </div>

            {/* Integration Links (Program Kerja & Timeline) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 pt-1 border-t border-warm-200">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-prog" className="text-xs font-medium text-charcoal block">
                  Tautkan Program Kerja (Opsional)
                </label>
                <select
                  id="event-prog"
                  {...register('relatedProgramId')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  <option value="">Tidak ditautkan</option>
                  {workPrograms.map((wp: any) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label htmlFor="event-stage" className="text-xs font-medium text-charcoal block">
                  Tautkan Tahapan Roadmap (Opsional)
                </label>
                <select
                  id="event-stage"
                  {...register('relatedTimelineStageId')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  <option value="">Tidak ditautkan</option>
                  {timelineStages.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      Tahap {st.stage_number}: {st.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Publication status (only if admin or ketua/sekretaris) */}
            {isLeaderOrAdmin && (
              <div className="space-y-1.5 pt-1 border-t border-warm-200">
                <label htmlFor="event-pub" className="text-xs font-medium text-charcoal block">
                  Status Publikasi Agenda
                </label>
                <select
                  id="event-pub"
                  {...register('publicationStatus')}
                  className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
                >
                  <option value="internal">Internal Tim KKN (Hanya terlihat anggota)</option>
                  <option value="published">Publik (Tampil di portal & kalender publik)</option>
                  <option value="draft">Draf Rancangan</option>
                  <option value="archived">Arsip</option>
                </select>
              </div>
            )}

            {/* Steps Checklist in Form */}
            <div className="space-y-2.5 pt-2 border-t border-warm-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4 text-forest" />
                  <span>Rancangan Tahapan Pelaksanaan ({formSteps.length} Langkah):</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addFormStep}
                  className="h-7 px-2 text-xs text-forest gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah Langkah</span>
                </Button>
              </div>

              {formSteps.length === 0 ? (
                <p className="text-[11px] text-charcoal-muted italic">
                  Belum ada rincian tahapan. Klik tombol Tambah Langkah atau gunakan AI Assistant untuk menyusun tahapan otomatis.
                </p>
              ) : (
                <div className="space-y-2">
                  {formSteps.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-warm-200 bg-warm-50/70 p-2.5 text-xs"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-1 min-w-0">
                        <Input
                          value={st.title}
                          onChange={(e) => updateFormStepField(i, 'title', e.target.value)}
                          placeholder={`Judul tahapan ${i + 1}...`}
                          className="h-7 text-xs bg-white font-medium"
                        />
                        <textarea
                          value={st.description || ''}
                          onChange={(e) => updateFormStepField(i, 'description', e.target.value)}
                          placeholder="Deskripsi langkah kegiatan (opsional)..."
                          rows={1}
                          className="w-full rounded border border-warm-300 bg-white px-2 py-1 text-[11px] text-charcoal focus:border-forest focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFormStep(i)}
                        className="p-1 text-charcoal-muted hover:text-red-600 transition-colors shrink-0"
                        title="Hapus langkah"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseModal}
              className="h-9 px-3.5 text-xs text-charcoal hover:bg-warm-100"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-9 px-4 text-xs gap-1.5 bg-forest hover:bg-forest/90 text-white font-semibold shadow-xs"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>{editingEvent ? 'Simpan Perubahan' : 'Simpan Agenda'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Agenda Assistant Modal */}
      <AiAgendaAssistantModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        currentFormValues={watch()}
        onApplyToForm={handleApplyAiData}
      />

      {/* Comprehensive Agenda Detail & Execution Modal */}
      <AgendaDetailModal
        agendaId={selectedDetailId}
        open={Boolean(selectedDetailId)}
        onClose={() => setSelectedDetailId(null)}
        onEdit={(ev) => {
          setSelectedDetailId(null)
          setEditingEvent(ev)
          setModalOpen(true)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={() => {
          if (deletingEvent) deleteMutation.mutate(deletingEvent.id)
        }}
        title="Hapus Agenda Kegiatan?"
        description={
          deletingEvent
            ? `Agenda "${deletingEvent.title}" dan seluruh tahapan terkait akan dihapus dari kalender posko.`
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

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchAgendaDetail,
  fetchAgendaLogs,
  toggleStepCompletion,
  addSingleStep,
  updateAgendaPublicationStatus,
  updateAgendaExecutionStatus,
  fetchLinkedDocumentations,
} from '@/services/agendaApi'
import type { CalendarEvent, AgendaPublicationStatus, AgendaExecutionStatus } from '@/types/database'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Target,
  Package,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Globe,
  Lock,
  Archive,
  Edit3,
  History,
  Camera,
  CheckSquare,
} from 'lucide-react'

interface AgendaDetailModalProps {
  agendaId: string | null
  open: boolean
  onClose: () => void
  onEdit: (agenda: CalendarEvent) => void
}

function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDetailTime(startIso: string, endIso: string): string {
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

export const AgendaDetailModal: React.FC<AgendaDetailModalProps> = ({
  agendaId,
  open,
  onClose,
  onEdit,
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'documentation' | 'history'>('overview')
  const [newStepTitle, setNewStepTitle] = useState('')
  const [newStepDesc, setNewStepDesc] = useState('')
  const [isAddingStep, setIsAddingStep] = useState(false)
  const [editingNotesStepId, setEditingNotesStepId] = useState<string | null>(null)
  const [stepNoteText, setStepNoteText] = useState('')

  const {
    data: agenda,
    isLoading,
  } = useQuery({
    queryKey: ['workspace', 'agenda-detail', agendaId],
    queryFn: () => (agendaId ? fetchAgendaDetail(agendaId) : null),
    enabled: Boolean(agendaId && open),
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['workspace', 'agenda-logs', agendaId],
    queryFn: () => (agendaId ? fetchAgendaLogs(agendaId) : []),
    enabled: Boolean(agendaId && open),
  })

  const { data: linkedDocs = [] } = useQuery({
    queryKey: ['workspace', 'agenda-docs', agendaId],
    queryFn: () => (agendaId ? fetchLinkedDocumentations(agendaId) : []),
    enabled: Boolean(agendaId && open),
  })

  const isLeaderOrAdmin =
    isSuperAdmin || membership?.role === 'ketua' || membership?.role === 'sekretaris'

  const canEditAgenda =
    isLeaderOrAdmin ||
    Boolean(user?.id && (agenda?.created_by === user.id || agenda?.pic_id === user.id)) ||
    Boolean(membership?.division && agenda?.responsible_division === membership.division)

  const toggleStepMutation = useMutation({
    mutationFn: ({
      stepId,
      completed,
      notes,
    }: {
      stepId: string
      completed: boolean
      notes?: string
    }) => toggleStepCompletion(stepId, agendaId!, completed, notes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-detail', agendaId] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-logs', agendaId] }),
      ])
      toast({
        title: 'Status Tahapan Diperbarui',
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Memperbarui Tahapan',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const addStepMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      addSingleStep(agendaId!, {
        title: data.title,
        description: data.description,
        order_index: (agenda?.steps?.length || 0) + 1,
      }),
    onSuccess: async () => {
      setNewStepTitle('')
      setNewStepDesc('')
      setIsAddingStep(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-detail', agendaId] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-logs', agendaId] }),
      ])
      toast({
        title: 'Tahapan Ditambahkan',
        variant: 'success',
      })
    },
  })

  const publicationMutation = useMutation({
    mutationFn: (status: AgendaPublicationStatus) =>
      updateAgendaPublicationStatus(agendaId!, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-detail', agendaId] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-logs', agendaId] }),
      ])
      toast({
        title: 'Status Publikasi Diperbarui',
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Mengubah Publikasi',
        description: err?.message || 'Terjadi kesalahan hak akses.',
        variant: 'error',
      })
    },
  })

  const executionMutation = useMutation({
    mutationFn: (status: AgendaExecutionStatus) =>
      updateAgendaExecutionStatus(agendaId!, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-detail', agendaId] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'calendar-events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'agenda-logs', agendaId] }),
      ])
      toast({
        title: 'Status Pelaksanaan Diperbarui',
        variant: 'success',
      })
    },
  })

  if (!open) return null

  // Calculate Checklist Progress
  const steps = agenda?.steps || []
  const totalSteps = steps.length
  const completedSteps = steps.filter((s) => s.completion_status).length
  const progressPercent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detail Agenda & Realisasi Kegiatan"
      description="Pantau tahapan realisasi, pembagian tugas divisi, logistik, dan riwayat aktivitas posko."
      maxWidthClass="max-w-3xl"
    >
      {isLoading || !agenda ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-forest" />
          <p className="text-xs text-charcoal-muted">Memuat rincian agenda...</p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
          {/* Header & Badges */}
          <div className="border-b border-warm-200 pb-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-forest text-forest bg-forest/5 text-xs font-semibold">
                {agenda.category || 'Umum'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Divisi: {agenda.responsible_division || 'Acara'}
              </Badge>

              {/* Publication Status Badge */}
              {agenda.publication_status === 'published' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                  <Globe className="h-3 w-3" />
                  Publik
                </span>
              ) : agenda.publication_status === 'archived' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
                  <Archive className="h-3 w-3" />
                  Arsip
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-800">
                  <Lock className="h-3 w-3" />
                  Internal KKN
                </span>
              )}

              {/* Execution Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  agenda.execution_status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : agenda.execution_status === 'in_progress'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : agenda.execution_status === 'postponed'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-warm-100 text-charcoal-muted'
                }`}
              >
                {agenda.execution_status === 'completed'
                  ? 'Selesai'
                  : agenda.execution_status === 'in_progress'
                  ? 'Sedang Berjalan'
                  : agenda.execution_status === 'postponed'
                  ? 'Ditunda'
                  : 'Belum Dimulai'}
              </span>
            </div>

            <h2 className="text-xl font-serif font-bold text-forest">
              {agenda.title}
            </h2>

            {/* Quick Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-charcoal-muted pt-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-forest shrink-0" />
                <span>{formatDetailDate(agenda.start_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-forest shrink-0" />
                <span>{formatDetailTime(agenda.start_at, agenda.end_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-forest shrink-0" />
                <span>{agenda.location || 'Posko KKN Desa Pringgasela Selatan'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-forest shrink-0" />
                <span>
                  PIC: <strong className="text-charcoal">{agenda.pic_profile?.full_name || 'Seluruh Anggota'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar for Checklist Realization */}
          {totalSteps > 0 && (
            <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-forest flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4" />
                  Realisasi Tahapan Kegiatan
                </span>
                <span className="font-bold text-forest">
                  {completedSteps} dari {totalSteps} Selesai ({progressPercent}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-warm-200 overflow-hidden">
                <div
                  className="h-full bg-forest transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-warm-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-forest text-forest font-semibold'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Ringkasan &amp; Sasaran
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'checklist'
                  ? 'border-forest text-forest font-semibold'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <span>Checklist Tahapan</span>
              <span className="rounded-full bg-warm-200 px-1.5 py-0.2 text-[10px] text-charcoal">
                {completedSteps}/{totalSteps}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documentation')}
              className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'documentation'
                  ? 'border-forest text-forest font-semibold'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <span>Dokumentasi Foto</span>
              {linkedDocs.length > 0 && (
                <span className="rounded-full bg-warm-200 px-1.5 py-0.2 text-[10px] text-charcoal">
                  {linkedDocs.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'history'
                  ? 'border-forest text-forest font-semibold'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <span>Riwayat Aktivitas</span>
              {logs.length > 0 && (
                <span className="rounded-full bg-warm-200 px-1.5 py-0.2 text-[10px] text-charcoal">
                  {logs.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-charcoal">Deskripsi Operasional:</h4>
                <p className="text-charcoal whitespace-pre-line leading-relaxed bg-warm-50 p-3 rounded-lg border border-warm-200">
                  {agenda.description || 'Tidak ada deskripsi tambahan.'}
                </p>
              </div>

              {/* Target & Logistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-warm-200 p-3 space-y-1">
                  <div className="font-semibold text-forest flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Target Sasaran:
                  </div>
                  <p className="text-charcoal">{agenda.target_audience || 'Warga Desa Pringgasela Selatan'}</p>
                </div>

                <div className="rounded-lg border border-warm-200 p-3 space-y-1">
                  <div className="font-semibold text-forest flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Target Capaian (Output):
                  </div>
                  <p className="text-charcoal">{agenda.target_output || 'Kegiatan terlaksana dengan baik dan terdokumentasi.'}</p>
                </div>
              </div>

              {/* Equipment Needed */}
              {agenda.equipment_needed && agenda.equipment_needed.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-charcoal flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-forest" />
                    Kebutuhan Perlengkapan / Logistik:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {agenda.equipment_needed.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2.5 py-1 text-xs text-charcoal"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Program Kerja & Timeline linkage */}
              {(agenda.related_program || agenda.related_timeline_stage) && (
                <div className="rounded-lg border border-sage-200 bg-sage-50/40 p-3 space-y-2">
                  <h4 className="font-semibold text-forest text-xs">Integrasi Lintas Modul:</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {agenda.related_program && (
                      <div className="inline-flex items-center gap-1 rounded-md border border-sage-300 bg-white px-2.5 py-1 text-charcoal">
                        <span>Program Kerja:</span>
                        <strong className="text-forest">{agenda.related_program.title}</strong>
                      </div>
                    )}
                    {agenda.related_timeline_stage && (
                      <div className="inline-flex items-center gap-1 rounded-md border border-sage-300 bg-white px-2.5 py-1 text-charcoal">
                        <span>Tahap Roadmap:</span>
                        <strong className="text-forest">{agenda.related_timeline_stage.title}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Checklist Realisasi */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-charcoal">
                  Daftar Tahapan Kegiatan ({steps.length})
                </span>
                {canEditAgenda && !isAddingStep && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingStep(true)}
                    className="h-7 px-2 text-xs text-forest gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Tahapan</span>
                  </Button>
                )}
              </div>

              {/* Inline Add Step Form */}
              {isAddingStep && (
                <div className="rounded-lg border border-forest/30 bg-sage-50/50 p-3 space-y-2">
                  <h5 className="font-semibold text-forest text-xs">Tambah Tahapan Baru:</h5>
                  <input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder="Judul langkah tahapan..."
                    className="w-full rounded border border-warm-300 px-2.5 py-1.5 text-xs text-charcoal focus:border-forest focus:outline-none bg-white"
                  />
                  <textarea
                    value={newStepDesc}
                    onChange={(e) => setNewStepDesc(e.target.value)}
                    placeholder="Detail pelaksanaan (opsional)..."
                    rows={2}
                    className="w-full rounded border border-warm-300 px-2.5 py-1.5 text-xs text-charcoal focus:border-forest focus:outline-none bg-white"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingStep(false)}
                      className="h-7 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newStepTitle.trim() || addStepMutation.isPending}
                      onClick={() =>
                        addStepMutation.mutate({
                          title: newStepTitle,
                          description: newStepDesc || undefined,
                        })
                      }
                      className="h-7 text-xs bg-forest hover:bg-forest/90 text-white"
                    >
                      {addStepMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Simpan Tahapan'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Steps List */}
              {steps.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-warm-50 rounded-lg border border-warm-200">
                  <p>Belum ada tahapan langkah kegiatan yang dirinci.</p>
                  {canEditAgenda && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingStep(true)}
                      className="mt-2 text-xs text-forest gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Tambah Tahapan Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {steps.map((st, idx) => {
                    const isChecked = st.completion_status

                    return (
                      <div
                        key={st.id || idx}
                        className={`rounded-lg border p-3 transition-colors ${
                          isChecked
                            ? 'border-emerald-200 bg-emerald-50/40 text-charcoal'
                            : 'border-warm-200 bg-white text-charcoal'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            disabled={!canEditAgenda || toggleStepMutation.isPending}
                            onClick={() =>
                              toggleStepMutation.mutate({
                                stepId: st.id,
                                completed: !isChecked,
                                notes: st.actual_notes ?? undefined,
                              })
                            }
                            className={`mt-0.5 shrink-0 rounded transition-colors ${
                              isChecked
                                ? 'text-emerald-600 hover:text-emerald-700'
                                : 'text-warm-400 hover:text-forest'
                            }`}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="h-5 w-5 fill-emerald-100" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h5
                                className={`text-xs font-semibold ${
                                  isChecked ? 'line-through text-charcoal-muted' : 'text-charcoal'
                                }`}
                              >
                                {idx + 1}. {st.title}
                              </h5>
                              {isChecked && st.completed_at && (
                                <span className="text-[10px] text-emerald-700">
                                  ✓ Selesai pada {new Date(st.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>

                            {st.description && (
                              <p className="text-[11px] text-charcoal-muted leading-relaxed">
                                {st.description}
                              </p>
                            )}

                            {/* Actual Realization Notes */}
                            {st.actual_notes ? (
                              <div className="rounded bg-warm-100/70 p-2 text-[11px] text-charcoal border border-warm-200/80">
                                <span className="font-semibold text-forest">Catatan Lapangan: </span>
                                <span>{st.actual_notes}</span>
                                {canEditAgenda && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNotesStepId(st.id)
                                      setStepNoteText(st.actual_notes || '')
                                    }}
                                    className="ml-2 text-forest underline hover:text-forest/80"
                                  >
                                    edit
                                  </button>
                                )}
                              </div>
                            ) : canEditAgenda ? (
                              <div className="pt-0.5">
                                {editingNotesStepId === st.id ? (
                                  <div className="space-y-1.5 pt-1">
                                    <input
                                      type="text"
                                      value={stepNoteText}
                                      onChange={(e) => setStepNoteText(e.target.value)}
                                      placeholder="Tulis catatan realisasi (kendala, jumlah warga yang hadir, dll)..."
                                      className="w-full rounded border border-warm-300 px-2 py-1 text-xs text-charcoal bg-white"
                                    />
                                    <div className="flex justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingNotesStepId(null)}
                                        className="text-[11px] text-charcoal-muted px-1.5 py-0.5"
                                      >
                                        Batal
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          toggleStepMutation.mutate({
                                            stepId: st.id,
                                            completed: st.completion_status,
                                            notes: stepNoteText,
                                          })
                                          setEditingNotesStepId(null)
                                        }}
                                        className="text-[11px] text-forest font-semibold px-2 py-0.5 bg-forest/10 rounded"
                                      >
                                        Simpan Catatan
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNotesStepId(st.id)
                                      setStepNoteText('')
                                    }}
                                    className="text-[11px] text-forest hover:underline"
                                  >
                                    + Tambah Catatan Lapangan
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Documentation Photos */}
          {activeTab === 'documentation' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-charcoal">
                  Galeri Foto Dokumentasi Terkait
                </span>
              </div>

              {linkedDocs.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-warm-50 rounded-lg border border-warm-200 space-y-2">
                  <Camera className="h-8 w-8 text-warm-400 mx-auto" />
                  <p>Belum ada dokumentasi foto yang ditautkan ke agenda ini.</p>
                  <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto">
                    Foto yang diunggah melalui menu Dokumentasi Kegiatan dapat ditautkan ke agenda ini untuk melengkapi rekapitulasi laporan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {linkedDocs.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="rounded-lg border border-warm-200 overflow-hidden bg-white hover:border-forest transition-colors"
                    >
                      {doc.cover_photo_path ? (
                        <img
                          src={doc.cover_photo_path}
                          alt={doc.title}
                          className="h-32 w-full object-cover"
                        />
                      ) : (
                        <div className="h-32 w-full bg-warm-100 flex items-center justify-center text-warm-400">
                          <Camera className="h-8 w-8" />
                        </div>
                      )}
                      <div className="p-2.5 space-y-1">
                        <h5 className="font-semibold text-charcoal truncate">{doc.title}</h5>
                        <p className="text-[11px] text-charcoal-muted">
                          {doc.activity_date} • {doc.location_name || 'Desa Pringgasela Selatan'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: History / Audit Log */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-charcoal flex items-center gap-1.5">
                <History className="h-4 w-4 text-forest" />
                Catatan Perubahan &amp; Aktivitas
              </h4>

              {logs.length === 0 ? (
                <p className="text-charcoal-muted italic py-4">Belum ada riwayat tercatat.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 border-l-2 border-sage-300 pl-3 py-1 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="text-charcoal">
                          <strong className="text-forest">
                            {log.actor_profile?.full_name || 'Anggota Tim'}
                          </strong>{' '}
                          {log.action_type === 'created'
                            ? 'membuat agenda ini'
                            : log.action_type === 'updated'
                            ? 'memperbarui detail agenda'
                            : log.action_type === 'step_toggled'
                            ? `mengubah status tahapan (${log.new_value})`
                            : log.action_type === 'step_added'
                            ? `menambahkan tahapan baru "${log.new_value}"`
                            : log.action_type === 'published'
                            ? 'mempublikasikan agenda ke portal publik'
                            : log.action_type === 'status_changed'
                            ? `mengubah status pelaksanaan menjadi ${log.new_value}`
                            : 'memperbarui agenda'}
                        </p>
                        <span className="text-[10px] text-charcoal-muted">
                          {new Date(log.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      {agenda && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-warm-200 mt-4">
          {/* Status Execution Dropdown / Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-charcoal-muted">Status:</span>
            <select
              value={agenda.execution_status || 'not_started'}
              disabled={!canEditAgenda || executionMutation.isPending}
              onChange={(e) =>
                executionMutation.mutate(e.target.value as AgendaExecutionStatus)
              }
              className="rounded-md border border-warm-300 bg-white px-2 py-1 text-xs text-charcoal focus:border-forest focus:outline-none"
            >
              <option value="not_started">Belum Dimulai</option>
              <option value="in_progress">Sedang Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="postponed">Ditunda</option>
            </select>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* Leadership Publication Toggle */}
            {isLeaderOrAdmin && (
              <>
                {agenda.publication_status === 'published' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={publicationMutation.isPending}
                    onClick={() => publicationMutation.mutate('internal')}
                    className="text-xs text-charcoal"
                  >
                    Jadikan Internal
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={publicationMutation.isPending}
                    onClick={() => publicationMutation.mutate('published')}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Publikasikan ke Portal
                  </Button>
                )}
              </>
            )}

            {canEditAgenda && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose()
                  onEdit(agenda)
                }}
                className="text-xs gap-1"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Agenda</span>
              </Button>
            )}

            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

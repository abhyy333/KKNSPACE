import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { fetchWorkspaceMembers } from '@/services/dashboardApi'
import {
  createWorkProgram,
  deleteWorkProgram,
  fetchProgramsBundle,
  saveProgramAssignments,
  updateWorkProgram,
  workProgramFormSchema,
  type WorkProgramFormInput,
} from '@/services/programsApi'
import type {
  ProgramAssignmentType,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Edit3,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

const PROGRAM_STATUS_META: Record<
  WorkProgram['status'],
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' }
> = {
  planned: { label: 'Terencana', variant: 'warning' },
  ongoing: { label: 'Berjalan', variant: 'secondary' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

const PUBLICATION_META: Record<
  WorkProgram['publication_status'],
  { label: string; variant: 'outline' | 'success' | 'secondary' }
> = {
  draft: { label: 'Internal (Draf)', variant: 'outline' },
  published: { label: 'Publik di Portal', variant: 'success' },
  archived: { label: 'Diarsipkan', variant: 'secondary' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Belum ditentukan'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const ProgramsWorkspacePage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const isLeadOrAdmin =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'

  const [statusFilter, setStatusFilter] = useState<'all' | WorkProgram['status']>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<WorkProgram | null>(null)
  const [deletingProgram, setDeletingProgram] = useState<WorkProgram | null>(null)
  const [assigningProgram, setAssigningProgram] = useState<WorkProgram | null>(null)
  const [assignmentDraft, setAssignmentDraft] = useState<
    Record<string, ProgramAssignmentType>
  >({})
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: bundle,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'programs-bundle'],
    queryFn: fetchProgramsBundle,
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

  const assignmentsByProgram = useMemo(() => {
    const map = new Map<
      string,
      Array<{ userId: string; type: ProgramAssignmentType; member?: WorkspaceMemberSummary }>
    >()
    for (const row of bundle?.assignments ?? []) {
      const list = map.get(row.program_id) ?? []
      list.push({
        userId: row.user_id,
        type: row.assignment_type,
        member: memberMap.get(row.user_id),
      })
      map.set(row.program_id, list)
    }
    return map
  }, [bundle?.assignments, memberMap])

  const taskStatsByProgram = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    for (const t of bundle?.tasks ?? []) {
      if (!t.program_id || t.status === 'cancelled') continue
      const current = map.get(t.program_id) ?? { total: 0, done: 0 }
      current.total += 1
      if (t.status === 'done') current.done += 1
      map.set(t.program_id, current)
    }
    return map
  }, [bundle?.tasks])

  const canEditProgram = (prog: WorkProgram): boolean => {
    if (isLeadOrAdmin) return true
    if (
      (membership?.role === 'anggota' || membership?.role === 'bendahara') &&
      user?.id
    ) {
      const assigned = assignmentsByProgram.get(prog.id) ?? []
      return assigned.some((a) => a.userId === user.id)
    }
    return false
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkProgramFormInput>({
    resolver: zodResolver(workProgramFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'planned',
      publicationStatus: 'draft',
      startDate: '',
      endDate: '',
    },
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editingProgram) {
      reset({
        title: editingProgram.title,
        description: editingProgram.description ?? '',
        status: editingProgram.status,
        publicationStatus: editingProgram.publication_status,
        startDate: editingProgram.start_date ?? '',
        endDate: editingProgram.end_date ?? '',
      })
    } else {
      reset({
        title: '',
        description: '',
        status: 'planned',
        publicationStatus: 'draft',
        startDate: '',
        endDate: '',
      })
    }
  }, [modalOpen, editingProgram, reset])

  const invalidateProgramQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'programs-bundle'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createWorkProgram,
    onSuccess: async () => {
      await invalidateProgramQueries()
      toast({
        title: 'Program Kerja Ditambahkan',
        description: 'Program kerja baru telah dicatat ke workspace.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: WorkProgramFormInput
    }) => updateWorkProgram(id, values, isLeadOrAdmin),
    onSuccess: async () => {
      await invalidateProgramQueries()
      toast({
        title: 'Program Kerja Diperbarui',
        description: 'Perubahan progres program kerja berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWorkProgram,
    onSuccess: async () => {
      setDeletingProgram(null)
      await invalidateProgramQueries()
      toast({
        title: 'Program Kerja Dihapus',
        description: 'Program kerja telah dihapus.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Program',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({
      programId,
      items,
    }: {
      programId: string
      items: Array<{ userId: string; assignmentType: ProgramAssignmentType }>
    }) => saveProgramAssignments(programId, items),
    onSuccess: async () => {
      setAssigningProgram(null)
      await invalidateProgramQueries()
      toast({
        title: 'Penugasan Tim Disimpan',
        description: 'Daftar PJ dan anggota program kerja telah diperbarui.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menyimpan Penugasan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const handleCloseModal = () => {
    setFormError(null)
    setModalOpen(false)
    setEditingProgram(null)
  }

  const onSubmitProgram = async (values: WorkProgramFormInput) => {
    setFormError(null)
    try {
      if (editingProgram) {
        await updateMutation.mutateAsync({ id: editingProgram.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      handleCloseModal()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan program kerja.'
      )
    }
  }

  const openAssignmentModal = (prog: WorkProgram) => {
    const existing = assignmentsByProgram.get(prog.id) ?? []
    const draft: Record<string, ProgramAssignmentType> = {}
    for (const item of existing) {
      draft[item.userId] = item.type
    }
    setAssignmentDraft(draft)
    setAssigningProgram(prog)
  }

  const toggleMemberAssignment = (userId: string) => {
    setAssignmentDraft((prev) => {
      const next = { ...prev }
      if (next[userId]) {
        delete next[userId]
      } else {
        next[userId] = 'pj'
      }
      return next
    })
  }

  const filteredPrograms = useMemo(() => {
    const list = bundle?.programs ?? []
    if (statusFilter === 'all') return list
    return list.filter((p) => p.status === statusFilter)
  }, [bundle?.programs, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Program Kerja KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Kelola rencana program kerja desa, penanggung jawab (PJ), progres tugas, serta persetujuan publikasi ke portal publik.
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
          {isLeadOrAdmin && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setFormError(null)
                setEditingProgram(null)
                setModalOpen(true)
              }}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Program Kerja</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-warm-300 bg-warm-50 p-1">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'planned', label: 'Terencana' },
              { id: 'ongoing', label: 'Berjalan' },
              { id: 'completed', label: 'Selesai' },
              { id: 'cancelled', label: 'Dibatalkan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-sage-600 text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link to="/workspace/tasks">
          <Button size="sm" variant="outline" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-sage-700" />
            <span>Kelola Tugas Tim</span>
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-36" />
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
                  Gagal Memuat Program Kerja
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
      ) : filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <Award className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Belum ada program kerja untuk kategori ini
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              {isLeadOrAdmin
                ? 'Tambahkan program kerja baru, tentukan PJ dari anggota atau bendahara, lalu kelola progres tugasnya.'
                : 'Ketua atau Sekretaris dapat menambahkan program kerja dan menunjuk anggota/bendahara sebagai penanggung jawab.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPrograms.map((prog) => {
            const statusMeta = PROGRAM_STATUS_META[prog.status]
            const pubMeta = PUBLICATION_META[prog.publication_status]
            const assigned = assignmentsByProgram.get(prog.id) ?? []
            const taskStats = taskStatsByProgram.get(prog.id) ?? { total: 0, done: 0 }
            const editable = canEditProgram(prog)
            const progressPct =
              taskStats.total > 0
                ? Math.round((taskStats.done / taskStats.total) * 100)
                : null

            return (
              <Card key={prog.id} className="flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-charcoal leading-snug">
                        {prog.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={statusMeta.variant} className="text-[10px]">
                          {statusMeta.label}
                        </Badge>
                        <Badge variant={pubMeta.variant} className="text-[10px] gap-1">
                          <Globe className="h-2.5 w-2.5" />
                          {pubMeta.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {prog.description && (
                    <p className="text-xs text-charcoal-muted whitespace-pre-line line-clamp-3">
                      {prog.description}
                    </p>
                  )}

                  <div className="space-y-2 text-[11px] text-charcoal-muted border-t border-warm-200 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                      <span>
                        {formatDate(prog.start_date)} – {formatDate(prog.end_date)}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <Users className="h-3.5 w-3.5 text-sage-700 shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {assigned.length === 0 ? (
                          <span>Belum ada PJ / tim ditugaskan</span>
                        ) : (
                          assigned.map((a) => (
                            <Badge
                              key={a.userId}
                              variant={a.type === 'pj' ? 'secondary' : 'outline'}
                              className="text-[10px]"
                            >
                              {a.member?.full_name || 'Anggota'} (
                              {a.type === 'pj' ? 'PJ' : 'Tim'})
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {taskStats.total > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between">
                          <span>Progres Tugas Terkait</span>
                          <span className="font-medium text-charcoal">
                            {taskStats.done}/{taskStats.total} selesai ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-warm-200 overflow-hidden">
                          <div
                            className="h-full bg-sage-600 rounded-full transition-all"
                            style={{ width: `${progressPct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {(editable || isLeadOrAdmin) && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-warm-200">
                      {isLeadOrAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignmentModal(prog)}
                          className="h-8 px-2.5 text-xs gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Atur PJ</span>
                        </Button>
                      )}
                      {editable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFormError(null)
                            setEditingProgram(prog)
                            setModalOpen(true)
                          }}
                          className="h-8 px-2.5 text-xs gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{isLeadOrAdmin ? 'Edit' : 'Update Progres'}</span>
                        </Button>
                      )}
                      {isLeadOrAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingProgram(prog)}
                          className="h-8 px-2.5 text-xs gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Proker */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingProgram ? 'Perbarui Program Kerja' : 'Tambah Program Kerja'}
        description={
          isLeadOrAdmin
            ? 'Atur detail target, jadwal pelaksanaan, dan status publikasi ke portal publik.'
            : 'Perbarui deskripsi atau status progres program kerja yang ditugaskan kepada Anda.'
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmitProgram)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="prog-title" className="text-xs font-medium text-charcoal block">
              Nama Program Kerja <span className="text-red-500">*</span>
            </label>
            <Input
              id="prog-title"
              placeholder="Misal: Kelas Literasi Digital UMKM Desa"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prog-desc" className="text-xs font-medium text-charcoal block">
              Deskripsi &amp; Indikator Capaian
            </label>
            <textarea
              id="prog-desc"
              rows={3}
              placeholder="Sasaran kegiatan, dusun lokasi, dan capaian yang ditargetkan..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-[11px] text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="prog-start" className="text-xs font-medium text-charcoal block">
                Tanggal Mulai
              </label>
              <Input id="prog-start" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="prog-end" className="text-xs font-medium text-charcoal block">
                Tanggal Selesai
              </label>
              <Input id="prog-end" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-[11px] text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="prog-status" className="text-xs font-medium text-charcoal block">
                Status Pelaksanaan
              </label>
              <select
                id="prog-status"
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                {...register('status')}
              >
                <option value="planned">Terencana</option>
                <option value="ongoing">Sedang Berjalan</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prog-pub" className="text-xs font-medium text-charcoal block">
                Status Publikasi Portal
              </label>
              <select
                id="prog-pub"
                disabled={!isLeadOrAdmin}
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 disabled:bg-warm-100 disabled:text-charcoal-muted"
                {...register('publicationStatus')}
              >
                <option value="draft">Internal (Draf)</option>
                <option value="published">Publikasikan ke Portal</option>
                <option value="archived">Arsipkan</option>
              </select>
              {!isLeadOrAdmin && (
                <p className="text-[10px] text-charcoal-muted">
                  Hanya Ketua atau Sekretaris yang dapat mempublikasikan ke portal.
                </p>
              )}
            </div>
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
              <span>{editingProgram ? 'Simpan Perubahan' : 'Simpan Program'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Atur PJ / Anggota */}
      <Modal
        open={Boolean(assigningProgram)}
        onClose={() => setAssigningProgram(null)}
        title="Atur Penanggung Jawab & Tim Proker"
        description={
          assigningProgram
            ? `Tentukan PJ dan tim pelaksana untuk "${assigningProgram.title}". Anggota dan Bendahara yang ditunjuk dapat memperbarui progres program ini.`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto divide-y divide-warm-200 border border-warm-200 rounded-md">
            {members.length === 0 ? (
              <p className="p-4 text-xs text-charcoal-muted text-center">
                Belum ada anggota aktif yang tersedia.
              </p>
            ) : (
              members.map((member) => {
                const selectedType = assignmentDraft[member.user_id]
                const isSelected = Boolean(selectedType)

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMemberAssignment(member.user_id)}
                        className="rounded border-warm-300 text-sage-600 focus:ring-sage-500"
                      />
                      <span className="truncate font-medium text-charcoal">
                        {member.full_name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {member.role}
                      </Badge>
                    </label>

                    {isSelected && (
                      <select
                        value={selectedType}
                        onChange={(e) =>
                          setAssignmentDraft((prev) => ({
                            ...prev,
                            [member.user_id]: e.target.value as ProgramAssignmentType,
                          }))
                        }
                        className="h-7 rounded border border-warm-300 bg-white px-2 text-[11px]"
                      >
                        <option value="pj">PJ Utama</option>
                        <option value="member">Tim Pelaksana</option>
                      </select>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAssigningProgram(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={assignMutation.isPending}
              onClick={() => {
                if (!assigningProgram) return
                const items = Object.entries(assignmentDraft).map(
                  ([userId, assignmentType]) => ({
                    userId,
                    assignmentType,
                  })
                )
                assignMutation.mutate({
                  programId: assigningProgram.id,
                  items,
                })
              }}
              className="gap-1.5"
            >
              {assignMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Simpan Penugasan</span>
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingProgram)}
        onClose={() => setDeletingProgram(null)}
        onConfirm={() => {
          if (deletingProgram) deleteMutation.mutate(deletingProgram.id)
        }}
        title="Hapus Program Kerja?"
        description={
          deletingProgram
            ? `Program kerja "${deletingProgram.title}" akan dihapus secara permanen.`
            : ''
        }
        confirmLabel="Hapus Program"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

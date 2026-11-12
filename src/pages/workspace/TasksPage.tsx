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
import { fetchWorkspaceMembers, getLocalDateKey } from '@/services/dashboardApi'
import {
  createTask,
  deleteTask,
  fetchProgramsBundle,
  taskFormSchema,
  updateTask,
  updateTaskStatusOnly,
  type TaskFormInput,
} from '@/services/programsApi'
import type { TaskItem, TaskStatus, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'

const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' }
> = {
  todo: { label: 'Belum Mulai', variant: 'warning' },
  in_progress: { label: 'Dikerjakan', variant: 'secondary' },
  done: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
}

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const isLeadOrAdmin =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'

  const [statusFilter, setStatusFilter] = useState<'active' | 'done' | 'all'>('active')
  const [onlyMine, setOnlyMine] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
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

  const programMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of bundle?.programs ?? []) map.set(p.id, p.title)
    return map
  }, [bundle?.programs])

  const assigneesByTask = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary[]>()
    for (const row of bundle?.taskAssignees ?? []) {
      const m = memberMap.get(row.user_id)
      if (!m) continue
      const list = map.get(row.task_id) ?? []
      list.push(m)
      map.set(row.task_id, list)
    }
    return map
  }, [bundle?.taskAssignees, memberMap])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      programId: '',
      dueDate: '',
      status: 'todo',
    },
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description ?? '',
        programId: editingTask.program_id ?? '',
        dueDate: editingTask.due_date ?? '',
        status: editingTask.status,
      })
    } else {
      reset({
        title: '',
        description: '',
        programId: '',
        dueDate: '',
        status: 'todo',
      })
    }
  }, [modalOpen, editingTask, reset])

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'programs-bundle'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: ({
      values,
      assignees,
    }: {
      values: TaskFormInput
      assignees: string[]
    }) => createTask(values, assignees),
    onSuccess: async () => {
      await invalidateAll()
      toast({
        title: 'Tugas Ditambahkan',
        description: 'Tugas baru berhasil dibuat dan ditugaskan.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
      assignees,
    }: {
      id: string
      values: TaskFormInput
      assignees?: string[]
    }) => updateTask(id, values, assignees),
    onSuccess: async () => {
      await invalidateAll()
      toast({
        title: 'Tugas Diperbarui',
        description: 'Perubahan status dan detail tugas tersimpan.',
        variant: 'success',
      })
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTaskStatusOnly(id, status),
    onSuccess: async () => {
      await invalidateAll()
      toast({
        title: 'Status Tugas Diperbarui',
        description: 'Progres tugas berhasil disimpan.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Mengubah Status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => {
      setDeletingTask(null)
      await invalidateAll()
      toast({
        title: 'Tugas Dihapus',
        description: 'Tugas telah dihapus.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Tugas',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const openCreateModal = () => {
    setFormError(null)
    setEditingTask(null)
    setSelectedAssignees([])
    setModalOpen(true)
  }

  const openEditModal = (task: TaskItem) => {
    setFormError(null)
    setEditingTask(task)
    const current = (assigneesByTask.get(task.id) ?? []).map((m) => m.user_id)
    setSelectedAssignees(current)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setFormError(null)
    setModalOpen(false)
    setEditingTask(null)
  }

  const onSubmit = async (values: TaskFormInput) => {
    setFormError(null)
    try {
      if (editingTask) {
        await updateMutation.mutateAsync({
          id: editingTask.id,
          values,
          assignees: isLeadOrAdmin ? selectedAssignees : undefined,
        })
      } else {
        await createMutation.mutateAsync({
          values,
          assignees: selectedAssignees,
        })
      }
      handleCloseModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan tugas.')
    }
  }

  const todayKey = getLocalDateKey()
  const currentUserId = user?.id ?? null

  const filteredTasks = useMemo(() => {
    const list = bundle?.tasks ?? []
    return list.filter((t) => {
      if (statusFilter === 'active' && (t.status === 'done' || t.status === 'cancelled')) {
        return false
      }
      if (statusFilter === 'done' && t.status !== 'done') {
        return false
      }
      if (onlyMine && currentUserId) {
        const assignees = assigneesByTask.get(t.id) ?? []
        if (!assignees.some((a) => a.user_id === currentUserId)) return false
      }
      return true
    })
  }, [bundle?.tasks, statusFilter, onlyMine, currentUserId, assigneesByTask])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Manajemen Tugas Tim
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pantau pembagian tugas operasional posko, tenggat waktu, dan pembaruan progres oleh anggota tertugas.
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
            <Button size="sm" onClick={openCreateModal} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Tugas</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-warm-300 bg-warm-50 p-1">
          {(
            [
              { id: 'active', label: 'Tugas Aktif' },
              { id: 'done', label: 'Selesai' },
              { id: 'all', label: 'Semua' },
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

        <label className="inline-flex items-center gap-2 text-xs text-charcoal cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="rounded border-warm-300 text-sage-600 focus:ring-sage-500"
          />
          <span>Hanya tugas yang ditugaskan ke saya</span>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-40" />
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
                  Gagal Memuat Daftar Tugas
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
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <CheckSquare className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Belum ada tugas pada filter ini
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              {isLeadOrAdmin
                ? 'Buat tugas tim baru dan tugaskan ke anggota posko.'
                : 'Tugas yang diberikan oleh Ketua atau Sekretaris akan muncul di sini.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const meta = TASK_STATUS_META[task.status]
            const assignees = assigneesByTask.get(task.id) ?? []
            const isAssignedToMe = Boolean(
              user?.id && assignees.some((a) => a.user_id === user.id)
            )
            const canUpdateStatus = isLeadOrAdmin || isAssignedToMe
            const programTitle = task.program_id
              ? programMap.get(task.program_id)
              : null
            const isOverdue =
              Boolean(task.due_date) &&
              task.due_date! < todayKey &&
              task.status !== 'done' &&
              task.status !== 'cancelled'

            return (
              <Card key={task.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-charcoal">
                        {task.title}
                      </h3>
                      <Badge variant={meta.variant} className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {programTitle && (
                        <Badge variant="outline" className="text-[10px]">
                          Proker: {programTitle}
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-charcoal-muted">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-charcoal-muted pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-sage-700" />
                        PJ:{' '}
                        {assignees.length > 0
                          ? assignees.map((a) => a.full_name).join(', ')
                          : 'Belum ditugaskan'}
                      </span>
                      {task.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isOverdue ? 'text-red-700 font-medium' : ''
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Tenggat{' '}
                          {new Date(`${task.due_date}T00:00:00`).toLocaleDateString(
                            'id-ID',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                          {isOverdue ? ' (Lewat Tenggat)' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-start">
                    {canUpdateStatus && (
                      <select
                        value={task.status}
                        aria-label={`Ubah status tugas ${task.title}`}
                        disabled={quickStatusMutation.isPending}
                        onChange={(e) =>
                          quickStatusMutation.mutate({
                            id: task.id,
                            status: e.target.value as TaskStatus,
                          })
                        }
                        className="h-8 rounded-md border border-warm-300 bg-white px-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                      >
                        <option value="todo">Belum Mulai</option>
                        <option value="in_progress">Dikerjakan</option>
                        <option value="done">Selesai</option>
                        {isLeadOrAdmin && <option value="cancelled">Dibatalkan</option>}
                      </select>
                    )}

                    {isLeadOrAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(task)}
                          className="h-8 px-2 text-xs"
                          title="Edit tugas"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingTask(task)}
                          className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Hapus tugas"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Tugas */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingTask ? 'Edit Tugas Tim' : 'Buat Tugas Tim Baru'}
        description="Hubungkan tugas ke program kerja terkait dan pilih anggota penanggung jawabnya."
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
            <label htmlFor="task-title" className="text-xs font-medium text-charcoal block">
              Judul Tugas <span className="text-red-500">*</span>
            </label>
            <Input
              id="task-title"
              placeholder="Misal: Cetak Spanduk Posyandu & Daftar Hadir"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="task-program" className="text-xs font-medium text-charcoal block">
                Program Kerja Terkait
              </label>
              <select
                id="task-program"
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal"
                {...register('programId')}
              >
                <option value="">-- Umum / Operasional Posko --</option>
                {(bundle?.programs ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-due" className="text-xs font-medium text-charcoal block">
                Tenggat Waktu
              </label>
              <Input id="task-due" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="text-xs font-medium text-charcoal block">
              Rincian Tugas
            </label>
            <textarea
              id="task-desc"
              rows={2}
              placeholder="Detail pekerjaan atau target output..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...register('description')}
            />
          </div>

          {isLeadOrAdmin && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-charcoal block">
                Tugaskan ke Anggota
              </span>
              <div className="max-h-36 overflow-y-auto rounded-md border border-warm-200 divide-y divide-warm-200">
                {members.map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-warm-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(m.user_id)}
                      onChange={() =>
                        setSelectedAssignees((prev) =>
                          prev.includes(m.user_id)
                            ? prev.filter((id) => id !== m.user_id)
                            : [...prev, m.user_id]
                        )
                      }
                      className="rounded border-warm-300 text-sage-600 focus:ring-sage-500"
                    />
                    <span className="font-medium text-charcoal">{m.full_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {m.role}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              <span>{editingTask ? 'Simpan Perubahan' : 'Simpan Tugas'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) deleteMutation.mutate(deletingTask.id)
        }}
        title="Hapus Tugas?"
        description={
          deletingTask
            ? `Tugas "${deletingTask.title}" akan dihapus secara permanen.`
            : ''
        }
        confirmLabel="Hapus Tugas"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

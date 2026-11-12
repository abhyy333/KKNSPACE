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
  createDutyShift,
  deleteDutyShift,
  dutyShiftFormSchema,
  fetchDutyShifts,
  updateDutyShift,
  type DutyShiftFormInput,
} from '@/services/agendaApi'
import type { DutyShift, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
} from 'lucide-react'

function formatDateHeading(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const DutyPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { membership, isSuperAdmin } = useAuth()

  const canManageShifts =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'

  const [showAllDates, setShowAllDates] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null)
  const [deletingShift, setDeletingShift] = useState<DutyShift | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'duty-shifts'],
    queryFn: fetchDutyShifts,
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
  } = useForm<DutyShiftFormInput>({
    resolver: zodResolver(dutyShiftFormSchema),
    defaultValues: {
      shiftDate: getLocalDateKey(),
      startTime: '07:00',
      endTime: '12:00',
      assignedUserId: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editingShift) {
      reset({
        shiftDate: editingShift.shift_date,
        startTime: editingShift.start_time.slice(0, 5),
        endTime: editingShift.end_time.slice(0, 5),
        assignedUserId: editingShift.assigned_user_id ?? '',
        notes: editingShift.notes ?? '',
      })
    } else {
      reset({
        shiftDate: getLocalDateKey(),
        startTime: '07:00',
        endTime: '12:00',
        assignedUserId: '',
        notes: '',
      })
    }
  }, [modalOpen, editingShift, reset])

  const invalidateDutyQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'duty-shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createDutyShift,
    onSuccess: async () => {
      await invalidateDutyQueries()
      toast({
        title: 'Shift Piket Ditambahkan',
        description: 'Jadwal piket posko berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DutyShiftFormInput }) =>
      updateDutyShift(id, values),
    onSuccess: async () => {
      await invalidateDutyQueries()
      toast({
        title: 'Shift Piket Diperbarui',
        description: 'Perubahan jadwal piket berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDutyShift,
    onSuccess: async () => {
      setDeletingShift(null)
      await invalidateDutyQueries()
      toast({
        title: 'Shift Piket Dihapus',
        description: 'Jadwal shift telah dihapus.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Shift',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const todayKey = getLocalDateKey()

  const groupedShifts = useMemo(() => {
    const filtered = showAllDates
      ? shifts
      : shifts.filter((s) => s.shift_date >= todayKey)

    const groups = new Map<string, DutyShift[]>()
    for (const s of filtered) {
      const bucket = groups.get(s.shift_date) ?? []
      bucket.push(s)
      groups.set(s.shift_date, bucket)
    }
    return Array.from(groups.entries())
  }, [shifts, showAllDates, todayKey])

  const handleCloseModal = () => {
    setFormError(null)
    setModalOpen(false)
    setEditingShift(null)
  }

  const onSubmit = async (values: DutyShiftFormInput) => {
    setFormError(null)
    try {
      if (editingShift) {
        await updateMutation.mutateAsync({ id: editingShift.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      handleCloseModal()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan jadwal piket.'
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Jadwal Piket Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pembagian shift kebersihan posko, penerimaan tamu warga, dan koordinasi harian.
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
          {canManageShifts && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setFormError(null)
                setEditingShift(null)
                setModalOpen(true)
              }}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Shift</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-warm-300 bg-warm-50 p-1">
          <button
            type="button"
            onClick={() => setShowAllDates(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !showAllDates
                ? 'bg-sage-600 text-white shadow-xs'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Hari Ini &amp; Mendatang
          </button>
          <button
            type="button"
            onClick={() => setShowAllDates(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              showAllDates
                ? 'bg-sage-600 text-white shadow-xs'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Semua Riwayat Shift
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-12 w-full" />
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
                  Gagal Memuat Jadwal Piket
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
      ) : groupedShifts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <Clock className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Belum ada jadwal piket posko
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              {canManageShifts
                ? 'Tambahkan pembagian shift harian untuk anggota posko.'
                : 'Ketua atau Sekretaris akan mengatur pembagian jadwal piket posko.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedShifts.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  {formatDateHeading(dateKey)}
                </h2>
                {dateKey === todayKey && (
                  <Badge variant="success" className="text-[10px]">
                    Hari Ini
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((shift) => {
                  const assignee = shift.assigned_user_id
                    ? memberMap.get(shift.assigned_user_id)
                    : undefined

                  return (
                    <Card key={shift.id}>
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              <Clock className="h-3 w-3 mr-1" />
                              {shift.start_time.slice(0, 5)} –{' '}
                              {shift.end_time.slice(0, 5)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                            <UserCheck className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                            <span className="truncate">
                              {assignee?.full_name || 'Petugas belum ditentukan'}
                            </span>
                          </div>
                          {shift.notes && (
                            <p className="text-xs text-charcoal-muted">
                              {shift.notes}
                            </p>
                          )}
                        </div>

                        {canManageShifts && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setFormError(null)
                                setEditingShift(shift)
                                setModalOpen(true)
                              }}
                              className="rounded p-1.5 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                              title="Edit shift"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingShift(shift)}
                              className="rounded p-1.5 text-charcoal-muted hover:bg-red-50 hover:text-red-600"
                              title="Hapus shift"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingShift ? 'Edit Shift Piket' : 'Tambah Shift Piket Posko'}
        description="Tentukan tanggal, jam jaga, dan anggota yang bertugas."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="shift-date" className="text-xs font-medium text-charcoal block">
              Tanggal Piket <span className="text-red-500">*</span>
            </label>
            <Input id="shift-date" type="date" {...register('shiftDate')} />
            {errors.shiftDate && (
              <p className="text-[11px] text-red-600">{errors.shiftDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="shift-start" className="text-xs font-medium text-charcoal block">
                Jam Mulai <span className="text-red-500">*</span>
              </label>
              <Input id="shift-start" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-[11px] text-red-600">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shift-end" className="text-xs font-medium text-charcoal block">
                Jam Selesai <span className="text-red-500">*</span>
              </label>
              <Input id="shift-end" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-[11px] text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shift-member" className="text-xs font-medium text-charcoal block">
              Petugas Jaga
            </label>
            <select
              id="shift-member"
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              {...register('assignedUserId')}
            >
              <option value="">-- Pilih anggota posko --</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shift-notes" className="text-xs font-medium text-charcoal block">
              Tugas / Catatan Shift
            </label>
            <Input
              id="shift-notes"
              placeholder="Misal: Kebersihan ruang tamu & konsumsi pagi"
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-[11px] text-red-600">{errors.notes.message}</p>
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
              <span>{editingShift ? 'Simpan Perubahan' : 'Simpan Shift'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingShift)}
        onClose={() => setDeletingShift(null)}
        onConfirm={() => {
          if (deletingShift) deleteMutation.mutate(deletingShift.id)
        }}
        title="Hapus Jadwal Piket?"
        description="Shift piket yang dipilih akan dihapus dari jadwal posko."
        confirmLabel="Hapus Shift"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

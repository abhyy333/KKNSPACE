import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminTimelineBundle,
  updateTimelineSettings,
  createTimelineStage,
  updateTimelineStage,
  deleteTimelineStage,
  reorderTimelineStages,
  formatStageDateRange,
  type CreateTimelineStageInput,
  type UpdateTimelineStageInput,
  type UpdateTimelineSettingsInput,
} from '@/services/timelineApi'
import { StageIllustration } from '@/components/timeline/TimelineIllustrations'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { KknTimelineStage, KknTimelineSettings, TimelineStageIconType } from '@/types/database'
import {
  Calendar,
  Users,
  CheckCircle2,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layers,
  Settings,
  ExternalLink,
  Target,
} from 'lucide-react'

export const AdminTimelinePage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Modals & form state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false)
  const [stageToEdit, setStageToEdit] = useState<KknTimelineStage | null>(null)
  const [stageToDelete, setStageToDelete] = useState<KknTimelineStage | null>(null)

  // Fetch admin bundle
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-timeline-bundle'],
    queryFn: fetchAdminTimelineBundle,
  })

  const settings = data?.settings
  const stages = data?.stages || []

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (input: UpdateTimelineSettingsInput) => {
      if (!settings?.id) throw new Error('Settings ID tidak ditemukan')
      return updateTimelineSettings(settings.id, input)
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan Roadmap Berhasil Disimpan', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-timeline-bundle'] })
      queryClient.invalidateQueries({ queryKey: ['public-timeline-bundle'] })
      setIsSettingsModalOpen(false)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memperbarui Pengaturan', description: err.message, variant: 'error' })
    },
  })

  const createStageMutation = useMutation({
    mutationFn: createTimelineStage,
    onSuccess: () => {
      toast({ title: 'Tahapan Berhasil Ditambahkan', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-timeline-bundle'] })
      queryClient.invalidateQueries({ queryKey: ['public-timeline-bundle'] })
      setIsCreateStageModalOpen(false)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menambah Tahapan', description: err.message, variant: 'error' })
    },
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTimelineStageInput }) =>
      updateTimelineStage(id, input),
    onSuccess: () => {
      toast({ title: 'Tahapan Berhasil Diperbarui', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-timeline-bundle'] })
      queryClient.invalidateQueries({ queryKey: ['public-timeline-bundle'] })
      setStageToEdit(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Memperbarui Tahapan', description: err.message, variant: 'error' })
    },
  })

  const deleteStageMutation = useMutation({
    mutationFn: deleteTimelineStage,
    onSuccess: () => {
      toast({ title: 'Tahapan Berhasil Dihapus', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-timeline-bundle'] })
      queryClient.invalidateQueries({ queryKey: ['public-timeline-bundle'] })
      setStageToDelete(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal Menghapus Tahapan', description: err.message, variant: 'error' })
    },
  })

  // Reorder stages
  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= stages.length) return

    const newStages = [...stages]
    const temp = newStages[index]
    newStages[index] = newStages[targetIndex]
    newStages[targetIndex] = temp

    const ids = newStages.map((s) => s.id)
    await reorderTimelineStages(ids)
    queryClient.invalidateQueries({ queryKey: ['admin-timeline-bundle'] })
    queryClient.invalidateQueries({ queryKey: ['public-timeline-bundle'] })
    toast({ title: 'Urutan Tahapan Diperbarui', variant: 'success' })
  }

  // Toggle stage confirmed completion
  const handleToggleConfirmed = (stage: KknTimelineStage) => {
    updateStageMutation.mutate({
      id: stage.id,
      input: { confirmed_completed: !stage.confirmed_completed },
    })
  }

  // Toggle stage published state
  const handleTogglePublished = (stage: KknTimelineStage) => {
    updateStageMutation.mutate({
      id: stage.id,
      input: { is_published: !stage.is_published },
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sage-600 text-sage-800 bg-sage-50">
              Admin Console
            </Badge>
            <span className="text-xs text-charcoal-muted">Manajemen Roadmap &amp; Timeline KKN</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Timeline &amp; Roadmap KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Kelola konfigurasi periode KKN, tahapan kegiatan, konfirmasi penyelesaian, serta integrasi portal publik.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/timeline-kkn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warm-300 bg-white text-xs font-medium text-charcoal hover:bg-warm-100 transition-colors"
          >
            <span>Buka Halaman Publik</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

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
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Pengaturan Umum</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateStageModalOpen(true)}
            className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Tahapan</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-100 text-charcoal">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Total Tahapan</p>
              <p className="text-lg font-bold text-charcoal">{stages.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Tuntas Dikonfirmasi</p>
              <p className="text-lg font-bold text-emerald-700">
                {stages.filter((s) => s.confirmed_completed).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Periode KKN</p>
              <p className="text-xs font-semibold text-charcoal truncate mt-1">
                {settings?.start_date && settings?.end_date
                  ? formatStageDateRange(settings.start_date, settings.end_date)
                  : 'Belum diatur'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-800">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-charcoal-muted">Status Publikasi</p>
              <p className="text-xs font-semibold text-sage-800 mt-1">
                {settings?.is_published ? 'Aktif di Portal Publik' : 'Draf Internal'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stages List */}
      <Card className="bg-white border-warm-200">
        <CardHeader className="p-4 pb-3 border-b border-warm-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-charcoal">
              Daftar Tahapan Perjalanan KKN
            </CardTitle>
            <CardDescription className="text-xs text-charcoal-muted mt-0.5">
              Urutan tahapan yang tampil pada diagram roadmap publik.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : stages.length === 0 ? (
            <div className="p-8 text-center text-xs text-charcoal-muted space-y-2">
              <p>Belum ada tahapan yang dibuat.</p>
              <Button size="sm" onClick={() => setIsCreateStageModalOpen(true)}>
                Tambah Tahap Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="rounded-xl border border-warm-200 bg-white p-4 hover:border-sage-400 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="shrink-0 flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, 'up')}
                          className="p-1 text-charcoal-muted hover:text-charcoal disabled:opacity-30"
                          title="Geser ke Atas"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 'down')}
                          className="p-1 text-charcoal-muted hover:text-charcoal disabled:opacity-30"
                          title="Geser ke Bawah"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="w-10 h-10 rounded-lg bg-warm-100 flex items-center justify-center shrink-0">
                        <StageIllustration type={stage.icon_type} className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-charcoal-muted">
                          Tahap {stage.stage_number}
                        </span>
                        <h3 className="font-semibold text-sm text-charcoal">{stage.title}</h3>
                        <Badge variant="outline" className="text-[10px] text-sage-800 border-sage-300 bg-sage-50">
                          {formatStageDateRange(stage.start_date, stage.end_date)}
                        </Badge>
                        {stage.confirmed_completed ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            ✓ Tuntas Dikonfirmasi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[10px]">
                            Menunggu Konfirmasi
                          </Badge>
                        )}
                        {!stage.is_published && (
                          <Badge variant="destructive" className="text-[10px]">
                            Disembunyikan
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-charcoal-muted leading-relaxed max-w-2xl">
                        {stage.short_description}
                      </p>

                      {stage.objectives && stage.objectives.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-charcoal-muted">
                          <Target className="h-3 w-3 text-sage-700 shrink-0" />
                          <span>{stage.objectives.length} Target Capaian tercatat</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleConfirmed(stage)}
                      className={`text-xs h-7 px-2.5 ${
                        stage.confirmed_completed
                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-warm-300 text-charcoal'
                      }`}
                      title="Ubah Status Konfirmasi Selesai"
                    >
                      {stage.confirmed_completed ? 'Batalkan Selesai' : 'Tandai Selesai'}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleTogglePublished(stage)}
                      className="h-7 w-7 text-charcoal-muted hover:text-charcoal"
                      title={stage.is_published ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}
                    >
                      {stage.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-red-500" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setStageToEdit(stage)}
                      className="h-7 w-7 text-charcoal-muted hover:text-sage-700"
                      title="Edit Tahapan"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setStageToDelete(stage)}
                      className="h-7 w-7 text-charcoal-muted hover:text-red-600"
                      title="Hapus Tahapan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {settings && (
        <TimelineSettingsModal
          open={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSubmit={async (input) => {
            await updateSettingsMutation.mutateAsync(input)
          }}
          isSubmitting={updateSettingsMutation.isPending}
        />
      )}

      {/* Create Stage Modal */}
      <TimelineStageModal
        open={isCreateStageModalOpen}
        onClose={() => setIsCreateStageModalOpen(false)}
        onSubmit={async (input) => {
          await createStageMutation.mutateAsync({
            ...input,
            timeline_id: settings?.id,
            stage_number: stages.length + 1,
            sort_order: stages.length + 1,
          })
        }}
        isSubmitting={createStageMutation.isPending}
        title="Tambah Tahapan Baru"
      />

      {/* Edit Stage Modal */}
      {stageToEdit && (
        <TimelineStageModal
          open={Boolean(stageToEdit)}
          onClose={() => setStageToEdit(null)}
          initialStage={stageToEdit}
          onSubmit={async (input) => {
            await updateStageMutation.mutateAsync({ id: stageToEdit.id, input })
          }}
          isSubmitting={updateStageMutation.isPending}
          title="Edit Tahapan Roadmap"
        />
      )}

      {/* Delete Stage Confirm */}
      <ConfirmDialog
        open={Boolean(stageToDelete)}
        onClose={() => setStageToDelete(null)}
        onConfirm={async () => {
          if (stageToDelete) {
            await deleteStageMutation.mutateAsync(stageToDelete.id)
          }
        }}
        title="Hapus Tahapan?"
        description={`Apakah Anda yakin ingin menghapus tahapan "${stageToDelete?.title}"?`}
        confirmLabel="Hapus Tahapan"
        variant="destructive"
        isLoading={deleteStageMutation.isPending}
      />
    </div>
  )
}

// -------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------
interface TimelineSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: KknTimelineSettings
  onSubmit: (input: UpdateTimelineSettingsInput) => Promise<void>
  isSubmitting: boolean
}

const TimelineSettingsModal: React.FC<TimelineSettingsModalProps> = ({
  open,
  onClose,
  settings,
  onSubmit,
  isSubmitting,
}) => {
  const [title, setTitle] = useState(settings.title || '')
  const [eyebrow, setEyebrow] = useState(settings.eyebrow || '')
  const [description, setDescription] = useState(settings.description || '')
  const [location, setLocation] = useState(settings.location || '')
  const [universityName, setUniversityName] = useState(settings.university_name || '')
  const [studentCount, setStudentCount] = useState(settings.student_count ?? 10)
  const [dplCount, setDplCount] = useState(settings.dpl_count ?? 1)
  const [startDate, setStartDate] = useState(settings.start_date || '')
  const [endDate, setEndDate] = useState(settings.end_date || '')
  const [heroImageUrl, setHeroImageUrl] = useState(settings.hero_image_url || '')
  const [isPublished, setIsPublished] = useState(settings.is_published ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: title.trim(),
      eyebrow: eyebrow.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      university_name: universityName.trim() || undefined,
      student_count: Number(studentCount),
      dpl_count: Number(dplCount),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      hero_image_url: heroImageUrl.trim() || undefined,
      is_published: isPublished,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Pengaturan Umum Timeline & Roadmap">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Judul Halaman</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="text-xs" />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Eyebrow Badge</label>
            <Input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} required className="text-xs" />
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi Hero</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tanggal Mulai Resmi KKN</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs" />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tanggal Penarikan Resmi KKN</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah Mahasiswa</label>
            <Input
              type="number"
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Jumlah DPL</label>
            <Input
              type="number"
              value={dplCount}
              onChange={(e) => setDplCount(Number(e.target.value))}
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Universitas</label>
            <Input
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Lokasi KKN</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="text-xs" />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">URL Foto Hero Cover</label>
            <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className="text-xs" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="published-toggle"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="rounded border-warm-300"
          />
          <label htmlFor="published-toggle" className="text-xs font-semibold text-charcoal cursor-pointer">
            Publikasikan Roadmap di Portal Publik (/timeline-kkn)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------
// Stage CRUD Modal
// -------------------------------------------------------------
interface TimelineStageModalProps {
  open: boolean
  onClose: () => void
  initialStage?: KknTimelineStage | null
  onSubmit: (input: CreateTimelineStageInput) => Promise<void>
  isSubmitting: boolean
  title: string
}

const TimelineStageModal: React.FC<TimelineStageModalProps> = ({
  open,
  onClose,
  initialStage,
  onSubmit,
  isSubmitting,
  title,
}) => {
  const [stageTitle, setStageTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [detailedDesc, setDetailedDesc] = useState('')
  const [iconType, setIconType] = useState<TimelineStageIconType>('preparation')
  const [confirmedCompleted, setConfirmedCompleted] = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [objectivesText, setObjectivesText] = useState('')

  React.useEffect(() => {
    if (initialStage) {
      setStageTitle(initialStage.title || '')
      setSlug(initialStage.slug || '')
      setStartDate(initialStage.start_date || '')
      setEndDate(initialStage.end_date || '')
      setShortDesc(initialStage.short_description || '')
      setDetailedDesc(initialStage.detailed_description || '')
      setIconType(initialStage.icon_type || 'preparation')
      setConfirmedCompleted(initialStage.confirmed_completed ?? false)
      setIsPublished(initialStage.is_published ?? true)
      setObjectivesText((initialStage.objectives || []).join('\n'))
    } else {
      setStageTitle('')
      setSlug('')
      setStartDate('')
      setEndDate('')
      setShortDesc('')
      setDetailedDesc('')
      setIconType('preparation')
      setConfirmedCompleted(false)
      setIsPublished(true)
      setObjectivesText('')
    }
  }, [initialStage, open])

  const handleTitleChange = (val: string) => {
    setStageTitle(val)
    if (!initialStage) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stageTitle.trim() || !startDate || !endDate) return

    const objectives = objectivesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    await onSubmit({
      stage_number: initialStage?.stage_number ?? 1,
      title: stageTitle.trim(),
      slug: slug.trim() || 'stage',
      start_date: startDate,
      end_date: endDate,
      short_description: shortDesc.trim(),
      detailed_description: detailedDesc.trim() || undefined,
      icon_type: iconType,
      confirmed_completed: confirmedCompleted,
      is_published: isPublished,
      objectives,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Judul Tahapan *</label>
            <Input
              value={stageTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Pelaksanaan"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Slug URL</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} required className="text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tanggal Mulai *</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Tanggal Selesai *</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-charcoal block mb-1">Ikon / Tema Ilustrasi</label>
            <select
              value={iconType}
              onChange={(e) => setIconType(e.target.value as TimelineStageIconType)}
              className="w-full p-2 border border-warm-300 rounded text-xs bg-white text-charcoal"
            >
              <option value="preparation">Persiapan (Checklist &amp; Daun)</option>
              <option value="deployment">Penerjunan (Rumah Sasak)</option>
              <option value="implementation">Pelaksanaan (Pertemuan Meja Tim)</option>
              <option value="evaluation">Monitoring &amp; Evaluasi (Papan Grafik)</option>
              <option value="withdrawal">Penarikan (Jabat Tangan)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi Singkat (Tampil di Kartu)</label>
          <textarea
            rows={2}
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            placeholder="Ringkasan 1-2 kalimat untuk kartu roadmap..."
            required
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">Deskripsi Rinci (Detail Tahapan)</label>
          <textarea
            rows={3}
            value={detailedDesc}
            onChange={(e) => setDetailedDesc(e.target.value)}
            placeholder="Uraian lengkap kegiatan tahapan ini..."
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div>
          <label className="font-semibold text-charcoal block mb-1">
            Target Capaian &amp; Fokus (1 baris per target)
          </label>
          <textarea
            rows={3}
            value={objectivesText}
            onChange={(e) => setObjectivesText(e.target.value)}
            placeholder="Contoh:&#10;Pelepasan resmi di kampus&#10;Serah terima dengan Pemdes"
            className="w-full p-2 border border-warm-300 rounded text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedCompleted}
              onChange={(e) => setConfirmedCompleted(e.target.checked)}
              className="rounded border-warm-300"
            />
            <span className="text-xs font-semibold text-charcoal">
              Konfirmasi Tahap Telah Tuntas Dilaksanakan
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-warm-300"
            />
            <span className="text-xs font-semibold text-charcoal">Tampilkan ke Publik</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Tahapan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

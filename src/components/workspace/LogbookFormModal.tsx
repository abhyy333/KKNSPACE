import React, { useEffect, useRef, useState } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Paperclip, Trash2, Users } from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { getLocalDateKey } from '@/services/dashboardApi'
import {
  createDailyLogCorrection,
  createDailyLogEntry,
  dailyLogFormSchema,
  updateDailyLogEntry,
  type DailyLogFormInput,
} from '@/services/logbookApi'
import { formatLogbookDate, LOGBOOK_CATEGORIES, validateLogbookFile } from '@/lib/logbook'
import type {
  DailyLog,
  DailyLogAttachment,
  DailyLogParticipant,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'

interface LogbookFormModalProps {
  open: boolean
  onClose: () => void
  editingLog: DailyLog | null
  correctionOfLog?: DailyLog | null
  existingAttachments: DailyLogAttachment[]
  existingParticipants: DailyLogParticipant[]
  programs: WorkProgram[]
  members: WorkspaceMemberSummary[]
  currentUserId: string | null
}

export const LogbookFormModal: React.FC<LogbookFormModalProps> = ({
  open,
  onClose,
  editingLog,
  correctionOfLog = null,
  existingAttachments,
  existingParticipants,
  programs,
  members,
  currentUserId,
}) => {
  const modalTitle = editingLog
    ? 'Perbarui Catatan Logbook'
    : correctionOfLog
      ? 'Buat Catatan Koreksi Logbook'
      : 'Catat Aktivitas Harian KKN'

  const modalDescription = correctionOfLog
    ? 'Catatan koreksi terhubung ke logbook terverifikasi tanpa mengubah histori asli.'
    : 'Dokumentasikan kegiatan harian beserta lokasi, durasi, keterkaitan program kerja, dan foto atau file pendukung.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      maxWidthClass="max-w-[680px]"
      scrollableContent={false}
    >
      {open && (
        <LogbookFormBody
          key={editingLog?.id ?? (correctionOfLog ? `correct-${correctionOfLog.id}` : 'new-log')}
          onClose={onClose}
          editingLog={editingLog}
          correctionOfLog={correctionOfLog}
          existingAttachments={editingLog ? existingAttachments : []}
          existingParticipants={existingParticipants}
          programs={programs}
          members={members}
          currentUserId={currentUserId}
        />
      )}
    </Modal>
  )
}

type LogbookFormBodyProps = Omit<LogbookFormModalProps, 'open'>

const LogbookFormBody: React.FC<LogbookFormBodyProps> = ({
  onClose,
  editingLog,
  correctionOfLog,
  existingAttachments,
  existingParticipants,
  programs,
  members,
  currentUserId,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    if (submitError && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [submitError])

  const today = getLocalDateKey()
  const prefillSource = editingLog ?? correctionOfLog ?? null

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DailyLogFormInput>({
    resolver: zodResolver(dailyLogFormSchema),
    defaultValues: prefillSource
      ? {
          logDate: prefillSource.log_date,
          title: correctionOfLog ? `[Koreksi] ${prefillSource.title}`.slice(0, 150) : prefillSource.title,
          activityCategory: prefillSource.activity_category,
          workProgramId: prefillSource.work_program_id ?? '',
          content: prefillSource.content,
          location: prefillSource.location ?? '',
          durationMinutesRaw:
            prefillSource.duration_minutes != null ? String(prefillSource.duration_minutes) : '',
          saveAsDraft: editingLog ? editingLog.verification_status === 'draft' : false,
          participantIds: existingParticipants.map((p) => p.user_id),
          correctionReason: editingLog?.correction_reason ?? '',
        }
      : {
          logDate: today,
          title: '',
          activityCategory: 'program_kerja',
          workProgramId: '',
          content: '',
          location: '',
          durationMinutesRaw: '',
          saveAsDraft: false,
          participantIds: [],
          correctionReason: '',
        },
  })

  const selectedParticipantIds = useWatch({
    control,
    name: 'participantIds',
    defaultValue: [],
  })

  const saveAsDraftValue = useWatch({
    control,
    name: 'saveAsDraft',
    defaultValue: false,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: DailyLogFormInput) => {
      if (editingLog) {
        return updateDailyLogEntry(editingLog, values, selectedFiles, removedAttachmentIds)
      }
      if (correctionOfLog) {
        return createDailyLogCorrection(correctionOfLog, values, selectedFiles)
      }
      return createDailyLogEntry(values, selectedFiles)
    },
    onSuccess: async (_saved, values) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-bundle'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-team-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'work-program-log-summaries'] }),
      ])
      toast({
        title: editingLog
          ? 'Catatan Logbook Diperbarui'
          : correctionOfLog
            ? 'Catatan Koreksi Tersimpan'
            : 'Catatan Logbook Tersimpan',
        description: values.saveAsDraft
          ? 'Catatan disimpan sebagai draf dan dapat disunting sebelum diajukan.'
          : 'Aktivitas harian berhasil dicatat dan siap diperiksa oleh DPL.',
        variant: 'success',
      })
      onClose()
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan catatan logbook.')
    },
  })

  const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const validToAdd: File[] = []
    for (const file of files) {
      const validationMsg = validateLogbookFile(file)
      if (validationMsg) {
        setFileError(validationMsg)
        event.target.value = ''
        return
      }
      validToAdd.push(file)
    }

    setSelectedFiles((prev) => [...prev, ...validToAdd])
    event.target.value = ''
  }

  const toggleParticipant = (userId: string) => {
    const current = new Set(selectedParticipantIds)
    if (current.has(userId)) {
      current.delete(userId)
    } else {
      current.add(userId)
    }
    setValue('participantIds', Array.from(current), { shouldDirty: true })
  }

  const activeMembersForTagging = members.filter(
    (m) => m.status === 'active' && m.user_id !== currentUserId
  )

  const remainingExistingAttachments = existingAttachments.filter(
    (att) => !removedAttachmentIds.includes(att.id)
  )

  const busy = isSubmitting || saveMutation.isPending
  const isCorrectionEntry = Boolean(correctionOfLog || editingLog?.correction_of_log_id)

  const handleValidSubmit = async (values: DailyLogFormInput) => {
    setSubmitError(null)
    if (isCorrectionEntry && (values.correctionReason?.trim().length ?? 0) < 5) {
      setSubmitError('Alasan koreksi wajib diisi minimal 5 karakter.')
      return
    }
    return saveMutation.mutateAsync(values)
  }

  const handleFormInvalid = (fieldErrors: FieldErrors<DailyLogFormInput>) => {
    const firstField = Object.keys(fieldErrors)[0]
    if (firstField && scrollContainerRef.current) {
      const errorEl = scrollContainerRef.current.querySelector<HTMLElement>(
        `[name="${firstField}"], #${firstField}, [data-field="${firstField}"]`
      )
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        errorEl.focus?.({ preventScroll: true })
      }
    }
  }

  return (
    <form
      id="logbook-form"
      onSubmit={(e) => {
        handleSubmit(handleValidSubmit, handleFormInvalid)(e)
      }}
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      {/* BODY — SCROLLABLE */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto modal-body-scroll p-4 sm:p-6 space-y-4"
      >
        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {isCorrectionEntry && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2 text-xs">
            <div className="font-semibold text-charcoal">
              {correctionOfLog
                ? `Koreksi atas logbook terverifikasi: "${correctionOfLog.title}" (${formatLogbookDate(correctionOfLog.log_date)})`
                : 'Menyunting Catatan Koreksi Logbook'}
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Catatan asli yang terverifikasi tetap utuh dan terkunci. Jelaskan alasan koreksi secara ringkas:
            </p>
            <div className="space-y-1">
              <label htmlFor="correctionReason" className="text-xs font-medium text-charcoal block">
                Alasan Koreksi <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="correctionReason"
                rows={2}
                placeholder="Contoh: Revisi durasi pelaksanaan dan penambahan peserta kegiatan sesuai berita acara."
                {...register('correctionReason')}
                className="flex w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              />
              {errors.correctionReason && (
                <p className="text-[11px] text-rose-600">{errors.correctionReason.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="logDate" className="text-xs font-medium text-charcoal block">
              Tanggal Kegiatan <span className="text-rose-600">*</span>
            </label>
            <Input id="logDate" type="date" max={today} {...register('logDate')} className="text-xs" />
            {errors.logDate && (
              <p className="text-[11px] text-rose-600">{errors.logDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="activityCategory" className="text-xs font-medium text-charcoal block">
              Jenis / Kategori Kegiatan <span className="text-rose-600">*</span>
            </label>
            <select
              id="activityCategory"
              {...register('activityCategory')}
              className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              {LOGBOOK_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.activityCategory && (
              <p className="text-[11px] text-rose-600">{errors.activityCategory.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="title" className="text-xs font-medium text-charcoal block">
            Judul Kegiatan <span className="text-rose-600">*</span>
          </label>
          <Input
            id="title"
            type="text"
            placeholder="Contoh: Sosialisasi Pemasaran Digital Tenun di Dusun Lauk"
            {...register('title')}
            className="text-xs"
          />
          {errors.title && (
            <p className="text-[11px] text-rose-600">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="workProgramId" className="text-xs font-medium text-charcoal block">
              Program Kerja Terkait <span className="text-charcoal-muted font-normal">(opsional)</span>
            </label>
            <select
              id="workProgramId"
              {...register('workProgramId')}
              className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <option value="">Tidak terikat program kerja (kegiatan umum)</option>
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-xs font-medium text-charcoal block">Lokasi</label>
              <Input
                id="location"
                type="text"
                placeholder="Balai Dusun / Posko"
                {...register('location')}
                className="text-xs"
              />
              {errors.location && (
                <p className="text-[11px] text-rose-600">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="durationMinutesRaw" className="text-xs font-medium text-charcoal block">Durasi (menit)</label>
              <Input
                id="durationMinutesRaw"
                type="number"
                min={1}
                max={1440}
                placeholder="90"
                {...register('durationMinutesRaw')}
                className="text-xs"
              />
              {errors.durationMinutesRaw && (
                <p className="text-[11px] text-rose-600">{errors.durationMinutesRaw.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="content" className="text-xs font-medium text-charcoal block">
            Deskripsi Pelaksanaan Kegiatan <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="content"
            rows={4}
            placeholder="Jelaskan kegiatan yang dilaksanakan, capaian lapangan, kendala, dan tindak lanjut..."
            {...register('content')}
            className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          />
          {errors.content && (
            <p className="text-[11px] text-rose-600">{errors.content.message}</p>
          )}
        </div>

        {activeMembersForTagging.length > 0 && (
          <div className="space-y-2 rounded-lg border border-warm-200 bg-warm-50/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal">
              <Users className="h-3.5 w-3.5 text-sage-700" />
              <span>Anggota yang Terlibat (opsional)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeMembersForTagging.map((member) => {
                const checked = selectedParticipantIds.includes(member.user_id)
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => toggleParticipant(member.user_id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      checked
                        ? 'border-sage-600 bg-sage-100 text-sage-800 font-medium'
                        : 'border-warm-300 bg-white text-charcoal-muted hover:bg-warm-100'
                    }`}
                  >
                    {member.full_name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="space-y-2 rounded-lg border border-warm-200 bg-warm-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-charcoal block">
                Dokumentasi Foto / File Pendukung (Privat)
              </span>
              <span className="text-[11px] text-charcoal-muted">
                JPG, PNG, WebP, HEIC, PDF, DOCX/XLSX, atau video singkat. Maks 25 MB/file.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs gap-1.5"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>Pilih File</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,video/mp4,video/quicktime,video/webm"
              onChange={handleFilePick}
              className="hidden"
            />
          </div>

          {fileError && <p className="text-[11px] text-rose-600">{fileError}</p>}

          {remainingExistingAttachments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-charcoal-muted block">
                Lampiran tersimpan:
              </span>
              {remainingExistingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 rounded border border-warm-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate text-charcoal">
                    {att.file?.original_name || 'Berkas dokumentasi'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                    className="text-rose-600 hover:text-rose-700 p-1"
                    title="Hapus lampiran ini saat menyimpan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-charcoal-muted block">
                File baru siap diunggah ({selectedFiles.length}):
              </span>
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded border border-sage-200 bg-sage-50/50 px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate text-charcoal">{file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-charcoal-muted hover:text-rose-600 p-1"
                    title="Batalkan pilihan file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsDraftValue}
            onChange={(e) => setValue('saveAsDraft', e.target.checked, { shouldDirty: true })}
            className="mt-0.5 rounded border-warm-300 text-sage-700 focus:ring-sage-500"
          />
          <div className="text-xs">
            <span className="font-medium text-charcoal block">Simpan sebagai draf dulu</span>
            <span className="text-[11px] text-charcoal-muted">
              Jika tidak dicentang, catatan langsung berstatus Tercatat dan siap diperiksa oleh DPL.
            </span>
          </div>
        </label>
      </div>

      {/* FOOTER — STICKY / FIXED */}
      <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={busy}
          className="text-xs min-h-[38px] px-4"
        >
          Batal
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={busy}
          className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5 min-h-[38px] px-4"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>
            {editingLog
              ? 'Simpan Perubahan'
              : correctionOfLog
                ? 'Simpan Koreksi'
                : 'Simpan Catatan'}
          </span>
        </Button>
      </div>
    </form>
  )
}

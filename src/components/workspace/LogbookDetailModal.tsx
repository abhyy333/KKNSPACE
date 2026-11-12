import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  History,
  Loader2,
  MapPin,
  RotateCcw,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import { reviewDailyLogEntry } from '@/services/logbookApi'
import {
  formatLogbookDate,
  formatLogbookDuration,
  LOGBOOK_CATEGORY_LABELS,
  LOGBOOK_STATUS_META,
} from '@/lib/logbook'
import type {
  DailyLog,
  DailyLogAttachment,
  DailyLogParticipant,
  DailyLogReview,
  DailyLogReviewDecision,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'

interface LogbookDetailModalProps {
  log: DailyLog | null
  onClose: () => void
  attachments: DailyLogAttachment[]
  participants: DailyLogParticipant[]
  reviews: DailyLogReview[]
  ancestorLogs: DailyLog[]
  descendantLogs: DailyLog[]
  program: WorkProgram | null
  membersById: Record<string, WorkspaceMemberSummary>
  canVerify: boolean
  canCreateCorrection?: boolean
  onCreateCorrection?: (log: DailyLog) => void
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const LogbookDetailModal: React.FC<LogbookDetailModalProps> = ({
  log,
  onClose,
  attachments,
  participants,
  reviews,
  ancestorLogs,
  descendantLogs,
  program,
  membersById,
  canVerify,
  canCreateCorrection = false,
  onCreateCorrection,
}) => {
  if (!log) return null

  return (
    <Modal
      open={Boolean(log)}
      onClose={onClose}
      title={log.title}
      description={`Catatan aktivitas tanggal ${formatLogbookDate(log.log_date)}`}
      maxWidthClass="max-w-2xl"
    >
      <LogbookDetailBody
        key={log.id}
        log={log}
        onClose={onClose}
        attachments={attachments}
        participants={participants}
        reviews={reviews}
        ancestorLogs={ancestorLogs}
        descendantLogs={descendantLogs}
        program={program}
        membersById={membersById}
        canVerify={canVerify}
        canCreateCorrection={canCreateCorrection}
        onCreateCorrection={onCreateCorrection}
      />
    </Modal>
  )
}

type LogbookDetailBodyProps = Omit<LogbookDetailModalProps, 'log'> & { log: DailyLog }

const LogbookDetailBody: React.FC<LogbookDetailBodyProps> = ({
  log,
  onClose,
  attachments,
  participants,
  reviews,
  ancestorLogs,
  descendantLogs,
  program,
  membersById,
  canVerify,
  canCreateCorrection = false,
  onCreateCorrection,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loadingFileKey, setLoadingFileKey] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)

  const statusMeta = LOGBOOK_STATUS_META[log.verification_status]
  const author = membersById[log.author_id]
  const verifier = log.verified_by ? membersById[log.verified_by] : undefined

  const reviewMutation = useMutation({
    mutationFn: (decision: DailyLogReviewDecision) =>
      reviewDailyLogEntry({
        logId: log.id,
        decision,
        note: reviewNote,
      }),
    onSuccess: async (_saved, decision) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-bundle'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'logbook-team-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'work-program-log-summaries'] }),
      ])
      toast({
        title: decision === 'verified' ? 'Logbook Diverifikasi' : 'Permintaan Revisi Dikirim',
        description:
          decision === 'verified'
            ? 'Catatan aktivitas telah diverifikasi oleh DPL dan terkunci dari sunting/hapus.'
            : 'Status catatan diperbarui menjadi Perlu Revisi beserta catatan DPL.',
        variant: 'success',
      })
      onClose()
    },
    onError: (err) => {
      setReviewError(err instanceof Error ? err.message : 'Gagal menyimpan keputusan verifikasi.')
    },
  })

  const handleReviewSubmit = (decision: DailyLogReviewDecision) => {
    setReviewError(null)
    if (decision === 'revision_requested' && reviewNote.trim().length < 3) {
      setReviewError('Catatan revisi wajib diisi oleh DPL (minimal 3 karakter).')
      return
    }
    void reviewMutation.mutateAsync(decision)
  }

  const handleOpenAttachment = async (fileId: string, download: boolean) => {
    const key = `${fileId}:${download ? 'dl' : 'view'}`
    setLoadingFileKey(key)
    try {
      const res = await getPrivateFileSignedUrl(fileId, download)
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        title: 'Gagal Membuka Lampiran',
        description:
          err instanceof Error
            ? err.message
            : 'Tidak memiliki izin atau tautan sementara gagal dibuat.',
        variant: 'error',
      })
    } finally {
      setLoadingFileKey(null)
    }
  }

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {LOGBOOK_CATEGORY_LABELS[log.activity_category]}
          </Badge>
          <Badge variant={statusMeta.variant} className="text-[11px]">
            {statusMeta.label}
          </Badge>
          {log.correction_of_log_id && (
            <Badge variant="warning" className="text-[11px] gap-1">
              <GitBranch className="h-3 w-3" />
              <span>Catatan Koreksi</span>
            </Badge>
          )}
          {program && (
            <Badge variant="secondary" className="text-[11px] gap-1">
              <Award className="h-3 w-3" />
              <span>Proker: {program.title}</span>
            </Badge>
          )}
        </div>

        {log.correction_of_log_id && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-charcoal">
              <GitBranch className="h-3.5 w-3.5 text-amber-700" />
              <span>Rantai Koreksi (Asal Catatan)</span>
            </div>
            {ancestorLogs.length > 0 ? (
              <div className="space-y-1">
                {ancestorLogs.map((anc, idx) => (
                  <div key={anc.id} className="text-[11px] text-charcoal-muted">
                    {idx === 0 ? 'Catatan awal: ' : `Koreksi #${idx}: `}
                    <span className="font-medium text-charcoal">
                      {anc.title} ({formatLogbookDate(anc.log_date)})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-charcoal-muted">
                Merujuk catatan: <span className="font-mono text-[11px]">{log.correction_of_log_id}</span>
              </div>
            )}
            {log.correction_reason && (
              <div className="text-charcoal">Alasan koreksi ini: {log.correction_reason}</div>
            )}
          </div>
        )}

        {descendantLogs.length > 0 && (
          <div className="rounded-lg border border-sage-200 bg-sage-50/60 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-charcoal">
              <GitBranch className="h-3.5 w-3.5 text-sage-700" />
              <span>Rantai Koreksi Lanjutan ({descendantLogs.length})</span>
            </div>
            <div className="space-y-1.5">
              {descendantLogs.map((corr) => {
                const corrMeta = LOGBOOK_STATUS_META[corr.verification_status]
                return (
                  <div
                    key={corr.id}
                    className="rounded border border-warm-200 bg-white px-2.5 py-1.5 space-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-charcoal">{corr.title}</span>
                      <Badge variant={corrMeta.variant} className="text-[10px]">
                        {corrMeta.label}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-charcoal-muted">
                      Tanggal {formatLogbookDate(corr.log_date)}
                      {corr.correction_reason ? ` · Alasan: ${corr.correction_reason}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {canCreateCorrection && onCreateCorrection && log.verification_status === 'verified' && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-xs">
            <span className="text-charcoal-muted">
              Catatan ini telah terverifikasi dan terkunci. Perlu pembaruan data?
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onClose()
                onCreateCorrection(log)
              }}
              className="h-7 px-2.5 text-[11px] gap-1 border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
            >
              <GitBranch className="h-3 w-3" />
              <span>Buat Koreksi</span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-warm-200 bg-warm-50/70 p-3 text-xs">
          <div className="flex items-center gap-2 text-charcoal">
            <User className="h-3.5 w-3.5 text-sage-700 shrink-0" />
            <span className="text-charcoal-muted">Pembuat:</span>
            <span className="font-medium truncate">
              {author?.full_name || 'Anggota KKN'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-charcoal">
            <Calendar className="h-3.5 w-3.5 text-sage-700 shrink-0" />
            <span className="text-charcoal-muted">Tanggal:</span>
            <span className="font-medium">{formatLogbookDate(log.log_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-charcoal">
            <MapPin className="h-3.5 w-3.5 text-sage-700 shrink-0" />
            <span className="text-charcoal-muted">Lokasi:</span>
            <span className="font-medium truncate">{log.location || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-charcoal">
            <Clock className="h-3.5 w-3.5 text-sage-700 shrink-0" />
            <span className="text-charcoal-muted">Durasi:</span>
            <span className="font-medium">{formatLogbookDuration(log.duration_minutes)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-charcoal">Deskripsi Kegiatan</h4>
          <div className="rounded-lg border border-warm-200 bg-white p-3.5 text-xs text-charcoal leading-relaxed whitespace-pre-line">
            {log.content}
          </div>
        </div>

        {participants.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
              <Users className="h-3.5 w-3.5 text-sage-700" />
              <span>Anggota Terlibat ({participants.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {participants.map((p) => (
                <Badge key={p.id} variant="outline" className="text-[11px]">
                  {membersById[p.user_id]?.full_name || 'Anggota KKN'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-charcoal">
            Dokumentasi &amp; Lampiran ({attachments.length})
          </h4>
          {attachments.length === 0 ? (
            <p className="text-xs text-charcoal-muted rounded-lg border border-dashed border-warm-300 bg-warm-50/40 px-3 py-2.5">
              Tidak ada file atau foto dokumentasi yang dilampirkan.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => {
                const fileName = att.file?.original_name || 'Lampiran privat'
                const viewing = loadingFileKey === `${att.file_id}:view`
                const downloading = loadingFileKey === `${att.file_id}:dl`
                return (
                  <div
                    key={att.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warm-200 bg-warm-50/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-sage-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-charcoal truncate">
                          {fileName}
                        </div>
                        {att.file?.file_size != null && (
                          <div className="text-[11px] text-charcoal-muted">
                            {Math.max(1, Math.round(att.file.file_size / 1024))} KB
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(loadingFileKey)}
                        onClick={() => handleOpenAttachment(att.file_id, false)}
                        className="h-7 px-2.5 text-[11px] gap-1"
                      >
                        {viewing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                        <span>Lihat</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(loadingFileKey)}
                        onClick={() => handleOpenAttachment(att.file_id, true)}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        {downloading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span>Unduh</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* DPL Verification Panel */}
        {canVerify && log.verification_status === 'submitted' && (
          <div className="rounded-lg border border-sage-200 bg-sage-50/70 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
              <ShieldCheck className="h-4 w-4 text-sage-700" />
              <span>Panel Verifikasi Akhir (DPL / Super Admin)</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Catatan yang diverifikasi akan terkunci dari sunting/hapus; koreksi selanjutnya hanya melalui catatan koreksi baru yang terhubung.
            </p>
            {reviewError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-800 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{reviewError}</span>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-charcoal block">
                Catatan Pemeriksaan DPL{' '}
                <span className="text-charcoal-muted font-normal">
                  (opsional saat verifikasi, wajib saat minta revisi)
                </span>
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                disabled={reviewMutation.isPending}
                placeholder="Tuliskan apresiasi atau arahan revisi untuk mahasiswa..."
                className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={reviewMutation.isPending}
                onClick={() => handleReviewSubmit('revision_requested')}
                className="text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                {reviewMutation.isPending && reviewMutation.variables === 'revision_requested' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Minta Revisi</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={reviewMutation.isPending}
                onClick={() => handleReviewSubmit('verified')}
                className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
              >
                {reviewMutation.isPending && reviewMutation.variables === 'verified' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Verifikasi Logbook</span>
              </Button>
            </div>
          </div>
        )}

        {/* Append-only Review History */}
        {reviews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
              <History className="h-3.5 w-3.5 text-sage-700" />
              <span>Riwayat Pemeriksaan DPL ({reviews.length})</span>
            </div>
            <div className="space-y-1.5">
              {reviews.map((rev) => {
                const reviewer = membersById[rev.reviewer_id]
                const isVerified = rev.decision === 'verified'
                return (
                  <div
                    key={rev.id}
                    className="rounded-lg border border-warm-200 bg-white px-3 py-2 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isVerified ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {isVerified ? 'Terverifikasi' : 'Perlu Revisi'}
                        </Badge>
                        <span className="font-medium text-charcoal">
                          {reviewer?.full_name ||
                            (rev.reviewer_authority === 'super_admin' ? 'Super Admin' : 'DPL')}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {rev.reviewer_authority === 'super_admin' ? 'Super Admin' : 'DPL'}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-charcoal-muted">
                        {formatDateTime(rev.reviewed_at)}
                      </span>
                    </div>
                    {rev.note && <p className="text-[11px] text-charcoal">{rev.note}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Audit & Verification Metadata */}
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 text-[11px] text-charcoal-muted space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-charcoal">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-700" />
            <span>Jejak Audit &amp; Status Pemeriksaan</span>
          </div>
          <div>Dibuat: {formatDateTime(log.created_at)} · Diperbarui: {formatDateTime(log.updated_at)}</div>
          {log.submitted_at && <div>Waktu Pencatatan/Pengajuan: {formatDateTime(log.submitted_at)}</div>}
          {log.verified_by && (
            <div>
              Pemeriksa: {verifier?.full_name || 'Pemeriksa'} · {formatDateTime(log.verified_at)}
            </div>
          )}
          {log.verification_note && (
            <div className="text-charcoal pt-1">Catatan pemeriksa: {log.verification_note}</div>
          )}
        </div>
    </div>
  )
}

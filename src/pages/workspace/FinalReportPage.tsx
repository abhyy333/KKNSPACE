import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { fetchWorkspaceMembers } from '@/services/dashboardApi'
import { formatBytes, getPrivateFileSignedUrl } from '@/services/storageApi'
import {
  createReportRecord,
  fetchReportsBundle,
  reportReviewSchema,
  reportTitleSchema,
  submitDplReportReview,
  submitNewReportVersion,
  type ReportBundleItem,
  type ReportReviewInput,
  type ReportTitleInput,
} from '@/services/reportsApi'
import type { ReportStatus, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Upload,
} from 'lucide-react'

const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; variant: 'outline' | 'secondary' | 'warning' | 'success' }
> = {
  draft: { label: 'Draf Awal', variant: 'outline' },
  submitted: { label: 'Menunggu Review DPL', variant: 'secondary' },
  revision_requested: { label: 'Perlu Revisi DPL', variant: 'warning' },
  approved: { label: 'Disetujui DPL', variant: 'success' },
}

export const FinalReportPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { membership, isSuperAdmin } = useAuth()

  const isLeadOrAdmin =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'
  const isDpl = isSuperAdmin || membership?.role === 'dpl'

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [uploadTargetReport, setUploadTargetReport] =
    useState<ReportBundleItem | null>(null)
  const [reviewTargetReport, setReviewTargetReport] =
    useState<ReportBundleItem | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const {
    data: reports = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'reports-bundle'],
    queryFn: fetchReportsBundle,
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

  const createForm = useForm<ReportTitleInput>({
    resolver: zodResolver(reportTitleSchema),
    defaultValues: { title: '' },
  })

  const reviewForm = useForm<ReportReviewInput>({
    resolver: zodResolver(reportReviewSchema),
    defaultValues: {
      decision: 'approved',
      comments: '',
    },
  })

  const invalidateReports = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'reports-bundle'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: createReportRecord,
    onSuccess: async () => {
      createForm.reset({ title: '' })
      setModalError(null)
      setCreateModalOpen(false)
      await invalidateReports()
      toast({
        title: 'Laporan Dibuat',
        description: 'Entri laporan baru siap menerima unggahan draf versi 1.',
        variant: 'success',
      })
    },
    onError: (err) => {
      setModalError(err instanceof Error ? err.message : 'Gagal membuat laporan.')
    },
  })

  const uploadVersionMutation = useMutation({
    mutationFn: ({
      reportId,
      file,
      nextVersion,
    }: {
      reportId: string
      file: File
      nextVersion: number
    }) => submitNewReportVersion(reportId, file, nextVersion),
    onSuccess: async () => {
      setVersionFile(null)
      setModalError(null)
      setUploadTargetReport(null)
      await invalidateReports()
      toast({
        title: 'Versi Laporan Diajukan',
        description: 'Berkas versi terbaru telah dikirim untuk ditinjau DPL.',
        variant: 'success',
      })
    },
    onError: (err) => {
      setModalError(
        err instanceof Error ? err.message : 'Gagal mengunggah versi laporan.'
      )
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({
      versionId,
      values,
    }: {
      versionId: string
      values: ReportReviewInput
    }) => submitDplReportReview(versionId, values),
    onSuccess: async () => {
      reviewForm.reset({ decision: 'approved', comments: '' })
      setModalError(null)
      setReviewTargetReport(null)
      await invalidateReports()
      toast({
        title: 'Review DPL Tersimpan',
        description: 'Keputusan persetujuan/revisi telah dicatat dan menyinkronkan status laporan.',
        variant: 'success',
      })
    },
    onError: (err) => {
      setModalError(err instanceof Error ? err.message : 'Gagal mengirim review.')
    },
  })

  const handleDownloadVersion = async (fileId: string) => {
    try {
      const signed = await getPrivateFileSignedUrl(fileId, true)
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        title: 'Gagal Mengunduh Laporan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Hasil &amp; Laporan Akhir Kegiatan (DPL)
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Unggah versi laporan KKN secara berurutan (immutable) untuk ditinjau dan disetujui oleh Dosen Pembimbing Lapangan.
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
              onClick={() => {
                setModalError(null)
                createForm.reset({ title: '' })
                setCreateModalOpen(true)
              }}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Buat Dokumen Laporan</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-16 w-full" />
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
                  Gagal Memuat Laporan Akhir
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
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <FileCheck2 className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Belum ada laporan akhir yang dibuat
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              {isLeadOrAdmin
                ? 'Klik "Buat Dokumen Laporan" lalu unggah berkas PDF/DOCX versi pertama agar dapat ditinjau DPL.'
                : 'Ketua atau Sekretaris akan membuat entri laporan dan mengajukan berkas untuk diperiksa DPL.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {reports.map((report) => {
            const statusMeta = REPORT_STATUS_META[report.status]
            const latestVersionNum = report.versions[0]?.version_number ?? 0
            const canSubmitVersion = isLeadOrAdmin && report.status !== 'approved'
            const canDplReview =
              isDpl &&
              report.status === 'submitted' &&
              Boolean(report.current_version_id)

            return (
              <Card key={report.id}>
                <CardHeader className="pb-3 border-b border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base font-serif">
                        {report.title}
                      </CardTitle>
                      <Badge variant={statusMeta.variant} className="text-[10px]">
                        {statusMeta.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Total {report.versions.length} versi tersimpan · Terakhir diperbarui{' '}
                      {new Date(report.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canSubmitVersion && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setModalError(null)
                          setVersionFile(null)
                          setUploadTargetReport(report)
                        }}
                        className="text-xs gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>
                          Unggah Versi {latestVersionNum + 1}
                        </span>
                      </Button>
                    )}

                    {canDplReview && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setModalError(null)
                          reviewForm.reset({ decision: 'approved', comments: '' })
                          setReviewTargetReport(report)
                        }}
                        className="text-xs gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Tinjau &amp; Beri Keputusan (DPL)</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {report.versions.length === 0 ? (
                    <div className="rounded-md border border-dashed border-warm-300 bg-warm-50 p-4 text-center text-xs text-charcoal-muted">
                      Belum ada berkas versi yang diunggah untuk laporan ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                        <History className="h-3.5 w-3.5" />
                        <span>Riwayat Versi &amp; Catatan Review</span>
                      </div>

                      {report.versions.map((ver) => {
                        const submitter = ver.submitted_by
                          ? memberMap.get(ver.submitted_by)
                          : undefined
                        const isCurrent = report.current_version_id === ver.id

                        return (
                          <div
                            key={ver.id}
                            className={`rounded-lg border p-3.5 space-y-2.5 ${
                              isCurrent
                                ? 'border-sage-300 bg-sage-50/40'
                                : 'border-warm-200 bg-warm-50/50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <FileText className="h-4 w-4 text-sage-700 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-charcoal">
                                      Versi {ver.version_number}
                                    </span>
                                    {isCurrent && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Versi Aktif
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-charcoal-muted truncate">
                                    {ver.file?.original_name || 'Berkas laporan'}{' '}
                                    {ver.file ? `(${formatBytes(ver.file.file_size)})` : ''}
                                    {' · Diajukan '}
                                    {submitter?.full_name || 'Pengurus'} pada{' '}
                                    {ver.submitted_at
                                      ? new Date(ver.submitted_at).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })
                                      : '-'}
                                  </p>
                                </div>
                              </div>

                              {ver.file_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadVersion(ver.file_id!)}
                                  className="h-7 px-2.5 text-[11px] gap-1 self-end sm:self-center shrink-0"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Unduh v{ver.version_number}</span>
                                </Button>
                              )}
                            </div>

                            {ver.reviews.length > 0 && (
                              <div className="space-y-1.5 border-t border-warm-200/80 pt-2">
                                {ver.reviews.map((rev) => {
                                  const reviewer = memberMap.get(rev.reviewer_id)
                                  return (
                                    <div
                                      key={rev.id}
                                      className="rounded-md bg-white border border-warm-200 px-3 py-2 text-xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-charcoal inline-flex items-center gap-1.5">
                                          <MessageSquare className="h-3.5 w-3.5 text-sage-700" />
                                          {rev.reviewer_authority === 'super_admin'
                                            ? `Review Super Admin (${reviewer?.full_name || 'Super Admin'})`
                                            : `Review DPL (${reviewer?.full_name || 'DPL'})`}
                                        </span>
                                        <Badge
                                          variant={
                                            rev.decision === 'approved'
                                              ? 'success'
                                              : 'warning'
                                          }
                                          className="text-[10px]"
                                        >
                                          {rev.decision === 'approved'
                                            ? 'Disetujui'
                                            : 'Minta Revisi'}
                                        </Badge>
                                      </div>
                                      {rev.comments && (
                                        <p className="text-xs text-charcoal-muted whitespace-pre-line">
                                          {rev.comments}
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Buat Laporan */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Buat Dokumen Laporan Akhir"
        description="Buat entri laporan baru (misal: Laporan Akhir KKN Kelompok atau Laporan Keuangan Final)."
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          className="space-y-4"
        >
          {modalError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="report-title" className="text-xs font-medium text-charcoal block">
              Judul Laporan <span className="text-red-500">*</span>
            </label>
            <Input
              id="report-title"
              placeholder="Misal: Laporan Akhir Pengabdian KKN Desa 2026"
              {...createForm.register('title')}
            />
            {createForm.formState.errors.title && (
              <p className="text-[11px] text-red-600">
                {createForm.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Buat Laporan</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Unggah Versi Baru */}
      <Modal
        open={Boolean(uploadTargetReport)}
        onClose={() => setUploadTargetReport(null)}
        title={`Unggah Versi ${(uploadTargetReport?.versions[0]?.version_number ?? 0) + 1}`}
        description={
          uploadTargetReport
            ? `Berkas baru bersifat immutable (tidak menimpa versi lama) dan langsung diajukan ke DPL untuk "${uploadTargetReport.title}".`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          {modalError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <label
            htmlFor="report-version-file"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm-300 bg-warm-50/70 p-5 text-center cursor-pointer hover:border-sage-400"
          >
            <Upload className="h-5 w-5 text-sage-700 mb-1" />
            <span className="text-xs font-medium text-charcoal">
              {versionFile ? versionFile.name : 'Pilih berkas PDF atau DOCX laporan'}
            </span>
            {versionFile && (
              <span className="text-[11px] text-charcoal-muted mt-0.5">
                {formatBytes(versionFile.size)}
              </span>
            )}
            <input
              id="report-version-file"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUploadTargetReport(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={uploadVersionMutation.isPending}
              onClick={() => {
                if (!uploadTargetReport) return
                if (!versionFile) {
                  setModalError('Pilih berkas laporan terlebih dahulu.')
                  return
                }
                const nextVersion =
                  (uploadTargetReport.versions[0]?.version_number ?? 0) + 1
                uploadVersionMutation.mutate({
                  reportId: uploadTargetReport.id,
                  file: versionFile,
                  nextVersion,
                })
              }}
              className="gap-1.5"
            >
              {uploadVersionMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Unggah &amp; Ajukan ke DPL</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Review DPL */}
      <Modal
        open={Boolean(reviewTargetReport)}
        onClose={() => setReviewTargetReport(null)}
        title="Keputusan Review Resmi DPL"
        description={
          reviewTargetReport
            ? `Berikan persetujuan atau catatan revisi untuk versi aktif "${reviewTargetReport.title}".`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={reviewForm.handleSubmit((values) => {
            if (!reviewTargetReport?.current_version_id) return
            reviewMutation.mutate({
              versionId: reviewTargetReport.current_version_id,
              values,
            })
          })}
          className="space-y-4"
        >
          {modalError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="review-decision" className="text-xs font-medium text-charcoal block">
              Keputusan <span className="text-red-500">*</span>
            </label>
            <select
              id="review-decision"
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal"
              {...reviewForm.register('decision')}
            >
              <option value="approved">Setujui Laporan Akhir (Approved)</option>
              <option value="revision_requested">Minta Revisi Tim KKN</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="review-comments" className="text-xs font-medium text-charcoal block">
              Catatan / Masukan DPL
            </label>
            <textarea
              id="review-comments"
              rows={4}
              placeholder="Tuliskan umpan balik atau bagian yang perlu direvisi oleh kelompok..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...reviewForm.register('comments')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReviewTargetReport(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={reviewMutation.isPending}
              className="gap-1.5"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Kirim Keputusan</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

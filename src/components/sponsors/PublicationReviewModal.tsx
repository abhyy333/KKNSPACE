import React, { useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { reviewSponsorPublication } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from './SponsorLogoThumbnail'
import type { Sponsor } from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
} from '@/types/sponsor'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react'

interface PublicationReviewModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sponsor: Sponsor | null
  mode: 'approve' | 'reject' | 'withdraw'
}

export const PublicationReviewModal: React.FC<PublicationReviewModalProps> = ({
  open,
  onClose,
  onSuccess,
  sponsor,
  mode,
}) => {
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!sponsor) return null

  const handleConfirm = async () => {
    setErrorMsg(null)
    if (mode === 'reject' && !reason.trim()) {
      setErrorMsg('Alasan penolakan / revisi wajib dicantumkan agar pengurus dapat memperbaikinya.')
      return
    }

    setIsSubmitting(true)

    try {
      await reviewSponsorPublication(sponsor.id, mode, reason.trim())

      let title = 'Publikasi Disetujui'
      let desc = `Logo dan profil sponsor "${sponsor.name}" kini resmi dipublikasikan di website.`

      if (mode === 'reject') {
        title = 'Pengajuan Ditolak / Perlu Revisi'
        desc = `Pengajuan sponsor "${sponsor.name}" telah dikembalikan dengan catatan revisi.`
      } else if (mode === 'withdraw') {
        title = 'Publikasi Ditarik'
        desc = `Sponsor "${sponsor.name}" telah ditarik dari tampilan publik.`
      }

      toast({
        title,
        description: desc,
        variant: mode === 'approve' ? 'success' : 'info',
      })

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses persetujuan publikasi.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalTitle =
    mode === 'approve'
      ? 'Setujui Publikasi Sponsor'
      : mode === 'reject'
      ? 'Tolak / Minta Revisi Publikasi'
      : 'Tarik Publikasi Sponsor dari Website'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      description={`Konfirmasi tindakan publikasi untuk sponsor "${sponsor.name}".`}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Sponsor Card Preview */}
        <div className="rounded-xl border border-warm-300 bg-warm-50/70 p-3.5 flex items-center gap-3.5">
          <SponsorLogoThumbnail
            fileId={sponsor.logo_file_id}
            sponsorId={sponsor.id}
            alt={sponsor.name}
            containerClassName="w-16 h-12 bg-white rounded-lg border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-xs font-semibold text-charcoal truncate">{sponsor.name}</h4>
            <div className="flex items-center gap-2 text-[11px] text-charcoal-muted">
              <span>{SPONSOR_CATEGORY_LABELS[sponsor.category]}</span>
              <span>•</span>
              <span>{SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}</span>
            </div>
            {sponsor.start_date && (
              <span className="text-[10px] text-charcoal-muted flex items-center gap-1 font-mono">
                <Calendar className="h-3 w-3 text-forest" />
                {sponsor.start_date} {sponsor.end_date ? `s.d. ${sponsor.end_date}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Action description / inputs */}
        {mode === 'approve' && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold">Publikasikan ke Website Resmi</p>
              <p className="mt-0.5 leading-relaxed text-emerald-900/80">
                Setelah disetujui, logo dan profil sponsor akan langsung tampil di Homepage, halaman <code>/sponsors</code>, dan footer publik.
              </p>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Catatan Revisi / Alasan Penolakan</p>
                <p className="mt-0.5 leading-relaxed text-amber-900/80">
                  Tuliskan alasan mengapa profil sponsor perlu diperbaiki (misal: logo buram, tautan tidak valid, atau rincian kontribusi belum lengkap).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">
                Alasan Penolakan / Catatan Perbaikan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Logo yang diunggah resolusinya terlalu kecil, mohon diganti dengan logo PNG beresolusi tinggi..."
                required
                className="w-full text-xs rounded-lg border border-warm-300 bg-white p-3 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              />
            </div>
          </div>
        )}

        {mode === 'withdraw' && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-800 text-xs">
            <XCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Tarik dari Tampilan Publik</p>
              <p className="mt-0.5 leading-relaxed text-rose-900/80">
                Sponsor tidak akan lagi terlihat oleh pengunjung di website publik. Data internal, riwayat interaksi, dan catatan negosiasi tetap tersimpan utuh di sistem.
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`gap-1.5 shadow-subtle text-white ${
              mode === 'approve'
                ? 'bg-forest hover:bg-forest/90'
                : mode === 'reject'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {mode === 'approve'
                ? 'Konfirmasi & Setujui'
                : mode === 'reject'
                ? 'Kirim Catatan Revisi'
                : 'Tarik Publikasi'}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

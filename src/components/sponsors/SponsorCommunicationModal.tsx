import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  fetchSponsorCommunications,
  addSponsorCommunication,
} from '@/services/sponsorsApi'
import type { Sponsor, SponsorCommunication } from '@/types/sponsor'
import {
  MessageSquare,
  Calendar,
  Clock,
  User,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface SponsorCommunicationModalProps {
  open: boolean
  onClose: () => void
  sponsor: Sponsor | null
  onCommunicationAdded?: () => void
}

export const SponsorCommunicationModal: React.FC<SponsorCommunicationModalProps> = ({
  open,
  onClose,
  sponsor,
  onCommunicationAdded,
}) => {
  const { toast } = useToast()
  const [communications, setCommunications] = useState<SponsorCommunication[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // New entry form
  const [actionSummary, setActionSummary] = useState('')
  const [communicationResult, setCommunicationResult] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const loadCommunications = async () => {
    if (!sponsor?.id) return
    setIsLoading(true)
    try {
      const data = await fetchSponsorCommunications(sponsor.id)
      setCommunications(data)
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && sponsor?.id) {
      loadCommunications()
      setActionSummary('')
      setCommunicationResult('')
      setFollowUpDate('')
      setShowAddForm(false)
      setErrorMsg(null)
    }
  }, [open, sponsor?.id])

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sponsor?.id) return
    if (!actionSummary.trim()) {
      setErrorMsg('Ringkasan tindakan komunikasi wajib diisi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      await addSponsorCommunication({
        sponsor_id: sponsor.id,
        action_summary: actionSummary.trim(),
        communication_result: communicationResult.trim() || null,
        follow_up_date: followUpDate || null,
      })

      toast({
        title: 'Tindak Lanjut Dicatat',
        description: 'Riwayat komunikasi sponsor berhasil disimpan ke sistem.',
        variant: 'success',
      })

      setActionSummary('')
      setCommunicationResult('')
      setFollowUpDate('')
      setShowAddForm(false)
      await loadCommunications()
      onCommunicationAdded?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat komunikasi.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Riwayat Komunikasi — ${sponsor?.name || 'Sponsor'}`}
      description="Catatan tindak lanjut dan rekam jejak koordinasi internal KKN dengan calon / mitra sponsor."
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-5">
        {/* Header action button */}
        <div className="flex items-center justify-between border-b border-warm-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal">
            <MessageSquare className="h-4 w-4 text-forest" />
            <span>{communications.length} Catatan Interaksi</span>
          </div>
          {!showAddForm && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Interaksi</span>
            </Button>
          )}
        </div>

        {/* Form add new interaction */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitNew}
            className="rounded-xl border border-forest/20 bg-forest/5 p-4 space-y-3.5 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-forest">Catat Komunikasi Baru</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-charcoal-muted hover:text-charcoal"
              >
                Batal
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-[11px] text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal">
                Ringkasan Tindakan <span className="text-rose-500">*</span>
              </label>
              <Input
                value={actionSummary}
                onChange={(e) => setActionSummary(e.target.value)}
                placeholder="Contoh: Mengirim proposal kerja sama via email / Follow up via WhatsApp"
                required
                className="text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal">
                Hasil / Respon Komunikasi (Opsional)
              </label>
              <textarea
                rows={2}
                value={communicationResult}
                onChange={(e) => setCommunicationResult(e.target.value)}
                placeholder="Contoh: PIC menyambut baik dan meminta presentasi online minggu depan"
                className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal flex items-center gap-1">
                <Calendar className="h-3 w-3 text-forest" />
                Jadwal Follow-up Berikutnya (Opsional)
              </label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 shadow-2xs"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Simpan Interaksi</span>
              </Button>
            </div>
          </form>
        )}

        {/* Timeline List */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-charcoal-muted">
            <Loader2 className="h-5 w-5 animate-spin text-forest" />
            <span className="text-xs">Memuat riwayat komunikasi...</span>
          </div>
        ) : communications.length === 0 ? (
          <div className="py-8 text-center text-charcoal-muted border border-dashed border-warm-300 rounded-xl bg-warm-50/50 p-6">
            <MessageSquare className="h-8 w-8 text-warm-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-charcoal">Belum ada catatan komunikasi</p>
            <p className="text-[11px] text-charcoal-muted mt-0.5">
              Klik &quot;Tambah Interaksi&quot; untuk mencatat komunikasi proposal, telepon, atau pertemuan.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {communications.map((c) => {
              const dt = new Date(c.created_at)
              const formattedDate = new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Makassar',
              }).format(dt)

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-warm-200 bg-white p-3.5 shadow-2xs space-y-2 hover:border-warm-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-charcoal leading-snug">{c.action_summary}</p>
                      <div className="flex items-center gap-2 text-[10px] text-charcoal-muted">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-2.5 w-2.5" />
                          {c.author_profile?.full_name || 'Pengurus'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-2.5 w-2.5" />
                          {formattedDate} WITA
                        </span>
                      </div>
                    </div>

                    {c.follow_up_date && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        <Calendar className="h-2.5 w-2.5" />
                        Next: {c.follow_up_date}
                      </span>
                    )}
                  </div>

                  {c.communication_result && (
                    <div className="text-xs text-charcoal-muted bg-warm-50 rounded-lg p-2 border border-warm-200/60 leading-relaxed">
                      <span className="font-medium text-charcoal">Hasil: </span>
                      {c.communication_result}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  )
}

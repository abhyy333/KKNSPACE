import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  fetchBenefitFulfillments,
  createBenefitFulfillment,
  updateBenefitFulfillment,
  fetchTeamProfilesForSelect,
} from '@/services/sponsorsApi'
import type {
  SponsorAgreement,
  SponsorBenefitFulfillment,
  SponsorBenefitFulfillmentStatus,
} from '@/types/sponsor'
import {
  SPONSOR_BENEFIT_STATUS_LABELS,
  SPONSOR_BENEFIT_STATUS_COLORS,
  SPONSORSHIP_TIER_LABELS,
} from '@/types/sponsor'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Save,
  User,
  Calendar,
} from 'lucide-react'

interface BenefitFulfillmentModalProps {
  open: boolean
  onClose: () => void
  agreement: SponsorAgreement | null
  onSuccess: () => void
}

export const BenefitFulfillmentModal: React.FC<BenefitFulfillmentModalProps> = ({
  open,
  onClose,
  agreement,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [benefits, setBenefits] = useState<SponsorBenefitFulfillment[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Quick add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [newPicId, setNewPicId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Selected benefit for status update
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<SponsorBenefitFulfillmentStatus>('direncanakan')
  const [editNotes, setEditNotes] = useState('')
  const [editProofUrl, setEditProofUrl] = useState('')
  const [editCancellationReason, setEditCancellationReason] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const loadData = async () => {
    if (!agreement) return
    try {
      setIsLoading(true)
      const [bList, tList] = await Promise.all([
        fetchBenefitFulfillments(agreement.id),
        fetchTeamProfilesForSelect(),
      ])

      // If database has 0 fulfillments, but package_snapshot has default benefits,
      // seed them automatically so the team doesn't have to retype all items!
      if (bList.length === 0 && agreement.package_snapshot?.benefits?.length) {
        const seeded: SponsorBenefitFulfillment[] = []
        for (const title of agreement.package_snapshot.benefits) {
          const item = await createBenefitFulfillment({
            agreement_id: agreement.id,
            benefit_title: title,
            fulfillment_status: 'direncanakan',
          })
          seeded.push(item)
        }
        setBenefits(seeded)
      } else {
        setBenefits(bList)
      }

      setTeamMembers(tList)
    } catch (err: any) {
      toast({ title: 'Gagal memuat benefit', description: err.message, variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && agreement) {
      loadData()
    }
  }, [open, agreement])

  // Calculate fulfillment stats
  const totalCount = benefits.length
  const fulfilledCount = benefits.filter((b) => b.fulfillment_status === 'terpenuhi').length
  const progressPercent = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0

  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreement || !newTitle.trim()) return

    try {
      setIsAdding(true)
      const created = await createBenefitFulfillment({
        agreement_id: agreement.id,
        benefit_title: newTitle.trim(),
        benefit_description: newDesc.trim() || undefined,
        target_date: newTargetDate || undefined,
        responsible_user_id: newPicId || undefined,
        fulfillment_status: 'direncanakan',
      })
      setBenefits((prev) => [...prev, created])
      setNewTitle('')
      setNewDesc('')
      setNewTargetDate('')
      setShowAddForm(false)
      toast({ title: 'Benefit Ditambahkan', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Menambah Benefit', description: err.message, variant: 'error' })
    } finally {
      setIsAdding(false)
    }
  }

  const startEditBenefit = (b: SponsorBenefitFulfillment) => {
    setEditingBenefitId(b.id)
    setEditStatus(b.fulfillment_status)
    setEditNotes(b.fulfillment_notes || '')
    setEditProofUrl(b.proof_url || '')
    setEditCancellationReason(b.cancellation_reason || '')
  }

  const handleSaveBenefitUpdate = async (benefitId: string) => {
    if (
      (editStatus === 'dibatalkan' || editStatus === 'tidak_dapat_dipenuhi') &&
      !editCancellationReason.trim()
    ) {
      toast({ title: 'Alasan pembatalan/kegagalan wajib diisi', variant: 'error' })
      return
    }

    try {
      setIsUpdating(true)
      const updated = await updateBenefitFulfillment(benefitId, {
        fulfillment_status: editStatus,
        fulfillment_notes: editNotes.trim() || null,
        proof_url: editProofUrl.trim() || null,
        cancellation_reason: editCancellationReason.trim() || null,
      })

      setBenefits((prev) => prev.map((b) => (b.id === benefitId ? updated : b)))
      setEditingBenefitId(null)
      toast({ title: 'Status Benefit Diperbarui', variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Gagal Memperbarui Benefit', description: err.message, variant: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  if (!agreement) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pelacak Realisasi Benefit Sponsor"
      description={`Monitoring komitmen hak publikasi dan apresiasi untuk ${agreement.sponsor?.name || agreement.title}`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-6 text-xs">
        {/* Header Summary & Progress Bar */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono tracking-wider text-[#B19A6B] uppercase font-semibold block">
                {SPONSORSHIP_TIER_LABELS[agreement.tier_key]}
              </span>
              <h4 className="text-sm font-serif font-bold text-charcoal">
                {agreement.title}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-charcoal">
                {fulfilledCount} dari {totalCount} Terpenuhi
              </span>
              <Badge className="bg-[#19382B] text-white font-mono text-[11px]">
                {progressPercent}%
              </Badge>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-warm-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#19382B] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Benefits List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-warm-200 pb-2">
            <span className="font-semibold text-charcoal">
              Daftar Komitmen Hak Apresiasi &amp; Publikasi:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs gap-1 h-7"
            >
              <Plus className="h-3 w-3" />
              <span>Tambah Benefit Tambahan</span>
            </Button>
          </div>

          {/* Inline Add Benefit Form */}
          {showAddForm && (
            <form onSubmit={handleCreateBenefit} className="rounded-2xl border border-warm-300 bg-white p-4 space-y-3 shadow-xs">
              <span className="font-semibold text-charcoal block">Tambah Komitmen Benefit Baru</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-charcoal-muted">Judul Hak / Bentuk Benefit *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Sambutan Direksi saat Acara Pembukaan"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-charcoal-muted">Target Tanggal Realisasi</label>
                  <Input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-charcoal-muted">Penanggung Jawab (PIC)</label>
                <select
                  value={newPicId}
                  onChange={(e) => setNewPicId(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 p-2 text-xs bg-white text-charcoal"
                >
                  <option value="">-- Tanpa PIC Khusus --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-forest text-white" disabled={isAdding}>
                  {isAdding ? 'Menyimpan...' : 'Simpan Benefit'}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="space-y-3 py-4 text-center text-charcoal-muted">Memuat daftar benefit...</div>
          ) : benefits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-warm-300 p-8 text-center text-charcoal-muted space-y-2">
              <Clock className="h-6 w-6 mx-auto text-warm-400" />
              <p>Belum ada rincian benefit yang terdaftar untuk kesepakatan ini.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {benefits.map((b) => {
                const statusStyle = SPONSOR_BENEFIT_STATUS_COLORS[b.fulfillment_status]
                const isEditing = editingBenefitId === b.id

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-warm-200 bg-white p-4 shadow-2xs space-y-3 hover:border-warm-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {b.fulfillment_status === 'terpenuhi' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-warm-400 shrink-0" />
                          )}
                          <h5 className="font-semibold text-charcoal text-xs sm:text-sm">{b.benefit_title}</h5>
                        </div>
                        {b.benefit_description && (
                          <p className="text-charcoal-muted text-[11px] leading-relaxed pl-6">
                            {b.benefit_description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {SPONSOR_BENEFIT_STATUS_LABELS[b.fulfillment_status]}
                        </span>
                        {!isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEditBenefit(b)}
                            className="text-[11px] h-6 px-2"
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Metadata line: PIC, target date, proof */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-charcoal-muted border-t border-warm-100 pt-2 pl-6">
                      {b.responsible_profile && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-sage-600" />
                          <span>PIC: {b.responsible_profile.full_name}</span>
                        </span>
                      )}
                      {b.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-sage-600" />
                          <span>Target: {b.target_date}</span>
                        </span>
                      )}
                      {b.proof_url && (
                        <a
                          href={b.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#19382B] hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Bukti Dokumentasi</span>
                        </a>
                      )}
                      {b.completed_at && (
                        <span className="text-emerald-700">
                          Selesai: {new Date(b.completed_at).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>

                    {/* Active Edit Form */}
                    {isEditing && (
                      <div className="rounded-xl bg-warm-50 border border-warm-200 p-3 space-y-3 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-charcoal">Status Realisasi *</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as SponsorBenefitFulfillmentStatus)}
                              className="w-full rounded-lg border border-warm-300 p-2 text-xs bg-white text-charcoal font-semibold"
                            >
                              {Object.entries(SPONSOR_BENEFIT_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-charcoal">Link / URL Bukti Realisasi</label>
                            <Input
                              value={editProofUrl}
                              onChange={(e) => setEditProofUrl(e.target.value)}
                              placeholder="https://drive.google.com/... atau link postingan"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-charcoal">Catatan Realisasi</label>
                          <textarea
                            value={editNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                            rows={2}
                            placeholder="Catatan pelaksanaan, tanggal tayang spanduk, atau nomor dokumentasi..."
                            className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
                          />
                        </div>

                        {(editStatus === 'dibatalkan' || editStatus === 'tidak_dapat_dipenuhi') && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-rose-700">
                              Alasan Pembatalan / Tidak Terpenuhi *
                            </label>
                            <Input
                              value={editCancellationReason}
                              onChange={(e) => setEditCancellationReason(e.target.value)}
                              placeholder="Alasan kendala lapangan atau kesepakatan pengganti..."
                              required
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1 border-t border-warm-200">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBenefitId(null)}
                            disabled={isUpdating}
                          >
                            Batal
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-forest text-white gap-1"
                            onClick={() => handleSaveBenefitUpdate(b.id)}
                            disabled={isUpdating}
                          >
                            <Save className="h-3 w-3" />
                            <span>{isUpdating ? 'Menyimpan...' : 'Simpan Status'}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Tutup Pelacak
          </Button>
        </div>
      </div>
    </Modal>
  )
}

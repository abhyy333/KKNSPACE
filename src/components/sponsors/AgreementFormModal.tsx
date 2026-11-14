import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  createSponsorAgreement,
  updateSponsorAgreement,
  fetchSponsors,
  fetchSponsorshipPackages,
  fetchTeamProfilesForSelect,
} from '@/services/sponsorsApi'
import type {
  Sponsor,
  SponsorshipPackage,
  SponsorAgreement,
  SponsorAgreementStatus,
  SponsorCategory,
  SponsorshipTierKey,
} from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_AGREEMENT_STATUS_LABELS,
} from '@/types/sponsor'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'

interface AgreementFormModalProps {
  open: boolean
  onClose: () => void
  agreement?: SponsorAgreement | null
  defaultSponsorId?: string
  onSuccess: () => void
}

export const AgreementFormModal: React.FC<AgreementFormModalProps> = ({
  open,
  onClose,
  agreement,
  defaultSponsorId,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [packages, setPackages] = useState<SponsorshipPackage[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([])

  const [sponsorId, setSponsorId] = useState('')
  const [tierKey, setTierKey] = useState<SponsorshipTierKey>('custom')
  const [packageId, setPackageId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [relationshipType, setRelationshipType] = useState<SponsorCategory>('sponsor_pendukung')
  const [financialContribution, setFinancialContribution] = useState<number>(0)
  const [nonFinancialValue, setNonFinancialValue] = useState<number>(0)
  const [contributionFormat, setContributionFormat] = useState('')
  const [paymentSchedule, setPaymentSchedule] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [specialTerms, setSpecialTerms] = useState('')
  const [status, setStatus] = useState<SponsorAgreementStatus>('confirmed')
  const [confirmationDate, setConfirmationDate] = useState('')
  const [picUserId, setPicUserId] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [newBenefit, setNewBenefit] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Load sponsors, packages, team members
    Promise.all([
      fetchSponsors({ is_archived: false }),
      fetchSponsorshipPackages(),
      fetchTeamProfilesForSelect(),
    ]).then(([sList, pList, tList]) => {
      setSponsors(sList)
      setPackages(pList)
      setTeamMembers(tList)
    })
  }, [])

  useEffect(() => {
    if (agreement) {
      setSponsorId(agreement.sponsor_id)
      setTierKey(agreement.tier_key)
      setPackageId(agreement.package_id)
      setTitle(agreement.title)
      setRelationshipType(agreement.relationship_type)
      setFinancialContribution(Number(agreement.agreed_financial_contribution) || 0)
      setNonFinancialValue(Number(agreement.estimated_non_financial_value) || 0)
      setContributionFormat(agreement.contribution_format_summary || '')
      setPaymentSchedule(agreement.payment_schedule || '')
      setStartDate(agreement.start_date || '')
      setEndDate(agreement.end_date || '')
      setSpecialTerms(agreement.special_terms || '')
      setStatus(agreement.agreement_status)
      setConfirmationDate(agreement.confirmation_date || '')
      setPicUserId(agreement.pic_user_id || '')
      setBenefits(agreement.package_snapshot?.benefits || [])
    } else {
      setSponsorId(defaultSponsorId || '')
      setTitle('')
      setFinancialContribution(0)
      setNonFinancialValue(0)
      setContributionFormat('')
      setPaymentSchedule('')
      setStartDate(new Date().toISOString().slice(0, 10))
      setConfirmationDate(new Date().toISOString().slice(0, 10))
      setBenefits([])
    }
  }, [agreement, defaultSponsorId])

  // Handle tier change to auto-load package defaults
  const handleTierChange = (selectedTier: SponsorshipTierKey) => {
    setTierKey(selectedTier)
    const matchedPkg = packages.find((p) => p.tier_key === selectedTier)
    if (matchedPkg) {
      setPackageId(matchedPkg.id)
      if (!title || title.includes('Perjanjian')) {
        const spName = sponsors.find((s) => s.id === sponsorId)?.name || 'Mitra'
        setTitle(`Perjanjian Kemitraan ${matchedPkg.display_name} — ${spName}`)
      }
      setBenefits(matchedPkg.default_benefits || [])
    } else {
      setPackageId(null)
    }
  }

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return
    setBenefits((prev) => [...prev, newBenefit.trim()])
    setNewBenefit('')
  }

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sponsorId) {
      toast({ title: 'Pilih mitra sponsor terlebih dahulu', variant: 'error' })
      return
    }
    if (!title.trim()) {
      toast({ title: 'Judul perjanjian kerja sama wajib diisi', variant: 'error' })
      return
    }

    const currentPkg = packages.find((p) => p.id === packageId || p.tier_key === tierKey)

    // Build immutable package snapshot
    const packageSnapshot = {
      package_name: currentPkg?.display_name || (tierKey === 'custom' ? 'Custom Partnership' : 'Direct Partner'),
      tier_key: tierKey,
      badge_label: currentPkg?.badge_label || (tierKey === 'custom' ? 'Custom Partner' : 'Mitra Resmi'),
      description: currentPkg?.description || 'Kesepakatan kemitraan kolaborasi khusus.',
      benefits: benefits,
    }

    try {
      setIsSubmitting(true)
      if (agreement) {
        await updateSponsorAgreement(agreement.id, {
          title: title.trim(),
          relationship_type: relationshipType,
          tier_key: tierKey,
          package_id: packageId,
          agreed_financial_contribution: financialContribution,
          estimated_non_financial_value: nonFinancialValue,
          contribution_format_summary: contributionFormat.trim() || null,
          payment_schedule: paymentSchedule.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          special_terms: specialTerms.trim() || null,
          agreement_status: status,
          confirmation_date: confirmationDate || null,
          pic_user_id: picUserId || null,
          package_snapshot: packageSnapshot,
        })
        toast({ title: 'Perjanjian Kemitraan Berhasil Diperbarui', variant: 'success' })
      } else {
        await createSponsorAgreement({
          sponsor_id: sponsorId,
          package_id: packageId,
          tier_key: tierKey,
          title: title.trim(),
          relationship_type: relationshipType,
          agreed_financial_contribution: financialContribution,
          estimated_non_financial_value: nonFinancialValue,
          contribution_format_summary: contributionFormat.trim() || undefined,
          payment_schedule: paymentSchedule.trim() || undefined,
          start_date: startDate || null,
          end_date: endDate || null,
          special_terms: specialTerms.trim() || undefined,
          agreement_status: status,
          confirmation_date: confirmationDate || null,
          pic_user_id: picUserId || null,
          package_snapshot: packageSnapshot,
        })
        toast({ title: 'Perjanjian Kemitraan Berhasil Dibuat', variant: 'success' })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan Perjanjian', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={agreement ? `Edit Kesepakatan: ${agreement.title}` : 'Buat Kesepakatan Kemitraan Baru'}
      description="Catat perjanjian kerja sama, komitmen kontribusi finansial/non-finansial, dan kunci hak benefit ke dalam snapshot resmi."
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Row 1: Sponsor & Tier Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Mitra / Organisasi Sponsor *</label>
            <select
              value={sponsorId}
              onChange={(e) => {
                setSponsorId(e.target.value)
                const sp = sponsors.find((s) => s.id === e.target.value)
                if (sp) {
                  setTitle(`Perjanjian Kerja Sama — ${sp.name}`)
                  setRelationshipType(sp.category)
                }
              }}
              className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal focus:ring-forest"
              required
              disabled={Boolean(agreement)}
            >
              <option value="">-- Pilih Calon / Mitra Sponsor --</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({SPONSOR_CATEGORY_LABELS[s.category]})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Sponsorship Tier / Kemitraan *</label>
            <select
              value={tierKey}
              onChange={(e) => handleTierChange(e.target.value as SponsorshipTierKey)}
              className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal focus:ring-forest font-semibold"
            >
              <option value="diamond">Diamond Partnership (Premier)</option>
              <option value="platinum">Platinum Partnership (Premium)</option>
              <option value="gold">Gold Partnership (Supporting)</option>
              <option value="silver">Silver Partnership (Community)</option>
              <option value="custom">Custom Partnership (Khusus/Fleksibel)</option>
              <option value="none">Tanpa Tier (Mitra Institusi / Media)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Title & Relationship Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-charcoal">Judul Kesepakatan / Dokumen Perjanjian *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: MoU Dukungan Operasional & Publikasi — PT ABC"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Jenis Hubungan *</label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as SponsorCategory)}
              className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal focus:ring-forest"
            >
              <option value="sponsor_utama">Sponsor Utama</option>
              <option value="sponsor_pendukung">Sponsor Pendukung</option>
              <option value="sponsor_produk">Sponsor Produk</option>
              <option value="media_partner">Media Partner</option>
              <option value="mitra_kolaborasi">Mitra Kolaborasi</option>
            </select>
          </div>
        </div>

        {/* Flexible Contribution Section */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/70 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-warm-200/80 pb-2">
            <span className="font-mono text-[11px] font-semibold text-[#B19A6B] uppercase tracking-wider">
              Komitmen Kontribusi (Internal Posko — Rahasia)
            </span>
            <span className="text-[10px] text-charcoal-muted">Tidak pernah ditampilkan di publik</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Komitmen Dana Finansial (Rp)</label>
              <Input
                type="number"
                min={0}
                value={financialContribution}
                onChange={(e) => setFinancialContribution(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-[10px] text-charcoal-muted block">
                Catatan: Realisasi kas sebenarnya dicatat terpisah melalui modul Keuangan KKN.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Estimasi Nilai Non-Finansial (Rp, Opsional)</label>
              <Input
                type="number"
                min={0}
                value={nonFinancialValue}
                onChange={(e) => setNonFinancialValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-[10px] text-charcoal-muted block">
                Taksiran nilai barang/jasa berdasarkan kesepakatan bersama.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Rincian Format Kontribusi</label>
              <Input
                value={contributionFormat}
                onChange={(e) => setContributionFormat(e.target.value)}
                placeholder="Contoh: 100 Kaos Panitia + Konsumsi Acara Workshop"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Jadwal Pencairan / Penyerahan</label>
              <Input
                value={paymentSchedule}
                onChange={(e) => setPaymentSchedule(e.target.value)}
                placeholder="Contoh: Termin 1 saat penandatanganan, Termin 2 saat penarikan"
              />
            </div>
          </div>
        </div>

        {/* Benefit Snapshot Management */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-charcoal">
              Snapshot Hak Apresiasi &amp; Benefit Disepakati ({benefits.length} Item)
            </label>
            <span className="text-[10px] text-charcoal-muted">
              Snapshot ini akan menjadi acuan pelacakan di Benefit Tracker
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {benefits.length === 0 ? (
              <p className="text-xs text-charcoal-muted italic p-2 bg-warm-50 rounded-lg">
                Belum ada benefit yang didaftarkan.
              </p>
            ) : (
              benefits.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-warm-200/80 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-[#19382B] shrink-0 mt-0.5" />
                    <span className="text-charcoal leading-snug">{b}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(i)}
                    className="text-rose-600 hover:text-rose-800 p-1 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              placeholder="Tambahkan poin komitmen benefit khusus..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddBenefit()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBenefit}
              className="shrink-0 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah</span>
            </Button>
          </div>
        </div>

        {/* Dates & Status Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-warm-200">
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Tgl Konfirmasi (MoU)</label>
            <Input
              type="date"
              value={confirmationDate}
              onChange={(e) => setConfirmationDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Mulai Kemitraan</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Berakhir Kemitraan</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Status Perjanjian</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SponsorAgreementStatus)}
              className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal focus:ring-forest font-semibold"
            >
              {Object.entries(SPONSOR_AGREEMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PIC & Special Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Penanggung Jawab Internal (PIC Posko)</label>
            <select
              value={picUserId}
              onChange={(e) => setPicUserId(e.target.value)}
              className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal focus:ring-forest"
            >
              <option value="">-- Pilih Mahasiswa PIC --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-charcoal">Ketentuan Khusus / Catatan Tambahan</label>
            <Input
              value={specialTerms}
              onChange={(e) => setSpecialTerms(e.target.value)}
              placeholder="Contoh: Mitra meminta sertifikat fisik diserahkan saat lokakarya desa."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" className="bg-forest hover:bg-forest/90 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Kesepakatan & Kunci Snapshot'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

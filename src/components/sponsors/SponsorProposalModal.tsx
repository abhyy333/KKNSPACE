import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  createSponsorProposal,
  updateSponsorProposal,
  fetchSponsors,
  fetchSponsorshipPackages,
} from '@/services/sponsorsApi'
import type {
  Sponsor,
  SponsorshipPackage,
  SponsorProposal,
  SponsorshipTierKey,
} from '@/types/sponsor'
import {
  SPONSORSHIP_TIER_LABELS,
} from '@/types/sponsor'
import {
  Printer,
  FileText,
  Send,
  Eye,
  CheckCircle2,
} from 'lucide-react'

interface SponsorProposalModalProps {
  open: boolean
  onClose: () => void
  proposal?: SponsorProposal | null
  onSuccess: () => void
}

export const SponsorProposalModal: React.FC<SponsorProposalModalProps> = ({
  open,
  onClose,
  proposal,
  onSuccess,
}) => {
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [packages, setPackages] = useState<SponsorshipPackage[]>([])

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // Form Fields
  const [sponsorId, setSponsorId] = useState<string>('')
  const [proposalNumber, setProposalNumber] = useState('')
  const [recipientOrg, setRecipientOrg] = useState('')
  const [recipientPic, setRecipientPic] = useState('')
  const [tierKey, setTierKey] = useState<SponsorshipTierKey>('diamond')
  const [packageId, setPackageId] = useState<string | null>(null)
  const [proposalTitle, setProposalTitle] = useState('')
  const [requestedContribution, setRequestedContribution] = useState('')

  // Detailed snapshot content (NO AI, 100% verified template)
  const [introText, setIntroText] = useState('')
  const [kknOverview, setKknOverview] = useState('')
  const [tierDescription, setTierDescription] = useState('')
  const [benefitsList, setBenefitsList] = useState<string[]>([])
  const [paymentTerms, setPaymentTerms] = useState('')
  const [closingText, setClosingText] = useState('')
  const [committeeContactName, setCommitteeContactName] = useState('Abdul Habir Al Majdi (Ketua Kelompok)')
  const [committeePhone, setCommitteePhone] = useState('+62 812-3456-7890')
  const [committeeEmail, setCommitteeEmail] = useState('posko@pringgaselaselatan.desa.id')

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchSponsors({ is_archived: false }),
      fetchSponsorshipPackages(),
    ]).then(([sList, pList]) => {
      setSponsors(sList)
      setPackages(pList)
    })
  }, [])

  useEffect(() => {
    if (proposal) {
      setSponsorId(proposal.sponsor_id || '')
      setProposalNumber(proposal.proposal_number)
      setRecipientOrg(proposal.recipient_organization)
      setRecipientPic(proposal.recipient_pic_name || '')
      setTierKey(proposal.tier_key)
      setPackageId(proposal.package_id)
      setProposalTitle(proposal.proposal_title)
      setRequestedContribution(proposal.requested_contribution_summary || '')

      const s = proposal.proposal_content_snapshot
      setIntroText(s.introduction_text || '')
      setKknOverview(s.kkn_overview_text || '')
      setTierDescription(s.tier_description || '')
      setBenefitsList(s.benefits_list || [])
      setPaymentTerms(s.payment_terms || '')
      setClosingText(s.closing_text || '')
      setCommitteeContactName(s.committee_contact_name || '')
      setCommitteePhone(s.committee_contact_phone || '')
      setCommitteeEmail(s.committee_contact_email || '')
    } else {
      // Default initial proposal values
      const autoNum = `PROP-KKN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
      setProposalNumber(autoNum)
      setProposalTitle('Proposal Penawaran Kemitraan & Sponsorship KKN')
      setRequestedContribution('Dukungan dana sponsorship operasional atau barang penunjang program.')
      setIntroText(
        'Dengan hormat, sehubungan dengan pelaksanaan Kuliah Kerja Nyata (KKN) Universitas Mataram Periode 2026–2027 di Desa Pringgasela Selatan, Kecamatan Pringgasela, Kabupaten Lombok Timur, kami bermaksud menawarkan kesempatan kemitraan strategis dan kolaborasi gotong royong demi kebermanfaatan masyarakat.'
      )
      setKknOverview(
        'KKN SPACE Desa Pringgasela Selatan berfokus pada penguatan potensi lokal desa, digitalisasi transparansi posko, pendampingan perajin sentra tenun tradisional Sasak, pemberdayaan UMKM, pengelolaan sanitasi lingkungan, serta edukasi generasi muda.'
      )
      setPaymentTerms(
        'Penyaluran komitmen sponsorship dapat dilakukan melalui transfer rekening resmi bendahara posko atau penyerahan langsung barang/fasilitas ke Posko KKN Desa Pringgasela Selatan dengan tanda terima dan berita acara serah terima resmi.'
      )
      setClosingText(
        'Demikian proposal penawaran kemitraan ini kami sampaikan. Besar harapan kami agar terjalin kerja sama yang saling menguntungkan dan bernilai sosial tinggi. Atas perhatian dan kesediaan Bapak/Ibu, kami ucapkan terima kasih.'
      )

      // Auto-load Diamond default benefits
      const diamondPkg = packages.find((p) => p.tier_key === 'diamond')
      if (diamondPkg) {
        setTierDescription(diamondPkg.description)
        setBenefitsList(diamondPkg.default_benefits || [])
        setPackageId(diamondPkg.id)
      }
    }
  }, [proposal, packages])

  const handleTierSelect = (key: SponsorshipTierKey) => {
    setTierKey(key)
    const pkg = packages.find((p) => p.tier_key === key)
    if (pkg) {
      setPackageId(pkg.id)
      setTierDescription(pkg.description)
      setBenefitsList(pkg.default_benefits || [])
    } else {
      setPackageId(null)
      setTierDescription('Paket kemitraan kolaborasi khusus yang disesuaikan dengan kesepakatan bersama.')
      setBenefitsList([
        'Pencantuman logo pada direktori mitra KKN SPACE',
        'Publikasi apresiasi media sosial posko',
        'Sertifikat apresiasi resmi KKN',
      ])
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientOrg.trim()) {
      toast({ title: 'Nama instansi/perusahaan sasaran wajib diisi', variant: 'error' })
      return
    }

    const snapshot = {
      proposal_title: proposalTitle.trim(),
      recipient_organization: recipientOrg.trim(),
      recipient_pic_name: recipientPic.trim() || undefined,
      introduction_text: introText.trim(),
      kkn_overview_text: kknOverview.trim(),
      selected_tier_name: SPONSORSHIP_TIER_LABELS[tierKey],
      tier_description: tierDescription.trim(),
      benefits_list: benefitsList,
      contribution_request_summary: requestedContribution.trim(),
      payment_terms: paymentTerms.trim(),
      closing_text: closingText.trim(),
      committee_contact_name: committeeContactName.trim(),
      committee_contact_phone: committeePhone.trim(),
      committee_contact_email: committeeEmail.trim(),
    }

    try {
      setIsSubmitting(true)
      if (proposal) {
        await updateSponsorProposal(proposal.id, {
          recipient_organization: recipientOrg.trim(),
          recipient_pic_name: recipientPic.trim() || null,
          tier_key: tierKey,
          proposal_title: proposalTitle.trim(),
          package_id: packageId,
          requested_contribution_summary: requestedContribution.trim() || null,
          proposal_content_snapshot: snapshot,
        })
        toast({ title: 'Proposal Berhasil Diperbarui', variant: 'success' })
      } else {
        await createSponsorProposal({
          sponsor_id: sponsorId || null,
          proposal_number: proposalNumber.trim(),
          recipient_organization: recipientOrg.trim(),
          recipient_pic_name: recipientPic.trim() || undefined,
          tier_key: tierKey,
          proposal_title: proposalTitle.trim(),
          package_id: packageId,
          requested_contribution_summary: requestedContribution.trim() || undefined,
          proposal_content_snapshot: snapshot,
          status: 'ready',
        })
        toast({ title: 'Proposal Kemitraan Berhasil Dibuat', variant: 'success' })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan Proposal', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAsSent = async () => {
    if (!proposal) return
    try {
      setIsSubmitting(true)
      await updateSponsorProposal(proposal.id, {
        status: 'sent',
      })
      toast({ title: 'Status Proposal: Terkirim', variant: 'success' })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal Memperbarui Status', description: err.message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={proposal ? `Edit Proposal: ${proposal.proposal_number}` : 'Generator Proposal Sponsorship Manual (No AI)'}
      description="Susun dokumen penawaran kemitraan institusional berbasis data terverifikasi KKN SPACE dengan format cetak A4."
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-5 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-warm-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'edit'
                  ? 'bg-[#19382B] text-white shadow-2xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Editor Formulir Template</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'preview'
                  ? 'bg-[#19382B] text-white shadow-2xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Pratinjau Dokumen Cetak A4</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'preview' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-8"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak / Simpan PDF</span>
              </Button>
            )}
            {proposal && proposal.status !== 'sent' && (
              <Button
                type="button"
                size="sm"
                onClick={handleMarkAsSent}
                className="gap-1.5 text-xs h-8 bg-forest text-white"
                disabled={isSubmitting}
              >
                <Send className="h-3 w-3" />
                <span>Tandai Terkirim ke Mitra</span>
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: FORM EDITOR */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSubmit} className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
            {/* Target & Package */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Nomor Surat Proposal *</label>
                <Input
                  value={proposalNumber}
                  onChange={(e) => setProposalNumber(e.target.value)}
                  placeholder="PROP-KKN-2026-001"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Tautkan Calon Mitra (Opsional)</label>
                <select
                  value={sponsorId}
                  onChange={(e) => {
                    setSponsorId(e.target.value)
                    const s = sponsors.find((item) => item.id === e.target.value)
                    if (s) {
                      setRecipientOrg(s.name)
                      if (s.contact_name) setRecipientPic(s.contact_name)
                    }
                  }}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal"
                >
                  <option value="">-- Pilih dari Pipeline/Direktori --</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Paket Sponsorship Ditawarkan *</label>
                <select
                  value={tierKey}
                  onChange={(e) => handleTierSelect(e.target.value as SponsorshipTierKey)}
                  className="w-full rounded-xl border border-warm-300 p-2.5 text-xs bg-white text-charcoal font-semibold"
                >
                  <option value="diamond">Diamond Partnership</option>
                  <option value="platinum">Platinum Partnership</option>
                  <option value="gold">Gold Partnership</option>
                  <option value="silver">Silver Partnership</option>
                  <option value="custom">Custom Partnership</option>
                </select>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Instansi / Perusahaan Sasaran *</label>
                <Input
                  value={recipientOrg}
                  onChange={(e) => setRecipientOrg(e.target.value)}
                  placeholder="Contoh: PT Bank Mandiri (Persero) Tbk"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Yth. Nama Pimpinan / PIC Sasaran</label>
                <Input
                  value={recipientPic}
                  onChange={(e) => setRecipientPic(e.target.value)}
                  placeholder="Contoh: Bapak/Ibu Kepala Cabang Selong"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Judul Dokumen Proposal *</label>
              <Input
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="Proposal Penawaran Kemitraan KKN"
                required
              />
            </div>

            {/* Introduction & Overview */}
            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Pengantar &amp; Latar Belakang Proposal</label>
              <textarea
                value={introText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIntroText(e.target.value)}
                rows={3}
                placeholder="Paragraf pembuka proposal..."
                className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-charcoal">Ringkasan Program Pengabdian KKN</label>
              <textarea
                value={kknOverview}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKknOverview(e.target.value)}
                rows={3}
                placeholder="Uraian fokus pengabdian desa..."
                className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              />
            </div>

            {/* Contribution request & payment terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Bentuk Dukungan yang Diharapkan</label>
                <textarea
                  value={requestedContribution}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequestedContribution(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Bantuan dana Rp 5.000.000 atau paket sarana posko..."
                  className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Ketentuan Penyaluran &amp; MoU</label>
                <textarea
                  value={paymentTerms}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPaymentTerms(e.target.value)}
                  rows={2}
                  placeholder="Mekanisme transfer, tanda terima, dan bukti berita acara..."
                  className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
                />
              </div>
            </div>

            {/* Contact Person of Committee */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-warm-200 bg-warm-50/70 p-3">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Narahubung Panitia (PIC)</label>
                <Input
                  value={committeeContactName}
                  onChange={(e) => setCommitteeContactName(e.target.value)}
                  placeholder="Nama Pengurus KKN"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Nomor Telepon / WhatsApp</label>
                <Input
                  value={committeePhone}
                  onChange={(e) => setCommitteePhone(e.target.value)}
                  placeholder="+62 8..."
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-charcoal">Email Resmi Posko</label>
                <Input
                  value={committeeEmail}
                  onChange={(e) => setCommitteeEmail(e.target.value)}
                  placeholder="posko@..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-forest text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Proposal'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: LIVE PRINT PREVIEW (A4 FORMAL LAYOUT) */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div
              ref={printRef}
              id="printable-proposal-document"
              className="bg-white rounded-2xl border border-warm-300 p-8 sm:p-12 shadow-sm text-charcoal space-y-8 font-sans max-w-3xl mx-auto"
            >
              {/* Formal Document Header */}
              <div className="flex items-center justify-between border-b-2 border-[#19382B] pb-5">
                <div className="flex items-center gap-4">
                  <BrandLogo size="lg" className="h-14 w-14 shrink-0" />
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#19382B] uppercase tracking-wide">
                      KKN SPACE · DESA PRINGGASELA SELATAN
                    </h3>
                    <p className="text-[11px] text-charcoal-muted">
                      Kuliah Kerja Nyata Universitas Mataram · Periode 2026–2027
                    </p>
                    <p className="text-[10px] text-charcoal-muted">
                      Kecamatan Pringgasela, Kabupaten Lombok Timur, Nusa Tenggara Barat
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-charcoal-muted shrink-0">
                  <span className="block font-semibold text-charcoal">{proposalNumber}</span>
                  <span className="block">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                </div>
              </div>

              {/* Recipient Block */}
              <div className="space-y-1 text-xs">
                <p className="text-charcoal-muted">Kepada Yth.</p>
                <p className="font-bold text-charcoal text-sm">{recipientPic || 'Pimpinan / Bagian Kemitraan'}</p>
                <p className="font-semibold text-[#19382B]">{recipientOrg}</p>
                <p className="text-charcoal-muted">di Tempat</p>
              </div>

              {/* Title */}
              <div className="text-center py-2 space-y-1 border-y border-warm-200">
                <h4 className="font-serif font-bold text-lg sm:text-xl text-charcoal">
                  {proposalTitle}
                </h4>
                <span className="text-[11px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold block">
                  Penawaran {SPONSORSHIP_TIER_LABELS[tierKey]}
                </span>
              </div>

              {/* Introduction */}
              <div className="space-y-2 text-xs leading-relaxed text-justify">
                <p>{introText}</p>
                <p>{kknOverview}</p>
              </div>

              {/* Package & Benefits Offering */}
              <div className="space-y-3 rounded-2xl border border-warm-200 bg-[#FAF9F6] p-5">
                <div className="flex items-center justify-between border-b border-warm-200 pb-2">
                  <h5 className="font-serif font-bold text-sm text-[#19382B]">
                    Hak Apresiasi &amp; Publikasi Kemitraan
                  </h5>
                  <span className="text-[11px] font-mono font-semibold text-[#B19A6B]">
                    {SPONSORSHIP_TIER_LABELS[tierKey]}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  {tierDescription}
                </p>

                <div className="space-y-2 pt-1">
                  <span className="font-semibold text-xs text-charcoal block">Rincian Hak Apresiasi:</span>
                  <ul className="space-y-1.5 text-xs text-charcoal">
                    {benefitsList.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#19382B] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contribution summary & payment */}
              <div className="space-y-2 text-xs leading-relaxed">
                <h5 className="font-semibold text-charcoal">Mekanisme Kontribusi &amp; Dukungan:</h5>
                <p>{requestedContribution}</p>
                <p className="text-charcoal-muted text-[11px]">{paymentTerms}</p>
              </div>

              {/* Closing & Formal Signature */}
              <div className="space-y-6 pt-2">
                <p className="text-xs leading-relaxed text-justify">{closingText}</p>

                <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
                  <div>
                    <span className="text-charcoal-muted block text-[11px]">Hormat kami,</span>
                    <strong className="block text-charcoal pt-1">Panitia KKN SPACE 2026</strong>
                    <div className="h-16 flex items-end">
                      <span className="border-b border-charcoal pb-1 font-semibold">{committeeContactName}</span>
                    </div>
                    <span className="text-[10px] text-charcoal-muted block">Koordinator / Narahubung</span>
                  </div>

                  <div className="text-right space-y-1 text-[11px] text-charcoal-muted">
                    <span className="font-semibold text-charcoal block">Sekretariat Posko KKN:</span>
                    <span>Desa Pringgasela Selatan, Kec. Pringgasela</span>
                    <span className="block">Telp/WA: {committeePhone}</span>
                    <span className="block">Email: {committeeEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

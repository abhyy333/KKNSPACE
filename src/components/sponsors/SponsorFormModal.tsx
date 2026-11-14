import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { uploadPrivateFile } from '@/services/storageApi'
import {
  createSponsor,
  updateSponsor,
  fetchTeamProfilesForSelect,
} from '@/services/sponsorsApi'
import type {
  Sponsor,
  SponsorCategory,
  SponsorContributionType,
  SponsorPartnershipStatus,
} from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
  SPONSOR_PARTNERSHIP_STATUS_LABELS,
} from '@/types/sponsor'
import {
  Building2,
  UploadCloud,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Link as LinkIcon,
  User,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'

interface SponsorFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  sponsor?: Sponsor | null
  initialPartnershipStatus?: SponsorPartnershipStatus
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const SponsorFormModal: React.FC<SponsorFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  sponsor,
  initialPartnershipStatus,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState<SponsorCategory>('sponsor_pendukung')
  const [contributionType, setContributionType] = useState<SponsorContributionType>('finansial')
  const [contributionDescription, setContributionDescription] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [socialMediaUrl, setSocialMediaUrl] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partnershipStatus, setPartnershipStatus] = useState<SponsorPartnershipStatus>('prospek')
  const [picUserId, setPicUserId] = useState<string>('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')

  // Logo file states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [existingLogoFileId, setExistingLogoFileId] = useState<string | null>(null)

  // System states
  const [teamProfiles, setTeamProfiles] = useState<Array<{ id: string; full_name: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load team profiles
  useEffect(() => {
    if (open) {
      fetchTeamProfilesForSelect().then(setTeamProfiles).catch(console.error)
    }
  }, [open])

  // Populate or reset form
  useEffect(() => {
    if (!open) {
      if (previewUrl && !existingLogoFileId) {
        URL.revokeObjectURL(previewUrl)
      }
      setSelectedFile(null)
      setPreviewUrl(null)
      setErrorMsg(null)
      return
    }

    if (sponsor) {
      setName(sponsor.name || '')
      setCategory(sponsor.category || 'sponsor_pendukung')
      setContributionType(sponsor.contribution_type || 'finansial')
      setContributionDescription(sponsor.contribution_description || '')
      setDescription(sponsor.description || '')
      setWebsiteUrl(sponsor.website_url || '')
      setSocialMediaUrl(sponsor.social_media_url || '')
      setStartDate(sponsor.start_date || '')
      setEndDate(sponsor.end_date || '')
      setPartnershipStatus(sponsor.partnership_status || 'prospek')
      setPicUserId(sponsor.pic_user_id || '')
      setContactName(sponsor.contact_name || '')
      setContactEmail(sponsor.contact_email || '')
      setContactPhone(sponsor.contact_phone || '')
      setNotes(sponsor.notes || '')
      setNextFollowUpDate(sponsor.next_follow_up_date || '')
      setExistingLogoFileId(sponsor.logo_file_id || null)
      setSelectedFile(null)
      setPreviewUrl(null)
    } else {
      setName('')
      setCategory('sponsor_pendukung')
      setContributionType('finansial')
      setContributionDescription('')
      setDescription('')
      setWebsiteUrl('')
      setSocialMediaUrl('')
      setStartDate('')
      setEndDate('')
      setPartnershipStatus(initialPartnershipStatus || 'prospek')
      setPicUserId('')
      setContactName('')
      setContactEmail('')
      setContactPhone('')
      setNotes('')
      setNextFollowUpDate('')
      setExistingLogoFileId(null)
      setSelectedFile(null)
      setPreviewUrl(null)
    }
    setErrorMsg(null)
  }, [open, sponsor, initialPartnershipStatus])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg('Format file tidak didukung. Harap unggah format PNG, JPG, JPEG, atau WebP.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('Ukuran file maksimal 10 MB.')
      return
    }

    setErrorMsg(null)
    setSelectedFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleRemoveSelectedFile = () => {
    if (previewUrl && !existingLogoFileId) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!name.trim()) {
      setErrorMsg('Nama organisasi / perusahaan sponsor wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      let finalLogoFileId = existingLogoFileId

      // Upload new logo if provided
      if (selectedFile) {
        const uploadedObj = await uploadPrivateFile(selectedFile, 'sponsors')
        finalLogoFileId = uploadedObj.id
      }

      const payload = {
        name: name.trim(),
        category,
        contribution_type: contributionType,
        contribution_description: contributionDescription.trim() || null,
        description: description.trim() || null,
        logo_file_id: finalLogoFileId,
        website_url: websiteUrl.trim() || null,
        social_media_url: socialMediaUrl.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        partnership_status: partnershipStatus,
        pic_user_id: picUserId || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        notes: notes.trim() || null,
        next_follow_up_date: nextFollowUpDate || null,
      }

      if (sponsor) {
        await updateSponsor(sponsor.id, payload)
        toast({
          title: 'Berhasil Diperbarui',
          description: `Data sponsor "${name}" berhasil diperbarui.`,
          variant: 'success',
        })
      } else {
        await createSponsor(payload)
        toast({
          title: 'Sponsor Ditambahkan',
          description: `Data calon/mitra sponsor "${name}" berhasil disimpan.`,
          variant: 'success',
        })
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data sponsor.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sponsor ? 'Edit Data Sponsor & Mitra' : 'Tambah Calon / Mitra Sponsor'}
      description="Lengkapi informasi resmi organisasi, bentuk kontribusi, dan catatan kerja sama."
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* ================= SECTION 1: IDENTITAS ================= */}
        <div className="space-y-4">
          <div className="border-b border-warm-200 pb-2">
            <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-forest" />
              1. Identitas Organisasi / Perusahaan
            </h4>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal">
              Nama Organisasi / Perusahaan <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: PT Semen Lombok Utama / Bank NTB Syariah"
              required
              className="text-xs"
            />
          </div>

          {/* Logo Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-charcoal flex items-center justify-between">
              <span>Logo Resmi Organisasi</span>
              <span className="text-[11px] font-normal text-charcoal-muted">PNG, JPG, WebP (Maks. 10MB)</span>
            </label>

            {previewUrl ? (
              <div className="relative border border-warm-300 rounded-xl p-3 bg-warm-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 bg-white border border-warm-200 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                    <img src={previewUrl} alt="Preview Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-charcoal block truncate max-w-[220px]">
                      {selectedFile?.name || 'Logo Terpilih'}
                    </span>
                    <span className="text-[10px] text-charcoal-muted">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'Logo saat ini'}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSelectedFile}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Ganti
                </Button>
              </div>
            ) : existingLogoFileId ? (
              <div className="border border-warm-200 rounded-xl p-3 bg-warm-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-charcoal">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <span>Logo tersimpan di sistem</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Ganti Logo
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-warm-300 hover:border-forest/50 bg-warm-50/50 hover:bg-warm-100/50 transition-colors rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="h-6 w-6 text-charcoal-muted" />
                <span className="text-xs font-medium text-charcoal">Klik untuk mengunggah logo sponsor</span>
                <span className="text-[10px] text-charcoal-muted">Disarankan logo dengan background transparan (PNG)</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Kategori Kerja Sama</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SponsorCategory)}
                className="w-full text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              >
                {Object.entries(SPONSOR_CATEGORY_LABELS).map(([catKey, label]) => (
                  <option key={catKey} value={catKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Bentuk Kontribusi Utama</label>
              <select
                value={contributionType}
                onChange={(e) => setContributionType(e.target.value as SponsorContributionType)}
                className="w-full text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              >
                {Object.entries(SPONSOR_CONTRIBUTION_LABELS).map(([typeKey, label]) => (
                  <option key={typeKey} value={typeKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal">Deskripsi Singkat Profil (Tampil di Publik)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat mengenai profil perusahaan / bidang usahanya..."
              className="w-full text-xs rounded-lg border border-warm-300 bg-white p-3 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal">Rincian Bentuk Dukungan / Kontribusi</label>
            <textarea
              rows={2}
              value={contributionDescription}
              onChange={(e) => setContributionDescription(e.target.value)}
              placeholder="Contoh: Bantuan 50 paket sembako posko dan pencetakan modul UMKM..."
              className="w-full text-xs rounded-lg border border-warm-300 bg-white p-3 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
            />
          </div>
        </div>

        {/* ================= SECTION 2: INFORMASI PUBLIK & PERIODE ================= */}
        <div className="space-y-4">
          <div className="border-b border-warm-200 pb-2">
            <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-forest" />
              2. Tautan Publik & Masa Kerja Sama
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Website Resmi (Opsional)</label>
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://perusahaan.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Media Sosial Resmi (Opsional)</label>
              <Input
                type="url"
                value={socialMediaUrl}
                onChange={(e) => setSocialMediaUrl(e.target.value)}
                placeholder="https://instagram.com/perusahaan"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Tanggal Mulai Kerja Sama</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Tanggal Berakhir (Kosongkan jika berkelanjutan)</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: PENGELOLAAN INTERNAL ================= */}
        <div className="space-y-4 bg-warm-50/70 p-4 rounded-xl border border-warm-200">
          <div className="border-b border-warm-300 pb-2">
            <h4 className="text-xs font-semibold text-forest uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-forest" />
              3. Pengelolaan Internal & Follow-up (Khusus Pengurus)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Status Hubungan / Pipeline</label>
              <select
                value={partnershipStatus}
                onChange={(e) => setPartnershipStatus(e.target.value as SponsorPartnershipStatus)}
                className="w-full text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30 font-medium"
              >
                {Object.entries(SPONSOR_PARTNERSHIP_STATUS_LABELS).map(([statKey, label]) => (
                  <option key={statKey} value={statKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">PIC Anggota KKN</label>
              <select
                value={picUserId}
                onChange={(e) => setPicUserId(e.target.value)}
                className="w-full text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
              >
                <option value="">Pilih PIC Internal...</option>
                {teamProfiles.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-charcoal-muted" /> Nama Kontak
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="PIC Eksternal"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-charcoal-muted" /> Email
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="kontak@perusahaan.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-charcoal-muted" /> Telepon / WA
              </label>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="081234567890"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-charcoal-muted" /> Jadwal Follow-up Berikutnya
              </label>
              <Input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal">Catatan Pendekatan & Negosiasi Internal</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tahapan pembicaraan, kebutuhan proposal, respon mitra..."
              className="w-full text-xs rounded-lg border border-warm-300 bg-white p-3 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-forest hover:bg-forest/90 text-white gap-1.5 shadow-subtle"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{sponsor ? 'Simpan Perubahan' : 'Simpan Data Sponsor'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

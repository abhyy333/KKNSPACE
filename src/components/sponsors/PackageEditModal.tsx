import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { updateSponsorshipPackage } from '@/services/sponsorsApi'
import type { SponsorshipPackage } from '@/types/sponsor'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'

interface PackageEditModalProps {
  open: boolean
  onClose: () => void
  pkg: SponsorshipPackage | null
  onSuccess: () => void
}

export const PackageEditModal: React.FC<PackageEditModalProps> = ({
  open,
  onClose,
  pkg,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [badgeLabel, setBadgeLabel] = useState('')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [newBenefit, setNewBenefit] = useState('')
  const [displayOrder, setDisplayOrder] = useState(1)
  const [isActive, setIsActive] = useState(true)
  const [publicVisibility, setPublicVisibility] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (pkg) {
      setDisplayName(pkg.display_name)
      setBadgeLabel(pkg.badge_label)
      setDescription(pkg.description)
      setBenefits(pkg.default_benefits || [])
      setDisplayOrder(pkg.display_order)
      setIsActive(pkg.is_active)
      setPublicVisibility(pkg.public_visibility)
    }
  }, [pkg])

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
    if (!pkg) return

    if (!displayName.trim()) {
      toast({ title: 'Nama paket wajib diisi', variant: 'error' })
      return
    }

    try {
      setIsSubmitting(true)
      await updateSponsorshipPackage(pkg.id, {
        display_name: displayName.trim(),
        badge_label: badgeLabel.trim(),
        description: description.trim(),
        default_benefits: benefits,
        display_order: displayOrder,
        is_active: isActive,
        public_visibility: publicVisibility,
      })

      toast({
        title: 'Paket Kemitraan Diperbarui',
        description: `Template ${displayName} berhasil disimpan. Perjanjian lama tidak terpengaruh.`,
        variant: 'success',
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan Paket',
        description: err.message,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!pkg) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Kelola Template Paket: ${pkg.display_name}`}
      description="Perubahan template ini hanya berlaku untuk proposal dan kesepakatan baru. Kesepakatan historis tetap menggunakan snapshot lama."
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-charcoal">Nama Paket / Tier *</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Diamond Partnership"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-charcoal">Label Badge Publik *</label>
            <Input
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value)}
              placeholder="Contoh: Diamond Partner"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-charcoal">Deskripsi Paket & Apresiasi *</label>
          <textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            rows={3}
            placeholder="Uraian tingkat kemitraan, penghargaan, dan cakupan program..."
            className="w-full text-xs rounded-lg border border-warm-300 bg-white p-2.5 text-charcoal focus:outline-hidden focus:ring-2 focus:ring-forest/30"
            required
          />
        </div>

        {/* Benefits List Management */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-charcoal flex items-center justify-between">
            <span>Daftar Benefit Standar ({benefits.length} Item)</span>
            <span className="text-[11px] text-charcoal-muted font-normal">Dapat disesuaikan di setiap proposal</span>
          </label>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {benefits.length === 0 ? (
              <p className="text-xs text-charcoal-muted italic p-2 bg-warm-50 rounded-lg">
                Belum ada benefit yang didaftarkan.
              </p>
            ) : (
              benefits.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-warm-50 border border-warm-200/80 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-[#19382B] shrink-0 mt-0.5" />
                    <span className="text-charcoal leading-snug">{b}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(i)}
                    className="text-rose-600 hover:text-rose-800 p-1 shrink-0"
                    title="Hapus benefit"
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
              placeholder="Tambahkan poin benefit baru..."
              className="text-xs"
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

        {/* Visibility & Ordering Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-warm-200">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-charcoal">Urutan Tampilan</label>
            <Input
              type="number"
              min={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded-sm border-warm-300 text-[#19382B] focus:ring-[#19382B]"
            />
            <label htmlFor="is_active" className="text-xs font-medium text-charcoal cursor-pointer">
              Paket Aktif Digunakan
            </label>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="public_visibility"
              checked={publicVisibility}
              onChange={(e) => setPublicVisibility(e.target.checked)}
              className="rounded-sm border-warm-300 text-[#19382B] focus:ring-[#19382B]"
            />
            <label htmlFor="public_visibility" className="text-xs font-medium text-charcoal cursor-pointer">
              Tampil di Publik (/sponsors)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" className="bg-forest hover:bg-forest/90 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Paket'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

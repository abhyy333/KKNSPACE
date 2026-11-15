import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRupiah, formatFinanceDate } from '@/lib/finance'
import { updateFinanceTransactionClassification } from '@/services/financeApi'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Tag, Store, Target, FileText, CheckCircle2 } from 'lucide-react'
import type { FinanceTransaction, FinanceCategory } from '@/types/database'

interface FinanceReclassifyModalProps {
  open: boolean
  onClose: () => void
  transaction: FinanceTransaction | null
  categories: FinanceCategory[]
  workPrograms: Array<{ id: string; title: string }>
}

export const FinanceReclassifyModal: React.FC<FinanceReclassifyModalProps> = ({
  open,
  onClose,
  transaction,
  categories,
  workPrograms,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [categoryId, setCategoryId] = useState<string>('')
  const [spendingPurpose, setSpendingPurpose] = useState<string>('')
  const [recipientOrVendor, setRecipientOrVendor] = useState<string>('')
  const [programId, setProgramId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.category_id || '')
      setSpendingPurpose(transaction.spending_purpose || '')
      setRecipientOrVendor(transaction.recipient_or_vendor || '')
      setProgramId(transaction.program_id || '')
    }
  }, [transaction])

  if (!transaction) return null

  const matchingCategories = categories.filter(
    (c) => c.is_active && c.type === transaction.type
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await updateFinanceTransactionClassification({
        transactionId: transaction.id,
        categoryId: categoryId || undefined,
        spendingPurpose: spendingPurpose.trim() || undefined,
        recipientOrVendor: recipientOrVendor.trim() || undefined,
        programId: programId || null,
      })

      await queryClient.invalidateQueries({ queryKey: ['workspace', 'finance'] })
      toast({
        title: 'Klasifikasi diperbarui',
        description: 'Rincian penggunaan dana berhasil diperbarui tanpa mengubah nominal asli.',
        variant: 'success',
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui klasifikasi'
      toast({
        title: 'Gagal memperbarui',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Klasifikasi & Rincian Penggunaan Dana"
      description="Perbarui informasi keperluan, penerima/vendor, dan program kerja terkait tanpa mengubah nominal atau riwayat transaksi asli."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Core Ledger Data */}
        <div className="rounded-xl border border-warm-200 bg-warm-50/80 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-charcoal-muted">Deskripsi Asli:</span>
            <span className="font-semibold text-charcoal">{transaction.description}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-charcoal-muted">Nominal (Terkunci):</span>
            <span className={`font-bold ${transaction.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatRupiah(Number(transaction.amount) || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-charcoal-muted">Tanggal Transaksi:</span>
            <span className="text-charcoal">{formatFinanceDate(transaction.transaction_date)}</span>
          </div>
        </div>

        {/* Kategori */}
        <div className="space-y-1.5">
          <label htmlFor="rec-cat" className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-sage-600" />
            <span>Kategori Transaksi</span>
          </label>
          <select
            id="rec-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            {matchingCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Penerima / Toko / Vendor */}
        <div className="space-y-1.5">
          <label htmlFor="rec-vendor" className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-sage-600" />
            <span>Penerima / Toko / Vendor</span>
          </label>
          <Input
            id="rec-vendor"
            type="text"
            value={recipientOrVendor}
            onChange={(e) => setRecipientOrVendor(e.target.value)}
            placeholder="Contoh: Toko Berkah / Warung Bu Siti / SPBU"
            disabled={isSubmitting}
          />
        </div>

        {/* Program Kerja Terkait */}
        <div className="space-y-1.5">
          <label htmlFor="rec-prog" className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-sage-600" />
            <span>Program Kerja Terkait (Opsional)</span>
          </label>
          <select
            id="rec-prog"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            <option value="">— Bukan bagian program kerja khusus —</option>
            {workPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Keperluan / Penggunaan Rinci */}
        <div className="space-y-1.5">
          <label htmlFor="rec-purpose" className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-sage-600" />
            <span>Keperluan / Penggunaan Dana</span>
          </label>
          <Input
            id="rec-purpose"
            type="text"
            value={spendingPurpose}
            onChange={(e) => setSpendingPurpose(e.target.value)}
            placeholder="Contoh: Snack dan air mineral untuk 25 peserta sosialisasi UMKM"
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-sage-700 hover:bg-sage-800 text-white gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Simpan Perubahan Klasifikasi</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

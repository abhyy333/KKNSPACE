import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Paperclip, Trash2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { getLocalDateKey } from '@/services/dashboardApi'
import {
  createFinanceTransaction,
  financeTransactionFormSchema,
  type FinanceTransactionFormInput,
} from '@/services/financeApi'
import {
  formatRupiah,
  parsePositiveRupiahInput,
  validateReceiptFile,
} from '@/lib/finance'
import type { FinanceCategory } from '@/types/database'

interface FinanceTransactionModalProps {
  open: boolean
  onClose: () => void
  categories: FinanceCategory[]
  onOpenCategoryManager: () => void
}

export const FinanceTransactionModal: React.FC<FinanceTransactionModalProps> = ({
  open,
  onClose,
  categories,
  onOpenCategoryManager,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const defaultDate = getLocalDateKey()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceTransactionFormInput>({
    resolver: zodResolver(financeTransactionFormSchema),
    defaultValues: {
      type: 'expense',
      amountRaw: '',
      categoryId: '',
      transactionDate: defaultDate,
      description: '',
    },
  })

  const selectedType = watch('type')
  const amountRaw = watch('amountRaw')
  const selectedCategoryId = watch('categoryId')

  const matchingActiveCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.type === selectedType),
    [categories, selectedType]
  )

  useEffect(() => {
    if (!open) return
    const firstActive = matchingActiveCategories[0]?.id ?? ''
    const stillValid = matchingActiveCategories.some((c) => c.id === selectedCategoryId)
    if (!stillValid) {
      setValue('categoryId', firstActive, { shouldValidate: false })
    }
  }, [open, matchingActiveCategories, selectedCategoryId, setValue])

  const parsedPreviewAmount = useMemo(
    () => parsePositiveRupiahInput(amountRaw || ''),
    [amountRaw]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null
    if (!picked) {
      setReceiptFile(null)
      setFileError(null)
      return
    }
    const err = validateReceiptFile(picked)
    if (err) {
      setReceiptFile(null)
      setFileError(err)
      event.target.value = ''
      return
    }
    setFileError(null)
    setReceiptFile(picked)
  }

  const clearSelectedFile = () => {
    setReceiptFile(null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetAndClose = () => {
    reset({
      type: 'expense',
      amountRaw: '',
      categoryId: '',
      transactionDate: getLocalDateKey(),
      description: '',
    })
    clearSelectedFile()
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: (data: FinanceTransactionFormInput) =>
      createFinanceTransaction({
        input: data,
        receiptFile,
        categories,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'finance'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard'] }),
      ])
      toast({
        title: 'Transaksi dicatat',
        description: 'Transaksi keuangan beserta jejak audit berhasil disimpan.',
        variant: 'success',
      })
      resetAndClose()
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal mencatat transaksi',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const onSubmit = (data: FinanceTransactionFormInput) => {
    if (createMutation.isPending || isSubmitting) return
    if (fileError) return
    createMutation.mutate(data)
  }

  const isBusy = createMutation.isPending || isSubmitting

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => {} : resetAndClose}
      title="Catat Transaksi Keuangan"
      description="Transaksi yang disimpan bersifat permanen (ledger immutable) dan tercatat dalam audit log."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Jenis Transaksi */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal block">Jenis Transaksi</label>
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={isBusy}
                onClick={() => setValue('type', kind, { shouldValidate: true })}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  selectedType === kind
                    ? kind === 'income'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-sage-50 border-sage-600 text-sage-800'
                    : 'bg-white border-warm-300 text-charcoal-muted hover:bg-warm-50'
                }`}
              >
                {kind === 'income' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
              </button>
            ))}
          </div>
          {errors.type && (
            <p className="text-[11px] text-rose-600">{errors.type.message}</p>
          )}
        </div>

        {/* Nominal & Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="tx-amount" className="text-xs font-medium text-charcoal block">
              Nominal (Rp)
            </label>
            <Input
              id="tx-amount"
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 150000"
              disabled={isBusy}
              {...register('amountRaw')}
            />
            <div className="flex items-center justify-between text-[11px]">
              {errors.amountRaw ? (
                <span className="text-rose-600">{errors.amountRaw.message}</span>
              ) : Number.isFinite(parsedPreviewAmount) && parsedPreviewAmount > 0 ? (
                <span className="text-sage-700 font-medium">
                  Pratinjau: {formatRupiah(parsedPreviewAmount)}
                </span>
              ) : (
                <span className="text-charcoal-muted">Masukkan nominal positif</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tx-date" className="text-xs font-medium text-charcoal block">
              Tanggal Transaksi
            </label>
            <Input
              id="tx-date"
              type="date"
              disabled={isBusy}
              {...register('transactionDate')}
            />
            {errors.transactionDate && (
              <p className="text-[11px] text-rose-600">{errors.transactionDate.message}</p>
            )}
          </div>
        </div>

        {/* Kategori */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="tx-category" className="text-xs font-medium text-charcoal">
              Kategori ({selectedType === 'income' ? 'Pemasukan' : 'Pengeluaran'})
            </label>
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="text-[11px] font-medium text-sage-700 hover:underline"
            >
              + Kelola Kategori
            </button>
          </div>

          {matchingActiveCategories.length > 0 ? (
            <select
              id="tx-category"
              disabled={isBusy}
              className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              {...register('categoryId')}
            >
              {matchingActiveCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Belum ada kategori aktif untuk{' '}
                <strong>{selectedType === 'income' ? 'Pemasukan' : 'Pengeluaran'}</strong>. Buat
                kategori terlebih dahulu lewat tombol <strong>+ Kelola Kategori</strong>.
              </span>
            </div>
          )}
          {errors.categoryId && (
            <p className="text-[11px] text-rose-600">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Deskripsi */}
        <div className="space-y-1.5">
          <label htmlFor="tx-desc" className="text-xs font-medium text-charcoal block">
            Deskripsi / Keperluan
          </label>
          <textarea
            id="tx-desc"
            rows={3}
            disabled={isBusy}
            placeholder="Contoh: Pembelian konsumsi sosialisasi Posyandu Dusun Lauk"
            className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-[11px] text-rose-600">{errors.description.message}</p>
          )}
        </div>

        {/* Bukti Transaksi */}
        <div className="space-y-1.5">
          <label htmlFor="tx-receipt" className="text-xs font-medium text-charcoal block">
            Bukti Transaksi / Kuitansi (Opsional, Privat)
          </label>
          <div className="rounded-lg border border-dashed border-warm-300 bg-warm-50/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                ref={fileInputRef}
                id="tx-receipt"
                type="file"
                disabled={isBusy}
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="text-xs text-charcoal file:mr-3 file:rounded-md file:border file:border-warm-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-charcoal hover:file:bg-warm-100"
              />
              {receiptFile && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-700 hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus pilihan
                </button>
              )}
            </div>

            {receiptFile ? (
              <div className="flex items-center gap-1.5 text-[11px] text-sage-800">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium">{receiptFile.name}</span>
                <span className="text-charcoal-muted shrink-0">
                  ({Math.max(1, Math.round(receiptFile.size / 1024))} KB)
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-charcoal-muted">
                Format: JPG, PNG, WebP, atau PDF (maks. 10 MB). Diunggah ke bucket privat{' '}
                <code>kkn-private</code>.
              </p>
            )}
          </div>
          {fileError && <p className="text-[11px] text-rose-600">{fileError}</p>}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetAndClose}
            disabled={isBusy}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isBusy || matchingActiveCategories.length === 0}
            className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
          >
            {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Simpan Transaksi</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

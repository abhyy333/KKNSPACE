import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { getLocalDateKey } from '@/services/dashboardApi'
import {
  createFinanceReversal,
  financeReversalFormSchema,
  type FinanceReversalFormInput,
} from '@/services/financeApi'
import { formatFinanceDate, formatRupiah } from '@/lib/finance'
import type { FinanceTransaction } from '@/types/database'

interface FinanceReversalModalProps {
  transaction: FinanceTransaction | null
  onClose: () => void
}

export const FinanceReversalModal: React.FC<FinanceReversalModalProps> = ({
  transaction,
  onClose,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceReversalFormInput>({
    resolver: zodResolver(financeReversalFormSchema),
    defaultValues: {
      correctionReason: '',
      transactionDate: getLocalDateKey(),
    },
  })

  const handleClose = () => {
    reset({
      correctionReason: '',
      transactionDate: getLocalDateKey(),
    })
    onClose()
  }

  const reversalMutation = useMutation({
    mutationFn: (data: FinanceReversalFormInput) => {
      if (!transaction) {
        throw new Error('Transaksi target tidak dipilih.')
      }
      return createFinanceReversal({
        originalTransaction: transaction,
        input: data,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'finance'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard'] }),
      ])
      toast({
        title: 'Transaksi pembalik dibuat',
        description: 'Koreksi berhasil dicatat tanpa menghapus histori transaksi asli.',
        variant: 'success',
      })
      handleClose()
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal membuat transaksi pembalik',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const onSubmit = (data: FinanceReversalFormInput) => {
    if (reversalMutation.isPending || isSubmitting) return
    reversalMutation.mutate(data)
  }

  const isBusy = reversalMutation.isPending || isSubmitting

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={isBusy ? () => {} : handleClose}
      title="Buat Transaksi Pembalik (Reversal)"
      description="Karena buku kas bersifat immutable, koreksi dilakukan dengan mencatat entri pembalik bernominal sama dan berjenis berlawanan."
      maxWidthClass="max-w-md"
    >
      {transaction && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-warm-200 bg-warm-50 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-charcoal-muted">
              <span>Transaksi Asli ({formatFinanceDate(transaction.transaction_date)})</span>
              <span className="font-semibold text-charcoal">
                {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </span>
            </div>
            <div className="font-semibold text-charcoal">{transaction.description}</div>
            <div className="text-sm font-serif font-semibold text-charcoal">
              {formatRupiah(transaction.amount)}
            </div>
            <p className="text-[11px] text-charcoal-muted pt-1">
              Entri pembalik akan mencatat{' '}
              <strong>
                {transaction.type === 'income' ? 'Pengeluaran' : 'Pemasukan'}
              </strong>{' '}
              sebesar <strong>{formatRupiah(transaction.amount)}</strong> agar saldo kembali netral.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rev-date" className="text-xs font-medium text-charcoal block">
              Tanggal Pencatatan Pembalik
            </label>
            <Input
              id="rev-date"
              type="date"
              disabled={isBusy}
              {...register('transactionDate')}
            />
            {errors.transactionDate && (
              <p className="text-[11px] text-rose-600">{errors.transactionDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rev-reason" className="text-xs font-medium text-charcoal block">
              Alasan Koreksi (Wajib)
            </label>
            <textarea
              id="rev-reason"
              rows={3}
              disabled={isBusy}
              placeholder="Contoh: Kesalahan input nominal kuitansi, akan dicatat ulang sesuai nota"
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal placeholder:text-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              {...register('correctionReason')}
            />
            {errors.correctionReason && (
              <p className="text-[11px] text-rose-600">{errors.correctionReason.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isBusy}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isBusy}
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs gap-1.5"
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>Konfirmasi Pembalik</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

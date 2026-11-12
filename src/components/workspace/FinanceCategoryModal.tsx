import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Power } from 'lucide-react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  createFinanceCategory,
  financeCategoryFormSchema,
  updateFinanceCategoryStatus,
  type FinanceCategoryFormInput,
} from '@/services/financeApi'
import type { FinanceCategory } from '@/types/database'

interface FinanceCategoryModalProps {
  open: boolean
  onClose: () => void
  categories: FinanceCategory[]
}

export const FinanceCategoryModal: React.FC<FinanceCategoryModalProps> = ({
  open,
  onClose,
  categories,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceCategoryFormInput>({
    resolver: zodResolver(financeCategoryFormSchema),
    defaultValues: {
      name: '',
      type: 'expense',
    },
  })

  const createMutation = useMutation({
    mutationFn: createFinanceCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'finance'] })
      toast({
        title: 'Kategori ditambahkan',
        description: 'Kategori baru siap dipilih pada formulir transaksi.',
        variant: 'success',
      })
      reset({ name: '', type: 'expense' })
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal menambah kategori',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateFinanceCategoryStatus(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'finance'] })
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal memperbarui kategori',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const onSubmit = (data: FinanceCategoryFormInput) => {
    if (createMutation.isPending || isSubmitting) return
    createMutation.mutate(data)
  }

  return (
    <Modal
      open={open}
      onClose={createMutation.isPending ? () => {} : onClose}
      title="Kelola Kategori Keuangan"
      description="Kategori menjaga klasifikasi pemasukan & pengeluaran tetap konsisten. Kategori terpakai dinonaktifkan (bukan dihapus) agar histori tetap utuh."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-5">
        {/* Form Tambah Kategori */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-warm-200 bg-warm-50/70 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="cat-name" className="text-xs font-medium text-charcoal block">
                Nama Kategori Baru
              </label>
              <Input
                id="cat-name"
                type="text"
                placeholder="Contoh: Konsumsi Program"
                disabled={createMutation.isPending}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="cat-type" className="text-xs font-medium text-charcoal block">
                Jenis
              </label>
              <select
                id="cat-type"
                disabled={createMutation.isPending}
                className="flex h-10 w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                {...register('type')}
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="bg-sage-700 hover:bg-sage-800 text-white text-xs gap-1.5"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Tambah Kategori</span>
            </Button>
          </div>
        </form>

        {/* Daftar Kategori */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Daftar Kategori ({categories.length})
          </h4>
          {categories.length === 0 ? (
            <p className="text-xs text-charcoal-muted py-4 text-center border border-dashed border-warm-300 rounded-lg">
              Belum ada kategori keuangan. Tambahkan kategori pemasukan dan pengeluaran di atas.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-warm-200 rounded-lg border border-warm-200 bg-white">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-charcoal truncate">{cat.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant={cat.type === 'income' ? 'success' : 'secondary'}>
                        {cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </Badge>
                      <Badge variant={cat.is_active ? 'outline' : 'sand'}>
                        {cat.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggleMutation.isPending}
                    onClick={() =>
                      toggleMutation.mutate({ id: cat.id, isActive: !cat.is_active })
                    }
                    className="text-[11px] h-7 px-2.5 gap-1 shrink-0"
                  >
                    <Power className="h-3 w-3" />
                    <span>{cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

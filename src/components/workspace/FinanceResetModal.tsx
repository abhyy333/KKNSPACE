import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRupiah, parseNonNegativeRupiahInput } from '@/lib/finance'
import { AlertTriangle, ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import type { FinanceBook } from '@/types/database'

interface FinanceResetModalProps {
  open: boolean
  onClose: () => void
  activeBook: FinanceBook | null
  currentTransactionCount: number
  currentTotalIncome: number
  currentTotalExpense: number
  currentCashBalance: number
  onConfirmReset: (newInitialBalance: number, notes?: string) => Promise<void>
}

export const FinanceResetModal: React.FC<FinanceResetModalProps> = ({
  open,
  onClose,
  activeBook,
  currentTransactionCount,
  currentTotalIncome,
  currentTotalExpense,
  currentCashBalance,
  onConfirmReset,
}) => {
  const [stage, setStage] = useState<1 | 2>(1)
  const [newInitialBalanceRaw, setNewInitialBalanceRaw] = useState<string>('0')
  const [resetNotes, setResetNotes] = useState<string>('')
  const [confirmationInput, setConfirmationInput] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset form states cleanly every time modal is opened
  useEffect(() => {
    if (open) {
      setStage(1)
      setNewInitialBalanceRaw('0')
      setResetNotes('')
      setConfirmationInput('')
      setErrorMessage(null)
      setIsSubmitting(false)
    }
  }, [open])

  const parsedNewInitialBalance = parseNonNegativeRupiahInput(newInitialBalanceRaw)
  const isBalanceValid = parsedNewInitialBalance !== null
  const isPhraseMatch = confirmationInput.trim() === 'RESET KEUANGAN'

  const handleResetFlow = () => {
    setStage(1)
    setNewInitialBalanceRaw('0')
    setResetNotes('')
    setConfirmationInput('')
    setErrorMessage(null)
    setIsSubmitting(false)
    onClose()
  }

  const handleProceedToStage2 = () => {
    if (newInitialBalanceRaw.trim() === '') {
      setErrorMessage('Saldo awal buku kas baru wajib diisi (minimal Rp 0).')
      return
    }
    if (!isBalanceValid || parsedNewInitialBalance === null) {
      setErrorMessage('Masukkan saldo awal buku kas baru yang valid (minimal Rp 0).')
      return
    }
    setErrorMessage(null)
    setStage(2)
  }

  const handleFinalSubmit = async () => {
    if (!isPhraseMatch || isSubmitting || parsedNewInitialBalance === null) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const cleanNotes = resetNotes.trim() !== '' ? resetNotes.trim() : undefined
      await onConfirmReset(parsedNewInitialBalance, cleanNotes)
      handleResetFlow()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses reset keuangan.'
      setErrorMessage(msg)
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : handleResetFlow}
      title={stage === 1 ? 'Reset Keuangan & Mulai Buku Kas Baru' : 'Konfirmasi Tahap Akhir: RESET KEUANGAN'}
      description={
        stage === 1
          ? 'Fitur aman untuk mengarsipkan buku kas periode saat ini dan memulai buku kas baru dengan saldo awal eksplisit.'
          : 'Tindakan ini memerlukan pengetikan konfirmasi eksplisit sebelum buku kas lama dibekukan dan diarsipkan.'
      }
      maxWidthClass="max-w-xl"
    >
      {stage === 1 ? (
        <div className="space-y-4">
          {/* Warning Banner */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-semibold text-amber-900">Perhatian Sebelum Melakukan Reset:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                <li>Seluruh transaksi pada buku kas aktif saat ini akan <strong>diarsipkan secara utuh</strong> tanpa ada data yang dihapus permanen.</li>
                <li>Transaksi lama tidak akan lagi dihitung dalam saldo buku kas aktif yang baru.</li>
                <li>Riwayat keuangan periode lama tetap dapat ditinjau kapan saja melalui menu <strong>Arsip Keuangan</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Current Active Data Snapshot */}
          <div className="rounded-xl border border-warm-200 bg-warm-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-warm-200 pb-2">
              <span className="text-xs font-semibold text-charcoal">Buku Kas yang Akan Direset</span>
              <span className="text-xs font-bold text-sage-800">
                {activeBook?.title || `Buku Kas #${activeBook?.book_number || 1}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-white p-2 border border-warm-200">
                <span className="text-[10px] text-charcoal-muted block">Jumlah Transaksi</span>
                <span className="text-xs font-bold text-charcoal">{currentTransactionCount} Transaksi</span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-warm-200">
                <span className="text-[10px] text-charcoal-muted block">Total Pemasukan</span>
                <span className="text-xs font-bold text-emerald-700">{formatRupiah(currentTotalIncome)}</span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-warm-200">
                <span className="text-[10px] text-charcoal-muted block">Total Pengeluaran</span>
                <span className="text-xs font-bold text-rose-700">{formatRupiah(currentTotalExpense)}</span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-warm-200">
                <span className="text-[10px] text-charcoal-muted block">Saldo Kas Saat Ini</span>
                <span className="text-xs font-bold text-sage-800">{formatRupiah(currentCashBalance)}</span>
              </div>
            </div>
          </div>

          {/* Explicit Initial Balance for New Book */}
          <div className="space-y-1.5">
            <label htmlFor="new-init-balance" className="text-xs font-semibold text-charcoal block">
              Saldo Awal Buku Kas Baru (Rp) <span className="text-rose-600">*</span>
            </label>
            <Input
              id="new-init-balance"
              type="text"
              inputMode="numeric"
              value={newInitialBalanceRaw}
              onChange={(e) => setNewInitialBalanceRaw(e.target.value)}
              placeholder="Contoh: 0 atau 500000"
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-charcoal-muted">
                Tentukan modal kas awal yang akan aktif di buku kas baru.
              </span>
              <span className="font-semibold text-sage-800">
                Pratinjau:{' '}
                {isBalanceValid && parsedNewInitialBalance !== null
                  ? formatRupiah(parsedNewInitialBalance)
                  : 'Nominal tidak valid'}
              </span>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label htmlFor="reset-notes" className="text-xs font-semibold text-charcoal block">
              Catatan Periode Baru / Alasan Reset <span className="text-charcoal-muted font-normal">(Opsional)</span>
            </label>
            <Input
              id="reset-notes"
              type="text"
              value={resetNotes}
              onChange={(e) => setResetNotes(e.target.value)}
              placeholder="Contoh: Penutupan buku kas bulan ke-1 / Peralihan periode program kerja"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
            <Button type="button" variant="outline" onClick={handleResetFlow}>
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleProceedToStage2}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <span>Lanjut ke Konfirmasi Akhir</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stage 2 Strict Confirmation */}
          <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950 space-y-1">
              <p className="font-bold text-rose-900">Konfirmasi Verifikasi Dua Tahap:</p>
              <p className="text-rose-800">
                Anda akan mengarsipkan Buku Kas #{activeBook?.book_number || 1} dengan saldo akhir{' '}
                <strong>{formatRupiah(currentCashBalance)}</strong> dan membuka Buku Kas baru dengan saldo awal{' '}
                <strong>{formatRupiah(parsedNewInitialBalance ?? 0)}</strong>.
              </p>
              <p className="text-rose-800">
                Untuk mencegah ketidaksengajaan, ketik kata di bawah ini secara persis:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal">
              <span>Ketik: <span className="font-mono bg-warm-100 px-2 py-0.5 rounded border border-warm-300 text-rose-700 font-bold">RESET KEUANGAN</span></span>
              {isPhraseMatch && (
                <span className="text-emerald-700 flex items-center gap-1 font-medium text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Teks Cocok
                </span>
              )}
            </div>
            <Input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Ketik RESET KEUANGAN"
              disabled={isSubmitting}
              className="font-mono"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStage(1)}
            >
              Kembali ke Tahap 1
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleResetFlow}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={!isPhraseMatch || isSubmitting}
                onClick={handleFinalSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Reset...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    <span>Konfirmasi & Mulai Buku Kas Baru</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

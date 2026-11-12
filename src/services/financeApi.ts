import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import {
  isValidIsoDate,
  parsePositiveRupiahInput,
  validateReceiptFile,
} from '@/lib/finance'
import type {
  FileObject,
  FinanceAttachment,
  FinanceCategory,
  FinanceTransaction,
  WorkspaceMemberSummary,
} from '@/types/database'

export const financeCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(80, 'Nama kategori maksimal 80 karakter'),
  type: z.enum(['income', 'expense']),
})

export type FinanceCategoryFormInput = z.infer<typeof financeCategoryFormSchema>

export const financeTransactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amountRaw: z
    .string()
    .trim()
    .min(1, 'Nominal wajib diisi')
    .refine(
      (val) => Number.isFinite(parsePositiveRupiahInput(val)) && parsePositiveRupiahInput(val) > 0,
      'Nominal harus berupa angka positif lebih dari Rp 0'
    )
    .refine(
      (val) => parsePositiveRupiahInput(val) <= 999_999_999_999,
      'Nominal melebihi batas maksimum pencatatan'
    ),
  categoryId: z.string().uuid('Pilih kategori transaksi yang sah'),
  transactionDate: z
    .string()
    .trim()
    .refine((val) => isValidIsoDate(val), 'Tanggal transaksi tidak valid'),
  description: z
    .string()
    .trim()
    .min(3, 'Deskripsi transaksi minimal 3 karakter')
    .max(300, 'Deskripsi transaksi maksimal 300 karakter'),
})

export type FinanceTransactionFormInput = z.infer<typeof financeTransactionFormSchema>

export const financeReversalFormSchema = z.object({
  correctionReason: z
    .string()
    .trim()
    .min(5, 'Alasan koreksi/pembalikan minimal 5 karakter')
    .max(300, 'Alasan koreksi maksimal 300 karakter'),
  transactionDate: z
    .string()
    .trim()
    .refine((val) => isValidIsoDate(val), 'Tanggal transaksi pembalik tidak valid'),
})

export type FinanceReversalFormInput = z.infer<typeof financeReversalFormSchema>

export interface FinanceAttachmentWithFile extends FinanceAttachment {
  file: FileObject | null
}

export interface FinanceLedgerData {
  categories: FinanceCategory[]
  transactions: FinanceTransaction[]
  attachmentsByTransaction: Record<string, FinanceAttachmentWithFile[]>
  membersById: Record<string, WorkspaceMemberSummary>
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }
  return data.user.id
}

export async function fetchFinanceLedgerData(): Promise<FinanceLedgerData> {
  const [categoriesRes, transactionsRes, attachmentsRes, membersRes] = await Promise.all([
    supabase
      .from('finance_categories')
      .select('id, name, type, is_active, created_at')
      .order('type', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('finance_transactions')
      .select(
        'id, category_id, type, amount, description, transaction_date, recorded_by, reversal_of_transaction_id, correction_reason, created_at'
      )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('finance_attachments')
      .select('id, transaction_id, file_id, created_at')
      .order('created_at', { ascending: true }),
    supabase.rpc('get_workspace_members'),
  ])

  const firstError =
    categoriesRes.error ||
    transactionsRes.error ||
    attachmentsRes.error ||
    membersRes.error

  if (firstError) {
    throw new Error(`Gagal memuat data keuangan: ${firstError.message}`)
  }

  const attachments = (attachmentsRes.data as FinanceAttachment[]) ?? []
  const fileMap = new Map<string, FileObject>()

  if (attachments.length > 0) {
    const fileIds = Array.from(new Set(attachments.map((item) => item.file_id)))
    const { data: filesData, error: filesErr } = await supabase
      .from('file_objects')
      .select(
        'id, bucket_id, object_path, original_name, mime_type, file_size, uploaded_by, created_at'
      )
      .in('id', fileIds)

    if (filesErr) {
      throw new Error(`Gagal memuat metadata bukti transaksi: ${filesErr.message}`)
    }

    for (const file of (filesData as FileObject[]) ?? []) {
      fileMap.set(file.id, file)
    }
  }

  const attachmentsByTransaction: Record<string, FinanceAttachmentWithFile[]> = {}
  for (const att of attachments) {
    const entry: FinanceAttachmentWithFile = {
      ...att,
      file: fileMap.get(att.file_id) ?? null,
    }
    if (!attachmentsByTransaction[att.transaction_id]) {
      attachmentsByTransaction[att.transaction_id] = []
    }
    attachmentsByTransaction[att.transaction_id].push(entry)
  }

  const membersById: Record<string, WorkspaceMemberSummary> = {}
  for (const member of (membersRes.data as WorkspaceMemberSummary[]) ?? []) {
    membersById[member.user_id] = member
  }

  return {
    categories: (categoriesRes.data as FinanceCategory[]) ?? [],
    transactions: (transactionsRes.data as FinanceTransaction[]) ?? [],
    attachmentsByTransaction,
    membersById,
  }
}

export async function createFinanceCategory(
  input: FinanceCategoryFormInput
): Promise<FinanceCategory> {
  const parsed = financeCategoryFormSchema.parse(input)

  const { data, error } = await supabase
    .from('finance_categories')
    .insert({
      name: parsed.name,
      type: parsed.type,
      is_active: true,
    })
    .select('id, name, type, is_active, created_at')
    .single()

  if (error || !data) {
    throw new Error(`Gagal membuat kategori keuangan: ${error?.message || 'Unknown error'}`)
  }

  return data as FinanceCategory
}

export async function updateFinanceCategoryStatus(
  categoryId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('finance_categories')
    .update({ is_active: isActive })
    .eq('id', categoryId)

  if (error) {
    throw new Error(`Gagal memperbarui status kategori: ${error.message}`)
  }
}

export async function createFinanceTransaction(params: {
  input: FinanceTransactionFormInput
  receiptFile?: File | null
  categories: FinanceCategory[]
}): Promise<FinanceTransaction> {
  const parsed = financeTransactionFormSchema.parse(params.input)
  const amount = parsePositiveRupiahInput(parsed.amountRaw)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal transaksi harus berupa angka positif.')
  }

  const selectedCategory = params.categories.find((c) => c.id === parsed.categoryId)
  if (!selectedCategory || !selectedCategory.is_active || selectedCategory.type !== parsed.type) {
    throw new Error('Kategori tidak valid atau tidak sesuai dengan jenis transaksi.')
  }

  if (params.receiptFile) {
    const fileValidationErr = validateReceiptFile(params.receiptFile)
    if (fileValidationErr) {
      throw new Error(fileValidationErr)
    }
  }

  const userId = await getCurrentUserId()
  let uploadedFile: FileObject | null = null

  if (params.receiptFile) {
    uploadedFile = await uploadPrivateFile(params.receiptFile, 'finance')
  }

  const { data: txData, error: txErr } = await supabase
    .from('finance_transactions')
    .insert({
      category_id: selectedCategory.id,
      type: parsed.type,
      amount,
      description: parsed.description,
      transaction_date: parsed.transactionDate,
      recorded_by: userId,
    })
    .select(
      'id, category_id, type, amount, description, transaction_date, recorded_by, reversal_of_transaction_id, correction_reason, created_at'
    )
    .single()

  if (txErr || !txData) {
    throw new Error(`Gagal mencatat transaksi keuangan: ${txErr?.message || 'Unknown error'}`)
  }

  const createdTx = txData as FinanceTransaction

  if (uploadedFile) {
    const { error: attErr } = await supabase.from('finance_attachments').insert({
      transaction_id: createdTx.id,
      file_id: uploadedFile.id,
    })

    if (attErr) {
      throw new Error(
        `Transaksi tersimpan, namun gagal menautkan bukti file: ${attErr.message}`
      )
    }
  }

  return createdTx
}

export async function createFinanceReversal(params: {
  originalTransaction: FinanceTransaction
  input: FinanceReversalFormInput
}): Promise<FinanceTransaction> {
  const { originalTransaction, input } = params
  if (originalTransaction.reversal_of_transaction_id) {
    throw new Error('Transaksi pembalik tidak dapat dibalik kembali.')
  }

  const parsed = financeReversalFormSchema.parse(input)
  const userId = await getCurrentUserId()
  const oppositeType = originalTransaction.type === 'income' ? 'expense' : 'income'

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({
      category_id: originalTransaction.category_id,
      type: oppositeType,
      amount: Number(originalTransaction.amount),
      description: `[Pembalik] ${originalTransaction.description}`,
      transaction_date: parsed.transactionDate,
      recorded_by: userId,
      reversal_of_transaction_id: originalTransaction.id,
      correction_reason: parsed.correctionReason,
    })
    .select(
      'id, category_id, type, amount, description, transaction_date, recorded_by, reversal_of_transaction_id, correction_reason, created_at'
    )
    .single()

  if (error || !data) {
    throw new Error(`Gagal membuat transaksi pembalik: ${error?.message || 'Unknown error'}`)
  }

  return data as FinanceTransaction
}

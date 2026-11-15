import type { FinanceCategory, FinanceTransaction, FinanceTransactionType } from '@/types/database'

export const KKN_TIMEZONE = 'Asia/Makassar'

const IDR_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function getMakassarDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: KKN_TIMEZONE }).format(date)
}

export const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export function formatRupiah(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return IDR_FORMATTER.format(0)
  return IDR_FORMATTER.format(numeric)
}

export function formatFinanceDate(dateStr: string): string {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  if (Number.isNaN(dt.getTime())) return dateStr
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: KKN_TIMEZONE,
  }).format(dt)
}

export function parsePositiveRupiahInput(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return Number.NaN
  }

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.NaN
  }

  return Math.round(parsed)
}

/**
 * Safely parse non-negative Rupiah input, explicitly allowing 0 as a valid value.
 * Distinguishes empty input (returns null) from numerical 0 (returns 0).
 * Rejects negative numbers or invalid numeric formats (returns null).
 */
export function parseNonNegativeRupiahInput(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null
  }
  const str = String(raw).trim()
  if (str === '') {
    return null
  }

  const cleaned = str
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null
  }

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return Math.round(parsed)
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export function validateReceiptFile(file: File): string | null {
  if (file.size <= 0) {
    return 'Berkas bukti transaksi tidak boleh kosong.'
  }
  if (file.size > MAX_RECEIPT_FILE_BYTES) {
    return 'Ukuran bukti transaksi maksimal 10 MB.'
  }

  const lowerName = file.name.toLowerCase()
  const hasAllowedExtension =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.pdf')

  if (!ALLOWED_RECEIPT_MIME_TYPES.has(file.type) && !hasAllowedExtension) {
    return 'Format bukti harus JPG, PNG, WebP, atau PDF.'
  }

  return null
}

export type FinanceRecapPeriodMode = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export function toIsoDateLocal(dt: Date): string {
  return getMakassarDateKey(dt)
}

export function getRecapDateRange(
  mode: FinanceRecapPeriodMode,
  anchorDate: string,
  customStart: string,
  customEnd: string
): DateRange {
  const baseDateStr = isValidIsoDate(anchorDate) ? anchorDate : getMakassarDateKey()
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))

  if (mode === 'daily') {
    return {
      startDate: baseDateStr,
      endDate: baseDateStr,
      label: `Harian (${formatFinanceDate(baseDateStr)})`,
    }
  }

  if (mode === 'weekly') {
    const dayOfWeek = base.getUTCDay() // 0 = Sun, 1 = Mon
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetToMonday))
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6))
    const start = monday.toISOString().split('T')[0]
    const end = sunday.toISOString().split('T')[0]
    return {
      startDate: start,
      endDate: end,
      label: `Mingguan (${formatFinanceDate(start)} – ${formatFinanceDate(end)})`,
    }
  }

  if (mode === 'monthly') {
    const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`
    const lastDayOfMonth = new Date(y, m, 0).getDate()
    const end = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
    return {
      startDate: start,
      endDate: end,
      label: `Bulanan (${formatFinanceDate(start)} – ${formatFinanceDate(end)})`,
    }
  }

  const validStart = isValidIsoDate(customStart) ? customStart : baseDateStr
  const validEnd = isValidIsoDate(customEnd) ? customEnd : validStart
  const orderedStart = validStart <= validEnd ? validStart : validEnd
  const orderedEnd = validStart <= validEnd ? validEnd : validStart

  return {
    startDate: orderedStart,
    endDate: orderedEnd,
    label: `Periode (${formatFinanceDate(orderedStart)} – ${formatFinanceDate(orderedEnd)})`,
  }
}

export type FinanceTransactionAuditStatus = 'recorded' | 'cancelled' | 'reversal'

export interface FinanceTransactionWithStatus extends FinanceTransaction {
  auditStatus: FinanceTransactionAuditStatus
  isEffective: boolean
  isReversed: boolean
  isReversal: boolean
  statusLabel: 'Tercatat' | 'Dibatalkan' | 'Pembalik'
  statusVariant: 'success' | 'outline' | 'sand'
}

export function getFinanceTransactionAuditStatus(
  tx: FinanceTransaction,
  reversedTargetIds: Set<string>
): {
  auditStatus: FinanceTransactionAuditStatus
  label: 'Tercatat' | 'Dibatalkan' | 'Pembalik'
  variant: 'success' | 'outline' | 'sand'
  isEffective: boolean
} {
  if (tx.reversal_of_transaction_id) {
    return { auditStatus: 'reversal', label: 'Pembalik', variant: 'sand', isEffective: false }
  }
  if (reversedTargetIds.has(tx.id)) {
    return { auditStatus: 'cancelled', label: 'Dibatalkan', variant: 'outline', isEffective: false }
  }
  return { auditStatus: 'recorded', label: 'Tercatat', variant: 'success', isEffective: true }
}

export function classifyFinanceTransactions(transactions: FinanceTransaction[]): {
  reversedTargetIds: Set<string>
  classifiedTransactions: FinanceTransactionWithStatus[]
  effectiveTransactions: FinanceTransaction[]
} {
  const reversedTargetIds = new Set<string>()
  for (const tx of transactions) {
    if (tx.reversal_of_transaction_id) {
      reversedTargetIds.add(tx.reversal_of_transaction_id)
    }
  }

  const effectiveTransactions: FinanceTransaction[] = []
  const classifiedTransactions: FinanceTransactionWithStatus[] = transactions.map((tx) => {
    const statusMeta = getFinanceTransactionAuditStatus(tx, reversedTargetIds)
    const isReversal = statusMeta.auditStatus === 'reversal'
    const isReversed = statusMeta.auditStatus === 'cancelled'
    const isEffective = statusMeta.isEffective

    if (isEffective) {
      effectiveTransactions.push(tx)
    }

    return {
      ...tx,
      auditStatus: statusMeta.auditStatus,
      isEffective,
      isReversed,
      isReversal,
      statusLabel: statusMeta.label,
      statusVariant: statusMeta.variant,
    }
  })

  return {
    reversedTargetIds,
    classifiedTransactions,
    effectiveTransactions,
  }
}

export interface CategoryBreakdownItem {
  categoryId: string | null
  categoryName: string
  type: FinanceTransactionType
  totalAmount: number
  transactionCount: number
}

export interface FinanceRecapResult {
  allTimeIncome: number
  allTimeExpense: number
  cashBalance: number
  allTimeTotalCount: number
  allTimeEffectiveCount: number
  allTimeReversedCount: number
  periodIncome: number
  periodExpense: number
  periodDifference: number
  cumulativeBalanceThroughEnd: number
  periodEffectiveCount: number
  periodTotalRowsCount: number
  categoryBreakdown: CategoryBreakdownItem[]
  reversedTargetIds: Set<string>
  effectiveTransactions: FinanceTransaction[]
}

export function computeFinanceSummaryAndRecap(
  transactions: FinanceTransaction[],
  categories: FinanceCategory[] = [],
  range?: { startDate: string; endDate: string }
): FinanceRecapResult {
  const { reversedTargetIds, classifiedTransactions, effectiveTransactions } =
    classifyFinanceTransactions(transactions)

  const categoryMap = new Map<string, FinanceCategory>()
  for (const cat of categories) {
    categoryMap.set(cat.id, cat)
  }

  let allTimeIncome = 0
  let allTimeExpense = 0
  let allTimeEffectiveCount = 0

  let periodIncome = 0
  let periodExpense = 0
  let cumulativeBalanceThroughEnd = 0
  let periodEffectiveCount = 0
  let periodTotalRowsCount = 0

  const breakdownMap = new Map<string, CategoryBreakdownItem>()

  // 1. Process all-time effective metrics strictly from active recorded transactions
  for (const tx of effectiveTransactions) {
    const amount = Number(tx.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    allTimeEffectiveCount += 1
    if (tx.type === 'income') {
      allTimeIncome += amount
    } else {
      allTimeExpense += amount
    }

    if (range && tx.transaction_date <= range.endDate) {
      cumulativeBalanceThroughEnd += tx.type === 'income' ? amount : -amount
    }
  }

  // Exact net balance = total effective income minus total effective expense
  const cashBalance = allTimeIncome - allTimeExpense

  if (!range) {
    cumulativeBalanceThroughEnd = cashBalance
  }

  // 2. Process period-specific metrics
  for (const tx of classifiedTransactions) {
    const inPeriod =
      !range || (tx.transaction_date >= range.startDate && tx.transaction_date <= range.endDate)
    if (inPeriod) {
      periodTotalRowsCount += 1
    }

    if (inPeriod && tx.isEffective) {
      const amount = Number(tx.amount)
      if (!Number.isFinite(amount) || amount <= 0) continue

      periodEffectiveCount += 1
      if (tx.type === 'income') {
        periodIncome += amount
      } else {
        periodExpense += amount
      }

      const category = tx.category_id ? categoryMap.get(tx.category_id) : undefined
      const key = `${tx.type}:${tx.category_id ?? 'uncategorized'}`
      const existing = breakdownMap.get(key)
      if (existing) {
        existing.totalAmount += amount
        existing.transactionCount += 1
      } else {
        breakdownMap.set(key, {
          categoryId: tx.category_id,
          categoryName: category?.name ?? 'Tanpa Kategori',
          type: tx.type,
          totalAmount: amount,
          transactionCount: 1,
        })
      }
    }
  }

  const categoryBreakdown = Array.from(breakdownMap.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1
    return b.totalAmount - a.totalAmount
  })

  return {
    allTimeIncome,
    allTimeExpense,
    cashBalance,
    allTimeTotalCount: transactions.length,
    allTimeEffectiveCount,
    allTimeReversedCount: reversedTargetIds.size,
    periodIncome,
    periodExpense,
    periodDifference: periodIncome - periodExpense,
    cumulativeBalanceThroughEnd,
    periodEffectiveCount,
    periodTotalRowsCount,
    categoryBreakdown,
    reversedTargetIds,
    effectiveTransactions,
  }
}

export interface ExpenditureAnalytics {
  totalEffectiveExpense: number
  expenseCount: number
  maxExpense: {
    id: string
    amount: number
    description: string
    categoryName: string
    recipientOrVendor: string
    spendingPurpose: string
    transactionDate: string
    recordedBy: string
    programTitle?: string
  } | null
  topCategory: {
    categoryId: string | null
    categoryName: string
    totalAmount: number
    percentage: number
  } | null
  averageExpensePerTransaction: number
  remainingBalance: number
  categoryDistribution: Array<{
    categoryId: string | null
    categoryName: string
    totalAmount: number
    percentage: number
    transactionCount: number
  }>
  programBreakdown: Array<{
    programId: string | null
    programTitle: string
    totalAmount: number
    percentage: number
    transactionCount: number
  }>
  dailyTrend: Array<{
    date: string
    amount: number
    count: number
  }>
  topExpensesList: Array<{
    id: string
    amount: number
    description: string
    categoryName: string
    recipientOrVendor: string
    spendingPurpose: string
    transactionDate: string
    programTitle?: string
    recordedBy: string
  }>
}

export function computeExpenditureAnalytics(params: {
  transactions: FinanceTransaction[]
  categories: FinanceCategory[]
  programs?: Array<{ id: string; title: string }>
  dateRange?: { startDate: string; endDate: string }
  categoryIdFilter?: string
  programIdFilter?: string
  recordedByFilter?: string
  currentCashBalance?: number
}): ExpenditureAnalytics {
  const {
    transactions,
    categories,
    programs = [],
    dateRange,
    categoryIdFilter,
    programIdFilter,
    recordedByFilter,
    currentCashBalance = 0,
  } = params

  const catMap = new Map<string, string>()
  for (const c of categories) {
    catMap.set(c.id, c.name)
  }

  const progMap = new Map<string, string>()
  for (const p of programs) {
    progMap.set(p.id, p.title)
  }

  // Find reversal IDs
  const reversedIds = new Set<string>()
  for (const t of transactions) {
    if (t.reversal_of_transaction_id) {
      reversedIds.add(t.reversal_of_transaction_id)
    }
  }

  // Filter effective expense transactions
  const effectiveExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false
    if (t.reversal_of_transaction_id) return false
    if (reversedIds.has(t.id)) return false

    if (dateRange) {
      if (t.transaction_date < dateRange.startDate || t.transaction_date > dateRange.endDate) {
        return false
      }
    }

    if (categoryIdFilter && categoryIdFilter !== 'all' && t.category_id !== categoryIdFilter) {
      return false
    }

    if (programIdFilter && programIdFilter !== 'all') {
      if (programIdFilter === 'none' && t.program_id) return false
      if (programIdFilter !== 'none' && t.program_id !== programIdFilter) return false
    }

    if (recordedByFilter && recordedByFilter !== 'all' && t.recorded_by !== recordedByFilter) {
      return false
    }

    return true
  })

  let totalEffectiveExpense = 0
  let maxExpenseTx: FinanceTransaction | null = null
  let maxExpenseAmount = 0

  const catSums = new Map<string, { categoryId: string | null; name: string; amount: number; count: number }>()
  const progSums = new Map<string, { programId: string | null; title: string; amount: number; count: number }>()
  const dailySums = new Map<string, { amount: number; count: number }>()

  for (const tx of effectiveExpenses) {
    const amt = Number(tx.amount) || 0
    if (amt <= 0) continue

    totalEffectiveExpense += amt

    if (amt > maxExpenseAmount) {
      maxExpenseAmount = amt
      maxExpenseTx = tx
    }

    // Category aggregation
    const catId = tx.category_id ?? 'uncategorized'
    const catName = tx.category_id ? catMap.get(tx.category_id) || 'Kategori Lain' : 'Tanpa Kategori'
    const currentCat = catSums.get(catId) || { categoryId: tx.category_id, name: catName, amount: 0, count: 0 }
    currentCat.amount += amt
    currentCat.count += 1
    catSums.set(catId, currentCat)

    // Program aggregation
    const pId = tx.program_id ?? 'general'
    const pTitle = tx.program_id ? progMap.get(tx.program_id) || 'Program Terkait' : 'Operasional / Umum'
    const currentProg = progSums.get(pId) || {
      programId: tx.program_id ?? null,
      title: pTitle,
      amount: 0,
      count: 0,
    }
    currentProg.amount += amt
    currentProg.count += 1
    progSums.set(pId, currentProg)

    // Daily aggregation
    const dateKey = tx.transaction_date
    const currentDay = dailySums.get(dateKey) || { amount: 0, count: 0 }
    currentDay.amount += amt
    currentDay.count += 1
    dailySums.set(dateKey, currentDay)
  }

  const categoryDistribution = Array.from(catSums.values())
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.name,
      totalAmount: c.amount,
      percentage: totalEffectiveExpense > 0 ? (c.amount / totalEffectiveExpense) * 100 : 0,
      transactionCount: c.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const programBreakdown = Array.from(progSums.values())
    .map((p) => ({
      programId: p.programId,
      programTitle: p.title,
      totalAmount: p.amount,
      percentage: totalEffectiveExpense > 0 ? (p.amount / totalEffectiveExpense) * 100 : 0,
      transactionCount: p.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const dailyTrend = Array.from(dailySums.entries())
    .map(([date, d]) => ({
      date,
      amount: d.amount,
      count: d.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topExpensesList = [...effectiveExpenses]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 10)
    .map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount) || 0,
      description: tx.description,
      categoryName: tx.category_id ? catMap.get(tx.category_id) || 'Kategori Lain' : 'Tanpa Kategori',
      recipientOrVendor: tx.recipient_or_vendor?.trim() || 'Belum ada rincian',
      spendingPurpose: tx.spending_purpose?.trim() || 'Belum ada rincian',
      transactionDate: tx.transaction_date,
      programTitle: tx.program_id ? progMap.get(tx.program_id) || undefined : undefined,
      recordedBy: tx.recorded_by,
    }))

  const maxExpense = maxExpenseTx
    ? {
        id: maxExpenseTx.id,
        amount: Number(maxExpenseTx.amount) || 0,
        description: maxExpenseTx.description,
        categoryName: maxExpenseTx.category_id ? catMap.get(maxExpenseTx.category_id) || 'Kategori Lain' : 'Tanpa Kategori',
        recipientOrVendor: maxExpenseTx.recipient_or_vendor?.trim() || 'Belum ada rincian',
        spendingPurpose: maxExpenseTx.spending_purpose?.trim() || 'Belum ada rincian',
        transactionDate: maxExpenseTx.transaction_date,
        programTitle: maxExpenseTx.program_id ? progMap.get(maxExpenseTx.program_id) || undefined : undefined,
        recordedBy: maxExpenseTx.recorded_by,
      }
    : null

  const topCategory = categoryDistribution.length > 0
    ? {
        categoryId: categoryDistribution[0].categoryId,
        categoryName: categoryDistribution[0].categoryName,
        totalAmount: categoryDistribution[0].totalAmount,
        percentage: categoryDistribution[0].percentage,
      }
    : null

  const expenseCount = effectiveExpenses.length
  const averageExpensePerTransaction = expenseCount > 0 ? totalEffectiveExpense / expenseCount : 0

  return {
    totalEffectiveExpense,
    expenseCount,
    maxExpense,
    topCategory,
    averageExpensePerTransaction,
    remainingBalance: currentCashBalance,
    categoryDistribution,
    programBreakdown,
    dailyTrend,
    topExpensesList,
  }
}

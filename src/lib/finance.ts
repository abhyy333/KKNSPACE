import type { FinanceCategory, FinanceTransaction, FinanceTransactionType } from '@/types/database'

const IDR_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

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
  const parsed = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return SHORT_DATE_FORMATTER.format(parsed)
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

function toIsoDateLocal(dt: Date): string {
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getRecapDateRange(
  mode: FinanceRecapPeriodMode,
  anchorDate: string,
  customStart: string,
  customEnd: string
): DateRange {
  const baseDateStr = isValidIsoDate(anchorDate) ? anchorDate : toIsoDateLocal(new Date())
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)

  if (mode === 'daily') {
    return {
      startDate: baseDateStr,
      endDate: baseDateStr,
      label: `Harian (${formatFinanceDate(baseDateStr)})`,
    }
  }

  if (mode === 'weekly') {
    const dayOfWeek = base.getDay() // 0 = Sun, 1 = Mon
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetToMonday)
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
    const start = toIsoDateLocal(monday)
    const end = toIsoDateLocal(sunday)
    return {
      startDate: start,
      endDate: end,
      label: `Mingguan (${formatFinanceDate(start)} – ${formatFinanceDate(end)})`,
    }
  }

  if (mode === 'monthly') {
    const first = new Date(base.getFullYear(), base.getMonth(), 1)
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    const start = toIsoDateLocal(first)
    const end = toIsoDateLocal(last)
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
}

export function computeFinanceSummaryAndRecap(
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  range?: { startDate: string; endDate: string }
): FinanceRecapResult {
  const reversedTargetIds = new Set<string>()
  for (const tx of transactions) {
    if (tx.reversal_of_transaction_id) {
      reversedTargetIds.add(tx.reversal_of_transaction_id)
    }
  }

  const categoryMap = new Map<string, FinanceCategory>()
  for (const cat of categories) {
    categoryMap.set(cat.id, cat)
  }

  let allTimeIncome = 0
  let allTimeExpense = 0
  let allTimeEffectiveCount = 0
  let cashBalance = 0

  let periodIncome = 0
  let periodExpense = 0
  let cumulativeBalanceThroughEnd = 0
  let periodEffectiveCount = 0
  let periodTotalRowsCount = 0

  const breakdownMap = new Map<string, CategoryBreakdownItem>()

  for (const tx of transactions) {
    const amount = Number(tx.amount)
    if (!Number.isFinite(amount)) continue

    // Exact ledger net cash balance counts every ledger posting (reversal is opposite type)
    cashBalance += tx.type === 'income' ? amount : -amount

    if (range && tx.transaction_date <= range.endDate) {
      cumulativeBalanceThroughEnd += tx.type === 'income' ? amount : -amount
    }

    const inPeriod =
      !range || (tx.transaction_date >= range.startDate && tx.transaction_date <= range.endDate)
    if (inPeriod) {
      periodTotalRowsCount += 1
    }

    const isReversal = Boolean(tx.reversal_of_transaction_id)
    const isReversed = reversedTargetIds.has(tx.id)
    const isEffective = !isReversal && !isReversed

    if (!isEffective) continue

    allTimeEffectiveCount += 1
    if (tx.type === 'income') {
      allTimeIncome += amount
    } else {
      allTimeExpense += amount
    }

    if (inPeriod) {
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
  }
}

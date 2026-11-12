import type { WorkProgramStatus } from '@/types/database'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatPublicDate(value: string | null | undefined, fallback = 'Jadwal menyusul'): string {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return DATE_FORMATTER.format(parsed)
}

export function formatPublicDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return 'Jadwal pelaksanaan fleksibel'
  if (startDate && endDate) {
    return `${formatPublicDate(startDate)} – ${formatPublicDate(endDate)}`
  }
  return startDate ? `Mulai ${formatPublicDate(startDate)}` : `Selesai ${formatPublicDate(endDate)}`
}

export const PUBLIC_PROGRAM_STATUS_META: Record<
  WorkProgramStatus,
  { label: string; variant: 'secondary' | 'default' | 'success' | 'outline' }
> = {
  planned: { label: 'Terencana', variant: 'outline' },
  ongoing: { label: 'Sedang Berjalan', variant: 'default' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'secondary' },
}

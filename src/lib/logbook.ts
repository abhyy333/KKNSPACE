import type {
  DailyLog,
  DailyLogCategory,
  DailyLogVerificationStatus,
  KknRole,
  WorkProgram,
} from '@/types/database'

export const LOGBOOK_CATEGORIES: Array<{
  value: DailyLogCategory
  label: string
}> = [
  { value: 'program_kerja', label: 'Pelaksanaan Program Kerja' },
  { value: 'sosialisasi', label: 'Sosialisasi & Edukasi Warga' },
  { value: 'koordinasi', label: 'Koordinasi & Musyawarah' },
  { value: 'observasi', label: 'Observasi & Pendataan' },
  { value: 'administrasi', label: 'Administrasi Posko' },
  { value: 'piket_posko', label: 'Piket & Layanan Posko' },
  { value: 'lainnya', label: 'Kegiatan Lainnya' },
]

export const LOGBOOK_CATEGORY_LABELS: Record<DailyLogCategory, string> = {
  program_kerja: 'Program Kerja',
  sosialisasi: 'Sosialisasi',
  koordinasi: 'Koordinasi',
  observasi: 'Observasi',
  administrasi: 'Administrasi',
  piket_posko: 'Piket Posko',
  lainnya: 'Lainnya',
}

export const LOGBOOK_STATUS_META: Record<
  DailyLogVerificationStatus,
  { label: string; variant: 'outline' | 'secondary' | 'success' | 'warning' }
> = {
  draft: { label: 'Draf', variant: 'outline' },
  submitted: { label: 'Tercatat', variant: 'secondary' },
  verified: { label: 'Terverifikasi', variant: 'success' },
  revision_requested: { label: 'Perlu Revisi', variant: 'warning' },
}

export const LOGBOOK_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])

const LOGBOOK_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.mp4',
  '.mov',
  '.webm',
]

export const MAX_LOGBOOK_FILE_BYTES = 25 * 1024 * 1024 // 25 MB (aligned with storageApi.ts)

export function validateLogbookFile(file: File): string | null {
  if (file.size <= 0) {
    return `Berkas "${file.name}" kosong dan tidak dapat diunggah.`
  }
  if (file.size > MAX_LOGBOOK_FILE_BYTES) {
    return `Berkas "${file.name}" melebihi batas maksimum 25 MB.`
  }
  const lower = file.name.toLowerCase()
  const hasExt = LOGBOOK_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
  if (!LOGBOOK_ALLOWED_MIME_TYPES.has(file.type) && !hasExt) {
    return `Format "${file.name}" tidak didukung. Gunakan foto (JPG/PNG/WebP/HEIC), dokumen (PDF/DOCX/XLSX/TXT), atau video singkat.`
  }
  return null
}

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatLogbookDate(dateStr: string): string {
  if (!dateStr) return '-'
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return DATE_DISPLAY_FORMATTER.format(parsed)
}

export function formatLogbookDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '-'
  if (minutes < 60) return `${minutes} menit`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs} jam ${mins} mnt` : `${hrs} jam`
}

export function getWeekBoundsIso(anchorDateStr: string): { startDate: string; endDate: string } {
  const parts = anchorDateStr.split('-').map(Number)
  const base =
    parts.length === 3 && parts.every((n) => Number.isFinite(n))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date()
  const day = base.getDay()
  const offsetToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetToMon)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { startDate: fmt(monday), endDate: fmt(sunday) }
}

export interface LogbookFilterCriteria {
  searchQuery: string
  categoryFilter: 'all' | DailyLogCategory
  programFilter: 'all' | 'none' | string
  statusFilter: 'all' | DailyLogVerificationStatus
  startDate: string
  endDate: string
  onlyMine: boolean
  currentUserId: string | null
}

export function filterLogbookEntries(
  logs: DailyLog[],
  filters: LogbookFilterCriteria,
  context: {
    programTitlesById: Map<string, string>
    authorNamesById: Map<string, string>
  }
): DailyLog[] {
  const q = filters.searchQuery.trim().toLowerCase()
  return logs.filter((log) => {
    if (filters.onlyMine && filters.currentUserId && log.author_id !== filters.currentUserId) {
      return false
    }
    if (filters.categoryFilter !== 'all' && log.activity_category !== filters.categoryFilter) {
      return false
    }
    if (filters.statusFilter !== 'all' && log.verification_status !== filters.statusFilter) {
      return false
    }
    if (filters.programFilter === 'none' && log.work_program_id !== null) {
      return false
    }
    if (
      filters.programFilter !== 'all' &&
      filters.programFilter !== 'none' &&
      log.work_program_id !== filters.programFilter
    ) {
      return false
    }
    if (filters.startDate && log.log_date < filters.startDate) {
      return false
    }
    if (filters.endDate && log.log_date > filters.endDate) {
      return false
    }
    if (q) {
      const progTitle = log.work_program_id
        ? context.programTitlesById.get(log.work_program_id) ?? ''
        : ''
      const authorName = context.authorNamesById.get(log.author_id) ?? ''
      const haystack = `${log.title} ${log.content} ${log.location ?? ''} ${progTitle} ${authorName}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

export interface LogbookCategoryStat {
  category: DailyLogCategory
  label: string
  count: number
}

export interface LogbookProgramStat {
  programId: string | null
  programTitle: string
  count: number
  latestDate: string
}

export interface LogbookMetricsSummary {
  todayCount: number
  weekCount: number
  totalCount: number
  rangeCount: number
  activeAuthorsCount: number
  rangeAuthorsCount: number
  totalDurationMinutes: number
  categoryBreakdown: LogbookCategoryStat[]
  programBreakdown: LogbookProgramStat[]
}

export function computeLogbookMetrics(
  logs: DailyLog[],
  programs: WorkProgram[],
  todayDateKey: string,
  range?: { startDate: string; endDate: string }
): LogbookMetricsSummary {
  const weekBounds = getWeekBoundsIso(todayDateKey)
  const programMap = new Map<string, WorkProgram>()
  for (const prog of programs) {
    programMap.set(prog.id, prog)
  }

  let todayCount = 0
  let weekCount = 0
  let rangeCount = 0
  let totalDurationMinutes = 0
  const allAuthors = new Set<string>()
  const rangeAuthors = new Set<string>()
  const categoryCounts = new Map<DailyLogCategory, number>()
  const programStatsMap = new Map<string, LogbookProgramStat>()

  for (const log of logs) {
    allAuthors.add(log.author_id)

    if (log.log_date === todayDateKey) {
      todayCount += 1
    }
    if (log.log_date >= weekBounds.startDate && log.log_date <= weekBounds.endDate) {
      weekCount += 1
    }

    const inRange =
      !range ||
      ((!range.startDate || log.log_date >= range.startDate) &&
        (!range.endDate || log.log_date <= range.endDate))

    if (!inRange) continue

    rangeCount += 1
    rangeAuthors.add(log.author_id)
    if (log.duration_minutes && log.duration_minutes > 0) {
      totalDurationMinutes += log.duration_minutes
    }

    categoryCounts.set(
      log.activity_category,
      (categoryCounts.get(log.activity_category) ?? 0) + 1
    )

    const progKey = log.work_program_id ?? 'unlinked'
    const progTitle = log.work_program_id
      ? programMap.get(log.work_program_id)?.title ?? 'Program Kerja Tidak Ditemukan'
      : 'Kegiatan Umum / Non-Program Kerja'

    const existingProg = programStatsMap.get(progKey)
    if (existingProg) {
      existingProg.count += 1
      if (log.log_date > existingProg.latestDate) {
        existingProg.latestDate = log.log_date
      }
    } else {
      programStatsMap.set(progKey, {
        programId: log.work_program_id,
        programTitle: progTitle,
        count: 1,
        latestDate: log.log_date,
      })
    }
  }

  const categoryBreakdown: LogbookCategoryStat[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      label: LOGBOOK_CATEGORY_LABELS[category],
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const programBreakdown = Array.from(programStatsMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.latestDate.localeCompare(a.latestDate)
  })

  return {
    todayCount,
    weekCount,
    totalCount: logs.length,
    rangeCount,
    activeAuthorsCount: allAuthors.size,
    rangeAuthorsCount: rangeAuthors.size,
    totalDurationMinutes,
    categoryBreakdown,
    programBreakdown,
  }
}

const LOGBOOK_WRITER_ROLES = new Set<KknRole>([
  'ketua',
  'sekretaris',
  'bendahara',
  'anggota',
])

const LOGBOOK_TEAM_READER_ROLES = new Set<KknRole>(['ketua', 'sekretaris', 'dpl'])

/** Checks whether an active KKN role or Super Admin is permitted to author personal logbook entries. */
export function canRoleWriteLogbook(role: KknRole | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  return role !== null && LOGBOOK_WRITER_ROLES.has(role)
}

/** Checks whether an active KKN role or Super Admin is permitted to read all team logbook details. */
export function canRoleReadTeamLogbook(role: KknRole | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  return role !== null && LOGBOOK_TEAM_READER_ROLES.has(role)
}

/** Checks whether an active KKN role or Super Admin is permitted to perform final verification. */
export function canRoleVerifyLogbook(role: KknRole | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  return role === 'dpl'
}

/** Determines whether the current user can edit or delete a specific unverified logbook entry. */
export function canAuthorModifyLog(
  log: Pick<DailyLog, 'author_id' | 'verification_status'>,
  currentUserId: string | null,
  role: KknRole | null,
  isSuperAdmin = false
): boolean {
  if (log.verification_status === 'verified') return false
  if (isSuperAdmin) return Boolean(currentUserId)
  if (!currentUserId || !canRoleWriteLogbook(role)) return false
  return log.author_id === currentUserId
}

/** Determines whether the current user (active DPL or Super Admin) can review a submitted logbook entry. */
export function canDplReviewLog(
  log: Pick<DailyLog, 'verification_status'>,
  role: KknRole | null,
  isSuperAdmin = false
): boolean {
  return canRoleVerifyLogbook(role, isSuperAdmin) && log.verification_status === 'submitted'
}

/**
 * Determines whether the author or Super Admin can create a linked correction record from a verified logbook.
 * Supports multi-step correction chains anchored to any previously verified record in the chain.
 */
export function canCreateCorrectionForLog(
  log: Pick<DailyLog, 'author_id' | 'verification_status'>,
  currentUserId: string | null,
  role: KknRole | null,
  isSuperAdmin = false
): boolean {
  if (log.verification_status !== 'verified') return false
  if (isSuperAdmin) return Boolean(currentUserId)
  if (!currentUserId || !canRoleWriteLogbook(role)) return false
  return log.author_id === currentUserId
}

/** Validates allowed status state-machine transitions by actor role. */
export function isValidLogStatusTransition(
  from: DailyLogVerificationStatus,
  to: DailyLogVerificationStatus,
  actor: 'author' | 'dpl'
): boolean {
  if (from === 'verified') return false
  if (actor === 'author') {
    if (to !== 'draft' && to !== 'submitted') return false
    return from === 'draft' || from === 'submitted' || from === 'revision_requested'
  }
  return from === 'submitted' && (to === 'verified' || to === 'revision_requested')
}

export interface LogbookCorrectionChain {
  rootLog: DailyLog | null
  ancestors: DailyLog[]
  descendants: DailyLog[]
}

/**
 * Resolves the cycle-safe ancestor chain (root -> direct parent) and downstream corrections
 * linked to `targetLogId` via `correction_of_log_id`.
 */
export function buildCorrectionChain(
  targetLogId: string,
  allLogs: DailyLog[]
): LogbookCorrectionChain {
  const byId = new Map<string, DailyLog>()
  const childrenByParent = new Map<string, DailyLog[]>()

  for (const item of allLogs) {
    byId.set(item.id, item)
    if (item.correction_of_log_id) {
      const list = childrenByParent.get(item.correction_of_log_id) ?? []
      list.push(item)
      childrenByParent.set(item.correction_of_log_id, list)
    }
  }

  const target = byId.get(targetLogId)
  if (!target) {
    return { rootLog: null, ancestors: [], descendants: [] }
  }

  const ancestorsReversed: DailyLog[] = []
  const visitedUp = new Set<string>([target.id])
  let cursorParentId = target.correction_of_log_id

  while (cursorParentId && !visitedUp.has(cursorParentId)) {
    const parent = byId.get(cursorParentId)
    if (!parent) break
    visitedUp.add(parent.id)
    ancestorsReversed.push(parent)
    cursorParentId = parent.correction_of_log_id
  }

  const ancestors = ancestorsReversed.reverse()
  const rootLog = ancestors.length > 0 ? ancestors[0] : target.correction_of_log_id ? null : target

  const descendants: DailyLog[] = []
  const visitedDown = new Set<string>([target.id])
  const queue: string[] = [target.id]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = (childrenByParent.get(currentId) ?? []).slice().sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    )
    for (const child of children) {
      if (visitedDown.has(child.id)) continue
      visitedDown.add(child.id)
      descendants.push(child)
      queue.push(child.id)
    }
  }

  return { rootLog, ancestors, descendants }
}

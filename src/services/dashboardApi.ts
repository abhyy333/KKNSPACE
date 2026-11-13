import { z } from 'zod'
import { computeFinanceSummaryAndRecap } from '@/lib/finance'
import { supabase } from '@/lib/supabase'
import type {
  Announcement,
  AnnouncementStatus,
  CalendarEvent,
  DutyShift,
  FinanceTransaction,
  GroupSettings,
  KknTeamDirectoryMember,
  TaskAssignee,
  TaskItem,
  WorkProgram,
  WorkspaceMemberSummary,
} from '@/types/database'

export const announcementFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul pengumuman minimal 3 karakter')
    .max(150, 'Judul pengumuman maksimal 150 karakter'),
  content: z
    .string()
    .trim()
    .min(5, 'Isi pengumuman minimal 5 karakter')
    .max(2000, 'Isi pengumuman maksimal 2000 karakter'),
  status: z.enum(['draft', 'published', 'archived']),
})

export type AnnouncementFormInput = z.infer<typeof announcementFormSchema>

export interface DashboardFinanceSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}

export interface DashboardInventoryAlertItem {
  id: string
  name: string
  item_code: string
  current_holder_name: string | null
  current_location: string
  item_status: string
  reconciliation_status: string
  borrow_due_date: string | null
  ownership_type: string
}

export interface DashboardSummaryData {
  groupSettings: GroupSettings | null
  members: WorkspaceMemberSummary[]
  teamDirectory: KknTeamDirectoryMember[]
  workPrograms: WorkProgram[]
  tasks: TaskItem[]
  taskAssignees: TaskAssignee[]
  upcomingEvents: CalendarEvent[]
  todayShifts: DutyShift[]
  finance: DashboardFinanceSummary
  financeTransactions: FinanceTransaction[]
  inventoryAlerts: DashboardInventoryAlertItem[]
  announcements: Announcement[]
  todayDateKey: string
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLocalStartOfDayIso(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  return start.toISOString()
}

export async function fetchGroupSettings(): Promise<GroupSettings | null> {
  const { data, error } = await supabase
    .from('group_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat pengaturan posko: ${error.message}`)
  }

  return (data as GroupSettings | null) ?? null
}

export async function updateGroupSettings(
  settings: Partial<GroupSettings>
): Promise<GroupSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi login tidak ditemukan.')

  const { data, error } = await supabase
    .from('group_settings')
    .update({
      ...settings,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui konfigurasi posko: ${error?.message}`)
  }

  return data as GroupSettings
}

export async function fetchWorkspaceMembers(): Promise<WorkspaceMemberSummary[]> {
  const { data, error } = await supabase.rpc('get_workspace_members_details')

  if (error) {
    throw new Error(`Gagal memuat daftar anggota aktif: ${error.message}`)
  }

  return (data as WorkspaceMemberSummary[]) ?? []
}

export async function fetchPublishedAnnouncementsPreview(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, status, created_by, published_by, published_at, created_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5)

  if (error) {
    throw new Error(`Gagal memuat notifikasi pengumuman: ${error.message}`)
  }

  return (data as Announcement[]) ?? []
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryData> {
  const todayDateKey = getLocalDateKey()
  const startOfTodayIso = getLocalStartOfDayIso()

  const [
    groupSettingsRes,
    membersRes,
    teamDirectoryRes,
    programsRes,
    tasksRes,
    eventsRes,
    shiftsRes,
    financeRes,
    inventoryRes,
    announcementsRes,
  ] = await Promise.all([
    supabase
      .from('group_settings')
      .select('id, group_name, village_name, period_start, period_end, logo_file_id, updated_by, updated_at')
      .eq('id', 1)
      .maybeSingle(),
    supabase.rpc('get_workspace_members'),
    supabase
      .from('kkn_team_directory')
      .select('id, full_name, role, position_label, division, phone, identity_number, study_program, academic_status, university, account_email, photo_file_id, photo_path, is_active, linked_user_id')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    supabase
      .from('work_programs')
      .select('id, title, description, status, start_date, end_date, publication_status, created_by, created_at, updated_at')
      .neq('status', 'cancelled')
      .order('updated_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, program_id, title, description, due_date, status, created_by, created_at, updated_at')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('calendar_events')
      .select('id, title, description, start_at, end_at, created_by')
      .gte('end_at', startOfTodayIso)
      .order('start_at', { ascending: true })
      .limit(8),
    supabase
      .from('duty_shifts')
      .select('id, shift_date, start_time, end_time, assigned_user_id, notes, created_by')
      .eq('shift_date', todayDateKey)
      .order('start_time', { ascending: true }),
    supabase
      .from('finance_transactions')
      .select(
        'id, category_id, type, amount, description, transaction_date, recorded_by, reversal_of_transaction_id, correction_reason, created_at',
      ),
    supabase
      .from('inventory_items')
      .select(
        'id, name, item_code, current_holder_name, current_location, item_status, reconciliation_status, borrow_due_date, ownership_type',
      ),
    supabase
      .from('announcements')
      .select('id, title, content, status, created_by, published_by, published_at, created_at, updated_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const firstError =
    groupSettingsRes.error ||
    membersRes.error ||
    teamDirectoryRes.error ||
    programsRes.error ||
    tasksRes.error ||
    eventsRes.error ||
    shiftsRes.error ||
    financeRes.error ||
    inventoryRes.error ||
    announcementsRes.error

  if (firstError) {
    throw new Error(`Gagal memuat ringkasan dashboard: ${firstError.message}`)
  }

  const tasks = (tasksRes.data as TaskItem[]) ?? []
  let taskAssignees: TaskAssignee[] = []

  if (tasks.length > 0) {
    const taskIds = tasks.map((t) => t.id)
    const { data: assigneesData, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('task_id, user_id, assigned_by, created_at')
      .in('task_id', taskIds)

    if (assigneesError) {
      throw new Error(`Gagal memuat penugasan: ${assigneesError.message}`)
    }

    taskAssignees = (assigneesData as TaskAssignee[]) ?? []
  }

  const financeRows = (financeRes.data as FinanceTransaction[]) ?? []
  const financeRecap = computeFinanceSummaryAndRecap(financeRows, [])

  return {
    groupSettings: (groupSettingsRes.data as GroupSettings | null) ?? null,
    members: (membersRes.data as WorkspaceMemberSummary[]) ?? [],
    teamDirectory: (teamDirectoryRes.data as KknTeamDirectoryMember[]) ?? [],
    workPrograms: (programsRes.data as WorkProgram[]) ?? [],
    tasks,
    taskAssignees,
    upcomingEvents: (eventsRes.data as CalendarEvent[]) ?? [],
    todayShifts: (shiftsRes.data as DutyShift[]) ?? [],
    finance: {
      totalIncome: financeRecap.allTimeIncome,
      totalExpense: financeRecap.allTimeExpense,
      balance: financeRecap.cashBalance,
      transactionCount: financeRecap.allTimeEffectiveCount,
    },
    financeTransactions: financeRows,
    inventoryAlerts: (inventoryRes.data as DashboardInventoryAlertItem[]) ?? [],
    announcements: (announcementsRes.data as Announcement[]) ?? [],
    todayDateKey,
  }
}

async function requireAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan atau telah berakhir. Silakan masuk ulang.')
  }
  return data.user.id
}

export async function createAnnouncement(input: AnnouncementFormInput): Promise<Announcement> {
  const parsed = announcementFormSchema.parse(input)
  const userId = await requireAuthenticatedUserId()
  const nowIso = new Date().toISOString()

  const payload = {
    title: parsed.title,
    content: parsed.content,
    status: parsed.status as AnnouncementStatus,
    created_by: userId,
    published_by: parsed.status === 'published' ? userId : null,
    published_at: parsed.status === 'published' ? nowIso : null,
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select('id, title, content, status, created_by, published_by, published_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Gagal menyimpan pengumuman: ${error.message}`)
  }

  return data as Announcement
}

export async function updateAnnouncement(
  announcementId: string,
  input: AnnouncementFormInput
): Promise<Announcement> {
  const parsed = announcementFormSchema.parse(input)
  const userId = await requireAuthenticatedUserId()
  const nowIso = new Date().toISOString()

  const payload =
    parsed.status === 'published'
      ? {
          title: parsed.title,
          content: parsed.content,
          status: 'published' as AnnouncementStatus,
          published_by: userId,
          published_at: nowIso,
          updated_at: nowIso,
        }
      : {
          title: parsed.title,
          content: parsed.content,
          status: parsed.status as AnnouncementStatus,
          published_by: null,
          published_at: null,
          updated_at: nowIso,
        }

  const { data, error } = await supabase
    .from('announcements')
    .update(payload)
    .eq('id', announcementId)
    .select('id, title, content, status, created_by, published_by, published_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui pengumuman: ${error.message}`)
  }

  return data as Announcement
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    throw new Error(`Gagal menghapus pengumuman: ${error.message}`)
  }
}

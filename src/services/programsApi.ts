import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type {
  ProgramAssignment,
  ProgramAssignmentType,
  TaskAssignee,
  TaskItem,
  TaskStatus,
  WorkProgram,
  WorkProgramStatus,
} from '@/types/database'

export const workProgramFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Judul program kerja minimal 3 karakter')
      .max(150, 'Judul program kerja maksimal 150 karakter'),
    description: z
      .string()
      .trim()
      .max(2000, 'Deskripsi maksimal 2000 karakter')
      .optional(),
    status: z.enum(['planned', 'ongoing', 'completed', 'cancelled']),
    publicationStatus: z.enum(['draft', 'published', 'archived']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    {
      message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai',
      path: ['endDate'],
    }
  )

export type WorkProgramFormInput = z.infer<typeof workProgramFormSchema>

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul tugas minimal 3 karakter')
    .max(150, 'Judul tugas maksimal 150 karakter'),
  description: z
    .string()
    .trim()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional(),
  programId: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
})

export type TaskFormInput = z.infer<typeof taskFormSchema>

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }
  return data.user.id
}

export interface ProgramsBundleData {
  programs: WorkProgram[]
  assignments: ProgramAssignment[]
  tasks: TaskItem[]
  taskAssignees: TaskAssignee[]
}

export async function fetchProgramsBundle(): Promise<ProgramsBundleData> {
  const [programsRes, assignmentsRes, tasksRes, assigneesRes] = await Promise.all([
    supabase
      .from('work_programs')
      .select('id, title, description, status, start_date, end_date, publication_status, created_by, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('program_assignments')
      .select('id, program_id, user_id, assignment_type, assigned_by, created_at'),
    supabase
      .from('tasks')
      .select('id, program_id, title, description, due_date, status, created_by, created_at, updated_at')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('task_assignees')
      .select('task_id, user_id, assigned_by, created_at'),
  ])

  const firstErr =
    programsRes.error || assignmentsRes.error || tasksRes.error || assigneesRes.error
  if (firstErr) {
    throw new Error(`Gagal memuat data program kerja: ${firstErr.message}`)
  }

  return {
    programs: (programsRes.data as WorkProgram[]) ?? [],
    assignments: (assignmentsRes.data as ProgramAssignment[]) ?? [],
    tasks: (tasksRes.data as TaskItem[]) ?? [],
    taskAssignees: (assigneesRes.data as TaskAssignee[]) ?? [],
  }
}

export async function createWorkProgram(
  input: WorkProgramFormInput
): Promise<WorkProgram> {
  const parsed = workProgramFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('work_programs')
    .insert({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      status: parsed.status as WorkProgramStatus,
      publication_status: parsed.publicationStatus,
      start_date: parsed.startDate?.trim() ? parsed.startDate.trim() : null,
      end_date: parsed.endDate?.trim() ? parsed.endDate.trim() : null,
      created_by: userId,
    })
    .select('id, title, description, status, start_date, end_date, publication_status, created_by, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Gagal menambahkan program kerja: ${error.message}`)
  }

  return data as WorkProgram
}

export async function updateWorkProgram(
  id: string,
  input: WorkProgramFormInput,
  allowPublicationChange: boolean
): Promise<WorkProgram> {
  const parsed = workProgramFormSchema.parse(input)
  const nowIso = new Date().toISOString()

  const payload: Record<string, unknown> = {
    title: parsed.title,
    description: parsed.description?.trim() ? parsed.description.trim() : null,
    status: parsed.status as WorkProgramStatus,
    start_date: parsed.startDate?.trim() ? parsed.startDate.trim() : null,
    end_date: parsed.endDate?.trim() ? parsed.endDate.trim() : null,
    updated_at: nowIso,
  }

  if (allowPublicationChange) {
    payload.publication_status = parsed.publicationStatus
  }

  const { data, error } = await supabase
    .from('work_programs')
    .update(payload)
    .eq('id', id)
    .select('id, title, description, status, start_date, end_date, publication_status, created_by, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui program kerja: ${error.message}`)
  }

  return data as WorkProgram
}

export async function deleteWorkProgram(id: string): Promise<void> {
  const { error: assignDelErr } = await supabase
    .from('program_assignments')
    .delete()
    .eq('program_id', id)

  if (assignDelErr) {
    throw new Error(`Gagal menghapus penugasan program: ${assignDelErr.message}`)
  }

  const { error } = await supabase.from('work_programs').delete().eq('id', id)
  if (error) {
    if (error.message.includes('tasks_program_id_fkey')) {
      throw new Error(
        'Program kerja masih memiliki tugas terkait. Hapus tugas terkait terlebih dahulu atau ubah status menjadi Dibatalkan.'
      )
    }
    throw new Error(`Gagal menghapus program kerja: ${error.message}`)
  }
}

export async function saveProgramAssignments(
  programId: string,
  items: Array<{ userId: string; assignmentType: ProgramAssignmentType }>
): Promise<void> {
  const actorId = await getCurrentUserId()

  const { error: delErr } = await supabase
    .from('program_assignments')
    .delete()
    .eq('program_id', programId)

  if (delErr) {
    throw new Error(`Gagal memperbarui penugasan tim: ${delErr.message}`)
  }

  if (items.length === 0) return

  const rows = items.map((item) => ({
    program_id: programId,
    user_id: item.userId,
    assignment_type: item.assignmentType,
    assigned_by: actorId,
  }))

  const { error: insErr } = await supabase
    .from('program_assignments')
    .insert(rows)

  if (insErr) {
    throw new Error(`Gagal menyimpan daftar penanggung jawab: ${insErr.message}`)
  }
}

export async function createTask(
  input: TaskFormInput,
  assigneeIds: string[]
): Promise<TaskItem> {
  const parsed = taskFormSchema.parse(input)
  const actorId = await getCurrentUserId()

  const { data: taskData, error } = await supabase
    .from('tasks')
    .insert({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      program_id: parsed.programId?.trim() ? parsed.programId.trim() : null,
      due_date: parsed.dueDate?.trim() ? parsed.dueDate.trim() : null,
      status: parsed.status as TaskStatus,
      created_by: actorId,
    })
    .select('id, program_id, title, description, due_date, status, created_by, created_at, updated_at')
    .single()

  if (error || !taskData) {
    throw new Error(`Gagal membuat tugas: ${error?.message || 'Unknown error'}`)
  }

  if (assigneeIds.length > 0) {
    const { error: assignErr } = await supabase.from('task_assignees').insert(
      assigneeIds.map((uid) => ({
        task_id: taskData.id,
        user_id: uid,
        assigned_by: actorId,
      }))
    )

    if (assignErr) {
      throw new Error(`Tugas dibuat tetapi penugasan gagal: ${assignErr.message}`)
    }
  }

  return taskData as TaskItem
}

export async function updateTask(
  taskId: string,
  input: TaskFormInput,
  assigneeIds?: string[]
): Promise<TaskItem> {
  const parsed = taskFormSchema.parse(input)
  const actorId = await getCurrentUserId()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      program_id: parsed.programId?.trim() ? parsed.programId.trim() : null,
      due_date: parsed.dueDate?.trim() ? parsed.dueDate.trim() : null,
      status: parsed.status as TaskStatus,
      updated_at: nowIso,
    })
    .eq('id', taskId)
    .select('id, program_id, title, description, due_date, status, created_by, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui tugas: ${error.message}`)
  }

  if (assigneeIds) {
    const { error: delErr } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
    if (delErr) {
      throw new Error(`Gagal memperbarui daftar petugas: ${delErr.message}`)
    }
    if (assigneeIds.length > 0) {
      const { error: insErr } = await supabase.from('task_assignees').insert(
        assigneeIds.map((uid) => ({
          task_id: taskId,
          user_id: uid,
          assigned_by: actorId,
        }))
      )
      if (insErr) {
        throw new Error(`Gagal menyimpan petugas baru: ${insErr.message}`)
      }
    }
  }

  return data as TaskItem
}

export async function updateTaskStatusOnly(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) {
    throw new Error(`Gagal mengubah status tugas: ${error.message}`)
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error: assignErr } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)

  if (assignErr) {
    throw new Error(`Gagal membersihkan penugasan tugas: ${assignErr.message}`)
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) {
    throw new Error(`Gagal menghapus tugas: ${error.message}`)
  }
}

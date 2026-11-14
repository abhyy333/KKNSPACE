import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from './storageApi'
import type {
  CalendarEvent,
  DutyShift,
  DutyShiftDocumentation,
  AgendaCategory,
  AgendaPublicationStatus,
  AgendaExecutionStatus,
  AgendaActivityStep,
  AgendaActivityLog,
} from '@/types/database'

export const AGENDA_CATEGORIES: AgendaCategory[] = [
  'Sosialisasi & Edukasi',
  'Kerja Bakti & Lingkungan',
  'Kesehatan & Posyandu',
  'Pendidikan & Bimbingan',
  'UMKM & Ekonomi Kreatif',
  'Rapat & Koordinasi',
  'Umum',
]

export const AGENDA_DIVISIONS = [
  'Acara',
  'PDD',
  'Humper',
  'Konsumsi',
  'Ketua',
  'Sekretaris',
  'Bendahara',
] as const

export const agendaStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Judul tahapan minimal 2 karakter').max(150),
  description: z.string().trim().max(500).optional().nullable(),
  order_index: z.number().int(),
  completion_status: z.boolean(),
  actual_notes: z.string().trim().max(500).optional().nullable(),
})

export type AgendaStepInput = z.infer<typeof agendaStepSchema>

export const calendarEventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Judul agenda minimal 3 karakter')
      .max(150, 'Judul agenda maksimal 150 karakter'),
    description: z
      .string()
      .trim()
      .max(2000, 'Deskripsi maksimal 2000 karakter')
      .optional()
      .nullable(),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal kegiatan wajib dipilih'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam mulai wajib diisi (HH:MM)'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam selesai wajib diisi (HH:MM)'),
    location: z
      .string()
      .trim()
      .max(200, 'Lokasi maksimal 200 karakter'),
    category: z.string(),
    picId: z.string().optional().nullable(),
    responsibleDivision: z.string(),
    targetAudience: z.string().trim().max(300).optional().nullable(),
    targetOutput: z.string().trim().max(500).optional().nullable(),
    equipmentNeeded: z.array(z.string()),
    publicationStatus: z.enum(['draft', 'internal', 'published', 'archived']),
    executionStatus: z.enum(['not_started', 'in_progress', 'completed', 'postponed']),
    relatedProgramId: z.string().optional().nullable(),
    relatedTimelineStageId: z.string().optional().nullable(),
    steps: z.array(agendaStepSchema),
  })
  .refine((val) => val.endTime > val.startTime, {
    message: 'Jam selesai harus lebih akhir dari jam mulai',
    path: ['endTime'],
  })

export type CalendarEventFormInput = z.infer<typeof calendarEventFormSchema>

export const dutyDocumentationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Judul piket wajib diisi')
    .max(150, 'Judul piket maksimal 150 karakter'),
  notes: z
    .string()
    .trim()
    .max(2000, 'Keterangan maksimal 2000 karakter')
    .optional(),
})

export type DutyDocumentationFormInput = z.infer<typeof dutyDocumentationSchema>

export const dutyShiftFormSchema = z
  .object({
    shiftDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal piket wajib dipilih'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam mulai shift wajib diisi'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam selesai shift wajib diisi'),
    assignedUserId: z.string().optional(),
    notes: z
      .string()
      .trim()
      .max(300, 'Catatan shift maksimal 300 karakter')
      .optional(),
  })
  .refine((val) => val.endTime > val.startTime, {
    message: 'Jam selesai shift harus lebih akhir dari jam mulai',
    path: ['endTime'],
  })

export type DutyShiftFormInput = z.infer<typeof dutyShiftFormSchema>

function getLocalDateKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toLocalDateTimeIso(dateStr: string, timeStr: string): string {
  const local = new Date(`${dateStr}T${timeStr}:00`)
  if (Number.isNaN(local.getTime())) {
    throw new Error('Format tanggal atau jam tidak valid.')
  }
  return local.toISOString()
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }
  return data.user.id
}

// -------------------------------------------------------------
// Calendar Events API
// -------------------------------------------------------------
export async function fetchCalendarEvents(options?: {
  includeArchived?: boolean
}): Promise<CalendarEvent[]> {
  let query = supabase
    .from('calendar_events')
    .select(`
      id,
      title,
      description,
      start_at,
      end_at,
      created_by,
      location,
      category,
      pic_id,
      responsible_division,
      target_audience,
      target_output,
      equipment_needed,
      publication_status,
      execution_status,
      related_program_id,
      related_timeline_stage_id,
      created_at,
      updated_at,
      created_by_profile:profiles!calendar_events_created_by_fkey(id, full_name),
      pic_profile:profiles!calendar_events_pic_id_fkey(id, full_name),
      steps:agenda_activity_steps(
        id,
        agenda_id,
        title,
        description,
        order_index,
        completion_status,
        completed_at,
        completed_by,
        actual_notes
      ),
      related_program:work_programs(id, title),
      related_timeline_stage:kkn_timeline_stages(id, title, stage_number)
    `)
    .order('start_at', { ascending: true })

  if (!options?.includeArchived) {
    query = query.neq('publication_status', 'archived')
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat agenda kalender: ${error.message}`)
  }

  const list = ((data as any[]) ?? []).map((row) => ({
    ...row,
    created_by_profile: Array.isArray(row.created_by_profile)
      ? row.created_by_profile[0]
      : row.created_by_profile,
    pic_profile: Array.isArray(row.pic_profile)
      ? row.pic_profile[0]
      : row.pic_profile,
    equipment_needed: Array.isArray(row.equipment_needed)
      ? row.equipment_needed
      : typeof row.equipment_needed === 'string'
      ? JSON.parse(row.equipment_needed || '[]')
      : [],
    steps: Array.isArray(row.steps)
      ? [...row.steps].sort((a, b) => a.order_index - b.order_index)
      : [],
  }))

  return list as unknown as CalendarEvent[]
}

export async function fetchAgendaDetail(id: string): Promise<CalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id,
      title,
      description,
      start_at,
      end_at,
      created_by,
      location,
      category,
      pic_id,
      responsible_division,
      target_audience,
      target_output,
      equipment_needed,
      publication_status,
      execution_status,
      related_program_id,
      related_timeline_stage_id,
      created_at,
      updated_at,
      created_by_profile:profiles!calendar_events_created_by_fkey(id, full_name),
      pic_profile:profiles!calendar_events_pic_id_fkey(id, full_name),
      steps:agenda_activity_steps(
        id,
        agenda_id,
        title,
        description,
        order_index,
        completion_status,
        completed_at,
        completed_by,
        actual_notes,
        completed_by_profile:profiles!agenda_activity_steps_completed_by_fkey(id, full_name)
      ),
      related_program:work_programs(id, title),
      related_timeline_stage:kkn_timeline_stages(id, title, stage_number)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat detail agenda: ${error.message}`)
  }

  if (!data) return null

  const d = data as any
  return {
    ...d,
    created_by_profile: Array.isArray(d.created_by_profile)
      ? d.created_by_profile[0]
      : d.created_by_profile,
    pic_profile: Array.isArray(d.pic_profile)
      ? d.pic_profile[0]
      : d.pic_profile,
    equipment_needed: Array.isArray(d.equipment_needed)
      ? d.equipment_needed
      : typeof d.equipment_needed === 'string'
      ? JSON.parse(d.equipment_needed || '[]')
      : [],
    steps: Array.isArray(d.steps)
      ? [...d.steps].sort((a: any, b: any) => a.order_index - b.order_index)
      : [],
  } as unknown as CalendarEvent
}

export async function fetchAgendaLogs(agendaId: string): Promise<AgendaActivityLog[]> {
  const { data, error } = await supabase
    .from('agenda_activity_logs')
    .select(`
      id,
      agenda_id,
      actor_user_id,
      action_type,
      field_changed,
      old_value,
      new_value,
      created_at,
      actor_profile:profiles(id, full_name)
    `)
    .eq('agenda_id', agendaId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Gagal memuat riwayat log agenda:', error.message)
    return []
  }

  const logs = ((data as any[]) ?? []).map((row) => ({
    ...row,
    actor_profile: Array.isArray(row.actor_profile)
      ? row.actor_profile[0]
      : row.actor_profile,
  }))

  return logs as unknown as AgendaActivityLog[]
}

export async function createCalendarEvent(
  input: CalendarEventFormInput
): Promise<CalendarEvent> {
  const parsed = calendarEventFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const startIso = toLocalDateTimeIso(parsed.eventDate, parsed.startTime)
  const endIso = toLocalDateTimeIso(parsed.eventDate, parsed.endTime)

  const { data: eventData, error: eventErr } = await supabase
    .from('calendar_events')
    .insert({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      start_at: startIso,
      end_at: endIso,
      location: parsed.location || 'Posko KKN Desa Pringgasela Selatan',
      category: parsed.category || 'Umum',
      pic_id: parsed.picId || userId,
      responsible_division: parsed.responsibleDivision || 'Acara',
      target_audience: parsed.targetAudience?.trim() || null,
      target_output: parsed.targetOutput?.trim() || null,
      equipment_needed: parsed.equipmentNeeded || [],
      publication_status: parsed.publicationStatus || 'internal',
      execution_status: parsed.executionStatus || 'not_started',
      related_program_id: parsed.relatedProgramId || null,
      related_timeline_stage_id: parsed.relatedTimelineStageId || null,
      created_by: userId,
    })
    .select('id, title, description, start_at, end_at, created_by')
    .single()

  if (eventErr || !eventData) {
    throw new Error(`Gagal menambahkan agenda: ${eventErr?.message}`)
  }

  // Insert steps if provided
  if (parsed.steps && parsed.steps.length > 0) {
    const stepsPayload = parsed.steps.map((st, idx) => ({
      agenda_id: eventData.id,
      title: st.title.trim(),
      description: st.description?.trim() || null,
      order_index: typeof st.order_index === 'number' ? st.order_index : idx + 1,
      completion_status: Boolean(st.completion_status),
    }))

    const { error: stepsErr } = await supabase
      .from('agenda_activity_steps')
      .insert(stepsPayload)

    if (stepsErr) {
      console.warn('Gagal menyimpan tahapan agenda:', stepsErr.message)
    }
  }

  // Insert initial activity log
  await supabase.from('agenda_activity_logs').insert({
    agenda_id: eventData.id,
    actor_user_id: userId,
    action_type: 'created',
    field_changed: 'status',
    old_value: null,
    new_value: parsed.publicationStatus || 'internal',
  })

  return eventData as CalendarEvent
}

export async function updateCalendarEvent(
  id: string,
  input: CalendarEventFormInput
): Promise<CalendarEvent> {
  const parsed = calendarEventFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const startIso = toLocalDateTimeIso(parsed.eventDate, parsed.startTime)
  const endIso = toLocalDateTimeIso(parsed.eventDate, parsed.endTime)

  const { data: eventData, error: eventErr } = await supabase
    .from('calendar_events')
    .update({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      start_at: startIso,
      end_at: endIso,
      location: parsed.location || 'Posko KKN Desa Pringgasela Selatan',
      category: parsed.category || 'Umum',
      pic_id: parsed.picId || null,
      responsible_division: parsed.responsibleDivision || 'Acara',
      target_audience: parsed.targetAudience?.trim() || null,
      target_output: parsed.targetOutput?.trim() || null,
      equipment_needed: parsed.equipmentNeeded || [],
      publication_status: parsed.publicationStatus || 'internal',
      execution_status: parsed.executionStatus || 'not_started',
      related_program_id: parsed.relatedProgramId || null,
      related_timeline_stage_id: parsed.relatedTimelineStageId || null,
    })
    .eq('id', id)
    .select('id, title, description, start_at, end_at, created_by')
    .single()

  if (eventErr || !eventData) {
    throw new Error(`Gagal memperbarui agenda: ${eventErr?.message}`)
  }

  // Sync steps
  if (parsed.steps) {
    // Delete existing steps and reinsert, or update
    await supabase.from('agenda_activity_steps').delete().eq('agenda_id', id)

    if (parsed.steps.length > 0) {
      const stepsPayload = parsed.steps.map((st, idx) => ({
        agenda_id: id,
        title: st.title.trim(),
        description: st.description?.trim() || null,
        order_index: typeof st.order_index === 'number' ? st.order_index : idx + 1,
        completion_status: Boolean(st.completion_status),
        actual_notes: st.actual_notes?.trim() || null,
      }))
      await supabase.from('agenda_activity_steps').insert(stepsPayload)
    }
  }

  await supabase.from('agenda_activity_logs').insert({
    agenda_id: id,
    actor_user_id: userId,
    action_type: 'updated',
    field_changed: 'all',
    old_value: null,
    new_value: 'Agenda diperbarui oleh pengguna',
  })

  return eventData as CalendarEvent
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus agenda: ${error.message}`)
  }
}

export async function toggleStepCompletion(
  stepId: string,
  agendaId: string,
  completed: boolean,
  notes?: string
): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('agenda_activity_steps')
    .update({
      completion_status: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
      actual_notes: notes !== undefined ? notes?.trim() || null : undefined,
    })
    .eq('id', stepId)

  if (error) {
    throw new Error(`Gagal memperbarui status tahapan: ${error.message}`)
  }

  await supabase.from('agenda_activity_logs').insert({
    agenda_id: agendaId,
    actor_user_id: userId,
    action_type: 'step_toggled',
    field_changed: 'completion_status',
    old_value: (!completed).toString(),
    new_value: completed ? 'Selesai' : 'Belum selesai',
  })
}

export async function addSingleStep(
  agendaId: string,
  step: { title: string; description?: string; order_index?: number }
): Promise<AgendaActivityStep> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('agenda_activity_steps')
    .insert({
      agenda_id: agendaId,
      title: step.title.trim(),
      description: step.description?.trim() || null,
      order_index: step.order_index ?? 99,
      completion_status: false,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Gagal menambahkan tahapan: ${error?.message}`)
  }

  await supabase.from('agenda_activity_logs').insert({
    agenda_id: agendaId,
    actor_user_id: userId,
    action_type: 'step_added',
    field_changed: 'steps',
    old_value: null,
    new_value: step.title.trim(),
  })

  return data as AgendaActivityStep
}

export async function updateAgendaPublicationStatus(
  id: string,
  status: AgendaPublicationStatus
): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('calendar_events')
    .update({ publication_status: status })
    .eq('id', id)

  if (error) {
    throw new Error(`Gagal mengubah status publikasi: ${error.message}`)
  }

  await supabase.from('agenda_activity_logs').insert({
    agenda_id: id,
    actor_user_id: userId,
    action_type: status === 'published' ? 'published' : 'publication_changed',
    field_changed: 'publication_status',
    old_value: null,
    new_value: status,
  })
}

export async function updateAgendaExecutionStatus(
  id: string,
  status: AgendaExecutionStatus
): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('calendar_events')
    .update({ execution_status: status })
    .eq('id', id)

  if (error) {
    throw new Error(`Gagal mengubah status pelaksanaan: ${error.message}`)
  }

  await supabase.from('agenda_activity_logs').insert({
    agenda_id: id,
    actor_user_id: userId,
    action_type: 'status_changed',
    field_changed: 'execution_status',
    old_value: null,
    new_value: status,
  })
}

export async function fetchLinkedDocumentations(agendaId: string) {
  const { data, error } = await supabase
    .from('activity_documentations')
    .select(`
      id,
      title,
      slug,
      category,
      activity_date,
      location_name,
      cover_photo_path,
      publication_status
    `)
    .eq('related_agenda_id', agendaId)

  if (error) {
    console.warn('Gagal memuat dokumentasi terkait:', error.message)
    return []
  }

  return data ?? []
}

// -------------------------------------------------------------
// Duty Shifts API (Preserved for compatibility)
// -------------------------------------------------------------
export async function fetchDutyShifts(): Promise<DutyShift[]> {
  const { data, error } = await supabase
    .from('duty_shifts')
    .select(`
      id, title, shift_date, start_time, end_time, assigned_user_id, notes, created_by, created_at,
      documentations:duty_shift_documentations(
        id, duty_shift_id, file_id, caption, uploaded_by, created_at,
        file_object:file_objects(id, object_path, original_name, mime_type, file_size)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat jadwal piket posko: ${error.message}`)
  }

  return (data as unknown as DutyShift[]) ?? []
}

export async function createDutyDocumentation(input: {
  title: string
  notes?: string
  files?: File[]
}): Promise<DutyShift> {
  const title = input.title.trim()
  if (!title) {
    throw new Error('Judul piket wajib diisi.')
  }

  const userId = await getCurrentUserId()
  const todayKey = getLocalDateKey()

  const { data: shift, error: shiftErr } = await supabase
    .from('duty_shifts')
    .insert({
      title,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      shift_date: todayKey,
      start_time: '08:00:00',
      end_time: '12:00:00',
      assigned_user_id: userId,
      created_by: userId,
    })
    .select('id, title, shift_date, start_time, end_time, assigned_user_id, notes, created_by, created_at')
    .single()

  if (shiftErr || !shift) {
    throw new Error(`Gagal menyimpan dokumentasi piket: ${shiftErr?.message || 'Error tidak diketahui'}`)
  }

  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      await uploadDutyShiftPhoto({
        dutyShiftId: shift.id,
        file,
      })
    }
  }

  return shift as DutyShift
}

export async function updateDutyDocumentation(
  id: string,
  input: {
    title: string
    notes?: string
    newFiles?: File[]
  }
): Promise<DutyShift> {
  const title = input.title.trim()
  if (!title) {
    throw new Error('Judul piket wajib diisi.')
  }

  const { data: shift, error: shiftErr } = await supabase
    .from('duty_shifts')
    .update({
      title,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .eq('id', id)
    .select('id, title, shift_date, start_time, end_time, assigned_user_id, notes, created_by, created_at')
    .single()

  if (shiftErr || !shift) {
    throw new Error(`Gagal memperbarui dokumentasi piket: ${shiftErr?.message || 'Error tidak diketahui'}`)
  }

  if (input.newFiles && input.newFiles.length > 0) {
    for (const file of input.newFiles) {
      await uploadDutyShiftPhoto({
        dutyShiftId: shift.id,
        file,
      })
    }
  }

  return shift as DutyShift
}

export async function createDutyShift(
  input: DutyShiftFormInput
): Promise<DutyShift> {
  const parsed = dutyShiftFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('duty_shifts')
    .insert({
      shift_date: parsed.shiftDate,
      start_time: `${parsed.startTime}:00`,
      end_time: `${parsed.endTime}:00`,
      assigned_user_id: parsed.assignedUserId?.trim() || null,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
      created_by: userId,
    })
    .select('id, shift_date, start_time, end_time, assigned_user_id, notes, created_by')
    .single()

  if (error) {
    throw new Error(`Gagal menyimpan jadwal piket: ${error.message}`)
  }

  return data as DutyShift
}

export async function updateDutyShift(
  id: string,
  input: DutyShiftFormInput
): Promise<DutyShift> {
  const parsed = dutyShiftFormSchema.parse(input)

  const { data, error } = await supabase
    .from('duty_shifts')
    .update({
      shift_date: parsed.shiftDate,
      start_time: `${parsed.startTime}:00`,
      end_time: `${parsed.endTime}:00`,
      assigned_user_id: parsed.assignedUserId?.trim() || null,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
    })
    .eq('id', id)
    .select('id, shift_date, start_time, end_time, assigned_user_id, notes, created_by')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui jadwal piket: ${error.message}`)
  }

  return data as DutyShift
}

export async function deleteDutyShift(id: string): Promise<void> {
  const { error } = await supabase.from('duty_shifts').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus jadwal piket: ${error.message}`)
  }
}

export async function uploadDutyShiftPhoto(params: {
  dutyShiftId: string
  file: File
  caption?: string
}): Promise<DutyShiftDocumentation> {
  const { dutyShiftId, file, caption } = params

  if (file.size <= 0) {
    throw new Error('Berkas kosong tidak dapat diunggah.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 5 MB per unggahan.')
  }

  const allowedMime = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedMime.includes(file.type)) {
    throw new Error('Format foto harus berupa JPEG, JPG, PNG, atau WebP.')
  }

  const userId = await getCurrentUserId()
  const fileObj = await uploadPrivateFile(file, 'duty')

  const { data, error } = await supabase
    .from('duty_shift_documentations')
    .insert({
      duty_shift_id: dutyShiftId,
      file_id: fileObj.id,
      caption: caption?.trim() ? caption.trim() : null,
      uploaded_by: userId,
    })
    .select(`
      id, duty_shift_id, file_id, caption, uploaded_by, created_at,
      file_object:file_objects(id, object_path, original_name, mime_type, file_size)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal menyimpan dokumentasi piket: ${error.message}`)
  }

  return data as unknown as DutyShiftDocumentation
}

export async function deleteDutyShiftPhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('duty_shift_documentations')
    .delete()
    .eq('id', photoId)

  if (error) {
    throw new Error(`Gagal menghapus foto dokumentasi piket: ${error.message}`)
  }
}

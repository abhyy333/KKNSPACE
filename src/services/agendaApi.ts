import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent, DutyShift } from '@/types/database'

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
      .max(1000, 'Deskripsi maksimal 1000 karakter')
      .optional(),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal kegiatan wajib dipilih'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam mulai wajib diisi (HH:MM)'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Jam selesai wajib diisi (HH:MM)'),
  })
  .refine((val) => val.endTime > val.startTime, {
    message: 'Jam selesai harus lebih akhir dari jam mulai',
    path: ['endTime'],
  })

export type CalendarEventFormInput = z.infer<typeof calendarEventFormSchema>

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

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, description, start_at, end_at, created_by')
    .order('start_at', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat agenda kalender: ${error.message}`)
  }

  return (data as CalendarEvent[]) ?? []
}

export async function createCalendarEvent(
  input: CalendarEventFormInput
): Promise<CalendarEvent> {
  const parsed = calendarEventFormSchema.parse(input)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      start_at: toLocalDateTimeIso(parsed.eventDate, parsed.startTime),
      end_at: toLocalDateTimeIso(parsed.eventDate, parsed.endTime),
      created_by: userId,
    })
    .select('id, title, description, start_at, end_at, created_by')
    .single()

  if (error) {
    throw new Error(`Gagal menambahkan agenda: ${error.message}`)
  }

  return data as CalendarEvent
}

export async function updateCalendarEvent(
  id: string,
  input: CalendarEventFormInput
): Promise<CalendarEvent> {
  const parsed = calendarEventFormSchema.parse(input)

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      start_at: toLocalDateTimeIso(parsed.eventDate, parsed.startTime),
      end_at: toLocalDateTimeIso(parsed.eventDate, parsed.endTime),
    })
    .eq('id', id)
    .select('id, title, description, start_at, end_at, created_by')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui agenda: ${error.message}`)
  }

  return data as CalendarEvent
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus agenda: ${error.message}`)
  }
}

export async function fetchDutyShifts(): Promise<DutyShift[]> {
  const { data, error } = await supabase
    .from('duty_shifts')
    .select('id, shift_date, start_time, end_time, assigned_user_id, notes, created_by')
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat jadwal piket posko: ${error.message}`)
  }

  return (data as DutyShift[]) ?? []
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

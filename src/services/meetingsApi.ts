import { supabase } from '@/lib/supabase'
import type {
  Meeting,
  MeetingAgendaItem,
  MeetingAttendee,
  MeetingDecision,
  MeetingMinute,
  MeetingStatus,
  MeetingAttendanceStatus,
  MeetingDecisionStatus,
  MeetingMinuteStatus,
} from '@/types/database'

export interface MeetingDetail extends Meeting {
  agenda_items: MeetingAgendaItem[]
  minutes: MeetingMinute | null
  attendees: (MeetingAttendee & {
    profile?: {
      full_name: string
      email?: string
      avatar_file_id?: string | null
    }
  })[]
  decisions: (MeetingDecision & {
    responsible_profile?: {
      full_name: string
    }
  })[]
}

export interface CreateMeetingInput {
  title: string
  description?: string
  meeting_date: string
  end_time?: string
  location?: string
  meeting_link?: string
  status?: MeetingStatus
  agenda_items?: { title: string; sort_order: number; notes?: string }[]
  attendee_user_ids?: string[]
}

export interface UpdateMeetingInput {
  title?: string
  description?: string
  meeting_date?: string
  end_time?: string
  location?: string
  meeting_link?: string
  status?: MeetingStatus
}

export async function fetchMeetings(options?: {
  status?: MeetingStatus | 'all'
  search?: string
}): Promise<Meeting[]> {
  let query = supabase
    .from('meetings')
    .select('*')
    .order('meeting_date', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  if (options?.search && options.search.trim()) {
    query = query.ilike('title', `%${options.search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat daftar rapat: ${error.message}`)
  }

  return (data as Meeting[]) || []
}

export async function fetchMeetingById(id: string): Promise<MeetingDetail> {
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (meetingError || !meeting) {
    throw new Error(`Rapat tidak ditemukan: ${meetingError?.message || 'ID tidak valid'}`)
  }

  // Agenda items
  const { data: agendaItems } = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', id)
    .order('sort_order', { ascending: true })

  // Minutes
  const { data: minutes } = await supabase
    .from('meeting_minutes')
    .select('*')
    .eq('meeting_id', id)
    .maybeSingle()

  // Attendees with profiles
  const { data: attendees } = await supabase
    .from('meeting_attendees')
    .select('*, profile:profiles(full_name, avatar_file_id)')
    .eq('meeting_id', id)

  // Decisions with responsible profiles
  const { data: decisions } = await supabase
    .from('meeting_decisions')
    .select('*, responsible_profile:profiles(full_name)')
    .eq('meeting_id', id)
    .order('created_at', { ascending: true })

  return {
    ...(meeting as Meeting),
    agenda_items: (agendaItems as MeetingAgendaItem[]) || [],
    minutes: (minutes as MeetingMinute) || null,
    attendees: (attendees as MeetingDetail['attendees']) || [],
    decisions: (decisions as MeetingDetail['decisions']) || [],
  }
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      meeting_date: input.meeting_date,
      end_time: input.end_time || null,
      location: input.location?.trim() || null,
      meeting_link: input.meeting_link?.trim() || null,
      status: input.status || 'planned',
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !meeting) {
    throw new Error(`Gagal membuat rapat: ${error?.message}`)
  }

  // Insert agenda items if any
  if (input.agenda_items && input.agenda_items.length > 0) {
    const agendaRows = input.agenda_items.map((item, idx) => ({
      meeting_id: meeting.id,
      title: item.title.trim(),
      sort_order: item.sort_order ?? idx + 1,
      notes: item.notes?.trim() || null,
    }))
    await supabase.from('meeting_agenda_items').insert(agendaRows)
  }

  // Insert attendees if specified, or auto-enroll all active members
  if (input.attendee_user_ids && input.attendee_user_ids.length > 0) {
    const attendeeRows = input.attendee_user_ids.map((uid) => ({
      meeting_id: meeting.id,
      user_id: uid,
      attendance_status: 'pending',
    }))
    await supabase.from('meeting_attendees').insert(attendeeRows)
  } else {
    // Auto populate with all active memberships
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('status', 'active')

    if (members && members.length > 0) {
      const attendeeRows = members.map((m) => ({
        meeting_id: meeting.id,
        user_id: m.user_id,
        attendance_status: 'pending',
      }))
      await supabase.from('meeting_attendees').insert(attendeeRows)
    }
  }

  return meeting as Meeting
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui rapat: ${error?.message}`)
  }

  return data as Meeting
}

export async function deleteMeeting(id: string): Promise<void> {
  // Cascading deletes on meeting_agenda_items, minutes, attendees, decisions
  await supabase.from('meeting_agenda_items').delete().eq('meeting_id', id)
  await supabase.from('meeting_minutes').delete().eq('meeting_id', id)
  await supabase.from('meeting_attendees').delete().eq('meeting_id', id)
  await supabase.from('meeting_decisions').delete().eq('meeting_id', id)

  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus rapat: ${error.message}`)
  }
}

export async function updateAttendeeAttendance(
  meetingId: string,
  userId: string,
  status: MeetingAttendanceStatus,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('meeting_attendees')
    .update({
      attendance_status: status,
      notes: notes?.trim() || null,
      confirmed_at: new Date().toISOString(),
    })
    .match({ meeting_id: meetingId, user_id: userId })

  if (error) {
    throw new Error(`Gagal memperbarui presensi: ${error.message}`)
  }
}

export async function upsertMeetingMinutes(
  meetingId: string,
  data: {
    content?: string
    status?: MeetingMinuteStatus
    key_points?: string
    discussion_summary?: string
    conclusions?: string
  }
): Promise<MeetingMinute> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { data: existing } = await supabase
    .from('meeting_minutes')
    .select('id')
    .eq('meeting_id', meetingId)
    .maybeSingle()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('meeting_minutes')
      .update({
        content: data.content || '',
        status: data.status || 'draft',
        key_points: data.key_points || null,
        discussion_summary: data.discussion_summary || null,
        conclusions: data.conclusions || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error || !updated) throw new Error(`Gagal menyimpan notulensi: ${error?.message}`)
    return updated as MeetingMinute
  } else {
    const { data: inserted, error } = await supabase
      .from('meeting_minutes')
      .insert({
        meeting_id: meetingId,
        author_id: user.id,
        content: data.content || '',
        status: data.status || 'draft',
        key_points: data.key_points || null,
        discussion_summary: data.discussion_summary || null,
        conclusions: data.conclusions || null,
      })
      .select()
      .single()

    if (error || !inserted) throw new Error(`Gagal membuat notulensi: ${error?.message}`)
    return inserted as MeetingMinute
  }
}

export async function addMeetingDecision(
  meetingId: string,
  decision: {
    title?: string
    decision: string
    responsible_user_id?: string
    due_date?: string
    status?: MeetingDecisionStatus
    progress_notes?: string
  }
): Promise<MeetingDecision> {
  const { data, error } = await supabase
    .from('meeting_decisions')
    .insert({
      meeting_id: meetingId,
      title: decision.title?.trim() || null,
      decision: decision.decision.trim(),
      responsible_user_id: decision.responsible_user_id || null,
      due_date: decision.due_date || null,
      status: decision.status || 'todo',
      progress_notes: decision.progress_notes?.trim() || null,
    })
    .select('*, responsible_profile:profiles(full_name)')
    .single()

  if (error || !data) {
    throw new Error(`Gagal menyimpan butir keputusan/tindak lanjut: ${error?.message}`)
  }

  return data as MeetingDecision
}

export async function updateMeetingDecision(
  decisionId: string,
  data: {
    status?: MeetingDecisionStatus
    progress_notes?: string
    due_date?: string
    title?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('meeting_decisions')
    .update(data)
    .eq('id', decisionId)

  if (error) {
    throw new Error(`Gagal memperbarui status tindak lanjut: ${error.message}`)
  }
}

export async function deleteMeetingDecision(decisionId: string): Promise<void> {
  const { error } = await supabase.from('meeting_decisions').delete().eq('id', decisionId)
  if (error) {
    throw new Error(`Gagal menghapus keputusan: ${error.message}`)
  }
}

export async function addMeetingAgendaItem(
  meetingId: string,
  title: string,
  notes?: string
): Promise<MeetingAgendaItem> {
  const { data: existing } = await supabase
    .from('meeting_agenda_items')
    .select('sort_order')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .insert({
      meeting_id: meetingId,
      title: title.trim(),
      notes: notes?.trim() || null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal menambahkan topik agenda: ${error?.message}`)
  }

  return data as MeetingAgendaItem
}

export async function deleteMeetingAgendaItem(agendaItemId: string): Promise<void> {
  const { error } = await supabase.from('meeting_agenda_items').delete().eq('id', agendaItemId)
  if (error) {
    throw new Error(`Gagal menghapus agenda item: ${error.message}`)
  }
}

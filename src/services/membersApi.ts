import { z } from 'zod'
import { sortDirectoryMembers } from '@/lib/directory'
import { supabase } from '@/lib/supabase'
import { uploadPrivateFile } from '@/services/storageApi'
import type { KknTeamDirectoryMember } from '@/types/database'

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_ADMIN_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_SELF_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const DIRECTORY_SELECT_COLUMNS =
  'id, linked_user_id, full_name, identity_number, university, study_program, academic_status, phone, position_label, role, division, account_email, photo_file_id, photo_path, is_active, created_at, updated_at'

export const ownProfileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  phone: z
    .string()
    .trim()
    .max(30, 'Nomor telepon maksimal 30 karakter')
    .refine(
      (val) => !val || /^[+\d\s()-]{6,30}$/.test(val),
      'Format nomor telepon tidak valid (gunakan angka, +, spasi, atau tanda hubung)'
    )
    .optional(),
})

export type OwnProfileFormInput = z.infer<typeof ownProfileFormSchema>

export const directoryMemberFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(120, 'Nama lengkap maksimal 120 karakter'),
  identityNumber: z
    .string()
    .trim()
    .min(3, 'NIM / ID minimal 3 karakter')
    .max(40, 'NIM / ID maksimal 40 karakter'),
  university: z
    .string()
    .trim()
    .max(150, 'Nama universitas maksimal 150 karakter')
    .refine((val) => !val || val.length >= 2, 'Nama universitas minimal 2 karakter bila diisi')
    .optional(),
  studyProgram: z
    .string()
    .trim()
    .min(2, 'Program studi minimal 2 karakter')
    .max(120, 'Program studi maksimal 120 karakter'),
  academicStatus: z.enum(['mahasiswa', 'dosen']),
  phone: z
    .string()
    .trim()
    .max(30, 'Nomor HP maksimal 30 karakter')
    .refine(
      (val) => !val || /^[+\d\s()-]{6,30}$/.test(val),
      'Format nomor HP tidak valid'
    )
    .optional(),
  positionLabel: z
    .string()
    .trim()
    .min(2, 'Jabatan minimal 2 karakter')
    .max(60, 'Jabatan maksimal 60 karakter'),
  role: z.enum(['ketua', 'sekretaris', 'bendahara', 'anggota', 'dpl']),
  division: z
    .string()
    .trim()
    .max(60, 'Nama divisi maksimal 60 karakter')
    .optional(),
  linkedUserId: z
    .string()
    .trim()
    .refine(
      (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
      'ID akun Auth tidak valid'
    )
    .optional(),
  isActive: z.boolean(),
})

export type DirectoryMemberFormInput = z.infer<typeof directoryMemberFormSchema>

export async function updateOwnProfile(input: OwnProfileFormInput): Promise<void> {
  const parsed = ownProfileFormSchema.parse(input)
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk ulang.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.fullName,
      phone: parsed.phone?.trim() ? parsed.phone.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userData.user.id)

  if (error) {
    throw new Error(`Gagal memperbarui profil Anda: ${error.message}`)
  }
}

export async function fetchTeamDirectory(): Promise<KknTeamDirectoryMember[]> {
  const { data, error } = await supabase
    .from('kkn_team_directory')
    .select(DIRECTORY_SELECT_COLUMNS)

  if (error) {
    throw new Error(`Gagal memuat direktori tim KKN: ${error.message}`)
  }

  return sortDirectoryMembers((data as KknTeamDirectoryMember[]) ?? [])
}

function buildDirectoryPayload(parsed: DirectoryMemberFormInput) {
  return {
    full_name: parsed.fullName,
    identity_number: parsed.identityNumber,
    university: parsed.university?.trim() ? parsed.university.trim() : null,
    study_program: parsed.studyProgram,
    academic_status: parsed.academicStatus,
    phone: parsed.phone?.trim() ? parsed.phone.trim() : null,
    position_label: parsed.positionLabel,
    role: parsed.role,
    division: parsed.division?.trim() ? parsed.division.trim() : null,
    linked_user_id: parsed.linkedUserId?.trim() ? parsed.linkedUserId.trim() : null,
    is_active: parsed.isActive,
  }
}

export async function createDirectoryMember(
  input: DirectoryMemberFormInput
): Promise<KknTeamDirectoryMember> {
  const parsed = directoryMemberFormSchema.parse(input)

  const { data, error } = await supabase
    .from('kkn_team_directory')
    .insert(buildDirectoryPayload(parsed))
    .select(DIRECTORY_SELECT_COLUMNS)
    .single()

  if (error || !data) {
    throw new Error(`Gagal menambahkan anggota direktori: ${error?.message || 'Unknown error'}`)
  }

  return data as KknTeamDirectoryMember
}

export async function updateDirectoryMember(
  directoryId: string,
  input: DirectoryMemberFormInput
): Promise<KknTeamDirectoryMember> {
  const parsed = directoryMemberFormSchema.parse(input)

  const { data, error } = await supabase
    .from('kkn_team_directory')
    .update(buildDirectoryPayload(parsed))
    .eq('id', directoryId)
    .select(DIRECTORY_SELECT_COLUMNS)
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui data anggota: ${error?.message || 'Unknown error'}`)
  }

  return data as KknTeamDirectoryMember
}

export async function setDirectoryMemberActive(
  directoryId: string,
  isActive: boolean
): Promise<KknTeamDirectoryMember> {
  const { data, error } = await supabase
    .from('kkn_team_directory')
    .update({ is_active: isActive })
    .eq('id', directoryId)
    .select(DIRECTORY_SELECT_COLUMNS)
    .single()

  if (error || !data) {
    throw new Error(
      `Gagal ${isActive ? 'mengaktifkan' : 'menonaktifkan'} anggota direktori: ${error?.message || 'Unknown error'}`
    )
  }

  return data as KknTeamDirectoryMember
}

export async function uploadDirectoryMemberPhoto(
  directoryId: string,
  file: File
): Promise<KknTeamDirectoryMember> {
  if (!ALLOWED_PHOTO_MIME_TYPES.has(file.type)) {
    throw new Error('Format foto harus JPG, PNG, atau WEBP.')
  }
  if (file.size <= 0 || file.size > MAX_ADMIN_PHOTO_BYTES) {
    throw new Error('Ukuran foto profil harus antara 1 byte hingga 5 MB.')
  }

  const uploaded = await uploadPrivateFile(file, 'directory')

  const { data, error } = await supabase
    .from('kkn_team_directory')
    .update({
      photo_file_id: uploaded.id,
      photo_path: uploaded.object_path,
    })
    .eq('id', directoryId)
    .select(DIRECTORY_SELECT_COLUMNS)
    .single()

  if (error || !data) {
    throw new Error(`Foto terunggah, namun gagal menautkan ke anggota: ${error?.message || 'Unknown error'}`)
  }

  return data as KknTeamDirectoryMember
}

export async function removeDirectoryMemberPhoto(
  directoryId: string
): Promise<KknTeamDirectoryMember> {
  const { data, error } = await supabase
    .from('kkn_team_directory')
    .update({
      photo_file_id: null,
      photo_path: null,
    })
    .eq('id', directoryId)
    .select(DIRECTORY_SELECT_COLUMNS)
    .single()

  if (error || !data) {
    throw new Error(`Gagal menghapus foto anggota: ${error?.message || 'Unknown error'}`)
  }

  return data as KknTeamDirectoryMember
}

export interface OwnDirectoryProfile extends KknTeamDirectoryMember {
  auth_email: string
  membership_role: KknTeamDirectoryMember['role'] | null
  membership_division: string | null
  membership_status: string | null
  is_super_admin: boolean
}

export const ownDirectoryProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(120, 'Nama lengkap maksimal 120 karakter'),
  identityNumber: z
    .string()
    .trim()
    .min(3, 'NIM / NIP / ID minimal 3 karakter')
    .max(40, 'NIM / NIP / ID maksimal 40 karakter'),
  university: z
    .string()
    .trim()
    .max(150, 'Nama universitas maksimal 150 karakter')
    .refine((val) => !val || val.length >= 2, 'Nama universitas minimal 2 karakter bila diisi')
    .optional(),
  studyProgram: z
    .string()
    .trim()
    .min(2, 'Program studi minimal 2 karakter')
    .max(120, 'Program studi maksimal 120 karakter'),
})

export type OwnDirectoryProfileInput = z.infer<typeof ownDirectoryProfileSchema>

export async function fetchOwnDirectoryProfile(): Promise<OwnDirectoryProfile | null> {
  const { data, error } = await supabase.rpc('get_own_directory_profile')

  if (error) {
    throw new Error(`Gagal memuat profil direktori Anda: ${error.message}`)
  }

  const rows = (data ?? []) as OwnDirectoryProfile[]
  return rows[0] ?? null
}

export async function uploadOwnProfilePhoto(file: File): Promise<{ fileId: string; objectPath: string }> {
  if (!ALLOWED_PHOTO_MIME_TYPES.has(file.type)) {
    throw new Error('Format foto profil harus JPG, PNG, atau WEBP.')
  }
  if (file.size <= 0 || file.size > MAX_SELF_PROFILE_PHOTO_BYTES) {
    throw new Error('Ukuran foto profil pribadi maksimal 2 MB.')
  }

  const uploaded = await uploadPrivateFile(file, 'directory')
  return { fileId: uploaded.id, objectPath: uploaded.object_path }
}

export async function saveOwnDirectoryProfile(input: {
  fullName: string
  identityNumber: string
  university?: string | null
  studyProgram: string
  photoAction?: 'keep' | 'replace' | 'remove'
  photoFileId?: string | null
}): Promise<KknTeamDirectoryMember> {
  const parsed = ownDirectoryProfileSchema.parse({
    fullName: input.fullName,
    identityNumber: input.identityNumber,
    university: input.university ?? '',
    studyProgram: input.studyProgram,
  })

  const { data, error } = await supabase.rpc('update_own_directory_profile', {
    p_full_name: parsed.fullName,
    p_identity_number: parsed.identityNumber,
    p_university: parsed.university?.trim() ? parsed.university.trim() : null,
    p_study_program: parsed.studyProgram,
    p_photo_action: input.photoAction ?? 'keep',
    p_photo_file_id: input.photoFileId ?? null,
  })

  if (error) {
    throw new Error(`Gagal menyimpan perubahan profil: ${error.message}`)
  }

  const rows = (data ?? []) as KknTeamDirectoryMember[]
  if (!rows[0]) {
    throw new Error('Profil tidak ditemukan setelah diperbarui.')
  }

  return rows[0]
}

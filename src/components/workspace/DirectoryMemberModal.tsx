import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DIRECTORY_ROLE_OPTIONS, ROLE_TO_DEFAULT_POSITION } from '@/lib/directory'
import type { AdminUserDto } from '@/services/adminApi'
import {
  directoryMemberFormSchema,
  type DirectoryMemberFormInput,
} from '@/services/membersApi'
import type { KknRole, KknTeamDirectoryMember } from '@/types/database'
import { AlertCircle, Camera, Link2, Loader2, Trash2 } from 'lucide-react'

interface DirectoryMemberModalProps {
  open: boolean
  member: KknTeamDirectoryMember | null
  allMembers: KknTeamDirectoryMember[]
  authUsers: AdminUserDto[]
  authUsersLoading?: boolean
  signedPhotoUrl?: string | null
  saving: boolean
  photoUploading: boolean
  formError: string | null
  onClose: () => void
  onSubmitMember: (values: DirectoryMemberFormInput) => void
  onUploadPhoto: (memberId: string, file: File) => Promise<void>
  onRemovePhoto: (memberId: string) => Promise<void>
}

export const DirectoryMemberModal: React.FC<DirectoryMemberModalProps> = ({
  open,
  member,
  allMembers,
  authUsers,
  authUsersLoading = false,
  signedPhotoUrl,
  saving,
  photoUploading,
  formError,
  onClose,
  onSubmitMember,
  onUploadPhoto,
  onRemovePhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localPhotoError, setLocalPhotoError] = useState<string | null>(null)
  const [stagedPhotoFile, setStagedPhotoFile] = useState<File | null>(null)
  const [stagedPhotoPreview, setStagedPhotoPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DirectoryMemberFormInput>({
    resolver: zodResolver(directoryMemberFormSchema),
    defaultValues: {
      fullName: '',
      identityNumber: '',
      university: '',
      studyProgram: '',
      academicStatus: 'mahasiswa',
      phone: '',
      positionLabel: 'Anggota',
      role: 'anggota',
      division: '',
      linkedUserId: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!open) return

    if (member) {
      reset({
        fullName: member.full_name,
        identityNumber: member.identity_number,
        university: member.university ?? '',
        studyProgram: member.study_program,
        academicStatus: member.academic_status,
        phone: member.phone ?? '',
        positionLabel: member.position_label,
        role: member.role,
        division: member.division ?? '',
        linkedUserId: member.linked_user_id ?? '',
        isActive: member.is_active,
      })
    } else {
      reset({
        fullName: '',
        identityNumber: '',
        university: '',
        studyProgram: '',
        academicStatus: 'mahasiswa',
        phone: '',
        positionLabel: 'Anggota',
        role: 'anggota',
        division: '',
        linkedUserId: '',
        isActive: true,
      })
    }
  }, [open, member, reset])

  const linkedToOtherMap = new Map<string, string>()
  for (const item of allMembers) {
    if (item.linked_user_id && item.id !== member?.id) {
      linkedToOtherMap.set(item.linked_user_id, item.full_name)
    }
  }

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as KknRole
    setValue('role', nextRole, { shouldValidate: true })

    if (!member) {
      setValue('positionLabel', ROLE_TO_DEFAULT_POSITION[nextRole], { shouldValidate: true })
    } else {
      const currentPosition = getValues('positionLabel').trim()
      const knownDefaults = Object.values(ROLE_TO_DEFAULT_POSITION)
      if (!currentPosition || knownDefaults.includes(currentPosition)) {
        setValue('positionLabel', ROLE_TO_DEFAULT_POSITION[nextRole], { shouldValidate: true })
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !member) return

    setLocalPhotoError(null)

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowed.has(file.type)) {
      setLocalPhotoError('Format foto harus JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setLocalPhotoError('Ukuran berkas foto maksimal 5 MB.')
      return
    }

    if (stagedPhotoPreview) {
      URL.revokeObjectURL(stagedPhotoPreview)
    }

    setStagedPhotoFile(file)
    setStagedPhotoPreview(URL.createObjectURL(file))
  }

  const handleCancelStagedPhoto = () => {
    if (stagedPhotoPreview) {
      URL.revokeObjectURL(stagedPhotoPreview)
    }
    setStagedPhotoFile(null)
    setStagedPhotoPreview(null)
    setLocalPhotoError(null)
  }

  const handleConfirmUploadPhoto = async () => {
    if (!stagedPhotoFile || !member) return
    setLocalPhotoError(null)
    try {
      await onUploadPhoto(member.id, stagedPhotoFile)
      handleCancelStagedPhoto()
    } catch (err) {
      setLocalPhotoError(err instanceof Error ? err.message : 'Gagal mengunggah foto.')
    }
  }

  const handleDeletePhoto = async () => {
    if (!member) return
    setLocalPhotoError(null)
    try {
      await onRemovePhoto(member.id)
      handleCancelStagedPhoto()
    } catch (err) {
      setLocalPhotoError(err instanceof Error ? err.message : 'Gagal menghapus foto.')
    }
  }

  const handleClose = () => {
    handleCancelStagedPhoto()
    setLocalPhotoError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={member ? 'Kelola Data Anggota Tim KKN' : 'Tambah Anggota Tim KKN'}
      description={
        member
          ? 'Pembaruan direktori ini disimpan langsung ke tabel resmi tim KKN dan tercatat di audit log.'
          : 'Tambahkan data anggota resmi ke direktori tim KKN tanpa membuat akun login otomatis.'
      }
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {member && (
          <div className="rounded-lg border border-warm-300 bg-warm-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {stagedPhotoPreview ? (
                <img
                  src={stagedPhotoPreview}
                  alt={`Pratinjau foto baru ${member.full_name}`}
                  className="h-12 w-12 rounded-full object-cover border-2 border-emerald-400 shrink-0"
                />
              ) : signedPhotoUrl ? (
                <img
                  src={signedPhotoUrl}
                  alt={member.full_name}
                  className="h-12 w-12 rounded-full object-cover border border-sage-200 shrink-0"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-semibold text-base border border-sage-200">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-charcoal truncate">
                  {stagedPhotoFile ? 'Pratinjau Foto Baru (Belum Disimpan)' : 'Foto Profil Anggota (kkn-private)'}
                </p>
                <p className="text-[11px] text-charcoal-muted truncate">
                  {stagedPhotoFile
                    ? `${stagedPhotoFile.name} (${Math.round(stagedPhotoFile.size / 1024)} KB) — Klik Simpan untuk menerapkan.`
                    : member.photo_path
                      ? member.photo_path
                      : 'Belum ada foto resmi — menggunakan avatar inisial.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {stagedPhotoFile ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={photoUploading}
                    onClick={handleConfirmUploadPhoto}
                    className="text-xs gap-1.5"
                  >
                    {photoUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    <span>Simpan Foto Baru</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={photoUploading}
                    onClick={handleCancelStagedPhoto}
                    className="text-xs"
                  >
                    Batal
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={photoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs gap-1.5"
                  >
                    {photoUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    <span>{member.photo_file_id ? 'Ganti Foto' : 'Unggah Foto'}</span>
                  </Button>
                  {member.photo_file_id && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={photoUploading}
                      onClick={handleDeletePhoto}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {(formError || localPhotoError) && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError || localPhotoError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitMember)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="dir-full-name" className="text-xs font-medium text-charcoal block">
                Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
              </label>
              <Input id="dir-full-name" {...register('fullName')} />
              {errors.fullName && (
                <p className="text-[11px] text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-identity" className="text-xs font-medium text-charcoal block">
                NIM / ID Dosen <span className="text-red-500">*</span>
              </label>
              <Input id="dir-identity" {...register('identityNumber')} />
              {errors.identityNumber && (
                <p className="text-[11px] text-red-600">{errors.identityNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-academic-status" className="text-xs font-medium text-charcoal block">
                Status Akademik <span className="text-red-500">*</span>
              </label>
              <select
                id="dir-academic-status"
                {...register('academicStatus')}
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
              >
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
              </select>
              {errors.academicStatus && (
                <p className="text-[11px] text-red-600">{errors.academicStatus.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-university" className="text-xs font-medium text-charcoal block">
                Universitas <span className="text-charcoal-muted font-normal">(opsional)</span>
              </label>
              <Input
                id="dir-university"
                placeholder="Contoh: Universitas Mataram"
                {...register('university')}
              />
              {errors.university && (
                <p className="text-[11px] text-red-600">{errors.university.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-study-program" className="text-xs font-medium text-charcoal block">
                Program Studi <span className="text-red-500">*</span>
              </label>
              <Input id="dir-study-program" {...register('studyProgram')} />
              {errors.studyProgram && (
                <p className="text-[11px] text-red-600">{errors.studyProgram.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-role" className="text-xs font-medium text-charcoal block">
                Role Aplikasi (Normalisasi) <span className="text-red-500">*</span>
              </label>
              <select
                id="dir-role"
                {...register('role', { onChange: handleRoleChange })}
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
              >
                {DIRECTORY_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-[11px] text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-position" className="text-xs font-medium text-charcoal block">
                Label Jabatan Resmi <span className="text-red-500">*</span>
              </label>
              <Input
                id="dir-position"
                placeholder="Misal: Pembimbing, Ketua, Sekretaris, Bendahara, Anggota"
                {...register('positionLabel')}
              />
              {errors.positionLabel && (
                <p className="text-[11px] text-red-600">{errors.positionLabel.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-division" className="text-xs font-medium text-charcoal block">
                Divisi KKN (Opsional)
              </label>
              <Input
                id="dir-division"
                placeholder="Kosongkan jika belum ditetapkan"
                {...register('division')}
              />
              {errors.division && (
                <p className="text-[11px] text-red-600">{errors.division.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dir-phone" className="text-xs font-medium text-charcoal block">
                Nomor HP / WhatsApp
              </label>
              <Input
                id="dir-phone"
                placeholder="08xxxxxxxxxx"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-[11px] text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="dir-linked-user" className="text-xs font-medium text-charcoal inline-flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-sage-700" />
                  <span>Hubungkan ke Akun Supabase Auth</span>
                </label>
                {authUsersLoading && (
                  <Badge variant="outline" className="text-[10px]">
                    Memuat daftar akun...
                  </Badge>
                )}
              </div>
              <select
                id="dir-linked-user"
                {...register('linkedUserId')}
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
              >
                <option value="">— Belum dihubungkan ke akun Auth (NULL) —</option>
                {authUsers.map((authUser) => {
                  const usedByName = linkedToOtherMap.get(authUser.id)
                  return (
                    <option
                      key={authUser.id}
                      value={authUser.id}
                      disabled={Boolean(usedByName)}
                    >
                      {authUser.email} · {authUser.full_name} ({authUser.membership_role ?? 'non-member'}
                      {authUser.membership_division ? ` · ${authUser.membership_division}` : ''})
                      {usedByName ? ` — sudah tertaut ke ${usedByName}` : ''}
                    </option>
                  )
                })}
              </select>
              <p className="text-[11px] text-charcoal-muted">
                Hanya hubungkan jika identitas pemilik akun email sudah terverifikasi. Pengaitan di sini tidak mengubah role/status di akun Auth.
              </p>
              {errors.linkedUserId && (
                <p className="text-[11px] text-red-600">{errors.linkedUserId.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-warm-200 bg-warm-50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-charcoal">Status Record Direktori</p>
                <p className="text-[11px] text-charcoal-muted">
                  Nonaktifkan record jika anggota sudah tidak aktif tanpa menghapus histori database.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-warm-300 accent-sage-600"
                />
                <span>Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-warm-200">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{member ? 'Simpan Perubahan' : 'Tambah Anggota'}</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

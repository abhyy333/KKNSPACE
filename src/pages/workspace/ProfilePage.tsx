import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  GraduationCap,
  IdCard,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { ACADEMIC_STATUS_LABELS } from '@/lib/directory'
import {
  fetchOwnDirectoryProfile,
  MAX_SELF_PROFILE_PHOTO_BYTES,
  ownDirectoryProfileSchema,
  saveOwnDirectoryProfile,
  uploadOwnProfilePhoto,
  type OwnDirectoryProfile,
} from '@/services/membersApi'
import { formatBytes, getPrivateFileSignedUrl } from '@/services/storageApi'

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const ROLE_LABELS: Record<string, string> = {
  dpl: 'DPL / Pembimbing',
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
}

interface FieldErrors {
  fullName?: string
  identityNumber?: string
  university?: string
  studyProgram?: string
}

function getInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'K'
}

export const ProfilePage: React.FC = () => {
  const { user, profile: authProfile, membership, isSuperAdmin, refreshAccessContext } = useAuth()
  const role = membership?.role ?? null
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    data: ownProfile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workspace', 'own-profile', user?.id ?? null],
    queryFn: fetchOwnDirectoryProfile,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })

  const { data: signedPhoto } = useQuery({
    queryKey: ['workspace', 'own-profile-photo', ownProfile?.photo_file_id ?? null],
    queryFn: () => getPrivateFileSignedUrl(ownProfile!.photo_file_id!, false),
    enabled: Boolean(ownProfile?.photo_file_id),
    staleTime: 240_000,
    retry: 1,
  })

  const [fullName, setFullName] = useState('')
  const [identityNumber, setIdentityNumber] = useState('')
  const [university, setUniversity] = useState('')
  const [studyProgram, setStudyProgram] = useState('')
  const [photoAction, setPhotoAction] = useState<'keep' | 'replace' | 'remove'>('keep')
  const [stagedPhoto, setStagedPhoto] = useState<{
    fileId: string
    previewUrl: string
    fileName: string
  } | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  const revokeStagedPreview = (staged: { previewUrl: string } | null) => {
    if (staged?.previewUrl) {
      URL.revokeObjectURL(staged.previewUrl)
    }
  }

  const syncFormFromProfile = (source: OwnDirectoryProfile) => {
    setFullName(source.full_name)
    setIdentityNumber(source.identity_number)
    setUniversity(source.university ?? '')
    setStudyProgram(source.study_program)
    setPhotoAction('keep')
    setStagedPhoto((prev) => {
      revokeStagedPreview(prev)
      return null
    })
    setFieldErrors({})
    setFormError(null)
  }

  useEffect(() => {
    if (ownProfile) {
      syncFormFromProfile(ownProfile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ownProfile?.id,
    ownProfile?.full_name,
    ownProfile?.identity_number,
    ownProfile?.university,
    ownProfile?.study_program,
    ownProfile?.photo_file_id,
  ])

  useEffect(() => {
    return () => {
      if (stagedPhoto?.previewUrl) {
        URL.revokeObjectURL(stagedPhoto.previewUrl)
      }
    }
  }, [stagedPhoto])

  const hasUnsavedChanges = Boolean(
    ownProfile &&
      (fullName.trim() !== ownProfile.full_name.trim() ||
        identityNumber.trim() !== ownProfile.identity_number.trim() ||
        (university.trim() || '') !== (ownProfile.university ?? '').trim() ||
        studyProgram.trim() !== ownProfile.study_program.trim() ||
        photoAction !== 'keep')
  )

  const activePhotoUrl =
    photoAction === 'remove'
      ? null
      : photoAction === 'replace' && stagedPhoto
        ? stagedPhoto.previewUrl
        : ownProfile?.photo_file_id
          ? signedPhoto?.signedUrl ?? null
          : null

  const identityLabel = ownProfile?.academic_status === 'dosen' ? 'NIP / ID' : 'NIM'

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFormError(null)
    setSavedNotice(null)

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      const msg = 'Format foto profil harus JPG, PNG, atau WEBP.'
      setFormError(msg)
      toast({ variant: 'error', title: 'Format Foto Tidak Didukung', description: msg })
      return
    }

    if (file.size <= 0 || file.size > MAX_SELF_PROFILE_PHOTO_BYTES) {
      const msg = `Ukuran foto profil maksimal ${formatBytes(MAX_SELF_PROFILE_PHOTO_BYTES)}.`
      setFormError(msg)
      toast({ variant: 'error', title: 'Ukuran Foto Terlalu Besar', description: msg })
      return
    }

    setIsUploadingPhoto(true)
    try {
      const uploaded = await uploadOwnProfilePhoto(file)
      const previewUrl = URL.createObjectURL(file)
      setStagedPhoto((prev) => {
        revokeStagedPreview(prev)
        return {
          fileId: uploaded.fileId,
          previewUrl,
          fileName: file.name,
        }
      })
      setPhotoAction('replace')
      toast({
        variant: 'info',
        title: 'Foto Siap Diterapkan',
        description: 'Klik "Simpan Perubahan" untuk memperbarui profil publik.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto profil.'
      setFormError(msg)
      toast({ variant: 'error', title: 'Gagal Mengunggah Foto', description: msg })
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setFormError(null)
    setSavedNotice(null)
    setStagedPhoto((prev) => {
      revokeStagedPreview(prev)
      return null
    })
    setPhotoAction('remove')
  }

  const handleCancelChanges = () => {
    if (!ownProfile) return
    syncFormFromProfile(ownProfile)
    setSavedNotice(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ownProfile) return

    setFormError(null)
    setSavedNotice(null)

    const parsed = ownDirectoryProfileSchema.safeParse({
      fullName,
      identityNumber,
      university,
      studyProgram,
    })

    if (!parsed.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message
        }
      }
      setFieldErrors(nextErrors)
      setFormError(parsed.error.issues[0]?.message ?? 'Periksa kembali data profil Anda.')
      return
    }

    setFieldErrors({})
    setIsSaving(true)
    try {
      await saveOwnDirectoryProfile({
        fullName: parsed.data.fullName,
        identityNumber: parsed.data.identityNumber,
        university: parsed.data.university ?? null,
        studyProgram: parsed.data.studyProgram,
        photoAction,
        photoFileId: photoAction === 'replace' ? stagedPhoto?.fileId ?? null : null,
      })

      setPhotoAction('keep')
      setStagedPhoto((prev) => {
        revokeStagedPreview(prev)
        return null
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        refreshAccessContext(),
      ])

      const timestampLabel = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
      setSavedNotice(`Perubahan tersimpan (${timestampLabel}) dan langsung tercermin di halaman publik /tim.`)
      toast({
        variant: 'success',
        title: 'Profil Diperbarui',
        description: 'Data profil Anda berhasil disimpan dan disinkronkan ke portal publik.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan profil.'
      setFormError(msg)
      toast({ variant: 'error', title: 'Gagal Menyimpan Profil', description: msg })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <UserCog className="h-3.5 w-3.5" />
            <span>Identitas Mandiri Anggota</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Profil Saya
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Perbarui identitas akademik dan foto profil Anda. Perubahan yang disimpan langsung sinkron dengan direktori kelompok dan portal publik.
          </p>
        </div>

        <Link
          to="/workspace/members"
          className={`${buttonVariants({ variant: 'outline', size: 'sm' })} text-xs gap-1.5 self-start sm:self-auto`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Lihat Direktori Tim</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-charcoal">Gagal memuat profil Anda</h2>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kendala saat mengambil data profil.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : !ownProfile ? (
        <Card className="border-warm-300">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h2 className="text-base font-serif font-semibold text-charcoal">
                  Akun Anda Belum Tertaut ke Slot Anggota Direktori
                </h2>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Akun login <span className="font-mono text-charcoal">{user?.email ?? '—'}</span> saat ini belum terhubung ke salah satu dari 11 record pada <span className="font-mono">kkn_team_directory</span>. Hubungi Super Admin untuk menautkan slot anggota yang sesuai.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="secondary">{authProfile?.full_name || user?.email || 'Pengguna'}</Badge>
                  {role && <Badge variant="outline">Role: {ROLE_LABELS[role] ?? role}</Badge>}
                  {isSuperAdmin && (
                    <Badge variant="sand" className="gap-1">
                      <Shield className="h-3 w-3" />
                      <span>Super Admin</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Identity Summary & Photo Card */}
          <Card className="border-warm-300 bg-white">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  {activePhotoUrl ? (
                    <img
                      src={activePhotoUrl}
                      alt={`Foto profil ${ownProfile.full_name}`}
                      className="h-24 w-24 rounded-full object-cover border-2 border-sage-200 bg-sage-50"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-serif font-bold text-3xl border-2 border-sage-200">
                      {getInitials(fullName || ownProfile.full_name)}
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-white/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-sage-700" />
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-serif font-semibold text-charcoal">
                    {fullName.trim() || ownProfile.full_name}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    <Badge variant={ownProfile.role === 'dpl' ? 'sand' : 'default'}>
                      {ownProfile.position_label}
                    </Badge>
                    {ownProfile.division && ownProfile.role !== 'dpl' && (
                      <Badge variant="outline" className="text-[11px]">
                        Div. {ownProfile.division}
                      </Badge>
                    )}
                    {ownProfile.is_super_admin && (
                      <Badge variant="sand" className="gap-1 text-[11px]">
                        <Shield className="h-3 w-3" />
                        <span>Super Admin</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelected}
                  className="hidden"
                  aria-label="Pilih foto profil"
                />

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingPhoto || isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{activePhotoUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                  </Button>

                  {(activePhotoUrl || ownProfile.photo_file_id) && photoAction !== 'remove' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploadingPhoto || isSaving}
                      onClick={handleRemovePhoto}
                      className="text-xs gap-1 text-red-700 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Foto</span>
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-charcoal-muted">
                  Format JPG, PNG, atau WEBP maksimal 2 MB.
                  {photoAction === 'replace' && stagedPhoto && (
                    <span className="block text-sage-800 font-medium mt-1">
                      Foto baru siap disimpan: {stagedPhoto.fileName}
                    </span>
                  )}
                  {photoAction === 'remove' && (
                    <span className="block text-amber-700 font-medium mt-1">
                      Foto profil ditandai untuk dihapus saat Anda menyimpan perubahan.
                    </span>
                  )}
                </p>
              </div>

              <div className="border-t border-warm-200 pt-4 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-charcoal-muted flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-sage-700" />
                    Email Login
                  </span>
                  <span className="font-mono text-charcoal text-right break-all">
                    {ownProfile.auth_email}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-charcoal-muted flex items-center gap-1.5 shrink-0">
                    <BadgeCheck className="h-3.5 w-3.5 text-sage-700" />
                    Jabatan & Divisi
                  </span>
                  <span className="text-charcoal font-medium text-right">
                    {ownProfile.position_label}
                    {ownProfile.role === 'dpl'
                      ? ' — Tidak berlaku'
                      : ` — ${ownProfile.division ? `Div. ${ownProfile.division}` : 'Belum ditentukan'}`}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-charcoal-muted flex items-center gap-1.5 shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-sage-700" />
                    Status Akademik
                  </span>
                  <span className="text-charcoal text-right">
                    {ACADEMIC_STATUS_LABELS[ownProfile.academic_status]}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-charcoal-muted flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-sage-700" />
                    Nomor HP
                  </span>
                  <span className="text-charcoal font-mono text-right">
                    {ownProfile.phone || 'Belum diisi'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-charcoal-muted shrink-0">Keanggotaan</span>
                  <Badge
                    variant={ownProfile.membership_status === 'active' ? 'success' : 'secondary'}
                    className="text-[11px]"
                  >
                    {ownProfile.membership_status === 'active'
                      ? 'Aktif'
                      : ownProfile.membership_status ?? 'Aktif'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Profile Form */}
          <Card className="lg:col-span-2 border-warm-300 bg-white">
            <CardHeader className="pb-4 border-b border-warm-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-serif">Edit Identitas Pribadi</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Kolom Jabatan, Divisi, Role Sistem, Status Akun, dan Email Login dikelola oleh sistem &amp; Super Admin.
                  </CardDescription>
                </div>
                {savedNotice && (
                  <Badge variant="success" className="gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Tersimpan</span>
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {savedNotice && !formError && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{savedNotice}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="own-profile-fullname" className="text-xs font-medium text-charcoal">
                    Nama Lengkap <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="own-profile-fullname"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
                      setSavedNotice(null)
                    }}
                    placeholder="Nama lengkap sesuai identitas resmi"
                    disabled={isSaving}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-[11px] text-red-600">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="own-profile-identity" className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                      <IdCard className="h-3.5 w-3.5 text-sage-700" />
                      <span>
                        {identityLabel} <span className="text-red-600">*</span>
                      </span>
                    </label>
                    <Input
                      id="own-profile-identity"
                      value={identityNumber}
                      onChange={(e) => {
                        setIdentityNumber(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, identityNumber: undefined }))
                        setSavedNotice(null)
                      }}
                      placeholder={ownProfile.academic_status === 'dosen' ? 'Nomor NIP / ID' : 'Nomor NIM'}
                      disabled={isSaving}
                      className="font-mono"
                    />
                    {fieldErrors.identityNumber && (
                      <p className="text-[11px] text-red-600">{fieldErrors.identityNumber}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="own-profile-university" className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-sage-700" />
                      <span>Universitas</span>
                    </label>
                    <Input
                      id="own-profile-university"
                      value={university}
                      onChange={(e) => {
                        setUniversity(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, university: undefined }))
                        setSavedNotice(null)
                      }}
                      placeholder="Contoh: Universitas Mataram (opsional)"
                      disabled={isSaving}
                    />
                    {fieldErrors.university && (
                      <p className="text-[11px] text-red-600">{fieldErrors.university}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="own-profile-study-program" className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-sage-700" />
                    <span>
                      Program Studi <span className="text-red-600">*</span>
                    </span>
                  </label>
                  <Input
                    id="own-profile-study-program"
                    value={studyProgram}
                    onChange={(e) => {
                      setStudyProgram(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, studyProgram: undefined }))
                      setSavedNotice(null)
                    }}
                    placeholder="Contoh: S1 Ilmu Lingkungan"
                    disabled={isSaving}
                  />
                  {fieldErrors.studyProgram && (
                    <p className="text-[11px] text-red-600">{fieldErrors.studyProgram}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-warm-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-charcoal-muted">
                    {hasUnsavedChanges
                      ? 'Ada perubahan yang belum disimpan.'
                      : 'Seluruh perubahan profil Anda sudah tersimpan.'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasUnsavedChanges || isSaving || isUploadingPhoto}
                      onClick={handleCancelChanges}
                      className="text-xs gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Batalkan</span>
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving || isUploadingPhoto || !hasUnsavedChanges}
                      className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

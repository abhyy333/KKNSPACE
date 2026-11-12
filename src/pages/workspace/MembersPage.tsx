import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { DirectoryMemberModal } from '@/components/workspace/DirectoryMemberModal'
import { useAuth } from '@/hooks/useAuth'
import {
  ACADEMIC_STATUS_LABELS,
  DIRECTORY_ROLE_OPTIONS,
  filterDirectoryMembers,
} from '@/lib/directory'
import { adminApi } from '@/services/adminApi'
import {
  createDirectoryMember,
  fetchTeamDirectory,
  ownProfileFormSchema,
  removeDirectoryMemberPhoto,
  setDirectoryMemberActive,
  updateDirectoryMember,
  updateOwnProfile,
  uploadDirectoryMemberPhoto,
  type DirectoryMemberFormInput,
  type OwnProfileFormInput,
} from '@/services/membersApi'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import type { AcademicStatus, KknRole, KknTeamDirectoryMember } from '@/types/database'
import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  GraduationCap,
  Link2,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react'

const ROLE_BADGE_VARIANT: Record<
  KknRole,
  'default' | 'secondary' | 'success' | 'warning' | 'outline'
> = {
  ketua: 'default',
  sekretaris: 'secondary',
  bendahara: 'warning',
  anggota: 'outline',
  dpl: 'success',
}

export const MembersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, profile, isSuperAdmin, refreshAccessContext } = useAuth()

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | KknRole>('all')
  const [studyProgramFilter, setStudyProgramFilter] = useState('all')
  const [academicStatusFilter, setAcademicStatusFilter] = useState<'all' | AcademicStatus>('all')
  const [divisionFilter, setDivisionFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileFormError, setProfileFormError] = useState<string | null>(null)

  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<KknTeamDirectoryMember | null>(null)
  const [memberFormError, setMemberFormError] = useState<string | null>(null)

  const {
    data: directory = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'team-directory'],
    queryFn: fetchTeamDirectory,
    staleTime: 60_000,
  })

  const photoFileIds = useMemo(
    () =>
      Array.from(
        new Set(
          directory
            .map((m) => m.photo_file_id)
            .filter((id): id is string => Boolean(id))
        )
      ).sort(),
    [directory]
  )

  const { data: photoUrls = {} } = useQuery({
    queryKey: ['workspace', 'team-directory-photos', photoFileIds],
    enabled: photoFileIds.length > 0,
    staleTime: 240_000,
    queryFn: async () => {
      const entries = await Promise.all(
        photoFileIds.map(async (fileId) => {
          try {
            const signed = await getPrivateFileSignedUrl(fileId)
            return [fileId, signed.signedUrl] as const
          } catch {
            return [fileId, ''] as const
          }
        })
      )
      const map: Record<string, string> = {}
      for (const [id, url] of entries) {
        if (url) map[id] = url
      }
      return map
    },
  })

  const { data: adminUsersData, isLoading: adminUsersLoading } = useQuery({
    queryKey: ['admin', 'directory-link-candidates'],
    queryFn: () => adminApi.listUsers({ page: 1, perPage: 100 }),
    enabled: isSuperAdmin && memberModalOpen,
    staleTime: 60_000,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OwnProfileFormInput>({
    resolver: zodResolver(ownProfileFormSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    },
  })

  useEffect(() => {
    if (!profileModalOpen) return
    reset({
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    })
  }, [profileModalOpen, profile?.full_name, profile?.phone, reset])

  const updateProfileMutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: async () => {
      await Promise.all([
        refreshAccessContext(),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'members'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
      ])
      setProfileFormError(null)
      setProfileModalOpen(false)
      toast({
        title: 'Profil Diperbarui',
        description: 'Nama dan kontak pribadi Anda berhasil disimpan.',
        variant: 'success',
      })
    },
    onError: (err) => {
      setProfileFormError(
        err instanceof Error ? err.message : 'Gagal memperbarui profil.'
      )
    },
  })

  const saveMemberMutation = useMutation({
    mutationFn: async (values: DirectoryMemberFormInput) => {
      if (editingMember) {
        return updateDirectoryMember(editingMember.id, values)
      }
      return createDirectoryMember(values)
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      ])
      setMemberFormError(null)
      setMemberModalOpen(false)
      setEditingMember(null)
      toast({
        title: editingMember ? 'Data Anggota Diperbarui' : 'Anggota Ditambahkan',
        description: `${saved.full_name} berhasil disimpan ke direktori resmi KKN.`,
        variant: 'success',
      })
    },
    onError: (err) => {
      setMemberFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan data anggota.'
      )
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setDirectoryMemberActive(id, isActive),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      ])
      toast({
        title: updated.is_active ? 'Anggota Diaktifkan' : 'Anggota Dinonaktifkan',
        description: `${updated.full_name} kini berstatus ${updated.is_active ? 'aktif' : 'nonaktif'}.`,
        variant: 'info',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Memperbarui Status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'warning',
      })
    },
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ memberId, file }: { memberId: string; file: File }) =>
      uploadDirectoryMemberPhoto(memberId, file),
    onSuccess: async (updated) => {
      setEditingMember(updated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] }),
      ])
      toast({
        title: 'Foto Profil Diperbarui',
        description: `Foto ${updated.full_name} berhasil diunggah ke bucket privat.`,
        variant: 'success',
      })
    },
  })

  const removePhotoMutation = useMutation({
    mutationFn: removeDirectoryMemberPhoto,
    onSuccess: async (updated) => {
      setEditingMember(updated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] }),
      ])
      toast({
        title: 'Foto Profil Dihapus',
        description: `${updated.full_name} kembali menggunakan avatar placeholder.`,
        variant: 'info',
      })
    },
  })

  const handleCopy = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(key)
      setTimeout(() => setCopiedId(null), 1800)
      toast({
        title: `${label} Disalin`,
        description: value,
        variant: 'info',
      })
    } catch {
      toast({
        title: 'Gagal Menyalin',
        description: 'Salin secara manual dari teks yang tertera.',
        variant: 'warning',
      })
    }
  }

  const studyProgramOptions = useMemo(
    () =>
      Array.from(new Set(directory.map((m) => m.study_program))).sort((a, b) =>
        a.localeCompare(b, 'id')
      ),
    [directory]
  )

  const divisionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          directory
            .map((m) => m.division)
            .filter((div): div is string => Boolean(div && div.trim()))
        )
      ).sort((a, b) => a.localeCompare(b, 'id')),
    [directory]
  )

  const filteredDirectory = useMemo(
    () =>
      filterDirectoryMembers(directory, {
        searchTerm,
        roleFilter,
        studyProgramFilter,
        academicStatusFilter,
        divisionFilter,
        showInactive: isSuperAdmin && showInactive,
      }),
    [
      directory,
      searchTerm,
      roleFilter,
      studyProgramFilter,
      academicStatusFilter,
      divisionFilter,
      isSuperAdmin,
      showInactive,
    ]
  )

  const activeRecords = useMemo(() => directory.filter((m) => m.is_active), [directory])
  const mahasiswaCount = useMemo(
    () => activeRecords.filter((m) => m.academic_status === 'mahasiswa').length,
    [activeRecords]
  )
  const dosenCount = useMemo(
    () => activeRecords.filter((m) => m.academic_status === 'dosen').length,
    [activeRecords]
  )
  const linkedCount = useMemo(
    () => activeRecords.filter((m) => Boolean(m.linked_user_id)).length,
    [activeRecords]
  )

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    roleFilter !== 'all' ||
    studyProgramFilter !== 'all' ||
    academicStatusFilter !== 'all' ||
    divisionFilter !== 'all' ||
    (isSuperAdmin && showInactive)

  const resetFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setStudyProgramFilter('all')
    setAcademicStatusFilter('all')
    setDivisionFilter('all')
    setShowInactive(false)
  }

  const openCreateModal = () => {
    setEditingMember(null)
    setMemberFormError(null)
    setMemberModalOpen(true)
  }

  const openEditModal = (member: KknTeamDirectoryMember) => {
    setEditingMember(member)
    setMemberFormError(null)
    setMemberModalOpen(true)
  }

  const renderAvatar = (member: KknTeamDirectoryMember) => {
    const signedUrl = member.photo_file_id ? photoUrls[member.photo_file_id] : null
    if (signedUrl) {
      return (
        <img
          src={signedUrl}
          alt={member.full_name}
          className="h-10 w-10 rounded-full object-cover border border-sage-200 shrink-0"
        />
      )
    }

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-semibold text-xs border border-sage-200">
        {member.full_name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Direktori Tim &amp; Kontak Posko KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Data resmi anggota tim KKN dan dosen pembimbing lapangan untuk koordinasi program kerja dan kegiatan lapangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
          {profile && (
            <>
              <Link
                to="/workspace/profile"
                className={`${buttonVariants({ variant: 'outline', size: 'sm' })} text-xs gap-1.5`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profil Saya</span>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setProfileFormError(null)
                  setProfileModalOpen(true)
                }}
                className="text-xs gap-1.5 text-charcoal-muted"
              >
                <span>Edit Kontak</span>
              </Button>
            </>
          )}
          {isSuperAdmin && (
            <Button
              size="sm"
              onClick={openCreateModal}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Anggota</span>
            </Button>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Total Tim Aktif</p>
              <p className="text-lg font-semibold text-charcoal mt-0.5">{activeRecords.length}</p>
            </div>
            <Users className="h-5 w-5 text-sage-700 shrink-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Mahasiswa</p>
              <p className="text-lg font-semibold text-charcoal mt-0.5">{mahasiswaCount}</p>
            </div>
            <GraduationCap className="h-5 w-5 text-sage-700 shrink-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Dosen Pembimbing</p>
              <p className="text-lg font-semibold text-charcoal mt-0.5">{dosenCount}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-sage-700 shrink-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-charcoal-muted">Akun Terhubung</p>
              <p className="text-lg font-semibold text-charcoal mt-0.5">{linkedCount}</p>
            </div>
            <UserCheck className="h-5 w-5 text-sage-700 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Search & Multi-Filter */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama lengkap, NIM / ID, prodi, atau no. HP..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <select
              aria-label="Filter jabatan"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | KknRole)}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Jabatan</option>
              {DIRECTORY_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status akademik"
              value={academicStatusFilter}
              onChange={(e) =>
                setAcademicStatusFilter(e.target.value as 'all' | AcademicStatus)
              }
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Status Akademik</option>
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
            </select>

            <select
              aria-label="Filter divisi"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Divisi</option>
              {divisionOptions.map((div) => (
                <option key={div} value={div}>
                  Divisi {div}
                </option>
              ))}
              <option value="__none__">Tanpa Divisi</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter program studi"
                value={studyProgramFilter}
                onChange={(e) => setStudyProgramFilter(e.target.value)}
                className="flex h-8 w-full sm:w-72 rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
              >
                <option value="all">Semua Program Studi</option>
                {studyProgramOptions.map((prodi) => (
                  <option key={prodi} value={prodi}>
                    {prodi}
                  </option>
                ))}
              </select>

              {isSuperAdmin && (
                <label className="inline-flex items-center gap-2 text-xs text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-warm-300 accent-sage-600"
                  />
                  <span>Tampilkan record nonaktif</span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-charcoal-muted">
              <span>
                Menampilkan <strong className="text-charcoal">{filteredDirectory.length}</strong> dari{' '}
                <strong className="text-charcoal">{directory.length}</strong> anggota
              </span>
              {hasActiveFilters && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetFilters}
                  className="h-7 px-2 text-xs gap-1 text-sage-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content States */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Direktori Tim KKN
                </p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filteredDirectory.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <Users className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Tidak ada anggota yang sesuai
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Belum ada data direktori yang cocok dengan kata kunci pencarian atau filter yang dipilih.
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={resetFilters} className="mt-2 text-xs">
                Reset Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-warm-300 bg-warm-50 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Anggota</th>
                    <th className="px-4 py-3">NIM / ID</th>
                    <th className="px-4 py-3">Program Studi &amp; Status</th>
                    <th className="px-4 py-3">Jabatan &amp; Divisi</th>
                    <th className="px-4 py-3">No. HP</th>
                    {isSuperAdmin && <th className="px-4 py-3 text-right">Kelola</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200 text-xs">
                  {filteredDirectory.map((member) => {
                    const isSelf = Boolean(user?.id && member.linked_user_id === user.id)

                    return (
                      <tr
                        key={member.id}
                        className={`transition-colors hover:bg-warm-50/70 ${
                          !member.is_active
                            ? 'bg-warm-100/60 opacity-75'
                            : isSelf
                              ? 'bg-sage-50/35'
                              : 'bg-white'
                        }`}
                      >
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            {renderAvatar(member)}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-charcoal">
                                  {member.full_name}
                                </span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Anda
                                  </Badge>
                                )}
                                {!member.is_active && (
                                  <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50">
                                    Nonaktif
                                  </Badge>
                                )}
                              </div>
                              {member.linked_user_id && (
                                <p className="text-[11px] text-sage-800 inline-flex items-center gap-1 mt-0.5">
                                  <Link2 className="h-3 w-3" />
                                  <span>Akun Workspace Terhubung</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <code className="font-mono text-[11px] text-charcoal bg-warm-100 px-1.5 py-0.5 rounded">
                              {member.identity_number}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `nim-${member.id}`,
                                  member.identity_number,
                                  'NIM / ID'
                                )
                              }
                              className="rounded p-1 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                              title="Salin NIM / ID"
                            >
                              {copiedId === `nim-${member.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-middle">
                          <p className="font-medium text-charcoal">{member.study_program}</p>
                          <p className="text-[11px] text-charcoal-muted mt-0.5">
                            {ACADEMIC_STATUS_LABELS[member.academic_status]}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={ROLE_BADGE_VARIANT[member.role]} className="text-[10px]">
                              {member.position_label}
                            </Badge>
                            {member.division ? (
                              <Badge variant="outline" className="text-[10px]">
                                Div. {member.division}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-charcoal-muted">· Divisi —</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          {member.phone ? (
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={`tel:${member.phone}`}
                                className="inline-flex items-center gap-1.5 text-charcoal hover:text-sage-700"
                              >
                                <Phone className="h-3.5 w-3.5 text-sage-700 shrink-0" />
                                <span className="font-mono text-[11px]">{member.phone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    `phone-${member.id}`,
                                    member.phone!,
                                    'Nomor HP'
                                  )
                                }
                                className="rounded p-1 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                                title="Salin nomor HP"
                              >
                                {copiedId === `phone-${member.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-muted italic">Belum diisi</span>
                          )}
                        </td>

                        {isSuperAdmin && (
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(member)}
                                className="h-7 px-2.5 text-[11px] gap-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Kelola</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={toggleActiveMutation.isPending}
                                onClick={() =>
                                  toggleActiveMutation.mutate({
                                    id: member.id,
                                    isActive: !member.is_active,
                                  })
                                }
                                title={
                                  member.is_active
                                    ? 'Nonaktifkan record direktori'
                                    : 'Aktifkan kembali record direktori'
                                }
                                className={`h-7 px-2 text-[11px] ${
                                  member.is_active
                                    ? 'text-charcoal-muted hover:text-red-700 hover:bg-red-50'
                                    : 'text-sage-800 hover:bg-sage-50'
                                }`}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile & Tablet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {filteredDirectory.map((member) => {
              const isSelf = Boolean(user?.id && member.linked_user_id === user.id)

              return (
                <Card
                  key={member.id}
                  className={
                    !member.is_active
                      ? 'border-warm-300 bg-warm-100/60 opacity-80'
                      : isSelf
                        ? 'border-sage-400 bg-sage-50/30'
                        : ''
                  }
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        {renderAvatar(member)}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-charcoal break-words">
                              {member.full_name}
                            </h3>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px]">
                                Anda
                              </Badge>
                            )}
                            {!member.is_active && (
                              <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50">
                                Nonaktif
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge variant={ROLE_BADGE_VARIANT[member.role]} className="text-[10px]">
                              {member.position_label}
                            </Badge>
                            {member.division && (
                              <Badge variant="outline" className="text-[10px]">
                                Div. {member.division}
                              </Badge>
                            )}
                            {member.linked_user_id && (
                              <Badge variant="outline" className="text-[10px] border-sage-300 text-sage-800 bg-sage-50">
                                Akun Terhubung
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 border-t border-warm-200 pt-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-charcoal-muted">NIM / ID</span>
                        <div className="inline-flex items-center gap-1.5 min-w-0">
                          <code className="font-mono text-[11px] text-charcoal bg-warm-100 px-1.5 py-0.5 rounded truncate">
                            {member.identity_number}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`m-nim-${member.id}`, member.identity_number, 'NIM / ID')
                            }
                            className="rounded p-1 text-charcoal-muted hover:bg-warm-100 shrink-0"
                            title="Salin NIM / ID"
                          >
                            {copiedId === `m-nim-${member.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="text-charcoal-muted shrink-0">Program Studi</span>
                        <span className="text-right font-medium text-charcoal">
                          {member.study_program}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-charcoal-muted">Status Akademik</span>
                        <span className="text-charcoal">
                          {ACADEMIC_STATUS_LABELS[member.academic_status]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-charcoal-muted">No. HP</span>
                        {member.phone ? (
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`tel:${member.phone}`}
                              className="font-mono text-[11px] text-charcoal hover:text-sage-700"
                            >
                              {member.phone}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`m-phone-${member.id}`, member.phone!, 'Nomor HP')
                              }
                              className="rounded p-1 text-charcoal-muted hover:bg-warm-100 shrink-0"
                              title="Salin nomor HP"
                            >
                              {copiedId === `m-phone-${member.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-charcoal-muted italic">Belum diisi</span>
                        )}
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center justify-end gap-2 border-t border-warm-200 pt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: member.id,
                              isActive: !member.is_active,
                            })
                          }
                          className="h-8 text-xs text-charcoal-muted"
                        >
                          {member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(member)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Kelola Data</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modal Edit Kontak Sendiri */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Perbarui Profil & Kontak Akun Anda"
        description="Perubahan nama dan nomor telepon pada profil akun login Anda tersimpan di akun Workspace."
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={handleSubmit((values) => updateProfileMutation.mutate(values))}
          className="space-y-4"
        >
          {profileFormError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{profileFormError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="self-name" className="text-xs font-medium text-charcoal block">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <Input id="self-name" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-[11px] text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="self-phone" className="text-xs font-medium text-charcoal block">
              Nomor Telepon / WhatsApp
            </label>
            <Input
              id="self-phone"
              placeholder="Misal: 081234567890"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-[11px] text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setProfileModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateProfileMutation.isPending}
              className="gap-1.5"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Simpan Profil</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Kelola Anggota Direktori (Khusus Super Admin) */}
      {isSuperAdmin && (
        <DirectoryMemberModal
          open={memberModalOpen}
          member={editingMember}
          allMembers={directory}
          authUsers={adminUsersData?.users ?? []}
          authUsersLoading={adminUsersLoading}
          signedPhotoUrl={
            editingMember?.photo_file_id ? photoUrls[editingMember.photo_file_id] ?? null : null
          }
          saving={saveMemberMutation.isPending}
          photoUploading={uploadPhotoMutation.isPending || removePhotoMutation.isPending}
          formError={memberFormError}
          onClose={() => {
            setMemberModalOpen(false)
            setEditingMember(null)
            setMemberFormError(null)
          }}
          onSubmitMember={(values) => saveMemberMutation.mutate(values)}
          onUploadPhoto={async (memberId, file) => {
            await uploadPhotoMutation.mutateAsync({ memberId, file })
          }}
          onRemovePhoto={async (memberId) => {
            await removePhotoMutation.mutateAsync(memberId)
          }}
        />
      )}
    </div>
  )
}

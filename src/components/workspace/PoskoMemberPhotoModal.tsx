import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { optimizeImageFile } from '@/lib/imageOptimization'
import {
  removeDirectoryMemberPhoto,
  saveOwnDirectoryProfile,
  uploadDirectoryMemberPhoto,
  uploadOwnProfilePhoto,
} from '@/services/membersApi'
import { fetchPublicTeamPhotoUrl } from '@/services/publicApi'
import type { KknTeamDirectoryMember } from '@/types/database'
import {
  AlertCircle,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB

interface PoskoMemberPhotoModalProps {
  open: boolean
  onClose: () => void
  member: KknTeamDirectoryMember | null
}

export const PoskoMemberPhotoModal: React.FC<PoskoMemberPhotoModalProps> = ({
  open,
  onClose,
  member,
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, isSuperAdmin } = useAuth()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isSelf = Boolean(user?.id && member?.linked_user_id === user.id)
  const canManage = Boolean(isSuperAdmin || isSelf)

  // Fetch current signed photo URL from existing public-team-photo mechanism
  const { data: currentPhotoUrl, refetch: refetchPhoto } = useQuery({
    queryKey: ['workspace', 'team-photo', member?.id],
    queryFn: () => (member ? fetchPublicTeamPhotoUrl(member.id) : null),
    enabled: Boolean(open && member?.photo_file_id),
    staleTime: 120_000,
  })

  // Cleanup staged preview URL on unmount or reset
  useEffect(() => {
    return () => {
      if (stagedPreview) {
        URL.revokeObjectURL(stagedPreview)
      }
    }
  }, [stagedPreview])

  if (!member) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setErrorMsg(null)

    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.type)) {
      setErrorMsg('Format foto tidak valid. Gunakan file JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
      setErrorMsg('Ukuran file foto maksimal 5 MB.')
      return
    }

    if (stagedPreview) {
      URL.revokeObjectURL(stagedPreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setStagedFile(file)
    setStagedPreview(previewUrl)
  }

  const handleCancelStaged = () => {
    if (stagedPreview) {
      URL.revokeObjectURL(stagedPreview)
    }
    setStagedFile(null)
    setStagedPreview(null)
    setErrorMsg(null)
  }

  const handleSavePhoto = async () => {
    if (!stagedFile || !member) return
    setIsSaving(true)
    setErrorMsg(null)

    try {
      // 1. Client-side compression & downscale optimization
      const optimized = await optimizeImageFile(stagedFile, 1200, 0.85)

      if (isSuperAdmin) {
        // Direct Super Admin photo upload linked to directory member
        await uploadDirectoryMemberPhoto(member.id, optimized)
      } else if (isSelf) {
        // Self-managed photo upload
        const staged = await uploadOwnProfilePhoto(optimized)
        await saveOwnDirectoryProfile({
          fullName: member.full_name,
          identityNumber: member.identity_number,
          university: member.university,
          studyProgram: member.study_program,
          photoAction: 'replace',
          photoFileId: staged.fileId,
        })
      } else {
        throw new Error('Anda tidak memiliki wewenang untuk mengubah foto anggota ini.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-photo', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-photo', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
        refetchPhoto(),
      ])

      toast({
        variant: 'success',
        title: 'Foto Profil Disimpan',
        description: `Foto profil untuk ${member.full_name} berhasil diperbarui.`,
      })

      handleCancelStaged()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan foto.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!member) return
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus foto profil ${member.full_name}? Avatar inisial nama akan digunakan kembali.`
    )
    if (!confirmed) return

    setIsRemoving(true)
    setErrorMsg(null)

    try {
      if (isSuperAdmin) {
        await removeDirectoryMemberPhoto(member.id)
      } else if (isSelf) {
        await saveOwnDirectoryProfile({
          fullName: member.full_name,
          identityNumber: member.identity_number,
          university: member.university,
          studyProgram: member.study_program,
          photoAction: 'remove',
        })
      } else {
        throw new Error('Anda tidak memiliki wewenang untuk menghapus foto anggota ini.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-photo', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-photo', member.id] }),
        queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile'] }),
      ])

      toast({
        variant: 'success',
        title: 'Foto Dihapus',
        description: `Foto profil ${member.full_name} berhasil dihapus. Avatar kembali ke inisial.`,
      })

      handleCancelStaged()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus foto.')
    } finally {
      setIsRemoving(false)
    }
  }

  const activeDisplayUrl = stagedPreview || (member.photo_file_id ? currentPhotoUrl : null)

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving && !isRemoving) {
          handleCancelStaged()
          onClose()
        }
      }}
      title="Foto Profil Anggota Posko"
      description="Pratinjau dan pengelolaan foto profil resmi yang terhubung dengan record direktori tim KKN."
      maxWidthClass="max-w-md"
    >
      <div className="space-y-5">
        {/* Member Identity Banner */}
        <div className="rounded-lg border border-warm-200 bg-warm-50/70 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-charcoal truncate">
                {member.full_name}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {member.position_label}
              </Badge>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5 truncate">
              {member.study_program} · {member.university || 'Universitas Mataram'}
            </p>
          </div>
          {isSelf && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              Profil Anda
            </Badge>
          )}
        </div>

        {/* Circular Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-2 space-y-3">
          <div className="relative">
            {activeDisplayUrl ? (
              <img
                src={activeDisplayUrl}
                alt={`Foto profil ${member.full_name}`}
                className="h-28 w-28 rounded-full object-cover border-2 border-sage-300 shadow-md bg-sage-50"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-serif font-bold text-3xl border-2 border-sage-300 shadow-md">
                {member.full_name.charAt(0).toUpperCase()}
              </div>
            )}

            {stagedFile && (
              <span className="absolute bottom-0 right-0 rounded-full bg-emerald-600 text-white p-1 shadow">
                <Check className="h-4 w-4" />
              </span>
            )}
          </div>

          <div className="text-center">
            {stagedFile ? (
              <p className="text-xs font-semibold text-emerald-800">
                Pratinjau Foto Baru ({Math.round(stagedFile.size / 1024)} KB)
              </p>
            ) : member.photo_file_id ? (
              <p className="text-xs font-medium text-charcoal-muted">
                Foto profil resmi aktif di direktori tim
              </p>
            ) : (
              <p className="text-xs text-charcoal-muted">
                Belum ada foto — menggunakan avatar inisial
              </p>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Controls */}
        {canManage ? (
          <div className="space-y-3 pt-1 border-t border-warm-200">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {stagedFile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSavePhoto}
                    disabled={isSaving}
                    className="flex-1 text-xs gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Foto Ini'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelStaged}
                    disabled={isSaving}
                    className="text-xs gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Batal</span>
                  </Button>
                </div>
                <p className="text-[11px] text-charcoal-muted text-center">
                  Foto akan dioptimasi secara otomatis sebelum disimpan ke storage privat.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving || isRemoving}
                  className="w-full sm:flex-1 text-xs gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5 text-sage-700" />
                  <span>{member.photo_file_id ? 'Ganti Foto' : 'Unggah Foto'}</span>
                </Button>

                {member.photo_file_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    disabled={isSaving || isRemoving}
                    className="w-full sm:w-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Hapus Foto</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-warm-200 flex items-center gap-2 text-[11px] text-charcoal-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-700 shrink-0" />
            <span>Pengelolaan foto profil memerlukan hak akses Super Admin atau pemilik akun.</span>
          </div>
        )}

        {/* Informative Security & Privacy Note */}
        <div className="rounded-md bg-warm-100/60 p-2.5 text-[11px] text-charcoal-muted space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-charcoal">
            <ImageIcon className="h-3.5 w-3.5 text-sage-700" />
            <span>Ketentuan Foto Profil:</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Format diterima: JPG, JPEG, PNG, dan WebP (maks. 5 MB).</li>
            <li>Foto terhubung langsung dengan ID record direktori tim.</li>
            <li>Foto profil bersifat opsional; inisial digunakan jika foto kosong.</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}

import React, { useRef, useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import {
  uploadDirectoryMemberPhoto,
  removeDirectoryMemberPhoto,
  uploadOwnProfilePhoto,
  saveOwnDirectoryProfile,
} from '@/services/membersApi'
import { fetchPublicTeamPhotoUrl } from '@/services/publicApi'
import { optimizeImageFile } from '@/lib/imageOptimization'
import type { KknTeamDirectoryMember } from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react'

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

  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  const isSelf = Boolean(user?.id && member?.linked_user_id === user.id)
  const canManage = isSuperAdmin || isSelf

  // Fetch current photo URL
  const { data: currentPhotoUrl } = useQuery({
    queryKey: ['workspace', 'team-photo', member?.id],
    queryFn: () => (member ? fetchPublicTeamPhotoUrl(member.id) : Promise.resolve(null)),
    enabled: Boolean(open && member?.photo_file_id),
    staleTime: 60_000,
  })

  const resetStaged = () => {
    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(null)
    setStagedPreview(null)
    setFormError(null)
  }

  const handleClose = () => {
    resetStaged()
    onClose()
  }

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    setFormError(null)

    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      setFormError('Format foto tidak valid. Gunakan file JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file foto melebihi batas maksimal 5 MB.')
      return
    }

    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(file)
    setStagedPreview(URL.createObjectURL(file))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!member || !stagedFile) throw new Error('Berkas foto belum dipilih.')
      const optimized = await optimizeImageFile(stagedFile)

      if (isSuperAdmin) {
        return uploadDirectoryMemberPhoto(member.id, optimized)
      } else if (isSelf) {
        const staged = await uploadOwnProfilePhoto(optimized)
        return saveOwnDirectoryProfile({
          fullName: member.full_name,
          identityNumber: member.identity_number,
          university: member.university ?? null,
          studyProgram: member.study_program,
          photoAction: 'replace',
          photoFileId: staged.fileId,
        })
      } else {
        throw new Error('Anda tidak memiliki wewenang untuk mengubah foto anggota ini.')
      }
    },
    onSuccess: () => {
      toast({
        variant: 'success',
        title: 'Foto Profil Diperbarui',
        description: `Foto profil untuk ${member?.full_name} berhasil disimpan.`,
      })
      handleClose()
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-photo', member?.id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] })
      queryClient.invalidateQueries({ queryKey: ['public', 'team-photo', member?.id] })
      queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] })
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Gagal menyimpan foto profil.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!member) return
      if (isSuperAdmin) {
        return removeDirectoryMemberPhoto(member.id)
      } else if (isSelf) {
        return saveOwnDirectoryProfile({
          fullName: member.full_name,
          identityNumber: member.identity_number,
          university: member.university ?? null,
          studyProgram: member.study_program,
          photoAction: 'remove',
        })
      } else {
        throw new Error('Anda tidak memiliki wewenang untuk menghapus foto anggota ini.')
      }
    },
    onSuccess: () => {
      toast({
        variant: 'success',
        title: 'Foto Profil Dihapus',
        description: `Foto profil untuk ${member?.full_name} telah dihapus. Tampilan kembali ke avatar inisial.`,
      })
      handleClose()
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-photo', member?.id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory-photos'] })
      queryClient.invalidateQueries({ queryKey: ['public', 'team-photo', member?.id] })
      queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'own-profile-photo'] })
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Gagal menghapus foto profil.')
    },
  })

  if (!member) return null

  const initial = member.full_name?.trim().charAt(0).toUpperCase() || 'K'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Foto Profil: ${member.full_name}`}
      description={`${member.position_label} · Terhubung langsung ke record resmi kkn_team_directory.`}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {/* Large Avatar Preview */}
        <div className="flex flex-col items-center justify-center p-4 bg-warm-50/70 rounded-lg border border-warm-200">
          <div className="relative">
            {stagedPreview ? (
              <img
                src={stagedPreview}
                alt={`Pratinjau baru ${member.full_name}`}
                className="h-28 w-28 rounded-full object-cover border-2 border-sage-500 shadow-md"
              />
            ) : currentPhotoUrl && member.photo_file_id ? (
              <img
                src={currentPhotoUrl}
                alt={member.full_name}
                className="h-28 w-28 rounded-full object-cover border-2 border-sage-400 shadow-sm"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-sage-100 text-sage-800 text-3xl font-serif font-bold flex items-center justify-center border-2 border-sage-200 shadow-sm">
                {initial}
              </div>
            )}

            {stagedPreview && (
              <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-sage-800 text-white shadow">
                Pratinjau Baru
              </Badge>
            )}
          </div>

          <div className="mt-3 text-center">
            <h4 className="text-sm font-semibold text-charcoal">{member.full_name}</h4>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {member.account_email || 'posko@pringgaselaselatan.desa.id'}
            </p>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {member.position_label}
              </Badge>
              {member.photo_file_id && !stagedPreview && (
                <Badge variant="secondary" className="text-[10px] text-emerald-800 bg-emerald-50 border-emerald-200">
                  Foto Aktif
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {formError && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2.5 rounded-md border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Actions for Authorized User */}
        {canManage ? (
          <div className="space-y-3">
            {stagedFile ? (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetStaged}
                  className="text-xs"
                  disabled={saveMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="text-xs gap-1.5 bg-sage-800 text-white hover:bg-sage-900"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Simpan Foto Profil</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      handleFileSelect(e.target.files?.[0])
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      handleFileSelect(e.target.files?.[0])
                      e.target.value = ''
                    }}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-xs gap-1.5 flex-1"
                  >
                    <Camera className="h-3.5 w-3.5 text-sage-700" />
                    <span>Ambil Foto</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-xs gap-1.5 flex-1"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-sage-700" />
                    <span>Pilih dari Galeri</span>
                  </Button>
                </div>

                {member.photo_file_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Hapus foto profil ${member.full_name}? Tampilan akan kembali ke avatar inisial.`)) {
                        removeMutation.mutate()
                      }
                    }}
                    disabled={removeMutation.isPending}
                    className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Hapus Foto (Kembalikan ke Inisial)</span>
                  </Button>
                )}
              </div>
            )}

            <p className="text-[11px] text-charcoal-muted leading-relaxed text-center">
              Maksimal 5 MB (JPG, PNG, WebP). Foto otomatis dioptimasi dan disimpan aman di penyimpanan privat terotorisasi.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-warm-100/60 rounded text-center text-xs text-charcoal-muted">
            Foto profil dikelola oleh pemilik akun atau Super Admin posko KKN.
          </div>
        )}
      </div>
    </Modal>
  )
}

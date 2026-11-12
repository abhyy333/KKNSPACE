import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { adminApi, type AdminUserDto } from '@/services/adminApi'
import type { KknRole } from '@/types/database'
import { AlertCircle, Loader2, Shield } from 'lucide-react'

const ROLE_OPTIONS: { value: KknRole; label: string }[] = [
  { value: 'ketua', label: 'Ketua KKN' },
  { value: 'sekretaris', label: 'Sekretaris' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'anggota', label: 'Anggota' },
  { value: 'dpl', label: 'DPL (Dosen Pembimbing Lapangan)' },
]

interface ChangeRoleDialogProps {
  user: AdminUserDto | null
  onClose: () => void
}

const ChangeRoleForm: React.FC<{ user: AdminUserDto; onClose: () => void }> = ({ user, onClose }) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<KknRole>(user.membership_role || 'anggota')
  const [division, setDivision] = useState<string>(user.membership_division || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const normalizedInitialDivision = (user.membership_division || '').trim()
  const normalizedCurrentDivision = division.trim()
  const hasChanged =
    selectedRole !== user.membership_role || normalizedCurrentDivision !== normalizedInitialDivision

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const res = await adminApi.updateMembership({
        target_user_id: user.id,
        action: 'change_role',
        role: selectedRole,
        division: normalizedCurrentDivision || null,
      })

      toast({
        variant: 'success',
        title: 'Peran & Divisi Diperbarui',
        description: res.message,
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'members'] }),
      ])
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'Gagal mengubah peran anggota.'
      setErrorMessage(msg)
      toast({
        variant: 'error',
        title: 'Gagal Mengubah Peran',
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={isSubmitting ? () => {} : onClose}
      title="Ubah Peran (Role) KKN"
      description={`Tentukan peran operasional baru untuk ${user.full_name} (${user.email}).`}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sage-600" />
            <span>Pilih Role Baru</span>
          </label>
          <select
            value={selectedRole}
            disabled={isSubmitting}
            onChange={(e) => setSelectedRole(e.target.value as KknRole)}
            className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs shadow-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-charcoal block">
            Divisi Operasional <span className="text-charcoal-muted font-normal">(opsional, mis. Acara / Humas)</span>
          </label>
          <input
            type="text"
            value={division}
            disabled={isSubmitting}
            onChange={(e) => setDivision(e.target.value)}
            placeholder="Contoh: Acara"
            maxLength={60}
            className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs shadow-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !hasChanged}
            className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Simpan Perubahan</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({ user, onClose }) => {
  if (!user) return null
  return <ChangeRoleForm key={user.id} user={user} onClose={onClose} />
}
